/**
 * engine/multiplayerSession.js
 *
 * Playing in a shared world. Each player's browser runs the game with that player's own party (its own battles, encounters, menus and
 * saves); the host's browser holds the world and keeps it in its save. What goes between them, as relay messages (multiplayerClient.relay):
 *
 *   guest -> host   join_req                 "I am here": the host answers with `world`
 *   host -> guest   world { world, player, spawn }   the world as it is now (shared/core/multiplayerSave.js worldPart), the guest's own
 *                                            party from the last visit (null the first time: the guest makes a character), and where to stand
 *   guest -> host   player_save { data }     the guest's party, inventory and position (playerPart), kept in the host's save; sent on every
 *                                            autosave (SaveManager.guestSink), every 20 seconds and when the guest leaves
 *   host -> all     time { time, day }       the clock, every 5 seconds: everyone sees the same hour
 *   any -> all      change { key, value }    a change to the map (WorldManager worldSync): an object taken, a chest searched
 *   any -> all      pos { col, row, dir, moving, run, map, sprite, scene }   where a player is, for drawing them
 *   guest -> host   stranger_claim { id }    a guest walked into a workshop before the Hooded Stranger had one: the host keeps the first claim
 *   host -> all     stranger_home { id }     the Hooded Stranger's workshop, as the host's world has it (there is only one, for everyone)
 *   any -> all      char_ready               a new world (Host a World > New World): this player has made their character
 *   host -> all     begin                    a new world: everyone has a character; play the prologue (the guests then ask to be let in)
 *   host -> guest   founding                 a new world still being made: the guest makes a character too, and waits with the others
 *
 * Players come and go at any time while the host is on. A join or leave shows as a message on the overworld and nobody else is
 * interrupted. The host leaving (quitting to the title) closes the world: the guests go back to their title screen, their characters
 * already in the host's save. A world played in multiplayer is still an ordinary save: the host can load it alone.
 */
import { events } from '../../../shared/core/eventBus.js';
import { gameState } from '../../../shared/core/gameState.js';
import { worldSync } from '../../../shared/world/worldManager.js';
import { worldPart, playerPart, mergeParts, placeOnOverworld } from '../../../shared/core/multiplayerSave.js';
import { multiplayer } from './multiplayerClient.js';
import { SaveManager } from './saveManager.js';
import { TimeSystem } from '../../../shared/world/timeSystem.js';
import { InteriorFactory, STORY_HOMES } from '../../../shared/world/interiorFactory.js';

const TIME_EVERY = 5;          // seconds between the host's clock messages
const POS_HEARTBEAT = 2;       // seconds between position messages while standing still
const GUEST_SAVE_EVERY = 20;   // seconds between a guest's saves to the host
const JOIN_RETRY = 3;          // seconds between a guest's join requests while the host has not answered
const JOIN_GIVE_UP = 45;
const MESSAGE_SECONDS = 5;

/** The tile key of the map a player is on: the overworld, or one house / cave. */
const mapKey = () => (gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world');
/** The sheet the local leader walks with (the first member on their feet who has one). */
const leaderSprite = () => {
    const m = (gameState.party.members || []).find(x => x && x.spriteOverworld && !(x.hp <= 0)) || (gameState.party.members || []).find(x => x && x.spriteOverworld);
    return m ? m.spriteOverworld : null;
};
/** The sheets of the two members who walk behind the leader (the next two on their feet), so the others can draw them following too. */
const followerSprites = () => (gameState.party.members || []).filter(x => x && x.spriteOverworld && !(x.hp <= 0)).slice(1, 3).map(x => x.spriteOverworld);

class MultiplayerSession {
    constructor() {
        this.role = null;            // null | 'founding' (the host of a new world, making a character) | 'host' | 'joining' | 'creating' | 'guest'
        this.newWorld = null;        // a new world being started: { ready: Set of player ids with a character, began, myParty (a guest's) }
        this.remotes = new Map();    // playerId -> { id, username, col, row, dir, moving, run, map, sprite, scene, entity }
        this.messages = [];          // [{ text, at }] the join / leave lines on the overworld
        this.env = null;             // set by SceneManager: { config, getWorldManager(), getLocalPlayer(), getScene() }
        this.pending = null;         // a guest being let in: { world, spawn }
        this.endNotice = null;       // why the last session ended, for the title screen
        this._known = new Map();     // playerId -> connected, to tell joins and leaves apart in room updates
        this._t = { time: 0, pos: 0, save: 0, join: 0, joinFor: 0 };
        this._lastPos = '';
        this._hostWhenLoaded = false;
        this._wired = false;
        this.groupedProbe = () => false;   // set by engine/multiplayerSocial.js: is this player in a party of players (then only the lead character walks)
    }

    get active() { return this.role === 'host' || this.role === 'guest'; }
    get isGuest() { return this.role === 'guest'; }

    /** Called once by SceneManager. */
    attach(env) {
        this.env = env;
        if (this._wired) return;
        this._wired = true;
        multiplayer.on('relay', (msg) => this._onRelay(msg.from, msg.data || {}));
        multiplayer.on('room', (room) => this._onRoom(room));
        multiplayer.on('closed', ({ reason }) => this._onClosed(reason));
        events.on('CHANGE_SCENE', ({ scene, data } = {}) => {
            if (scene === 'title' && this.role) this.end(null);
            if (scene === 'overworld' && this._hostWhenLoaded && multiplayer.room && multiplayer.isHost) { this._hostWhenLoaded = false; this._startHosting(); }
            if ((scene === 'character-creator' && this.role !== 'creating') || (data && data.buildWorld && !this.role)) SaveManager.guestSink = null;   // a game of their own again
        });
        events.on('LOAD_GAME', () => {
            if (this.isGuest) this.end(null, { toTitle: false });
            SaveManager.guestSink = null;
        });
        events.on('LOAD_FAILED', () => { this._hostWhenLoaded = false; });
    }

    // ================================================================ HOST
    /** The lobby's Start: the host's save is loading; hosting begins when its overworld opens. */
    hostWhenLoaded() { this._hostWhenLoaded = true; }

    _startHosting() {
        this.role = 'host';
        this.remotes.clear();
        this._remember(multiplayer.room);
        worldSync.onLocalChange = (key, value) => multiplayer.relay({ k: 'change', key, value });
        // the host picks the Hooded Stranger's workshop for the whole world, and tells everyone
        InteriorFactory.onStrangerHome = (id) => { if (this.role === 'host') multiplayer.relay({ k: 'stranger_home', id }); };
        // and the other story homes (Nikoli's campfire, the Stranger's act 2 workshop) the same way
        InteriorFactory.onHomeClaim = (key, id) => { if (this.role === 'host') multiplayer.relay({ k: 'story_home', key, id }); };
        if (!gameState.multiplayer || !gameState.multiplayer.guests) gameState.multiplayer = { guests: {} };
        this._say('Your world is open to your friends.');
        this._sendTime();
    }

    _welcomeGuest(id) {
        if (!SaveManager.canSaveNow()) return;   // the host's world is not loaded right now: the guest asks again
        const snapshot = SaveManager.createSnapshot();
        const stored = gameState.multiplayer && gameState.multiplayer.guests ? gameState.multiplayer.guests[id] : null;
        const inside = gameState.world.isInterior && gameState.world.savedOverworld;
        const spawn = inside
            ? { col: gameState.world.savedOverworld.returnCol, row: gameState.world.savedOverworld.returnRow }
            : { col: gameState.player.col, row: gameState.player.row };
        multiplayer.relay({ k: 'world', world: worldPart(snapshot.data), player: stored ? stored.data : null, spawn }, id);
    }

    _keepGuest(id, data) {
        if (!data || !data.party) return;
        if (!gameState.multiplayer || !gameState.multiplayer.guests) gameState.multiplayer = { guests: {} };
        const who = multiplayer.room && multiplayer.room.players.find(p => p.id === id);
        gameState.multiplayer.guests[id] = { username: who ? who.username : (gameState.multiplayer.guests[id]?.username || 'Guest'), data, savedAt: new Date().toISOString() };
    }

    _hostSaveSoon(minGapMs) {
        if (this.env && this.env.getScene() === 'overworld') SaveManager.autosave(minGapMs);
    }

    /** A shared encounter let `minutes` pass on its players' clocks (EncounterLogic ADVANCE_TIME): the host moves the world's clock with
     *  them when they were not in it. */
    sharedTimePassed(minutes, players) {
        if (this.role !== 'guest' || !multiplayer.room) return;
        const host = multiplayer.room.players.find(p => p.isHost);
        if (host && !(players || []).includes(host.id)) multiplayer.relay({ k: 'time_add', minutes }, host.id);
    }

    /* The clock, and the world's weather: the host's weather out in the open (kept while the host is indoors, where it is always clear). */
    _sendTime() {
        const w = this._outdoorWeather;
        multiplayer.relay({ k: 'time', time: gameState.world.time, day: gameState.world.day, weather: w ? { id: w.id, timeRemaining: w.timeRemaining } : null });
        this._sentWeatherId = w ? w.id : null;
    }

    // ================================================================ A NEW WORLD
    /* Host a World > New World: on Start, every player makes a character at once (the host's character creator decides the world: seed, difficulty,
       cheats; a guest's cannot change them). Whoever finishes waits in the creator until everyone has a character; then the host says `begin`, and
       everyone plays the prologue together and wakes in the same new world: the host's world is built as for a new game, the guests are let in
       with the character they made, beside the host. */
    startNewWorld() {
        this.newWorld = { ready: new Set(), began: false, myParty: null };
        if (multiplayer.isHost) { this.role = 'founding'; this._hostWhenLoaded = true; }
        else this.role = 'creating';
        events.emit('CHANGE_SCENE', { scene: 'character-creator', data: { mpGuest: !multiplayer.isHost, mpNewWorld: true } });
    }

    /** Whether the character creator should hand its character to this flow (not start a game of its own). */
    get makingNewWorld() { return !!(this.newWorld && !this.newWorld.began); }

    /** This player has made their character: tell everyone, and wait for the others. */
    characterReady() {
        if (!this.makingNewWorld) return false;
        const me = multiplayer.you && multiplayer.you.id;
        if (this.role === 'creating') this.newWorld.myParty = playerPart(SaveManager.createSnapshot().data);
        if (me) this.newWorld.ready.add(me);
        multiplayer.relay({ k: 'char_ready' });
        this._checkBegin();
        return true;
    }

    /** Waiting in the creator for the others: { ready, total } (null when not waiting). */
    newWorldWaiting() {
        const me = multiplayer.you && multiplayer.you.id;
        if (!this.makingNewWorld || !me || !this.newWorld.ready.has(me)) return null;
        const players = (multiplayer.room ? multiplayer.room.players : []).filter(p => p.connected !== false);
        return { ready: players.filter(p => this.newWorld.ready.has(p.id)).length, total: players.length,
            waitingFor: players.filter(p => !this.newWorld.ready.has(p.id)).map(p => p.username) };
    }

    /* The host: once every player still in the room has a character, everyone begins. */
    _checkBegin() {
        if (!multiplayer.isHost || !this.makingNewWorld || !multiplayer.room) return;
        const players = multiplayer.room.players.filter(p => p.connected !== false);
        if (!players.every(p => this.newWorld.ready.has(p.id))) return;
        multiplayer.relay({ k: 'begin' });
        this._begin();
    }

    _begin() {
        if (!this.makingNewWorld) return;
        this.newWorld.began = true;
        if (this.role === 'founding') {
            // the host: the new world is built from their creator's choices and the prologue plays (SceneManager); hosting starts with it
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }
        // a guest: ask to be let into the host's new world with the character just made (_onWorld), and play the prologue there
        this.role = 'joining';
        this._t.join = JOIN_RETRY;
        this._t.joinFor = 0;
    }

    // ================================================================ GUEST
    /** The lobby: this player is a guest in a room whose world is open. Asks the host to be let in. */
    requestJoin() {
        if (this.role) return;
        this.role = 'joining';
        this._t.join = JOIN_RETRY;   // ask at once
        this._t.joinFor = 0;
    }

    _onWorld(msg) {
        if (this.role !== 'joining') return;
        const spawn = msg.spawn || { col: 0, row: 0 };
        if (this.newWorld && this.newWorld.myParty) {
            // the character made for the new world, beside the host, and the prologue
            const mine = this.newWorld.myParty;
            this.newWorld = null;
            this._enter(msg.world, placeOnOverworld(mine, spawn.col, spawn.row), { prologue: true });
            return;
        }
        if (msg.player) {
            this._enter(msg.world, msg.player);
        } else {
            // a first visit: make a character, then step into the world beside the host
            this.role = 'creating';
            this.pending = { world: msg.world, spawn };
            events.emit('CHANGE_SCENE', { scene: 'character-creator', data: { mpGuest: true } });
        }
    }

    get creatingCharacter() { return this.role === 'creating'; }

    /** The character creator has built the guest's party (characterCreatorLogic.finalizeCharacter): into the host's world with it. */
    characterCreated() {
        if (this.role !== 'creating' || !this.pending) return false;
        const { world, spawn } = this.pending;
        this.pending = null;
        const mine = playerPart(SaveManager.createSnapshot().data);
        // a first character in a world started new together plays the prologue too
        const fresh = !!(multiplayer.room && multiplayer.room.world && multiplayer.room.world.isNew);
        this._enter(world, placeOnOverworld(mine, spawn.col, spawn.row), { prologue: fresh });
        return true;
    }

    _enter(world, player, { prologue = false } = {}) {
        try {
            SaveManager.applySnapshot(SaveManager.wrapData(mergeParts(world, player)));
        } catch (e) {
            console.error('[multiplayer] Could not enter the world:', e);
            this.end('The host\'s world could not be loaded.');
            return;
        }
        this.role = 'guest';
        worldSync.ownsWorld = false;        // the host's world: this player's own saved story does not count in it (story/worldStory.js)
        TimeSystem.followsWeather = true;   // the host's weather from now on
        this.remotes.clear();
        this._remember(multiplayer.room);
        SaveManager.guestSink = async (snapshot) => multiplayer.relay({ k: 'player_save', data: playerPart(snapshot.data) });
        worldSync.onLocalChange = (key, value) => multiplayer.relay({ k: 'change', key, value });
        // a guest never decides where the Hooded Stranger lives: a workshop it walks into first is only a claim, which the host answers
        InteriorFactory.onStrangerHome = (id) => {
            const host = this.role === 'guest' && multiplayer.room && multiplayer.room.players.find(p => p.isHost);
            if (host) multiplayer.relay({ k: 'stranger_claim', id }, host.id);
        };
        InteriorFactory.onHomeClaim = (key, id) => {
            const host = this.role === 'guest' && multiplayer.room && multiplayer.room.players.find(p => p.isHost);
            if (host) multiplayer.relay({ k: 'story_home_claim', key, id }, host.id);
        };
        this._t.save = 0;
        const host = multiplayer.room && multiplayer.room.players.find(p => p.isHost);
        this._say(`You are in ${host ? host.username : 'the host'}'s world.`);
        events.emit('CHANGE_SCENE', { scene: 'overworld', data: { buildWorld: true, mpJoin: true, prologue } });
    }

    // ================================================================ BOTH
    /**
     * Leaves the shared world. A guest's party is sent to the host one last time first. `notice` is shown on the title screen.
     * The host leaving closes the world for everyone.
     */
    end(notice, { toTitle = true } = {}) {
        const role = this.role;
        if (!role) return;
        if (typeof this.beforeLeave === 'function') this.beforeLeave(role);   // (multiplayerSocial: a duel in progress is undone first)
        if (role === 'guest' && SaveManager.canSaveNow()) {
            try { multiplayer.relay({ k: 'player_save', data: playerPart(SaveManager.createSnapshot().data) }); } catch (e) { /* the host will have the last one */ }
        }
        this.role = null;
        this.newWorld = null;
        this._hostWhenLoaded = false;
        InteriorFactory.onStrangerHome = null;   // alone again: this world decides the Hooded Stranger's workshop itself
        InteriorFactory.onHomeClaim = null;
        this.pending = null;
        TimeSystem.followsWeather = false;
        TimeSystem.sharedWeather = null;
        this._outdoorWeather = null;
        worldSync.onLocalChange = null;
        worldSync.ownsWorld = true;   // back in a world of one's own
        this.remotes.clear();
        this._known.clear();
        this.messages = [];
        multiplayer.leave();
        // a guest's game is the host's world: it must never be written into the guest's own save slots
        if (role === 'guest' || role === 'creating') SaveManager.guestSink = async () => false;
        if (notice) this.endNotice = notice;
        if (toTitle && role !== 'host' && this.env && this.env.getScene() !== 'title') events.emit('CHANGE_SCENE', { scene: 'title' });
    }

    /** The title screen takes the reason the last world was left, once. */
    takeEndNotice() {
        const n = this.endNotice;
        this.endNotice = null;
        return n;
    }

    _onRelay(from, data) {
        switch (data.k) {
            case 'join_req':
                if (this.role === 'host') this._welcomeGuest(from);
                else if (this.role === 'founding' && this.makingNewWorld) multiplayer.relay({ k: 'founding' }, from);   // still being made: make a character too
                break;
            case 'founding':   // a guest who arrived while the new world is still being made: into the creator with the others
                if (this.role === 'joining' && !this.newWorld) {
                    this.role = null;
                    this.startNewWorld();
                }
                break;
            case 'char_ready':
                if (this.newWorld) { this.newWorld.ready.add(from); this._checkBegin(); }
                break;
            case 'begin': {
                const host = multiplayer.room && multiplayer.room.players.find(p => p.isHost);
                if (host && from === host.id) this._begin();
                break;
            }
            case 'world': this._onWorld(data); break;
            case 'player_save':
                if (this.role === 'host') { this._keepGuest(from, data.data); this._hostSaveSoon(30000); }
                break;
            case 'time_add':   // a party's encounter that the host was not in let time pass (a rest): the world's clock is the host's
                if (this.role === 'host' && Number(data.minutes) > 0) { TimeSystem.advance(Math.min(48 * 60, Number(data.minutes))); this._sendTime(); }
                break;
            case 'time':
                if (this.role === 'guest') {
                    if (typeof data.time === 'number') gameState.world.time = data.time;
                    if (typeof data.day === 'number') gameState.world.day = data.day;
                    if (data.weather && data.weather.id) {   // the world's weather (TimeSystem.syncBiomeWeather puts it up when this player is outside)
                        TimeSystem.sharedWeather = { id: String(data.weather.id).toUpperCase(), timeRemaining: Number(data.weather.timeRemaining) };
                        TimeSystem.syncBiomeWeather();
                        const cur = gameState.world.currentWeather;
                        if (cur && !gameState.world.isInterior && Number.isFinite(TimeSystem.sharedWeather.timeRemaining)) cur.timeRemaining = TimeSystem.sharedWeather.timeRemaining;
                    }
                }
                break;
            case 'change': {
                if (!this.active) break;
                const wm = this.env && this.env.getWorldManager();
                if (wm && wm.applyRemoteChange) wm.applyRemoteChange(data.key, data.value === null ? null : data.value);
                else if (typeof data.key === 'string') gameState.world.changes[data.key] = data.value;
                break;
            }
            case 'pos': if (this.active) this._onPos(from, data); break;
            case 'stranger_claim':   // the host keeps the first claim and tells everyone the answer (the claimant takes it if it lost)
                if (this.role === 'host') {
                    if (!gameState.world.strangerHome && typeof data.id === 'string') { gameState.world.strangerHome = data.id; this._hostSaveSoon(5000); }
                    multiplayer.relay({ k: 'stranger_home', id: gameState.world.strangerHome });
                }
                break;
            case 'stranger_home':
                if (this.role === 'guest' && typeof data.id === 'string') gameState.world.strangerHome = data.id;
                break;
            case 'story_home_claim':   // the other story homes (InteriorFactory.STORY_HOMES): the host keeps the first claim and tells everyone
                if (this.role === 'host' && STORY_HOMES.includes(data.key) && data.key !== 'strangerHome') {
                    if (!gameState.world[data.key] && typeof data.id === 'string') { gameState.world[data.key] = data.id; this._hostSaveSoon(5000); }
                    multiplayer.relay({ k: 'story_home', key: data.key, id: gameState.world[data.key] });
                }
                break;
            case 'story_home':
                if (this.role === 'guest' && STORY_HOMES.includes(data.key) && typeof data.id === 'string') gameState.world[data.key] = data.id;
                break;
        }
    }

    _onRoom(room) {
        if (room && this.makingNewWorld) this._checkBegin();   // someone left while the others waited: begin without them
        if (!this.active || !room) return;
        const me = multiplayer.you && multiplayer.you.id;
        const now = new Map(room.players.map(p => [p.id, p]));
        for (const p of room.players) {
            if (p.id === me) continue;
            const was = this._known.get(p.id);
            if (was === undefined) this._say(`${p.username} joined the world.`);
            else if (was && !p.connected) this._say(`${p.username} lost their connection.`);
            else if (!was && p.connected) this._say(`${p.username} is back.`);
        }
        for (const [id] of this._known) {
            if (id === me || now.has(id)) continue;
            const r = this.remotes.get(id);
            const name = r ? r.username : 'A player';
            this._say(`${name} left the world.`);
            this.remotes.delete(id);
            if (this.role === 'host') this._hostSaveSoon(0);   // their last save is in: write it down
        }
        this._remember(room);
        this._lastPos = '';   // a newcomer needs to see where everyone is
    }

    _remember(room) {
        this._known = new Map((room ? room.players : []).map(p => [p.id, p.connected]));
    }

    _onClosed(reason) {
        if (!this.role) return;
        if (this.role === 'host') {
            this.end(null, { toTitle: false });
            this._say('Your world went offline: you are playing alone now.');
            return;
        }
        const text = reason === 'kicked' ? 'The host removed you from their world.'
            : reason === 'connection_lost' ? 'The connection to the host\'s world was lost.'
            : 'The host closed their world. Your characters are saved in it.';
        this.end(text);
    }

    _onPos(from, d) {
        let r = this.remotes.get(from);
        const room = multiplayer.room;
        const who = room && room.players.find(p => p.id === from);
        if (!r) {
            r = { id: from, entity: { id: `remote_${from}`, remote: true, x: 0, y: 0, prevX: 0, prevY: 0, hitbox: { y: 0.5, h: 0.5 }, direction: 'DOWN', animState: 'idle', animPhase: 0, idleTimer: 0 }, placed: false };
            this.remotes.set(from, r);
        }
        r.username = who ? who.username : (r.username || 'Player');
        r.col = d.col | 0; r.row = d.row | 0;
        r.dir = typeof d.dir === 'string' ? d.dir.toUpperCase() : 'DOWN';
        r.moving = !!d.moving; r.run = !!d.run;
        if (r.map !== d.map) r.placed = false;   // through a door: they appear, they do not slide there
        r.map = String(d.map || 'world');
        r.sprite = typeof d.sprite === 'string' ? d.sprite : null;
        r.party = Array.isArray(d.party) ? d.party.filter(x => typeof x === 'string').slice(0, 2) : [];   // the two who walk behind them
        r.grouped = !!d.grouped;
        r.scene = String(d.scene || 'overworld');
        r.dur = Math.max(0.05, Math.min(1, Number(d.dur) || 0.25));
        r.entity.spriteKey = r.sprite;
        r.entity.label = r.username;
        r.entity.busy = r.scene === 'battle' ? 'In battle' : r.scene === 'encounter' ? 'Busy' : null;
    }

    /** Every frame (SceneManager.update): sends this player's position, the host's clock and the guest's saves, and moves the others. */
    update(dt) {
        if (this.role === 'joining') {
            this._t.joinFor += dt;
            this._t.join += dt;
            if (this._t.joinFor > JOIN_GIVE_UP) { this.end('The host did not answer. They may be in a menu or a fight: try again in a moment.', { toTitle: false }); return; }
            if (this._t.join >= JOIN_RETRY) {
                this._t.join = 0;
                const host = multiplayer.room && multiplayer.room.players.find(p => p.isHost);
                if (host) multiplayer.relay({ k: 'join_req' }, host.id);
            }
            return;
        }
        if (!this.active) return;
        const scene = this.env ? this.env.getScene() : 'overworld';

        if (this.role === 'host') {
            // the world's weather is the host's outside; a change goes out at once, not at the next tick of the clock
            const cw = gameState.world.currentWeather;
            if (!gameState.world.isInterior && cw) this._outdoorWeather = { id: String(cw.id).toUpperCase(), timeRemaining: cw.timeRemaining };
            this._t.time += dt;
            if (this._t.time >= TIME_EVERY || (this._outdoorWeather && this._outdoorWeather.id !== this._sentWeatherId)) { this._t.time = 0; this._sendTime(); }
        } else {
            this._t.save += dt;
            if (this._t.save >= GUEST_SAVE_EVERY) { this._t.save = 0; if (scene === 'overworld') SaveManager.autosave(); }
        }

        // where this player is
        this._t.pos += dt;
        const p = this.env && this.env.getLocalPlayer();
        const T = this.env ? this.env.config.TILE_SIZE : 16;
        let col = gameState.player.col, row = gameState.player.row, moving = false, run = false, dir = gameState.player.direction || 'DOWN', dur = 0.25;
        if (p && scene === 'overworld') {
            dir = p.direction || dir;
            if (p.isMoving && p.destX !== undefined) { col = Math.round(p.destX / T); row = Math.round(p.destY / T); moving = true; run = !!p.isRunning; }
            else { col = Math.round(p.x / T); row = Math.round(p.y / T); }
            const cfg = this.env.config;
            dur = run ? (cfg.RUN_DURATION ?? cfg.WALK_DURATION * 0.55) : cfg.WALK_DURATION;
        }
        const party = followerSprites(), grouped = !!this.groupedProbe();
        const sig = `${col},${row},${dir},${moving},${run},${mapKey()},${scene},${party.join('|')},${grouped}`;
        if (sig !== this._lastPos || this._t.pos >= POS_HEARTBEAT) {
            this._lastPos = sig;
            this._t.pos = 0;
            multiplayer.relay({ k: 'pos', col, row, dir, moving, run, dur, map: mapKey(), sprite: leaderSprite(), party, grouped, scene });
        }

        // the others, walking towards the tile they last said they were on
        for (const r of this.remotes.values()) this._step(r, dt, T);
    }

    _step(r, dt, T) {
        const e = r.entity;
        e.prevX = e.x; e.prevY = e.y;
        const tx = r.col * T, ty = r.row * T;
        const dx = tx - e.x, dy = ty - e.y;
        const dist = Math.hypot(dx, dy);
        e.direction = r.dir;
        if (e.tgtCol !== r.col || e.tgtRow !== r.row) {   // a new step: it starts from the tile they were heading for
            e.sourceX = (e.tgtCol ?? r.col) * T; e.sourceY = (e.tgtRow ?? r.row) * T;
            e.tgtCol = r.col; e.tgtRow = r.row;
        }
        if (!r.placed || dist > 4 * T) {
            e.x = e.prevX = tx; e.y = e.prevY = ty;
            e.sourceX = tx; e.sourceY = ty;
            r.placed = true;
            e.animState = 'idle';
            e.isMoving = false;
            return;
        }
        const span = Math.max(1, Math.hypot(tx - e.sourceX, ty - e.sourceY));
        e.isMoving = dist > 0.01;
        e.moveProgress = Math.max(0, Math.min(1, 1 - dist / span));
        if (dist > 0.01) {
            const stepLen = Math.min(dist, (T / r.dur) * dt);
            e.x += dx / dist * stepLen;
            e.y += dy / dist * stepLen;
            if (e.animState === 'idle') e.animPhase = 0;
            e.animState = r.run ? 'run' : 'walk';
            e.animPhase = (e.animPhase + stepLen / T / (r.run ? 3 : 2)) % 1;
        } else if (!r.moving) {
            if (e.animState !== 'idle') { e.animState = 'idle'; e.idleTimer = 0; }
            e.idleTimer += dt;
        }
    }

    /** The other players on this player's map (their records: entity, party sprites, grouped). */
    visibleRemotes() {
        if (!this.active) return [];
        const here = mapKey();
        return [...this.remotes.values()].filter(r => r.placed && r.map === here && r.sprite);
    }

    /** The other players standing on the same map as this player, for the overworld to draw. */
    visibleEntities() {
        if (!this.active) return [];
        const here = mapKey();
        const out = [];
        for (const r of this.remotes.values()) if (r.placed && r.map === here && r.sprite) out.push(r.entity);
        return out;
    }

    _say(text) {
        this.messages.push({ text, at: performance.now() });
        if (this.messages.length > 4) this.messages.shift();
    }

    /** The join / leave lines still on screen: [{ text, alpha }]. */
    visibleMessages() {
        const now = performance.now();
        this.messages = this.messages.filter(m => now - m.at < MESSAGE_SECONDS * 1000);
        return this.messages.map(m => ({ text: m.text, alpha: Math.min(1, (MESSAGE_SECONDS * 1000 - (now - m.at)) / 800) }));
    }
}

export const multiplayerSession = new MultiplayerSession();

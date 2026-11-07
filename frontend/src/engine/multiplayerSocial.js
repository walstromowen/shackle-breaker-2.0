/**
 * engine/multiplayerSocial.js
 *
 * What players in a shared world (engine/multiplayerSession.js) do with each other. Walk up to another player and press Space:
 *   Trade               the trade screen (screens/trade): each puts items and coin on the table; nothing changes hands until both accept the
 *                       same two offers
 *   Invite to Party     they join your party: they walk behind you, and your fights pull them in (shared/core/multiplayerParty.js says
 *                       who fights). Spoils are shared: coin split evenly, each item to one of you at random
 *   Challenge to a Duel your party against theirs, each of you choosing for your own side. Nothing is at stake: when it ends both parties are
 *                       put back exactly as they were
 * Every request is a question on the other player's screen (Accept / Decline), and nothing happens without a yes.
 *
 * A shared fight (a duel, or a party's fight) is played on every one of its players' browsers from the same seed: see BattleController.
 * The messages (relay, `k`):
 *   rq { rid, kind }             a request: 'trade' | 'party' | 'duel'           rq_ans { rid, ok, why?, party? }   the answer
 *   tr_offer { v, items, gold }  my offer changed (v counts the changes)         tr_accept { mine, theirs }  I accept these two offers
 *   tr_done / tr_cancel          the trade went through / was called off
 *   grp { leader, members }      a party leader's party, to everyone (members [] = no party)
 *   grp_leave                    a member leaves (to the leader)              grp_party { members }   a member's characters, to the leader
 *   bt_start { spec }            a shared fight begins                         bt_dec / bt_sync   picks and the lead's health totals
 */
import { events } from '../../../shared/core/eventBus.js';
import { gameState } from '../../../shared/core/gameState.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';
import { InventorySystem } from '../../../shared/items/inventorySystem.js';
import { buildLineup, PARTY_PULL_RADIUS } from '../../../shared/core/multiplayerParty.js';
import { PartyManager } from '../../../shared/characters/partyManager.js';
import { CorruptionSystem } from '../../../shared/characters/corruptionSystem.js';
import { multiplayer } from './multiplayerClient.js';
import { multiplayerSession } from './multiplayerSession.js';
import { serializeEntity, hydrateEntity, hydrateItem } from './saveManager.js';

const REQUEST_SECONDS = 20;
const CHAT_MAX = 200;   // characters in one chat line
const MAX_GROUP = 3;
const PARTY_SEND_EVERY = 4;   // seconds between a player's character updates to the rest of their party (only when they changed)
export { PARTY_PULL_RADIUS };
const KIND_TEXT = { trade: 'wants to trade with you.', party: 'invites you to their party.', duel: 'challenges you to a duel (nothing at stake).' };

const newId = () => Math.random().toString(36).slice(2, 10);
const living = (m) => m && !(m.hp <= 0);

class MultiplayerSocial {
    constructor() {
        this.prompt = null;          // the question on the overworld: { title, text, options: [{ id, label }], focus, onPick, until? }
        this.outgoing = null;        // { rid, kind, to, until }: my request, waiting for an answer
        this.incoming = null;        // { rid, kind, from }
        this.trade = null;           // the trade in progress (see openTrade)
        this.groups = new Map();     // leaderId -> [memberIds], as the leaders last said
        // the betrayal encounter can pick another player's shackled companion while we share fights (CorruptionSystem.pickAnyBetrayer)
        CorruptionSystem.groupParties = () => this.nearbyParty().map(id => ({ owner: id, members: this.groupParties.get(id) }));
        this.groupParties = new Map();   // the other players of my party -> their characters (serialized), for building a shared fight
        this._partySentTo = new Set();   // who has my characters (a newcomer to the party gets them at once)
        this.battle = null;          // the shared fight this player is in: { bid, kind, players, ... }
        this.early = new Map();      // bid -> [picks] that came before the fight was set up
        this.duelBackup = null;      // my party as it was before a duel
        this._t = { party: 0 };
        this._lastPartyJson = '';
        this._wired = false;
    }

    wire() {
        if (this._wired) return;
        this._wired = true;
        multiplayer.on('relay', (msg) => this._onRelay(msg.from, msg.data || {}));
        multiplayer.on('room', (room) => this._onRoom(room));
        multiplayer.on('closed', () => this.reset());
        multiplayerSession.groupedProbe = () => false;   // a party of players walks freely, each with their own party behind them
    }

    reset() {
        if (this.trade) this._closeTrade('The world closed, so the trade was called off.');
        this.prompt = null; this.outgoing = null; this.incoming = null;
        this.groups.clear(); this.groupParties.clear();
    }

    get me() { return multiplayer.you ? multiplayer.you.id : null; }
    nameOf(id) {
        const p = multiplayer.room && multiplayer.room.players.find(x => x.id === id);
        return p ? p.username : 'Another player';
    }
    _scene() { return multiplayerSession.env ? multiplayerSession.env.getScene() : 'overworld'; }
    _say(text) { multiplayerSession._say(text); }
    _send(data, to) { multiplayer.relay(data, to); }

    // ================================================================ GROUPS
    /** The party I am in: { leader, members } (members does not include the leader), or null. */
    myGroup() {
        const me = this.me;
        for (const [leader, members] of this.groups) if (leader === me || members.includes(me)) return { leader, members };
        return null;
    }
    groupOf(id) {
        for (const [leader, members] of this.groups) if (leader === id || members.includes(id)) return { leader, members };
        return null;
    }
    get isLeader() { const g = this.myGroup(); return !!g && g.leader === this.me && g.members.length > 0; }
    get isMember() { const g = this.myGroup(); return !!g && g.leader !== this.me; }

    _setGroup(leader, members) {
        if (members && members.length) this.groups.set(leader, members); else this.groups.delete(leader);
        // nobody is in two parties
        for (const [l, m] of this.groups) if (l !== leader) this.groups.set(l, m.filter(id => !(members || []).includes(id) && id !== leader));
    }

    _broadcastGroup() {
        const g = this.groups.get(this.me) || [];
        this._send({ k: 'grp', leader: this.me, members: g });
    }

    leaveGroup() {
        const g = this.myGroup();
        if (!g) return;
        if (g.leader === this.me) {
            this.groups.delete(this.me);
            this._broadcastGroup();
            this._say('You broke up the party.');
        } else {
            this._send({ k: 'grp_leave' }, g.leader);
            this.groups.set(g.leader, g.members.filter(id => id !== this.me));
            this.groupParties.clear();
            this._say(`You left ${this.nameOf(g.leader)}'s party.`);
        }
    }

    removeFromGroup(id) {
        const g = this.groups.get(this.me);
        if (!g) return;
        this._setGroup(this.me, g.filter(x => x !== id));
        this.groupParties.delete(id);
        this._broadcastGroup();
        this._say(`${this.nameOf(id)} left the party.`);
    }

    /** The other players of my party (connected), anywhere in the world. */
    partyPlayers() {
        const g = this.myGroup();
        if (!g || !multiplayerSession.active) return [];
        return this.partyHere([g.leader, ...g.members].filter(id => id !== this.me));
    }

    /** The players of my party a fight or an encounter I start pulls in: on my map, out in the world, within PARTY_PULL_RADIUS tiles, and whose
     *  characters I know (they send them every few seconds). */
    nearbyParty() {
        // in a shared encounter (and the fight it leads to), the players in it
        if (this.encounterPlayers) return this.encounterPlayers.filter(id => id !== this.me && this.groupParties.has(id) && this.partyHere([id]).length);
        const here = gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world';
        const me = gameState.player;
        return this.partyPlayers().filter(id => {
            const r = multiplayerSession.remotes.get(id);
            if (!r || !r.placed || r.map !== here || (r.scene && r.scene !== 'overworld') || !this.groupParties.has(id)) return false;
            return Math.max(Math.abs(r.col - me.col), Math.abs(r.row - me.row)) <= PARTY_PULL_RADIUS;
        });
    }

    /** Party members used to walk behind their leader; they keep their own feet now (every player explores, picks up and interacts). */
    get isFollowing() { return false; }

    // ================================================================ REQUESTS
    /** The menu for the player standing in front of me. */
    openPlayerMenu(otherId) {
        const name = this.nameOf(otherId);
        const mine = this.myGroup(), theirs = this.groupOf(otherId);
        const options = [{ id: 'trade', label: 'Trade' }];
        const together = mine && theirs && mine.leader === theirs.leader;
        if (together && mine.leader === this.me) options.push({ id: 'kick', label: 'Remove from Party' });
        else if (together) options.push({ id: 'leave', label: 'Leave Party' });
        else if (!this.isMember && !theirs && (!mine || mine.members.length < MAX_GROUP - 1)) options.push({ id: 'party', label: 'Invite to Party' });
        options.push({ id: 'duel', label: 'Challenge to a Duel' }, { id: 'cancel', label: 'Never mind' });
        this.prompt = {
            title: name, text: theirs && !together ? `${name} is in ${this.nameOf(theirs.leader)}'s party.` : 'What will you do?', options, focus: 0,
            onPick: (id) => {
                if (id === 'kick') this.removeFromGroup(otherId);
                else if (id === 'leave') this.leaveGroup();
                else if (id === 'trade' || id === 'party' || id === 'duel') this.request(otherId, id);
            },
        };
    }

    request(to, kind) {
        if (this.outgoing) { this._say('Wait for your last request to be answered.'); return; }
        const r = multiplayerSession.remotes.get(to);
        if (r && r.scene !== 'overworld') { this._say(`${this.nameOf(to)} is busy right now.`); return; }
        const rid = newId();
        this.outgoing = { rid, kind, to, until: performance.now() + REQUEST_SECONDS * 1000 };
        this._send({ k: 'rq', rid, kind }, to);
        this._say(`Asked ${this.nameOf(to)}…`);
    }

    _onRequest(from, d) {
        const kind = d.kind;
        if (!KIND_TEXT[kind]) return;
        const busy = this._scene() !== 'overworld' || this.prompt || this.trade || this.battle || this.incoming;
        let why = busy ? 'busy' : null;
        if (!why && kind === 'party' && this.myGroup()) why = 'in_party';
        if (why) { this._send({ k: 'rq_ans', rid: d.rid, ok: false, why }, from); return; }
        this.incoming = { rid: d.rid, kind, from };
        this.prompt = {
            title: this.nameOf(from), text: `${this.nameOf(from)} ${KIND_TEXT[kind]}`,
            options: [{ id: 'yes', label: 'Accept' }, { id: 'no', label: 'Decline' }], focus: 0,
            until: performance.now() + REQUEST_SECONDS * 1000,
            onPick: (id) => this._answer(id === 'yes'),
        };
    }

    _answer(ok) {
        const q = this.incoming;
        this.incoming = null;
        if (!q) return;
        const ans = { k: 'rq_ans', rid: q.rid, ok };
        if (ok && q.kind === 'duel') ans.party = gameState.party.members.map(serializeEntity);
        this._send(ans, q.from);
        if (!ok) return;
        if (q.kind === 'trade') this.openTrade(q.from);
        if (q.kind === 'party') { this._lastPartyJson = ''; this._say(`You joined ${this.nameOf(q.from)}'s party.`); }
        if (q.kind === 'duel') this._say(`The duel with ${this.nameOf(q.from)} begins!`);
    }

    _onAnswer(from, d) {
        const out = this.outgoing;
        if (!out || out.rid !== d.rid) return;
        this.outgoing = null;
        const name = this.nameOf(from);
        if (!d.ok) {
            this._say(d.why === 'busy' ? `${name} is busy right now.` : d.why === 'in_party' ? `${name} is already in a party.` : d.why === 'timeout' ? `${name} did not answer.` : `${name} said no.`);
            return;
        }
        if (out.kind === 'trade') this.openTrade(from);
        else if (out.kind === 'party') {
            const g = this.groups.get(this.me) || [];
            if (g.length >= MAX_GROUP - 1) { this._say('Your party is full.'); return; }
            this._setGroup(this.me, [...g.filter(x => x !== from), from]);
            this._broadcastGroup();
            this._say(`${name} joined your party.`);
        } else if (out.kind === 'duel') this._startDuel(from, d.party || []);
    }

    // ================================================================ TRADE
    openTrade(partner) {
        this.prompt = null;
        this.trade = { partner, partnerName: this.nameOf(partner), mine: [], myGold: 0, theirs: [], theirGold: 0, v: 0, theirV: 0, iAccept: null, theyAccept: null, closed: null };
        events.emit('CHANGE_SCENE', { scene: 'trade' });
    }

    /** What I have that I can still put on the table: my bag less what is already offered. [{ iid, defId, name, qty, stackable, item }] */
    tradeBag() {
        const t = this.trade;
        return (gameState.party.inventory || []).map(item => {
            const offered = t ? t.mine.filter(o => o.iid === item.instanceId).reduce((n, o) => n + o.qty, 0) : 0;
            const def = ItemDefinitions[item.defId] || {};
            return { iid: item.instanceId, defId: item.defId, name: def.name || item.defId, qty: (item.qty || 1) - offered, stackable: !!def.stackable, item, def };
        }).filter(x => x.qty > 0);
    }

    offerItem(iid) {
        const t = this.trade;
        if (!t || t.closed) return false;
        const row = this.tradeBag().find(x => x.iid === iid);
        if (!row) return false;
        const qty = row.stackable ? 1 : row.qty;
        const have = t.mine.find(o => o.iid === iid);
        if (have) have.qty += qty;
        else t.mine.push({ iid, defId: row.defId, qty, stackable: row.stackable, data: row.stackable ? null : row.item.toJSON() });
        this._offerChanged();
        return true;
    }

    withdrawItem(iid) {
        const t = this.trade;
        if (!t || t.closed) return false;
        const o = t.mine.find(x => x.iid === iid);
        if (!o) return false;
        o.qty -= o.stackable ? 1 : o.qty;
        if (o.qty <= 0) t.mine = t.mine.filter(x => x !== o);
        this._offerChanged();
        return true;
    }

    offerGold(delta) {
        const t = this.trade;
        if (!t || t.closed) return false;
        const next = Math.max(0, Math.min(gameState.party.currency || 0, t.myGold + delta));
        if (next === t.myGold) return false;
        t.myGold = next;
        this._offerChanged();
        return true;
    }

    _offerChanged() {
        const t = this.trade;
        t.v++;
        t.iAccept = null;   // a changed table needs a new yes from both
        t.theyAccept = null;
        this._send({ k: 'tr_offer', v: t.v, gold: t.myGold, items: t.mine.map(o => ({ defId: o.defId, qty: o.qty, stackable: o.stackable, data: o.data })) }, t.partner);
    }

    toggleAccept() {
        const t = this.trade;
        if (!t || t.closed) return;
        t.iAccept = t.iAccept ? null : { mine: t.v, theirs: t.theirV };
        this._send({ k: 'tr_accept', accept: !!t.iAccept, mine: t.v, theirs: t.theirV }, t.partner);
        this._tryCompleteTrade();
    }

    cancelTrade() {
        const t = this.trade;
        if (!t) return;
        if (!t.closed) this._send({ k: 'tr_cancel' }, t.partner);
        this._closeTrade(t.closed ? null : 'You called off the trade.');
    }

    _tryCompleteTrade() {
        const t = this.trade;
        if (!t || t.closed || !t.iAccept || !t.theyAccept) return;
        // both said yes to the same two offers
        if (t.iAccept.mine !== t.v || t.iAccept.theirs !== t.theirV || t.theyAccept.mine !== t.theirV || t.theyAccept.theirs !== t.v) return;
        const inv = gameState.party.inventory;
        for (const o of t.mine) {
            const at = inv.findIndex(i => i.instanceId === o.iid);
            if (at < 0) continue;
            const item = inv[at];
            if (o.stackable && (item.qty || 1) > o.qty) item.qty -= o.qty; else inv.splice(at, 1);
        }
        gameState.party.currency = Math.max(0, (gameState.party.currency || 0) - t.myGold) + t.theirGold;
        for (const o of t.theirs) {
            if (o.stackable || !o.data) InventorySystem.addItem(o.defId, o.qty);
            else { const item = hydrateItem(o.data); if (item) inv.push(item); }
        }
        this._closeTrade(`Trade with ${t.partnerName} complete.`);
    }

    _closeTrade(message) {
        const t = this.trade;
        if (!t) return;
        t.closed = message || 'closed';
        this.trade = null;
        if (message) this._say(message);
        if (this._scene() === 'trade') events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    // ================================================================ SHARED FIGHTS
    /** Anyone of my party near enough to be pulled into a fight or an encounter I start (nearbyParty). */
    get sharesFights() { return this.nearbyParty().length > 0; }

    /** How many fighters a fight will face the enemy with (1-3), for the size of the group that spawns: in a party of players it is the
     *  shared line-up, otherwise this player's own party (PartyManager.getFighterCount). */
    fighterCount() {
        const near = this.nearbyParty();
        if (!near.length) return PartyManager.getFighterCount();
        const ids = [this.me, ...near];
        const parties = { [this.me]: gameState.party.members };
        for (const id of ids) if (id !== this.me) parties[id] = this.groupParties.get(id) || [];
        const lineup = buildLineup(ids.map(id => ({ id, members: parties[id].map(m => ({ alive: living(m) })) })));
        return Math.max(1, Math.min(3, lineup.length));
    }

    /** How many players share this player's fights (1 alone or outside a party of players). */
    playerCount() { return 1 + this.nearbyParty().length; }

    /** { fighters, players } for the spawn tables (SpawnTableFactory.generateBattle). */
    partySize() { return { fighters: this.fighterCount(), players: this.playerCount() }; }

    /** The leader's side of another player's companion turning (encounterLogic, betrayal): taken out of my copy of their party, so the
     *  line-up is built without them, and rebuilt as the enemy. Their own browser lets them go when the fight starts (_beginBattle). */
    takeBetrayer(owner, idx) {
        const list = this.groupParties.get(owner);
        const data = list && list[idx];
        if (!data || !CorruptionSystem.isShackled(data)) return null;
        list.splice(idx, 1);
        return CorruptionSystem.turnFoe(hydrateEntity(data));
    }

    /** A fight I start (sceneManager START_BATTLE) with my party near me (or `players`: the ones in the encounter it came out of): our
     *  line-up against these enemies, on every one of their screens too. I am its authority. */
    startPartyBattle(enemies, { background = null, bgm = null, noEscape = false, betrayal = null, players = null } = {}) {
        const ids = [this.me, ...(players ? players.filter(id => id !== this.me && this.groupParties.has(id) && this.partyHere([id]).length) : this.nearbyParty())];
        const parties = { [this.me]: gameState.party.members.map(serializeEntity) };
        for (const id of ids) if (id !== this.me) parties[id] = this.groupParties.get(id);
        const lineup = buildLineup(ids.map(id => ({ id, members: parties[id].map(m => ({ alive: living(m) })) })));
        const spec = {
            bid: newId(), kind: 'party', seed: (Math.random() * 0xffffffff) >>> 0, authority: this.me, players: ids,
            names: Object.fromEntries(ids.map(id => [id, this.nameOf(id)])),
            lineup: lineup.map(e => ({ ...e, data: parties[e.owner][e.idx] })),
            enemies: enemies.map(serializeEntity), background, bgm, noEscape, betrayal,
        };
        for (const id of ids) if (id !== this.me) this._send({ k: 'bt_start', spec }, id);
        this._beginBattle(spec);
    }

    _startDuel(opponent, theirParty) {
        const ids = [this.me, opponent];
        const spec = {
            bid: newId(), kind: 'duel', seed: (Math.random() * 0xffffffff) >>> 0, authority: this.me, players: ids,
            names: { [this.me]: this.nameOf(this.me), [opponent]: this.nameOf(opponent) },
            sides: { [this.me]: gameState.party.members.map(serializeEntity), [opponent]: theirParty },
            background: null,
        };
        this._send({ k: 'bt_start', spec }, opponent);
        this._beginBattle(spec);
    }

    _beginBattle(spec) {
        const me = this.me;
        this.prompt = null;
        if (this.trade) this.cancelTrade();
        let partyEntities, partyMeta, enemies, enemyMeta, opponent = null;
        if (spec.kind === 'duel') {
            opponent = spec.players.find(id => id !== me);
            // a duel is for nothing: my party exactly as it is now comes back afterwards
            this.duelBackup = {
                members: gameState.party.members.map(serializeEntity),
                inventory: (gameState.party.inventory || []).map(i => i.toJSON()),
                currency: gameState.party.currency || 0,
            };
            partyEntities = gameState.party.members.slice();
            partyMeta = partyEntities.map((_, i) => ({ netId: `${me}#${i}`, owner: me }));
            enemies = (spec.sides[opponent] || []).map(hydrateEntity);
            enemyMeta = enemies.map((_, i) => ({ netId: `${opponent}#${i}`, owner: opponent }));
        } else {
            // one of my shackled companions turned on the group (the leader's betrayal encounter): they leave my party before the line-up is read,
            // which the leader built without them
            const b = spec.betrayal;
            if (b && b.owner === me && spec.authority !== me) {
                const turned = gameState.party.members[b.idx];
                if (turned && CorruptionSystem.isShackled(turned)) { CorruptionSystem.turnAgainstParty(turned); this._say(`${turned.name} has turned on the party!`); }
            }
            partyEntities = spec.lineup.map(e => (e.owner === me ? gameState.party.members[e.idx] : hydrateEntity(e.data))).filter(Boolean);
            partyMeta = spec.lineup.map(e => ({ netId: `${e.owner}#${e.idx}`, owner: e.owner }));
            enemies = spec.enemies.map(hydrateEntity);
            enemyMeta = enemies.map((_, i) => ({ netId: `E#${i}` }));
        }
        const players = spec.players.slice();
        this.battle = { bid: spec.bid, kind: spec.kind, players };
        const mp = {
            bid: spec.bid, kind: spec.kind, seed: spec.seed, me, authority: spec.authority, players, names: spec.names,
            partyMeta, enemyMeta, opponent, opponentName: opponent ? spec.names[opponent] : null,
            share: spec.kind === 'party' ? { players, me } : null,
            early: this.early.get(spec.bid) || [],
        };
        this.early.delete(spec.bid);
        events.emit('MP_START_BATTLE', { enemies, context: { mp, partyEntities, backgroundId: spec.background || undefined, weather: null, noEscape: !!spec.noEscape }, bgm: spec.bgm || null });
    }

    /** Of these players, the ones still in the world. */
    partyHere(players) {
        const room = multiplayer.room;
        return (players || []).filter(id => room && room.players.some(p => p.id === id && p.connected));
    }

    /* ---- shared encounters: the leader's encounter, played on every member's screen, decided by vote (EncounterController) ---- */
    /** The leader opens an encounter: the members open it too. Returns the leader's own part of it, for EncounterController.start. */
    startPartyEncounter(data) {
        // the one who started it leads it (their roll, their tie-break); the party near them is pulled in and votes
        const players = [this.me, ...this.nearbyParty()];
        const eid = newId(), seed = (Math.random() * 0xffffffff) >>> 0;
        // the line-up, as for a fight: every player's first characters (3 each for two players, 2 each for three), the leader's lead first.
        // Any of them can step forward (a switch is voted on), and each screen shows the one who did.
        const parties = { [this.me]: gameState.party.members.map(serializeEntity) };
        for (const id of players) if (id !== this.me) parties[id] = this.groupParties.get(id) || [];
        const lineup = buildLineup(players.map(id => ({ id, members: parties[id].map(m => ({ alive: living(m) })) })))
            .map(e => ({ owner: e.owner, idx: e.idx, data: parties[e.owner][e.idx] }));
        const base = { eid, seed, players, leader: this.me, lineup };
        for (const id of players) if (id !== this.me) this._send({ k: 'enc_start', mp: base, encounterId: data.encounterId, context: data.context || {}, bgm: data.bgm || null, quiet: !!data.quiet }, id);
        return { ...base, me: this.me, isLeader: true };
    }

    sendEncounter(mp, d, to) {
        if (to) { this._send({ ...d, eid: mp.eid }, to); return; }
        for (const id of mp.players) if (id !== mp.me) this._send({ ...d, eid: mp.eid }, id);
    }

    /** Chat: a line to everyone in the world (the developer console is the chat box). True when it was sent. */
    sendChat(text) {
        const line = String(text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, CHAT_MAX);
        if (!line || !multiplayerSession.active || multiplayer.status !== 'online') return false;
        this._send({ k: 'chat', text: line });
        return true;
    }

    sendBattleDecision(mp, d) {
        for (const id of mp.players) if (id !== mp.me) this._send({ k: 'bt_dec', bid: mp.bid, ...d }, id);
    }
    sendBattleSync(mp, d) {
        for (const id of mp.players) if (id !== mp.me) this._send({ k: 'bt_sync', bid: mp.bid, ...d }, id);
    }

    /** A shared fight is over (sceneManager BATTLE_ENDED). A duel puts my party back as it was. Returns true if it was a duel. */
    battleEnded(mp) {
        this.battle = null;
        if (!mp || mp.kind !== 'duel') return false;
        const b = this.duelBackup;
        this.duelBackup = null;
        if (b) {
            const members = b.members.map(hydrateEntity);
            gameState.party.members.splice(0, gameState.party.members.length, ...members);
            const inv = b.inventory.map(hydrateItem).filter(Boolean);
            gameState.party.inventory.splice(0, gameState.party.inventory.length, ...inv);
            gameState.party.currency = b.currency;
        }
        return true;
    }

    // ================================================================ MESSAGES
    _onRelay(from, d) {
        switch (d.k) {
            case 'rq': if (multiplayerSession.active) this._onRequest(from, d); break;
            case 'rq_ans': this._onAnswer(from, d); break;
            case 'tr_offer': {
                const t = this.trade;
                if (!t || t.partner !== from) break;
                t.theirs = Array.isArray(d.items) ? d.items : [];
                t.theirGold = Math.max(0, Number(d.gold) || 0);
                t.theirV = d.v;
                t.iAccept = null; t.theyAccept = null;
                break;
            }
            case 'tr_accept': {
                const t = this.trade;
                if (!t || t.partner !== from) break;
                t.theyAccept = d.accept ? { mine: d.mine, theirs: d.theirs } : null;
                this._tryCompleteTrade();
                break;
            }
            case 'tr_cancel':
                if (this.trade && this.trade.partner === from) this._closeTrade(`${this.trade.partnerName} called off the trade.`);
                break;
            case 'grp': {
                const before = this.myGroup();
                this._setGroup(from, Array.isArray(d.members) ? d.members : []);
                const after = this.myGroup();
                if (before && before.leader === from && !after) { this.groupParties.clear(); this._say(`You are no longer in ${this.nameOf(from)}'s party.`); }
                break;
            }
            case 'grp_leave': {
                const g = this.groups.get(this.me);
                if (g && g.includes(from)) this.removeFromGroup(from);
                break;
            }
            case 'grp_party': {   // another player of my party's characters (every player of a party sends theirs to the others)
                const g = this.myGroup();
                if (g && (g.leader === from || g.members.includes(from)) && Array.isArray(d.members)) this.groupParties.set(from, d.members);
                break;
            }
            case 'chat': {
                const text = String(d.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, CHAT_MAX);
                if (text && multiplayerSession.active) events.emit('MP_CHAT', { from, name: this.nameOf(from), text });
                break;
            }
            case 'enc_start':
                if (d.mp && multiplayerSession.active && !this.battle) {
                    this.prompt = null;
                    events.emit('START_ENCOUNTER', { encounterId: d.encounterId, context: d.context || {}, bgm: d.bgm || null, quiet: !!d.quiet, mp: { ...d.mp, me: this.me, isLeader: false } });
                }
                break;
            case 'enc_vote': case 'enc_tally': case 'enc_go': case 'enc_opts':
                events.emit('MP_ENCOUNTER', { ...d, from });
                break;
            case 'bt_start':
                if (d.spec && multiplayerSession.active) this._beginBattle(d.spec);
                break;
            case 'bt_dec':
                if (this.battle && this.battle.bid === d.bid) events.emit('MP_BATTLE_DECISION', d);
                else { const list = this.early.get(d.bid) || []; list.push(d); this.early.set(d.bid, list); }
                break;
            case 'bt_sync':
                if (this.battle && this.battle.bid === d.bid) events.emit('MP_BATTLE_SYNC', d);
                break;
        }
    }

    _onRoom(room) {
        if (!room) return;
        const here = new Set(room.players.map(p => p.id));
        // a player who left is out of every party, and out of any trade with me
        for (const [leader, members] of [...this.groups]) {
            if (!here.has(leader)) { this.groups.delete(leader); continue; }
            this.groups.set(leader, members.filter(id => here.has(id)));
        }
        for (const id of [...this.groupParties.keys()]) if (!here.has(id)) this.groupParties.delete(id);
        if (this.trade && !here.has(this.trade.partner)) this._closeTrade(`${this.trade.partnerName} left, so the trade was called off.`);
        if (this.isLeader) this._broadcastGroup();   // a newcomer learns who is with whom
    }

    /** Every frame (from multiplayerSession.update): request timeouts, and a member's characters for the leader. */
    update(dt) {
        const now = performance.now();
        if (this.outgoing && now > this.outgoing.until) {
            this._say(`${this.nameOf(this.outgoing.to)} did not answer.`);
            this.outgoing = null;
        }
        if (this.prompt && this.prompt.until && now > this.prompt.until) {
            this.prompt = null;
            if (this.incoming) { this._send({ k: 'rq_ans', rid: this.incoming.rid, ok: false, why: 'timeout' }, this.incoming.from); this.incoming = null; }
        }
        // my characters, to every other player of my party (any of us can start a fight that pulls the others in)
        const others = this.partyPlayers();
        if (others.length && !this.battle) {
            this._t.party += dt;
            if (this._t.party >= PARTY_SEND_EVERY) {
                this._t.party = 0;
                const members = gameState.party.members.map(serializeEntity);
                const json = JSON.stringify(members);
                const newcomer = others.some(id => !this._partySentTo.has(id));
                if (json !== this._lastPartyJson || newcomer) {
                    this._lastPartyJson = json;
                    this._partySentTo = new Set(others);
                    for (const id of others) this._send({ k: 'grp_party', members }, id);
                }
            }
        }
    }

    // ================================================================ THE PROMPT (drawn and driven by the overworld)
    pickPrompt(index) {
        const p = this.prompt;
        if (!p) return;
        const opt = p.options[index];
        this.prompt = null;
        if (opt && p.onPick) p.onPick(opt.id);
    }
    cancelPrompt() {
        const p = this.prompt;
        if (!p) return;
        const no = p.options.findIndex(o => o.id === 'no' || o.id === 'cancel');
        this.pickPrompt(no >= 0 ? no : -1);
    }
}

export const multiplayerSocial = new MultiplayerSocial();

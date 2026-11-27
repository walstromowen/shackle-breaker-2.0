/**
 * engine/multiplayerSocial.js
 *
 * What players in a shared world (engine/multiplayerSession.js) do with each other. Walk up to another player and press Space:
 *   Trade               the trade screen (screens/trade): each puts items and coin on the table; nothing changes hands until both accept the
 *                       same two offers
 *   Invite to Party     they join your party (up to 3 players; the leader or any member can invite): your fights and encounters pull in
 *                       every player of the party standing near you (shared/core/multiplayerParty.js says who fights). Spoils are shared: coin split evenly, each item to one of you at random
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
 *   grp_add { id }               a member's invite was accepted: the leader adds them (any member can invite; the leader keeps the party)
 *   grp_full { id }              the leader's answer when there was no room left
 *   bt_start { spec }            a shared fight begins                         bt_dec / bt_sync   picks and the lead's health totals
 *   obj_claim { key, on }        to everyone: the map character or object at `key` ("world|col,row") is in someone's encounter (on) or free
 *                                again (off). While another player holds it, its eyes see no one here and walking up to it starts nothing,
 *                                so two players outside a party never both fight the same bear or madman (claims run out after CLAIM_MS)
 */
import { events } from '../../../shared/core/eventBus.js';
import { gameState } from '../../../shared/core/gameState.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';
import { InventorySystem } from '../../../shared/items/inventorySystem.js';
import { buildLineup, PARTY_PULL_RADIUS } from '../../../shared/core/multiplayerParty.js';
import { PartyManager } from '../../../shared/characters/partyManager.js';
import { CorruptionSystem } from '../../../shared/characters/corruptionSystem.js';
import { multiplayer } from './multiplayerClient.js';
import { WAYPOINT_SHARING, getWaypoints } from '../../../shared/world/waypoints.js';
import { multiplayerSession } from './multiplayerSession.js';
import { serializeEntity, hydrateEntity, hydrateItem } from './saveManager.js';
import { WeatherFactory } from '../../../shared/world/weatherFactory.js';
import { QuestDefinitions, STORY_QUESTS } from '../../../shared/story/questDefinitions.js';
import { encounterDefinitions } from '../../../shared/story/encounterDefinitions.js';
/* The screens a party member cannot be pulled away from: a fight, an encounter or a trade of their own (and the title or the creator). From any
   other (the map, a menu: the inventory, the character page, the journal, the world map, a workshop) they are pulled in. */
const PULL_BLOCKING_SCENES = new Set(['battle', 'encounter', 'trade', 'title', 'boot', 'character-creator']);

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
/* The weather a shared fight is fought in, as sent to the others ({ id, intensity }), and back as a weather of this build (null: clear). */
const weatherSpec = (w) => (w && w.id ? { id: String(w.id), intensity: Number.isFinite(w.intensity) ? w.intensity : undefined } : null);
function weatherFromSpec(spec) {
    if (!spec || !spec.id) return null;
    const w = WeatherFactory.createWeather(spec.id);
    if (w && Number.isFinite(spec.intensity)) w.intensity = spec.intensity;
    return w;
}

/** The stage an encounter opens on, where that depends on the game (initialStage is a function: the Hooded Stranger), or null. */
function openingStage(id, context) {
    const def = encounterDefinitions[id];
    if (!def || typeof def.initialStage !== 'function') return null;
    try { const s = def.initialStage(context); return def.stages && def.stages[s] ? s : null; } catch (e) { return null; }
}

const REQUEST_SECONDS = 20;
const CLAIM_MS = 10 * 60 * 1000;   // a claim nobody let go of (a player who dropped out mid-fight) runs out after this
const CHAT_MAX = 200;
const AFTER_FIGHT_WAIT_MS = 6000;   // how long a won fight's players wait for its leader's encounter (the end of Darius) before playing it alone   // characters in one chat line
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
        this.groupWaypoints = new Map(); // the other players of my party -> their waypoints (the world map offers them for fast travel too)
        this._partySentTo = new Set();   // who has my characters (a newcomer to the party gets them at once)
        this.battle = null;          // the shared fight this player is in: { bid, kind, players, ... }
        this.early = new Map();      // bid -> [picks] that came before the fight was set up
        this.duelBackup = null;      // my party as it was before a duel
        this.declined = new Set();   // players who were already busy (in a fight or an encounter) when my shared fight or encounter began: left out of it
        this.claims = new Map();     // "map|col,row" -> { by, until }: map objects in another player's encounter (obj_claim)
        this.myClaim = null;         // the key of the map object my own encounter is about, until I am back on the map
        this.joining = null;         // { jid, to, what, auto, until }: my ask to join someone's encounter or fight (askToJoin)
        this.afterBattle = null;     // the encounter another player leads after the fight I am in (_afterFight)
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
        // a story quest I start is started for my party too (story/questDefinitions.js STORY_QUESTS): we go through the story together
        events.on('QUEST_STARTED', ({ questId }) => {
            if (!STORY_QUESTS.has(questId) || this._sharingQuest === questId || !multiplayerSession.active) return;
            for (const id of this.partyPlayers()) this._send({ k: 'q_share', questId }, id);
        });
        // leaving the world in the middle of a duel: my party goes back as it was before the duel, before the last save of it is sent
        multiplayerSession.beforeLeave = () => { if (this.duelBackup) this.restoreDuelBackup(); };
        multiplayerSession.groupedProbe = () => false;   // a party of players walks freely, each with their own party behind them
        // a party of players shares its waypoints: the world map lists the others' too (shared/world/waypoints.js allWaypoints)
        WAYPOINT_SHARING.others = () => {
            if (!multiplayerSession.active) return [];
            const party = new Set(this.partyPlayers());
            return [...this.groupWaypoints].filter(([id]) => party.has(id)).map(([owner, waypoints]) => ({ owner, ownerName: this.nameOf(owner), waypoints }));
        };
    }

    reset() {
        if (this.trade) this._closeTrade('The world closed, so the trade was called off.');
        this.prompt = null; this.outgoing = null; this.incoming = null;
        this.groups.clear(); this.groupParties.clear(); this.groupWaypoints.clear();
        this.claims.clear(); this.myClaim = null;
        this.joining = null;
        if (this.afterBattle) clearTimeout(this.afterBattle.timer);
        this.afterBattle = null;
    }

    get me() { return multiplayer.you ? multiplayer.you.id : null; }
    nameOf(id) {
        const p = multiplayer.room && multiplayer.room.players.find(x => x.id === id);
        return p ? p.username : 'Another player';
    }
    _scene() { return multiplayerSession.env ? multiplayerSession.env.getScene() : 'overworld'; }

    // ================================================================ CLAIMS (a map object in someone's encounter)
    _claimKey(col, row) { return `${gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world'}|${col},${row}`; }
    /** I start an encounter with the map object at (col, row): everyone else leaves it alone until I am back on the map. */
    claimObject(col, row) {
        if (!multiplayerSession.active || !Number.isFinite(col) || !Number.isFinite(row)) return;
        if (this.myClaim) this._send({ k: 'obj_claim', key: this.myClaim, on: false });
        this.myClaim = this._claimKey(col, row);
        this._claimLeft = false; this._claimAt = performance.now();
        this._send({ k: 'obj_claim', key: this.myClaim, on: true });
    }
    releaseClaim() {
        if (!this.myClaim) return;
        if (multiplayerSession.active) this._send({ k: 'obj_claim', key: this.myClaim, on: false });
        this.myClaim = null;
    }
    /** The name of the other player whose encounter the map object at (col, row) is in, or null when it is free. */
    claimedBy(col, row) {
        const c = this.claims.get(this._claimKey(col, row));
        if (!c) return null;
        const room = multiplayer.room;
        const here = room && room.players.some(p => p.id === c.by && p.connected);
        if (!here || Date.now() > c.until) { this.claims.delete(this._claimKey(col, row)); return null; }
        return this.nameOf(c.by);
    }
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

    /** The leader adds a player to their party (an invite of theirs or of a member's that was accepted). False when it is full. */
    _addToGroup(id) {
        const g = this.groups.get(this.me) || [];
        if (g.includes(id)) return true;
        if (g.length >= MAX_GROUP - 1) return false;
        this._setGroup(this.me, [...g, id]);
        this._broadcastGroup();
        return true;
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
        if (this.encounterPlayers && this._scene() === 'encounter') return this.encounterPlayers.filter(id => id !== this.me && this.groupParties.has(id) && this.partyHere([id]).length);
        const here = gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world';
        const me = gameState.player;
        return this.partyPlayers().filter(id => {
            const r = multiplayerSession.remotes.get(id);
            if (!r || !r.placed || r.gone || r.map !== here || (r.scene && PULL_BLOCKING_SCENES.has(r.scene)) || !this.groupParties.has(id)) return false;
            return Math.max(Math.abs(r.col - me.col), Math.abs(r.row - me.row)) <= PARTY_PULL_RADIUS;
        });
    }

    /** Would an encounter I start now be shared (and so pull someone in)? Every encounter, the story's too, pulls in only the players of my
     *  party within PARTY_PULL_RADIUS (nearbyParty); one further off can walk up later and ask to join it (askToJoin). */
    sharesEncounter() {
        return this.sharesFights;
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
        else if (!theirs && (!mine || mine.members.length < MAX_GROUP - 1)) options.push({ id: 'party', label: 'Invite to Party' });   // the leader or any member
        options.push({ id: 'duel', label: 'Challenge to a Duel' }, { id: 'cancel', label: 'Never mind' });
        // a player of my party in an encounter or a fight I was left out of: ask to join it (they are asked; askToJoin)
        const r = multiplayerSession.remotes.get(otherId);
        const busyIn = r && (r.scene === 'battle' || r.scene === 'encounter') ? (r.scene === 'encounter' ? 'encounter' : 'fight') : null;
        if (busyIn && together) options.unshift({ id: 'join', label: busyIn === 'fight' ? 'Ask to Join the Fight' : 'Ask to Join the Encounter' });
        let text = theirs && !together ? `${name} is in ${this.nameOf(theirs.leader)}'s party.` : 'What will you do?';
        if (busyIn && together) text = `${name} is in ${busyIn === 'fight' ? 'a fight' : 'an encounter'}.`;
        this.prompt = {
            title: name, text, options, focus: 0,
            onPick: (id) => {
                if (id === 'join') this.askToJoin(otherId);
                else if (id === 'kick') this.removeFromGroup(otherId);
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
            rid: d.rid,
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
        if (q.kind === 'party') { this._lastPartyJson = ''; const g = this.groupOf(q.from); this._say(`You joined ${this.nameOf(g ? g.leader : q.from)}'s party.`); }
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
            const mine = this.myGroup();
            // a member's invite: the leader keeps the party, so the leader is asked to add them
            if (mine && mine.leader !== this.me) { this._send({ k: 'grp_add', id: from }, mine.leader); this._say(`${name} joined the party.`); return; }
            if (!this._addToGroup(from)) { this._say('Your party is full.'); return; }
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
    startPartyBattle(enemies, { background = null, weather = null, bgm = null, noEscape = false, betrayal = null, players = null, afterVictory = null, allies = [] } = {}) {
        if (!players) this.declined.clear();   // (a fight out of a shared encounter keeps out whoever declined that encounter)
        const ids = [this.me, ...(players ? players.filter(id => id !== this.me && this.groupParties.has(id) && this.partyHere([id]).length) : this.nearbyParty())];
        const parties = { [this.me]: gameState.party.members.map(serializeEntity) };
        for (const id of ids) if (id !== this.me) parties[id] = this.groupParties.get(id);
        const lineup = buildLineup(ids.map(id => ({ id, members: parties[id].map(m => ({ alive: living(m) })) })));
        const spec = {
            bid: newId(), kind: 'party', seed: (Math.random() * 0xffffffff) >>> 0, authority: this.me, players: ids,
            names: Object.fromEntries(ids.map(id => [id, this.nameOf(id)])),
            lineup: lineup.map(e => ({ ...e, data: parties[e.owner][e.idx] })),
            enemies: enemies.map(serializeEntity), background, weather: weatherSpec(weather), bgm, noEscape, betrayal,
            allies: (allies || []).map(serializeEntity),   // who fights beside the line-up this once (Nikoli): the same fighter on every screen
            afterVictory: afterVictory && afterVictory.encounterId ? { encounterId: afterVictory.encounterId, context: afterVictory.context || {} } : null,
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
            // fought where the challenger stands: that biome's battle background for the hour, and its weather (the same on both screens)
            ...this._here(),
        };
        this._send({ k: 'bt_start', spec }, opponent);
        this._beginBattle(spec);
    }

    /** The battle background and weather where I stand: { background, weather } for a duel's spec. */
    _here() {
        const wm = multiplayerSession.env && multiplayerSession.env.getWorldManager && multiplayerSession.env.getWorldManager();
        let background = null;
        try {
            const biome = wm && wm.getBiomeAt(gameState.player.col, gameState.player.row);
            background = biome && biome.getBattleBackground ? biome.getBattleBackground(gameState.world.time / 60) : null;
        } catch (e) { background = null; }
        return { background, weather: weatherSpec(gameState.world.currentWeather) };
    }

    /** Everything a duel must give back afterwards, exactly as it is now: the whole party (characters with their health, corruption, status
     *  effects, gear and levels; the inventory, the purse, the recipes), the hotbar and buffs, and the quests. */
    _duelSnapshot() {
        const party = gameState.party;
        return {
            members: party.members.map(serializeEntity),
            inventory: (party.inventory || []).map(i => i.toJSON()),
            currency: party.currency || 0,
            partyRest: clone(Object.fromEntries(Object.entries(party).filter(([k]) => !['members', 'inventory', 'currency'].includes(k)))),
            hotbar: clone(gameState.player.hotbar || []),
            buffs: clone(gameState.player.buffs || {}),
            quests: clone(gameState.quests || null),
        };
    }

    /** Puts my party back as it was before the duel (and forgets the backup). Returns whether there was one. */
    restoreDuelBackup() {
        const b = this.duelBackup;
        this.duelBackup = null;
        if (!b) return false;
        const party = gameState.party;
        party.members.splice(0, party.members.length, ...b.members.map(hydrateEntity));
        party.inventory.splice(0, party.inventory.length, ...b.inventory.map(hydrateItem).filter(Boolean));
        party.currency = b.currency;
        for (const k of Object.keys(party)) if (!['members', 'inventory', 'currency'].includes(k) && !(k in b.partyRest)) delete party[k];
        Object.assign(party, clone(b.partyRest));
        gameState.player.hotbar = clone(b.hotbar);
        gameState.player.buffs = clone(b.buffs);
        if (b.quests) gameState.quests = clone(b.quests);
        return true;
    }

    _beginBattle(spec) {
        const me = this.me;
        this.prompt = null;
        this.declined.clear();
        if (this.trade) this.cancelTrade();
        let partyEntities, partyMeta, enemies, enemyMeta, opponent = null;
        if (spec.kind === 'duel') {
            opponent = spec.players.find(id => id !== me);
            // a duel is for nothing: my party exactly as it is now comes back afterwards
            this.duelBackup = this._duelSnapshot();
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
        // the allies stand at the end of the line-up (battleState puts them there), nobody's to play: enemyAI picks for them on every screen
        const allies = spec.kind === 'party' ? (spec.allies || []).map(hydrateEntity) : [];
        if (allies.length) partyMeta = [...partyMeta, ...allies.map((_, i) => ({ netId: `A#${i}` }))];
        const players = spec.players.slice();
        this.battle = { bid: spec.bid, kind: spec.kind, players };
        // a won fight with an encounter after it that another player leads (_afterFight)
        clearTimeout(this.afterBattle && this.afterBattle.timer);
        this.afterBattle = spec.kind === 'party' && spec.afterVictory && spec.afterVictory.encounterId && spec.authority !== me
            ? { from: spec.authority, encounterId: spec.afterVictory.encounterId, stash: null, ended: false, timer: null } : null;
        const mp = {
            bid: spec.bid, kind: spec.kind, seed: spec.seed, me, authority: spec.authority, players, names: spec.names,
            partyMeta, enemyMeta, opponent, opponentName: opponent ? spec.names[opponent] : null,
            share: spec.kind === 'party' ? { players, me } : null,
            early: this.early.get(spec.bid) || [],
            bgm: spec.bgm || null,
            resume: spec.resume || null,   // let into it in progress (bt_join): as it stood at the start of a round
        };
        this.early.delete(spec.bid);
        events.emit('MP_START_BATTLE', { enemies, context: { mp, partyEntities, allies, backgroundId: spec.background || undefined, weather: weatherFromSpec(spec.weather), noEscape: !!spec.noEscape }, bgm: spec.bgm || null, afterVictory: spec.afterVictory || null });
    }

    /** In a fight, an encounter or a trade right now (a request to join another one is refused). */
    _busy() {
        const scene = this._scene();
        return !!this.battle || !!this.trade || scene === 'battle' || scene === 'encounter' || scene === 'trade';
    }

    /** Is the player `id` out of pulling range, as this screen sees them: on another map, or more than PARTY_PULL_RADIUS tiles away (2 more
     *  for the moment their last step takes to arrive)? Their call to a fight or an encounter is then declined, as a busy player's is. */
    _tooFar(id) {
        const r = multiplayerSession.remotes.get(id);
        if (!r || !r.placed) return false;   // not seen yet: their own check stands
        const here = gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world';
        if (r.map !== here) return true;
        const me = gameState.player;
        return Math.max(Math.abs(r.col - me.col), Math.abs(r.row - me.row)) > PARTY_PULL_RADIUS + 2;
    }

    /** In a shared encounter that `id` is in too (the fight it turns into is ours). */
    /* The fight I am in, when an encounter follows its win (afterVictory: the end of Darius) and another player leads it (its authority): that
       encounter is theirs to lead, and mine to be in, from the fight's screen too. A call that comes before this screen has left the fight
       waits for it to end (awaitAfterFight). */
    _afterFight(from, d) {
        const a = this.afterBattle;
        if (!a || a.from !== from || a.encounterId !== d.encounterId) return false;
        const start = { encounterId: d.encounterId, context: d.context || {}, bgm: d.bgm || null, quiet: true, mp: { ...d.mp, me: this.me, isLeader: false } };
        if (a.ended) { this.afterBattle = null; clearTimeout(a.timer); this.prompt = null; this.declined.clear(); events.emit('START_ENCOUNTER', start); }
        else a.stash = start;
        return true;
    }

    /** BATTLE_ENDED on a screen that did not lead the fight (won, with an encounter after it): its leader's encounter starts here (it may have
     *  come already); if it never comes, `solo` plays it alone. False when the fight was not one of those. */
    awaitAfterFight(encounterId, solo) {
        const a = this.afterBattle;
        if (!a || a.encounterId !== encounterId) return false;
        a.solo = solo;
        // its call came while this screen was still on the fight: it has gone on since, so ask its leader to be let in where it is now
        if (a.stash) { this.afterBattle = null; this.askToJoin(a.from, { auto: true, after: { a, tries: 0 } }); return true; }
        a.ended = true;
        a.timer = setTimeout(() => { if (this.afterBattle === a) { this.afterBattle = null; solo(); } }, AFTER_FIGHT_WAIT_MS);
        return true;
    }

    _inEncounterWith(id) {
        const e = this.encounterState && this.encounterState();
        return this._scene() === 'encounter' && !!(e && e.mp && e.mp.players && e.mp.players.includes(id));
    }

    /** Of these players, the ones still in the world (and not busy elsewhere: declined). */
    partyHere(players) {
        const room = multiplayer.room;
        return (players || []).filter(id => room && room.players.some(p => p.id === id && p.connected) && !this.declined.has(id));
    }

    /* ---- shared encounters: the leader's encounter, played on every member's screen, decided by vote (EncounterController) ---- */
    /** The leader opens an encounter: the members open it too. Returns the leader's own part of it, for EncounterController.start. */
    startPartyEncounter(data) {
        // the one who started it leads it (their roll, their tie-break); the party near them is pulled in and votes
        this.declined.clear();
        // (`players`: the ones who must be in it whatever screen they are on: the players of the fight it follows, the end of Darius)
        const must = (data.players || []).filter(id => id !== this.me && this.partyHere([id]).length);
        const players = [...new Set([this.me, ...must, ...this.nearbyParty()])];
        const eid = newId(), seed = (Math.random() * 0xffffffff) >>> 0;
        // the stage it opens on is the leader's (the Hooded Stranger opens on what the leader's quests have reached): every screen opens there
        const stage = openingStage(data.encounterId, data.context || {});
        // the line-up, as for a fight: every player's first characters (3 each for two players, 2 each for three), the leader's lead first.
        // Any of them can step forward (a switch is voted on), and each screen shows the one who did.
        const parties = { [this.me]: gameState.party.members.map(serializeEntity) };
        for (const id of players) if (id !== this.me) parties[id] = this.groupParties.get(id) || [];
        const lineup = buildLineup(players.map(id => ({ id, members: parties[id].map(m => ({ alive: living(m) })) })))
            .map(e => ({ owner: e.owner, idx: e.idx, data: parties[e.owner][e.idx] }));
        const base = { eid, seed, players, leader: this.me, lineup, stage };
        const after = must.length ? data.encounterId : null;   // (the fight's players take it even from the fight's screen: _onEncStart)
        for (const id of players) if (id !== this.me) this._send({ k: 'enc_start', mp: base, encounterId: data.encounterId, context: data.context || {}, bgm: data.bgm || null, quiet: !!data.quiet, after }, id);
        return { ...base, me: this.me, isLeader: true, encounterId: data.encounterId, context: data.context || {}, bgm: data.bgm || null };
    }

    /** The opening of a new world started together (engine/multiplayerSession.js): the host plays the prologue as a shared encounter, which every
     *  player who arrives while it plays joins at once, at the stage it has reached (askToJoin, auto). */
    startPrologue() {
        if (!this.me) return null;
        this.declined.clear();
        const lineup = buildLineup([{ id: this.me, members: gameState.party.members.map(m => ({ alive: living(m) })) }])
            .map(e => ({ owner: e.owner, idx: e.idx, data: serializeEntity(gameState.party.members[e.idx]) }));
        return { eid: newId(), seed: (Math.random() * 0xffffffff) >>> 0, players: [this.me], leader: this.me, lineup, stage: null,
            me: this.me, isLeader: true, encounterId: 'prologue', context: {}, bgm: null, open: true };
    }

    // ================================================================ JOINING ONE IN PROGRESS
    /* A player who was left out of an encounter or a fight (too far, busy, not yet in the world) walks up to a player who is in it and asks to
       join (the player menu: Ask to Join). That player is asked (a question on their encounter or battle screen); on a yes the encounter's
       leader (the fight's authority) lets them in: into an encounter at the stage and step it has reached, into a fight at the start of the
       next round, their characters waiting at the back of the line-up to be swapped in. The prologue of a world started together lets
       everyone in without asking (`auto`).
         join_rq { jid, what: 'enc'|'bt', auto?, members }   newcomer -> the player they walked up to
         join_fwd { jid, n, members }                        that player (yes) -> the leader / authority
         join_no { jid, why }                                -> the newcomer
         enc_join { mp, encounterId, context, bgm }          leader -> the newcomer: the encounter as it is now
         enc_add { eid, id, entries }                        leader -> the others: one more player and their characters in the line-up
         bt_join { jid, spec }                               authority -> the newcomer: the fight as it is now (bt_add to the others)  */
    _myLeads() {
        // my whole party as it is now (the leader picks my first living characters for the line-up: joinEntries)
        return gameState.party.members.map(serializeEntity);
    }

    /** The line-up entries a newcomer brings: their first living characters (as many as a player brings to a line-up of two), with the data
     *  every screen builds them from. Their party is kept as a party member's is (a fight out of the encounter takes them in too). */
    joinEntries(id, members) {
        const list = Array.isArray(members) ? members.slice(0, 8) : [];
        if (this.partyPlayers().includes(id)) this.groupParties.set(id, list);
        return list.map((data, idx) => ({ owner: id, idx, data })).filter(e => e.data && living(e.data)).slice(0, 3);
    }

    /** Ask the player `to` (in an encounter or a fight) to let me into it. */
    askToJoin(to, { auto = false, after = null, retry = 0 } = {}) {
        const r = multiplayerSession.remotes.get(to);
        const what = r && r.scene === 'encounter' ? 'enc' : 'bt';
        if (!auto && (this.outgoing || this.joining)) { this._say('Wait for your last request to be answered.'); return; }
        const jid = newId();
        // (`after`: the encounter after a fight I was in, that went on before my screen left the fight: awaitAfterFight)
        // (`retry`: the prologue of a world started together, whose host may not have opened it yet: asked again a few times)
        this.joining = { jid, to, what, auto, after, retry, until: performance.now() + (auto ? 3000 : (REQUEST_SECONDS + 5) * 1000) };
        this._send({ k: 'join_rq', jid, what, auto, members: this._myLeads() }, to);
        if (!auto) this._say(`Asked ${this.nameOf(to)} to let you join…`);
    }

    /* The prologue of a world started together, played alone until the host's answer comes: the host may still be opening theirs. */
    _retryPrologue(j) {
        if (!(j.retry > 0)) return;
        setTimeout(() => {
            const e = this.encounterState && this.encounterState();
            if (!this.joining && this._scene() === 'encounter' && e && !e.mp && e._encounterId === 'prologue') this.askToJoin(j.to, { auto: true, retry: j.retry - 1 });
        }, 1500);
    }

    /* The encounter after the fight: its leader may still be fading into it. Ask again a few times, then play it alone. */
    _retryAfter(after) {
        if (after.tries >= 6) { if (after.a.solo) after.a.solo(); return; }
        setTimeout(() => { if (!this.joining && this._scene() === 'battle') this.askToJoin(after.a.from, { auto: true, after: { a: after.a, tries: after.tries + 1 } }); }, 700);
    }

    /** The encounter or fight I am in right now, as the join handling needs it: { kind: 'enc'|'bt', leader, ... } or null. */
    _myShared() {
        const e = this.encounterState && this.encounterState();
        if (this._scene() === 'encounter' && e && e.mp) return { kind: 'enc', leader: e.mp.leader, ctrl: e, mp: e.mp };
        const b = this.battleCtrl && this.battleCtrl();
        if (this.battle && b && b.state && b.state.mp && b.state.mp.kind === 'party' && b.state.mp.bid === this.battle.bid) return { kind: 'bt', leader: b.state.mp.authority, ctrl: b, mp: b.state.mp };
        return null;
    }

    _onJoinRequest(from, d) {
        const no = (why) => this._send({ k: 'join_no', jid: d.jid, why }, from);
        if (!multiplayerSession.active || typeof d.jid !== 'string') return;
        const shared = this._myShared();
        const e = this.encounterState && this.encounterState();
        // the prologue of a world started together: everyone comes in, no question asked (I may be playing it alone, as its leader)
        // (and a player already in my encounter who fell behind: the one after a fight, whose screen was still on the fight)
        if (d.auto) {
            if (shared && shared.kind === 'enc' && (shared.mp.open || shared.mp.players.includes(from))) return this._forwardJoin(shared, from, d);
            return no('over');
        }
        if (!this.partyPlayers().includes(from)) return no('declined');   // (Ask to Join is for the players of my party)
        if (!shared && this._scene() === 'encounter' && e && e.model && !e.mp) {
            // an encounter of my own: it becomes a shared one, led by me, with them in it
            if (!e.makeShared()) return no('busy');
            return this._askToLetIn(from, d, this._myShared());
        }
        if (!shared) return no('over');
        if (shared.mp.players.includes(from)) return no('in');
        this._askToLetIn(from, d, shared);
    }

    _askToLetIn(from, d, shared) {
        const what = shared.kind === 'bt' ? 'fight' : 'encounter';
        if (this.prompt) { this._send({ k: 'join_no', jid: d.jid, why: 'busy' }, from); return; }
        this.prompt = {
            title: this.nameOf(from), text: `${this.nameOf(from)} wants to join your ${what}.`, inPlay: true,
            options: [{ id: 'yes', label: 'Let them in' }, { id: 'no', label: 'Not now' }], focus: 0,
            until: performance.now() + REQUEST_SECONDS * 1000,
            onExpire: (why) => this._send({ k: 'join_no', jid: d.jid, why }, from),
            onPick: (id) => {
                const now = this._myShared();
                if (id !== 'yes') { this._send({ k: 'join_no', jid: d.jid, why: 'declined' }, from); return; }
                if (!now) { this._send({ k: 'join_no', jid: d.jid, why: 'over' }, from); return; }
                this._forwardJoin(now, from, d);
            },
        };
    }

    _forwardJoin(shared, from, d) {
        const members = Array.isArray(d.members) ? d.members.slice(0, 8) : [];
        if (shared.leader === this.me) shared.ctrl.admitPlayer(from, members, d.jid);
        else this._send({ k: 'join_fwd', jid: d.jid, n: from, members, what: shared.kind }, shared.leader);
    }

    _joinRefused(d) {
        const j = this.joining;
        if (!j || j.jid !== d.jid) return;
        this.joining = null;
        if (j.after) { this._retryAfter(j.after); return; }
        if (j.auto) { this._retryPrologue(j); return; }
        const why = { declined: 'did not let you in', over: 'is not in an encounter or a fight any more', busy: 'is busy', full: 'has no room for you' }[d.why] || 'could not let you in';
        this._say(`${this.nameOf(j.to)} ${why}.`);
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

    sendBattleDecision(mp, d, to = null) {
        if (to) { this._send({ k: 'bt_dec', bid: mp.bid, ...d }, to); return; }
        for (const id of mp.players) if (id !== mp.me) this._send({ k: 'bt_dec', bid: mp.bid, ...d }, id);
    }
    /** The authority: a player let into the fight, to the others in it (BattleController._admitWaiting). */
    sendBattleAdd(mp, d) {
        for (const id of mp.players) if (id !== mp.me) this._send({ k: 'bt_add', ...d }, id);
    }
    sendBattleSync(mp, d) {
        for (const id of mp.players) if (id !== mp.me) this._send({ k: 'bt_sync', bid: mp.bid, ...d }, id);
    }

    /** A shared fight is over (sceneManager BATTLE_ENDED). A duel puts my party back as it was. Returns true if it was a duel. */
    battleEnded(mp) {
        this.battle = null;
        this.declined.clear();
        if (!mp || mp.kind !== 'duel') return false;
        this.restoreDuelBackup();
        return true;
    }

    // ================================================================ MESSAGES
    _onRelay(from, d) {
        switch (d.k) {
            case 'obj_claim':
                if (typeof d.key !== 'string' || d.key.length > 80) break;
                if (d.on) this.claims.set(d.key, { by: from, until: Date.now() + CLAIM_MS });
                else if (this.claims.get(d.key) && this.claims.get(d.key).by === from) this.claims.delete(d.key);
                break;
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
            case 'grp_add': {   // a member of my party invited someone, who said yes
                const g = this.groups.get(this.me);
                if (g && g.includes(from) && typeof d.id === 'string' && !this._addToGroup(d.id)) this._send({ k: 'grp_full', id: d.id }, from);
                break;
            }
            case 'grp_full':
                this._say(`The party is full, so ${this.nameOf(d.id)} could not join.`);
                break;
            case 'grp_leave': {
                const g = this.groups.get(this.me);
                if (g && g.includes(from)) this.removeFromGroup(from);
                break;
            }
            case 'grp_party': {   // another player of my party's characters (every player of a party sends theirs to the others)
                const g = this.myGroup();
                if (g && (g.leader === from || g.members.includes(from)) && Array.isArray(d.members)) {
                    this.groupParties.set(from, d.members);
                    if (Array.isArray(d.waypoints)) this.groupWaypoints.set(from, d.waypoints.slice(0, 60));
                }
                break;
            }
            case 'q_share': {   // a player of my party started a story quest: it is mine too (unless I have it, or have finished it)
                const g = this.myGroup();
                if (!g || !(g.leader === from || g.members.includes(from)) || !STORY_QUESTS.has(d.questId)) break;
                const q = gameState.quests || {};
                if ((q.active && q.active[d.questId]) || (Array.isArray(q.completed) && q.completed.includes(d.questId))) break;
                this._sharingQuest = d.questId;   // (not sent on again: it came from the party)
                try { events.emit('START_QUEST', { questId: d.questId }); } finally { this._sharingQuest = null; }
                if (q.active && q.active[d.questId]) this._say(`${this.nameOf(from)} shared a quest: ${QuestDefinitions[d.questId].name}.`);
                break;
            }
            case 'chat': {
                const text = String(d.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, CHAT_MAX);
                if (text && multiplayerSession.active) events.emit('MP_CHAT', { from, name: this.nameOf(from), text });
                break;
            }
            case 'enc_start':
                // the encounter that follows the fight I was in with its leader (the end of Darius): mine, from the fight's screen too
                if (d.mp && multiplayerSession.active && d.after && this._afterFight(from, d)) break;
                // an encounter reaches me only when I am near the one who started it (further off, I can walk up and ask to join it)
                if (d.mp && multiplayerSession.active && (this._busy() || this._tooFar(from))) {
                    // already in a fight or an encounter (or a trade): stay in it, and tell the encounter's players to go on without me
                    for (const id of d.mp.players || []) if (id !== this.me) this._send({ k: 'enc_decline', eid: d.mp.eid }, id);
                    break;
                }
                if (d.mp && multiplayerSession.active && !this.battle) {
                    this.prompt = null;
                    this.declined.clear();   // (left from an earlier encounter: only this one's declines count, as they come)
                    events.emit('START_ENCOUNTER', { encounterId: d.encounterId, context: d.context || {}, bgm: d.bgm || null, quiet: !!d.quiet, mp: { ...d.mp, me: this.me, isLeader: false } });
                }
                break;
            case 'enc_vote': case 'enc_tally': case 'enc_go': case 'enc_opts':
                events.emit('MP_ENCOUNTER', { ...d, from });
                break;
            case 'bt_start':
                if (!d.spec || !multiplayerSession.active) break;
                // a party's fight while I am busy elsewhere: I stay where I am, and its players stop waiting for my fighters. The fight that comes
                // out of the shared encounter I am in is mine, though.
                if (d.spec.kind === 'party' && !this._inEncounterWith(d.spec.authority) && (this._busy() || this._tooFar(from))) {
                    for (const id of d.spec.players || []) if (id !== this.me) this._send({ k: 'bt_decline', bid: d.spec.bid }, id);
                    break;
                }
                this._beginBattle(d.spec);
                break;
            case 'bt_decline':
                if (this.battle && this.battle.bid === d.bid) { this.declined.add(from); events.emit('MP_BATTLE_DECLINE', { bid: d.bid, from }); }
                break;
            case 'enc_decline':
                this.declined.add(from);
                events.emit('MP_ENCOUNTER', { k: 'enc_decline', eid: d.eid, from });
                break;
            case 'join_rq': this._onJoinRequest(from, d); break;
            case 'join_fwd': {   // a player of the encounter or fight I lead said yes to someone who walked up to them: in they come
                if (typeof d.n !== 'string' || typeof d.jid !== 'string') break;
                const shared = this._myShared();
                if (!shared || shared.leader !== this.me || !shared.mp.players.includes(from)) { this._send({ k: 'join_no', jid: d.jid, why: 'over' }, d.n); break; }
                shared.ctrl.admitPlayer(d.n, Array.isArray(d.members) ? d.members.slice(0, 8) : [], d.jid);
                break;
            }
            case 'join_no': this._joinRefused(d); break;
            case 'enc_join': {   // let into an encounter in progress: it opens here at the stage and step it has reached
                const j = this.joining;
                if (!j || j.jid !== d.jid || !d.mp || !multiplayerSession.active) break;
                this.joining = null;
                // (busy since I asked: a fight, a trade, or another encounter; the solo prologue I asked from is the one it replaces)
                const solo = this.encounterState && this.encounterState();
                const replacing = (j.auto && this._scene() === 'encounter' && solo && !solo.mp && solo._encounterId === d.encounterId) || !!j.after;
                if (this.battle || this.trade || (this._scene() !== 'overworld' && !replacing && PULL_BLOCKING_SCENES.has(this._scene()))) {
                    for (const id of d.mp.players || []) if (id !== this.me) this._send({ k: 'enc_decline', eid: d.mp.eid }, id);
                    break;
                }
                this.prompt = null;
                this.declined.clear();
                if (!j.auto) this._say(`You join ${this.nameOf(j.to)}.`);
                events.emit('START_ENCOUNTER', { encounterId: d.encounterId, context: d.context || {}, bgm: d.bgm || null, quiet: true, mp: { ...d.mp, me: this.me, isLeader: false } });
                break;
            }
            case 'enc_add':
                events.emit('MP_ENCOUNTER', { ...d, k: 'enc_add', from });
                break;
            case 'bt_join': {   // let into a fight in progress: it begins here as it stands, and my characters wait at the back to be swapped in
                const j = this.joining;
                if (!j || j.jid !== d.jid || !d.spec || !multiplayerSession.active) break;
                this.joining = null;
                if (this._busy()) { this._send({ k: 'bt_decline', bid: d.spec.bid }, d.spec.authority); break; }
                this._say(`You join ${this.nameOf(j.to)}'s fight.`);
                this._beginBattle(d.spec);
                break;
            }
            case 'bt_add':
                if (this.battle && this.battle.bid === d.bid) events.emit('MP_BATTLE_ADD', { ...d, from });
                break;
            case 'bt_dec':
                if (this.battle && this.battle.bid === d.bid) events.emit('MP_BATTLE_DECISION', { ...d, from });
                else { const list = this.early.get(d.bid) || []; list.push({ ...d, from }); this.early.set(d.bid, list); }
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
        for (const id of [...this.groupWaypoints.keys()]) if (!here.has(id)) this.groupWaypoints.delete(id);
        if (this.trade && !here.has(this.trade.partner)) this._closeTrade(`${this.trade.partnerName} left, so the trade was called off.`);
        if (this.isLeader) this._broadcastGroup();   // a newcomer learns who is with whom
    }

    /** Every frame (from multiplayerSession.update): request timeouts, and a member's characters for the leader. */
    update(dt) {
        const now = performance.now();
        // back on the map: the encounter (and any fight after it) is over (not during the fade into it: the screen has to have left the map first)
        if (this.myClaim) {
            if (this._scene() !== 'overworld') this._claimLeft = true;
            else if (this._claimLeft || now - this._claimAt > 8000) this.releaseClaim();
        }
        if (this.outgoing && now > this.outgoing.until) {
            this._say(`${this.nameOf(this.outgoing.to)} did not answer.`);
            this.outgoing = null;
        }
        if (this.incoming && !(this.prompt && this.prompt.rid === this.incoming.rid)) {
            // the question was taken off the screen by something else (an encounter or a fight pulled this player in, a trade opened): answer
            // it, or every later request would be refused as 'busy'
            this._send({ k: 'rq_ans', rid: this.incoming.rid, ok: false, why: 'busy' }, this.incoming.from);
            this.incoming = null;
        }
        if (this.joining && now > this.joining.until) {
            const j = this.joining;
            this.joining = null;
            if (j.after) this._retryAfter({ ...j.after, tries: 99 });
            else if (j.auto) this._retryPrologue(j);
            else this._say(`${this.nameOf(j.to)} did not answer.`);
        }
        // a "let them join?" question asked in an encounter or a fight that is over now: no, it is over
        if (this.prompt && this.prompt.inPlay && this._scene() !== 'encounter' && this._scene() !== 'battle' && this._scene() !== 'party') {
            const p = this.prompt; this.prompt = null;
            if (p.onExpire) p.onExpire('over');
        }
        if (this.prompt && this.prompt.until && now > this.prompt.until) {
            const p = this.prompt;
            if (p.onExpire) p.onExpire('declined');
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
                const waypoints = getWaypoints().map(w => ({ id: w.id, col: w.col, row: w.row, biome: w.biome, origin: w.origin, name: w.name }));
                const json = JSON.stringify([members, waypoints]);
                const newcomer = others.some(id => !this._partySentTo.has(id));
                if (json !== this._lastPartyJson || newcomer) {
                    this._lastPartyJson = json;
                    this._partySentTo = new Set(others);
                    for (const id of others) this._send({ k: 'grp_party', members, waypoints }, id);
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

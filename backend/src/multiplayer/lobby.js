// backend/src/multiplayer/lobby.js: the multiplayer rooms, without any networking (lobbyServer.js connects it to WebSockets), so tests can drive it.
//
// A room is one host's world with up to MAX_PLAYERS players in it. Players join with the room's code. The server only keeps rooms in
// memory: the world itself lives in the host's save, and the host's browser is in charge of it. Later steps send game messages between the
// players with `relay`; the server does not read them.
//
// Messages from a player (`t` is the type):
//   host  { world: { name, day, slot, isNew } }   open a room for this save (or, isNew, for a world not made yet: everyone makes a character and plays
//                                           the prologue together); the player becomes its host
//   join  { code }                          join a room
//   leave                                   leave the room (the host leaving closes it)
//   ready { ready }                         tick / untick Ready in the lobby
//   start                                   the host takes everyone into the world (every guest must be ready)
//   kick  { id }                            the host removes a guest
//   relay { to?, data }                     a game message for one player (to = their id) or for everyone else in the room
// Messages to a player:
//   room    { room }                        the room as it is now (sent to everyone in it after every change)
//   started                                 the host has started: go into the world
//   closed  { reason }                      the room is gone: 'host_left' | 'host_lost' | 'kicked'
//   relay   { from, data }
//   error   { code, message }               a request that could not be done

export const MAX_PLAYERS = 3;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I, so a code read aloud is not misheard
export const CODE_LENGTH = 5;
export const RECONNECT_GRACE_MS = 30000;   // a player whose connection drops keeps their place this long
export const MAX_ROOMS = 1000;

const ERRORS = {
    not_found: 'No world is open with that code. Check it and try again.',
    full: `That world is full (${MAX_PLAYERS} players).`,
    in_room: 'You are already in a world. Leave it first.',
    not_in_room: 'You are not in a world.',
    not_host: 'Only the host can do that.',
    not_ready: 'Everyone has to be ready before the host can start.',
    own_room: 'That is your own world.',
    bad_request: 'That request was not understood.',
    busy: 'The server has too many worlds open right now. Try again in a few minutes.',
};

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

export class Lobby {
    /**
     * @param {object} o
     * @param {(userId: string, msg: object) => void} o.send     delivers a message to a connected player
     * @param {() => number} [o.now]
     * @param {() => number} [o.random]
     */
    constructor({ send, now = Date.now, random = Math.random }) {
        this.send = send;
        this.now = now;
        this.random = random;
        this.rooms = new Map();     // code -> room
        this.roomOf = new Map();    // userId -> code
        this.users = new Map();     // userId -> { id, username, connected }
    }

    // ---- connections ----

    /** A player's connection is up (a first connection or a reconnection). Puts them back in their room if they still have one. */
    connect(user) {
        const known = this.users.get(user.id);
        this.users.set(user.id, { id: user.id, username: user.username, connected: true });
        const room = this._room(user.id);
        if (room) {
            const p = room.players.find(x => x.id === user.id);
            if (p) { p.connected = true; p.lostAt = null; }
            this._broadcast(room);
        }
        return { reconnected: !!(known && room) };
    }

    /** A player's connection dropped: they keep their place for RECONNECT_GRACE_MS (see sweep). */
    disconnect(userId) {
        const u = this.users.get(userId);
        if (u) u.connected = false;
        const room = this._room(userId);
        if (!room) { this.users.delete(userId); return; }
        const p = room.players.find(x => x.id === userId);
        if (p) { p.connected = false; p.lostAt = this.now(); }
        this._broadcast(room);
    }

    /** Drops players who did not come back in time (a lost host closes the room). Call it every few seconds. */
    sweep() {
        const t = this.now();
        for (const room of [...this.rooms.values()]) {
            for (const p of [...room.players]) {
                if (p.connected || t - p.lostAt < RECONNECT_GRACE_MS) continue;
                if (p.id === room.hostId) { this._close(room, 'host_lost'); break; }
                this._remove(room, p.id);
                this.users.delete(p.id);
            }
        }
    }

    // ---- requests ----

    /** One message from a player. Returns nothing; answers go through `send`. */
    handle(userId, msg) {
        if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return this._error(userId, 'bad_request');
        switch (msg.t) {
            case 'host': return this._host(userId, msg);
            case 'join': return this._join(userId, msg);
            case 'leave': return this.leave(userId);
            case 'ready': return this._ready(userId, msg);
            case 'start': return this._start(userId);
            case 'kick': return this._kick(userId, msg);
            case 'relay': return this._relay(userId, msg);
            default: return this._error(userId, 'bad_request');
        }
    }

    leave(userId) {
        const room = this._room(userId);
        if (!room) return;
        if (room.hostId === userId) this._close(room, 'host_left');
        else this._remove(room, userId);
    }

    _host(userId, msg) {
        if (this._room(userId)) return this._error(userId, 'in_room');
        if (this.rooms.size >= MAX_ROOMS) return this._error(userId, 'busy');
        const w = msg.world && typeof msg.world === 'object' ? msg.world : {};
        const room = {
            code: this._newCode(),
            hostId: userId,
            state: 'lobby',
            world: { name: clean(w.name, 40) || 'A world', day: Math.max(1, Math.floor(Number(w.day) || 1)), slot: clean(w.slot, 60), isNew: w.isNew === true },
            players: [this._player(userId, true)],
            createdAt: this.now(),
        };
        this.rooms.set(room.code, room);
        this.roomOf.set(userId, room.code);
        this._broadcast(room);
    }

    _join(userId, msg) {
        if (this._room(userId)) return this._error(userId, 'in_room');
        const code = clean(msg.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const room = this.rooms.get(code);
        if (!room) return this._error(userId, 'not_found');
        if (room.hostId === userId) return this._error(userId, 'own_room');
        if (room.players.length >= MAX_PLAYERS) return this._error(userId, 'full');
        room.players.push(this._player(userId, false));
        this.roomOf.set(userId, room.code);
        this._broadcast(room);
    }

    _ready(userId, msg) {
        const room = this._room(userId);
        if (!room) return this._error(userId, 'not_in_room');
        const p = room.players.find(x => x.id === userId);
        p.ready = !!msg.ready;
        this._broadcast(room);
    }

    _start(userId) {
        const room = this._room(userId);
        if (!room) return this._error(userId, 'not_in_room');
        if (room.hostId !== userId) return this._error(userId, 'not_host');
        if (room.players.some(p => p.id !== room.hostId && !p.ready)) return this._error(userId, 'not_ready');
        room.state = 'playing';
        this._broadcast(room);
        for (const p of room.players) this.send(p.id, { t: 'started' });
    }

    _kick(userId, msg) {
        const room = this._room(userId);
        if (!room) return this._error(userId, 'not_in_room');
        if (room.hostId !== userId) return this._error(userId, 'not_host');
        const id = String(msg.id ?? '');
        if (id === userId || !room.players.some(p => p.id === id)) return this._error(userId, 'bad_request');
        this.send(id, { t: 'closed', reason: 'kicked' });
        this._remove(room, id);
    }

    _relay(userId, msg) {
        const room = this._room(userId);
        if (!room) return this._error(userId, 'not_in_room');
        const out = { t: 'relay', from: userId, data: msg.data ?? null };
        if (msg.to !== undefined && msg.to !== null) {
            const to = String(msg.to);
            if (room.players.some(p => p.id === to && p.connected)) this.send(to, out);
            return;
        }
        for (const p of room.players) if (p.id !== userId && p.connected) this.send(p.id, out);
    }

    // ---- helpers ----

    _player(userId, isHost) {
        const u = this.users.get(userId) || { username: 'Player' };
        return { id: userId, username: u.username, ready: isHost, connected: true, lostAt: null };
    }

    _room(userId) {
        const code = this.roomOf.get(userId);
        return code ? this.rooms.get(code) || null : null;
    }

    _remove(room, userId) {
        room.players = room.players.filter(p => p.id !== userId);
        this.roomOf.delete(userId);
        this._broadcast(room);
    }

    _close(room, reason) {
        this.rooms.delete(room.code);
        for (const p of room.players) {
            this.roomOf.delete(p.id);
            if (p.id !== room.hostId || reason !== 'host_left') this.send(p.id, { t: 'closed', reason });
        }
    }

    /** What the players are told about a room (no timestamps or other server bookkeeping). */
    view(room) {
        return {
            code: room.code, hostId: room.hostId, state: room.state, world: { ...room.world }, maxPlayers: MAX_PLAYERS,
            players: room.players.map(p => ({ id: p.id, username: p.username, ready: p.ready, connected: p.connected, isHost: p.id === room.hostId })),
        };
    }

    _broadcast(room) {
        const msg = { t: 'room', room: this.view(room) };
        for (const p of room.players) if (p.connected) this.send(p.id, msg);
    }

    _error(userId, code) {
        this.send(userId, { t: 'error', code, message: ERRORS[code] || ERRORS.bad_request });
    }

    _newCode() {
        for (;;) {
            let code = '';
            for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)];
            if (!this.rooms.has(code)) return code;
        }
    }
}

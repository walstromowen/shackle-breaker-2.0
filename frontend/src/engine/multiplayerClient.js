/**
 * engine/multiplayerClient.js
 *
 * The game's connection to the multiplayer server (backend/src/multiplayer: a WebSocket at /api/mp on the same server as the game).
 *
 *   multiplayer.connect()        opens the connection and says who is playing (the login token the cloud saves already use)
 *   multiplayer.host(world)      opens a room for a save; join(code) joins one; leave(), setReady(), start(), kick(id)
 *   multiplayer.relay(data, to?) a game message for one player or everyone else in the room (used by the later multiplayer steps)
 *   multiplayer.on(type, fn)     'status' | 'room' | 'started' | 'closed' | 'error' | 'relay'; returns a function that unsubscribes
 *
 * A dropped connection is reopened (with a growing wait) while the player is in a room; the server keeps their place for 30 seconds.
 */
import { resolveApiBase } from '../auth/apiConfig.js';
import { AuthService } from '../auth/authService.js';

const PATH = '/api/mp';
const RETRY_MS = [1000, 2000, 4000, 8000, 8000];

class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.status = 'offline';   // 'offline' | 'connecting' | 'online'
        this.you = null;           // { id, username } once the server has said welcome
        this.room = null;          // the room as the server last described it (see backend/src/multiplayer/lobby.js view())
        this.lastError = null;     // { code, message }
        this.listeners = new Map();
        this.retries = 0;
        this.wanted = false;       // true while the player wants to be online (a drop is then reconnected)
        this._queue = [];          // requests made while the connection was still opening
        // the pace this client keeps (a token bucket): the server cuts off a connection that sends more than 40 a second (lobbyServer.js RATE),
        // so a burst (a trade's quick clicks, a held key) waits its turn here instead of costing the connection
        this._tokens = SEND_RATE.burst;
        this._lastRefill = 0;
        this._backlog = [];        // messages over the pace, sent in order as it allows
        this._flushTimer = null;
    }

    on(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(fn);
        return () => this.listeners.get(type)?.delete(fn);
    }

    _emit(type, payload) {
        for (const fn of [...(this.listeners.get(type) || [])]) {
            try { fn(payload); } catch (e) { console.error('[multiplayer]', e); }
        }
    }

    _setStatus(status) {
        if (this.status === status) return;
        this.status = status;
        this._emit('status', status);
    }

    get isHost() { return !!(this.room && this.you && this.room.hostId === this.you.id); }

    /** Opens the connection (does nothing if it is already open or opening). Resolves once the server has said welcome. */
    async connect() {
        this.wanted = true;
        if (this.status !== 'offline') return this._welcomed;
        if (!AuthService.isLoggedIn) {
            this._fail({ code: 'auth', message: 'Log in to play online.' });
            return null;
        }
        this._setStatus('connecting');
        let resolveWelcome;
        this._welcomed = new Promise(res => { resolveWelcome = res; });
        let base = '';
        try { base = await resolveApiBase(); } catch { /* same address */ }
        const httpBase = base || window.location.origin;
        const url = httpBase.replace(/^http/i, 'ws') + PATH;

        let ws;
        try { ws = new WebSocket(url); } catch (e) {
            this._setStatus('offline');
            this._fail({ code: 'network', message: 'Could not reach the server.' });
            resolveWelcome(null);
            return null;
        }
        this.ws = ws;
        ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token: AuthService.token }));
        ws.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            this._onMessage(msg, resolveWelcome);
        };
        ws.onclose = (ev) => {
            if (this.ws !== ws) return;
            this.ws = null;
            this._setStatus('offline');
            resolveWelcome(null);
            if (ev.code === 4009) { this.wanted = false; this._fail({ code: 'replaced', message: 'You connected from somewhere else, so this window went offline.' }); return; }
            if (ev.code === 4003) { this.wanted = false; return; }
            // reconnect while the player still wants to be in their room
            if (this.wanted && this.room && this.retries < RETRY_MS.length) {
                const wait = RETRY_MS[this.retries++];
                setTimeout(() => { if (this.wanted && this.status === 'offline') this.connect(); }, wait);
            } else if (this.room) {
                this.room = null;
                this._emit('closed', { reason: 'connection_lost' });
            }
        };
        return this._welcomed;
    }

    _onMessage(msg, resolveWelcome) {
        switch (msg.t) {
            case 'welcome':
                this.you = msg.you;
                this.retries = 0;
                this._setStatus('online');
                resolveWelcome(msg.you);
                for (const m of this._queue.splice(0)) this._send(m);
                break;
            case 'room':
                this.room = msg.room;
                this._emit('room', msg.room);
                break;
            case 'started':
                this._emit('started', this.room);
                break;
            case 'closed':
                this.room = null;
                this._emit('closed', msg);
                break;
            case 'relay':
                this._emit('relay', msg);
                break;
            case 'error':
                this._fail(msg);
                break;
        }
    }

    _fail(err) {
        this.lastError = { code: err.code, message: err.message };
        this._emit('error', this.lastError);
    }

    _send(msg) {
        if (this.status === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this._refill();
            if (this._backlog.length || this._tokens < 1) { this._hold(msg); return true; }
            this._tokens -= 1;
            return this._wire(msg);
        }
        if (this.status === 'connecting') { this._queue.push(msg); return true; }
        this._fail({ code: 'network', message: 'Not connected to the server.' });
        return false;
    }

    /** Onto the connection: never a message the server would close the connection over (too big), which is reported instead. */
    _wire(msg) {
        const json = JSON.stringify(msg);
        if (json.length > MAX_SEND_BYTES) {
            console.warn('[mp] a message was too big to send', msg && msg.t, msg && msg.data && msg.data.k, json.length);
            this._fail({ code: 'too_big', message: 'Something was too big to send to the other players.' });
            return false;
        }
        this.ws.send(json);
        return true;
    }
    _refill() {
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (!this._lastRefill) this._lastRefill = t;
        this._tokens = Math.min(SEND_RATE.burst, this._tokens + (t - this._lastRefill) / 1000 * SEND_RATE.perSecond);
        this._lastRefill = t;
    }
    /** Over the pace: kept to send shortly. Only the newest of the same kind of update waits: a newer position or trade offer replaces an
     *  older one still waiting (it says everything the older one did). */
    _hold(msg) {
        const k = coalesceKey(msg);
        if (k) {
            const i = this._backlog.findIndex(m => coalesceKey(m) === k);
            if (i !== -1) { this._backlog[i] = msg; this._scheduleFlush(); return; }
        }
        if (this._backlog.length >= MAX_BACKLOG) this._backlog.shift();   // never an endless pile (the oldest, by now stale, goes)
        this._backlog.push(msg);
        this._scheduleFlush();
    }
    _scheduleFlush() {
        if (this._flushTimer) return;
        this._flushTimer = setTimeout(() => { this._flushTimer = null; this._flushBacklog(); }, 1000 / SEND_RATE.perSecond);
    }
    _flushBacklog() {
        if (!(this.status === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN)) { this._backlog = []; return; }
        this._refill();
        while (this._backlog.length && this._tokens >= 1) { this._tokens -= 1; this._wire(this._backlog.shift()); }
        if (this._backlog.length) this._scheduleFlush();
    }

    host(world) { this.lastError = null; return this._send({ t: 'host', world }); }
    join(code) { this.lastError = null; return this._send({ t: 'join', code }); }
    setReady(ready) { return this._send({ t: 'ready', ready: !!ready }); }
    start() { return this._send({ t: 'start' }); }
    kick(id) { return this._send({ t: 'kick', id }); }
    relay(data, to) { return this._send(to === undefined ? { t: 'relay', data } : { t: 'relay', to, data }); }

    /** Leaves the room (the host leaving closes it for everyone) and closes the connection. */
    leave() {
        if (this.room) this._send({ t: 'leave' });
        this.room = null;
        this.wanted = false;
        const ws = this.ws;
        this.ws = null;
        this._queue = [];
        if (ws) { try { ws.close(1000, 'Left'); } catch { /* already closed */ } }
        this._setStatus('offline');
    }
}

/* The pace this client sends at: under the server's limit (40 a second, bursts of 80) with room to spare. */
const SEND_RATE = { perSecond: 25, burst: 50 };
const MAX_SEND_BYTES = 7.5 * 1024 * 1024;   // the server closes a connection whose message is over 8 MB (lobbyServer.js MAX_MESSAGE_BYTES)
const MAX_BACKLOG = 200;
/** Updates where only the newest matters (a newer one says everything an older one did): where this player is, and their trade offer. */
function coalesceKey(msg) {
    const d = msg && msg.t === 'relay' && msg.data;
    if (!d) return null;
    if (d.k === 'pos') return 'pos';
    if (d.k === 'tr_offer') return 'tr_offer:' + (msg.to || '');
    return null;
}

export const multiplayer = new MultiplayerClient();

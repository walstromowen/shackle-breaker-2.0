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
        if (this.status === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(msg)); return true; }
        if (this.status === 'connecting') { this._queue.push(msg); return true; }
        this._fail({ code: 'network', message: 'Not connected to the server.' });
        return false;
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

export const multiplayer = new MultiplayerClient();

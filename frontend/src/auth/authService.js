// frontend/src/auth/authService.js: talks to the server's /api/auth routes and remembers who is logged in.
import { resolveApiBase } from './apiConfig.js';

const TOKEN_KEY = 'shackle-breaker:token';
const USER_KEY = 'shackle-breaker:user';

/* A free Render server sleeps when nobody uses it and takes up to a minute to wake: wait that long before giving up. */
const DEFAULT_TIMEOUT_MS = 75000;

export class ApiError extends Error {
    constructor(message, { status = 0, network = false } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;       // HTTP status, 0 when the server could not be reached at all
        this.network = network;     // true: no answer (offline, server down, timed out)
    }
}

const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: the login just lasts until the tab closes */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* nothing to do */ } }
};

/* The expiry (seconds since 1970) inside a login token. Only used to skip a stale token; the SERVER is what really checks it. */
function tokenExpiry(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
        return null;
    }
}

let session = null;   // { token, user: { id, username } } while logged in

export const AuthService = {
    get user() { return session ? session.user : null; },
    get token() { return session ? session.token : null; },
    get isLoggedIn() { return !!session; },

    /**
     * A generic JSON request. Throws ApiError with a message that is fit to show the player.
     * `keepalive` lets a request finish while the page is closing (limited by the browser to small bodies).
     */
    async request(method, path, { body, token = this.token, timeoutMs = DEFAULT_TIMEOUT_MS, keepalive = false } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
            res = await fetch((await resolveApiBase()) + path, {
                method,
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
                keepalive
            });
        } catch (e) {
            const timedOut = e && e.name === 'AbortError';
            throw new ApiError(timedOut ? 'The server took too long to answer.' : 'Could not reach the server.', { network: true });
        } finally {
            clearTimeout(timer);
        }

        let json = null;
        try { json = await res.json(); } catch { /* an empty or non-JSON body */ }
        if (!res.ok) throw new ApiError((json && json.error) || `The server said no (${res.status}).`, { status: res.status });
        return json;
    },

    /** Wakes a sleeping server and learns whether sign-up needs an invite code. Resolves { inviteRequired } or throws ApiError. */
    health() {
        return this.request('GET', '/api/health', { token: null });
    },

    async register({ username, password, inviteCode }) {
        const result = await this.request('POST', '/api/auth/register', { body: { username, password, inviteCode }, token: null });
        this._startSession(result);
        return result.user;
    },

    async login({ username, password }) {
        const result = await this.request('POST', '/api/auth/login', { body: { username, password }, token: null });
        this._startSession(result);
        return result.user;
    },

    /**
     * Picks up the login from an earlier visit WITHOUT asking the server (so a returning player never waits for a sleeping server).
     * Returns the user, or null if there is none / it has expired. A token the server no longer accepts shows up later as a 401 on a save.
     */
    restoreStoredSession() {
        const token = storage.get(TOKEN_KEY);
        const user = (() => { try { return JSON.parse(storage.get(USER_KEY)); } catch { return null; } })();
        if (!token || !user || !user.id || !user.username) return null;

        const exp = tokenExpiry(token);
        if (exp !== null && exp * 1000 < Date.now() + 60 * 1000) {
            this.logout();
            return null;
        }
        session = { token, user };
        return user;
    },

    /** Forgets the login (the saved games stay where they are; they are kept per account). */
    logout() {
        session = null;
        storage.remove(TOKEN_KEY);
        storage.remove(USER_KEY);
    },

    _startSession({ token, user }) {
        session = { token, user };
        storage.set(TOKEN_KEY, token);
        storage.set(USER_KEY, JSON.stringify(user));
    }
};

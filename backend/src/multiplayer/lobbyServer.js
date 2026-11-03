// backend/src/multiplayer/lobbyServer.js: the multiplayer connection, a WebSocket at /api/mp on the same server as the game and the API.
//
// A connection must say who it is first: { t: 'hello', token } with the login token the game already has (the same one the cloud saves
// use). The server answers { t: 'welcome', you: { id, username } } and from then on hands every message to the Lobby (lobby.js).
// One connection per account: a second one (another tab) replaces the first.
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { Lobby } from './lobby.js';

export const MP_PATH = '/api/mp';
const MAX_MESSAGE_BYTES = 64 * 1024;
const HELLO_TIMEOUT_MS = 10000;
const PING_EVERY_MS = 25000;         // keeps the connection open through proxies, and finds dead ones
const SWEEP_EVERY_MS = 5000;
const RATE = { perSecond: 40, burst: 80 };   // messages a connection may send (movement later sends a few a second)

/**
 * Adds the multiplayer WebSocket to an http server.
 * @returns {{ lobby: Lobby, wss: WebSocketServer, close: () => void }}
 */
export function attachLobbyServer(httpServer, { config, lobby: givenLobby } = {}) {
    const sockets = new Map();   // userId -> ws
    const lobby = givenLobby || new Lobby({
        send: (userId, msg) => {
            const ws = sockets.get(userId);
            if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
        },
    });
    const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

    httpServer.on('upgrade', (req, socket, head) => {
        let path = '';
        try { path = new URL(req.url, 'http://x').pathname; } catch { /* a malformed url: not ours */ }
        if (path !== MP_PATH) return;   // another upgrade handler may want it; if none does, the socket times out
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.user = null;
        ws.tokens = RATE.burst;
        ws.lastRefill = Date.now();
        ws.on('pong', () => { ws.isAlive = true; });
        const helloTimer = setTimeout(() => { if (!ws.user) ws.close(4001, 'No hello'); }, HELLO_TIMEOUT_MS);

        ws.on('message', (raw, isBinary) => {
            if (isBinary) return;
            // a simple token bucket: a client that floods the server is cut off
            const t = Date.now();
            ws.tokens = Math.min(RATE.burst, ws.tokens + (t - ws.lastRefill) / 1000 * RATE.perSecond);
            ws.lastRefill = t;
            if (ws.tokens < 1) { ws.close(4008, 'Too many messages'); return; }
            ws.tokens -= 1;

            let msg;
            try { msg = JSON.parse(raw.toString()); } catch { return; }
            if (!ws.user) {
                if (!msg || msg.t !== 'hello') { ws.close(4001, 'Say hello first'); return; }
                let claims;
                try { claims = jwt.verify(String(msg.token || ''), config.jwtSecret); } catch {
                    ws.send(JSON.stringify({ t: 'error', code: 'auth', message: 'Your login has expired. Log out and back in to play online.' }));
                    ws.close(4003, 'Bad token');
                    return;
                }
                clearTimeout(helloTimer);
                ws.user = { id: String(claims.sub), username: String(claims.u || 'Player') };
                const old = sockets.get(ws.user.id);
                if (old && old !== ws) { old.replaced = true; old.close(4009, 'Connected somewhere else'); }
                sockets.set(ws.user.id, ws);
                ws.send(JSON.stringify({ t: 'welcome', you: ws.user }));
                lobby.connect(ws.user);
                return;
            }
            lobby.handle(ws.user.id, msg);
        });

        ws.on('close', () => {
            clearTimeout(helloTimer);
            if (!ws.user || ws.replaced) return;
            if (sockets.get(ws.user.id) === ws) sockets.delete(ws.user.id);
            lobby.disconnect(ws.user.id);
        });
        ws.on('error', () => { /* 'close' follows */ });
    });

    const ping = setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.isAlive) { ws.terminate(); continue; }
            ws.isAlive = false;
            try { ws.ping(); } catch { /* closing */ }
        }
    }, PING_EVERY_MS);
    const sweep = setInterval(() => lobby.sweep(), SWEEP_EVERY_MS);
    ping.unref?.(); sweep.unref?.();

    return {
        lobby,
        wss,
        close() {
            clearInterval(ping); clearInterval(sweep);
            for (const ws of wss.clients) ws.terminate();
            wss.close();
        },
    };
}

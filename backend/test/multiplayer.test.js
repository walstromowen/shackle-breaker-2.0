// backend/test/multiplayer.test.js: `npm test`. The multiplayer rooms (src/multiplayer/lobby.js), then the real WebSocket at /api/mp.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { Lobby, MAX_PLAYERS, RECONNECT_GRACE_MS, CODE_ALPHABET, CODE_LENGTH } from '../src/multiplayer/lobby.js';
import { attachLobbyServer, MP_PATH } from '../src/multiplayer/lobbyServer.js';
import { createApp } from '../src/app.js';
import { createMemoryRepo } from '../src/repos/memoryRepo.js';
import { loadConfig } from '../src/config.js';
import { signToken } from '../src/middleware/requireAuth.js';

/* A lobby whose messages are collected per player, with a clock the test moves */
function setup() {
    const inbox = {};
    let clock = 1000;
    const lobby = new Lobby({ send: (id, msg) => (inbox[id] ??= []).push(msg), now: () => clock });
    const last = (id, t) => [...(inbox[id] || [])].reverse().find(m => m.t === t);
    const users = ['ann', 'bo', 'cy', 'dee'].map(id => ({ id, username: id.toUpperCase() }));
    users.forEach(u => lobby.connect(u));
    return { lobby, inbox, last, tick: (ms) => { clock += ms; }, users };
}

test('a host opens a room with a code; up to three players join it; a fourth is turned away', () => {
    const { lobby, last } = setup();
    lobby.handle('ann', { t: 'host', world: { name: 'Hero', day: 4, slot: 'slot1' } });
    const room = last('ann', 'room').room;
    assert.equal(room.code.length, CODE_LENGTH);
    assert.ok([...room.code].every(c => CODE_ALPHABET.includes(c)));
    assert.deepEqual(room.world, { name: 'Hero', day: 4, slot: 'slot1', isNew: false });
    assert.equal(room.players[0].isHost, true);

    lobby.handle('bo', { t: 'join', code: room.code.toLowerCase() });   // codes are not case sensitive
    lobby.handle('cy', { t: 'join', code: ` ${room.code} ` });
    assert.equal(last('ann', 'room').room.players.length, MAX_PLAYERS, 'everyone in the room hears about each join');
    lobby.handle('dee', { t: 'join', code: room.code });
    assert.equal(last('dee', 'error').code, 'full');
    lobby.handle('dee', { t: 'join', code: 'ZZZZZ' });
    assert.equal(last('dee', 'error').code, 'not_found');
    lobby.handle('bo', { t: 'host', world: {} });
    assert.equal(last('bo', 'error').code, 'in_room', 'one room at a time');
});

test('only the host starts, and only when every guest is ready', () => {
    const { lobby, last } = setup();
    lobby.handle('ann', { t: 'host', world: {} });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    lobby.handle('bo', { t: 'start' });
    assert.equal(last('bo', 'error').code, 'not_host');
    lobby.handle('ann', { t: 'start' });
    assert.equal(last('ann', 'error').code, 'not_ready');
    lobby.handle('bo', { t: 'ready', ready: true });
    lobby.handle('ann', { t: 'start' });
    assert.ok(last('ann', 'started') && last('bo', 'started'));
    assert.equal(last('bo', 'room').room.state, 'playing');
});

test('a room can be a new world (Host a World > New World): every player is told, and only a real true counts', () => {
    const { lobby, last } = setup();
    lobby.handle('ann', { t: 'host', world: { name: 'A new world', day: 1, slot: '', isNew: true } });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    assert.equal(last('bo', 'room').room.world.isNew, true, 'the joining player knows it is a new world');
    lobby.handle('cy', { t: 'host', world: { isNew: 'yes' } });
    assert.equal(last('cy', 'room').room.world.isNew, false);
});

test('a guest leaving frees the place; the host leaving closes the room for everyone', () => {
    const { lobby, last } = setup();
    lobby.handle('ann', { t: 'host', world: {} });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    lobby.handle('cy', { t: 'join', code });
    lobby.handle('cy', { t: 'leave' });
    assert.deepEqual(last('ann', 'room').room.players.map(p => p.id), ['ann', 'bo']);
    lobby.handle('ann', { t: 'leave' });
    assert.equal(last('bo', 'closed').reason, 'host_left');
    assert.equal(lobby.rooms.size, 0);
    lobby.handle('cy', { t: 'join', code });
    assert.equal(last('cy', 'error').code, 'not_found');
});

test('the host can kick a guest', () => {
    const { lobby, last } = setup();
    lobby.handle('ann', { t: 'host', world: {} });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    lobby.handle('bo', { t: 'kick', id: 'ann' });
    assert.equal(last('bo', 'error').code, 'not_host');
    lobby.handle('ann', { t: 'kick', id: 'bo' });
    assert.equal(last('bo', 'closed').reason, 'kicked');
    assert.deepEqual(last('ann', 'room').room.players.map(p => p.id), ['ann']);
});

test('a dropped player keeps their place for the grace period and gets it back on reconnecting; a lost host closes the room', () => {
    const { lobby, last, tick, inbox } = setup();
    lobby.handle('ann', { t: 'host', world: {} });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    lobby.disconnect('bo');
    assert.equal(last('ann', 'room').room.players.find(p => p.id === 'bo').connected, false);
    tick(RECONNECT_GRACE_MS - 1000); lobby.sweep();
    inbox.bo = [];
    lobby.connect({ id: 'bo', username: 'BO' });
    assert.equal(last('bo', 'room').room.code, code, 'back in the same room');
    lobby.disconnect('bo');
    tick(RECONNECT_GRACE_MS + 1); lobby.sweep();
    assert.deepEqual(last('ann', 'room').room.players.map(p => p.id), ['ann'], 'gone after the grace period');

    lobby.handle('cy', { t: 'join', code });
    lobby.disconnect('ann');
    tick(RECONNECT_GRACE_MS + 1); lobby.sweep();
    assert.equal(last('cy', 'closed').reason, 'host_lost');
});

test('relay passes a game message to one player or to everyone else, never back to the sender or out of the room', () => {
    const { lobby, last, inbox } = setup();
    lobby.handle('ann', { t: 'host', world: {} });
    const code = last('ann', 'room').room.code;
    lobby.handle('bo', { t: 'join', code });
    lobby.handle('cy', { t: 'join', code });
    lobby.handle('ann', { t: 'relay', data: { hi: 1 } });
    assert.deepEqual(last('bo', 'relay'), { t: 'relay', from: 'ann', data: { hi: 1 } });
    assert.ok(last('cy', 'relay'));
    assert.equal(last('ann', 'relay'), undefined);
    inbox.cy = [];
    lobby.handle('bo', { t: 'relay', to: 'ann', data: 2 });
    assert.equal(last('ann', 'relay').data, 2);
    assert.equal(last('cy', 'relay'), undefined);
    lobby.handle('dee', { t: 'relay', data: 3 });
    assert.equal(last('dee', 'error').code, 'not_in_room');
});

test('bad requests are answered with an error, not a crash', () => {
    const { lobby, last } = setup();
    for (const msg of [null, 7, {}, { t: 'nope' }, { t: 'join' }, { t: 'kick' }]) lobby.handle('ann', msg);
    assert.ok(last('ann', 'error'));
    lobby.handle('ann', { t: 'host', world: { name: 'x'.repeat(500), day: -4 } });
    const w = last('ann', 'room').room.world;
    assert.equal(w.name.length, 40);
    assert.equal(w.day, 1);
});

// ---- the real socket ----
let server, url, mp;
const config = loadConfig({ JWT_SECRET: 'test-secret-test-secret', SERVE_FRONTEND: 'false' });
before(async () => {
    const app = createApp({ repo: createMemoryRepo(), config });
    await new Promise(resolve => { server = app.listen(0, resolve); });
    mp = attachLobbyServer(server, { config });
    url = `ws://127.0.0.1:${server.address().port}${MP_PATH}`;
});
after(() => new Promise(resolve => { mp.close(); server.close(resolve); }));

/* A connected client that remembers what it is sent; next(t) waits for the next message of that type */
async function client(user) {
    const ws = new WebSocket(url);
    const got = [];
    const waiting = [];
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        const w = waiting.findIndex(x => x.t === msg.t);
        if (w >= 0) waiting.splice(w, 1)[0].resolve(msg); else got.push(msg);
    });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    const next = (t) => {
        const i = got.findIndex(m => m.t === t);
        if (i >= 0) return Promise.resolve(got.splice(i, 1)[0]);
        return new Promise((resolve, reject) => { waiting.push({ t, resolve }); setTimeout(() => reject(new Error(`no ${t}`)), 3000); });
    };
    const send = (msg) => ws.send(JSON.stringify(msg));
    if (user) send({ t: 'hello', token: signToken(user, config) });
    return { ws, next, send };
}


/* the host's view of the room once every guest's ready has arrived (the guest's ready and the host's start come over different connections) */
async function readyAll(host) {
    for (let i = 0; i < 10; i++) {
        const r = (await host.next('room')).room;
        if (r.players.every(p => p.host || p.ready || p.id === r.hostId)) return r;
    }
    throw new Error('the guests never got ready');
}
test('over the socket: hello with the login token, then host, join, ready, start and relay', async () => {
    const a = await client({ id: 'u1', username: 'Ann' });
    assert.deepEqual((await a.next('welcome')).you, { id: 'u1', username: 'Ann' });
    const b = await client({ id: 'u2', username: 'Bo' });
    await b.next('welcome');

    a.send({ t: 'host', world: { name: 'Ann', day: 2 } });
    const code = (await a.next('room')).room.code;
    b.send({ t: 'join', code });
    assert.equal((await b.next('room')).room.players.length, 2);
    b.send({ t: 'ready', ready: true });
    await readyAll(a);
    a.send({ t: 'start' });
    await a.next('started'); await b.next('started');
    b.send({ t: 'relay', data: { step: [3, 4] } });
    assert.deepEqual((await a.next('relay')).data, { step: [3, 4] });
    a.ws.close(); b.ws.close();
});

test('over the socket: a bad token is refused, and a second connection of one account replaces the first', async () => {
    const bad = await client(null);
    bad.send({ t: 'hello', token: 'nonsense' });
    assert.equal((await bad.next('error')).code, 'auth');
    await new Promise(res => bad.ws.once('close', res));

    const first = await client({ id: 'u9', username: 'Cy' });
    await first.next('welcome');
    const closed = new Promise(res => first.ws.once('close', (code) => res(code)));
    const second = await client({ id: 'u9', username: 'Cy' });
    await second.next('welcome');
    assert.equal(await closed, 4009);
    second.ws.close();
});

test('over the socket: nothing a player sends cuts the connection or brings the server down (bursts, junk, a failing handler, a whole world)', async () => {
    const a = await client({ id: 'u31', username: 'Ann' }); await a.next('welcome');
    const b = await client({ id: 'u32', username: 'Bo' }); await b.next('welcome');
    let aClosed = null, bClosed = null;
    a.ws.on('close', (c) => { aClosed = c; }); b.ws.on('close', (c) => { bClosed = c; });
    a.send({ t: 'host', world: { name: 'Ann' } });
    const code = (await a.next('room')).room.code;
    b.send({ t: 'join', code }); await b.next('room');
    b.send({ t: 'ready', ready: true }); await readyAll(a); a.send({ t: 'start' });
    await a.next('started'); await b.next('started');
    // a burst well over what the game itself sends (it paces at 25 a second)
    for (let i = 0; i < 100; i++) b.send({ t: 'relay', data: { k: 'tr_offer', v: i } });
    // junk: broken JSON, binary, no type, unknown type, odd relays
    b.ws.send('{not json'); b.ws.send(Buffer.from([1, 2, 3]), { binary: true });
    b.send({}); b.send({ t: 42 }); b.send({ t: 'nonsense' }); b.send({ t: 'relay' }); b.send({ t: 'relay', to: 'nobody', data: { k: 'x' } });
    b.send({ t: 'relay', to: { evil: true }, data: null }); b.send({ t: 'kick', id: 'u31' }); b.send({ t: 'start' });
    // a handler that throws: the server carries on
    const real = mp.lobby.handle.bind(mp.lobby);
    let thrown = 0;
    mp.lobby.handle = (id, msg) => { if (msg && msg.t === 'relay' && msg.data && msg.data.k === 'boom') { thrown++; throw new Error('boom'); } return real(id, msg); };
    const log = console.error; console.error = () => {};
    try { b.send({ t: 'relay', data: { k: 'boom' } }); await new Promise(r => setTimeout(r, 300)); } finally { console.error = log; mp.lobby.handle = real; }
    assert.equal(thrown, 1, 'the failing handler ran');
    // a whole world, as a host sends a joining guest (a save can be 3 MB)
    const world = 'x'.repeat(5 * 1024 * 1024);
    a.send({ t: 'relay', to: 'u32', data: { k: 'world', save: world } });
    const got = await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('no world')), 5000); b.ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.t === 'relay' && m.data && m.data.k === 'world') { clearTimeout(t); resolve(m); } }); });
    assert.equal(got.data.save.length, world.length, 'a 5 MB world arrives whole');
    // still connected both ways, the room intact
    b.send({ t: 'relay', data: { k: 'still_here' } });
    for (let i = 0; i < 200; i++) { const m = await a.next('relay'); if (m.data && m.data.k === 'still_here') break; }   // the burst first, in order, then this
    await new Promise(r => setTimeout(r, 300));
    assert.equal(aClosed, null, 'the host is still connected');
    assert.equal(bClosed, null, 'the guest is still connected');
    assert.equal(a.ws.readyState, WebSocket.OPEN); assert.equal(b.ws.readyState, WebSocket.OPEN);
    a.ws.close(); b.ws.close();
});

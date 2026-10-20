// backend/test/api.test.js: `npm test`. Runs the real Express app against the in-memory repository on a random port.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createMemoryRepo } from '../src/repos/memoryRepo.js';
import { loadConfig } from '../src/config.js';

let server, base;
const config = loadConfig({ JWT_SECRET: 'test-secret-test-secret', INVITE_CODE: 'let-me-in', SERVE_FRONTEND: 'false', MAX_SAVES_PER_USER: '3' });

before(async () => {
    const app = createApp({ repo: createMemoryRepo(), config });
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

const call = async (method, path, { body, token } = {}) => {
    const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, json };
};

const makeSave = (overrides = {}) => ({
    format: 'shackle-breaker-save', saveVersion: 1, savedAt: new Date().toISOString(),
    summary: { name: 'Hero', level: 3, partySize: 2, day: 4, difficulty: 'normal' },
    data: { seed: 1, world: { changes: { '10_12': null, 'a.b': 1, '$x': 2 } }, party: { members: [{}] } },
    ...overrides
});

let token, otherToken;

test('health', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
});

test('register: needs the invite code', async () => {
    assert.equal((await call('POST', '/api/auth/register', { body: { username: 'Alice_1', password: 'longenough1' } })).status, 403);
    assert.equal((await call('POST', '/api/auth/register', { body: { username: 'Alice_1', password: 'longenough1', inviteCode: 'wrong' } })).status, 403);
});

test('register: validates username and password', async () => {
    const ok = { inviteCode: 'let-me-in' };
    for (const [username, password] of [['ab', 'longenough1'], ['has space', 'longenough1'], ['x'.repeat(21), 'longenough1'], ['Alice_1', 'short'], ['Alice_1', 'x'.repeat(73)], [{ $gt: '' }, 'longenough1'], ['Alice_1', { $gt: '' }]]) {
        const r = await call('POST', '/api/auth/register', { body: { username, password, ...ok } });
        assert.equal(r.status, 400, `expected 400 for ${JSON.stringify([username, password]).slice(0, 40)}`);
    }
});

test('register + login + me', async () => {
    const reg = await call('POST', '/api/auth/register', { body: { username: 'Alice_1', password: 'longenough1', inviteCode: 'let-me-in' } });
    assert.equal(reg.status, 201);
    assert.ok(reg.json.token);
    assert.equal(reg.json.user.username, 'Alice_1');
    assert.equal(reg.json.passwordHash, undefined);

    // usernames are unique ignoring case
    const dup = await call('POST', '/api/auth/register', { body: { username: 'alice_1', password: 'longenough1', inviteCode: 'let-me-in' } });
    assert.equal(dup.status, 409);

    // login is case-insensitive on the username, case-sensitive on the password
    const login = await call('POST', '/api/auth/login', { body: { username: 'ALICE_1', password: 'longenough1' } });
    assert.equal(login.status, 200);
    token = login.json.token;
    assert.equal((await call('POST', '/api/auth/login', { body: { username: 'Alice_1', password: 'LONGENOUGH1' } })).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { body: { username: 'nobody', password: 'longenough1' } })).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { body: { username: { $ne: '' }, password: 'x' } })).status, 400);

    const me = await call('GET', '/api/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.json.user.username, 'Alice_1');

    const bob = await call('POST', '/api/auth/register', { body: { username: 'Bob_2', password: 'anotherpass', inviteCode: 'let-me-in' } });
    otherToken = bob.json.token;
});

test('saves need a login', async () => {
    assert.equal((await call('GET', '/api/saves')).status, 401);
    assert.equal((await call('GET', '/api/saves', { token: 'garbage' })).status, 401);
    assert.equal((await call('PUT', '/api/saves/autosave', { body: { save: makeSave() } })).status, 401);
});

test('save round trip keeps odd keys exactly', async () => {
    assert.equal((await call('GET', '/api/saves/autosave', { token })).status, 404);

    const save = makeSave();
    const put = await call('PUT', '/api/saves/autosave', { token, body: { save } });
    assert.equal(put.status, 200);

    const got = await call('GET', '/api/saves/autosave', { token });
    assert.equal(got.status, 200);
    assert.deepEqual(got.json.save, save);

    const list = await call('GET', '/api/saves', { token });
    assert.equal(list.json.saves.length, 1);
    assert.equal(list.json.saves[0].slot, 'autosave');
    assert.equal(list.json.saves[0].summary.name, 'Hero');
});

test('saves are private to their owner', async () => {
    assert.equal((await call('GET', '/api/saves/autosave', { token: otherToken })).status, 404);
    assert.equal((await call('GET', '/api/saves', { token: otherToken })).json.saves.length, 0);
    assert.equal((await call('DELETE', '/api/saves/autosave', { token: otherToken })).json.removed, false);
    assert.equal((await call('GET', '/api/saves/autosave', { token })).status, 200);
});

test('an older save never overwrites a newer one (unless forced)', async () => {
    const newer = makeSave({ savedAt: '2030-01-02T00:00:00.000Z' });
    const older = makeSave({ savedAt: '2030-01-01T00:00:00.000Z' });
    assert.equal((await call('PUT', '/api/saves/stale', { token, body: { save: newer } })).status, 200);
    const stale = await call('PUT', '/api/saves/stale', { token, body: { save: older } });
    assert.equal(stale.status, 409);
    assert.equal((await call('GET', '/api/saves/stale', { token })).json.save.savedAt, newer.savedAt);
    assert.equal((await call('PUT', '/api/saves/stale?force=1', { token, body: { save: older } })).status, 200);
    await call('DELETE', '/api/saves/stale', { token });
});

test('bad saves and slots are refused', async () => {
    assert.equal((await call('PUT', '/api/saves/BAD SLOT', { token, body: { save: makeSave() } })).status, 400);
    assert.equal((await call('PUT', '/api/saves/..%2Fetc', { token, body: { save: makeSave() } })).status, 400);
    assert.equal((await call('PUT', '/api/saves/x', { token, body: { save: makeSave({ format: 'nope' }) } })).status, 400);
    assert.equal((await call('PUT', '/api/saves/x', { token, body: { save: makeSave({ saveVersion: 'one' }) } })).status, 400);
    assert.equal((await call('PUT', '/api/saves/x', { token, body: { save: makeSave({ data: null }) } })).status, 400);
    assert.equal((await call('PUT', '/api/saves/x', { token, body: {} })).status, 400);
    assert.equal((await call('PUT', '/api/saves/x', { token, body: { save: makeSave({ data: { blob: 'x'.repeat(3.2 * 1024 * 1024) } }) } })).status, 413);
});

test('slot limit per account', async () => {
    // 'autosave' exists; the limit in this test config is 3
    assert.equal((await call('PUT', '/api/saves/a2', { token, body: { save: makeSave() } })).status, 200);
    assert.equal((await call('PUT', '/api/saves/a3', { token, body: { save: makeSave() } })).status, 200);
    assert.equal((await call('PUT', '/api/saves/a4', { token, body: { save: makeSave() } })).status, 400);
    // overwriting an existing slot is still fine
    assert.equal((await call('PUT', '/api/saves/a2', { token, body: { save: makeSave() } })).status, 200);
    assert.equal((await call('DELETE', '/api/saves/a3', { token })).json.removed, true);
    assert.equal((await call('PUT', '/api/saves/a4', { token, body: { save: makeSave() } })).status, 200);
});

test('a named manual save keeps its name (and a long name is cut)', async () => {
    const named = makeSave({ summary: { name: 'Hero', level: 3, partySize: 2, day: 4, difficulty: 'normal', saveName: 'Before the boss' } });
    assert.equal((await call('PUT', '/api/saves/s-abc123', { token, body: { save: named } })).status, 400);   // the test limit is 3 and the account is full
    assert.equal((await call('PUT', '/api/saves/a2', { token, body: { save: named } })).status, 200);
    let list = (await call('GET', '/api/saves', { token })).json.saves;
    assert.equal(list.find(e => e.slot === 'a2').summary.saveName, 'Before the boss');
    const long = makeSave({ summary: { name: 'Hero', saveName: 'y'.repeat(200) } });
    assert.equal((await call('PUT', '/api/saves/a2', { token, body: { save: long } })).status, 200);
    list = (await call('GET', '/api/saves', { token })).json.saves;
    assert.equal(list.find(e => e.slot === 'a2').summary.saveName.length, 40);
    assert.equal(list.find(e => e.slot === 'autosave').summary.saveName, '');   // an autosave carries no player-chosen name
});

test('malformed JSON and unknown routes answer cleanly', async () => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
    assert.equal(res.status, 400);
    assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('an expired token is refused', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const expired = jwt.sign({ sub: 'x', u: 'x' }, config.jwtSecret, { expiresIn: -10 });
    assert.equal((await call('GET', '/api/auth/me', { token: expired })).status, 401);
    const forged = jwt.sign({ sub: 'x', u: 'x' }, 'some-other-secret');
    assert.equal((await call('GET', '/api/auth/me', { token: forged })).status, 401);
});

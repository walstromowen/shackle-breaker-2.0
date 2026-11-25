// backend/test/mppacing.test.js: `npm test`. The multiplayer client keeps under the server's message limit (lobbyServer.js RATE: a connection
// sending more than 40 a second is cut off), so a burst (a trade's quick clicks, a held key) waits instead of costing the connection; only the
// newest position and trade offer wait, never a pile of stale ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { multiplayer } from '../../frontend/src/engine/multiplayerClient.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

test('a burst far over the server limit is paced, never dropped; a waiting trade offer or position is replaced by the newer one', async () => {
    const sent = [];
    const keep = { ws: multiplayer.ws, status: multiplayer.status };
    multiplayer.ws = { readyState: WebSocket.OPEN, send: (s) => sent.push(JSON.parse(s)) };
    multiplayer.status = 'online';
    multiplayer._tokens = 50; multiplayer._lastRefill = 0; multiplayer._backlog = [];
    try {
        for (let i = 0; i < 120; i++) multiplayer.relay({ k: 'chat', text: 'm' + i });
        assert.ok(sent.length <= 51, `at once only the burst goes (${sent.length})`);
        // a quick run of offers while the rest wait: only the last one is kept
        for (let v = 1; v <= 15; v++) multiplayer.relay({ k: 'tr_offer', v, gold: v, items: [] }, 'partner');
        for (let i = 0; i < 10; i++) multiplayer.relay({ k: 'pos', col: i, row: 0 });
        assert.equal(multiplayer._backlog.filter(m => m.data.k === 'tr_offer').length, 1, 'one offer waiting');
        assert.equal(multiplayer._backlog.filter(m => m.data.k === 'pos').length, 1, 'one position waiting');
        // the pace: about 25 a second, far under the server's 40
        const t0 = Date.now();
        while (multiplayer._backlog.length && Date.now() - t0 < 8000) await sleep(100);
        const secs = (Date.now() - t0) / 1000;
        assert.equal(multiplayer._backlog.length, 0, 'everything was sent in the end');
        const chats = sent.filter(m => m.data.k === 'chat').map(m => m.data.text);
        assert.equal(chats.length, 120, 'no message lost');
        assert.deepEqual(chats, chats.slice().sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))), 'in order');
        const offers = sent.filter(m => m.data.k === 'tr_offer');
        assert.deepEqual(offers.map(m => m.data.v), [15], 'only the newest offer went');
        const rate = (sent.length - 50) / Math.max(0.5, secs);
        assert.ok(rate < 40, `paced under the limit (${rate.toFixed(1)} a second)`);
    } finally { multiplayer.ws = keep.ws; multiplayer.status = keep.status; multiplayer._backlog = []; }
});

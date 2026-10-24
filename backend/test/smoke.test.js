// backend/test/smoke.test.js: `npm test`. The wisps of smoke over the title screen: made in code, drawn in layers, changing with the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';

let tilesMade = 0;
const noop = () => {};
const makeCtx = () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: noop });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; tilesMade++; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { drawSmoke } = await import('../../frontend/src/ui/particles/smoke.js');

const recorder = () => {
    const calls = [];
    const ctx = { save: noop, restore: noop, globalAlpha: 1, globalCompositeOperation: 'source-over', drawImage: (...a) => calls.push({ a, alpha: ctx.globalAlpha, op: ctx.globalCompositeOperation }) };
    return { ctx, calls };
};

test('six tiles are made once (two for each of three layers), then reused', () => {
    const { ctx } = recorder();
    drawSmoke(ctx, 0, 1920, 1080);
    assert.equal(tilesMade, 6);
    drawSmoke(ctx, 5, 1920, 1080);
    assert.equal(tilesMade, 6);
});

test('it draws with the screen blend, inside the picture, and the layers cover the width at any moment', () => {
    for (const now of [0, 3.3, 41, 250.7]) {
        const { ctx, calls } = recorder();
        drawSmoke(ctx, now, 1920, 1080);
        assert.ok(calls.length >= 6, 'both tiles of every layer are drawn');
        assert.ok(calls.every(c => c.op === 'screen'));
        assert.ok(calls.every(c => c.alpha > 0 && c.alpha <= 1));
        assert.ok(calls.every(c => c.a[6] >= -1080 * 0.2 && c.a[6] + c.a[8] <= 1080 * 1.2), 'each band is on the screen');
        // every layer: the pieces drawn for it span 0..1920 without a gap
        const byBand = new Map();
        for (const c of calls) { const key = `${c.a[6].toFixed(1)}|${c.a[8].toFixed(1)}`; (byBand.get(key) || byBand.set(key, []).get(key)).push([c.a[5], c.a[5] + c.a[7]]); }
        for (const spans of byBand.values()) {
            const sorted = spans.sort((p, q) => p[0] - q[0]);
            assert.ok(sorted[0][0] <= 0.5, `starts at or left of the edge (${sorted[0][0]})`);
            let reach = sorted[0][1];
            for (const s of sorted.slice(1)) { assert.ok(s[0] <= reach + 0.5, 'no gap'); reach = Math.max(reach, s[1]); }
            assert.ok(reach >= 1920 - 0.5, `reaches the far edge (${reach})`);
        }
    }
});

test('the smoke moves: the same call a little later draws somewhere else', () => {
    const a = recorder(), b = recorder();
    drawSmoke(a.ctx, 10, 1920, 1080);
    drawSmoke(b.ctx, 12, 1920, 1080);
    assert.notDeepEqual(a.calls.map(c => c.a[5]), b.calls.map(c => c.a[5]));
});

test('the wisp look is made separately (six more tiles, once) and draws just the same way', () => {
    const before = tilesMade;
    const { ctx, calls } = recorder();
    drawSmoke(ctx, 4, 1920, 1080, 1, true);
    assert.equal(tilesMade, before + 6);
    drawSmoke(ctx, 9, 1920, 1080, 1, true);
    assert.equal(tilesMade, before + 6, 'reused');
    assert.ok(calls.length >= 6 && calls.every(c => c.op === 'screen'));
});

test('an alpha of 0 draws nothing', () => {
    const { ctx, calls } = recorder();
    drawSmoke(ctx, 7, 1920, 1080, 0);
    assert.equal(calls.length, 0);
});

// backend/test/graphics.test.js: `npm test`. Light graphics (frontend/src/engine/graphics.js): when the browser draws without the graphics card the
// game switches its costliest effects off by itself (mode 'auto'), the player can force Full or Light, and the title screen's notice gives the steps
// for their browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { graphics, browserKind, gpuFixSteps, GRAPHICS_MODES } = await import('../../frontend/src/engine/graphics.js');

test('the browser is recognised for the steps the notice gives', () => {
    assert.equal(browserKind('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'), 'chrome');
    assert.equal(browserKind('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0'), 'edge');
    assert.equal(browserKind('Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0'), 'firefox');
    assert.equal(browserKind('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'), 'safari');
    for (const kind of ['chrome', 'edge', 'firefox', 'safari', 'other']) assert.ok(gpuFixSteps(kind).length >= 2, kind);
    assert.match(gpuFixSteps('chrome')[0], /graphics acceleration/);
});

test('auto turns Light graphics on only when the browser draws in software; full and light are what they say', () => {
    const saved = { info: graphics.info, mode: graphics.mode };
    try {
        graphics.info = { software: true, renderer: 'Microsoft Basic Render Driver', known: true };
        graphics.mode = 'auto'; assert.equal(graphics.light, true);
        graphics.mode = 'full'; assert.equal(graphics.light, false);
        graphics.info = { software: false, renderer: 'AMD Radeon', known: true };
        graphics.mode = 'auto'; assert.equal(graphics.light, false);
        graphics.mode = 'light'; assert.equal(graphics.light, true);
        assert.deepEqual(GRAPHICS_MODES, ['auto', 'full', 'light']);
    } finally { graphics.info = saved.info; graphics.mode = saved.mode; }
});

test('the screen ignores shadows while Light graphics is on, and takes them again when it is off', () => {
    class FakeCtx { constructor() { this._blur = 0; this._color = 'black'; } get shadowBlur() { return this._blur; } set shadowBlur(v) { this._blur = v; }
        get shadowColor() { return this._color; } set shadowColor(v) { this._color = v; } }
    const saved = { info: graphics.info, mode: graphics.mode };
    try {
        graphics.info = { software: true, renderer: 'x', known: true };
        const ctx = new FakeCtx();
        graphics.applyTo(ctx);
        graphics.mode = 'light';
        ctx.shadowBlur = 20; ctx.shadowColor = 'red';
        assert.equal(ctx.shadowBlur, 0);
        assert.equal(ctx.shadowColor, 'rgba(0,0,0,0)');
        graphics.mode = 'full';
        ctx.shadowBlur = 20; ctx.shadowColor = 'red';
        assert.equal(ctx.shadowBlur, 20);
        assert.equal(ctx.shadowColor, 'red');
    } finally { graphics.info = saved.info; graphics.mode = saved.mode; }
});

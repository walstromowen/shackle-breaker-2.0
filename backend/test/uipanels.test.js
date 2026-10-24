// backend/test/uipanels.test.js: `npm test`. The dark UI surfaces: a panel is painted once and drawn from a cached picture; textures are made without image files.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// A canvas that records nothing and accepts everything: enough to run the drawing code in Node.
let layersMade = 0;
const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; layersMade++; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { CanvasUI } = await import('../../frontend/src/ui/canvasUI.js');
const { UITextures } = await import('../../frontend/src/ui/uiTextures.js');
const { UITheme } = await import('../../frontend/src/ui/UITheme.js');

test('a panel is painted once per size and fill, then drawn from the cache', () => {
    const ctx = makeCtx();
    let blits = 0;
    ctx.drawImage = () => { blits++; };
    const ui = new CanvasUI(ctx);
    ui.drawPanel(0, 0, 50, 50);             // (the first panel also makes the grain and blotch textures)
    blits = 0;
    const before = layersMade;
    ui.drawPanel(10, 10, 300, 200);
    ui.drawPanel(400, 50, 300, 200);        // same size and fill somewhere else: no new picture
    ui.drawPanel(10, 10, 300, 200);
    assert.equal(layersMade - before, 1, 'one picture for three panels of one size');
    assert.equal(blits, 3);
    ui.drawPanel(10, 10, 320, 200);         // another size: another picture
    ui.drawPanel(10, 10, 300, 200, 'rgba(1, 2, 3, 0.5)');   // another fill: another picture
    assert.equal(layersMade - before, 3);
});

test('an item slot is its own look (a recess), cached separately from a plate of the same size', () => {
    const ctx = makeCtx(); ctx.drawImage = noop;
    const ui = new CanvasUI(ctx);
    const before = layersMade;
    ui.drawPanel(0, 0, 96, 96, UITheme.colors.bgScale[1]);
    ui.drawSlot(0, 0, 96, 96, UITheme.colors.bgScale[1]);
    assert.equal(layersMade - before, 2);
});

test('nothing is drawn for a panel with no size, and a gradient fill is painted directly', () => {
    const ctx = makeCtx(); ctx.drawImage = () => assert.fail('no picture for an empty panel');
    const ui = new CanvasUI(ctx);
    ui.drawPanel(0, 0, 0, 40);
    ui.drawPanel(0, 0, 40, 1);
    const before = layersMade;
    ctx.drawImage = () => assert.fail('a gradient fill is not cached');
    ui.drawPanel(0, 0, 200, 100, { addColorStop: noop });
    assert.equal(layersMade, before);
});

test('the textures are made in code, once, and a screen background draws them', () => {
    const grain = UITextures.grain();
    assert.equal(UITextures.grain(), grain, 'cached');
    assert.equal(grain.width, 256);
    assert.equal(UITextures.mottle().width, 512);
    assert.equal(UITextures.screenBase().width, 1920);
    const ctx = makeCtx();
    let blits = 0; ctx.drawImage = () => { blits++; };
    UITextures.clearBackdrop();
    UITextures.drawScreenBackground(ctx, 1920, 1080, false);
    assert.equal(blits, 2, 'the base and the vignette');
    blits = 0;
    UITextures.drawScreenBackground(ctx, 1920, 1080);
    assert.ok(blits > 2, 'with smoke on (the default) it also draws the drifting smoke, between the base and the vignette');
    UITextures.captureBackdrop({ width: 3840, height: 2160 });
    assert.ok(UITextures.backdrop, 'a captured world becomes the backdrop');
    blits = 0;
    UITextures.drawScreenBackground(ctx, 1920, 1080, false);
    assert.equal(blits, 3, 'the world, the texture over it and the vignette');
    UITextures.clearBackdrop();
    assert.equal(UITextures.backdrop, null);
});

// backend/test/weather.test.js: `npm test`. The weather renderer must stay cheap: no allocation per frame while it rains, a bounded number of splashes,
// and it thins itself out when the frames stay slow.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// the renderer makes small canvases for its fog texture; a stand-in is enough for the logic
const fakeCtx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }) };
const { WeatherRenderer } = await import('../../frontend/src/screens/overworld/weatherRenderer.js');
const { gameState } = await import('../../shared/core/gameState.js');

const config = { GAME_SCALE: 1 };
const canvas = { width: 1920, height: 1080 };
const camera = { x: 0, y: 0 };
const startRain = () => {
    gameState.world.isInterior = false;
    gameState.world.currentWeather = { id: 'RAIN', visualEffect: 'particle_rain', intensity: 1 };
    const w = new WeatherRenderer(canvas, fakeCtx, config);
    for (let i = 0; i < 600; i++) w.update(1 / 60, camera);
    return w;
};

test('a drop that lands is re-rolled in place, not replaced by a new object', () => {
    const w = startRain();
    const before = w.particles.slice();
    for (let i = 0; i < 300; i++) w.update(1 / 60, camera);
    assert.equal(w.particles.length, before.length);
    assert.ok(w.particles.every((p, i) => p === before[i]), 'the particle objects are reused');
});

test('splashes are pooled, bounded and all die out when the rain stops', () => {
    const w = startRain();
    assert.ok(w.splashes.n > 0, 'rain makes splashes');
    assert.ok(w.splashes.n <= w.SPLASH_MAX);
    for (let i = 0; i < 20000; i++) w.createSplash(10, 10); // far more than the pool holds
    assert.equal(w.splashes.n, w.SPLASH_MAX);
    w.update(1 / 60, camera);
    gameState.world.currentWeather = { id: 'CLEAR', visualEffect: 'none', intensity: 0 };
    for (let i = 0; i < 600; i++) w.update(1 / 60, camera);
    assert.equal(w.splashes.n, 0);
});

test('every drop has a streak sprite that exists in the atlas', () => {
    const w = startRain();
    w.buildRainAtlas();
    const { cells } = w.rainAtlas;
    assert.equal(cells.length, w.RAIN_LENGTH_STEPS * w.RAIN_SLANT_STEPS);
    for (const p of w.particles) assert.ok(cells[p.sprite], 'sprite ' + p.sprite);
});

test('the weather thins out while frames stay slow, and ignores a pause', () => {
    const w = startRain();
    const full = w.activeCount();
    let t = 1000;
    for (let i = 0; i < 60; i++) w.watchFrameRate(t += 16.7); // a healthy 60 fps changes nothing
    assert.equal(w.densityStep, 0);
    assert.equal(w.activeCount(), full);

    for (let i = 0; i < 400; i++) w.watchFrameRate(t += 50); // 20 fps
    assert.equal(w.densityStep, w.DENSITY_STEPS.length - 1, 'it never goes below the thinnest step');
    assert.ok(w.activeCount() < full * 0.4);

    const w2 = startRain();
    w2.watchFrameRate(1000);
    w2.watchFrameRate(61000); // the tab sat in the background for a minute
    for (let i = 0; i < 60; i++) w2.watchFrameRate(61000 + (i + 1) * 16.7);
    assert.equal(w2.densityStep, 0, 'a long pause is not slow weather');
});

test('a new weather starts at full density again', () => {
    const w = startRain();
    w.densityStep = 2;
    w.initParticles('particle_rain');
    assert.equal(w.densityStep, 0);
    assert.equal(w.activeCount(), w.particles.length);
});

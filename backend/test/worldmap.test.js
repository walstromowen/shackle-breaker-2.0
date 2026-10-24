// backend/test/worldmap.test.js: `npm test`. The world map: what has been seen is remembered (and saved), what has not is never on it, and the screen pans and zooms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const noop = () => {};
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: () => noop, set: () => true }); } };

const { ExploredMap, BLOCK, EXPLORE_HALF } = await import('../../shared/world/exploredMap.js');
const { TIPS } = await import('../../frontend/src/ui/tutorialData.js');
const { WorldMapController, ZOOM_LEVELS, VIEW } = await import('../../frontend/src/screens/worldMap/worldMapController.js');

const fresh = () => ExploredMap.of({ discoveredChunks: [] });

test('walking reveals an ellipse of blocks round the player and nothing else', () => {
    const m = fresh();
    assert.equal(m.count(), 0);
    assert.equal(m.bounds(), null);
    assert.equal(m.reveal(0, 0), true);
    assert.equal(m.reveal(0, 0), false, 'the same spot shows nothing new');
    assert.ok(m.has(0, 0));
    assert.ok(m.has(EXPLORE_HALF.w - 4, 0), 'along the width of the view');
    assert.ok(!m.has(EXPLORE_HALF.w + BLOCK + 2, 0), 'not beyond it');
    assert.ok(!m.has(0, EXPLORE_HALF.h + BLOCK + 2));
    assert.ok(!m.has(EXPLORE_HALF.w - 1, EXPLORE_HALF.h - 1), 'a corner of the view is outside the ellipse');
    assert.ok(!m.has(500, 500) && !m.has(-500, -500));
});

test('negative coordinates, region borders and saves: what was seen comes back from the saved list', () => {
    const world = { discoveredChunks: [] };
    const m = ExploredMap.of(world);
    m.reveal(-70, -3);
    m.reveal(63, 64);
    m.reveal(-1, -1);
    assert.ok(world.discoveredChunks.length >= 4, 'one short string a region');
    assert.ok(world.discoveredChunks.every(e => /^-?\d+,-?\d+,[0-9a-f]{64}$/.test(e)));
    const loaded = JSON.parse(JSON.stringify(world));              // what a save file holds
    const back = ExploredMap.of(loaded);
    assert.equal(back.count(), m.count());
    for (const [c, r] of [[-70, -3], [63, 64], [-1, -1], [0, 0]]) assert.equal(back.has(c, r), m.has(c, r));
    assert.ok(!back.has(1000, 1000));
    assert.deepEqual(back.bounds(), m.bounds());
    assert.ok(m.version > 0);
    // a damaged entry is ignored rather than breaking the map
    assert.doesNotThrow(() => ExploredMap.of({ discoveredChunks: ['nonsense', 5, null, '1,2'] }));
});

test('the game state carries it: saving copies discoveredChunks and it is empty in a new game', async () => {
    const { gameState } = await import('../../shared/core/gameState.js');
    assert.ok(Array.isArray(gameState.world.discoveredChunks));
    const src = fs.readFileSync(new URL('../../frontend/src/engine/saveManager.js', import.meta.url), 'utf8');
    assert.match(src, /discoveredChunks: clone\(world\.discoveredChunks/);
    assert.match(src, /discoveredChunks: data\.world\.discoveredChunks/);
    const scene = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    assert.match(scene, /gameState\.world\.discoveredChunks = \[\]/, 'a new game starts unexplored');
});

test('the map is a screen of its own: a menu button and key on the overworld, a scene, a back button and a tutorial card', () => {
    const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
    const ow = read('../../frontend/src/screens/overworld/overworldController.js');
    assert.match(ow, /id: 'btn_map'/);
    assert.match(ow, /map: 'KeyN'/);
    assert.match(ow, /scene: sceneName|executeMenuAction\('world_map'/);
    const sm = read('../../frontend/src/engine/sceneManager.js');
    assert.match(sm, /world_map: null/, 'it gets the standard Back button');
    assert.match(sm, /case 'world_map': return this\.worldMapController/);
    assert.match(sm, /case 'world_map': return this\.worldMapRenderer/);
    assert.ok(TIPS.world_map && TIPS.world_map.rows.length >= 4 && TIPS.world_map.rows.length <= 7, 'a control card, 4 to 7 rows');
    assert.ok(TIPS.overworld.rows.some(r => r.keys.includes('N')), 'the overworld card names the key');
});

function makeController(held = []) {
    const input = { heldKeys: new Set(held) };
    const c = new WorldMapController(input);
    const world = { discoveredChunks: [] };
    const m = ExploredMap.of(world);
    for (let x = -200; x <= 500; x += 20) m.reveal(x, 50);       // a long walk, so panning is not stopped by the edge
    c.explored = m;
    c.player = { x: 100.5, y: 50.5, direction: 'up' };
    c.centerOnParty();
    return { c, input, m };
}

test('arrow keys pan the same screen distance at any zoom, and the middle cannot wander far from the seen land', () => {
    const { c, input, m } = makeController(['ArrowRight']);
    const x0 = c.cx;
    c.update(0.5);
    assert.ok(Math.abs((c.cx - x0) * c.scale - 320) < 1, `half a second is 320 screen pixels (${(c.cx - x0) * c.scale})`);
    input.heldKeys.clear(); input.heldKeys.add('ArrowDown');
    const y0 = c.cy;
    c.update(0.25);
    assert.ok(c.cy > y0);
    input.heldKeys.clear(); input.heldKeys.add('ArrowLeft');
    for (let i = 0; i < 400; i++) c.update(0.1);
    assert.ok(c.cx >= m.bounds().minCol - 24 - 1e-6, `clamped near the seen land (${c.cx})`);
    assert.ok(c.cx < m.bounds().minCol, 'it did reach the edge');
});

test('zoom steps through the levels, keeps the point under the pointer still, and stops at both ends', () => {
    const { c } = makeController();
    const anchor = { x: VIEW.x + 300, y: VIEW.y + 200 };
    const before = c.tileAt(anchor.x, anchor.y);
    assert.equal(c.zoomStep(1, anchor), true);
    for (let i = 0; i < 120; i++) c.update(1 / 60);
    assert.equal(c.scale, ZOOM_LEVELS[ZOOM_LEVELS.indexOf(4) + 1]);
    const after = c.tileAt(anchor.x, anchor.y);
    assert.ok(Math.abs(after.col - before.col) < 0.5 && Math.abs(after.row - before.row) < 0.5, 'the tile under the pointer stayed put');
    for (let i = 0; i < 20; i++) c.zoomStep(1);
    assert.equal(c.targetScale, ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
    assert.equal(c.zoomStep(1), false);
    for (let i = 0; i < 20; i++) c.zoomStep(-1);
    assert.equal(c.targetScale, ZOOM_LEVELS[0]);
    assert.equal(c.zoomStep(-1), false);
});

test('Fit puts everything seen in the window; Center goes back to the party', () => {
    const { c, m } = makeController();
    m.reveal(400, 300); m.reveal(-200, -100);
    c.fit();
    const b = m.bounds();
    assert.ok(c.targetScale <= Math.min(VIEW.w / (b.maxCol - b.minCol), VIEW.h / (b.maxRow - b.minRow)) + 1e-6, 'it all fits');
    c.scale = c.targetScale;
    assert.ok(Math.abs(c.cx - (b.minCol + b.maxCol + 1) / 2) < 1);
    c.centerOnParty();
    assert.equal(c.cx, 100.5);
    assert.equal(c.cy, 50.5);
});

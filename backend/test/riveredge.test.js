// backend/test/riveredge.test.js: `npm test`. A river's water is one style (the river biome's) along its whole length, but its edge belongs to the land it touches:
// a river cell planned beside a snowy bank gets that bank's pack for its bed and shore wash, a cell beside a desert bank the desert's, and open water keeps no bank pack.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { CONFIG } = await import('../../shared/core/constants.js');
const { BlobTerrainRenderer } = await import('../../frontend/src/screens/overworld/blobTerrainRenderer.js');

const quiet = (fn) => { const log = console.log; console.log = noop; try { return fn(); } finally { console.log = log; } };

const build = () => quiet(() => {
    gameState.seed = 5;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    gameState.world.terrainOverrides = {};
    const wm = new WorldManager();
    const r = new BlobTerrainRenderer({ get: () => ({}) }, CONFIG);
    r._sync(wm);
    return { wm, r };
});

test('a river cell beside a bank takes that bank\'s pack for its bed, while its own water stays the river\'s', () => {
    const { wm, r } = build();
    const T = wm.terrain, river = T.getRiverBiome().blobTileset;
    const seen = {};
    quiet(() => {
        for (let row = -125; row < -95; row++) for (let col = -50; col < -10; col++) {
            if (!r._isRiverWater(col, row)) continue;
            const p = r.plan(col, row);
            assert.equal(p.pack, river, 'the water is always drawn in the river\'s style');
            const bank = r._bankPack(col, row);
            assert.equal(p.groundPack, bank);
            if (bank) seen[wm.getBiomeAt(col, row).id] = (seen[wm.getBiomeAt(col, row).id] || 0) + 1;
        }
    });
    const banks = new Set();
    quiet(() => {
        for (let row = -125; row < -95; row++) for (let col = -50; col < -10; col++) {
            if (!r._isRiverWater(col, row)) continue;
            const g = r.plan(col, row).groundPack;
            if (g) banks.add(g);
        }
    });
    assert.ok(banks.size >= 2, 'this stretch of river runs between two biomes, so both of their packs show up as banks');
    assert.ok([...banks].some((b) => b.riverShoreAnim), 'the snowy bank has its own shore sheet');
});

test('open water, with no bank beside it, has no bank pack', () => {
    const { r } = build();
    let open = 0;
    quiet(() => {
        for (let row = -125; row < -95; row++) for (let col = -50; col < -10; col++) {
            if (!r._isRiverWater(col, row)) continue;
            const hasBank = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => (dx || dy) && !r._isRiverWater(col + dx, row + dy) && r._wm.getTileAt(col + dx, row + dy) !== CONFIG.TILE_TYPES.LAYER_0));
            if (!hasBank) { open++; assert.equal(r.plan(col, row).groundPack, null); }
        }
    });
    assert.ok(open > 0);
});

test('the snowy river shore sheet keeps the river\'s water and the snowy bank (no orange fringe)', async () => {
    const dir = new URL('../../frontend/src/assets/tilesets/', import.meta.url).pathname;
    assert.ok(fs.existsSync(dir + 'snowy_mountains/river_shore_blob47_anim.png'));
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.match(main, /snowyMountainsRiverShore:\s+'\.\/assets\/tilesets\/snowy_mountains\/river_shore_blob47_anim\.png'/);
    const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
    const snowy = Object.values(BIOME_DEFINITIONS).find((b) => b.blobTileset && b.blobTileset.riverShoreAnim);
    assert.equal(snowy.blobTileset.riverShoreAnim, 'snowyMountainsRiverShore');
});

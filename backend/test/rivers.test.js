// backend/test/rivers.test.js: `npm test`. Where two biomes meet, some stretches of the border are a river instead of a strip of dirt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerrainGenerator } from '../../shared/world/terrainGenerator.js';
import { gameState } from '../../shared/core/gameState.js';

gameState.world.terrainOverrides = {};
const SEEDS = [12345, 777, 4242];
const R = 500, STEP = 3;

/* every sampled cell with another biome within 4 cells */
function borderCells(g) {
    const out = [];
    for (let r = -R; r < R; r += STEP) for (let c = -R; c < R; c += STEP) {
        const b = g.getBiomeAt(c, r);
        if ([[4, 0], [0, 4], [-4, 0], [0, -4]].some(([dc, dr]) => g.getBiomeAt(c + dc, r + dr) !== b)) out.push([c, r]);
    }
    return out;
}

test('a fifth or so of the border is river: occasional, not everywhere and not nowhere', () => {
    for (const seed of SEEDS) {
        const g = new TerrainGenerator(seed);
        const cells = borderCells(g);
        assert.ok(cells.length > 2000, 'there are borders to look at');
        const water = cells.filter(([c, r]) => g.getTileAt(c, r) === g.TILES.LAYER_0).length / cells.length;
        assert.ok(water > 0.05 && water < 0.4, `seed ${seed}: ${(water * 100).toFixed(1)}% of the border is water`);
    }
});

test('river cells are water, and only cells at a border can be river', () => {
    const g = new TerrainGenerator(12345);
    let rivers = 0;
    for (const [c, r] of borderCells(g)) if (g.isRiverCell(c, r)) { rivers++; assert.equal(g.getTileAt(c, r), g.TILES.LAYER_0); }
    assert.ok(rivers > 100, 'rivers exist');
    // far from any border there is no river
    for (let i = 0; i < 400; i++) {
        const c = -R + (i * 37) % (2 * R), r = -R + (i * 91) % (2 * R);
        const b = g.getBiomeAt(c, r);
        const interior = [[10, 0], [0, 10], [-10, 0], [0, -10], [10, 10], [-10, -10]].every(([dc, dr]) => g.getBiomeAt(c + dc, r + dr) === b);
        if (interior) assert.equal(g.isRiverCell(c, r), false);
    }
});

test('the river is at most 6 cells wide, and its banks are dry', () => {
    const g = new TerrainGenerator(777);
    let banks = 0;
    for (const [c, r] of borderCells(g)) {
        const half = g.getRiverHalfWidth(c, r);
        assert.ok(half >= 0 && half <= 3);
        // a cell of a river stretch that is not part of the water itself is never water (no lake of the biome touches the river's banks)
        if (half > 0 && !g.isRiverCell(c, r)) { banks++; assert.notEqual(g.getTileAt(c, r), g.TILES.LAYER_0, `bank at ${c},${r}`); }
    }
    assert.ok(banks > 100);
});

test('fords: where the ford field is high the river is left out, so it can be crossed', () => {
    const g = new TerrainGenerator(12345);
    let fords = 0, fordWater = 0, strongRiverNoise = 0;
    for (const [c, r] of borderCells(g)) {
        const m = g.riverNoise.get(c * g.RIVER_FREQ + g.offsetX, r * g.RIVER_FREQ + g.offsetY);
        if (m < g.RIVER_THRESHOLD) continue;
        strongRiverNoise++;
        if (g.getRiverHalfWidth(c, r) === 0) {
            fords++;
            assert.equal(g.isRiverCell(c, r), false);
            if (g.getTileAt(c, r) === g.TILES.LAYER_0) fordWater++; // only an ordinary lake of the biome can still be there
        }
    }
    assert.ok(strongRiverNoise > 100);
    assert.ok(fords > 20, 'there are fords along the rivers');
    assert.ok(fordWater < fords * 0.5, `most of a ford is dry (${fordWater} of ${fords} are water)`);
});

test('the terrain is the same every time for one seed', () => {
    const a = new TerrainGenerator(4242), b = new TerrainGenerator(4242);
    for (let i = 0; i < 300; i++) {
        const c = -500 + (i * 53) % 1000, r = -500 + (i * 97) % 1000;
        assert.equal(a.getTileAt(c, r), b.getTileAt(c, r));
        assert.equal(a.isRiverCell(c, r), b.isRiverCell(c, r));
    }
});

// backend/test/biomeblend.test.js: `npm test`. Where two biomes' ground meets, the edge is wavy like a dirt patch's edge inside a biome, not a straight
// cut along the cells. It is worked out from the tilesets alone, so a new biome with a blobTileset blends with every other without any extra work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlobTerrainRenderer } from '../../frontend/src/screens/overworld/blobTerrainRenderer.js';
import { CONFIG } from '../../shared/core/constants.js';

const pack = (name, extra = {}) => ({ primaryFloor: `${name}Primary`, secondaryFloor: `${name}Secondary`, ...extra });
// a world of dirt split down column 0: biome A to the west, biome B from column 0 east
const world = (A, B) => ({
    getTileAt: () => CONFIG.TILE_TYPES.LAYER_1,
    getBiomeAt: (c) => ({ blobTileset: c < 0 ? A : B }),
    terrain: { isRiverCell: () => false },
});
const renderer = (wm) => { const r = new BlobTerrainRenderer({ get: () => null }, CONFIG); r._wm = wm; return r; };

test('only one side of a border blends: the lower-ranked biome lays the other one under its edge cells', () => {
    const A = pack('a'), B = pack('b');          // 'bPrimary' > 'aPrimary': B outranks A, so A's edge cells blend
    const r = renderer(world(A, B));
    const west = r.plan(-1, 5), east = r.plan(0, 5), inland = r.plan(-3, 5);
    assert.ok(west.blend, 'the A cell beside the border blends');
    assert.equal(west.blend.under, B, 'with B underneath');
    assert.deepEqual(west.blend.underOp.slice(0, 1), [1], 'B is dirt there, so its dirt goes under');
    assert.ok(!east.blend, 'the B side stays as it is (no double edge)');
    assert.ok(!inland.blend, 'cells away from the border are untouched');
});

test('blendPriority picks which ground spreads over the line', () => {
    const A = pack('a', { blendPriority: 5 }), B = pack('b');
    const r = renderer(world(A, B));
    assert.ok(!r.plan(-1, 5).blend);
    assert.equal(r.plan(0, 5).blend.under, A);
});

test('interiors (packs without water) never blend', () => {
    const A = pack('a', { water: false }), B = pack('b', { water: false });
    const r = renderer(world(A, B));
    assert.ok(!r.plan(-1, 5).blend);
    assert.ok(!r.plan(0, 5).blend);
});

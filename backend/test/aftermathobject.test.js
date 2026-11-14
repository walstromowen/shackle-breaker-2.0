// backend/test/aftermathobject.test.js: `npm test`. The Aftermath is a battlefield on the plains: the helmet with a sword through it at the heart of a
// small landmark strewn with the dead, which starts the encounter when the party comes near and is gone once it is over; and every random encounter but
// the cave-in is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (s) => ({ width: String(s).length * 10 }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

import fs from 'node:fs';
const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');
const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { CONFIG } = await import('../../shared/core/constants.js');
const root = new URL('../../', import.meta.url);

test('AFTERMATH_REMAINS starts the Aftermath when the party comes within 3 tiles, drawn from a registered 32 x 32 picture, and is gone once it is over', () => {
    const o = MAP_OBJECTS_DEFINITIONS.AFTERMATH_REMAINS;
    assert.ok(o);
    assert.deepEqual(o.interaction, { type: 'ENCOUNTER', id: 'aftermath', triggerRadius: 3 });
    assert.ok(encounterDefinitions.aftermath, 'the encounter exists');
    assert.equal(encounterDefinitions.aftermath.consumesObject, true, 'it takes the remains with it, however it ends');
    const controller = fs.readFileSync(new URL('frontend/src/screens/encounter/encounterController.js', root), 'utf8');
    assert.match(controller, /def\.consumesObject && resultsArray\.some\(r => r\.type === 'END_ENCOUNTER' \|\| r\.type === 'START_BATTLE'\)/);
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    assert.match(main, /objAftermath: '\.\/assets\/mapObjects\/objAftermath\.png'/);
    const png = fs.readFileSync(new URL('frontend/src/assets/mapObjects/objAftermath.png', root));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [32, 32]);
});

test('the battlefield: the remains in the middle, 4 to 8 solid fallen soldiers around them with a walkable gap around each, and bones among them', async () => {
    const { STRUCTURES } = await import('../../shared/world/structures.js');
    gameState.seed = 4242;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    const wm = new WorldManager();
    let bonesSeen = 0;
    for (const [oc, or] of [[0, 0], [130, -40], [-77, 512]]) {
        const grid = wm._prefabObjects(oc, or, STRUCTURES.BATTLEFIELD);
        const N = grid.length, mid = Math.floor(N / 2);
        assert.equal(grid[mid][mid], 'AFTERMATH_REMAINS', 'the remains in the middle');
        const bodies = [];
        grid.forEach((row, r) => row.forEach((id, c) => { if (id && id.startsWith('FALLEN_SOLDIER_')) bodies.push({ c, r, id }); }));
        assert.ok(bodies.length >= 4 && bodies.length <= 8, `${bodies.length} bodies`);
        // every body blocks the 2 x 2 tiles its picture covers, and has a walkable ring around that footprint
        const fp = (b) => [[b.c, b.r], [b.c + 1, b.r], [b.c, b.r - 1], [b.c + 1, b.r - 1]];
        const solid = new Map([[`${mid},${mid}`, 'centre']]);
        for (const b of bodies) {
            const h = MAP_OBJECTS_DEFINITIONS[b.id].hitbox;
            assert.ok(MAP_OBJECTS_DEFINITIONS[b.id].isSolid && h && h.w === 2 && h.h === 2 && h.yOffset === -1, `${b.id} is solid over 2 x 2`);
            for (const [c, r] of fp(b)) { assert.ok(c < N && r >= 0, 'inside the box'); solid.set(`${c},${r}`, b); }
        }
        for (const b of bodies) for (const [c, r] of fp(b)) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const o = solid.get(`${c + dc},${r + dr}`);
            assert.ok(!o || o === b, `a walkable gap around ${b.id} at ${b.c},${b.r}`);
        }
        for (const [k] of solid) { const [c, r] = k.split(',').map(Number); if (k !== `${mid},${mid}`) assert.notEqual(grid[r][c] === 'BONE_PILE', true, 'no bones under a body'); }
        const bones = grid.flat().filter(id => id === 'BONE_PILE').length;
        assert.ok(bones >= 2, `${bones} bone piles`);
        bonesSeen += bones;
    }
    assert.ok(bonesSeen > 0, `bones lie among the dead (${bonesSeen})`);
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    for (let i = 1; i <= 15; i++) {
        assert.ok(MAP_OBJECTS_DEFINITIONS[`FALLEN_SOLDIER_${i}`] && MAP_OBJECTS_DEFINITIONS[`FALLEN_SOLDIER_${i}`].isSolid === true, `FALLEN_SOLDIER_${i} cannot be walked through`);
        assert.ok(fs.existsSync(new URL(`frontend/src/assets/mapObjects/fallen_soldiers/objFallenSoldier${i}.png`, root)) && main.includes(`objFallenSoldier${i}:`));
    }
});

test('the plains have battlefields as landmarks (half of them, beside the graveyards), and no single remains in the grass any more', () => {
    const rules = BIOME_DEFINITIONS.PLAINS.mapObjects[CONFIG.TILE_TYPES.LAYER_2];
    assert.ok(!rules.some(r => r.id === 'AFTERMATH_REMAINS'), 'no remains scattered on their own');
    const pools = BIOME_DEFINITIONS.PLAINS.landmarks.pools.map(p => p.id);
    assert.deepEqual(pools.sort(), ['BATTLEFIELD', 'GRAVEYARD']);
    for (const [id, def] of Object.entries(BIOME_DEFINITIONS)) if (id !== 'PLAINS') assert.ok(!((def.landmarks && def.landmarks.pools) || []).some(p => p.id === 'BATTLEFIELD'), `${id} has none`);
});

test('a waypoint can be found on the battlefield', async () => {
    const { LootTableDefinitions } = await import('../../shared/items/lootTableDefinitions.js');
    assert.ok(LootTableDefinitions.battlefield_loot.items.some(i => i.id === 'waypoint'));
});

test('only the caves (the cave-in) and the desert (its hazards: quicksand, the cyclone) still roll a random encounter; the plains keep their rate for the Shackling alone', () => {
    for (const [id, def] of Object.entries(BIOME_DEFINITIONS)) {
        const ids = ((def.encounters && def.encounters.pools) || []).map(p => p.id);
        assert.deepEqual(ids, id === 'CAVE_INTERIOR' ? ['cave_in'] : id === 'DESERT' ? ['quicksand', 'cyclone'] : [], id);
    }
    assert.ok(BIOME_DEFINITIONS.PLAINS.encounters.rate > 0, 'the Shackling needs the rate');
});

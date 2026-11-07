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

test('the battlefield: the remains in the middle, 5 to 8 fallen soldiers around them (none touching the centre or each other), and bones among them', async () => {
    const { STRUCTURES } = await import('../../shared/world/structures.js');
    gameState.seed = 4242;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    const wm = new WorldManager();
    let bonesSeen = 0;
    for (const [oc, or] of [[0, 0], [130, -40], [-77, 512]]) {
        const grid = wm._prefabObjects(oc, or, STRUCTURES.BATTLEFIELD);
        assert.equal(grid[3][3], 'AFTERMATH_REMAINS', 'the remains are in the middle');
        const bodies = [];
        grid.forEach((row, r) => row.forEach((id, c) => { if (id && id.startsWith('FALLEN_SOLDIER_')) bodies.push({ c, r }); }));
        assert.ok(bodies.length >= 5 && bodies.length <= 8, `${bodies.length} bodies`);
        const bones = grid.flat().filter(id => id === 'BONE_PILE').length;
        assert.ok(bones >= 2, `${bones} bone piles`);
        bonesSeen += bones;
        for (const b of bodies) {
            assert.ok(Math.abs(b.c - 3) > 1 || Math.abs(b.r - 3) > 1, 'not beside the remains');
            for (const o of bodies) if (o !== b) assert.ok(Math.abs(o.c - b.c) > 1 || Math.abs(o.r - b.r) > 1, 'bodies do not touch');
        }
    }
    assert.ok(bonesSeen > 0, `bones lie among the dead (${bonesSeen})`);
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    for (let i = 1; i <= 15; i++) {
        assert.ok(MAP_OBJECTS_DEFINITIONS[`FALLEN_SOLDIER_${i}`] && MAP_OBJECTS_DEFINITIONS[`FALLEN_SOLDIER_${i}`].isSolid === false, `FALLEN_SOLDIER_${i} is walked over`);
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

test('only the caves still roll a random encounter (the cave-in); the plains keep their rate for the Shackling alone', () => {
    for (const [id, def] of Object.entries(BIOME_DEFINITIONS)) {
        const ids = ((def.encounters && def.encounters.pools) || []).map(p => p.id);
        assert.deepEqual(ids, id === 'CAVE_INTERIOR' ? ['cave_in'] : [], id);
    }
    assert.ok(BIOME_DEFINITIONS.PLAINS.encounters.rate > 0, 'the Shackling needs the rate');
});

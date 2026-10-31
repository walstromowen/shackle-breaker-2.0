// backend/test/structureplacement.test.js: `npm test`. Villages and graveyards land where they belong: never on water or a cliff face, never under
// one, every biome-specific object in its own biome; a reload (a loaded save, leaving a house) never builds a chunk's structure a second time; and
// a New Game starts from an empty world instead of laying the last game's structures over the new terrain.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { gameState, resetWorldForNewGame } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');

const quiet = (fn) => { const log = console.log; console.log = noop; try { return fn(); } finally { console.log = log; } };
const REACH = 4;   // chunks either side of the origin

const freshWorld = (seed) => {
    gameState.seed = seed;
    resetWorldForNewGame();
};
const spawnAll = (wm) => { for (let cy = -REACH; cy <= REACH; cy++) for (let cx = -REACH; cx <= REACH; cx++) wm._ensureStructuresSpawned(cx, cy); };
/* how many villages and graveyards a world manager builds */
const counting = (wm) => {
    let n = 0;
    const plan = wm._planBlueprint.bind(wm);
    wm._planBlueprint = (...a) => { n++; plan(...a); };
    const write = wm._writePrefabToGlobalState.bind(wm);
    wm._writePrefabToGlobalState = (c, r, p) => { if (p.graveyard) n++; write(c, r, p); };
    return () => n;
};

// objects that only belong in one biome
const HOME = {};
for (const id of ['PINE_TREE', 'OAK_TREE_1', 'TREE_STUMP', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3', 'TULIPS_WHITE', 'TULIPS_RED']) HOME[id] = 'PLAINS';
for (const id of ['SMALL_CACTUS_1', 'MEDIUM_CACTUS_1', 'SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3', 'DESERT_SKULL']) HOME[id] = 'DESERT';
for (const id of ['SNOWY_PINE_TREE', 'SNOWY_TREE_STUMP', 'SNOWY_BOULDER_1', 'SNOWY_BOULDER_2']) HOME[id] = 'SNOWY_MOUNTAINS';

test('villages and graveyards stay off water and cliff faces, and dress each biome in its own things', () => {
    let structures = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
        const bad = quiet(() => {
            freshWorld(seed);
            const wm = new WorldManager();
            const count = counting(wm);
            spawnAll(wm);
            structures += count();
            const L0 = wm.TILES.LAYER_0;
            const out = [];
            for (const [key, id] of Object.entries(gameState.world.changes)) {
                if (!id) continue;
                const [c, r] = key.split(',').map(Number);
                if (wm.getTileAt(c, r) === L0) out.push(`${id} on water at ${key}`);
                else if (wm.isCliffFace(c, r)) out.push(`${id} on a cliff face at ${key}`);
                else if (wm.isBlockedByFace(c, r)) out.push(`${id} under a cliff face at ${key}`);
                const biome = wm.getBiomeAt(c, r).id;
                if (HOME[id] && HOME[id] !== biome) out.push(`${id} (a ${HOME[id]} object) in ${biome} at ${key}`);
            }
            return out;
        });
        assert.deepEqual(bad.slice(0, 5), [], `seed ${seed}: ${bad.length} misplaced objects`);
    }
    assert.ok(structures >= 15, `the stricter rules still leave plenty of structures (${structures} in five worlds)`);
});

test('a reload builds no second copy of a chunk\'s structure, and the record is kept with the world', () => {
    for (const seed of [6, 7, 8]) {
        const [first, again] = quiet(() => {
            freshWorld(seed);
            const a = new WorldManager();
            const na = counting(a);
            spawnAll(a);
            const b = new WorldManager();   // what loading the save or leaving a house does
            const nb = counting(b);
            spawnAll(b);
            return [na(), nb()];
        });
        assert.ok(first > 0, `seed ${seed} has structures to test with`);
        assert.equal(again, 0, `seed ${seed}: ${again} structures were built again after a reload`);
        assert.equal(gameState.world.structureChunks.seed, seed);
        assert.ok(Object.keys(gameState.world.structureChunks.chunks).length >= (2 * REACH + 1) ** 2);
    }
});

test('a save from before the record does not get its structures built again', () => {
    const again = quiet(() => {
        freshWorld(6);
        spawnAll(new WorldManager());
        delete gameState.world.structureChunks;   // the save has the world's changes but no record
        const b = new WorldManager();
        const nb = counting(b);
        spawnAll(b);
        return nb();
    });
    assert.equal(again, 0);
});

test('a New Game starts from an empty world: nothing of the last game is laid over the new terrain', () => {
    quiet(() => {
        freshWorld(9);
        const wm = new WorldManager();
        spawnAll(wm);
        gameState.world.isInterior = true;
        gameState.quests.active.someQuest = {};
    });
    assert.ok(Object.keys(gameState.world.changes).length > 0, 'the first world wrote something');
    gameState.seed = 10;
    resetWorldForNewGame();
    const w = gameState.world;
    assert.deepEqual([w.changes, w.terrainOverrides, w.levelPaths, w.structureChunks], [{}, {}, {}, {}]);
    assert.deepEqual([w.villageStairs, w.waypoints, w.discoveredChunks], [[], [], []]);
    assert.equal(w.isInterior, false);
    assert.deepEqual(gameState.quests, { active: {}, completed: [], trackedIds: [] });
});

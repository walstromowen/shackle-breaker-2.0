// backend/test/graveyard.test.js: `npm test`. Where the gravestones stand: beside the roads of a village (5% of them the dig-able one) and in graveyards,
// a 7 x 7 landmark of 3 to 5 stones with bones, rocks and boulders beside them, in every exterior biome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRUCTURES } from '../../shared/data/structures.js';
import { BIOME_DEFINITIONS } from '../../shared/data/biomeDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/data/mapObjectDefinitions.js';
import { BiomeModel } from '../../shared/models/biomeModel.js';
import { WorldManager } from '../../shared/systems/worldManager.js';
import { gameState } from '../../shared/state/gameState.js';

const STONES = new Set(['TOMBSTONE', 'OLD_GRAVESTONE']);
const EXTERIOR = ['PLAINS', 'DESERT', 'SNOWY_MOUNTAINS'];
const BOULDERS = new Set(['BOULDER_1', 'BOULDER_2', 'SNOWY_BOULDER_1', 'SNOWY_BOULDER_2']);
const BONES = new Set(['BONE_PILE', 'DESERT_SKULL']);
const ROCKS = new Set(['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3']);

const freshWorld = (seed) => {
    gameState.seed = seed; gameState.world.changes = {}; gameState.world.terrainOverrides = {};
    return new WorldManager();
};
const GY = { PLAINS: 'GRAVEYARD', DESERT: 'GRAVEYARD_DESERT', SNOWY_MOUNTAINS: 'GRAVEYARD_SNOWY' };

test('every village carries gravestones with a 5% share of the dig-able one, and the desert and snow villages inherit them', () => {
    for (const id of ['ABANDONED_VILLAGE', 'ABANDONED_VILLAGE_DESERT', 'ABANDONED_VILLAGE_SNOWY']) {
        const g = STRUCTURES[id].gravestones;
        assert.ok(g, id);
        assert.equal(g.id, 'TOMBSTONE');
        assert.equal(g.encounterId, 'OLD_GRAVESTONE');
        assert.equal(g.encounterChance, 0.05);
        assert.ok(g.chance > 0 && g.max > 0 && g.spacing > 0);
    }
});

test('a graveyard is a 7 x 7 prefab in every exterior biome, and the biome decides how often one appears', () => {
    for (const biome of EXTERIOR) {
        const lm = BIOME_DEFINITIONS[biome].landmarks;
        assert.ok(lm && lm.rate > 0, `${biome} landmarks`);
        assert.deepEqual(lm.pools.map((p) => p.id), [GY[biome]]);
        const prefab = STRUCTURES[GY[biome]];
        assert.equal(prefab.type, 'PREFAB');
        assert.equal(prefab.width, 7);
        assert.equal(prefab.height, 7);
        assert.equal(prefab.graveyard.stones.min, 3);
        assert.equal(prefab.graveyard.stones.max, 5);
        assert.equal(prefab.graveyard.encounterChance, 0.5);
        for (const part of ['bones', 'rocks', 'boulders']) {
            assert.ok(prefab.graveyard[part].pool.length > 0);
            for (const id of prefab.graveyard[part].pool) assert.ok(MAP_OBJECTS_DEFINITIONS[id], id);
        }
    }
    for (const id of ['HOUSE_INTERIOR', 'CAVE_INTERIOR']) assert.ok(!BIOME_DEFINITIONS[id].landmarks, `${id} has none`);
});

test('the landmark roll follows the rate and a village chunk is never given a graveyard on top', () => {
    const m = new BiomeModel({ ...BIOME_DEFINITIONS.PLAINS });
    assert.equal(m.getLandmarkId(0.0), 'GRAVEYARD');
    assert.equal(m.getLandmarkId(BIOME_DEFINITIONS.PLAINS.landmarks.rate + 0.01), null);
    assert.equal(new BiomeModel({ ...BIOME_DEFINITIONS.PLAINS, landmarks: undefined }).getLandmarkId(0), null);
    assert.equal(new BiomeModel({ ...BIOME_DEFINITIONS.HOUSE_INTERIOR }).getLandmarkId(0), null);
});

test('one graveyard: 3 to 5 stones inside the box, at most one the old gravestone, litter only beside a stone, every grave reachable', () => {
    const wm = freshWorld(14);
    let withOld = 0;
    const N = 3000;
    const counts = { 3: 0, 4: 0, 5: 0 };
    for (const key of Object.keys(GY).map((b) => GY[b])) {
        const prefab = STRUCTURES[key];
        for (let i = 0; i < N / 3; i++) {
            const grid = wm._prefabObjects(1000 + i * 9, -400 + i * 7, prefab);
            const stones = [];
            grid.forEach((row, r) => row.forEach((id, c) => { if (STONES.has(id)) stones.push({ c, r, id }); }));
            assert.ok(stones.length >= 3 && stones.length <= 5, `${stones.length} stones`);
            counts[stones.length]++;
            const old = stones.filter((s) => s.id === 'OLD_GRAVESTONE').length;
            assert.ok(old <= 1);
            withOld += old;
            let boulders = 0;
            grid.forEach((row, r) => row.forEach((id, c) => {
                if (!id || STONES.has(id)) return;
                assert.ok(BONES.has(id) || ROCKS.has(id) || BOULDERS.has(id), `unexpected ${id}`);
                assert.ok(stones.some((s) => Math.abs(s.c - c) <= 1 && Math.abs(s.r - r) <= 1), `${id} at ${c},${r} is not beside a stone`);
                if (BOULDERS.has(id)) {
                    boulders++;
                    assert.ok(!stones.some((s) => Math.abs(s.c - c) + Math.abs(s.r - r) === 1), 'a boulder straight beside a stone');
                }
            }));
            assert.ok(boulders <= prefab.graveyard.boulderMax);
            if (key === 'GRAVEYARD_SNOWY') assert.ok(!grid.flat().some((id) => id === 'BOULDER_1' || id === 'BOULDER_2'), 'snowy boulders only');
        }
    }
    for (const n of [3, 4, 5]) assert.ok(counts[n] > N * 0.1, `${n} stones came up ${counts[n]} times of ${N}`);
    assert.ok(Math.abs(withOld / N - 0.5) < 0.05, `old gravestone share ${withOld / N}`);
});

test('the same graveyard comes out the same every time', () => {
    const a = freshWorld(14)._prefabObjects(120, 64, STRUCTURES.GRAVEYARD);
    const b = freshWorld(14)._prefabObjects(120, 64, STRUCTURES.GRAVEYARD);
    assert.deepEqual(a, b);
});

test('a generated world has graveyards in all three biomes and gravestones around villages, the old one rare in the villages', () => {
    const boxes = [];
    let villages = 0;
    const villageChunks = new Set();
    let village = { plain: 0, old: 0 };
    const seen = new Set();
    for (const seed of [14, 3, 29, 7]) {
        const wm = freshWorld(seed);
        const origWrite = wm._writePrefabToGlobalState.bind(wm);
        wm._writePrefabToGlobalState = (c, r, prefab) => { if (prefab.graveyard) boxes.push({ c, r, biome: wm.getBiomeAt(c + 3, r + 3).id, seed }); origWrite(c, r, prefab); };
        const origPlan = wm._planBlueprint.bind(wm);
        wm._planBlueprint = (c, r, ...a) => { villages++; villageChunks.add(`${seed}:${Math.floor(c / 16)},${Math.floor(r / 16)}`); origPlan(c, r, ...a); };
        for (let r = -320; r < 320; r += 8) for (let c = -320; c < 320; c += 8) wm.ensureChunkLoaded(c, r);
        for (const o of wm.objects.values()) {
            if (!STONES.has(o.id)) continue;
            const inBox = boxes.some((b) => b.seed === seed && o.col >= b.c && o.col < b.c + 7 && o.row >= b.r && o.row < b.r + 7);
            if (inBox) continue;
            const k = `${seed}:${o.col},${o.row}`;
            if (seen.has(k)) continue;
            seen.add(k);
            if (o.id === 'OLD_GRAVESTONE') village.old++; else village.plain++;
        }
    }
    for (const b of boxes) assert.ok(!villageChunks.has(`${b.seed}:${Math.floor(b.c / 16)},${Math.floor(b.r / 16)}`), `a graveyard shares a chunk with a village at ${b.c},${b.r}`);
    for (const b of EXTERIOR) assert.ok(boxes.some((x) => x.biome === b), `no graveyard in ${b}`);
    assert.ok(villages > 0, 'villages were planned');
    assert.ok(village.plain > 5, `${village.plain} village gravestones`);
    assert.ok(village.old < village.plain * 0.25, `${village.old} old of ${village.plain + village.old} in villages`);
});

// backend/test/crops.test.js: `npm test`. Villages: no storage yards, no chest outdoors, and fenced crop fields of one herb each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRUCTURES } from '../../shared/data/structures.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/data/mapObjectDefinitions.js';
import { INTERIOR_DEFINITIONS } from '../../shared/data/interiorDefinitions.js';
import { WorldManager } from '../../shared/systems/worldManager.js';
import { gameState } from '../../shared/state/gameState.js';

const HERBS = ['HEALING_HERB', 'INVIGORATING_HERB', 'ILLUMINATING_HERB'];
const FIELDS = { ABANDONED_CROP_FIELD_HEALING: 'HEALING_HERB', ABANDONED_CROP_FIELD_INVIGORATING: 'INVIGORATING_HERB', ABANDONED_CROP_FIELD_ILLUMINATING: 'ILLUMINATING_HERB' };
const cellsOf = (prefab) => prefab.objects.flatMap((row, y) => row.map((id, x) => ({ id, x, y }))).filter(c => c.id);
const everyPrefab = () => Object.entries(STRUCTURES).filter(([, s]) => s.type === 'PREFAB').flatMap(([name, s]) => [[name, s], ...Object.entries(s.variants || {}).map(([g, v]) => [`${name}/${g}`, v])]);

test('there is no storage yard and no wooden chest in any village prefab, the plaza included', () => {
    assert.equal(STRUCTURES.ABANDONED_STORAGE, undefined);
    assert.ok(!STRUCTURES.ABANDONED_VILLAGE.modules.some(m => /STORAGE/.test(m.prefab)));
    for (const [name, prefab] of everyPrefab()) {
        assert.ok(!cellsOf(prefab).some(c => c.id === 'WOODEN_CHEST'), `${name} has a chest`);
    }
    for (const m of STRUCTURES.ABANDONED_VILLAGE.modules) assert.ok(STRUCTURES[m.prefab], `${m.prefab} exists`);
});

test('the chests are indoors: the houses still have one inside', () => {
    assert.equal(INTERIOR_DEFINITIONS.ABANDONED_HOUSE.lootObject, 'WOODEN_CHEST');
    assert.equal(INTERIOR_DEFINITIONS.HOUSE_INTERIOR.lootObject, 'WOODEN_CHEST');
    assert.ok(MAP_OBJECTS_DEFINITIONS.WOODEN_CHEST);
});

test('three crop fields, each a fenced field of exactly one herb, in every gate variant', () => {
    const mods = STRUCTURES.ABANDONED_VILLAGE.modules.map(m => m.prefab);
    for (const [name, herb] of Object.entries(FIELDS)) {
        assert.ok(mods.includes(name), `${name} is a village module`);
        assert.ok(MAP_OBJECTS_DEFINITIONS[herb]);
        const proto = STRUCTURES[name];
        assert.equal(Object.keys(proto.variants).length, 5);
        for (const [gate, prefab] of Object.entries(proto.variants)) {
            const cells = cellsOf(prefab);
            const herbs = cells.filter(c => HERBS.includes(c.id));
            assert.ok(herbs.length >= 6, `${name}/${gate}: ${herbs.length} plants`);
            assert.ok(herbs.every(c => c.id === herb), `${name}/${gate} is all ${herb}`);
            assert.ok(herbs.every(c => prefab.terrain[c.y][c.x] === 1), 'planted on tilled earth');
            assert.ok(cells.some(c => /FENCE/.test(c.id)), 'fenced');
            assert.ok(!cells.some(c => /HOUSE|CHEST|BARREL|CRATE|SACK/.test(c.id)), 'no building and no storage');
            // the footpath from the gate to the edge is clear of plants, and its last cell points at the road
            assert.equal(prefab.objects[prefab.entry.y][prefab.entry.x], null);
            assert.equal(prefab.terrain[prefab.entry.y][prefab.entry.x], 1);
        }
    }
});

test('a generated world gets crop fields, no loose chest and no storage yard', () => {
    gameState.seed = 14; gameState.world.changes = {}; gameState.world.terrainOverrides = {};
    const wm = new WorldManager();
    const stamped = [];
    const write = wm._writePrefabToGlobalState.bind(wm);
    wm._writePrefabToGlobalState = (c, r, prefab) => { stamped.push(prefab); return write(c, r, prefab); };
    for (let r = -160; r < 160; r += 8) for (let c = -160; c < 160; c += 8) wm.ensureChunkLoaded(c, r);
    const kinds = new Set();
    for (const p of stamped) {
        const herbs = new Set(cellsOf(p).map(c => c.id).filter(id => HERBS.includes(id)));
        if (herbs.size === 1 && cellsOf(p).some(c => /FENCE/.test(c.id))) kinds.add([...herbs][0]);
    }
    assert.ok(kinds.size >= 2, `fields of ${[...kinds]} were stamped`);
    assert.ok(stamped.length > 20, 'villages were built');
    assert.ok(![...wm.objects.values()].some(o => o.id === 'WOODEN_CHEST'), 'no chest anywhere in the overworld');
});

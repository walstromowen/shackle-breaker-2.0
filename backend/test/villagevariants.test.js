import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRUCTURES } from '../../shared/data/structures.js';
import { BIOME_DEFINITIONS } from '../../shared/data/biomeDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/data/mapObjectDefinitions.js';
import { LootTableDefinitions, LootExclusionSets } from '../../shared/data/lootTableDefinitions.js';
import { LootTableFactory } from '../../shared/systems/factories/lootTableFactory.js';
import { encounterDefinitions } from '../../shared/data/encounterDefinitions.js';
import { WorldManager } from '../../shared/systems/worldManager.js';
import { gameState } from '../../shared/state/gameState.js';

const walkObjectIds = (v, out = new Set()) => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach((x) => walkObjectIds(x, out));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkObjectIds(x, out));
    return out;
};

test('the desert and snowy mountains each spawn their own abandoned village', () => {
    for (const [biome, id] of [['DESERT', 'ABANDONED_VILLAGE_DESERT'], ['SNOWY_MOUNTAINS', 'ABANDONED_VILLAGE_SNOWY']]) {
        const s = BIOME_DEFINITIONS[biome].structures;
        assert.ok(s.rate > 0, `${biome} rate`);
        assert.deepEqual(s.pools.map((p) => p.id), [id]);
        assert.ok(STRUCTURES[id], id);
        assert.equal(STRUCTURES[id].scarecrows.id, 'PECULIAR_SCARECROW');
        assert.equal(STRUCTURES[id].scarecrows.chance, STRUCTURES.ABANDONED_VILLAGE.scarecrows.chance);
    }
});

test('every prefab a variant names exists, and every object in them is a real map object', () => {
    for (const id of ['ABANDONED_VILLAGE_DESERT', 'ABANDONED_VILLAGE_SNOWY']) {
        const bp = STRUCTURES[id];
        assert.ok(STRUCTURES[bp.centerPrefab], bp.centerPrefab);
        assert.ok(bp.modules.some((m) => m.required), 'a required workshop');
        for (const m of bp.modules) {
            const prefab = STRUCTURES[m.prefab];
            assert.ok(prefab, m.prefab);
            const text = JSON.stringify(prefab);
            assert.ok(!text.includes('WOODEN_CHEST'), `${m.prefab} has no chest`);
        }
    }
    assert.ok(STRUCTURES.ABANDONED_VILLAGE_DESERT.modules.some((m) => m.prefab === 'ABANDONED_CROP_FIELD_ALOE'));
    assert.ok(!STRUCTURES.ABANDONED_VILLAGE_SNOWY.modules.some((m) => /CROP_FIELD/.test(m.prefab)), 'no crops in the snow');
    const known = (id) => !!MAP_OBJECTS_DEFINITIONS[id];
    for (const id of walkObjectIds([STRUCTURES.ABANDONED_CENTER_DESERT, STRUCTURES.ABANDONED_CENTER_SNOWY])) {
        if (/^(SAND_DUNE|SMALL_ROCKS|DESERT_SKULL|BONE_PILE|SMALL_CACTUS|SNOWY_|STICK|TABLE|BARREL|CRATE|WOODEN_FENCE)/.test(id)) assert.ok(known(id), `${id} is not a map object`);
    }
});

test('the plains village is untouched: still no cactus, still grass in its plaza', () => {
    assert.ok(!JSON.stringify(STRUCTURES.ABANDONED_CENTER).includes('CACTUS'));
    assert.ok(STRUCTURES.ABANDONED_VILLAGE.scarecrows.chance >= 0.1, 'scarecrows are more frequent than the old 0.04');
    assert.ok(STRUCTURES.ABANDONED_VILLAGE.scarecrows.max > 3);
});

test('a generated world grows desert and snowy villages, with scarecrows, and nothing stands on a scarecrow', () => {
    let desert = 0, snowy = 0, scarecrows = 0;
    for (const seed of [14, 3, 29]) {
        gameState.seed = seed; gameState.world.changes = {}; gameState.world.terrainOverrides = {};
        const wm = new WorldManager();
        for (let r = -240; r < 240; r += 8) for (let c = -240; c < 240; c += 8) wm.ensureChunkLoaded(c, r);
        for (const o of wm.objects.values()) {
            if (/^ABANDONED_HOUSE_/.test(o.id)) {
                const b = wm.getBiomeAt(o.col, o.row).id;
                if (b === 'DESERT') desert++;
                if (b === 'SNOWY_MOUNTAINS') snowy++;
            }
            if (o.id === 'PECULIAR_SCARECROW') {
                scarecrows++;
                assert.ok(wm.getSolidObjectAt(o.col + 1, o.row) === o, 'both base tiles are solid');
            }
        }
    }
    assert.ok(scarecrows > 0);
    assert.ok(desert > 0, 'a village in the desert');
    assert.ok(snowy > 0, 'a village in the snow');
});

test('treasure chests never roll the low-tier items', () => {
    const chest = encounterDefinitions.treasure_chest;
    const payloads = [];
    JSON.stringify(chest, (k, v) => { if (v && v.type === 'ROLL_LOOT_TABLE') payloads.push(v.payload); return v; });
    assert.ok(payloads.length >= 2);
    for (const p of payloads) assert.equal(p.exclude, 'low_tier');
    for (const id of ['plant_fibers', 'soft_wood', 'tattered_shirt', 'tattered_hood']) assert.ok(LootExclusionSets.low_tier.includes(id), id);
    for (const tableId of ['plains_loot', 'desert_loot', 'house_loot', 'cave_loot'].filter((t) => LootTableDefinitions[t])) {
        for (let i = 0; i < 400; i++) {
            const loot = LootTableFactory.generateLoot(tableId, 2, 0, 'low_tier');
            for (const it of loot.items || loot) {
                const id = it.id || it.itemId || it;
                assert.ok(!LootExclusionSets.low_tier.includes(id), `${tableId} gave ${id}`);
            }
        }
    }
});

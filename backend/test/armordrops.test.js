// backend/test/armordrops.test.js: `npm test`. No cotton in recipes, bandage uses linen, and the rare armor drops from magic addicts, madmen and rotters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { craftingRecipeDefinitions } from '../../shared/items/craftingRecipeDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { LootTableFactory } from '../../shared/items/lootTableFactory.js';

const SLOTS = ['helmet', 'armor', 'gauntlets', 'greaves', 'boots'];
const SETS = {
    cloth: ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'],
    leather: ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'],
    iron: ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'],
};
const armorIds = (tableId) => LootTableDefinitions[tableId].items.map(i => i.id).filter(id => /^(cloth|leather|iron)_/.test(id));
const rateOf = (tableId, id) => LootTableDefinitions[tableId].items.find(i => i.id === id).dropRate;

test('no crafting recipe uses cotton, and the bandage uses linen', () => {
    for (const r of Object.values(craftingRecipeDefinitions)) {
        assert.ok(!('cotton' in r.materials), `${r.id} still uses cotton`);
    }
    const bandage = craftingRecipeDefinitions.recipe_bandage;
    assert.ok(bandage.materials.linen > 0);
    for (const id of Object.keys(bandage.materials)) assert.ok(ItemDefinitions[id], `${id} is not an item`);
});

test('every armor drop is a real item with a very low rate', () => {
    for (const [tableId, set, max] of [['magic_addict_drops', 'cloth', 0.02], ['madman_drops', 'leather', 0.02], ['rotter_drops', 'iron', 0.02]]) {
        assert.deepEqual(armorIds(tableId).sort(), [...SETS[set]].sort(), `${tableId} should drop the ${set} set and nothing else`);
        for (const id of SETS[set]) {
            assert.ok(ItemDefinitions[id], `${id} is not an item`);
            const rate = rateOf(tableId, id);
            assert.ok(rate > 0 && rate <= max, `${tableId} ${id} rate ${rate}`);
        }
    }
});

test('each enemy points at its own table and the shared table stays armor-free', () => {
    assert.equal(ENTITY_DEFINITIONS.MAGIC_ADDICT.lootTableId, 'magic_addict_drops');
    assert.equal(ENTITY_DEFINITIONS.MAD_MAN.lootTableId, 'madman_drops');
    assert.equal(ENTITY_DEFINITIONS.ROTTER.lootTableId, 'rotter_drops');
    assert.deepEqual(armorIds('mad_man_drops'), []);
    for (const t of ['madman_drops', 'rotter_drops', 'magic_addict_drops']) assert.equal(LootTableDefinitions[t].type, 'independent');
});

test('the old drops are kept and the tables roll', () => {
    const base = LootTableDefinitions.mad_man_drops.items.map(i => `${i.id}:${i.dropRate}`);
    for (const t of ['madman_drops', 'rotter_drops']) {
        const have = LootTableDefinitions[t].items.map(i => `${i.id}:${i.dropRate}`);
        for (const b of base) assert.ok(have.includes(b), `${t} lost ${b}`);
    }
    for (const t of ['magic_addict_drops', 'madman_drops', 'rotter_drops']) assert.ok(LootTableFactory.generateLoot(t, 50));
});

test('armor shows up rarely: roughly 1 in 20 kills for a full set at 1% each', () => {
    const real = Math.random; let seed = 12345;
    Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    try {
        let hits = 0; const N = 4000;
        for (let i = 0; i < N; i++) {
            const loot = LootTableFactory.generateLoot('madman_drops', 1);
            const drops = loot.items || loot.drops || [];
            if (drops.some(d => SETS.leather.includes(d.itemId || d.id))) hits++;
        }
        const pct = hits / N;
        assert.ok(pct > 0.02 && pct < 0.09, `leather in ${(pct * 100).toFixed(1)}% of kills`);
    } finally { Math.random = real; }
});

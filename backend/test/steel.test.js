// backend/test/steel.test.js: `npm test`. Steel ingots: forged from iron and coal, dropped by the late bosses and the iron chests, and
// what every weapon's last two upgrades ask for. No upgrade may ask for a material that doesn't exist or can't be got.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { craftingRecipeDefinitions as R } from '../../shared/items/craftingRecipeDefinitions.js';
import { LootTableDefinitions as L } from '../../shared/items/lootTableDefinitions.js';

test('steel ingot is a stackable material on the materials sheet', () => {
    const s = I.steel_ingot;
    assert.ok(s, 'steel_ingot exists');
    assert.equal(s.type, 'material');
    assert.ok(s.stackable);
    assert.deepEqual(s.icon, { col: 7, row: 1 });
    assert.ok(s.value > I.iron_ingot.value, 'worth more than iron');
    const sameIcon = Object.values(I).filter(i => i.type === 'material' && !i.iconSheet && i.icon?.col === 7 && i.icon?.row === 1);
    assert.deepEqual(sameIcon.map(i => i.id), ['steel_ingot'], 'no other material uses its icon');
});

test('steel is forged from iron ingots and coal', () => {
    const r = R.recipe_steel_ingot;
    assert.equal(r.outputItemId, 'steel_ingot');
    assert.equal(r.station, 'forge');
    assert.deepEqual(r.materials, { iron_ingot: 2, coal: 2 });
    for (const id of Object.keys(r.materials)) assert.ok(I[id], `${id} exists`);
});

test('steel drops from the iron chests, the Panzerkamfer, Jaeger and the Dry Kraken', () => {
    for (const t of ['iron_chest_loot', 'boss_panzerkamfer_drops', 'boss_jaeger_drops', 'boss_dry_kraken_drops'])
        assert.ok(L[t].items.some(e => e.id === 'steel_ingot'), t);
});

test('every upgrade material is a real item that can be crafted or found', () => {
    const crafted = new Set(Object.values(R).map(r => r.outputItemId));
    const dropped = new Set(Object.values(L).flatMap(t => (t.items || []).map(e => e.id)));
    for (const item of Object.values(I)) {
        for (const [lvl, cost] of Object.entries(item.upgradeCosts || {})) {
            for (const id of Object.keys(cost.materials || {})) {
                assert.ok(I[id], `${item.id} level ${lvl} asks for ${id}, which isn't an item`);
                assert.ok(crafted.has(id) || dropped.has(id), `${item.id} level ${lvl}: ${id} can't be got`);
            }
        }
    }
});

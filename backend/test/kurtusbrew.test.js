// backend/test/kurtusbrew.test.js: `npm test`. Kurtus's Brew: a rare find in every crate and barrel, and bottles stack in one slot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { gameState } from '../../shared/core/gameState.js';
import { InventorySystem } from '../../shared/items/inventorySystem.js';

const CONTAINERS = ['container_crate', 'container_crate_sack', 'container_barrel', 'container_ancient_barrel', 'container_ruined_barrel'];

test('every crate and barrel can hold a bottle of Kurtus\'s Brew, but rarely (no more than about 2% of a roll)', () => {
    for (const id of CONTAINERS) {
        const t = LootTableDefinitions[id];
        assert.ok(t, `${id} exists`);
        const total = t.items.reduce((n, i) => n + i.weight, 0);
        const brew = t.items.find(i => i.id === 'kurtus_brew');
        assert.ok(brew, `${id} has the brew`);
        const share = brew.weight / total;
        assert.ok(share > 0 && share <= 0.022, `${id}: ${(share * 100).toFixed(1)}% of a roll`);
    }
});

test('the brew stacks: many bottles share one inventory slot', () => {
    const def = ItemDefinitions.kurtus_brew;
    assert.equal(def.stackable, true);
    assert.ok(def.maxStack >= 10, `stacks to ${def.maxStack}`);
    const keep = gameState.party.inventory;
    gameState.party.inventory = [];
    try {
        InventorySystem.addItem('kurtus_brew', 3);
        InventorySystem.addItem('kurtus_brew', 2);
        const slots = gameState.party.inventory.filter(i => i.defId === 'kurtus_brew');
        assert.equal(slots.length, 1, 'one slot');
        assert.equal(slots[0].qty, 5, 'holding all five');
    } finally { gameState.party.inventory = keep; }
});

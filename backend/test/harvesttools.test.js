// backend/test/harvesttools.test.js: `npm test`. Harvesting tools work from the hotbar: an axe or a pickaxe on it (and carried) is enough,
// it need not be equipped. One in hand still works, and a tool can be put on the hotbar from the character summary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { InventorySystem } from '../../shared/items/inventorySystem.js';
import { OverworldController } from '../../frontend/src/screens/overworld/overworldController.js';
import { CharacterSummaryController } from '../../frontend/src/screens/characterSummary/characterSummaryController.js';

const ow = Object.create(OverworldController.prototype);
const reset = () => {
    gameState.party.inventory = [];
    gameState.party.members = [{ name: 'Hero', equipment: {} }];
    gameState.player.hotbar = [];
};

test('an axe on the hotbar chops, it need not be equipped; a pickaxe does not stand in for an axe', () => {
    reset();
    assert.equal(ow.hasRequiredTool('axe'), false, 'no axe anywhere');
    InventorySystem.addItem('handaxe', 1);
    assert.equal(ow.hasRequiredTool('axe'), false, 'in the bag but not on the hotbar');
    InventorySystem.setHotbarSlot(0, 'handaxe');
    assert.equal(ow.hasRequiredTool('axe'), true, 'on the hotbar');
    assert.equal(ow.hotbarToolFor('axe'), 'handaxe');
    assert.equal(ow.hasRequiredTool('pickaxe'), false, 'the wrong kind of tool');
    InventorySystem.addItem('pickaxe', 1);
    InventorySystem.setHotbarSlot(1, 'pickaxe');
    assert.equal(ow.hasRequiredTool('pickaxe'), true);
    assert.equal(ow.hasRequiredTool(null), true, 'nothing needed');
});

test('a tool on the hotbar that is no longer carried does not count; one in hand still does', () => {
    reset();
    InventorySystem.setHotbarSlot(0, 'handaxe');   // the slot stays when the item is gone (it fills again on pickup)
    assert.equal(ow.hasRequiredTool('axe'), false, 'on the hotbar, but none carried');
    gameState.party.members[0].equipment.mainHand = { defId: 'handaxe', harvestTool: ['axe'] };
    assert.equal(ow.hasRequiredTool('axe'), true, 'in the leader\'s hand');
});

test('harvesting tools can be put on the hotbar from the character summary', () => {
    const canHotbar = (defId) => CharacterSummaryController.prototype._canHotbar.call({}, { defId });
    assert.equal(canHotbar('handaxe'), true);
    assert.equal(canHotbar('pickaxe'), true);
});

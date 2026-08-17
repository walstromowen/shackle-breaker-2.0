// shared/systems/inventorySystem.js
import { gameState } from '../state/gameState.js';
import { ItemModel } from '../models/itemModel.js';
import { ItemDefinitions } from '../data/itemDefinitions.js';

// ---> NEW: Import Quest systems
import { QuestModel } from '../models/questModel.js';
import { QuestDefinitions } from '../data/questDefinitions.js';
// import { events } from '../../core/eventBus.js'; // Uncomment if you want to emit an event when quests complete!

export const InventorySystem = {
    /**
     * Adds an item to the party inventory.
     * @param {string} defId - The item definition ID (e.g. "healing_herb")
     * @param {number} amount - How many to add
     */
    addItem(defId, amount = 1) {
        const inventory = gameState.party.inventory;
        const def = ItemDefinitions[defId];
        if (!def) {
            console.error(`[InventorySystem] Item definition not found: ${defId}`);
            return;
        }

        // Store the original amount being added for quest tracking, 
        // since the 'amount' variable gets decremented in the loop below.
        const amountAdded = amount;

        const isStackable = def.stackable || false;
        const maxStack = def.maxStack || 1;

        // 1. If stackable, try to fill existing stacks first
        if (isStackable) {
            const existingStacks = inventory.filter(i => i.defId === defId && i.qty < maxStack);
            for (const stack of existingStacks) {
                if (amount <= 0) break;
                const space = maxStack - stack.qty;
                const toAdd = Math.min(amount, space);
                stack.qty += toAdd;
                amount -= toAdd;
            }
        }

        // 2. If we still have amount left (or it wasn't stackable), create new stacks
        while (amount > 0) {
            const qtyForThisStack = isStackable ? Math.min(amount, maxStack) : 1;
            const newItem = new ItemModel(defId, { qty: qtyForThisStack });
            inventory.push(newItem);
            amount -= qtyForThisStack;
        }

        // ---> NEW: QUEST PROGRESSION <---
        Object.keys(gameState.quests.active).forEach(questId => {
            const questDef = QuestDefinitions[questId];
            if (questDef) {
                questDef.objectives.forEach(obj => {
                    // Check if this quest needs this specific item
                    if (obj.type === 'obtain_item' && obj.targetId === defId) {
                        const didUpdate = QuestModel.updateProgress(gameState, questId, obj.id, amountAdded);
                        
                        if (didUpdate && QuestModel.checkCompletion(gameState, questId)) {
                            console.log(`[Quest System] Quest Complete: ${questDef.name}!`);
                            // If you have a toast/notification system, you can emit an event here:
                            // events.emit('SHOW_TOAST', { message: `Quest Complete: ${questDef.name}!` });
                        }
                    }
                });
            }
        });
        // --------------------------------
    },

    /**
     * Removes a specific item instance or quantity from the inventory.
     * @param {string} defId - The definition ID to remove
     * @param {number} amount - How many to remove
     */
    removeItem(defId, amount = 1) {
        const inventory = gameState.party.inventory;
        const stacks = inventory
            .filter(i => i.defId === defId)
            .sort((a, b) => a.qty - b.qty);

        let remainingToRemove = amount;

        for (const stack of stacks) {
            if (remainingToRemove <= 0) break;
            if (stack.qty <= remainingToRemove) {
                remainingToRemove -= stack.qty;
                const idx = inventory.indexOf(stack);
                if (idx > -1) inventory.splice(idx, 1);
            } else {
                stack.qty -= remainingToRemove;
                remainingToRemove = 0;
            }
        }
        return remainingToRemove === 0;
    },

    /**
     * Checks if the inventory contains at least X amount of an item
     */
    hasItem(defId, amount = 1) {
        const total = gameState.party.inventory
            .filter(i => i.defId === defId)
            .reduce((sum, i) => sum + i.qty, 0);

        return total >= amount;
    }
};
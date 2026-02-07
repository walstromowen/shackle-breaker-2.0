// shared/systems/inventorySystem.js
import { gameState } from '../state/gameState.js';
import { ItemModel } from '../models/itemModel.js';
import { ItemDefinitions } from '../data/itemDefinitions.js';

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

        const isStackable = def.stackable || false;
        const maxStack = def.maxStack || 1;

        // 1. If stackable, try to fill existing stacks first
        if (isStackable) {
            // Find all stacks of this item that aren't full
            // Note: We access .defId and .qty because those are the props on ItemModel
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
            
            // Create the proper Model instance
            const newItem = new ItemModel(defId, { qty: qtyForThisStack });
            inventory.push(newItem);

            amount -= qtyForThisStack;
        }
    },

    /**
     * Removes a specific item instance or quantity from the inventory.
     * @param {string} defId - The definition ID to remove
     * @param {number} amount - How many to remove
     */
    removeItem(defId, amount = 1) {
        const inventory = gameState.party.inventory;
        
        // Find all stacks, sort by smallest first (to clear up inventory slots)
        const stacks = inventory
            .filter(i => i.defId === defId)
            .sort((a, b) => a.qty - b.qty);

        let remainingToRemove = amount;

        for (const stack of stacks) {
            if (remainingToRemove <= 0) break;

            if (stack.qty <= remainingToRemove) {
                // Remove the whole stack
                remainingToRemove -= stack.qty;
                const idx = inventory.indexOf(stack);
                if (idx > -1) inventory.splice(idx, 1);
            } else {
                // Remove part of the stack
                stack.qty -= remainingToRemove;
                remainingToRemove = 0;
            }
        }
        
        return remainingToRemove === 0; // True if we successfully removed everything requested
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
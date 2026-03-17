import { InventorySystem } from './inventorySystem.js';
import { gameState } from '../state/gameState.js';

export const ItemUpgradeSystem = {
    
    /**
     * Checks if an item can currently be upgraded by the party.
     * @param {ItemModel} item - The item instance to check
     * @returns {boolean} True if they have the materials and it's not max level
     */
    canUpgrade(item) {
        if (!item || !item.isUpgradeable || item.isMaxLevel) return false;
        
        const costs = item.nextUpgradeCost;
        if (!costs) return false;

        // 1. Check Currency
        if (costs.currency && (gameState.party.gold || 0) < costs.currency) {
            return false;
        }

        // 2. Check Materials
        if (costs.materials) {
            for (const [matId, requiredQty] of Object.entries(costs.materials)) {
                if (!InventorySystem.hasItem(matId, requiredQty)) return false;
            }
        }

        return true;
    },

    upgradeItem(item) {
        if (!this.canUpgrade(item)) {
            console.warn(`[ItemUpgradeSystem] Cannot upgrade ${item?.name || 'Unknown Item'}. Missing materials or max level.`);
            return false;
        }

        const costs = item.nextUpgradeCost;

        // 1. Deduct Currency
        if (costs.currency) {
            gameState.party.gold -= costs.currency;
        }

        // 2. Deduct Materials
        if (costs.materials) {
            for (const [matId, requiredQty] of Object.entries(costs.materials)) {
                InventorySystem.removeItem(matId, requiredQty);
            }
        }

        // Level up the item instance!
        item.level += 1;

        console.log(`[ItemUpgradeSystem] Successfully upgraded ${item.name} to Level ${item.level}!`);
        return true;
    }
};
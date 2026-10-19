import { InventorySystem } from './inventorySystem.js';
import { gameState } from '../state/gameState.js';

// The item definition id of an item instance (works for bag items and equipped items)
const defIdOf = (it) => it && (it.defId ?? (it.definition && it.definition.id));

export const ItemUpgradeSystem = {

    /**
     * How many of material `matId` the party can spend on `item`'s upgrade.
     * An item can never pay for its own upgrade: when the material IS the item's own kind (an insight weapon that needs another
     * copy of itself), the instance being upgraded is left out of the count, so one copy in the bag is "0 spare", not "1".
     * (An equipped copy is not in the bag at all, so it never counted anyway.)
     */
    countAvailable(matId, item = null) {
        if (item && defIdOf(item) === matId) {
            return (gameState.party.inventory || []).reduce(
                (n, it) => (it && it !== item && defIdOf(it) === matId) ? n + (it.qty || 1) : n, 0);
        }
        return InventorySystem.countItem(matId);
    },

    hasMaterial(matId, qty, item = null) {
        if (item && defIdOf(item) === matId) return this.countAvailable(matId, item) >= qty;
        return InventorySystem.hasItem(matId, qty);
    },

    /** Spends `qty` of `matId`. When the material is the item's own kind, other copies are used up (the lowest level first), never the item itself. */
    _spendMaterial(matId, qty, item) {
        if (!(item && defIdOf(item) === matId)) {
            InventorySystem.removeItem(matId, qty);
            return;
        }
        const inv = gameState.party.inventory;
        const spare = [];
        inv.forEach((it, i) => { if (it && it !== item && defIdOf(it) === matId) spare.push(it); });
        spare.sort((a, b) => (a.level || 1) - (b.level || 1));
        let left = qty;
        for (const it of spare) {
            if (left <= 0) break;
            const have = it.qty || 1;
            const take = Math.min(left, have);
            if (have > take) it.qty -= take;
            else inv.splice(inv.indexOf(it), 1);
            left -= take;
        }
    },

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
        if (costs.currency && (gameState.party.currency || 0) < costs.currency) {
            return false;
        }

        // 2. Check Materials
        if (costs.materials) {
            for (const [matId, requiredQty] of Object.entries(costs.materials)) {
                if (!this.hasMaterial(matId, requiredQty, item)) return false;
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
            gameState.party.currency -= costs.currency;
        }

        // 2. Deduct Materials
        if (costs.materials) {
            for (const [matId, requiredQty] of Object.entries(costs.materials)) {
                this._spendMaterial(matId, requiredQty, item);
            }
        }

        // Level up the item instance!
        item.level += 1;

        // Log the new abilities to the console for debugging
        const def = item.definition || {};
        const unlocks = def.abilityUnlocks && def.abilityUnlocks[item.level];
        if (unlocks) {
            console.log(`[ItemUpgradeSystem] Unlocked new abilities: ${unlocks.join(', ')}`);
        }

        // This console log will now successfully trigger the updated ItemModel getter
        console.log(`[ItemUpgradeSystem] Successfully upgraded ${item.name} to Level ${item.level}! New Value: ${item.value}`);
        return true;
    }
};
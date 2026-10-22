import { LootTableDefinitions, LootExclusionSets } from '../../data/lootTableDefinitions.js';
import { LootTableModel } from '../../models/lootTableModel.js';

export class LootTableFactory {
    
    /**
     * Generates loot based on a predefined table.
     * @param {string} tableId - The ID of the loot table in LootTableDefinitions.
     * @param {number} rollCount - How many times to roll the table (defaults to 1).
     * @param {number} baseCurrency - Optional currency to inject directly into the final model.
     * @param {string|string[]} exclude - Optional item ids and / or LootExclusionSets names (e.g. "low_tier") to leave out of every roll.
     * @returns {LootTableModel} - A clean, merged model containing all drops.
     */
    static generateLoot(tableId, rollCount = 1, baseCurrency = 0, exclude = null) {
        const found = LootTableDefinitions[tableId];
        
        if (!found || !found.items) {
            console.error(`LootTableFactory: Table '${tableId}' not found.`);
            return new LootTableModel([], baseCurrency);
        }

        // The excluded items are taken out of the table first, so a weighted table simply spreads their share over the rest.
        let table = found;
        const skip = this._excludedIds(exclude);
        if (skip.size > 0) {
            const items = found.items.filter(entry => !skip.has(entry.id));
            if (items.length > 0) table = { ...found, items };
        }

        let rawDrops = [];

        // Roll the table the requested number of times
        for (let i = 0; i < rollCount; i++) {
            if (table.type === "weighted") {
                rawDrops.push(...this._rollWeighted(table.items));
            } else if (table.type === "independent") {
                rawDrops.push(...this._rollIndependent(table.items));
            }
        }

        // Merge duplicate items and return the finalized model
        const mergedDrops = this._mergeDuplicates(rawDrops);
        return new LootTableModel(mergedDrops, baseCurrency);
    }

    /** The set of item ids named by an `exclude` value: set names expand to their items, anything else is an item id. */
    static _excludedIds(exclude) {
        const ids = new Set();
        if (!exclude) return ids;
        for (const name of (Array.isArray(exclude) ? exclude : [exclude])) {
            if (LootExclusionSets[name]) LootExclusionSets[name].forEach(id => ids.add(id));
            else ids.add(name);
        }
        return ids;
    }

    // ==========================================
    // INTERNAL HELPER METHODS
    // ==========================================

    static _rollWeighted(items) {
        const totalWeight = items.reduce((sum, entry) => sum + entry.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const entry of items) {
            random -= entry.weight;
            if (random <= 0) {
                return [{ id: entry.id, qty: this._getQty(entry.min, entry.max) }];
            }
        }
        return [];
    }

    static _rollIndependent(items) {
        let drops = [];
        for (const entry of items) {
            if (Math.random() <= entry.dropRate) {
                drops.push({ id: entry.id, qty: this._getQty(entry.min, entry.max) });
            }
        }
        return drops;
    }

    static _getQty(min = 1, max = 1) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static _mergeDuplicates(drops) {
        const merged = {};
        for (const drop of drops) {
            if (merged[drop.id]) {
                merged[drop.id].qty += drop.qty;
            } else {
                merged[drop.id] = { ...drop };
            }
        }
        return Object.values(merged); // Converts the dictionary back to an array
    }
}
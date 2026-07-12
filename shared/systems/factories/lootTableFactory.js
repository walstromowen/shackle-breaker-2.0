import { LootTableDefinitions } from '../../data/lootTableDefinitions.js';
import { LootTableModel } from '../../models/lootTableModel.js';

export class LootTableFactory {
    
    /**
     * Generates loot based on a predefined table.
     * @param {string} tableId - The ID of the loot table in LootTableDefinitions.
     * @param {number} rollCount - How many times to roll the table (defaults to 1).
     * @param {number} baseCurrency - Optional currency to inject directly into the final model.
     * @returns {LootTableModel} - A clean, merged model containing all drops.
     */
    static generateLoot(tableId, rollCount = 1, baseCurrency = 0) {
        const table = LootTableDefinitions[tableId];
        
        if (!table || !table.items) {
            console.error(`LootTableFactory: Table '${tableId}' not found.`);
            return new LootTableModel([], baseCurrency);
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
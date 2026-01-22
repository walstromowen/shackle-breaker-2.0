import { ItemModel } from '../../models/itemModel.js';
import { ItemDefinitions } from '../../data/itemDefinitions.js';

export class ItemFactory {
    
    /**
     * Creates a new Item Instance.
     * @param {string} defId - The ID from ItemDefinitions
     * @param {object} extraState - (Optional) Pre-existing state (for loading saves)
     */
    static createItem(defId, extraState = {}) {
        if (!ItemDefinitions[defId]) {
            console.warn(`[ItemFactory] Item ID '${defId}' does not exist.`);
            return null;
        }

        return new ItemModel(defId, extraState);
    }

    /**
     * Helper to create a list of items from strings.
     * Useful for initializing starting inventory.
     */
    static createBatch(idList) {
        return idList.map(id => this.createItem(id)).filter(item => item !== null);
    }
}
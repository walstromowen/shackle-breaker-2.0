export class LootTableModel {
    /**
     * @param {Array} items - Array of item objects: { id: "item_id", qty: number }
     * @param {number} currency - Amount of currency dropped
     */
    constructor(items = [], currency = 0) {
        this.items = items;
        this.currency = currency;
    }

    /**
     * Checks if the drop contains any items.
     * @returns {boolean}
     */
    hasItems() {
        return this.items.length > 0;
    }

    /**
     * Checks if the drop contains any currency.
     * @returns {boolean}
     */
    hasCurrency() {
        return this.currency > 0;
    }

    /**
     * Returns the total amount of individual items dropped (sum of all quantities).
     * @returns {number}
     */
    getTotalItemCount() {
        return this.items.reduce((sum, item) => sum + item.qty, 0);
    }
}
import { gameState } from '../../../../shared/state/gameState.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

export class ShopLogic {
    constructor(config) {
        this.config = config || {};
        this.shopId = this.config.shopId || 'default_shop';
        this.vendorWares = this._initializeWares(this.config.wares || []);
    }

    get partyInventory() {
        return gameState.party.inventory.filter(item => item);
    }

    getShopName() {
        return this.config.shopName || "Merchant";
    }

    getPartyCurrency() {
        // BUG FIX: Match the state! 'gold' was returning undefined. 
        return gameState.party.currency || 0; 
    }

    _initializeWares(baseWares) {
        return baseWares.map(ware => {
            const itemId = ware.defId || ware.id;
            const def = ItemDefinitions[itemId];
            return {
                ...ware,
                defId: itemId,
                name: def?.name || itemId,
                cost: ware.cost || def?.cost || 10,
                type: def?.type || 'item'
            };
        });
    }

    buyItem(item, amount = 1) {
    const totalCost = item.cost * amount;
    
    if (gameState.party.currency >= totalCost) {
        gameState.party.currency -= totalCost; 
        
        // 1. Add to party inventory
        const existingItem = this.partyInventory.find(i => i.defId === item.defId && (i.qty || 1) < 99);
        if (existingItem) {
            existingItem.qty = (existingItem.qty || 1) + amount;
        } else {
            gameState.party.inventory.push({ defId: item.defId, qty: amount });
        }

        // 2. BUG FIX: Remove/decrement item from vendor stock
        const vendorIdx = this.vendorWares.indexOf(item);
        if (vendorIdx > -1) {
            if (item.qty && item.qty > amount) {
                item.qty -= amount;
            } else {
                // If item has no quantity property or reaches 0, splice it out completely
                this.vendorWares.splice(vendorIdx, 1);
            }
        }

        return true;
    }
    return false;
}

    sellItem(item, amount = 1) {
        const def = ItemDefinitions[item.defId];
        const sellValue = Math.floor((def?.cost || 10) * 0.5); // Sell for 50%
        const bagIdx = gameState.party.inventory.indexOf(item);
        
        if (bagIdx > -1) {
            // BUG FIX: Use 'currency' instead of 'gold'
            if (gameState.party.currency === undefined) gameState.party.currency = 0;
            gameState.party.currency += (sellValue * amount); 

            // BUG FIX: Add the item back to the vendor's inventory so it doesn't vanish
            const existingVendorItem = this.vendorWares.find(w => w.defId === item.defId);
            if (existingVendorItem) {
                existingVendorItem.qty = (existingVendorItem.qty || 1) + amount;
            } else {
                this.vendorWares.push({
                    defId: item.defId,
                    id: item.defId,
                    name: item.name || def?.name || item.defId,
                    cost: def?.cost || 10, // Give it a standard buy-back cost
                    type: def?.type || 'item',
                    qty: amount
                });
            }

            // Remove from player inventory
            if (item.qty > amount) {
                item.qty -= amount;
            } else {
                gameState.party.inventory.splice(bagIdx, 1);
            }
            return true;
        }
        return false;
    }
}
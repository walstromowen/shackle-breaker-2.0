import { gameState } from '../../../../shared/state/gameState.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js'; 

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
        return gameState.party.currency || 0;
    }

    _initializeWares(baseWares) {
        if (!gameState.shops) {
            gameState.shops = {};
        }

        if (gameState.shops[this.shopId]) {
            return gameState.shops[this.shopId];
        }

        const formattedWares = baseWares.map(ware => {
            const itemId = ware.defId || ware.id;
            const def = ItemDefinitions[itemId];
            return {
                ...ware,
                defId: itemId,
                name: def?.name || itemId,
                // FIX: Check for def?.value as well!
                cost: ware.cost || def?.cost || def?.value || 10, 
                type: def?.type || 'item'
            };
        });

        gameState.shops[this.shopId] = formattedWares;
        return formattedWares;
    }

    buyItem(item, amount = 1) {
        const totalCost = item.cost * amount;
        
        if (gameState.party.currency >= totalCost) {
            gameState.party.currency -= totalCost;
            
            InventorySystem.addItem(item.defId, amount);

            const vendorIdx = this.vendorWares.indexOf(item);
            if (vendorIdx > -1) {
                if (item.qty && item.qty > amount) {
                    item.qty -= amount;
                } else {
                    this.vendorWares.splice(vendorIdx, 1);
                }
            }
            return true;
        }
        return false;
    }

    sellItem(item, amount = 1) {
        const def = ItemDefinitions[item.defId];
        // FIX: Check for def?.value here too!
        const sellValue = Math.floor((def?.cost || def?.value || 10) * 0.5); 
        const bagIdx = gameState.party.inventory.indexOf(item);

        if (bagIdx > -1) {
            if (gameState.party.currency === undefined) gameState.party.currency = 0;
            gameState.party.currency += (sellValue * amount);

            const existingVendorItem = this.vendorWares.find(w => w.defId === item.defId);
            if (existingVendorItem) {
                existingVendorItem.qty = (existingVendorItem.qty || 1) + amount;
            } else {
                this.vendorWares.push({
                    defId: item.defId,
                    id: item.defId,
                    name: item.name || def?.name || item.defId,
                    // FIX: And check it here when adding back to vendor stock!
                    cost: def?.cost || def?.value || 10,
                    type: def?.type || 'item',
                    qty: amount
                });
            }

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
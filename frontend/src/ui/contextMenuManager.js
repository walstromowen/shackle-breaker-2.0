import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js';
import { ItemDefinitions } from '../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';
import { AbilitySystem } from '../../../shared/systems/abilitySystem.js';
import { ItemUpgradeSystem } from '../../../shared/systems/itemUpgradeSystem.js';

export class ContextMenuManager {
    constructor(controller) {
        this.controller = controller;
        this.menu = null; 
    }

    handleRightClick(input) {
        if (this.menu) {
            this.menu = null;
        }

        if (!input) return;
        const id = (typeof input === 'object' && input.id) ? input.id : input;
        
        if (id.startsWith('SLOT_')) {
            const slotName = (typeof input === 'object' && input.slotId) ? input.slotId : id.replace('SLOT_', '');
            const item = this.controller.currentMember.equipment[slotName];
            if (item) this._openContextMenu(item, 'equipment', slotName);
        }
        else if (id.startsWith('INV_ITEM_')) {
            const idx = parseInt(id.split('_')[2], 10);
            const item = this.controller.filteredInventory[idx];
            if (item) this._openContextMenu(item, 'inventory', idx);
        }
    }

    _openContextMenu(item, source, sourceKey) {
        const def = ItemDefinitions[item.defId];
        const options = [];
        const isStackable = (item.qty !== undefined && item.qty > 1);

        if (this._isItemUsableInMenu(def)) {
            options.push({ label: 'Use', action: 'USE' });
        }

        // --- UPGRADE CHECK ---
        if (ItemUpgradeSystem.canUpgrade(item)) {
            options.push({ label: 'Upgrade', action: 'UPGRADE' });
        }

        if (source === 'equipment') {
            if (this.controller.filteredInventory.length > 0) {
                options.push({ label: 'Equip', action: 'NAV_TO_INV' });
            }
            options.push({ label: 'Unequip', action: 'UNEQUIP_AND_NAV' });
        } 
        else if (source === 'inventory') {
            if (this._canEquipItem(item)) {
                options.push({ label: 'Equip', action: 'EQUIP' });
            }
        }

        if (isStackable) {
            options.push({ label: 'Drop 1', action: 'DROP_ONE' });
            options.push({ label: 'Drop All', action: 'DROP_ALL' });
        } else {
            options.push({ label: 'Drop', action: 'DROP_ONE' }); 
        }

        let menuX = this.controller.mouse.x || 100;
        let menuY = this.controller.mouse.y || 100;

        let targetId = null;
        if (source === 'equipment') {
            targetId = `SLOT_${sourceKey}`;
        } else if (source === 'inventory') {
            targetId = `INV_ITEM_${sourceKey}`;
        }

        if (targetId && this.controller.lastRenderedHitboxes.length > 0) {
            const hit = this.controller.lastRenderedHitboxes.find(h => h.id === targetId);
            if (hit) {
                menuX = Math.floor(hit.x + (hit.w / 2));
                menuY = Math.floor(hit.y + (hit.h / 2));
            }
        }

        this.menu = {
            x: menuX,
            y: menuY,
            item: item,
            source,
            sourceKey,
            options,
            selectedIndex: 0
        };
    }

    handleMenuNavigation(intent) {
        if (!this.menu) return;

        const len = this.menu.options.length;
        
        if (intent === 'CANCEL') {
            this.menu = null;
        } else if (intent === 'UP') {
            this.menu.selectedIndex = (this.menu.selectedIndex - 1 + len) % len;
        } else if (intent === 'DOWN') {
            this.menu.selectedIndex = (this.menu.selectedIndex + 1) % len;
        } else if (intent === 'CONFIRM') {
            this.handleMenuAction(this.menu.selectedIndex);
        }
    }

    handleMenuAction(actionIndex) {
        if (!this.menu) return;
        
        const { item, source, sourceKey, options } = this.menu;
        
        if (!options[actionIndex]) {
            this.menu = null;
            return;
        }

        const action = options[actionIndex].action;

        if (action === 'USE') {
            this.useItem(item);
        }
        // --- UPGRADE ACTION ---
        else if (action === 'UPGRADE') {
            const success = ItemUpgradeSystem.upgradeItem(item);
            if (success) {
                events.emit('TEXT_POPUP', {
                    text: `Upgraded to Lv.${item.level}!`, 
                    x: this.controller.mouse.x || 400, 
                    y: (this.controller.mouse.y || 300) - 40,
                    color: '#ffd700' // Fancy gold color for an upgrade
                });
            }
        }
        else if (action === 'NAV_TO_INV') {
            this.controller.state = 'INVENTORY';
            this.controller.inventoryIndex = 0;
            this.controller.scrollToItem(0);
        }
        else if (action === 'UNEQUIP_AND_NAV') {
            const defId = item.defId;
            
            this.controller.currentMember.unequipItem(sourceKey);
            gameState.party.inventory.push(item); // Keep the exact instance
            
            this.controller.updateFilteredInventory();
            
            const newIndex = this.controller._findNewestInventoryIndex(defId);
            
            this.controller.state = 'INVENTORY';
            this.controller.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
            this.controller.scrollToItem(this.controller.inventoryIndex, true);
        }
        else if (action === 'EQUIP') {
            this.controller.equipItem(item); 
        }
        else if (action === 'DROP_ONE' || action === 'DROP_ALL') {
            this._handleDropAction(action, item, source, sourceKey);
        }

        // Close the menu and refresh UI state
        this.menu = null;
        this.controller.updateFilteredInventory();
    }

    useItem(item) {
        const def = ItemDefinitions[item.defId];

        if (!def) return;
        if (!def.useAbility) {
            return;
        }

        const result = AbilitySystem.execute(def.useAbility, this.controller.currentMember, this.controller.currentMember);
        if (result.success) {
            InventorySystem.removeItem(item.defId, 1);

            events.emit('TEXT_POPUP', {
                text: result.message, 
                x: this.controller.currentMember.x || 400, 
                y: (this.controller.currentMember.y || 300) - 40,
                color: '#00ff00' 
            });

            this.controller.updateFilteredInventory();
            
            if (this.controller.inventoryIndex >= this.controller.filteredInventory.length) {
                this.controller.inventoryIndex = Math.max(0, this.controller.filteredInventory.length - 1);
            }
            if (this.controller.filteredInventory.length === 0) {
                this.controller.inventoryIndex = -1;
            }
        } else {
            events.emit('TEXT_POPUP', {
                text: result.message,
                x: 400,
                y: 300,
                color: '#ffffff' 
            });
        }
    }

    _isItemUsableInMenu(def) {
        if (!def) return false;
        const currentMode = (gameState.mode || 'overworld').toLowerCase();

        if (def.usability && Array.isArray(def.usability)) {
            return def.usability.includes(currentMode);
        }

        const itemType = (def.type || '').toLowerCase();
        const itemCategory = (def.category || '').toLowerCase();

        return (itemType === 'consumable' || itemCategory === 'consumable');
    }

    _handleDropAction(action, item, source, sourceKey) {
        let qtyToRemove = 1;
        if (action === 'DROP_ALL') {
            qtyToRemove = item.qty || 1;
        }

        if (source === 'equipment') {
            this.controller.currentMember.equipment[sourceKey] = null;
            if (item.qty > qtyToRemove) {
                item.qty -= qtyToRemove;
                this.controller.currentMember.equipment[sourceKey] = item;
            }
        } 
        else if (source === 'inventory') {
            const realIndex = gameState.party.inventory.indexOf(item);
            if (realIndex > -1) {
                if (item.qty > qtyToRemove) {
                    gameState.party.inventory[realIndex].qty -= qtyToRemove;
                } else {
                    gameState.party.inventory.splice(realIndex, 1);
                }
            }
        }
    }

    _canEquipItem(item) {
        const def = ItemDefinitions[item.defId];
        if (!def) return false;
        
        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
        
        return this.controller.activeSlots.some(s => {
            const slotKey = s.toLowerCase().replace(/\s/g, '');
            return (itemSlot === slotKey) || 
                   (slotKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) ||
                   (slotKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon'));
        });
    }
}
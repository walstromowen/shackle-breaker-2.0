import { gameState } from '../../../shared/state/gameState.js'; // <-- Add this
import { ItemDefinitions } from '../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';

export class DragAndDropManager {
    constructor(controller) {
        this.controller = controller; // Reference to CharacterSummaryController
    }

    handleItemDrop(x, y) {
        let dropTarget = this.controller.hoveredElement ? this.controller.hoveredElement.id : null;
        let slotName = this.controller.hoveredElement ? this.controller.hoveredElement.slotId : null;
        
        // 1. Resolve Hitboxes if dropped in an empty space near a slot
        if ((!dropTarget || dropTarget.startsWith('ITEM_') || dropTarget.startsWith('INV_ITEM')) && this.controller.lastRenderedHitboxes.length > 0) {
            const hit = this.controller.lastRenderedHitboxes.find(box => 
                (box.type === 'slot' || (box.id && box.id.startsWith('SLOT_'))) && 
                x >= box.x && x <= box.x + box.w &&
                y >= box.y && y <= box.y + box.h
            );
            
            if (hit) {
                dropTarget = hit.id;
                slotName = hit.slotId; 
            }
        }

        // 2. Route the drop based on the target
        if (dropTarget && dropTarget.indexOf('SLOT_') === 0) {
            const finalSlot = slotName || dropTarget.substring(5);
            this.attemptEquipDrop(finalSlot);
        }
        else if (this.isMouseOverInventory(dropTarget)) {
            this.attemptInventoryDrop();
        }
        else {
            this.cancelDrag();
        }
    }

    attemptEquipDrop(targetSlotRaw) {
        if (!this.controller.heldItem) return;

        const item = this.controller.heldItem.item;
        const def = ItemDefinitions[item.defId]; 
        
        if (!def) {
            this.cancelDrag();
            return;
        }

        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
        const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');

        // Validation logic
        const isValid = (itemSlot === slotKey) || 
                        (slotKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) ||
                        (slotKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon'));

        if (!isValid) {
            this.cancelDrag();
            return;
        }

        const canonicalSlot = this.controller.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;

        // Duplication Fix / Same-Slot drop
        if (this.controller.heldItem.source === 'equipment') {
            const originSlot = this.controller.heldItem.originSlot;
            
            if (originSlot === canonicalSlot) {
                this.cancelDrag();
                return;
            }

            this.controller.currentMember.equipment[originSlot] = null;
            this.controller.equipItem(item, canonicalSlot);
            this.controller.heldItem = null;
            return;
        }

        this.controller.equipItem(item, canonicalSlot);
        this.controller.heldItem = null;
    }

    attemptInventoryDrop() {
        if (!this.controller.heldItem) return;

        // Handle Unequip (Equipment -> Inventory)
        if (this.controller.heldItem.source === 'equipment') {
            const member = this.controller.currentMember;
            const slot = this.controller.heldItem.originSlot;
            const item = this.controller.heldItem.item;
            const defId = item.defId;

            // Perform unequip
            member.equipment[slot] = null;
            gameState.party.inventory.push(item); // <-- Keep the exact instance!

            this.controller.heldItem = null;
            
            this.controller.heldItem = null;
            this.controller.updateFilteredInventory();

            const newIndex = this.controller._findNewestInventoryIndex(defId);
            
            this.controller.state = 'INVENTORY';
            this.controller.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
            this.controller.slotIndex = -1; 
            this.controller.scrollToItem(this.controller.inventoryIndex, true);
            return;
        }

        // Handle Inventory -> Inventory
        this.controller.heldItem = null;
        this.controller.updateFilteredInventory();
    }

    isMouseOverInventory(targetId) {
        if (targetId && (targetId.startsWith('INV_') || targetId === 'SCROLLBAR_INV')) {
            return true;
        }
        if (this.controller.layout.inventoryBounds) {
            const { x, y, w, h } = this.controller.layout.inventoryBounds;
            const mx = this.controller.mouse.x;
            const my = this.controller.mouse.y;
            return (mx >= x && mx <= x + w && my >= y && my <= y + h);
        }
        return false;
    }

    cancelDrag() {
        this.controller.heldItem = null;
        this.controller.potentialDrag = null;
        this.controller.updateFilteredInventory();
    }
}
import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../../src/core/eventBus.js';

export class CharacterSummaryController {
    constructor(input, data) {
        // Capture which character was clicked in the previous screen
        this.memberIndex = data ? data.memberIndex : 0;
        
        // --- NAVIGATION STATES ---
        // 'SLOTS': Navigating the paper doll slots (Center Column)
        // 'INVENTORY': Selecting an item to equip (Right Column)
        this.state = 'SLOTS'; 
        
        // The equipment slots available on twssshe character
        this.equipmentSlots = [
            'head', 'torso', 'arms','legs', 'feet', 
            'mainHand', 'offHand', 'accessory'
        ];
        this.slotIndex = 0; // Currently highlighted slot

        // Inventory Selection State
        this.inventoryIndex = 0;
        this.filteredInventory = []; // Items in bag that fit the current slot
        
        // Initial setup: Filter inventory for the starting slot (Head)
        this.updateFilteredInventory();
        
        // Debug Log
        if (this.currentMember && this.currentMember.state) {
            console.log("Current Equipment:", this.currentMember.state.equipment);
        }
    }

    get currentMember() {
        return gameState.party.members[this.memberIndex];
    }

    // =========================================================
    // INPUT HANDLING
    // =========================================================
    handleKeyDown(code) {
        // --- GLOBAL BACK / CANCEL ---
        if (code === 'Escape' || code === 'Backspace') {
            if (this.state === 'INVENTORY') {
                // Cancel item selection, go back to slot selection
                this.state = 'SLOTS'; 
            } else {
                // Return to Party Screen
                events.emit('CHANGE_SCENE', { scene: 'party' });
            }
            return;
        }

        // --- DELEGATE BASED ON STATE ---
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else if (this.state === 'INVENTORY') {
            this.handleInventoryNavigation(code);
        }
    }

    handleSlotNavigation(code) {
        // Switch Characters (Tab)
        if (code === 'Tab') {
            this.cycleMember(1);
            return;
        }

        // Move Selection (Up/Down/W/S)
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.equipmentSlots.length - 1;
            this.updateFilteredInventory();
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.slotIndex = (this.slotIndex < this.equipmentSlots.length - 1) ? this.slotIndex + 1 : 0;
            this.updateFilteredInventory();
        }

        // Enter: If items exist for this slot, move focus to Right Column
        else if (code === 'Enter' || code === 'Space') {
            if (this.filteredInventory.length > 0) {
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
            } else {
                console.log("No items available for this slot.");
            }
        }
        
        // Unequip Item (Delete/X)
        else if (code === 'KeyX' || code === 'Delete') {
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(code) {
        if (this.filteredInventory.length === 0) return;

        // Move Selection inside the Filtered List
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + 1);
        }
        
        // Confirm Equip
        else if (code === 'Enter' || code === 'Space') {
            const itemToEquip = this.filteredInventory[this.inventoryIndex];
            this.equipItem(itemToEquip);
        }
    }

    // =========================================================
    // LOGIC HELPERS
    // =========================================================

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        
        // Reset cursors for the new character
        this.slotIndex = 0;
        this.state = 'SLOTS';
        this.updateFilteredInventory();
    }

    /**
     * Updates 'this.filteredInventory' based on the currently selected Slot.
     * This drives the Right Column of the UI.
     */
    updateFilteredInventory() {
        const slotName = this.equipmentSlots[this.slotIndex];
        
        // [FIX] Filter robustly: Check both top-level .slot and .definition.slot
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
            
            // 1. Check Top Level (Standard Item Object)
            if (item.slot === slotName) return true;

            // 2. Check Nested Definition (Your Current Data Structure)
            if (item.definition && item.definition.slot === slotName) return true;

            return false;
        });

        // Reset inventory cursor if it's out of bounds
        this.inventoryIndex = 0;
    }

    /**
     * Helper to safely get the equipment object from the member
     */
    getEquipmentObject(member) {
        return (member.state && member.state.equipment) 
             ? member.state.equipment 
             : (member.equipment || {});
    }

    equipItem(inventoryItem) {
        const member = this.currentMember;
        const slotName = this.equipmentSlots[this.slotIndex];
        const equipmentObj = this.getEquipmentObject(member);

        // 1. Check existing equipment
        const currentEquip = equipmentObj[slotName];

        // 2. If something is equipped, put it back in the bag
        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
        }

        // 3. Equip the new item
        equipmentObj[slotName] = inventoryItem;

        // 4. Remove the new item from the bag
        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        // 5. Return control to the Slot Column
        this.state = 'SLOTS';
        this.updateFilteredInventory(); 

        // [FIX] Log name correctly regardless of structure
        const name = inventoryItem.name || (inventoryItem.definition ? inventoryItem.definition.name : "Item");
        console.log(`Equipped ${name} to ${slotName}`);
    }

    unequipCurrentSlot() {
        const member = this.currentMember;
        const slotName = this.equipmentSlots[this.slotIndex];
        const equipmentObj = this.getEquipmentObject(member);
        
        const currentEquip = equipmentObj[slotName];

        if (currentEquip) {
            // Move item to bag
            gameState.party.inventory.push(currentEquip);
            // Clear slot
            equipmentObj[slotName] = null;
            
            this.updateFilteredInventory(); 
            console.log(`Unequipped ${slotName}`);
        }
    }

    // =========================================================
    // DATA EXPORT (For Renderer)
    // =========================================================
    getState() {
        return {
            member: this.currentMember,
            slots: this.equipmentSlots,
            selectedSlotIndex: this.slotIndex,
            
            // UI State Flags
            isChoosingItem: (this.state === 'INVENTORY'),
            
            // Data for Right Column
            filteredInventory: this.filteredInventory,
            inventoryIndex: this.inventoryIndex
        };
    }
}
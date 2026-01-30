import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../../src/core/eventBus.js';
// [FIX] Added missing import
import { StatCalculator } from '../../../shared/systems/statCalculator.js';

const SLOT_ORDER = [
    'head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'
];

export class CharacterSummaryController {
    constructor(input, data) {
        this.memberIndex = data ? data.memberIndex : 0;
        
        // State tracking
        this.state = 'SLOTS'; 
        this.viewMode = 'STATS'; 
        
        // Scroll offset for the details panel
        this.detailsScrollOffset = 0;

        this.DEFAULT_SLOTS = [
            'head', 'torso', 'arms','legs', 'feet', 
            'mainHand', 'offHand', 'accessory'
        ];

        this.slotIndex = 0; 
        this.inventoryIndex = 0;
        this.filteredInventory = []; 
        
        this.updateActiveSlots();
    }

    // Handle Scroll Input
    handleScroll(delta) {
        // Adjust sensitivity
        const speed = 0.5; 
        this.detailsScrollOffset += delta * speed;

        // Clamp to top
        if (this.detailsScrollOffset < 0) this.detailsScrollOffset = 0;
        
        // Note: We cannot clamp the bottom here because the Controller 
        // doesn't know the content height. The Renderer will clamp it 
        // using the setter in getState() below.
    }

    get currentMember() { return gameState.party.members[this.memberIndex]; }
    get currentSlots() { return this.activeSlots; }

    updateActiveSlots() {
        const member = this.currentMember;
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const availableSlots = Object.keys(equipData);

        if (availableSlots.length > 0) {
            this.activeSlots = availableSlots.sort((a, b) => {
                const indexA = SLOT_ORDER.indexOf(a);
                const indexB = SLOT_ORDER.indexOf(b);
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
        } else {
            this.activeSlots = [...this.DEFAULT_SLOTS]; 
        }

        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = Math.max(0, this.activeSlots.length - 1);
        }
        
        // Reset scroll when changing slots/context
        this.detailsScrollOffset = 0;
        
        this.updateFilteredInventory();
    }

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        this.updateActiveSlots(); 
        this.state = 'SLOTS';
        this.detailsScrollOffset = 0; 
    }

    handleKeyDown(code) {
        if (code === 'Escape' || code === 'Backspace') {
            if (this.state === 'INVENTORY') {
                this.state = 'SLOTS'; 
            } else {
                events.emit('CHANGE_SCENE', { scene: 'party' });
            }
            return;
        }

        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            return;
        }

        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else if (this.state === 'INVENTORY') {
            this.handleInventoryNavigation(code);
        }
    }

    handleSlotNavigation(code) {
        if (code === 'Tab') {
            this.cycleMember(1);
            return;
        }
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
            this.updateFilteredInventory();
            this.detailsScrollOffset = 0; // Reset scroll on new item
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
            this.updateFilteredInventory();
            this.detailsScrollOffset = 0; 
        }
        else if (code === 'Enter' || code === 'Space') {
            if (this.filteredInventory.length > 0) {
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
                this.detailsScrollOffset = 0;
            } else {
                console.log("No items available for this slot.");
            }
        }
        else if (code === 'KeyX' || code === 'Delete') {
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(code) {
        if (this.filteredInventory.length === 0) return;

        if (code === 'ArrowUp' || code === 'KeyW') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
            this.detailsScrollOffset = 0;
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + 1);
            this.detailsScrollOffset = 0;
        }
        else if (code === 'Enter' || code === 'Space') {
            const itemToEquip = this.filteredInventory[this.inventoryIndex];
            this.equipItem(itemToEquip);
        }
    }

    updateFilteredInventory() {
        const slotName = this.activeSlots[this.slotIndex];
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
            if (item.slot === slotName) return true;
            if (item.definition && item.definition.slot === slotName) return true;
            return false;
        });
        this.inventoryIndex = 0;
    }

    getEquipmentObject(member) {
        return (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
    }

    ensureEquipmentState(member) {
        if (!member.state) member.state = {};
        if (!member.state.equipment) {
            member.state.equipment = Object.assign({}, member.equipment || {});
        }
        return member.state.equipment;
    }

    equipItem(inventoryItem) {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        
        const equipmentObj = this.ensureEquipmentState(member);
        const currentEquip = equipmentObj[slotName];

        if (currentEquip) gameState.party.inventory.push(currentEquip);
        
        equipmentObj[slotName] = inventoryItem;

        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) gameState.party.inventory.splice(bagIdx, 1);

        this.state = 'SLOTS';
        this.updateFilteredInventory(); 
    }

    unequipCurrentSlot() {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        
        const equipmentObj = this.ensureEquipmentState(member);
        const currentEquip = equipmentObj[slotName];

        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
            equipmentObj[slotName] = null;
            this.updateFilteredInventory(); 
        }
    }

    getSelectedItem() {
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } else {
            const slotName = this.activeSlots[this.slotIndex];
            const equip = this.getEquipmentObject(this.currentMember);
            return equip[slotName] || null;
        }
    }

    getState() {
        const self = this;
        const member = this.currentMember;
        
        // 1. Calculate Totals (Base + Gear + Traits)
        // This gives us the final values (e.g., maxHp: 70)
        const totalStats = StatCalculator.calculate(member);

        // 2. Determine Base Values
        // We look for the "naked" stats on the entity or its definition.
        // This ensures we have the starting point before gear/traits.
        const baseSource = member.baseStats || (member.definition ? member.definition.stats : {}) || {};
        
        const baseHp = baseSource.maxHp || baseSource.hp || 10;
        const baseStam = baseSource.maxStamina || baseSource.stamina || 10;
        const baseIns = baseSource.maxInsight || baseSource.insight || 0;

        // 3. Construct the Breakdown Object
        // We override the simple numbers with objects containing { base, bonus, total }
        const derivedStats = {
            ...totalStats, // Copy all other stats (Attack, Defense, etc.)
            
            maxHp: { 
                base: baseHp, 
                bonus: totalStats.maxHp - baseHp, 
                total: totalStats.maxHp 
            },
            maxStamina: { 
                base: baseStam, 
                bonus: totalStats.maxStamina - baseStam, 
                total: totalStats.maxStamina 
            },
            maxInsight: { 
                base: baseIns, 
                bonus: totalStats.maxInsight - baseIns, 
                total: totalStats.maxInsight 
            }
        };

        return {
            member: this.currentMember,
            slots: this.activeSlots,
            selectedSlotIndex: this.slotIndex,
            isChoosingItem: (this.state === 'INVENTORY'),
            filteredInventory: this.filteredInventory,
            inventoryIndex: this.inventoryIndex,
            viewMode: this.viewMode,
            focusedItem: this.getSelectedItem(),
            
            // [UPDATED] Pass the structured stats with breakdowns
            derivedStats: derivedStats,

            // Scroll syncing
            get scrollOffset() { 
                return self.detailsScrollOffset; 
            },
            set scrollOffset(val) { 
                self.detailsScrollOffset = val; 
            }
        };
    }
}
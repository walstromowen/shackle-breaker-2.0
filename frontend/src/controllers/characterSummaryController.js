import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../../src/core/eventBus.js';
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
        // doesn't know the content height. The Renderer will clamp it.
    }

    get currentMember() { return gameState.party.members[this.memberIndex]; }
    get currentSlots() { return this.activeSlots; }

    updateActiveSlots() {
        const member = this.currentMember;
        // [UPDATED] Use the getter from EntityModel
        const equipData = member.equipment || {}; 
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
            this.detailsScrollOffset = 0; 
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

    // [UPDATED] Use EntityModel methods for safety
    equipItem(inventoryItem) {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        
        // 1. Check if something is already there to return to inventory
        const currentEquip = member.equipment[slotName];
        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
        }
        
        // 2. Use Model method (handles Ability granting, etc)
        member.equipItem(slotName, inventoryItem);

        // 3. Remove new item from inventory
        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) gameState.party.inventory.splice(bagIdx, 1);

        this.state = 'SLOTS';
        this.updateFilteredInventory(); 
    }

    // [UPDATED] Use EntityModel methods for safety
    unequipCurrentSlot() {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            // 1. Return to inventory
            gameState.party.inventory.push(currentEquip);
            
            // 2. Use Model method (handles Ability removal)
            member.unequipItem(slotName);
            
            this.updateFilteredInventory(); 
        }
    }

    getSelectedItem() {
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } else {
            const slotName = this.activeSlots[this.slotIndex];
            // [UPDATED] Use getter
            return this.currentMember.equipment[slotName] || null;
        }
    }

    getState() {
        const self = this;
        const member = this.currentMember;
        
        // 1. Calculate Totals (Base + Gear + Traits)
        // Uses the new EntityModel .stats getter which calls StatCalculator
        const totalStats = member.stats;

        // 2. Determine Base Values
        // EntityModel stores the raw "Base" values in .state.stats
        // We fallback to definition or defaults just in case, but .state.stats should be authoritative
        const baseSource = member.state.stats || {};
        
        // The property names in state.stats are `maxHp`, `maxStamina`, `maxInsight`
        const baseHp = baseSource.maxHp || 10;
        const baseStam = baseSource.maxStamina || 10;
        const baseIns = baseSource.maxInsight || 0;

        // 3. Construct the Breakdown Object
        const derivedStats = {
            ...totalStats, 
            
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
            
            // Pass the structured stats with breakdowns
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
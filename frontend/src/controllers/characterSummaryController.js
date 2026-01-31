import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

const SLOT_ORDER = [
    'head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'
];

export class CharacterSummaryController {
    constructor(input, data) {
        this.memberIndex = data ? data.memberIndex : 0;
        
        this.state = 'SLOTS'; 
        this.viewMode = 'STATS'; 
        
        // Input State (Only data needed for the view to render tooltips)
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null; 

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

    // --- Input Handling ---

    handleMouseMove(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
    }

    handleHover(elementData) {
        this.hoveredElement = elementData;
    }

    // REFACTOR: No Renderer here. We only receive the ID of what was clicked.
    handleInteraction(elementId) {
        if (!elementId) return;

        // 1. Navigation
        if (elementId === 'BTN_PREV_CHAR') {
            this.cycleMember(-1);
            return;
        }
        if (elementId === 'BTN_NEXT_CHAR') {
            this.cycleMember(1);
            return;
        }
        if (elementId === 'BTN_BACK') {
            events.emit('CHANGE_SCENE', { scene: 'party' });
            return;
        }

        // 2. View Mode
        if (elementId === 'BTN_TAB_STATS') {
            this.viewMode = 'STATS';
            return;
        }
        if (elementId === 'BTN_TAB_ITEM') {
            this.viewMode = 'ITEM';
            return;
        }
        if (elementId === 'BTN_UNEQUIP') {
            this.unequipCurrentSlot();
            return;
        }

        // 3. Equipment Slots
        if (elementId.startsWith('SLOT_')) {
            const slotName = elementId.replace('SLOT_', '');
            const newIndex = this.activeSlots.indexOf(slotName);
            
            if (newIndex !== -1) {
                if (this.slotIndex === newIndex && this.state === 'SLOTS') {
                    if (this.filteredInventory.length > 0) {
                        this.state = 'INVENTORY';
                        this.inventoryIndex = 0;
                    }
                } else {
                    this.slotIndex = newIndex;
                    this.state = 'SLOTS';
                    this.updateFilteredInventory();
                    this.detailsScrollOffset = 0;
                }
            }
            return;
        }

        // 4. Inventory Items
        if (this.state === 'INVENTORY' && elementId.startsWith('INV_ITEM_')) {
            const idx = parseInt(elementId.split('_')[2], 10);
            if (!isNaN(idx) && idx < this.filteredInventory.length) {
                this.inventoryIndex = idx;
                this.equipItem(this.filteredInventory[idx]);
            }
        }
    }

    handleScroll(delta) {
        const speed = 20; 
        this.detailsScrollOffset += delta * speed;
        if (this.detailsScrollOffset < 0) this.detailsScrollOffset = 0;
    }

    // --- Logic & State ---

    get currentMember() { return gameState.party.members[this.memberIndex]; }
    get currentSlots() { return this.activeSlots; }

    updateActiveSlots() {
        const member = this.currentMember;
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
        if (code === 'Tab') { this.cycleMember(1); return; }
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
            this.equipItem(this.filteredInventory[this.inventoryIndex]);
        }
    }

    updateFilteredInventory() {
        if (!this.activeSlots[this.slotIndex]) return;
        const slotName = this.activeSlots[this.slotIndex];
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
            const iSlot = item.slot || (item.definition ? item.definition.slot : null);
            return iSlot === slotName;
        });
        this.inventoryIndex = 0;
    }

    equipItem(inventoryItem) {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        const currentEquip = member.equipment[slotName];
        
        if (currentEquip) gameState.party.inventory.push(currentEquip);
        member.equipItem(slotName, inventoryItem);
        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) gameState.party.inventory.splice(bagIdx, 1);

        this.state = 'SLOTS';
        this.updateFilteredInventory(); 
    }

    unequipCurrentSlot() {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
            member.unequipItem(slotName);
            this.updateFilteredInventory(); 
        }
    }

    getSelectedItem() {
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } else {
            const slotName = this.activeSlots[this.slotIndex];
            return this.currentMember.equipment[slotName] || null;
        }
    }

    getState() {
        const self = this;
        const member = this.currentMember; 
        const totalStats = member.stats;
        const baseSource = member.state.stats || {};
        const baseHp = baseSource.maxHp || 10;
        const baseStam = baseSource.maxStamina || 10;
        const baseIns = baseSource.maxInsight || 0;

        const derivedStats = {
            ...totalStats,
            maxHp: { base: baseHp, bonus: totalStats.maxHp - baseHp, total: totalStats.maxHp },
            maxStamina: { base: baseStam, bonus: totalStats.maxStamina - baseStam, total: totalStats.maxStamina },
            maxInsight: { base: baseIns, bonus: totalStats.maxInsight - baseIns, total: totalStats.maxInsight }
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
            derivedStats: derivedStats,
            mouse: this.mouse, 
            hoveredElement: this.hoveredElement, 
            get scrollOffset() { return self.detailsScrollOffset; },
            set scrollOffset(val) { self.detailsScrollOffset = val; }
        };
    }
}
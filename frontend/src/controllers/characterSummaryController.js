import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'];

export class CharacterSummaryController {
    constructor(input, data) {
        // --- Core Data ---
        this.memberIndex = data ? data.memberIndex : 0;
        
        // --- Navigation State ---
        this.state = 'SLOTS'; // 'SLOTS' | 'INVENTORY'
        this.viewMode = 'STATS'; // 'STATS' | 'ITEM'
        
        // --- Selection State ---
        this.activeSlots = [];
        this.slotIndex = 0;
        
        // --- Inventory State ---
        this.filteredInventory = [];
        this.inventoryIndex = 0;
        
        // --- Visual/Input State ---
        this.detailsScrollOffset = 0;
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null;

        // Initialize
        this.updateActiveSlots();
        this.setupInteractionHandlers();
    }

    /**
     * Map UI IDs to specific controller functions.
     * This replaces the giant if/else block in handleInteraction.
     */
    setupInteractionHandlers() {
        this.handlers = {
            'BTN_PREV_CHAR': () => this.cycleMember(-1),
            'BTN_NEXT_CHAR': () => this.cycleMember(1),
            'BTN_BACK': () => events.emit('CHANGE_SCENE', { scene: 'party' }),
            
            // Tabs
            'TAB_STATS': () => this.setViewMode('STATS'),
            'BTN_TAB_STATS': () => this.setViewMode('STATS'),
            'TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_TAB_ITEM': () => this.setViewMode('ITEM'),
            
            // Actions
            'BTN_UNEQUIP': () => this.unequipCurrentSlot(),
        };
    }

    // ========================================================
    // INPUT HANDLING
    // ========================================================

    handleMouseMove(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
    }

    handleHover(elementData) {
        this.hoveredElement = elementData;
    }

    handleInteraction(input) {
        if (!input) return;

        // Handle both simple string IDs and object payloads from Renderer
        const id = (typeof input === 'object' && input.id) ? input.id : input;
        
        // 1. Check Exact Matches (Buttons, Tabs)
        if (this.handlers[id]) {
            this.handlers[id]();
            return;
        }

        // 2. Check Dynamic Slots (SLOT_head, SLOT_torso, etc)
        if (id.startsWith('SLOT_')) {
            this.handleSlotClick(id.replace('SLOT_', ''));
            return;
        }

        // 3. Check Dynamic Inventory Items (INV_ITEM_0, INV_ITEM_1)
        if (this.state === 'INVENTORY' && id.startsWith('INV_ITEM_')) {
            const idx = parseInt(id.split('_')[2], 10);
            this.handleInventoryClick(idx);
            return;
        }
    }

    handleKeyDown(code) {
        // Global Esc/Back
        if (code === 'Escape' || code === 'Backspace') {
            if (this.state === 'INVENTORY') {
                this.state = 'SLOTS'; // Cancel item selection
            } else {
                events.emit('CHANGE_SCENE', { scene: 'party' }); // Exit scene
            }
            return;
        }

        // Tab Switching
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            return;
        }

        // Context-Specific Navigation
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else {
            this.handleInventoryNavigation(code);
        }
    }

    handleScroll(delta) {
        const speed = 20;
        this.detailsScrollOffset = Math.max(0, this.detailsScrollOffset + (delta * speed));
    }

    // ========================================================
    // LOGIC: NAVIGATION & SELECTION
    // ========================================================

    setViewMode(mode) {
        this.viewMode = mode;
        this.detailsScrollOffset = 0;
    }

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        
        // Reset state for new character
        this.state = 'SLOTS';
        this.detailsScrollOffset = 0;
        this.updateActiveSlots();
    }

    handleSlotClick(slotName) {
        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex === -1) return;

        // If clicking the ALREADY selected slot, toggle inventory selection
        if (this.slotIndex === newIndex && this.state === 'SLOTS') {
            if (this.filteredInventory.length > 0) {
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
            }
        } else {
            // Otherwise, just select the slot
            this.slotIndex = newIndex;
            this.state = 'SLOTS';
            this.updateFilteredInventory();
            this.detailsScrollOffset = 0;
        }
    }

    handleInventoryClick(idx) {
        if (!isNaN(idx) && idx < this.filteredInventory.length) {
            this.inventoryIndex = idx;
            this.equipItem(this.filteredInventory[idx]);
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

    // ========================================================
    // LOGIC: DATA & STATE MANAGEMENT
    // ========================================================

    get currentMember() { 
        return gameState.party.members[this.memberIndex]; 
    }

    updateActiveSlots() {
        const member = this.currentMember;
        if (!member) return;

        // Get slots defined on the character, or fallback to default
        const equipData = member.equipment || {}; 
        const availableSlots = Object.keys(equipData);

        if (availableSlots.length > 0) {
            // Sort slots based on standard UI order
            this.activeSlots = availableSlots.sort((a, b) => {
                const indexA = SLOT_ORDER.indexOf(a);
                const indexB = SLOT_ORDER.indexOf(b);
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
        } else {
            this.activeSlots = [...SLOT_ORDER]; 
        }

        // Validate index
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = 0;
        }

        this.updateFilteredInventory();
    }

    updateFilteredInventory() {
        const slotName = this.activeSlots[this.slotIndex];
        if (!slotName) {
            this.filteredInventory = [];
            return;
        }

        // Filter global inventory for items matching this slot
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
            // Handle both flat item objects and definition-based items
            const iSlot = item.slot || (item.definition ? item.definition.slot : null);
            return iSlot === slotName;
        });
        
        this.inventoryIndex = 0;
    }

    equipItem(inventoryItem) {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        
        // 1. Remove currently equipped item and return to bag
        const currentEquip = member.equipment[slotName];
        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
        }

        // 2. Remove new item from bag
        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        // 3. Equip new item
        member.equipItem(slotName, inventoryItem);

        // 4. Return control to Slot view
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

    /**
     * returns the item to be displayed in the detail panel
     */
    getFocusedItem() {
        // Priority 1: Mouse Hover
        if (this.hoveredElement && this.hoveredElement.type === 'item') {
            return this.hoveredElement.item;
        }

        // Priority 2: Inventory Selection
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } 
        
        // Priority 3: Equipment Slot Selection
        const slotName = this.activeSlots[this.slotIndex];
        return this.currentMember.equipment[slotName] || null;
    }

    /**
     * Prepares the View Model for the Renderer.
     * Calculates derived stats here so the View is purely presentation.
     */
    getState() {
        const member = this.currentMember; 
        
        // Calculate fresh stats (includes equipment bonuses)
        const computedStats = StatCalculator.calculate(member);

        // Create structure for Vitals display (Base vs Bonus)
        const baseSource = member.state ? member.state.stats : (member.attributes || {});
        
        const formatStat = (key, currentVal) => {
            const base = baseSource[key] || 0;
            return {
                base: base,
                bonus: (currentVal - base),
                total: currentVal
            };
        };

        const derivedStats = {
            ...computedStats,
            maxHp: formatStat('maxHp', computedStats.maxHp || member.maxHp),
            maxStamina: formatStat('maxStamina', computedStats.maxStamina || member.maxStamina),
            maxInsight: formatStat('maxInsight', computedStats.maxInsight || member.maxInsight)
        };

        return {
            member,
            derivedStats,
            
            // Selection / Navigation
            slots: this.activeSlots,
            selectedSlotIndex: this.slotIndex,
            isChoosingItem: (this.state === 'INVENTORY'),
            filteredInventory: this.filteredInventory,
            inventoryIndex: this.inventoryIndex,
            viewMode: this.viewMode,
            
            // Detail / Tooltip Data
            focusedItem: this.getFocusedItem(),
            scrollOffset: this.detailsScrollOffset,
            mouse: this.mouse,
            hoveredElement: this.hoveredElement
        };
    }
}
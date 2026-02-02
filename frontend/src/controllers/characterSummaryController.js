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
        this.inventoryScrollOffset = 0; // <--- NEW: Track inventory scroll
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null;

        // --- Layout Bridge ---
        this.layout = { 
            detailMaxScroll: 0,
            detailViewportH: 300,
            inventoryMaxScroll: 0, // <--- NEW: Defaults for inventory
            inventoryViewportH: 300 
        }; 
        
        this.dragState = {
            active: false,
            target: null, // <--- NEW: 'details' or 'inventory'
            startY: 0,
            startScroll: 0,
            wasMouseDown: false
        };

        // Initialize
        this.updateActiveSlots();
        this.setupInteractionHandlers();
    }

    /**
     * Map UI IDs to specific controller functions.
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

    handleMouseMove(x, y, isMouseDown) {
        this.mouse.x = x;
        this.mouse.y = y;

        // Detect fresh click
        const isClickStart = isMouseDown && !this.dragState.wasMouseDown;
        this.dragState.wasMouseDown = isMouseDown;

        // --- DRAG LOGIC ---
        if (!isMouseDown) {
            this.dragState.active = false;
            this.dragState.target = null;
        } 
        else if (this.dragState.active) {
            // 1. Calculate how far mouse moved
            const mouseDelta = y - this.dragState.startY;

            // 2. Determine Context (Inventory vs Details)
            let viewportH, maxScroll, currentStartScroll;
            
            if (this.dragState.target === 'inventory') {
                viewportH = this.layout.inventoryViewportH || 100;
                maxScroll = this.layout.inventoryMaxScroll || 1;
                currentStartScroll = this.dragState.startScroll;
            } else {
                // Default to details
                viewportH = this.layout.detailViewportH || 100;
                maxScroll = this.layout.detailMaxScroll || 1;
                currentStartScroll = this.dragState.startScroll;
            }

            const contentH = maxScroll + viewportH;

            // 3. Calculate Physics Ratio
            const scrollRatio = contentH / viewportH;

            // 4. Calculate New Offset
            let newOffset = currentStartScroll + (mouseDelta * scrollRatio);

            // 5. Clamp
            if (newOffset < 0) newOffset = 0;
            if (newOffset > maxScroll) newOffset = maxScroll;

            // 6. Apply back to state
            if (this.dragState.target === 'inventory') {
                this.inventoryScrollOffset = newOffset;
            } else {
                this.detailsScrollOffset = newOffset;
            }
        } 
        else if (isClickStart) {
            // --- NORMALIZE ID CHECK ---
            const targetId = this.hoveredElement && this.hoveredElement.id 
                ? this.hoveredElement.id 
                : this.hoveredElement;

            // CHECK: Details Scrollbar
            if (targetId === 'SCROLLBAR_THUMB') {
                this.dragState.active = true;
                this.dragState.target = 'details';
                this.dragState.startY = y;
                this.dragState.startScroll = this.detailsScrollOffset;
            }
            // CHECK: Inventory Scrollbar (NEW)
            else if (targetId === 'INV_SCROLLBAR_THUMB') {
                this.dragState.active = true;
                this.dragState.target = 'inventory';
                this.dragState.startY = y;
                this.dragState.startScroll = this.inventoryScrollOffset;
            }
        }
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
                // No resetScroll here usually, so user keeps place in list, 
                // but can be added if desired.
            } else {
                events.emit('CHANGE_SCENE', { scene: 'party' }); // Exit scene
            }
            return;
        }

        // Tab Switching
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            this.resetScroll();
            return;
        }

        // Context-Specific Navigation
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else {
            this.handleInventoryNavigation(code);
        }
    }

    /**
     * Handles Mouse Wheel Scrolling.
     * Note: Currently only supports Details panel. 
     * To support Inventory wheel, we'd need to detect hover context.
     */
    handleScroll(delta) {
        const mx = this.mouse.x;
        const my = this.mouse.y;
        const layout = this.layout;

        // 1. Check Inventory Panel Bounds
        if (layout.inventoryBounds && 
            mx >= layout.inventoryBounds.x && 
            mx <= layout.inventoryBounds.x + layout.inventoryBounds.w &&
            my >= layout.inventoryBounds.y && 
            my <= layout.inventoryBounds.y + layout.inventoryBounds.h) {
            
            const max = layout.inventoryMaxScroll || 0;
            // Add delta to current offset
            let newScroll = this.inventoryScrollOffset + delta;
            
            // Clamp
            this.inventoryScrollOffset = Math.max(0, Math.min(newScroll, max));
            return; // Stop here so we don't scroll both at once
        }

        // 2. Check Item Details Panel Bounds
        if (this.viewMode === 'ITEM' && layout.detailBounds && 
            mx >= layout.detailBounds.x && 
            mx <= layout.detailBounds.x + layout.detailBounds.w &&
            my >= layout.detailBounds.y && 
            my <= layout.detailBounds.y + layout.detailBounds.h) {
            
            const max = layout.detailMaxScroll || 0;
            let newScroll = this.detailsScrollOffset + delta;
            
            // Clamp
            this.detailsScrollOffset = Math.max(0, Math.min(newScroll, max));
        }
    }

    resetScroll() {
        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0; // Reset both on major context changes
    }

    // ========================================================
    // LOGIC: NAVIGATION & SELECTION
    // ========================================================

    setViewMode(mode) {
        this.viewMode = mode;
        this.resetScroll();
    }

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        
        // Reset state for new character
        this.state = 'SLOTS';
        this.resetScroll();
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
            this.resetScroll();
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
            this.resetScroll();
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
            this.updateFilteredInventory();
            this.resetScroll();
        }
        else if (code === 'Enter' || code === 'Space') {
            if (this.filteredInventory.length > 0) {
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
                // Don't reset scroll here so they keep their spot if they were browsing
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
            // Auto-scroll could be added here later
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + 1);
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

        const equipData = member.equipment || {}; 
        const availableSlots = Object.keys(equipData);

        if (availableSlots.length > 0) {
            this.activeSlots = availableSlots.sort((a, b) => {
                const indexA = SLOT_ORDER.indexOf(a);
                const indexB = SLOT_ORDER.indexOf(b);
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
        } else {
            this.activeSlots = [...SLOT_ORDER]; 
        }

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
        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
        }

        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        member.equipItem(slotName, inventoryItem);

        this.state = 'SLOTS';
        this.updateFilteredInventory();
        this.resetScroll();
    }

    unequipCurrentSlot() {
        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            gameState.party.inventory.push(currentEquip);
            member.unequipItem(slotName);
            this.updateFilteredInventory();
            this.resetScroll();
        }
    }

    getFocusedItem() {
        if (this.hoveredElement && this.hoveredElement.type === 'item') {
            return this.hoveredElement.item;
        }
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } 
        const slotName = this.activeSlots[this.slotIndex];
        return this.currentMember.equipment[slotName] || null;
    }

    getState() {
        const member = this.currentMember; 
        const computedStats = StatCalculator.calculate(member);
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
            
            slots: this.activeSlots,
            selectedSlotIndex: this.slotIndex,
            isChoosingItem: (this.state === 'INVENTORY'),
            filteredInventory: this.filteredInventory,
            inventoryIndex: this.inventoryIndex,
            viewMode: this.viewMode,
            
            focusedItem: this.getFocusedItem(),
            scrollOffset: this.detailsScrollOffset, 
            inventoryScrollOffset: this.inventoryScrollOffset, // <--- NEW: Pass to Renderer
            mouse: this.mouse,
            hoveredElement: this.hoveredElement,

            layout: this.layout 
        };
    }
}
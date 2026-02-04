import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'];

export class CharacterSummaryController {
    constructor(input, data) {
        this.memberIndex = data ? data.memberIndex : 0;
        
        this.state = 'SLOTS'; 
        this.viewMode = 'STATS'; 
        
        this.activeSlots = [];
        this.slotIndex = 0;
        
        this.filteredInventory = [];
        this.inventoryIndex = 0;
        
        this.heldItem = null; 

        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0; 
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null;

        // NEW: Store hitboxes to detect drops even if the item blocks the mouse
        this.lastRenderedHitboxes = [];

        this.layout = { 
            detailMaxScroll: 0,
            detailViewportH: 300,
            inventoryMaxScroll: 0, 
            inventoryViewportH: 300,
            inventoryBounds: null 
        }; 
        
        this.dragState = {
            active: false,
            target: null, 
            startY: 0,
            startScroll: 0,
            wasMouseDown: false
        };

        this.updateActiveSlots();
        this.setupInteractionHandlers();
    }

    setupInteractionHandlers() {
        this.handlers = {
            'BTN_PREV_CHAR': () => this.cycleMember(-1),
            'BTN_NEXT_CHAR': () => this.cycleMember(1),
            'BTN_BACK': () => events.emit('CHANGE_SCENE', { scene: 'party' }),
            'TAB_STATS': () => this.setViewMode('STATS'),
            'BTN_TAB_STATS': () => this.setViewMode('STATS'),
            'TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_UNEQUIP': () => this.unequipCurrentSlot(),
        };
    }

    // ========================================================
    // INPUT HANDLING
    // ========================================================

    handleMouseMove(x, y, isMouseDown) {
        this.mouse.x = x;
        this.mouse.y = y;

        const isClickStart = isMouseDown && !this.dragState.wasMouseDown;
        const isClickEnd = !isMouseDown && this.dragState.wasMouseDown; 
        
        this.dragState.wasMouseDown = isMouseDown;

        if (isClickEnd && this.heldItem) {
            this.handleMouseUp(x, y);
        }

        // Scrollbar Drag Logic
        if (!isMouseDown) {
            this.dragState.active = false;
            this.dragState.target = null;
        } 
        else if (this.dragState.active) {
            const mouseDelta = y - this.dragState.startY;
            let viewportH, maxScroll, currentStartScroll;
            
            if (this.dragState.target === 'inventory') {
                viewportH = this.layout.inventoryViewportH || 100;
                maxScroll = this.layout.inventoryMaxScroll || 1;
                currentStartScroll = this.dragState.startScroll;
            } else {
                viewportH = this.layout.detailViewportH || 100;
                maxScroll = this.layout.detailMaxScroll || 1;
                currentStartScroll = this.dragState.startScroll;
            }

            const contentH = maxScroll + viewportH;
            const scrollRatio = contentH / viewportH;
            let newOffset = currentStartScroll + (mouseDelta * scrollRatio);

            if (newOffset < 0) newOffset = 0;
            if (newOffset > maxScroll) newOffset = maxScroll;

            if (this.dragState.target === 'inventory') {
                this.inventoryScrollOffset = newOffset;
            } else {
                this.detailsScrollOffset = newOffset;
            }
        } 
        else if (isClickStart) {
            const targetId = this.hoveredElement && this.hoveredElement.id 
                ? this.hoveredElement.id 
                : this.hoveredElement;

            if (targetId === 'SCROLLBAR_THUMB') {
                this.dragState.active = true;
                this.dragState.target = 'details';
                this.dragState.startY = y;
                this.dragState.startScroll = this.detailsScrollOffset;
            }
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

    // NEW: Call this from the Renderer to sync positions
    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    handleInteraction(input) {
        if (!input) return;
        const id = (typeof input === 'object' && input.id) ? input.id : input;
        
        if (this.handlers[id]) {
            this.handlers[id]();
            return;
        }

        if (id.startsWith('SLOT_')) {
            // Handle both simple ID string or object with slotId
            const slotId = (input.slotId) ? input.slotId : id.replace('SLOT_', '');
            this.handleSlotClick(slotId);
            return;
        }

        if (id.startsWith('INV_ITEM_')) {
            const idx = parseInt(id.split('_')[2], 10);
            this.handleInventoryClick(idx);
            return;
        }
    }

    // ========================================================
    // LOGIC: DRAG & DROP
    // ========================================================

    handleMouseUp(x, y) {
        if (!this.heldItem) return;

        let dropTarget = this.hoveredElement ? this.hoveredElement.id : null;
        let slotName = this.hoveredElement ? this.hoveredElement.slotId : null;
        
        // --- 1. FALLBACK HITBOX CHECK ---
        // If the dropTarget is the dragged item itself (self-occlusion) or null,
        // we check coordinates against known slot hitboxes.
        const isBlocked = !dropTarget || dropTarget.startsWith('ITEM_') || dropTarget.startsWith('INV_ITEM');

        if (isBlocked && this.lastRenderedHitboxes.length > 0) {
            const hit = this.lastRenderedHitboxes.find(box => 
                (box.type === 'slot' || (box.id && box.id.startsWith('SLOT_'))) && 
                x >= box.x && x <= box.x + box.w &&
                y >= box.y && y <= box.y + box.h
            );
            
            if (hit) {
                dropTarget = hit.id;
                slotName = hit.slotId; // Use the specific slot ID from the hitbox
            }
        }

        // --- 2. EXECUTE DROP ---
        if (dropTarget && dropTarget.indexOf('SLOT_') === 0) {
            // Use slotName if available, otherwise robust extraction
            const finalSlot = slotName || dropTarget.substring(5);
            this._attemptEquipDrop(finalSlot);
        }
        else if (this._isMouseOverInventory(dropTarget)) {
            this._attemptInventoryDrop();
        }
        else {
            this._cancelDrag();
        }
    }

    _isMouseOverInventory(targetId) {
        if (targetId && (targetId.startsWith('INV_') || targetId === 'SCROLLBAR_INV')) {
            return true;
        }
        if (this.layout.inventoryBounds) {
            const { x, y, w, h } = this.layout.inventoryBounds;
            const mx = this.mouse.x;
            const my = this.mouse.y;
            return (mx >= x && mx <= x + w && my >= y && my <= y + h);
        }
        return false;
    }

    _cancelDrag() {
        this.heldItem = null;
        this.updateFilteredInventory();
    }

    _attemptEquipDrop(targetSlotRaw) {
        if (!this.heldItem) return;

        const item = this.heldItem.item;
        const def = item.definition || item;
        
        // --- 1. NORMALIZE STRINGS ---
        // Remove spaces (e.g., "Main Hand" -> "mainhand") for cleaner comparison
        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
        const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');

        // --- 2. VALIDATION CHECK ---
        const isValid = (itemSlot === slotKey) || 
                        (slotKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) ||
                        (slotKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon'));

        if (!isValid) {
            console.warn(`[EquipDrop] Invalid Slot. Item: ${itemSlot}, Target: ${slotKey}`);
            this._cancelDrag();
            return;
        }

        // --- 3. FIND CANONICAL SLOT NAME ---
        // Map back to 'MainHand' (or whatever is in activeSlots)
        const canonicalSlot = this.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;

        // --- 4. EXECUTE EQUIP ---
        this.equipItem(item, canonicalSlot);
        this.heldItem = null;
    }

    _attemptInventoryDrop() {
        if (!this.heldItem) return;

        if (this.heldItem.source === 'equipment') {
            const member = this.currentMember;
            const slot = this.heldItem.originSlot;
            
            member.equipment[slot] = null;
            gameState.party.inventory.push(this.heldItem.item);
        }
        
        this.heldItem = null;
        this.updateFilteredInventory();
    }

    // ========================================================
    // STANDARD NAVIGATION
    // ========================================================

    handleKeyDown(code) {
        if (code === 'Escape' || code === 'Backspace') {
            if (this.heldItem) {
                this._cancelDrag();
                return;
            }
            if (this.state === 'INVENTORY') {
                this.state = 'SLOTS'; 
            } else {
                events.emit('CHANGE_SCENE', { scene: 'party' }); 
            }
            return;
        }

        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            this.resetScroll();
            return;
        }

        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else {
            this.handleInventoryNavigation(code);
        }
    }

    handleScroll(delta) {
        const mx = this.mouse.x;
        const my = this.mouse.y;
        const layout = this.layout;

        if (layout.inventoryBounds && 
            mx >= layout.inventoryBounds.x && 
            mx <= layout.inventoryBounds.x + layout.inventoryBounds.w &&
            my >= layout.inventoryBounds.y && 
            my <= layout.inventoryBounds.y + layout.inventoryBounds.h) {
            
            const max = layout.inventoryMaxScroll || 0;
            let newScroll = this.inventoryScrollOffset + delta;
            this.inventoryScrollOffset = Math.max(0, Math.min(newScroll, max));
            return; 
        }

        if (this.viewMode === 'ITEM' && layout.detailBounds && 
            mx >= layout.detailBounds.x && 
            mx <= layout.detailBounds.x + layout.detailBounds.w &&
            my >= layout.detailBounds.y && 
            my <= layout.detailBounds.y + layout.detailBounds.h) {
            
            const max = layout.detailMaxScroll || 0;
            let newScroll = this.detailsScrollOffset + delta;
            this.detailsScrollOffset = Math.max(0, Math.min(newScroll, max));
        }
    }

    resetScroll() {
        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0; 
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.resetScroll();
    }

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        this.state = 'SLOTS';
        this.heldItem = null;
        this.resetScroll();
        this.updateActiveSlots();
    }

    handleSlotClick(slotName) {
        if (this.heldItem) {
            this._attemptEquipDrop(slotName);
            return;
        }

        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex === -1) return;

        const member = this.currentMember;
        const currentEquip = member.equipment[slotName];

        this.slotIndex = newIndex;
        this.state = 'SLOTS';
        this.updateFilteredInventory();
        this.resetScroll();

        if (currentEquip) {
            this.heldItem = {
                item: currentEquip,
                source: 'equipment',
                originSlot: slotName
            };
            this.viewMode = 'ITEM';
        }
    }

    handleInventoryClick(idx) {
        if (isNaN(idx) || idx >= this.filteredInventory.length) return;
        
        if (this.heldItem) {
            this._attemptInventoryDrop();
            return;
        }

        const targetItem = this.filteredInventory[idx];
        if (targetItem) {
            this.heldItem = {
                item: targetItem,
                source: 'inventory',
                originIndex: idx,
                realIndex: gameState.party.inventory.indexOf(targetItem)
            };
            
            this.inventoryIndex = idx;
            this.state = 'INVENTORY';
            this.viewMode = 'ITEM';
            
            this.updateFilteredInventory(); 
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
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + 1);
        }
        else if (code === 'Enter' || code === 'Space') {
            this.equipItem(this.filteredInventory[this.inventoryIndex]);
        }
    }

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
                const indexALower = SLOT_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
                const indexBLower = SLOT_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
                
                const finalA = (indexA !== -1) ? indexA : (indexALower !== -1 ? indexALower : 99);
                const finalB = (indexB !== -1) ? indexB : (indexBLower !== -1 ? indexBLower : 99);

                return finalA - finalB;
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

            if (this.heldItem && this.heldItem.source === 'inventory' && this.heldItem.item === item) {
                return false;
            }

            const iSlot = item.slot || (item.definition ? item.definition.slot : null);
            const slotKey = slotName.toLowerCase();
            const itemKey = (iSlot || '').toLowerCase();
            
            if (itemKey === slotKey) return true;
            if (slotKey === 'mainhand' && (itemKey === 'weapon' || itemKey === 'tool')) return true;
            if (slotKey === 'offhand' && (itemKey === 'shield' || itemKey === 'weapon')) return true;
            
            return false;
        });
        
        if (this.inventoryIndex >= this.filteredInventory.length) {
            this.inventoryIndex = 0;
        }
    }

    equipItem(inventoryItem, targetSlotOverride = null) {
        const member = this.currentMember;
        
        let slotName = targetSlotOverride || this.activeSlots[this.slotIndex];
        
        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
        }

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
        if (this.heldItem) return this.heldItem.item;
        
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
            inventoryScrollOffset: this.inventoryScrollOffset,
            mouse: this.mouse,
            hoveredElement: this.hoveredElement,
            heldItem: this.heldItem, 
            layout: this.layout,
            
            // NEW: Export dropTarget so Renderer can distinguish "Selected" vs "Hovered"
            dropTarget: this.heldItem ? this.hoveredElement : null,

            // NEW: Callback for Renderer to report hitboxes back to Controller
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
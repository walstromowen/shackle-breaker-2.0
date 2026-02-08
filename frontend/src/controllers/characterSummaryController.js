import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { ItemDefinitions } from '../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'];

export class CharacterSummaryController {
    constructor(input, data) {
        this.memberIndex = data ? data.memberIndex : 0;
        
        this.state = 'SLOTS'; 
        this.viewMode = 'STATS'; 
        
        this.activeSlots = [];
        this.slotIndex = -1; 
        
        this.filteredInventory = [];
        this.inventoryIndex = -1; 
        
        // --- GRID CONFIGURATION ---
        this.COLS = 4; 
        
        // INTERACTION STATES
        this.heldItem = null; 
        this.potentialDrag = null; 
        this.pendingSlotClick = null; 
        this.DRAG_THRESHOLD_SQ = 25; 

        // Context Menu State
        this.contextMenu = null; 

        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0; 
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null;

        this.lastRenderedHitboxes = [];

        this.layout = { 
            detailMaxScroll: 0,
            detailViewportH: 300,
            inventoryMaxScroll: 0, 
            inventoryViewportH: 300,
            inventoryBounds: null,
            itemHeight: 48 
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
            'BTN_BACK': () => this._handleBack(),
            'BTN_UNEQUIP': () => this.unequipCurrentSlot(),
            // Tabs
            'TAB_STATS': () => this.setViewMode('STATS'),
            'BTN_TAB_STATS': () => this.setViewMode('STATS'),
            'TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_TAB_ITEM': () => this.setViewMode('ITEM'),
        };
    }

    // ========================================================
    // CONTEXT MENU LOGIC
    // ========================================================

    handleRightClick(input) {
        if (this.contextMenu) {
            this.contextMenu = null;
        }

        if (!input) return;
        const id = (typeof input === 'object' && input.id) ? input.id : input;
        
        if (id.startsWith('SLOT_')) {
            const slotName = (typeof input === 'object' && input.slotId) ? input.slotId : id.replace('SLOT_', '');
            const item = this.currentMember.equipment[slotName];
            if (item) this._openContextMenu(item, 'equipment', slotName);
        }
        else if (id.startsWith('INV_ITEM_')) {
            const idx = parseInt(id.split('_')[2], 10);
            const item = this.filteredInventory[idx];
            if (item) this._openContextMenu(item, 'inventory', idx);
        }
    }

    _openContextMenu(item, source, sourceKey) {
        const options = [];
        const isStackable = (item.qty !== undefined && item.qty > 1);

        if (source === 'equipment') {
            // Guard: Only show Equip (swap) if there are items to swap with
            if (this.filteredInventory.length > 0) {
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

        // --- POSITION CALCULATION START ---
        let menuX = this.mouse.x || 100;
        let menuY = this.mouse.y || 100;

        let targetId = null;
        if (source === 'equipment') {
            targetId = `SLOT_${sourceKey}`;
        } else if (source === 'inventory') {
            targetId = `INV_ITEM_${sourceKey}`;
        }

        if (targetId && this.lastRenderedHitboxes.length > 0) {
            const hit = this.lastRenderedHitboxes.find(h => h.id === targetId);
            if (hit) {
                menuX = Math.floor(hit.x + (hit.w / 2));
                menuY = Math.floor(hit.y + (hit.h / 2));
            }
        }
        // --- POSITION CALCULATION END ---

        this.contextMenu = {
            x: menuX,
            y: menuY,
            item: item,
            source,
            sourceKey,
            options,
            selectedIndex: 0
        };
    }

    handleMenuAction(actionIndex) {
        if (!this.contextMenu) return;
        
        const { item, source, sourceKey, options } = this.contextMenu;
        
        // Safety check if index is out of bounds (though unlikely)
        if (!options[actionIndex]) {
            this.contextMenu = null;
            return;
        }

        const action = options[actionIndex].action;

        // --- NAVIGATION ACTIONS ---
        if (action === 'NAV_TO_INV') {
            this.state = 'INVENTORY';
            this.inventoryIndex = 0;
            this.scrollToItem(0);
        }
        else if (action === 'UNEQUIP_AND_NAV') {
            const defId = item.defId;
            
            this.currentMember.unequipItem(sourceKey);
            InventorySystem.addItem(defId, item.qty);
            
            this.updateFilteredInventory();
            
            const newIndex = this._findNewestInventoryIndex(defId);
            
            this.state = 'INVENTORY';
            this.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
            this.scrollToItem(this.inventoryIndex, true);
        }
        
        // --- STANDARD ACTIONS ---
        else if (action === 'EQUIP') {
            this.equipItem(item); 
        }
        else if (action === 'DROP_ONE' || action === 'DROP_ALL') {
            this._handleDropAction(action, item, source, sourceKey);
        }

        this.contextMenu = null;
        this.updateFilteredInventory();
    }

    _handleDropAction(action, item, source, sourceKey) {
        let qtyToRemove = 1;
        if (action === 'DROP_ALL') {
            qtyToRemove = item.qty || 1;
        }

        if (source === 'equipment') {
            this.currentMember.equipment[sourceKey] = null;
            if (item.qty > qtyToRemove) {
                item.qty -= qtyToRemove;
                this.currentMember.equipment[sourceKey] = item;
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
        
        return this.activeSlots.some(s => {
            const slotKey = s.toLowerCase().replace(/\s/g, '');
            return (itemSlot === slotKey) || 
                   (slotKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) ||
                   (slotKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon'));
        });
    }

    // ========================================================
    // INPUT HANDLING
    // ========================================================

    handleKeyDown(code) {
        // --- PRIORITY 1: CONTEXT MENU NAVIGATION ---
        if (this.contextMenu) {
            const len = this.contextMenu.options.length;
            
            if (code === 'Escape') {
                this.contextMenu = null;
                return;
            }
            if (code === 'ArrowUp' || code === 'KeyW') {
                this.contextMenu.selectedIndex = (this.contextMenu.selectedIndex - 1 + len) % len;
                return;
            }
            if (code === 'ArrowDown' || code === 'KeyS') {
                this.contextMenu.selectedIndex = (this.contextMenu.selectedIndex + 1) % len;
                return;
            }
            if (code === 'Space' || code === 'Enter') {
                this.handleMenuAction(this.contextMenu.selectedIndex);
                return;
            }
            return; 
        }

        // --- PRIORITY 2: DRAGGING / BACK ---
        if (code === 'Escape' || code === 'Backspace') {
            this._handleBack();
            return;
        }

        // --- PRIORITY 3: GLOBAL TABS (Q/E) ---
        if (code === 'KeyQ') { this.cycleMember(-1); return; }
        if (code === 'KeyE') { this.cycleMember(1); return; }

        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            return;
        }

        // --- PRIORITY 4: STANDARD NAV ---
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(code);
        } else {
            this.handleInventoryNavigation(code);
        }
    }

    _handleBack() {
        if (this.heldItem) {
            this._cancelDrag();
            return;
        }
        
        if (this.state === 'INVENTORY') {
            this.state = 'SLOTS'; 
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        } else {
            events.emit('CHANGE_SCENE', { scene: 'party' }); 
        }
    }

    handleSlotNavigation(code) {
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
        }
        else if (code === 'Enter' || code === 'Space') {
            const slotName = this.activeSlots[this.slotIndex];
            const item = this.currentMember.equipment[slotName];

            if (item) {
                this._openContextMenu(item, 'equipment', slotName);
            } else {
                // GUARD: Don't activate inventory mode if empty
                if (this.filteredInventory.length === 0) return;

                this._activateSlotButDontFilter(slotName);
            }
        }
        else if (code === 'KeyX' || code === 'Delete') {
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(code) {
        if (this.filteredInventory.length === 0) return;

        if (code === 'ArrowUp' || code === 'KeyW') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - this.COLS);
            this.scrollToItem(this.inventoryIndex, false);
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + this.COLS);
            this.scrollToItem(this.inventoryIndex, false);
        }
        else if (code === 'ArrowLeft' || code === 'KeyA') {
             this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
             this.scrollToItem(this.inventoryIndex, false);
        }
        else if (code === 'ArrowRight' || code === 'KeyD') {
             this.inventoryIndex = Math.min(this.filteredInventory.length - 1, this.inventoryIndex + 1);
             this.scrollToItem(this.inventoryIndex, false);
        }
        else if (code === 'Enter' || code === 'Space') {
            const item = this.filteredInventory[this.inventoryIndex];
            if (item) {
                this._openContextMenu(item, 'inventory', this.inventoryIndex);
            }
        }
    }

    // ========================================================
    // MOUSE & DRAG HANDLING
    // ========================================================

    handleMouseMove(x, y, isMouseDown) {
        this.mouse.x = x;
        this.mouse.y = y;

        if (this.contextMenu) return;

        if (this.potentialDrag && !this.heldItem) {
            const dx = x - this.potentialDrag.startX;
            const dy = y - this.potentialDrag.startY;
            
            if ((dx * dx) + (dy * dy) > this.DRAG_THRESHOLD_SQ) {
                this.heldItem = this.potentialDrag; 
                this.potentialDrag = null;
                this.pendingSlotClick = null;
                this.updateFilteredInventory();
            }
        }

        const isClickStart = isMouseDown && !this.dragState.wasMouseDown;
        const isClickEnd = !isMouseDown && this.dragState.wasMouseDown; 
        
        this.dragState.wasMouseDown = isMouseDown;

        if (isClickEnd) {
            this.handleMouseUp(x, y);
        }

        if (isClickStart) {
            this.handleMouseDown(x, y);
        }
        
        if (this.dragState.active && isMouseDown) {
            this.handleScrollDrag(y);
        } else if (!isMouseDown) {
            this.dragState.active = false;
        }
    }

    handleMouseDown(x, y) {
        const targetId = this.hoveredElement ? (this.hoveredElement.id || this.hoveredElement) : null;

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
        else if (!targetId) {
             this.deselectSlot();
        }
    }

    handleScrollDrag(y) {
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

    handleMouseUp(x, y) {
        if (this.contextMenu) return;

        if (this.pendingSlotClick) {
            this.pendingSlotClick = null;
        }

        if (this.heldItem) {
            this.handleItemDrop(x, y);
        }
        
        this.potentialDrag = null;
    }

    handleItemDrop(x, y) {
        let dropTarget = this.hoveredElement ? this.hoveredElement.id : null;
        let slotName = this.hoveredElement ? this.hoveredElement.slotId : null;
        
        if ((!dropTarget || dropTarget.startsWith('ITEM_') || dropTarget.startsWith('INV_ITEM')) && this.lastRenderedHitboxes.length > 0) {
            const hit = this.lastRenderedHitboxes.find(box => 
                (box.type === 'slot' || (box.id && box.id.startsWith('SLOT_'))) && 
                x >= box.x && x <= box.x + box.w &&
                y >= box.y && y <= box.y + box.h
            );
            
            if (hit) {
                dropTarget = hit.id;
                slotName = hit.slotId; 
            }
        }

        if (dropTarget && dropTarget.indexOf('SLOT_') === 0) {
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

    handleHover(elementData) {
        this.hoveredElement = elementData;
    }

    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    handleInteraction(input) {
        if (!input) return;
        const id = (typeof input === 'object' && input.id) ? input.id : input;
        
        if (this.contextMenu) {
            if (id.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(id.split('_')[2], 10);
                this.handleMenuAction(optIndex);
                return;
            }
            // If clicking elsewhere while menu is open, close it
            this.contextMenu = null;
        }

        if (this.handlers[id]) {
            this.handlers[id]();
            return;
        }

        if (id.startsWith('SLOT_')) {
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
    // LOGIC HELPERS
    // ========================================================

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
        this.potentialDrag = null;
        this.updateFilteredInventory();
    }

    _attemptEquipDrop(targetSlotRaw) {
        if (!this.heldItem) return;

        const item = this.heldItem.item;
        const def = ItemDefinitions[item.defId]; 
        
        if (!def) {
            this._cancelDrag();
            return;
        }

        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
        const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');

        const isValid = (itemSlot === slotKey) || 
                        (slotKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) ||
                        (slotKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon'));

        if (!isValid) {
            this._cancelDrag();
            return;
        }

        const canonicalSlot = this.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;

        // --- DUPLICATION FIX START ---
        if (this.heldItem.source === 'equipment') {
            const originSlot = this.heldItem.originSlot;
            
            if (originSlot === canonicalSlot) {
                this._cancelDrag();
                return;
            }

            this.currentMember.equipment[originSlot] = null;
            this.equipItem(item, canonicalSlot);
            this.heldItem = null;
            return;
        }
        // --- DUPLICATION FIX END ---

        this.equipItem(item, canonicalSlot);
        this.heldItem = null;
    }

    _attemptInventoryDrop() {
        if (!this.heldItem) return;

        // Handle Unequip (Equipment -> Inventory)
        if (this.heldItem.source === 'equipment') {
            const member = this.currentMember;
            const slot = this.heldItem.originSlot;
            const item = this.heldItem.item;
            const defId = item.defId;

            // Perform unequip
            member.equipment[slot] = null;
            InventorySystem.addItem(defId, item.qty);
            
            this.heldItem = null;
            this.updateFilteredInventory();

            // FIX: Search backwards to find the item that was just added to the end
            const newIndex = this._findNewestInventoryIndex(defId);
            
            this.state = 'INVENTORY';
            this.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
            this.slotIndex = -1; 
            this.scrollToItem(this.inventoryIndex, true);
            return;
        }

        // Handle Inventory -> Inventory
        this.heldItem = null;
        this.updateFilteredInventory();
    }

    _findNewestInventoryIndex(defId) {
        for (let i = this.filteredInventory.length - 1; i >= 0; i--) {
            if (this.filteredInventory[i].defId === defId) {
                return i;
            }
        }
        return -1;
    }

    // ========================================================
    // STATE & DATA MANAGEMENT
    // ========================================================

    scrollToItem(index, center = false) {
        if (index < 0 || index >= this.filteredInventory.length) return;

        const ROW_H = this.layout.itemHeight || 48; 
        const VIEW_H = this.layout.inventoryViewportH || 300;
        
        const rowIndex = Math.floor(index / this.COLS);
        const totalRows = Math.ceil(this.filteredInventory.length / this.COLS);

        const contentHeight = totalRows * ROW_H;
        this.layout.inventoryMaxScroll = Math.max(0, contentHeight - VIEW_H);
        
        const itemTop = rowIndex * ROW_H;
        const itemBottom = itemTop + ROW_H;

        if (center) {
            const itemCenter = itemTop + (ROW_H / 2);
            const viewCenter = VIEW_H / 2;
            this.inventoryScrollOffset = itemCenter - viewCenter;
        } 
        else {
            if (itemTop < this.inventoryScrollOffset) {
                this.inventoryScrollOffset = itemTop;
            }
            else if (itemBottom > this.inventoryScrollOffset + VIEW_H) {
                this.inventoryScrollOffset = itemBottom - VIEW_H;
            }
        }
        
        this.inventoryScrollOffset = Math.max(0, Math.min(this.inventoryScrollOffset, this.layout.inventoryMaxScroll));
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
    }

    cycleMember(direction) {
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        this.state = 'SLOTS';
        this.heldItem = null;
        this.potentialDrag = null; 
        this.pendingSlotClick = null;
        this.contextMenu = null; 
        this.inventoryIndex = -1;
        this.resetScroll();
        this.updateActiveSlots();
    }

    handleSlotClick(slotName) {
        if (this.heldItem) {
            this._attemptEquipDrop(slotName);
            return;
        }

        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
            this.state = 'SLOTS'; 
            this.inventoryIndex = -1;
        }

        const member = this.currentMember;
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            this.pendingSlotClick = slotName;
            this.potentialDrag = {
                item: currentEquip,
                source: 'equipment',
                originSlot: slotName,
                startX: this.mouse.x,
                startY: this.mouse.y
            };
        } 
    }

    _activateSlotButDontFilter(slotName) {
        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
        }
        
        this.state = 'INVENTORY';
        if (this.filteredInventory.length > 0) {
            this.inventoryIndex = 0;
            this.scrollToItem(0);
        }
    }

    deselectSlot() {
        const hasSelection = (this.slotIndex !== -1 || this.inventoryIndex !== -1);
        if (hasSelection) {
            this.slotIndex = -1;
            this.state = 'SLOTS';
            this.inventoryIndex = -1; 
            this.updateFilteredInventory();
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
            this.inventoryIndex = idx;
            this.state = 'INVENTORY';
            
            this.updateFilteredInventory(); 

            this.potentialDrag = {
                item: targetItem,
                source: 'inventory',
                originIndex: idx,
                realIndex: gameState.party.inventory.indexOf(targetItem),
                startX: this.mouse.x,
                startY: this.mouse.y
            };
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
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
            // Hide item being dragged
            if (this.heldItem && this.heldItem.source === 'inventory' && this.heldItem.item === item) {
                return false;
            }
            return true;
        });

        if (this.inventoryIndex >= this.filteredInventory.length) {
            this.inventoryIndex = Math.max(0, this.filteredInventory.length - 1);
        }
        
        if (this.filteredInventory.length === 0) {
            this.inventoryIndex = -1;
        }

        const ROW_H = this.layout.itemHeight || 48;
        const VIEW_H = this.layout.inventoryViewportH || 300;
        
        const totalRows = Math.ceil(this.filteredInventory.length / this.COLS);
        const contentHeight = totalRows * ROW_H;
        
        this.layout.inventoryMaxScroll = Math.max(0, contentHeight - VIEW_H);
        this.inventoryScrollOffset = Math.max(0, Math.min(this.inventoryScrollOffset, this.layout.inventoryMaxScroll));
    }

    equipItem(inventoryItem, targetSlotOverride = null) {
        const member = this.currentMember;
        let slotName = targetSlotOverride;
        const def = ItemDefinitions[inventoryItem.defId];

        if (!slotName) {
            const itemSlot = def ? (def.slot || def.type || '').toLowerCase() : '';
            
            slotName = this.activeSlots.find(s => {
                const sKey = s.toLowerCase();
                if (sKey === itemSlot) return true;
                if (sKey === 'mainhand' && (itemSlot === 'weapon' || itemSlot === 'tool')) return true;
                if (sKey === 'offhand' && (itemSlot === 'shield' || itemSlot === 'weapon')) return true;
                return false;
            });
            
            if (!slotName) {
                console.warn("Could not auto-determine slot for item.");
                return;
            }
        }
        
        const currentEquip = member.equipment[slotName];
        
        // --- DUPLICATION SAFETY ---
        if (currentEquip && currentEquip !== inventoryItem) {
            InventorySystem.addItem(currentEquip.defId, currentEquip.qty);
        }

        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        member.equipItem(slotName, inventoryItem);

        // Focus logic
        const newSlotIndex = this.activeSlots.indexOf(slotName);
        if (newSlotIndex !== -1) {
            this.slotIndex = newSlotIndex;
        }

        this.state = 'SLOTS';
        this.inventoryIndex = -1; 
        this.updateFilteredInventory();
    }

    unequipCurrentSlot() {
        if (this.slotIndex === -1) return;

        const member = this.currentMember;
        const slotName = this.activeSlots[this.slotIndex];
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            member.unequipItem(slotName);
            InventorySystem.addItem(currentEquip.defId, currentEquip.qty || 1);
            
            this.state = 'SLOTS';
            this.inventoryIndex = -1; 

            this.updateFilteredInventory();
        }
    }

    getFocusedItem() {
        if (this.contextMenu) return this.contextMenu.item;
        if (this.heldItem) return this.heldItem.item;
        
        if (this.hoveredElement && this.hoveredElement.type === 'item') {
            return this.hoveredElement.item;
        }
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        } 
        
        if (this.slotIndex !== -1) {
            const slotName = this.activeSlots[this.slotIndex];
            return this.currentMember.equipment[slotName] || null;
        }

        return null;
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

        const viewSelectedSlot = (this.state === 'INVENTORY') ? -1 : this.slotIndex;

        return {
            member,
            derivedStats,
            slots: this.activeSlots,
            selectedSlotIndex: viewSelectedSlot,
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
            contextMenu: this.contextMenu,
            dropTarget: this.heldItem ? this.hoveredElement : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
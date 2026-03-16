import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { ItemDefinitions } from '../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';
import { DragAndDropManager } from '../ui/dragAndDropManager.js';
import { ScrollManager } from '../ui/scrollManager.js';
import { ContextMenuManager } from '../ui/contextMenuManager.js'; // Added import

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'];

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL',
    'KeyQ': 'PREV_CHAR', 'KeyE': 'NEXT_CHAR',
    'ShiftLeft': 'TOGGLE_VIEW', 'ShiftRight': 'TOGGLE_VIEW',
    'KeyX': 'DELETE', 'Delete': 'DELETE'
};

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

        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0; 
        this.mouse = { x: 0, y: 0 };
        this.hoveredElement = null;
        this.wasMouseDown = false; 

        this.lastRenderedHitboxes = [];

        this.layout = { 
            detailMaxScroll: 0,
            detailViewportH: 300,
            inventoryMaxScroll: 0, 
            inventoryViewportH: 300,
            inventoryBounds: null,
            detailBounds: null,
            itemHeight: 48 
        }; 

        // Initialize Managers
        this.dragAndDropManager = new DragAndDropManager(this);
        this.scrollManager = new ScrollManager(this);
        this.contextMenuManager = new ContextMenuManager(this);

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
    // INPUT HANDLING
    // ========================================================

    handleRightClick(input) {
        this.contextMenuManager.handleRightClick(input);
    }

    handleKeyDown(code) {
        const intent = KEY_BINDINGS[code];
        if (!intent) return; // Ignore unbound keys

        // 1. Context Menu steals focus if open
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.handleMenuNavigation(intent);
            return;
        }

        // 2. Global Level Actions
        if (intent === 'CANCEL') return this._handleBack();
        if (intent === 'PREV_CHAR') return this.cycleMember(-1);
        if (intent === 'NEXT_CHAR') return this.cycleMember(1);
        if (intent === 'TOGGLE_VIEW') {
            this.viewMode = (this.viewMode === 'STATS') ? 'ITEM' : 'STATS';
            return;
        }

        // 3. State-Specific Navigation
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(intent);
        } else {
            this.handleInventoryNavigation(intent);
        }
    }

    _handleBack() {
        if (this.heldItem) {
            this.dragAndDropManager.cancelDrag();
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

    handleSlotNavigation(intent) {
        if (intent === 'UP') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
        } 
        else if (intent === 'DOWN') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
        }
        else if (intent === 'CONFIRM') {
            const slotName = this.activeSlots[this.slotIndex];
            const item = this.currentMember.equipment[slotName];

            if (item) {
                this.contextMenuManager._openContextMenu(item, 'equipment', slotName);
            } else if (this.filteredInventory.length > 0) {
                this._activateSlotButDontFilter(slotName);
            }
        }
        else if (intent === 'DELETE') {
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(intent) {
        if (this.filteredInventory.length === 0) return;

        const maxIndex = this.filteredInventory.length - 1;

        if (intent === 'UP') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - this.COLS);
        } 
        else if (intent === 'DOWN') {
            this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + this.COLS);
        }
        else if (intent === 'LEFT') {
             this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
        }
        else if (intent === 'RIGHT') {
             this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + 1);
        }
        else if (intent === 'CONFIRM') {
            const item = this.filteredInventory[this.inventoryIndex];
            if (item) this.contextMenuManager._openContextMenu(item, 'inventory', this.inventoryIndex);
            return; // Exit early so we don't trigger scroll updates
        }

        // Only scroll if we actually moved
        if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
            this.scrollToItem(this.inventoryIndex, false);
        }
    }

    // ========================================================
    // MOUSE & DRAG HANDLING
    // ========================================================

    handleMouseMove(x, y, isMouseDown) {
        this.mouse.x = x;
        this.mouse.y = y;

        if (this.contextMenuManager.menu) return;

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

        const isClickStart = isMouseDown && !this.wasMouseDown;
        const isClickEnd = !isMouseDown && this.wasMouseDown; 
        
        this.wasMouseDown = isMouseDown;

        if (isClickEnd) {
            this.handleMouseUp(x, y);
        }

        if (isClickStart) {
            this.handleMouseDown(x, y);
        }
        
        // Delegate scroll dragging
        this.scrollManager.handleMouseMove(y, isMouseDown);
    }

    handleMouseDown(x, y) {
        const targetId = this.hoveredElement ? (this.hoveredElement.id || this.hoveredElement) : null;

        const handledByScroll = this.scrollManager.handleMouseDown(targetId, y);
        
        if (!handledByScroll && !targetId) {
             this.deselectSlot();
        }
    }

    handleMouseUp(x, y) {
        if (this.contextMenuManager.menu) return;

        if (this.pendingSlotClick) {
            this.pendingSlotClick = null;
        }

        if (this.heldItem) {
            this.dragAndDropManager.handleItemDrop(x, y);
        }
        
        this.potentialDrag = null;
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
        
        if (this.contextMenuManager.menu) {
            if (id.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(id.split('_')[2], 10);
                this.contextMenuManager.handleMenuAction(optIndex);
                return;
            }
            this.contextMenuManager.menu = null;
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

    // Scroll API proxies
    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(delta);
    }

    scrollToItem(index, center = false) {
        this.scrollManager.scrollToItem(index, center);
    }

    resetScroll() {
        this.scrollManager.resetScroll();
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
        this.contextMenuManager.menu = null; 
        this.inventoryIndex = -1;
        this.resetScroll();
        this.updateActiveSlots();
    }

    handleSlotClick(slotName) {
        if (this.heldItem) {
            this.dragAndDropManager.attemptEquipDrop(slotName); 
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
            this.dragAndDropManager.attemptInventoryDrop(); 
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

        // Sort whatever slots they actually have
        this.activeSlots = availableSlots.sort((a, b) => {
            const indexA = SLOT_ORDER.indexOf(a);
            const indexB = SLOT_ORDER.indexOf(b);
            const indexALower = SLOT_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
            const indexBLower = SLOT_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
            
            const finalA = (indexA !== -1) ? indexA : (indexALower !== -1 ? indexALower : 99);
            const finalB = (indexB !== -1) ? indexB : (indexBLower !== -1 ? indexBLower : 99);

            return finalA - finalB;
        });

        // REMOVED the else {} block that forced [...SLOT_ORDER]

        // Make sure slotIndex doesn't go out of bounds (or sets to -1 if no slots exist)
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = this.activeSlots.length > 0 ? 0 : -1;
        }

        this.updateFilteredInventory();
    }

    updateFilteredInventory() {
        this.filteredInventory = gameState.party.inventory.filter(item => {
            if (!item) return false;
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
        
        if (currentEquip && currentEquip !== inventoryItem) {
            InventorySystem.addItem(currentEquip.defId, currentEquip.qty);
        }

        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        member.equipItem(slotName, inventoryItem);

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
        if (this.contextMenuManager.menu) return this.contextMenuManager.menu.item;
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
            contextMenu: this.contextMenuManager.menu,
            dropTarget: this.heldItem ? this.hoveredElement : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
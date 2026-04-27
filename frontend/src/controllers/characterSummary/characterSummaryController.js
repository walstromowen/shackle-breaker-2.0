import { BaseController } from '../core/baseController.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { CharacterSummaryLogic } from './characterSummaryLogic.js';
import { ItemUpgradeSystem } from '../../../../shared/systems/itemUpgradeSystem.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL',
    'KeyQ': 'PREV_CHAR',
    'KeyE': 'NEXT_CHAR',
    'KeyV': 'TOGGLE_VIEW', // Swapped from Shift to V to prevent Sticky Keys
    'KeyX': 'DELETE', 'Delete': 'DELETE'
};

export class CharacterSummaryController extends BaseController {
    constructor(input, data) {
        super(input, data);
        this.config = data || {};
        this.returnScene = this.config.returnScene || 'party';

        // Initialize Core Logic
        this.logic = new CharacterSummaryLogic(this.config);

        // View State
        this.state = 'SLOTS';
        this.viewMode = 'STATS';
        this.activeSlots = [];
        this.slotIndex = -1;
        this.filteredInventory = [];
        this.inventoryIndex = -1;

        // --- GRID CONFIGURATION ---
        this.COLS = 4;
        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0;
        this.wasMouseDown = false;

        this.layout = {
            detailMaxScroll: 0,
            detailViewportH: 300,
            abilitiesMaxScroll: 0,
            abilitiesViewportH: 300,
            inventoryMaxScroll: 0,
            inventoryViewportH: 300,
            inventoryBounds: null,
            detailBounds: null,
            abilitiesBounds: null,
            itemHeight: 48
        };

        // Initialize Managers
        this.dragAndDropManager = new DragAndDropManager();
        this.scrollManager = new ScrollManager();

        // Initialize ContextMenuManager as a pure UI component
        this.contextMenuManager = new ContextMenuManager({
            onAction: (actionId, payload) => this.executeMenuAction(actionId, payload)
        });

        this._syncScrollZones();
        this.updateActiveSlots();
        this.setupInteractionHandlers();
    }

    get currentMember() {
        return this.logic.currentMember;
    }

    // ========================================================
    // LIFECYCLE
    // ========================================================
    update(dt) {
        if (super.update) super.update(dt);
        // This drives the smooth scrolling math!
        this.scrollManager.update(dt);
    }

    // ========================================================
    // SCROLL ZONE REGISTRATION
    // ========================================================
    _syncScrollZones() {
        // Register/Update Inventory Zone
        this.scrollManager.registerZone('inventory', {
            bounds: this.layout.inventoryBounds,
            maxScroll: this.layout.inventoryMaxScroll,
            viewportH: this.layout.inventoryViewportH,
            thumbIds: ['INV_SCROLLBAR_THUMB'],
            onChange: (newOffset) => {
                this.inventoryScrollOffset = newOffset;
            }
        });

        // Register/Update Details Zone
        const isAbilities = this.viewMode === 'ABILITIES';
        this.scrollManager.registerZone('details', {
            bounds: isAbilities ? this.layout.abilitiesBounds : this.layout.detailBounds,
            maxScroll: isAbilities ? this.layout.abilitiesMaxScroll : this.layout.detailMaxScroll,
            viewportH: isAbilities ? this.layout.abilitiesViewportH : this.layout.detailViewportH,
            thumbIds: ['SCROLLBAR_THUMB', 'ABILITIES_SCROLLBAR_THUMB'],
            onChange: (newOffset) => {
                this.detailsScrollOffset = newOffset;
            }
        });
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
            'TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
            'BTN_TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
        };
    }

    // ========================================================
    // HITBOX INTERACTION (Standard BaseController Hooks)
    // ========================================================

    onHover(hitboxId) {
        super.onHover(hitboxId);
        // UX UPGRADE: Instantly show item details on hover, creating a fluid, responsive feel.
        // We pause this logic if dragging or in a menu to prevent distracting view jumps.
        if (this.dragAndDropManager.dragState.active || this.contextMenuManager.menu) return;

        if (hitboxId) {
            if (hitboxId.startsWith('SLOT_')) {
                const slotName = hitboxId.replace('SLOT_', '');
                const newIndex = this.activeSlots.indexOf(slotName);
                if (newIndex !== -1 && (this.slotIndex !== newIndex || this.state !== 'SLOTS')) {
                    this.slotIndex = newIndex;
                    this.state = 'SLOTS';
                    this.inventoryIndex = -1;
                }
            } else if (hitboxId.startsWith('INV_ITEM_')) {
                const idx = parseInt(hitboxId.split('_')[2], 10);
                if (!isNaN(idx) && (this.inventoryIndex !== idx || this.state !== 'INVENTORY')) {
                    this.inventoryIndex = idx;
                    this.state = 'INVENTORY';
                    this.slotIndex = -1;
                }
            }
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        // 1. Clicking outside any hitboxes clears menus or selections
        if (!hitboxId) {
            if (this.contextMenuManager.menu) {
                this.contextMenuManager.close();
                this.playCancelSound();
            } else {
                this.deselectSlot();
                this.playCancelSound();
            }
            return;
        }

        // 2. Context Menu Intercepts (Left Click selects option)
        if (this.contextMenuManager.menu) {
            if (hitboxId.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(hitboxId.split('_')[2], 10);
                this.playConfirmSound(); // Confirm menu selection
                this.contextMenuManager.executeAction(optIndex);
                return;
            }
            // If they clicked something else while the menu is open, close it
            this.contextMenuManager.close();
        }

        // 2. Standard Button Handlers
        if (this.handlers && this.handlers[hitboxId]) {
            this.handlers[hitboxId]();
            return;
        }

        // 3. Left Click on Slots & Inventory opens Context Menu
        let item = null;
        let source = '';
        let sourceKey = null;

        if (hitboxId.startsWith('SLOT_')) {
            sourceKey = hitboxId.replace('SLOT_', '');
            this.handleSlotClick(sourceKey); // Apply selection state
            item = this.currentMember.equipment[sourceKey];
            source = 'equipment';
        } else if (hitboxId.startsWith('INV_ITEM_')) {
            sourceKey = parseInt(hitboxId.split('_')[2], 10);
            this.handleInventoryClick(sourceKey); // Apply selection state
            item = this.filteredInventory[sourceKey];
            source = 'inventory';
        }

        if (item) {
            // Build options based on game state
            const options = this._buildMenuOptions(item, source, sourceKey);
            if (options.length > 0) {
                // Calculate Position (Default to mouse position)
                let menuX = this.mouse.x;
                let menuY = this.mouse.y;

                if (this.lastRenderedHitboxes) {
                    const hit = this.lastRenderedHitboxes.find(h => h.id === hitboxId);
                    if (hit) {
                        // Offset to the RIGHT edge of the slot, with an 8px gap
                        menuX = Math.floor(hit.x + hit.w + 8);
                        // Align the top of the menu with the top of the slot
                        menuY = Math.floor(hit.y);
                    }
                }

                // Open the decoupled manager
                this.contextMenuManager.open(menuX, menuY, options, { item, source, sourceKey });
                this.playConfirmSound(); // Sound for opening context menu

                // FIX: If opened via mouse, clear the default keyboard selection
                // so the first item isn't artificially highlighted!
                if (!fromKeyboard && this.contextMenuManager.menu) {
                    this.contextMenuManager.menu.selectedIndex = -1;
                }
            }
        }
    }

    onRightClick(hitboxId) {
        // Right click closes the context menu, or goes back if no menu is open
        this.playCancelSound();
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.close();
        } else {
            this._handleBack();
        }
    }

    // ========================================================
    // STANDARD DRAG AND DROP CALLBACKS
    // ========================================================

    onDragStart(hitboxId) {
        if (!hitboxId || this.contextMenuManager.menu) return;

        // 1. Scrollbar Drag Intercept
        if (hitboxId.includes('SCROLLBAR_THUMB')) {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
            return;
        }

        // 2. Item Drag Intercept
        if (this.logic.readOnly) return;

        if (hitboxId.startsWith('SLOT_')) {
            const slotName = hitboxId.replace('SLOT_', '');
            const item = this.currentMember.equipment[slotName];

            if (item) {
                this.slotIndex = this.activeSlots.indexOf(slotName);
                this.state = 'SLOTS';
                this.inventoryIndex = -1;
                
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 }); // Distinct drag start SFX
                this.dragAndDropManager.startDrag(
                    item, 'equipment', slotName, this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        } else if (hitboxId.startsWith('INV_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.filteredInventory[idx];

            if (item) {
                this.inventoryIndex = idx;
                this.state = 'INVENTORY';
                this.slotIndex = -1;
                
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 }); // Distinct drag start SFX
                this.dragAndDropManager.startDrag(
                    item, 'inventory', idx, this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        }
    }

    onDragMove(x, y) {
        // Route the drag update to whichever manager is currently active
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragMove(y);
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.updateDrag(x, y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        // Route the drop to whichever manager is currently active
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag(targetHitboxId);
        }
    }

    // ========================================================
    // CONTEXT MENU LOGIC
    // ========================================================
    _buildMenuOptions(item, source, sourceKey) {
        const options = [];
        const isBattle = typeof this.config.onItemSelected === 'function';
        const isStackable = (item.qty > 1);

        if (isBattle) {
            if (item.useAbility) options.push({ label: 'Use in Battle', actionId: 'BATTLE_USE' });
        } else {
            if (item.usable || item.type === 'consumable') {
                options.push({ label: 'Use', actionId: 'USE' });
            }
            if (!this.logic.readOnly) {
                if (source === 'equipment') {
                    if (this.filteredInventory.length > 0) options.push({ label: 'Swap', actionId: 'NAV_TO_INV' });
                    options.push({ label: 'Unequip', actionId: 'UNEQUIP_AND_NAV' });
                } else {
                    // --- FIX: Check if the item is equippable before showing 'Equip' ---
                    const isEquippable = item.equipSlot || ['weapon', 'armor', 'accessory', 'equipment'].includes(item.type);
                    if (isEquippable) {
                        options.push({ label: 'Equip', actionId: 'EQUIP' });
                    }
                }
                // --- UPDATED UPGRADE CHECK ---
                if (ItemUpgradeSystem.canUpgrade(item)) {
                    options.push({ label: 'Upgrade', actionId: 'UPGRADE' });
                }
                if (isStackable) {
                    options.push({ label: 'Drop 1', actionId: 'DROP_ONE' });
                    options.push({ label: 'Drop All', actionId: 'DROP_ALL' });
                } else {
                    options.push({ label: 'Drop', actionId: 'DROP_ONE' });
                }
            }
        }
        return options;
    }

    executeMenuAction(actionId, payload) {
        const { item, source, sourceKey } = payload;
        switch (actionId) {
            case 'BATTLE_USE':
                if (this.config.onItemSelected) {
                    this.config.onItemSelected({ itemId: item.defId, abilityId: item.useAbility });
                }
                break;
            case 'NAV_TO_INV':
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
                this.scrollToItem(0);
                break;
            case 'UNEQUIP_AND_NAV':
                this.logic.unequipSlot(sourceKey);
                this.updateFilteredInventory();
                const newIdx = this._findNewestInventoryIndex(item.defId);
                this.state = 'INVENTORY';
                this.inventoryIndex = (newIdx !== -1) ? newIdx : 0;
                this.scrollToItem(this.inventoryIndex, true);
                break;
            case 'EQUIP':
                this.equipItem(item);
                break;
            case 'USE':
                if (this.logic.useItem) {
                    this.logic.useItem(item, this.currentMember);
                } else {
                    console.warn('useItem method missing on CharacterSummaryLogic');
                }
                break;
            // --- UPDATED UPGRADE HANDLER ---
            case 'UPGRADE':
                ItemUpgradeSystem.upgradeItem(item);
                break;
            case 'DROP_ONE':
                if (this.logic.dropItem) {
                    this.logic.dropItem(item, 1);
                } else {
                    console.warn('dropItem method missing on CharacterSummaryLogic');
                }
                break;
            case 'DROP_ALL':
                if (this.logic.dropItem) {
                    this.logic.dropItem(item, item.qty || 1);
                }
                break;
        }

        // Ensure view stays synced after stats/inventory change
        this.updateFilteredInventory();
    }

    // ========================================================
    // INPUT HANDLING
    // ========================================================

    handleKeyDown(code) {
        const intent = KEY_BINDINGS[code];
        if (!intent) return;

        if (this.contextMenuManager.menu) {
            this.contextMenuManager.handleNavigation(intent);
            return;
        }

        if (intent === 'CANCEL') return this._handleBack();
        if (intent === 'PREV_CHAR') return this.cycleMember(-1);
        if (intent === 'NEXT_CHAR') return this.cycleMember(1);

        if (intent === 'TOGGLE_VIEW') {
            this.playNavSound(); // View toggle sound
            if (this.viewMode === 'STATS') this.viewMode = 'ITEM';
            else if (this.viewMode === 'ITEM') this.viewMode = 'ABILITIES';
            else this.viewMode = 'STATS';
            this.setViewMode(this.viewMode);
            return;
        }

        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(intent);
        } else {
            this.handleInventoryNavigation(intent);
        }
    }

    _handleBack() {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
            this.playCancelSound(); // Feedback for canceling drag
            return;
        }
        
        this.playCancelSound(); // Feedback for backing out or deselecting

        if (this.state === 'INVENTORY') {
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        } else {
            events.emit('CHANGE_SCENE', { scene: this.returnScene });
        }
    }

    handleSlotNavigation(intent) {
        const oldIndex = this.slotIndex;

        if (intent === 'UP') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
        } else if (intent === 'DOWN') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
        }

        if (this.slotIndex !== oldIndex) this.playNavSound(); // SFX for slot movement

        if (intent === 'CONFIRM') {
            const slotName = this.activeSlots[this.slotIndex];
            const item = this.currentMember.equipment[slotName];
            
            if (item) {
                // Synthesize click AND flag it as a keyboard action
                this.onClick(`SLOT_${slotName}`, true);
            } else if (this.filteredInventory.length > 0) {
                this.playConfirmSound();
                this._activateSlotButDontFilter(slotName);
            }
        } else if (intent === 'DELETE') {
            this.playCancelSound(); // SFX for unequip command via hotkey
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(intent) {
        if (this.filteredInventory.length === 0) return;
        const maxIndex = this.filteredInventory.length - 1;
        const oldIndex = this.inventoryIndex;

        if (intent === 'UP') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - this.COLS);
        } else if (intent === 'DOWN') {
            this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + this.COLS);
        } else if (intent === 'LEFT') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
        } else if (intent === 'RIGHT') {
            this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + 1);
        }

        if (this.inventoryIndex !== oldIndex) {
            this.playNavSound(); // SFX for inventory grid movement
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
                this.scrollToItem(this.inventoryIndex, false);
            }
        }

        if (intent === 'CONFIRM') {
            const item = this.filteredInventory[this.inventoryIndex];
            if (item) {
                // Synthesize click AND flag it as a keyboard action
                this.onClick(`INV_ITEM_${this.inventoryIndex}`, true);
            }
            return;
        }
    }

    // ========================================================
    // RAW MOUSE & DRAG FALLBACKS
    // ========================================================

    handleMouseMove(x, y, isMouseDown, renderer) {
        // Let BaseController track this.mouse.x/y
        super.handleMouseMove(x, y, isMouseDown, renderer);
    }

    // ========================================================
    // SCROLL API BRIDGES
    // ========================================================

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
        this._syncScrollZones();
    }

    _findNewestInventoryIndex(defId) {
        for (let i = this.filteredInventory.length - 1; i >= 0; i--) {
            if (this.filteredInventory[i].defId === defId) {
                return i;
            }
        }
        return -1;
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    scrollToItem(index, center = false) {
        this.scrollManager.scrollToIndex('inventory', index, {
            totalItems: this.filteredInventory.length,
            columns: this.COLS,
            itemHeight: this.layout.itemHeight || 48
        }, center);
    }

    resetScroll() {
        this.scrollManager.resetAllScrolls();
    }

    // ========================================================
    // STATE & DATA MANAGEMENT
    // ========================================================

    setViewMode(mode) {
        this.viewMode = mode;
        this._syncScrollZones();
    }

    cycleMember(direction) {
        if (this.logic.cycleMember(direction)) {
            this.playNavSound(); // Feedback for changing character
            this.state = 'SLOTS';
            this.contextMenuManager.close();
            this.inventoryIndex = -1;
            this.resetScroll();
            this.updateActiveSlots();
        }
    }

    handleSlotClick(slotName) {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag('SLOT_' + slotName);
            return;
        }

        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
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

        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag('INV_ZONE');
            return;
        }

        const targetItem = this.filteredInventory[idx];
        if (targetItem) {
            this.inventoryIndex = idx;
            this.state = 'INVENTORY';
            this.updateFilteredInventory();
        }
    }

    updateActiveSlots() {
        this.activeSlots = this.logic.getActiveSlots();
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = this.activeSlots.length > 0 ? 0 : -1;
        }
        this.updateFilteredInventory();
    }

    updateFilteredInventory() {
        const draggingItem = this.dragAndDropManager.dragState.active ? this.dragAndDropManager.dragState.payload : null;
        const draggingSource = this.dragAndDropManager.dragState.active ? this.dragAndDropManager.dragState.sourceId : null;

        this.filteredInventory = this.logic.getFilteredInventory(draggingItem, draggingSource);

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
        this._syncScrollZones();
        this.scrollManager.setOffset('inventory', this.inventoryScrollOffset);
    }

    equipItem(inventoryItem, targetSlotOverride = null) {
        if (this.logic.readOnly) return;

        const equippedSlotName = this.logic.equipItem(inventoryItem, targetSlotOverride, this.activeSlots);
        if (equippedSlotName) {
            const newSlotIndex = this.activeSlots.indexOf(equippedSlotName);
            if (newSlotIndex !== -1) {
                this.slotIndex = newSlotIndex;
            }
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        }
    }

    unequipCurrentSlot() {
        if (this.logic.readOnly || this.slotIndex === -1) return;

        const slotName = this.activeSlots[this.slotIndex];
        const didUnequip = this.logic.unequipSlot(slotName);
        if (didUnequip) {
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        }
    }

    getFocusedItem() {
        // FIX: The ContextMenu payload stores the contextual data!
        if (this.contextMenuManager.menu && this.contextMenuManager.menu.payload) {
            return this.contextMenuManager.menu.payload.item;
        }
        if (this.dragAndDropManager.dragState.active) {
            return this.dragAndDropManager.dragState.payload;
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

    // ========================================================
    // STATE EXPORT
    // ========================================================
    getState() {
        let viewSelectedSlot = (this.state === 'INVENTORY') ? -1 : this.slotIndex;
        let viewInventoryIndex = this.inventoryIndex;

        if (this.dragAndDropManager.dragState.active) {
            const dragSource = this.dragAndDropManager.dragState.sourceId;
            const origin = this.dragAndDropManager.dragState.originSlot;
            if (dragSource === 'equipment' && this.activeSlots[viewSelectedSlot] === origin) {
                viewSelectedSlot = -1;
            } else if (dragSource === 'inventory' && viewInventoryIndex === origin) {
                viewInventoryIndex = -1;
            }
        }

        return {
            readOnly: this.logic.readOnly,
            member: this.currentMember,
            derivedStats: this.logic.getDerivedStats(),
            abilities: this.logic.compileAbilities(),
            slots: this.activeSlots,
            selectedSlotIndex: viewSelectedSlot,
            isChoosingItem: (this.state === 'INVENTORY'),
            filteredInventory: this.filteredInventory,
            inventoryIndex: viewInventoryIndex,
            viewMode: this.viewMode,
            focusedItem: this.getFocusedItem(),
            scrollOffset: this.detailsScrollOffset,
            inventoryScrollOffset: this.inventoryScrollOffset,
            mouse: this.mouse,
            hoveredHitboxId: this.hoveredHitboxId,
            heldItem: this.dragAndDropManager.dragState.active ? {
                item: this.dragAndDropManager.dragState.payload,
                source: this.dragAndDropManager.dragState.sourceId,
                originSlot: this.dragAndDropManager.dragState.originSlot
            } : null,
            dropTarget: this.dragAndDropManager.dragState.active ? this.hoveredHitboxId : null,
            layout: this.layout,
            contextMenu: this.contextMenuManager.menu,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }

    handleItemDropped(item, sourceId, originSlot, dropTargetId) {
        if (this.logic.readOnly) return;

        if (!dropTargetId || dropTargetId.startsWith('INV_') || dropTargetId === 'SCROLLBAR_INV') {
            if (sourceId === 'equipment') {
                this.playCancelSound(); // Feedback sound for successful unequip drop
                this.logic.unequipSlot(originSlot);
                this.updateFilteredInventory();

                const newIndex = this._findNewestInventoryIndex(item.defId);
                this.state = 'INVENTORY';
                this.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
                this.slotIndex = -1;
                this.scrollToItem(this.inventoryIndex, true);
            }
            this.updateFilteredInventory();
            return;
        }

        if (dropTargetId && dropTargetId.startsWith('SLOT_')) {
            const targetSlotRaw = dropTargetId.substring(5);
            if (!this.logic.canEquipToSlot(item, targetSlotRaw)) {
                this.playCancelSound(); // Invalid drop rejection
                return;
            }

            const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');
            const canonicalSlot = this.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;

            if (sourceId === 'equipment' && originSlot === canonicalSlot) return;

            this.playConfirmSound(); // Feedback sound for successful equip drop
            
            if (sourceId === 'equipment') {
                this.logic.unequipSlot(originSlot);
            }
            this.equipItem(item, canonicalSlot);
        }
    }
}
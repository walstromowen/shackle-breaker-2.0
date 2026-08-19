import { BaseController } from '../core/baseController.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { ItemUpgradeSystem } from '../../../../shared/systems/itemUpgradeSystem.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP',
    'KeyW': 'UP',
    'ArrowDown': 'DOWN',
    'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT',
    'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT',
    'KeyD': 'RIGHT',
    'Enter': 'CONFIRM',
    'Space': 'CONFIRM',
    'Escape': 'CANCEL',
    'Backspace': 'CANCEL',
    'KeyQ': 'PREV_CHAR',
    'KeyE': 'NEXT_CHAR',
    'KeyV': 'TOGGLE_VIEW',
    'KeyX': 'DELETE',
    'Delete': 'DELETE'
};

export class CharacterSummaryController extends BaseController {
    constructor(input, data) {
        super(input, data);
        this.config = data || {};
        this.returnScene = this.config.returnScene || 'party';
        this.inputMode = 'mouse';

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

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
    }

    _syncScrollZones() {
        this.scrollManager.registerZone('inventory', {
            bounds: this.layout.inventoryBounds,
            maxScroll: this.layout.inventoryMaxScroll,
            viewportH: this.layout.inventoryViewportH,
            thumbIds: ['INV_SCROLLBAR_THUMB'],
            onChange: (newOffset) => {
                this.inventoryScrollOffset = newOffset;
            }
        });

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
            // Text Editing Trigger
            'BTN_EDIT_NAME': () => {
                this.logic.startNameEdit();
                this.playConfirmSound();
            },
            // Tabs
            'TAB_STATS': () => this.setViewMode('STATS'),
            'BTN_TAB_STATS': () => this.setViewMode('STATS'),
            'TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_TAB_ITEM': () => this.setViewMode('ITEM'),
            'TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
            'BTN_TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
        };
    }
    
    _validateIndices() {
        // Clamp Equipment Slots
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = Math.max(0, this.activeSlots.length - 1);
            if (this.activeSlots.length === 0) this.slotIndex = -1;
        }

        // Clamp Inventory
        if (this.inventoryIndex >= this.filteredInventory.length) {
            this.inventoryIndex = Math.max(0, this.filteredInventory.length - 1);
            if (this.filteredInventory.length === 0) this.inventoryIndex = -1;
        }

        // AUTO-SWITCH FOCUS: If the active panel is empty but the other is not
        if (this.state === 'INVENTORY' && this.inventoryIndex === -1 && this.activeSlots.length > 0) {
            this.state = 'SLOTS';
            this.slotIndex = 0;
        } else if (this.state === 'SLOTS' && this.slotIndex === -1 && this.filteredInventory.length > 0) {
            this.state = 'INVENTORY';
            this.inventoryIndex = 0;
        }

        this._syncScrollZones();
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
        
        // 1. Ignore resting mouse if using keyboard
        if (this.inputMode === 'keyboard') return;
        
        // 2. Ignore if dragging or menu is open
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
            } else {
                this.slotIndex = -1;
                this.inventoryIndex = -1;
            }
        } else {
            this.slotIndex = -1;
            this.inventoryIndex = -1;
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        this.inputMode = 'mouse'; // Aggressive wake up

        // If clicking anywhere else while editing the name, attempt to save
        if (this.logic.isEditingName && hitboxId !== 'BTN_EDIT_NAME') {
            if (this.logic.validateName()) {
                this.playConfirmSound();
            }
        }

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

        if (this.contextMenuManager.menu) {
            if (hitboxId.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(hitboxId.split('_')[2], 10);
                this.playConfirmSound();
                this.contextMenuManager.executeAction(optIndex);
                return;
            }
            this.contextMenuManager.close();
            this.playCancelSound();
            return;
        }

        if (this.handlers && this.handlers[hitboxId]) {
            this.handlers[hitboxId]();
            return;
        }

        let item = null;
        let source = '';
        let sourceKey = null;

        if (hitboxId.startsWith('SLOT_')) {
            sourceKey = hitboxId.replace('SLOT_', '');
            this.handleSlotClick(sourceKey);
            item = this.currentMember.equipment[sourceKey];
            source = 'equipment';
        } else if (hitboxId.startsWith('INV_ITEM_')) {
            sourceKey = parseInt(hitboxId.split('_')[2], 10);
            this.handleInventoryClick(sourceKey);
            item = this.filteredInventory[sourceKey];
            source = 'inventory';
        }

        if (item) {
            const options = this._buildMenuOptions(item, source, sourceKey);
            if (options.length > 0) {
                let menuX = this.mouse.x;
                let menuY = this.mouse.y;
                if (this.lastRenderedHitboxes) {
                    const hit = this.lastRenderedHitboxes.find(h => h.id === hitboxId);
                    if (hit) {
                        menuX = Math.floor(hit.x + hit.w + 8);
                        menuY = Math.floor(hit.y);
                    }
                }
                this.contextMenuManager.open(menuX, menuY, options, { item, source, sourceKey });
                this.playConfirmSound();

                if (!fromKeyboard && this.contextMenuManager.menu) {
                    this.contextMenuManager.menu.selectedIndex = -1;
                }
            }
        }
    }

    onRightClick(hitboxId) {
        this.inputMode = 'mouse';
        if (this.logic.isEditingName) {
            if (this.logic.validateName()) this.playConfirmSound();
            return;
        }

        this.playCancelSound();
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.close();
        } else {
            this._handleBack();
        }
    }

    onDragStart(hitboxId) {
        this.inputMode = 'mouse';
        if (!hitboxId || this.contextMenuManager.menu || this.logic.isEditingName) return;

        if (hitboxId.includes('SCROLLBAR_THUMB')) {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
            return;
        }

        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;

        if (hitboxId.startsWith('SLOT_')) {
            const slotName = hitboxId.replace('SLOT_', '');
            const item = this.currentMember.equipment[slotName];
            if (item) {
                this.slotIndex = this.activeSlots.indexOf(slotName);
                this.state = 'SLOTS';
                this.inventoryIndex = -1;
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 });
                this.dragAndDropManager.startDrag(
                    item, 'equipment', slotName,
                    this.mouse.x, this.mouse.y,
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
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 });
                this.dragAndDropManager.startDrag(
                    item, 'inventory', idx,
                    this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        }
    }

    onDragMove(x, y) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragMove(y);
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.updateDrag(x, y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag(targetHitboxId);
        }
    }

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
                    const isEquippable = item.equipSlot || ['weapon', 'armor', 'accessory', 'equipment'].includes(item.type);
                    if (isEquippable) {
                        options.push({ label: 'Equip', actionId: 'EQUIP' });
                    }
                }
                
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
        this.updateFilteredInventory();
    }

    handleKeyDown(code, e) {
        super.handleKeyDown(code, e);
        this.inputMode = 'keyboard'; // Switch to keyboard control

        if (this.logic.isEditingName && e) {
            if (e.code === "Enter" || e.code === "Escape") {
                this.logic.validateName();
                this.playConfirmSound();
            } else {
                this.logic.nameInput.handleEvent(e);
                this.currentMember.name = this.logic.nameInput.value;
            }
            return;
        }

        const intent = KEY_BINDINGS[code] || KEY_BINDINGS[e?.code];
        if (!intent) return;

        if (this.contextMenuManager.menu) {
            this.contextMenuManager.handleNavigation(intent);
            return;
        }

        if (intent === 'CANCEL') return this._handleBack();
        if (intent === 'PREV_CHAR') return this.cycleMember(-1);
        if (intent === 'NEXT_CHAR') return this.cycleMember(1);

        if (intent === 'TOGGLE_VIEW') {
            this.playNavSound();
            if (this.viewMode === 'STATS') this.viewMode = 'ITEM';
            else if (this.viewMode === 'ITEM') this.viewMode = 'ABILITIES';
            else this.viewMode = 'STATS';
            this.setViewMode(this.viewMode);
            return;
        }

        // Route grid navigation
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(intent);
        } else {
            this.handleInventoryNavigation(intent);
        }
    }

    _handleBack() {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
            this.playCancelSound();
            return;
        }

        this.playCancelSound();
        if (this.state === 'INVENTORY') {
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        } else {
            events.emit('CHANGE_SCENE', { scene: this.returnScene });
        }
    }

    _jumpToPanel(targetPanel) {
        this.playNavSound();
        this.state = targetPanel;
        this.hoveredHitboxId = null;

        if (targetPanel === 'INVENTORY') {
            if (this.inventoryIndex === -1) this.inventoryIndex = 0;
            this.slotIndex = -1;
            this.scrollToItem(this.inventoryIndex);
        } else {
            if (this.slotIndex === -1) this.slotIndex = 0;
            this.inventoryIndex = -1;
        }
    }

    handleSlotNavigation(intent) {
        if (this.activeSlots.length === 0) return;
        
        // Recover focus
        if (this.slotIndex === -1) {
            this.slotIndex = 0;
            this.playNavSound();
            return;
        }

        const oldIndex = this.slotIndex;

        if (intent === 'UP') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
        } else if (intent === 'DOWN') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
        } else if (intent === 'RIGHT') {
            if (this.filteredInventory.length > 0) {
                this._jumpToPanel('INVENTORY');
            }
            return;
        }

        if (this.slotIndex !== oldIndex) {
            this.playNavSound();
            this.hoveredHitboxId = null; // Clear mouse focus
        }

        if (intent === 'CONFIRM') {
            const slotName = this.activeSlots[this.slotIndex];
            const item = this.currentMember.equipment[slotName];
            if (item) {
                this.onClick(`SLOT_${slotName}`, true);
            } else if (this.filteredInventory.length > 0) {
                this.playConfirmSound();
                this._activateSlotButDontFilter(slotName);
            }
        } else if (intent === 'DELETE') {
            this.playCancelSound();
            this.unequipCurrentSlot();
        }
    }

    handleInventoryNavigation(intent) {
        if (this.filteredInventory.length === 0) return;

        // Recover focus
        if (this.inventoryIndex === -1) {
            this.inventoryIndex = 0;
            this.playNavSound();
            return;
        }

        const maxIndex = this.filteredInventory.length - 1;
        const oldIndex = this.inventoryIndex;
        const col = this.inventoryIndex % this.COLS;

        if (intent === 'UP') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - this.COLS);
        } else if (intent === 'DOWN') {
            this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + this.COLS);
        } else if (intent === 'LEFT') {
            if (col === 0 && this.activeSlots.length > 0) {
                this._jumpToPanel('SLOTS');
                return;
            } else {
                this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
            }
        } else if (intent === 'RIGHT') {
            if (col === this.COLS - 1 || this.inventoryIndex === maxIndex) {
                if (this.activeSlots.length > 0) this._jumpToPanel('SLOTS');
                return;
            } else {
                this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + 1);
            }
        }

        if (this.inventoryIndex !== oldIndex) {
            this.playNavSound();
            this.hoveredHitboxId = null; // Clear mouse focus
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
                this.scrollToItem(this.inventoryIndex, false);
            }
        }

        if (intent === 'CONFIRM') {
            const item = this.filteredInventory[this.inventoryIndex];
            if (item) {
                this.onClick(`INV_ITEM_${this.inventoryIndex}`, true);
            }
        }
    }

    handleMouseMove(x, y, isMouseDown, renderer) {
        super.handleMouseMove(x, y, isMouseDown, renderer);
    }

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
        this.inputMode = 'mouse';
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

    setViewMode(mode) {
        this.viewMode = mode;
        this._syncScrollZones();
    }

    cycleMember(direction) {
        if (this.logic.isEditingName) {
            this.logic.validateName();
        }
        if (this.logic.cycleMember(direction)) {
            this.playNavSound();
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
        
        // Ensure indices are solid after inventory updates
        this._validateIndices();
    }

    equipItem(inventoryItem, targetSlotOverride = null) {
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;
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
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle || this.slotIndex === -1) return;
        const slotName = this.activeSlots[this.slotIndex];
        const didUnequip = this.logic.unequipSlot(slotName);
        if (didUnequip) {
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        }
    }

    getFocusedItem() {
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

        // --- ARTIFICIAL TOOLTIP FOR KEYBOARD NAVIGATION ---
        let activeTooltipId = this.hoveredHitboxId;
        if (!activeTooltipId || (!activeTooltipId.startsWith('SLOT_') && !activeTooltipId.startsWith('INV_ITEM_'))) {
            if (this.state === 'SLOTS' && this.slotIndex !== -1) {
                activeTooltipId = `SLOT_${this.activeSlots[this.slotIndex]}`;
            } else if (this.state === 'INVENTORY' && this.inventoryIndex !== -1) {
                activeTooltipId = `INV_ITEM_${this.inventoryIndex}`;
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
            hoveredHitboxId: activeTooltipId,
            
            // --- EXPORT NAME ENTRY STATE ---
            isEditingName: this.logic.isEditingName,
            nameInputValue: this.logic.nameInput.value,
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
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;

        if (!dropTargetId || dropTargetId.startsWith('INV_') || dropTargetId === 'SCROLLBAR_INV') {
            if (sourceId === 'equipment') {
                this.playCancelSound();
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
                this.playCancelSound();
                return;
            }
            const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');
            const canonicalSlot = this.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;
            if (sourceId === 'equipment' && originSlot === canonicalSlot) return;
            this.playConfirmSound();
            if (sourceId === 'equipment') {
                this.logic.unequipSlot(originSlot);
            }
            this.equipItem(item, canonicalSlot);
        }
    }
}


import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { AbilitySystem } from '../../../../shared/systems/abilitySystem.js';
import { TextEntry } from '../../../../shared/utils/textEntry.js';

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'legs', 'feet', 'accessory', 'offHand'];

export class CharacterSummaryLogic {
    constructor(config) {
        this.config = config || {};
        this.readOnly = this.config.readOnly || this.config.isCombat || false;
        this.memberIndex = 0;
        
        if (this.config.memberIndex !== undefined) {
            this.memberIndex = this.config.memberIndex;
        } else if (this.config.character) {
            const index = gameState.party.members.findIndex(m =>
                m === this.config.character || m.id === this.config.character.id
            );
            this.memberIndex = index !== -1 ? index : 0;
        }

        // --- NAME EDITING STATE ---
        this.isEditingName = false;
        this.nameInput = new TextEntry("", 16, /^[a-zA-Z0-9 ]$/);
    }

    get currentMember() {
        return gameState.party.members[this.memberIndex];
    }

    get isLocked() {
        const isBattleSelection = this.config && typeof this.config.onItemSelected === 'function';
        return this.readOnly || isBattleSelection;
    }

    // ========================================================
    // NAME EDITING LOGIC
    // ========================================================
    startNameEdit() {
        if (this.readOnly) return;
        this.isEditingName = true;
        // Cache the original name so we can revert if they leave it blank
        this.originalName = this.currentMember.name || "Unknown";
        this.nameInput.reset(this.originalName);
    }

    validateName() {
        if (!this.isEditingName) return false;
        // Mirror Character Creator: Revert if empty, otherwise save trimmed value
        if (this.nameInput.value.trim() === "") {
            this.nameInput.reset(this.originalName);
            this.currentMember.name = this.originalName;
        } else {
            this.currentMember.name = this.nameInput.value.trim();
        }
        this.isEditingName = false;
        return true;
    }

    // ========================================================
    // CORE LOGIC
    // ========================================================
    cycleMember(direction) {
        if (this.isLocked) return false;
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        return true;
    }

    getActiveSlots() {
        const member = this.currentMember;
        if (!member) return [];
        const availableSlots = Object.keys(member.equipment || {});
        return availableSlots.sort((a, b) => {
            const indexA = SLOT_ORDER.indexOf(a);
            const indexB = SLOT_ORDER.indexOf(b);
            const indexALower = SLOT_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
            const indexBLower = SLOT_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
            const finalA = (indexA !== -1) ? indexA : (indexALower !== -1 ? indexALower : 99);
            const finalB = (indexB !== -1) ? indexB : (indexBLower !== -1 ? indexBLower : 99);
            return finalA - finalB;
        });
    }

    getFilteredInventory() {
        return gameState.party.inventory.filter(item => item);
    }

    canEquipToSlot(item, targetSlotRaw) {
        const def = ItemDefinitions[item.defId];
        if (!def) return false;
        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
        const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');
        return (itemSlot === slotKey) ||
               (slotKey === 'mainhand' && ['weapon', 'tool', 'twohand', 'onehand'].includes(itemSlot)) ||
               (slotKey === 'offhand' && ['shield', 'weapon', 'onehand'].includes(itemSlot));
    }

    equipItem(inventoryItem, targetSlotOverride, activeSlots) {
        if (this.readOnly) return null;
        const member = this.currentMember;
        let slotName = targetSlotOverride;
        const def = ItemDefinitions[inventoryItem.defId];
        const rawItemType = def ? (def.slot || def.type || '').toLowerCase() : '';
        const itemTypeNormalized = rawItemType.replace(/\s/g, '');
        
        const mainHandSlot = activeSlots.find(s => s.toLowerCase() === 'mainhand') || 'mainHand';
        const offHandSlot = activeSlots.find(s => s.toLowerCase() === 'offhand') || 'offHand';
        const currentMainItem = member.equipment[mainHandSlot];
        const currentOffItem = member.equipment[offHandSlot];
        const currentMainDef = currentMainItem ? ItemDefinitions[currentMainItem.defId] : null;
        const isMainTwoHanded = currentMainDef && (currentMainDef.slot || currentMainDef.type || '').toLowerCase().replace(/\s/g, '') === 'twohand';

        // --- SMART ROUTING LOGIC ---
        if (!slotName) {
            if (itemTypeNormalized === 'onehand' || rawItemType === 'weapon') {
                if (currentMainItem && !currentOffItem && !isMainTwoHanded) {
                    slotName = offHandSlot;
                } else {
                    slotName = mainHandSlot;
                }
            } else if (itemTypeNormalized === 'twohand') {
                slotName = mainHandSlot;
            } else if (rawItemType === 'shield') {
                slotName = offHandSlot;
            } else {
                slotName = activeSlots.find(s => {
                    const sKey = s.toLowerCase();
                    if (sKey === rawItemType) return true;
                    if (sKey === 'mainhand' && rawItemType === 'tool') return true;
                    return false;
                });
            }
            if (!slotName) {
                console.warn("Could not auto-determine slot for item.");
                return null;
            }
        }

        // --- TWO-HANDED RULE ENFORCEMENT ---
        if (itemTypeNormalized === 'twohand') {
            slotName = mainHandSlot;
            if (currentOffItem) {
                member.unequipItem(offHandSlot);
                gameState.party.inventory.push(currentOffItem);
            }
        }
        if (slotName.toLowerCase() === 'offhand' && isMainTwoHanded) {
            member.unequipItem(mainHandSlot);
            gameState.party.inventory.push(currentMainItem);
        }

        // --- EXECUTION ---
        const currentEquip = member.equipment[slotName];
        if (currentEquip && currentEquip !== inventoryItem) {
            gameState.party.inventory.push(currentEquip);
        }
        
        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }
        
        member.equipItem(slotName, inventoryItem);
        return slotName;
    }

    unequipSlot(slotName) {
        if (this.readOnly) return false;
        const member = this.currentMember;
        const currentEquip = member.equipment[slotName];
        if (currentEquip) {
            member.unequipItem(slotName);
            gameState.party.inventory.push(currentEquip);
            return true;
        }
        return false;
    }

    getDerivedStats() {
        const member = this.currentMember;
        const computedStats = StatCalculator.calculate(member);
        const baseSource = member.state ? member.state.stats : (member.attributes || {});
        
        const formatStat = (key, currentVal) => {
            const base = baseSource[key] || 0;
            return { base: base, bonus: (currentVal - base), total: currentVal };
        };
        
        return {
            ...computedStats,
            maxHp: formatStat('maxHp', computedStats.maxHp || member.maxHp),
            maxStamina: formatStat('maxStamina', computedStats.maxStamina || member.maxStamina),
            maxInsight: formatStat('maxInsight', computedStats.maxInsight || member.maxInsight)
        };
    }

    compileAbilities() {
        const member = this.currentMember;
        const abilityMap = new Map();
        
        if (member.equipment) {
            for (const [slot, item] of Object.entries(member.equipment)) {
                if (!item) continue;
                const def = ItemDefinitions[item.defId];
                const grantedAbilities = (def && (def.abilities || def.grantedAbilities)) || [];
                
                grantedAbilities.forEach(ability => {
                    const id = typeof ability === 'string' ? ability : ability.id;
                    const abilityData = typeof ability === 'object' ? ability : { id, name: id };
                    abilityMap.set(id, {
                        ...abilityData,
                        source: def.name || item.defId,
                        sourceSlot: slot,
                        isEquipment: true
                    });
                });
            }
        }
        
        const intrinsicAbilities = member.abilities || (member.template && member.template.abilities) || [];
        intrinsicAbilities.forEach(ability => {
            const id = typeof ability === 'string' ? ability : ability.id;
            const abilityData = typeof ability === 'object' ? ability : { id, name: id };
            if (!abilityMap.has(id)) {
                abilityMap.set(id, { ...abilityData, source: 'Intrinsic', isEquipment: false });
            }
        });
        
        return Array.from(abilityMap.values());
    }

    dropItem(item, amount = 1) {
        if (this.readOnly) return false;
        const bagIdx = gameState.party.inventory.indexOf(item);
        if (bagIdx > -1) {
            if (item.qty > 1) {
                item.qty -= amount;
                if (item.qty <= 0) {
                    gameState.party.inventory.splice(bagIdx, 1);
                }
            } else {
                gameState.party.inventory.splice(bagIdx, 1);
            }
            return true;
        }
        return false;
    }

    useItem(item, targetMember) {
        if (this.readOnly) return false;
        const def = ItemDefinitions[item.defId];
        if (!def) return false;
        
        const abilityId = item.useAbility || def.useAbility;
        if (abilityId) {
            const result = AbilitySystem.execute(abilityId, targetMember, targetMember);
            if (result.success) {
                console.log(`[Item Use] Success: ${result.message}`);
                return this.dropItem(item, 1);
            } else {
                console.log(`[Item Use] Failed or no effect: ${result.message || "HP already full."}`);
                return false;
            }
        }
        
        console.log(`[Item Use] Used non-ability item: ${item.defId}`);
        return this.dropItem(item, 1);
    }
}
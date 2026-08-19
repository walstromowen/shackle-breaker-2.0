/**
 * frontend/src/controllers/shop/shopController.js
 */
import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { ShopLogic } from './shopLogic.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL'
};

export class ShopController extends BaseController {
    constructor(input, data) {
        super(input, data);
        
        this.config = data || {};
        this.returnScene = this.config.returnScene || 'overworld';
        this.logic = new ShopLogic(this.config);
        
        this.activePanel = 'vendor';
        this.vendorIndex = 0; // Professional UX: Always give keyboard users a default starting focus
        this.partyIndex = -1;
        this.COLS = 4;
        
        this.layout = {
            vendorBounds: null, partyBounds: null,
            vendorMaxScroll: 0, partyMaxScroll: 0,
            viewportH: 300, itemHeight: 48
        };
        
        this.vendorScrollOffset = 0;
        this.partyScrollOffset = 0;
        
        this.dragAndDropManager = new DragAndDropManager();
        this.scrollManager = new ScrollManager();
        this.contextMenuManager = new ContextMenuManager({
            onAction: (actionId, payload) => this.executeMenuAction(actionId, payload)
        });
        
        this.currentHitboxes = [];
        
        this._syncScrollZones();
        this.setupInteractionHandlers();
    }

    init(data) {
        if (super.init) super.init(data);
        if (data) {
            this.config = data;
            this.returnScene = this.config.returnScene || 'overworld';
            this.logic = new ShopLogic(this.config);
            
            this.activePanel = 'vendor';
            this.vendorIndex = 0; // Reset focus to first item on re-open
            this.partyIndex = -1;
            
            this.vendorScrollOffset = 0;
            this.partyScrollOffset = 0;
            
            this.dragAndDropManager.cancelDrag();
            if (this.contextMenuManager) this.contextMenuManager.close();
            
            this._syncScrollZones();
        }
    }

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
    }

    _syncScrollZones() {
        this.scrollManager.registerZone('vendor', {
            bounds: this.layout.vendorBounds,
            maxScroll: this.layout.vendorMaxScroll,
            viewportH: this.layout.viewportH,
            thumbIds: ['SCROLLBAR_THUMB_VENDOR'],
            onChange: (newOffset) => { this.vendorScrollOffset = newOffset; }
        });
        
        this.scrollManager.registerZone('party', {
            bounds: this.layout.partyBounds,
            maxScroll: this.layout.partyMaxScroll,
            viewportH: this.layout.viewportH,
            thumbIds: ['SCROLLBAR_THUMB_PARTY'],
            onChange: (newOffset) => { this.partyScrollOffset = newOffset; }
        });
    }

    setupInteractionHandlers() {
        this.handlers = {
            'BTN_LEAVE': () => this._handleBack()
        };
    }

    handleKeyDown(code, e) {
        // Registers that the user is actively using the keyboard
        super.handleKeyDown(code, e);

        if (e && code === 'Tab') e.preventDefault();
        
        const intent = KEY_BINDINGS[code] || KEY_BINDINGS[e?.code];
        if (!intent) return;
        
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.handleNavigation(intent);
            return;
        }
        
        if (intent === 'CANCEL') return this._handleBack();
        
        this.handleGridNavigation(intent);
    }

    handleGridNavigation(intent) {
        const isVendor = this.activePanel === 'vendor';
        const list = isVendor ? this.logic.vendorWares : this.logic.partyInventory;
        let currentIndex = isVendor ? this.vendorIndex : this.partyIndex;
        
        if (this.logic.vendorWares.length === 0 && this.logic.partyInventory.length === 0) return;
        
        if (list.length === 0) {
            if (intent === 'LEFT' || intent === 'RIGHT') {
                this._jumpToOppositePanel(0, intent === 'LEFT' ? this.COLS - 1 : 0);
            }
            return;
        }
        
        if (currentIndex === -1) {
            currentIndex = 0;
            this._setIndex(currentIndex);
            this.playNavSound();
            return;
        }
        
        const maxIndex = list.length - 1;
        const oldIndex = currentIndex;
        const row = Math.floor(currentIndex / this.COLS);
        const col = currentIndex % this.COLS;
        
        if (intent === 'UP') {
            currentIndex = Math.max(0, currentIndex - this.COLS);
        } else if (intent === 'DOWN') {
            currentIndex = Math.min(maxIndex, currentIndex + this.COLS);
        } else if (intent === 'LEFT') {
            if (col === 0) this._jumpToOppositePanel(row, this.COLS - 1);
            else currentIndex = currentIndex - 1;
        } else if (intent === 'RIGHT') {
            if (col === this.COLS - 1 || currentIndex === maxIndex) this._jumpToOppositePanel(row, 0);
            else currentIndex = currentIndex + 1;
        }
        
        if (currentIndex !== oldIndex) {
            this.playNavSound();
            this._setIndex(currentIndex);
            this.hoveredHitboxId = null;
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
                this.scrollToItem(this.activePanel, currentIndex);
            }
        }
        
        if (intent === 'CONFIRM') {
            const item = list[currentIndex];
            if (item) {
                this._openItemContextMenu(item, isVendor ? 'vendor' : 'party', currentIndex);
            }
        }
    }

    _jumpToOppositePanel(targetRow, targetCol) {
        const targetPanel = this.activePanel === 'vendor' ? 'party' : 'vendor';
        const targetList = targetPanel === 'vendor' ? this.logic.vendorWares : this.logic.partyInventory;
        
        if (targetList.length === 0) {
            const currentList = this.activePanel === 'vendor' ? this.logic.vendorWares : this.logic.partyInventory;
            const newCol = targetCol === 0 ? 0 : this.COLS - 1;
            let newIndex = (targetRow * this.COLS) + newCol;
            newIndex = Math.min(newIndex, currentList.length - 1);
            const currentIndex = this.activePanel === 'vendor' ? this.vendorIndex : this.partyIndex;
            
            if (newIndex !== currentIndex) {
                this.playNavSound();
                this._setIndex(newIndex);
                this.hoveredHitboxId = null;
                this.scrollToItem(this.activePanel, newIndex);
            }
            return;
        }
        
        let newIndex = (targetRow * this.COLS) + targetCol;
        if (newIndex >= targetList.length) newIndex = targetList.length - 1;
        
        this.playNavSound();
        this.activePanel = targetPanel;
        this.hoveredHitboxId = null;
        this._setIndex(newIndex);
        this.scrollToItem(this.activePanel, newIndex);
    }

    _setIndex(index) {
        if (this.activePanel === 'vendor') {
            this.vendorIndex = index;
            this.partyIndex = -1;
        } else {
            this.partyIndex = index;
            this.vendorIndex = -1;
        }
    }

    _validateIndices() {
        // Clamp Vendor Index
        if (this.vendorIndex >= this.logic.vendorWares.length) {
            this.vendorIndex = Math.max(0, this.logic.vendorWares.length - 1);
            if (this.logic.vendorWares.length === 0) this.vendorIndex = -1;
        }
        
        // Clamp Party Index
        if (this.partyIndex >= this.logic.partyInventory.length) {
            this.partyIndex = Math.max(0, this.logic.partyInventory.length - 1);
            if (this.logic.partyInventory.length === 0) this.partyIndex = -1;
        }

        // AUTO-SWITCH FOCUS: If the active panel is empty but the other is not, jump over.
        if (this.activePanel === 'vendor' && this.vendorIndex === -1 && this.logic.partyInventory.length > 0) {
            this.activePanel = 'party';
            this.partyIndex = 0;
        } else if (this.activePanel === 'party' && this.partyIndex === -1 && this.logic.vendorWares.length > 0) {
            this.activePanel = 'vendor';
            this.vendorIndex = 0;
        }

        this._updateScrollMaxes();
    }

    scrollToItem(panel, index, center = false) {
        const list = panel === 'vendor' ? this.logic.vendorWares : this.logic.partyInventory;
        this.scrollManager.scrollToIndex(panel, index, {
            totalItems: list.length,
            columns: this.COLS,
            itemHeight: this.layout.itemHeight || 48
        }, center);
    }

    // ========================================================
    // CONTEXT MENU
    // ========================================================
    _openItemContextMenu(item, source, index) {
        let x = this.mouse.x;
        let y = this.mouse.y;
        
        if (x === 0 && y === 0 && this.currentHitboxes) {
            const hitboxId = source === 'vendor' ? `VENDOR_ITEM_${index}` : `PARTY_ITEM_${index}`;
            const box = this.currentHitboxes.find(h => h.id === hitboxId);
            if (box) {
                x = box.x + box.w / 2;
                y = box.y + box.h / 2;
            }
        }
        
        const def = ItemDefinitions[item.defId || item.id] || {};
        const itemName = item.name || def.name || "Item";
        const options = [];
        
        if (source === 'vendor') {
            const cost = def.cost || def.value || 10;
            options.push({ label: `Buy ${itemName} (${cost}c)`, actionId: 'BUY' });
        } else {
            const value = Math.floor((def.cost || def.value || 10) / 2);
            options.push({ label: `Sell ${itemName} (${value}c)`, actionId: 'SELL' });
        }
        options.push({ label: "Cancel", actionId: 'CANCEL' });
        
        this.contextMenuManager.open(x, y, options, { item, source, index });
        this.playConfirmSound();
    }

    executeMenuAction(actionId, payload) {
        if (actionId === 'CANCEL') {
            this.playCancelSound();
            return;
        }
        const { item, source } = payload;
        
        if (actionId === 'BUY' && source === 'vendor') {
            if(this.logic.buyItem(item, 1)) this.playConfirmSound();
            else events.emit('PLAY_SFX', { id: 'ui_error' });
        } else if (actionId === 'SELL' && source === 'party') {
            if(this.logic.sellItem(item, 1)) this.playConfirmSound();
            else events.emit('PLAY_SFX', { id: 'ui_error' });
        }
        this._validateIndices();
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
        
        // 1. If actively typing/navigating, completely ignore the dead resting mouse
        if (this.inputMode === 'keyboard') return;

        // 2. Don't process hovers if dragging or menus are active
        if (this.dragAndDropManager.dragState.active || this.contextMenuManager.menu) return;

        if (hitboxId) {
            if (hitboxId.startsWith('VENDOR_ITEM_')) {
                const idx = parseInt(hitboxId.split('_')[2], 10);
                if (!isNaN(idx) && (this.vendorIndex !== idx || this.activePanel !== 'vendor')) {
                    this.activePanel = 'vendor';
                    this.vendorIndex = idx;
                    this.partyIndex = -1;
                }
            } else if (hitboxId.startsWith('PARTY_ITEM_')) {
                const idx = parseInt(hitboxId.split('_')[2], 10);
                if (!isNaN(idx) && (this.partyIndex !== idx || this.activePanel !== 'party')) {
                    this.activePanel = 'party';
                    this.partyIndex = idx;
                    this.vendorIndex = -1;
                }
            } else {
                this.vendorIndex = -1;
                this.partyIndex = -1;
            }
        } else {
            this.vendorIndex = -1;
            this.partyIndex = -1;
        }
    }

    onClick(hitboxId) {
        // AGGRESSIVE WAKE UP: Clicking any button instantly reclaims control for the mouse
        this.inputMode = 'mouse';

        if (!hitboxId) {
            if (this.contextMenuManager.menu) {
                this.contextMenuManager.close();
                this.playCancelSound();
            } else {
                this.vendorIndex = -1;
                this.partyIndex = -1;
                this.playCancelSound();
            }
            return;
        }
        
        if (this.contextMenuManager.menu) {
            if (hitboxId.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(hitboxId.split('_')[2], 10);
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
        
        if (hitboxId.startsWith('VENDOR_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.vendorWares[idx];
            if (item) {
                this.activePanel = 'vendor';
                this.vendorIndex = idx;
                this._openItemContextMenu(item, 'vendor', idx);
            }
        } else if (hitboxId.startsWith('PARTY_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.partyInventory[idx];
            if (item) {
                this.activePanel = 'party';
                this.partyIndex = idx;
                this._openItemContextMenu(item, 'party', idx);
            }
        }
    }

    onRightClick(hitboxId) {
        this.inputMode = 'mouse'; // Reclaim control for mouse
        this.playCancelSound();
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.close();
        } else {
            this._handleBack();
        }
    }

    _handleBack() {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
            this.playCancelSound();
            return;
        }
        this.playCancelSound();
        events.emit('CHANGE_SCENE', { scene: this.returnScene });
    }

    // ========================================================
    // DRAG AND DROP
    // ========================================================
    onDragStart(hitboxId) {
        this.inputMode = 'mouse'; // Reclaim control for mouse
        
        if (!hitboxId || this.contextMenuManager.menu) return;
        
        if (hitboxId.includes('SCROLLBAR_THUMB')) {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
            return;
        }
        
        if (hitboxId.startsWith('VENDOR_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.vendorWares[idx];
            if (item) {
                this.activePanel = 'vendor';
                this.vendorIndex = idx;
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 });
                this.dragAndDropManager.startDrag(
                    item, 'vendor', idx, 
                    this.mouse.x, this.mouse.y, 
                    this._handleCommerceDrop.bind(this)
                );
            }
        } else if (hitboxId.startsWith('PARTY_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.partyInventory[idx];
            if (item) {
                this.activePanel = 'party';
                this.partyIndex = idx;
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 });
                this.dragAndDropManager.startDrag(
                    item, 'party', idx, 
                    this.mouse.x, this.mouse.y, 
                    this._handleCommerceDrop.bind(this)
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
            this.dragAndDropManager.endDrag(targetHitboxId || 'EMPTY_SPACE');
        }
    }

    _handleCommerceDrop(item, source, originSlot, targetId) {
        let dropSide = null;
        if (targetId) {
            if (targetId.includes('PARTY')) dropSide = 'party';
            else if (targetId.includes('VENDOR')) dropSide = 'vendor';
        }
        if (!dropSide) {
            const partyStartX = this.layout.partyBounds?.x || 0;
            if (partyStartX > 0) {
                dropSide = this.mouse.x >= partyStartX ? 'party' : 'vendor';
            }
        }
        
        if (source === dropSide) return;
        
        if (source === 'vendor' && dropSide === 'party') {
            if (this.logic.buyItem(item, 1)) events.emit('PLAY_SFX', { id: 'coins_jingle' });
            else events.emit('PLAY_SFX', { id: 'ui_error' });
        } else if (source === 'party' && dropSide === 'vendor') {
            if (this.logic.sellItem(item, 1)) events.emit('PLAY_SFX', { id: 'coins_jingle' });
            else events.emit('PLAY_SFX', { id: 'ui_error' });
        }
        
        this._validateIndices();
    }

    handleScroll(delta) {
        this.inputMode = 'mouse'; // Reclaim control for mouse
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
        this.currentHitboxes = hitboxes; 
        this._updateScrollMaxes();
        this._syncScrollZones();
    }

    _updateScrollMaxes() {
        const ROW_H = this.layout.itemHeight || 48;
        const VIEW_H = this.layout.viewportH || 300;
        
        const vendorRows = Math.ceil(this.logic.vendorWares.length / this.COLS);
        const partyRows = Math.ceil(this.logic.partyInventory.length / this.COLS);
        
        this.layout.vendorMaxScroll = Math.max(0, (vendorRows * ROW_H) - VIEW_H);
        this.layout.partyMaxScroll = Math.max(0, (partyRows * ROW_H) - VIEW_H);
    }

    getFocusedItem() {
        if (this.dragAndDropManager.dragState.active) {
            return this.dragAndDropManager.dragState.payload;
        }
        if (this.activePanel === 'vendor' && this.vendorIndex !== -1) {
            return this.logic.vendorWares[this.vendorIndex] || null;
        }
        if (this.activePanel === 'party' && this.partyIndex !== -1) {
            return this.logic.partyInventory[this.partyIndex] || null;
        }
        return null;
    }

    getState() {
        let activeTooltipId = this.hoveredHitboxId;
        if (!activeTooltipId || (!activeTooltipId.includes('VENDOR_ITEM_') && !activeTooltipId.includes('PARTY_ITEM_'))) {
            if (this.activePanel === 'vendor' && this.vendorIndex !== -1) {
                activeTooltipId = `VENDOR_ITEM_${this.vendorIndex}`;
            } else if (this.activePanel === 'party' && this.partyIndex !== -1) {
                activeTooltipId = `PARTY_ITEM_${this.partyIndex}`;
            }
        }
        
        return {
            vendorWares: this.logic.vendorWares,
            partyInventory: this.logic.partyInventory,
            partyCurrency: this.logic.getPartyCurrency(),
            shopName: this.logic.getShopName(),
            activePanel: this.activePanel,
            vendorIndex: this.activePanel === 'vendor' ? this.vendorIndex : -1,
            partyIndex: this.activePanel === 'party' ? this.partyIndex : -1,
            focusedItem: this.getFocusedItem(),
            vendorScrollOffset: this.vendorScrollOffset,
            partyScrollOffset: this.partyScrollOffset,
            mouse: this.mouse,
            hoveredHitboxId: activeTooltipId,
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
}
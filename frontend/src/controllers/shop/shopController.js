import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { ShopLogic } from './shopLogic.js';

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
    'Backspace': 'CANCEL'
    // Removed TAB binding - we use fluid grid wrapping now!
};

export class ShopController extends BaseController {
    constructor(input, data) {
        console.log("2b. CONTROLLER CONSTRUCTOR CALLED WITH:", data);
        super(input, data);
        this.config = data || {};
        this.returnScene = this.config.returnScene || 'overworld';
        this.logic = new ShopLogic(this.config);

        // --- View & Keyboard State ---
        this.activePanel = 'vendor'; // 'vendor' or 'party'
        this.vendorIndex = -1;
        this.partyIndex = -1;
        this.COLS = 4;
        
        this.layout = {
            vendorBounds: null,
            partyBounds: null,
            vendorMaxScroll: 0,
            partyMaxScroll: 0,
            viewportH: 300,
            itemHeight: 48
        };
        
        this.vendorScrollOffset = 0;
        this.partyScrollOffset = 0;

        // --- Managers ---
        this.dragAndDropManager = new DragAndDropManager();
        this.scrollManager = new ScrollManager();
        this.contextMenuManager = new ContextMenuManager({
            onAction: (actionId, payload) => this.executeMenuAction(actionId, payload)
        });

        this._syncScrollZones();
        this.setupInteractionHandlers();
    }

    // ========================================================
    // LIFECYCLE RE-INITIALIZATION (THE FIX)
    // ========================================================
    init(data) {
        console.log("2. CONTROLLER INIT CALLED WITH:", data);
        if (super.init) super.init(data);

        if (data) {
            this.config = data;
            this.returnScene = this.config.returnScene || 'overworld';
            
            // RE-INITIALIZE THE LOGIC with the dynamically passed wares
            this.logic = new ShopLogic(this.config);

            // Reset state so the shop opens cleanly
            this.activePanel = 'vendor';
            this.vendorIndex = -1;
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

    // ========================================================
    // KEYBOARD NAVIGATION LOGIC
    // ========================================================
    handleKeyDown(code, e) {
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

    switchPanel() {
        // Kept purely as a fallback helper for mouse clicks or logic checks
        this.playNavSound();
        this.hoveredHitboxId = null; 

        if (this.activePanel === 'vendor') {
            this.activePanel = 'party';
            if (this.partyIndex === -1 && this.logic.partyInventory.length > 0) {
                this.partyIndex = 0;
            }
            this.vendorIndex = -1;
        } else {
            this.activePanel = 'vendor';
            if (this.vendorIndex === -1 && this.logic.vendorWares.length > 0) {
                this.vendorIndex = 0;
            }
            this.partyIndex = -1;
        }
    }

    handleGridNavigation(intent) {
        const isVendor = this.activePanel === 'vendor';
        const list = isVendor ? this.logic.vendorWares : this.logic.partyInventory;
        let currentIndex = isVendor ? this.vendorIndex : this.partyIndex;

        // 1. Safety check for completely empty shop
        if (this.logic.vendorWares.length === 0 && this.logic.partyInventory.length === 0) return;

        // 2. If the current list is empty but the user moves, jump to the other panel
        if (list.length === 0) {
            if (intent === 'LEFT' || intent === 'RIGHT') {
                this._jumpToOppositePanel(0, intent === 'LEFT' ? this.COLS - 1 : 0);
            }
            return;
        }

        // 3. Setup initial focus if needed
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

        // 4. Calculate Movement
        if (intent === 'UP') {
            currentIndex = Math.max(0, currentIndex - this.COLS);
        } else if (intent === 'DOWN') {
            currentIndex = Math.min(maxIndex, currentIndex + this.COLS);
        } else if (intent === 'LEFT') {
            if (col === 0) {
                // At left edge: Jump to the right edge of the opposite panel
                this._jumpToOppositePanel(row, this.COLS - 1);
                return;
            } else {
                currentIndex = currentIndex - 1;
            }
        } else if (intent === 'RIGHT') {
            if (col === this.COLS - 1 || currentIndex === maxIndex) {
                // At right edge (or end of list): Jump to the left edge of the opposite panel
                this._jumpToOppositePanel(row, 0);
                return;
            } else {
                currentIndex = currentIndex + 1;
            }
        }

        // 5. Apply Movement
        if (currentIndex !== oldIndex) {
            this.playNavSound();
            this._setIndex(currentIndex);
            this.hoveredHitboxId = null; // Clear mouse hover state

            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
                this.scrollToItem(this.activePanel, currentIndex);
            }
        }

        // 6. Execution
        if (intent === 'CONFIRM') {
            const item = list[currentIndex];
            if (item) {
                if (isVendor) {
                    if(this.logic.buyItem(item, 1)) this.playConfirmSound();
                    else events.emit('PLAY_SFX', { id: 'ui_error' });
                } else {
                    if(this.logic.sellItem(item, 1)) this.playConfirmSound();
                    else events.emit('PLAY_SFX', { id: 'ui_error' });
                }
                this._validateIndices();
            }
        }
    }

    _jumpToOppositePanel(targetRow, targetCol) {
        const targetPanel = this.activePanel === 'vendor' ? 'party' : 'vendor';
        const targetList = targetPanel === 'vendor' ? this.logic.vendorWares : this.logic.partyInventory;

        if (targetList.length === 0) {
            // Target side is empty! Wrap around to the opposite edge of the SAME panel instead.
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

        // Smoothly jump into the corresponding row/col of the other panel
        let newIndex = (targetRow * this.COLS) + targetCol;
        if (newIndex >= targetList.length) {
            newIndex = targetList.length - 1; // Cap to the last available item
        }

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
        if (this.vendorIndex >= this.logic.vendorWares.length) {
            this.vendorIndex = Math.max(0, this.logic.vendorWares.length - 1);
            if (this.logic.vendorWares.length === 0) this.vendorIndex = -1;
        }
        if (this.partyIndex >= this.logic.partyInventory.length) {
            this.partyIndex = Math.max(0, this.logic.partyInventory.length - 1);
            if (this.logic.partyInventory.length === 0) this.partyIndex = -1;
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
    // MOUSE & CLICK LOGIC
    // ========================================================
    onHover(hitboxId) {
        super.onHover(hitboxId);

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
            }
        }
    }

    onClick(hitboxId) {
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
                this.playConfirmSound();
                this.contextMenuManager.executeAction(optIndex);
                return;
            }
            this.contextMenuManager.close();
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
                if (this.logic.buyItem(item, 1)) this.playConfirmSound();
                else events.emit('PLAY_SFX', { id: 'ui_error' });
                this._validateIndices();
            }
        } else if (hitboxId.startsWith('PARTY_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.partyInventory[idx];
            if (item) {
                this.activePanel = 'party';
                this.partyIndex = idx;
                if (this.logic.sellItem(item, 1)) this.playConfirmSound();
                else events.emit('PLAY_SFX', { id: 'ui_error' });
                this._validateIndices();
            }
        }
    }

    onRightClick(hitboxId) {
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
                    item, 'vendor', idx, this.mouse.x, this.mouse.y,
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
                    item, 'party', idx, this.mouse.x, this.mouse.y,
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

    // ========================================================
    // SCROLLING & HITBOX UPDATES
    // ========================================================
    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
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

    // ========================================================
    // STATE EXPORT
    // ========================================================
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
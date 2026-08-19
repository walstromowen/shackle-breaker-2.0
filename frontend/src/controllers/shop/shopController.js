import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ShopLogic } from './shopLogic.js';

export class ShopController extends BaseController {
    constructor(input, data) {
        super(input);
        this.logic = new ShopLogic(data);
        
        this.COLS = 4;
        this.state = 'VENDOR'; // 'VENDOR' or 'PARTY'
        this.selectedIndex = -1;

        this.layout = {
            vendorBounds: null, vendorMaxScroll: 0, vendorViewportH: 300, vendorScrollOffset: 0,
            partyBounds: null, partyMaxScroll: 0, partyViewportH: 300, partyScrollOffset: 0,
            itemHeight: 48
        };

        this.scrollManager = new ScrollManager();
        this.dragAndDropManager = new DragAndDropManager();
        this.contextMenuManager = new ContextMenuManager({
            onAction: (actionId, payload) => this.executeMenuAction(actionId, payload)
        });

        this._syncScrollZones();
    }

    _syncScrollZones() {
        // Sync Vendor Scroller
        const vendorRows = Math.ceil(this.logic.vendorInventory.length / this.COLS);
        this.layout.vendorMaxScroll = Math.max(0, (vendorRows * this.layout.itemHeight) - this.layout.vendorViewportH);
        this.scrollManager.registerZone('vendor', {
            bounds: this.layout.vendorBounds,
            maxScroll: this.layout.vendorMaxScroll,
            viewportH: this.layout.vendorViewportH,
            onChange: (offset) => this.layout.vendorScrollOffset = offset
        });

        // Sync Party Scroller
        const partyRows = Math.ceil(this.logic.partyInventory.length / this.COLS);
        this.layout.partyMaxScroll = Math.max(0, (partyRows * this.layout.itemHeight) - this.layout.partyViewportH);
        this.scrollManager.registerZone('party', {
            bounds: this.layout.partyBounds,
            maxScroll: this.layout.partyMaxScroll,
            viewportH: this.layout.partyViewportH,
            onChange: (offset) => this.layout.partyScrollOffset = offset
        });
    }

    // --- UIInteractionManager Hooks ---

    onClick(hitboxId) {
        if (!hitboxId) {
            if (this.contextMenuManager.menu) {
                this.contextMenuManager.close();
                events.emit('PLAY_SFX', { id: 'ui_cancel' });
            }
            return;
        }

        if (this.contextMenuManager.menu) {
            if (hitboxId.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(hitboxId.split('_')[2], 10);
                this.contextMenuManager.executeAction(optIndex);
                events.emit('PLAY_SFX', { id: 'ui_confirm' });
                return;
            }
            this.contextMenuManager.close();
        }

        if (hitboxId === 'BTN_BACK') {
            return this.onRightClick(hitboxId);
        }

        // Handle Grid Clicks
        let item = null;
        let source = '';

        if (hitboxId.startsWith('VENDOR_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            item = this.logic.vendorInventory[idx];
            source = 'vendor';
            this.state = 'VENDOR';
            this.selectedIndex = idx;
        } else if (hitboxId.startsWith('PARTY_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            item = this.logic.partyInventory[idx];
            source = 'party';
            this.state = 'PARTY';
            this.selectedIndex = idx;
        }

        // Open Commerce Menu
        if (item) {
            events.emit('PLAY_SFX', { id: 'ui_confirm' });
            const options = this._buildMenuOptions(item, source);
            const menuX = this.mouse.x;
            const menuY = this.mouse.y;
            this.contextMenuManager.open(menuX, menuY, options, { item, source });
        }
    }

    onRightClick(hitboxId) {
        events.emit('PLAY_SFX', { id: 'ui_cancel' });
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.close();
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
        } else {
            // Exit Shop
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    onDragStart(hitboxId) {
        if (!hitboxId || this.contextMenuManager.menu) return;

        if (hitboxId.startsWith('VENDOR_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.vendorInventory[idx];
            if (item) {
                events.emit('PLAY_SFX', { id: 'ui_drag_start' });
                this.dragAndDropManager.startDrag(item, 'vendor', idx, this.mouse.x, this.mouse.y, this.onDrop.bind(this));
            }
        } else if (hitboxId.startsWith('PARTY_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.logic.partyInventory[idx];
            if (item) {
                events.emit('PLAY_SFX', { id: 'ui_drag_start' });
                this.dragAndDropManager.startDrag(item, 'party', idx, this.mouse.x, this.mouse.y, this.onDrop.bind(this));
            }
        }
    }

    onDragMove(x, y) {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.updateDrag(x, y);
        }
    }

    onDrop(dragId, targetId) {
        const dragState = this.dragAndDropManager.dragState;
        if (!dragState.active) return;
        
        const item = dragState.payload;
        const source = dragState.sourceId;
        
        this.dragAndDropManager.endDrag(targetId);

        // Process Drag-and-Drop Commerce
        if (targetId) {
            if (source === 'vendor' && targetId.includes('PARTY')) {
                // Dragged from Vendor to Party -> BUY
                if (this.logic.buyItem(item, 1)) {
                    events.emit('PLAY_SFX', { id: 'coins_jingle' });
                } else {
                    events.emit('PLAY_SFX', { id: 'ui_error' }); // Not enough gold
                }
            } else if (source === 'party' && targetId.includes('VENDOR')) {
                // Dragged from Party to Vendor -> SELL
                if (this.logic.sellItem(item, 1)) {
                    events.emit('PLAY_SFX', { id: 'coins_jingle' });
                }
            }
        }
        this._syncScrollZones();
    }

    // --- Core Architecture Hooks ---

    handleScroll(delta) {
        // Determine which side we are hovering over based on mouse X
        const isHoveringParty = this.mouse.x > window.innerWidth / 2;
        const zoneId = isHoveringParty ? 'party' : 'vendor';
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta, zoneId);
    }

    handleKeyDown(code, e) {
        if (code === 'Escape' || code === 'Backspace') {
            this.onRightClick(null);
        }
        // Could implement Arrow keys + Enter here mirroring Character Summary navigation
    }

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
        this._syncScrollZones();
    }

    // --- Private / Helpers ---

    _buildMenuOptions(item, source) {
        const options = [];
        const cost = this.logic.getItemValue(item, source === 'vendor');
        const qty = item.qty || 1;

        if (source === 'vendor') {
            options.push({ label: `Buy 1 (-${cost}g)`, actionId: 'BUY_ONE' });
            if (qty > 1) options.push({ label: `Buy All (-${cost * qty}g)`, actionId: 'BUY_ALL' });
        } else if (source === 'party') {
            options.push({ label: `Sell 1 (+${cost}g)`, actionId: 'SELL_ONE' });
            if (qty > 1) options.push({ label: `Sell All (+${cost * qty}g)`, actionId: 'SELL_ALL' });
        }
        return options;
    }

    executeMenuAction(actionId, payload) {
        const { item, source } = payload;
        let success = false;

        switch (actionId) {
            case 'BUY_ONE': success = this.logic.buyItem(item, 1); break;
            case 'BUY_ALL': success = this.logic.buyItem(item, item.qty); break;
            case 'SELL_ONE': success = this.logic.sellItem(item, 1); break;
            case 'SELL_ALL': success = this.logic.sellItem(item, item.qty); break;
        }

        if (success) {
            events.emit('PLAY_SFX', { id: 'coins_jingle' });
            this._syncScrollZones();
        } else {
            events.emit('PLAY_SFX', { id: 'ui_error' });
        }
    }

    getState() {
        return {
            vendorInventory: this.logic.vendorInventory,
            partyInventory: this.logic.partyInventory,
            partyGold: this.logic.partyGold,
            state: this.state,
            selectedIndex: this.selectedIndex,
            layout: this.layout,
            mouse: this.mouse,
            hoveredHitboxId: this.hoveredHitboxId,
            contextMenu: this.contextMenuManager.menu,
            heldItem: this.dragAndDropManager.dragState.active ? this.dragAndDropManager.dragState.payload : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
export class ScrollManager {
    constructor(controller) {
        this.controller = controller;
        this.dragState = {
            active: false,
            target: null, // 'inventory' | 'details'
            startY: 0,
            startScroll: 0
        };
    }

    handleScrollWheel(delta) {
        const mx = this.controller.mouse.x;
        const my = this.controller.mouse.y;
        const layout = this.controller.layout;

        // Check Inventory Bounds
        if (layout.inventoryBounds && 
            mx >= layout.inventoryBounds.x && 
            mx <= layout.inventoryBounds.x + layout.inventoryBounds.w &&
            my >= layout.inventoryBounds.y && 
            my <= layout.inventoryBounds.y + layout.inventoryBounds.h) {
            
            const max = layout.inventoryMaxScroll || 0;
            let newScroll = this.controller.inventoryScrollOffset + delta;
            this.controller.inventoryScrollOffset = Math.max(0, Math.min(newScroll, max));
            return true; 
        }

        // Check Details Bounds
        if (this.controller.viewMode === 'ITEM' && layout.detailBounds && 
            mx >= layout.detailBounds.x && 
            mx <= layout.detailBounds.x + layout.detailBounds.w &&
            my >= layout.detailBounds.y && 
            my <= layout.detailBounds.y + layout.detailBounds.h) {
            
            const max = layout.detailMaxScroll || 0;
            let newScroll = this.controller.detailsScrollOffset + delta;
            this.controller.detailsScrollOffset = Math.max(0, Math.min(newScroll, max));
            return true;
        }

        return false;
    }

    handleMouseDown(targetId, y) {
        if (targetId === 'SCROLLBAR_THUMB') {
            this.dragState.active = true;
            this.dragState.target = 'details';
            this.dragState.startY = y;
            this.dragState.startScroll = this.controller.detailsScrollOffset;
            return true;
        }
        else if (targetId === 'INV_SCROLLBAR_THUMB') {
            this.dragState.active = true;
            this.dragState.target = 'inventory';
            this.dragState.startY = y;
            this.dragState.startScroll = this.controller.inventoryScrollOffset;
            return true;
        }
        return false;
    }

    handleMouseMove(y, isMouseDown) {
        if (this.dragState.active && isMouseDown) {
            this._handleScrollDrag(y);
        } else if (!isMouseDown) {
            this.dragState.active = false;
        }
    }

    _handleScrollDrag(y) {
        const mouseDelta = y - this.dragState.startY;
        let viewportH, maxScroll, currentStartScroll;
        
        if (this.dragState.target === 'inventory') {
            viewportH = this.controller.layout.inventoryViewportH || 100;
            maxScroll = this.controller.layout.inventoryMaxScroll || 1;
            currentStartScroll = this.dragState.startScroll;
        } else {
            viewportH = this.controller.layout.detailViewportH || 100;
            maxScroll = this.controller.layout.detailMaxScroll || 1;
            currentStartScroll = this.dragState.startScroll;
        }

        const contentH = maxScroll + viewportH;
        const scrollRatio = contentH / viewportH; 
        let newOffset = currentStartScroll + (mouseDelta * scrollRatio);

        if (newOffset < 0) newOffset = 0;
        if (newOffset > maxScroll) newOffset = maxScroll;

        if (this.dragState.target === 'inventory') {
            this.controller.inventoryScrollOffset = newOffset;
        } else {
            this.controller.detailsScrollOffset = newOffset;
        }
    }

    scrollToItem(index, center = false) {
        if (index < 0 || index >= this.controller.filteredInventory.length) return;

        const ROW_H = this.controller.layout.itemHeight || 48; 
        const VIEW_H = this.controller.layout.inventoryViewportH || 300;
        const COLS = this.controller.COLS;
        
        const rowIndex = Math.floor(index / COLS);
        const totalRows = Math.ceil(this.controller.filteredInventory.length / COLS);

        const contentHeight = totalRows * ROW_H;
        this.controller.layout.inventoryMaxScroll = Math.max(0, contentHeight - VIEW_H);
        
        const itemTop = rowIndex * ROW_H;
        const itemBottom = itemTop + ROW_H;

        if (center) {
            const itemCenter = itemTop + (ROW_H / 2);
            const viewCenter = VIEW_H / 2;
            this.controller.inventoryScrollOffset = itemCenter - viewCenter;
        } 
        else {
            if (itemTop < this.controller.inventoryScrollOffset) {
                this.controller.inventoryScrollOffset = itemTop;
            }
            else if (itemBottom > this.controller.inventoryScrollOffset + VIEW_H) {
                this.controller.inventoryScrollOffset = itemBottom - VIEW_H;
            }
        }
        
        this.controller.inventoryScrollOffset = Math.max(0, Math.min(this.controller.inventoryScrollOffset, this.controller.layout.inventoryMaxScroll));
    }

    resetScroll() {
        this.controller.detailsScrollOffset = 0;
        this.controller.inventoryScrollOffset = 0; 
    }
}
export class ScrollManager {
    constructor() {
        // Map of registered scroll zones (e.g., 'inventory', 'details')
        this.zones = new Map(); 
        
        this.dragState = {
            active: false,
            zoneId: null, // The ID of the zone currently being dragged
            startY: 0,
            startScroll: 0
        };
    }

    /**
     * Registers or updates a scrollable zone.
     * @param {string} id - Unique identifier for the zone.
     * @param {Object} config - Configuration for the zone.
     * - bounds: {x, y, w, h} (The clickable/scrollable area)
     * - maxScroll: number (Maximum scroll offset)
     * - viewportH: number (Height of the visible area)
     * - thumbIds: Array<string> (IDs of UI elements that act as scrollbar thumbs)
     * - onChange: function(newOffset) (Callback fired when offset changes)
     */
    registerZone(id, config) {
        const existing = this.zones.get(id) || { offset: 0 };
        this.zones.set(id, { ...existing, ...config });
    }

    // --- STATE ACCESS ---

    getOffset(id) {
        return this.zones.get(id)?.offset || 0;
    }

    setOffset(id, newOffset) {
        const zone = this.zones.get(id);
        if (!zone) return;

        const max = zone.maxScroll || 0;
        const clamped = Math.max(0, Math.min(newOffset, max));
        
        if (zone.offset !== clamped) {
            zone.offset = clamped;
            if (typeof zone.onChange === 'function') {
                zone.onChange(clamped);
            }
        }
    }

    resetAllScrolls() {
        for (const id of this.zones.keys()) {
            this.setOffset(id, 0);
        }
    }

    // --- EVENT HANDLING ---

    handleScrollWheel(x, y, delta) {
        for (const [id, zone] of this.zones.entries()) {
            if (this._isInside(x, y, zone.bounds)) {
                this.setOffset(id, zone.offset + delta);
                return true; 
            }
        }
        return false;
    }

    handleMouseDown(targetId, y) {
        for (const [id, zone] of this.zones.entries()) {
            if (zone.thumbIds && zone.thumbIds.includes(targetId)) {
                this.dragState = {
                    active: true,
                    zoneId: id,
                    startY: y,
                    startScroll: zone.offset
                };
                return true;
            }
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

    // --- INTERNAL LOGIC ---

    _handleScrollDrag(y) {
        const zone = this.zones.get(this.dragState.zoneId);
        if (!zone) return;

        const viewportH = zone.viewportH || 100;
        const maxScroll = zone.maxScroll || 1;
        const contentH = maxScroll + viewportH;

        if (viewportH === 0) return; 

        const scrollRatio = contentH / viewportH; 
        const mouseDelta = y - this.dragState.startY;

        const newOffset = this.dragState.startScroll + (mouseDelta * scrollRatio);
        this.setOffset(this.dragState.zoneId, newOffset);
    }

    _isInside(x, y, bounds) {
        if (!bounds) return false;
        return x >= bounds.x && x <= bounds.x + bounds.w &&
               y >= bounds.y && y <= bounds.y + bounds.h;
    }

    // --- GRID/LIST UTILITIES ---

    /**
     * Calculates the required scroll offset to bring a specific grid item into view.
     */
    scrollToIndex(zoneId, index, gridConfig, center = false) {
        const zone = this.zones.get(zoneId);
        if (!zone) return;

        const { totalItems, columns, itemHeight } = gridConfig;
        if (index < 0 || index >= totalItems) return;

        const rowIndex = Math.floor(index / columns);
        const totalRows = Math.ceil(totalItems / columns);
        const viewportH = zone.viewportH || 300;

        // Ensure maxScroll is up to date based on the grid config
        const contentHeight = totalRows * itemHeight;
        zone.maxScroll = Math.max(0, contentHeight - viewportH);

        const itemTop = rowIndex * itemHeight;
        const itemBottom = itemTop + itemHeight;
        
        let targetOffset = zone.offset;

        if (center) {
            targetOffset = (itemTop + (itemHeight / 2)) - (viewportH / 2);
        } else {
            if (itemTop < zone.offset) {
                targetOffset = itemTop; // Scroll up to top edge
            } else if (itemBottom > zone.offset + viewportH) {
                targetOffset = itemBottom - viewportH; // Scroll down to bottom edge
            }
        }

        this.setOffset(zoneId, targetOffset);
    }
}
export class ScrollManager {
    constructor() {
        this.zones = new Map(); 
        
        // Tuning parameter for smoothness. 
        // Lower = floatier, Higher = snappier. (e.g., 0.15 is 15% closer per frame)
        this.lerpSpeed = 0.05; 
        
        this.dragState = {
            active: false,
            zoneId: null,
            startY: 0,
            startScroll: 0
        };
    }

    registerZone(id, config) {
        const existing = this.zones.get(id) || { offset: 0, targetOffset: 0 };
        this.zones.set(id, { ...existing, ...config });
    }

    // --- SMOOTHNESS UPDATE LOOP ---
    // THIS IS THE METHOD YOUR GAME LOOP WAS LOOKING FOR
    update(dt) {
        // A simple, bulletproof lerp. 
        // We move a fixed percentage of the remaining distance every frame.
        // Set your this.lerpSpeed back to something like 0.25
        
        for (const [id, zone] of this.zones.entries()) {
            const distance = zone.targetOffset - zone.offset;

            // If we are more than half a pixel away, glide towards it
            if (Math.abs(distance) > 0.5) {
                zone.offset += distance * this.lerpSpeed;
            } else {
                // We are close enough, snap to the exact pixel to prevent jitter
                zone.offset = zone.targetOffset;
            }
            
            if (typeof zone.onChange === 'function') {
                zone.onChange(zone.offset);
            }
        }
    }

    // --- STATE ACCESS ---

    getOffset(id) {
        return this.zones.get(id)?.offset || 0;
    }

    setOffset(id, newOffset, instant = false) {
        const zone = this.zones.get(id);
        if (!zone) return;

        const max = zone.maxScroll || 0;
        const clamped = Math.max(0, Math.min(newOffset, max));
        
        zone.targetOffset = clamped;
        
        if (instant) {
            zone.offset = clamped;
        }
    }

    resetAllScrolls() {
        for (const id of this.zones.keys()) {
            this.setOffset(id, 0, true); // Instant reset, no smoothing
        }
    }

    // --- SEMANTIC DRAG HANDLING ---

    handleScrollWheel(x, y, delta) {
        for (const [id, zone] of this.zones.entries()) {
            if (this._isInside(x, y, zone.bounds)) {
                // Add delta to the target, not the current offset
                this.setOffset(id, zone.targetOffset + delta);
                return true; 
            }
        }
        return false;
    }

    handleDragStart(targetId, y) {
        for (const [id, zone] of this.zones.entries()) {
            if (zone.thumbIds && zone.thumbIds.includes(targetId)) {
                this.dragState = {
                    active: true,
                    zoneId: id,
                    startY: y,
                    startScroll: zone.targetOffset // Base drag off target
                };
                return true;
            }
        }
        return false;
    }

    handleDragMove(y) {
        if (this.dragState.active) {
            this._handleScrollDrag(y);
        }
    }

    handleDragEnd() {
        this.dragState.active = false;
        this.dragState.zoneId = null;
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
        
        // When dragging the bar, we want it to feel instantaneous 
        this.setOffset(this.dragState.zoneId, newOffset, true);
    }

    _isInside(x, y, bounds) {
        if (!bounds) return false;
        return x >= bounds.x && x <= bounds.x + bounds.w &&
               y >= bounds.y && y <= bounds.y + bounds.h;
    }

    // --- GRID/LIST UTILITIES ---

    scrollToIndex(zoneId, index, gridConfig, center = false) {
        const zone = this.zones.get(zoneId);
        if (!zone) return;

        const { totalItems, columns, itemHeight } = gridConfig;
        if (index < 0 || index >= totalItems) return;

        const rowIndex = Math.floor(index / columns);
        const totalRows = Math.ceil(totalItems / columns);
        const viewportH = zone.viewportH || 300;

        const contentHeight = totalRows * itemHeight;
        zone.maxScroll = Math.max(0, contentHeight - viewportH);

        const itemTop = rowIndex * itemHeight;
        const itemBottom = itemTop + itemHeight;
        
        let targetOffset = zone.targetOffset;

        if (center) {
            targetOffset = (itemTop + (itemHeight / 2)) - (viewportH / 2);
        } else {
            if (itemTop < zone.targetOffset) {
                targetOffset = itemTop; 
            } else if (itemBottom > zone.targetOffset + viewportH) {
                targetOffset = itemBottom - viewportH; 
            }
        }

        // Uses smoothing
        this.setOffset(zoneId, targetOffset);
    }
}
export class ScrollManager {
    constructor() {
        this.zones = new Map(); 
        
        // Tuning parameter for smoothness. 
        // Lower = floatier, Higher = snappier. (e.g., 0.15 is 15% closer per frame, measured at 60 fps)
        this.lerpSpeed = 0.05; 

        // How far ONE notch of the mouse wheel scrolls, in px, on every screen. The controllers pass the wheel delta (the sign is the
        // direction); its size and any multiplier a controller adds (x40, x80 ...) no longer matter, so every list scrolls alike.
        // A zone can override it with  registerZone(id, { wheelStep: n }).
        this.wheelStep = 96; 
        
        this.dragState = {
            active: false,
            zoneId: null,
            startY: 0,
            startScroll: 0
        };
    }

    // --- NEW GETTER TO SYNC WITH PIPELINE ---
    get isDragging() {
        return this.dragState.active;
    }

    registerZone(id, config) {
        const existing = this.zones.get(id) || { offset: 0, targetOffset: 0 };
        this.zones.set(id, { ...existing, ...config });
    }

    // --- SMOOTHNESS UPDATE LOOP ---
    // THIS IS THE METHOD YOUR GAME LOOP WAS LOOKING FOR
    update(dt) {
        // Glide a fixed percentage of the remaining distance per 1/60 s, so the feel is the same at 30, 60 or 144 fps.
        const frames = (typeof dt === 'number' && dt > 0) ? Math.min(dt, 0.1) * 60 : 1;
        const step = 1 - Math.pow(1 - this.lerpSpeed, frames);
        
        for (const [id, zone] of this.zones.entries()) {
            const distance = zone.targetOffset - zone.offset;

            // If we are more than half a pixel away, glide towards it
            if (Math.abs(distance) > 0.5) {
                zone.offset += distance * step;
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
                // One notch = one wheelStep, whatever size of delta the controller sent. Add it to the target, not the current offset.
                const direction = Math.sign(delta);
                if (direction === 0) return true;
                this.setOffset(id, zone.targetOffset + direction * (zone.wheelStep || this.wheelStep));
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
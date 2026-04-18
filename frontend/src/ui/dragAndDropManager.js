// frontend/src/ui/dragAndDropManager.js

export class DragAndDropManager {
    constructor() {
        this.dragState = {
            active: false,
            payload: null,   // The item object being dragged
            sourceId: null,  // Where it came from (e.g., 'equipment_mainHand', 'inventory')
            originSlot: null,// Specific slot if it came from equipment
            x: 0,
            y: 0
        };
        this.onDropCallback = null;
    }

    /**
     * Start tracking a drag
     */
    startDrag(payload, sourceId, originSlot, startX, startY, onDropCallback) {
        this.dragState = {
            active: true,
            payload,
            sourceId,
            originSlot,
            x: startX,
            y: startY
        };
        this.onDropCallback = onDropCallback;
    }

    /**
     * Update the x/y for the renderer to draw the floating item
     */
    updateDrag(mouseX, mouseY) {
        if (!this.dragState.active) return;
        this.dragState.x = mouseX;
        this.dragState.y = mouseY;
    }

    /**
     * Finish the drag and let the controller decide what happens
     */
    endDrag(targetHitboxId) {
        if (!this.dragState.active) return;

        // If the controller gave us a callback, fire it and pass the data back!
        if (this.onDropCallback) {
            this.onDropCallback(
                this.dragState.payload, 
                this.dragState.sourceId, 
                this.dragState.originSlot,
                targetHitboxId
            );
        }

        this.cancelDrag();
    }

    cancelDrag() {
        this.dragState = {
            active: false,
            payload: null,
            sourceId: null,
            originSlot: null,
            x: 0,
            y: 0
        };
        this.onDropCallback = null;
    }
}
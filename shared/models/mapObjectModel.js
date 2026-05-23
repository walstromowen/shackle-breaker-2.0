export class MapObjectModel {
    constructor(id, col, row, definition, sheetId) {
        this.instanceId = id;
        this.id = definition.id;
        this.type = definition.id;
        this.col = col;
        this.row = row;

        // Visual/Rendering Properties
        this.w = definition.width || 1;
        this.h = definition.height || 1;
        this.spriteX = definition.spriteX || 0;
        this.spriteY = definition.spriteY || 0;
        this.frames = definition.frames || 1;
        this.speed = definition.speed || 0.2;
        this.sheetId = sheetId;
        this.isAnchor = definition.isAnchor !== undefined ? definition.isAnchor : true;

        // Logical/Game Properties
        this.isSolid = definition.isSolid || false;
        this.isGround = definition.isGround || false;
        this.isStairs = definition.isStairs || false;
        this.allowedDirections = definition.allowedDirections || null;
        this.interaction = definition.interaction || null;
        this.light = definition.light || null;

        // --- HYBRID HITBOX RESOLUTION ---
        if (definition.hitboxes && Array.isArray(definition.hitboxes)) {
            this.hitboxes = definition.hitboxes;
        } else if (definition.hitbox) {
            this.hitboxes = [definition.hitbox];
        } else {
            this.hitboxes = [{ xOffset: 0, yOffset: 0, w: this.w, h: this.h }];
        }
        
        // Retain standard pointer for single-box lookup compatibility if needed elsewhere
        this.hitbox = this.hitboxes[0]; 
    }

    // Retained for legacy API consistency—returns bounds of primary/first hitbox block
    getCollisionBounds() {
        return {
            left: this.col + this.hitbox.xOffset,
            right: this.col + this.hitbox.xOffset + this.hitbox.w,
            top: this.row + this.hitbox.yOffset,
            bottom: this.row + this.hitbox.yOffset + this.hitbox.h
        };
    }

    collidesWith(col, row) {
        if (!this.isSolid) return false;
        
        // Evaluates collision check across all allocated shapes
        return this.hitboxes.some(hb => {
            const left = this.col + hb.xOffset;
            const right = left + hb.w;
            const top = this.row + hb.yOffset;
            const bottom = top + hb.h;
            return (col >= left && col < right && row >= top && row < bottom);
        });
    }
}
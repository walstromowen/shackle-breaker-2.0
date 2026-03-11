export class MapObjectModel {
    constructor(id, col, row, definition, sheetId) {
        this.instanceId = id;
        this.id = definition.id || definition.spriteKey; // Added so controller.interact() can read it
        this.type = definition.spriteKey;
        this.col = col;
        this.row = row;
        
        // Visual/Rendering Properties
        this.w = definition.width || 1;
        this.h = definition.height || 1;
        this.sheetId = sheetId;
        this.isAnchor = true;
        
        // Logical/Game Properties
        this.isSolid = definition.isSolid || false;
        this.isGround = definition.isGround || false;
        this.interaction = definition.interaction || null;
        this.light = definition.light || null;

        // Hitbox defaults to full size if not specified. CHANGED x/y to xOffset/yOffset
        this.hitbox = definition.hitbox || { xOffset: 0, yOffset: 0, w: this.w, h: this.h };
    }

    /** Returns the absolute grid boundaries of this object's physical collision footprint */
    getCollisionBounds() {
        return {
            left: this.col + this.hitbox.xOffset,
            right: this.col + this.hitbox.xOffset + this.hitbox.w,
            top: this.row + this.hitbox.yOffset,
            bottom: this.row + this.hitbox.yOffset + this.hitbox.h
        };
    }

    /** Checks if a specific grid coordinate is inside this object's solid hitbox */
    collidesWith(col, row) {
        if (!this.isSolid) return false;
        
        const bounds = this.getCollisionBounds();
        return (col >= bounds.left && col < bounds.right && 
                row >= bounds.top && row < bounds.bottom);
    }
}
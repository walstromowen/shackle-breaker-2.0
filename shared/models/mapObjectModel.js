
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
        
        // --- THE MISSING FIXES ---
        this.isStairs = definition.isStairs || false;
        this.allowedDirections = definition.allowedDirections || null;
        
        this.interaction = definition.interaction || null;
        this.light = definition.light || null;

        this.hitbox = definition.hitbox || { xOffset: 0, yOffset: 0, w: this.w, h: this.h };
    }

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
        const bounds = this.getCollisionBounds();
        return (col >= bounds.left && col < bounds.right && 
                row >= bounds.top && row < bounds.bottom);
    }
}

class MapObjectFactory {
    create(typeId, col, row, biome) {
        const definition = MAP_OBJECTS_DEFINITIONS[typeId];
        if (!definition) return null;

        // Temporarily inject the typeId so the model can capture it
        definition.id = typeId;

        const instanceId = `proc_${col}_${row}`;
        return new MapObjectModel(instanceId, col, row, definition, biome.objectSheetId);
    }
}

export const mapObjectFactory = new MapObjectFactory();
export class MapObjectModel {
    constructor(id, col, row, definition, typeId = definition.id, sheet = null) {
        this.instanceId = id;
        this.id = typeId;
        this.type = typeId;
        this.col = col;
        this.row = row;

        // Visual/Rendering Properties
        this.w = definition.width || 1;
        this.h = definition.height || 1;
        this.spriteX = definition.spriteX || 0;
        this.spriteY = definition.spriteY || 0;
        this.frames = definition.frames || 1;
        this.speed = definition.speed || 0.2;
        this.sheet = sheet; // resolved loader key (string), never the per-biome map
        this.character = definition.character || null; // an NPC drawn from a character sheet's idle row: { sheet, facing } (see MapRenderer.drawCharacterObject)
        this.connects = definition.connects || null; // objects of the same kind next to each other join up (the fence): the renderer picks the frame
        this.isAnchor = definition.isAnchor !== undefined ? definition.isAnchor : true;

        // Logical/Game Properties
        this.isSolid = definition.isSolid || false;
        this.isGround = definition.isGround || false;
        this.isStairs = definition.isStairs || false;
        this.allowedDirections = definition.allowedDirections || null;
        this.interaction = definition.interaction || null;

        /* Lighting (see LightingRenderer).
           light: this object gives off light: { hasLight, radius (tiles), maxAlpha (strength 0..1), color: '255, 120, 50', flickerAmp, flickerSpeed }.
           blocksLight: this object dims light that passes through it, on the tiles of its hitboxes (the same shape as its collision), or on its whole
                        w x h when it has no hitboxes. true = the default absorption (CONFIG.LIGHT_WALL_ABSORB), a number = that many tiles of light
                        swallowed per tile (a thin fence 1, a house 6). Leave it out for objects light passes through (trees, flowers, furniture). */
        this.light = definition.light || null;
        this.blocksLight = definition.blocksLight || false;

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
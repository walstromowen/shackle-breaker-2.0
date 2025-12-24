import { CONFIG, BITMASK } from '../data/constants.js';

export class WorldManager {
    constructor(seed = 12345) {
        this.seed = seed;
        this.currentContext = 'OVERWORLD';
        this.TILES = CONFIG.TILE_TYPES;
    }

    /**
     * Determines if a neighbor should be considered "connected" to the target.
     * Higher-level tiles (like Grass) connect to lower-level tiles (like Sand)
     * to ensure the lower textures "fill in" underneath.
     */
    connects(targetId, neighborId) {
        // If neighbor is the same tile, obviously connect
        if (targetId === neighborId) return true;

        const targetDepth = CONFIG.TILE_DEPTH[targetId];
        const neighborDepth = CONFIG.TILE_DEPTH[neighborId];

        // THE RULE: A tile connects to any neighbor that is at its depth OR HIGHER.
        // This makes the "lower" tile hide its border when a "higher" tile is next to it.
        return neighborDepth >= targetDepth;
    }

        /**
         * The primary data fetch for the current tile coordinate.
         */
    getTileData(col, row) {
        const tileId = this.getTileAt(col, row);
        const isBlob = CONFIG.BLOB_TILES.includes(tileId);

        if (!isBlob) {
            return { id: tileId, mask: 0, isBlob: false, isWall: false };
        }

        const mask = this.getSpecificMask(col, row, tileId);

        return { 
            id: tileId, 
            mask: mask, 
            isBlob: true,
            isWall: tileId === this.TILES.WALL 
        };
    }

    /**
     * NEW: Calculates a mask for a specific tile type at any coordinate.
     * This is what makes the "Layered" rendering possible.
     */
    getSpecificMask(col, row, targetId) {
        const check = (c, r) => this.connects(targetId, this.getTileAt(c, r));

        const T  = check(col, row - 1);
        const TR = check(col + 1, row - 1);
        const R  = check(col + 1, row);
        const BR = check(col + 1, row + 1);
        const B  = check(col, row + 1);
        const BL = check(col - 1, row + 1);
        const L  = check(col - 1, row);
        const TL = check(col - 1, row - 1);

        let mask = 0;
        if (T) mask += BITMASK.TOP;
        if (R) mask += BITMASK.RIGHT;
        if (B) mask += BITMASK.BOTTOM;
        if (L) mask += BITMASK.LEFT;

        if (TR && T && R) mask += BITMASK.TOP_RIGHT;
        if (BR && B && R) mask += BITMASK.BOTTOM_RIGHT;
        if (BL && B && L) mask += BITMASK.BOTTOM_LEFT;
        if (TL && T && L) mask += BITMASK.TOP_LEFT;

        return mask;
    }

    getTileAt(col, row) {
        if (this.currentContext === 'OVERWORLD') {
            return this.generateOverworld(col, row);
        }
        return this.TILES.GRASS;
    }

    generateOverworld(col, row) {
        const scale = 18.0; 
        const n = this.getSmoothNoise(col / scale, row / scale);

        if (n < 0.20) return this.TILES.WATER;       
        if (n < 0.28) return this.TILES.SAND;      
        if (n < 0.65) return this.TILES.GRASS; 
        if (n < 0.78) return this.TILES.HIGH_GRASS; 

        return this.TILES.WALL;                    
    }

    getSmoothNoise(x, y) {
        const x_int = Math.floor(x);
        const y_int = Math.floor(y);
        const x_frac = x - x_int;
        const y_frac = y - y_int;

        const v1 = this.simpleNoise(x_int, y_int);
        const v2 = this.simpleNoise(x_int + 1, y_int);
        const v3 = this.simpleNoise(x_int, y_int + 1);
        const v4 = this.simpleNoise(x_int + 1, y_int + 1);

        const i1 = this.interpolate(v1, v2, x_frac);
        const i2 = this.interpolate(v3, v4, x_frac);

        return this.interpolate(i1, i2, y_frac);
    }

    interpolate(a, b, x) {
        const ft = x * Math.PI;
        const f = (1 - Math.cos(ft)) * 0.5;
        return a * (1 - f) + b * f;
    }

    simpleNoise(x, y) {
        const dot = x * 12.9898 + y * 78.233;
        const sn = Math.sin(dot + this.seed) * 43758.5453123;
        return sn - Math.floor(sn);
    }

    isSolid(col, row) {
        const id = this.getTileAt(col, row);
        // Walls and Deep Water are solid
        return id === this.TILES.WALL || id === this.TILES.WATER;
    }

    switchContext(newContext) {
        this.currentContext = newContext;
    }
}
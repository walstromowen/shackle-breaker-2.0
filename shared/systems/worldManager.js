import { CONFIG, BITMASK } from '../data/constants.js';

export class WorldManager {
    constructor(seed = 12345) {
        this.seed = seed;
        this.currentContext = 'OVERWORLD';
        this.TILES = CONFIG.TILE_TYPES;
        // Performance cache to store tile IDs for the current frame
        this._cache = new Map();
    }

    /**
     * Determines if a neighbor should be considered "connected" to the target.
     */
    connects(targetId, neighborId) {
        if (targetId === neighborId) return true;

        const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
        const neighborDepth = CONFIG.TILE_DEPTH[neighborId] || 0;

        // THE RULE: A tile connects to any neighbor that is at its depth OR HIGHER.
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
            // Centralized check for wall-like properties
            isWall: tileId === this.TILES.WALL 
        };
    }

    /**
     * Calculates a mask for a specific tile type at any coordinate.
     */
    getSpecificMask(col, row, targetId) {
        const check = (c, r) => this.connects(targetId, this.getTileAt(c, r));

        let mask = 0;
        if (check(col, row - 1))      mask |= BITMASK.TOP;          // 1
        if (check(col + 1, row - 1))  mask |= BITMASK.TOP_RIGHT;    // 2
        if (check(col + 1, row))      mask |= BITMASK.RIGHT;        // 4
        if (check(col + 1, row + 1))  mask |= BITMASK.BOTTOM_RIGHT; // 8
        if (check(col, row + 1))      mask |= BITMASK.BOTTOM;       // 16
        if (check(col - 1, row + 1))  mask |= BITMASK.BOTTOM_LEFT;  // 32
        if (check(col - 1, row))      mask |= BITMASK.LEFT;         // 64
        if (check(col - 1, row - 1))  mask |= BITMASK.TOP_LEFT;     // 128

        return mask;
    }

    /**
     * Optimized: Checks cache before running noise generation.
     */
    getTileAt(col, row) {
        const key = `${col},${row}`;
        if (this._cache.has(key)) return this._cache.get(key);

        let tileId;
        if (this.currentContext === 'OVERWORLD') {
            tileId = this.generateOverworld(col, row);
        } else {
            tileId = this.TILES.GRASS;
        }

        this._cache.set(key, tileId);
        return tileId;
    }

    /**
     * CRITICAL: Call this at the very beginning of your main draw/update loop
     */
    clearCache() {
        this._cache.clear();
    }

    generateOverworld(col, row) {
        const scale = 18.0; 
        const n = this.getSmoothNoise(col / scale, row / scale);

        if (n < 0.20) return this.TILES.WATER;       
        if (n < 0.28) return this.TILES.SAND;      
        if (n < 0.78) return this.TILES.GRASS; 
       

        return this.TILES.WALL;                     
    }

    // --- NOISE ENGINE ---

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
        return id === this.TILES.WALL || id === this.TILES.WATER;
    }

    switchContext(newContext) {
        this.currentContext = newContext;
        this.clearCache(); // Clear cache when swapping maps
    }
}
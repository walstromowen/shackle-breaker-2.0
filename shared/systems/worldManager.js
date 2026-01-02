import { CONFIG, BITMASK } from '../data/constants.js';

export class WorldManager {
    constructor(seed = 12345) { // Changed default seed for a nice starting island
        this.seed = seed;
        this.currentContext = 'OVERWORLD';
        this.TILES = CONFIG.TILE_TYPES;
        this._cache = new Map();
    }

    /**
     * Determines if a neighbor should be considered "connected" to the target.
     */
    connects(targetId, neighborId) {
        if (targetId === neighborId) return true;

        const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
        const neighborDepth = CONFIG.TILE_DEPTH[neighborId] || 0;

        // Rule: A tile connects to any neighbor that is at its depth OR HIGHER.
        return neighborDepth >= targetDepth;
    }

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

    getSpecificMask(col, row, targetId) {
        const check = (c, r) => this.connects(targetId, this.getTileAt(c, r));

        let mask = 0;
        if (check(col, row - 1))      mask |= BITMASK.TOP;          
        if (check(col + 1, row - 1))  mask |= BITMASK.TOP_RIGHT;    
        if (check(col + 1, row))      mask |= BITMASK.RIGHT;        
        if (check(col + 1, row + 1))  mask |= BITMASK.BOTTOM_RIGHT; 
        if (check(col, row + 1))      mask |= BITMASK.BOTTOM;       
        if (check(col - 1, row + 1))  mask |= BITMASK.BOTTOM_LEFT;  
        if (check(col - 1, row))      mask |= BITMASK.LEFT;         
        if (check(col - 1, row - 1))  mask |= BITMASK.TOP_LEFT;     

        return mask;
    }

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

    clearCache() {
        this._cache.clear();
    }

    /**
     * SIMPLIFIED GENERATION
     * Creates large, smooth blobs of terrain.
     */
    generateOverworld(col, row) {
        // --- Optional Debug Bench (Row -5) ---
        // Keeps a safe spot to test rendering logic if you walk up
        if (row === -5 && col > -5 && col < 5) return this.TILES.WALL;

        // 1. SCALE (The "Zoom")
        // 0.15 = Normal
        // 0.05 = Large, zoomed-in continents (Simpler)
        const scale = 0.05; 

        // 2. NOISE GENERATION
        // We only use ONE layer now. This removes the "roughness".
        const noiseValue = this.getSmoothNoise(col * scale, row * scale);

        // 3. THRESHOLDS (The "Biomes")
        // < 0.25 : Water (Ocean)
        // < 0.35 : Sand  (Wide Beaches)
        // < 0.70 : Grass (Large Plains)
        // > 0.70 : Wall  (Plateaus)
        
        if (noiseValue < 0.25) return this.TILES.WATER;
        if (noiseValue < 0.35) return this.TILES.SAND; 
        if (noiseValue < 0.90) return this.TILES.GRASS;
        
        return this.TILES.WALL;
    }

    // --- NOISE ENGINE (Unchanged) ---

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
        return id === this.TILES.WALL;
    }

    switchContext(newContext) {
        this.currentContext = newContext;
        this.clearCache(); 
    }
}
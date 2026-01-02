import { CONFIG, BITMASK } from '../data/constants.js';

export class WorldManager {
    constructor(seed = 12345) {
        this.seed = seed;
        this.currentContext = 'OVERWORLD';
        this.TILES = CONFIG.TILE_TYPES;
        
        // --- GENERATION SETTINGS ---
        
        // SCALE: 0.05 = "Zoomed In" / "Gradual"
        // This spreads the biomes out significantly.
        // It physically forces the sequence: Water -> Sand -> Grass -> Wall
        // preventing Walls from ever generating directly next to Water.
        this.noiseScale = 0.05; 

        this._cache = new Map();

        // Simple Thresholds for Biomes
        this.BIOMES = [
            // Water ends at 0.35
            { threshold: 0.35, id: this.TILES.WATER }, 
            
            // Sand is now very thin (0.35 to 0.40)
            { threshold: 0.40, id: this.TILES.SAND },

            // Grass is narrower (0.40 to 0.60)
            { threshold: 0.60, id: this.TILES.GRASS },

            // Wall starts earlier (0.60+)
            { threshold: 2.00, id: this.TILES.WALL } 
        ];
    }

    /**
     * Finds the nearest safe tile (Grass or Sand) starting from (0,0).
     * Returns an object { col, row }.
     * Used by the Controller to place the player safely.
     */
    findSpawnPoint() {
        let radius = 0;
        const maxRadius = 200; // Safety break

        while (radius < maxRadius) {
            // Check a square ring around (0,0)
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    
                    // Optimization: Only check the outer edge (the new ring)
                    if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;

                    // 1. Is it solid? (Wall)
                    if (this.isSolid(c, r)) continue;

                    // 2. Is it water? (Optional: prevent swimming spawn)
                    const tileId = this.getTileAt(c, r);
                    if (tileId === this.TILES.WATER) continue;

                    // 3. Found safe ground!
                    return { col: c, row: r };
                }
            }
            radius++;
        }

        return { col: 0, row: 0 }; // Fallback
    }

    // --- TILE & MASK RETRIEVAL ---

    connects(targetId, neighborId) {
        if (targetId === neighborId) return true;
        const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
        const neighborDepth = CONFIG.TILE_DEPTH[neighborId] || 0;
        return neighborDepth >= targetDepth;
    }

    getTileData(col, row) {
        const tileId = this.getTileAt(col, row);
        const isBlob = CONFIG.BLOB_TILES && CONFIG.BLOB_TILES.includes(tileId);

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
            tileId = this.TILES.GRASS; // Placeholder for interiors
        }

        this._cache.set(key, tileId);
        return tileId;
    }

    clearCache() {
        this._cache.clear();
    }

    // --- GENERATION LOGIC ---

    generateOverworld(col, row) {
        // 1. Get Smooth Noise
        const noiseValue = this.getSmoothNoise(col * this.noiseScale, row * this.noiseScale);

        // 2. Direct Mapping (No neighbor checks needed due to low scale)
        const biome = this.BIOMES.find(b => noiseValue < b.threshold);
        
        return biome ? biome.id : this.TILES.WALL;
    }

    isSolid(col, row) {
        const id = this.getTileAt(col, row);
        return id === this.TILES.WALL;
    }

    switchContext(newContext) {
        this.currentContext = newContext;
        this.clearCache(); 
    }

    // --- MATH HELPERS ---

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
}
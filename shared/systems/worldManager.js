import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS } from '../data/mapObjects.js';

export class WorldManager {
    constructor(seed) {
        if (typeof seed === 'number') {
            this.seed = seed;
        } else {
            this.seed = Math.floor(Math.random() * 1000000);
        }

        console.log(`%c[WorldManager] Seed: ${this.seed}`, 'color: #00ff00; font-weight: bold;');

        this.offsetX = this.seed * 9973; 
        this.offsetY = this.seed * 10007;

        this.currentContext = 'OVERWORLD'; 
        this.TILES = CONFIG.TILE_TYPES;
        
        this._cache = new Map();
        this.objects = new Map(); 

        this.initNoise(this.seed);
    }

    switchContext(newContext) {
        this.currentContext = newContext;
        this.clearCache(); 
        this.objects.clear(); 
    }

    clearCache() {
        this._cache.clear();
    }

    // =========================================================
    // SECTION 1: CORE TILE RETRIEVAL
    // =========================================================

    getTileAt(col, row) {
        const key = `${col},${row}`;
        if (this._cache.has(key)) return this._cache.get(key);

        let tileId;
        if (this.currentContext === 'DEBUG') {
            tileId = this.generateDebugMap(col, row);
        } else {
            tileId = this.generateOverworld(col, row);
        }

        this._cache.set(key, tileId);
        return tileId;
    }

    getTileData(col, row) {
        const tileId = this.getTileAt(col, row);
        const isBlob = CONFIG.BLOB_TILES && CONFIG.BLOB_TILES.includes(tileId);
        
        // Wall check updated for Layer 3, 4, 5
        const isWall = (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5);

        let data = { 
            id: tileId, 
            mask: 0, 
            isBlob: isBlob, 
            isWall: isWall,
            object: null 
        };

        if (isBlob) data.mask = this.getSpecificMask(col, row, tileId);
        
        const obj = this.getObject(col, row);
        if (obj) data.object = obj;

        return data;
    }

    // =========================================================
    // SECTION 2: OBJECT MANAGEMENT
    // =========================================================

    getObject(col, row) {
        if (this.objects.has(`${col},${row}`)) {
            return this.objects.get(`${col},${row}`);
        }
        return this.generateProceduralObject(col, row);
    }

    generateProceduralObject(col, row) {
        // 1. OCCLUSION CHECK: Is this tile covered by a wall from the NORTH?
        if (this.isBlockedByFace(col, row)) return null;

        // 2. CLIFF FACE CHECK: Is this tile acting as a vertical wall face itself?
        if (this.isCliffFace(col, row)) return null;

        // 3. BIOME EDGE CHECK: Is this a "transition" tile (half-grass/half-dirt)?
        // If so, it looks ugly to place objects here.
        if (this.isBiomeEdge(col, row)) return null;

        const tileId = this.getTileAt(col, row);
        const rng = this.pseudoRandom(col, row);

        // === GRASS BIOME (LAYER_2) ===
        if (tileId === this.TILES.LAYER_2) {
            if (rng < 0.001) return this.createObjectInstance(col, row, 'WOODEN_CHEST');
            if (rng < 0.04) return this.createObjectInstance(col, row, 'PINE_TREE');
            if (rng > 0.04 && rng < 0.07) return this.createObjectInstance(col, row, 'SMALL_ROCKS');
            if (rng >= 0.10 && rng < 0.20) {
                const flowerPick = Math.floor(rng * 1000) % 3;
                if (flowerPick === 0) return this.createObjectInstance(col, row, 'TULIPS_RED');
                if (flowerPick === 1) return this.createObjectInstance(col, row, 'TULIPS_WHITE');
                return this.createObjectInstance(col, row, 'TULIPS_ORANGE');
            }
            if (rng >= 0.30 && rng < 0.50) {
                const grassPick = Math.floor(rng * 1000) % 3;
                if (grassPick === 0) return this.createObjectInstance(col, row, 'GRASS_COVERAGE_1');
                if (grassPick === 1) return this.createObjectInstance(col, row, 'GRASS_COVERAGE_2');
                return this.createObjectInstance(col, row, 'GRASS_COVERAGE_3');
            }
        }

        // === DIRT BIOME (LAYER_1) ===
        if (tileId === this.TILES.LAYER_1) {
            if (rng < 0.15) return this.createObjectInstance(col, row, 'SMALL_ROCKS');
        }

        // === MOUNTAINS / WALL ROOFS (LAYER_3 to LAYER_5) ===
        if (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) {
            if (rng < 0.05) return this.createObjectInstance(col, row, 'PINE_TREE');
            if (rng > 0.05 && rng < 0.10) return this.createObjectInstance(col, row, 'SMALL_ROCKS');
            if (rng > 0.15 && rng < 0.30) {
                const grassPick = Math.floor(rng * 1000) % 3;
                if (grassPick === 0) return this.createObjectInstance(col, row, 'GRASS_COVERAGE_1');
                if (grassPick === 1) return this.createObjectInstance(col, row, 'GRASS_COVERAGE_2');
                return this.createObjectInstance(col, row, 'GRASS_COVERAGE_3');
            }
        }

        return null;
    }

    createObjectInstance(col, row, objectId) {
        const config = MAP_OBJECTS[objectId];
        if (!config) return null;
        
        const width = config.width || config.w || CONFIG.TILE_SIZE;
        const height = config.height || config.h || CONFIG.TILE_SIZE;
        
        return {
            ...config,
            col: col,
            row: row,
            w: width,
            h: height,
            instanceId: `proc_${col}_${row}`,
            isAnchor: true 
        };
    }

    pseudoRandom(col, row) {
        const dot = col * 12.9898 + row * 78.233 + this.seed; 
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }

    placeObject(col, row, objectId) {
        const config = MAP_OBJECTS[objectId];
        if (!config) return;
        
        const width = config.width || config.w || CONFIG.TILE_SIZE;
        const height = config.height || config.h || CONFIG.TILE_SIZE;

        const masterId = `${col},${row}`; 
        const masterObject = { 
            ...config, 
            col, row, 
            w: width, h: height,
            instanceId: masterId, 
            isAnchor: true 
        };
        this.objects.set(masterId, masterObject);
    }

    removeObject(col, row) {
        this.objects.delete(`${col},${row}`);
    }

    interact(col, row) {
        const obj = this.getSolidObjectAt(col, row);
        return (obj && obj.interaction) ? obj.interaction : false;
    }

    // =========================================================
    // SECTION 3: BITMASKING
    // =========================================================

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

    connects(targetId, neighborId) {
        if (targetId === neighborId) return true;
        
        const getWallRank = (id) => {
            if (id === this.TILES.LAYER_5) return 3; // High Wall
            if (id === this.TILES.LAYER_4) return 2; // Mid Wall
            if (id === this.TILES.LAYER_3) return 1; // Low Wall
            return 0; 
        };
        
        const tr = getWallRank(targetId);
        const nr = getWallRank(neighborId);
        
        // If both are walls, higher walls connect to lower ones
        if (tr > 0 && nr > 0) return nr >= tr;
        
        const td = CONFIG.TILE_DEPTH[targetId] || 0;
        const nd = CONFIG.TILE_DEPTH[neighborId] || 0;
        return nd >= td;
    }

    // =========================================================
    // SECTION 4: COLLISION & ELEVATION
    // =========================================================

    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999; // Water
        if (id === this.TILES.LAYER_3) return 1;    // Low Wall
        if (id === this.TILES.LAYER_4) return 2;    // Mid Wall
        if (id === this.TILES.LAYER_5) return 3;    // High Wall
        return 0; // Dirt (Layer 1) & Grass (Layer 2)
    }

    getWallFaceDepth(tileId) {
        if (tileId === this.TILES.LAYER_3) return 2; // Low Wall
        if (tileId === this.TILES.LAYER_4) return 1; // Mid Wall
        if (tileId === this.TILES.LAYER_5) return 2; // High Wall
        return 0;
    }

    /**
     * Checks if this tile is being covered by a wall from the NORTH.
     */
    isBlockedByFace(col, row) {
        const myElev = this.getElevation(col, row);
        
        const nTile = this.getTileAt(col, row - 1);
        const nElev = this.getElevation(col, row - 1);
        const nHeight = this.getWallFaceDepth(nTile);

        if (nElev > myElev && nHeight >= 1) return true;

        const nnTile = this.getTileAt(col, row - 2);
        const nnElev = this.getElevation(col, row - 2);
        const nnHeight = this.getWallFaceDepth(nnTile);

        if (nnElev > myElev && nnHeight >= 2) return true;

        return false;
    }

    /**
     * Checks if THIS tile is part of the vertical cliff face itself.
     */
    isCliffFace(col, row) {
        const myTile = this.getTileAt(col, row);
        const myElev = this.getElevation(col, row);

        if (myElev <= 0) return false;

        const faceDepth = this.getWallFaceDepth(myTile);
        
        for (let i = 1; i <= faceDepth; i++) {
            const neighborElev = this.getElevation(col, row + i);
            if (neighborElev < myElev) {
                return true; 
            }
        }

        return false;
    }

    /**
     * NEW: Checks if this tile borders a LOWER biome type.
     * If I am Grass, and my neighbor is Dirt, I am an "Edge" tile.
     * Edge tiles usually have transition textures (half/half), so we shouldn't spawn objects on them.
     */
    isBiomeEdge(col, row) {
        const myId = this.getTileAt(col, row);
        const myDepth = CONFIG.TILE_DEPTH[myId] || 0;

        // Helper to check one neighbor
        const isLower = (c, r) => {
            const nId = this.getTileAt(c, r);
            const nDepth = CONFIG.TILE_DEPTH[nId] || 0;
            // If neighbor has LOWER depth (e.g. Dirt=1 vs Grass=2), then I am an edge.
            return nDepth < myDepth;
        };

        // Check 4 cardinal directions
        if (isLower(col, row - 1)) return true; // Top
        if (isLower(col + 1, row)) return true; // Right
        if (isLower(col, row + 1)) return true; // Bottom
        if (isLower(col - 1, row)) return true; // Left

        return false;
    }

    getSolidObjectAt(col, row) {
        const MAX_W = 2; 
        const MAX_H = 3; 

        for (let dy = 0; dy <= MAX_H; dy++) {
            for (let dx = 0; dx <= MAX_W; dx++) {
                
                const anchorCol = col - dx; 
                const anchorRow = row + dy; 

                const obj = this.getObject(anchorCol, anchorRow);

                if (obj && obj.isSolid) {
                    const widthInTiles = Math.ceil(obj.w / CONFIG.TILE_SIZE);
                    const heightInTiles = Math.ceil(obj.h / CONFIG.TILE_SIZE);

                    if (dx < widthInTiles && dy < heightInTiles) {
                        return obj; 
                    }
                }
            }
        }
        return null;
    }

    canMove(fromCol, fromRow, toCol, toRow) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);
        
        if (toElev === -999) return false; 
        if (fromElev !== toElev) return false; 
        
        if (this.getSolidObjectAt(toCol, toRow)) return false;

        if (this.isBlockedByFace(toCol, toRow)) return false;
        if (this.isCliffFace(toCol, toRow)) return false;

        return true;
    }

    findSpawnPoint() {
        if (this.currentContext === 'DEBUG') return { col: 20, row: 20 };
        let radius = 0;
        while (radius < 500) {
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;
                    
                    const id = this.getTileAt(c, r);
                    
                    if (id === this.TILES.LAYER_2) { // Grass
                        if (!this.getSolidObjectAt(c, r) && 
                            !this.isBlockedByFace(c, r) &&
                            !this.isBiomeEdge(c, r)) { // Don't spawn player on edges either
                            return { col: c, row: r };
                        }
                    }
                }
            }
            radius++;
        }
        return { col: 0, row: 0 }; 
    }

    // =========================================================
    // SECTION 5: NOISE ENGINE
    // =========================================================

    initNoise(seed) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.perm[i] = i;
        let seedVal = seed;
        const nextRand = () => {
            seedVal = (seedVal * 9301 + 49297) % 233280;
            return seedVal / 233280; 
        };
        for (let i = 0; i < 256; i++) {
            const r = nextRand();
            const j = Math.floor(r * 256);
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = this.perm[i & 255];
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        return this.lerp(v, 
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }

    generateOverworld(col, row) {
        const SCALE = 0.06; 
        const x = (col * SCALE) + this.offsetX;
        const y = (row * SCALE) + this.offsetY;
        const value = this.noise(x, y);

        if (value < -0.30) return this.TILES.LAYER_0; // Water
        if (value < -0.15) return this.TILES.LAYER_1; // Dirt
        if (value < 0.25)  return this.TILES.LAYER_2; // Grass
        if (value < 0.50)  return this.TILES.LAYER_3; // Wall Low
        if (value < 0.75)  return this.TILES.LAYER_4; // Wall Mid
        return this.TILES.LAYER_5;                    // Wall High
    }

    generateDebugMap(col, row) {
        const cx = 20; const cy = 20;
        const dist = Math.sqrt((col-cx)**2 + (row-cy)**2);
        if (dist < 2) return this.TILES.LAYER_0; // Water
        if (dist < 3) return this.TILES.LAYER_1; // Dirt
        if (dist < 4) return this.TILES.LAYER_2; // Grass
        if (dist < 5) return this.TILES.LAYER_3; // Wall Low
        if (dist < 6) return this.TILES.LAYER_4; // Wall Mid
        return this.TILES.LAYER_5;               // Wall High
    }
}
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

        // PERFORMANCE: We track when to prune objects
        this.lastPruneTime = 0;

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
        const isWall = (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5);

        let data = { 
            id: tileId, 
            mask: 0, 
            isBlob: isBlob, 
            isWall: isWall,
            object: null 
        };

        // Note: bitmask calculation is expensive, only do it if necessary
        if (isBlob) data.mask = this.getSpecificMask(col, row, tileId);
        
        const obj = this.getObject(col, row);
        if (obj) data.object = obj;

        return data;
    }

    // =========================================================
    // SECTION 2: OBJECT MANAGEMENT (OPTIMIZED)
    // =========================================================

    /**
     * PERFORMANCE CRITICAL:
     * Returns a simple array of all objects currently existing in the world memory.
     * The Renderer uses this to draw "Wide" objects without scanning the grid.
     */
    getActiveObjects() {
        return Array.from(this.objects.values());
    }

    /**
     * PERFORMANCE CRITICAL:
     * Removes objects that are very far away to keep the array size small.
     * Call this from your GameLoop every few seconds (not every frame).
     */
    pruneObjects(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        // Distance to keep objects (e.g., 30 tiles). Anything further is deleted.
        const KEEP_DISTANCE = 30 * TILE_SIZE; 
        
        // Convert map to iterator to safely delete while iterating
        for (const [key, obj] of this.objects) {
            // Calculate Manhattan distance (faster than Math.sqrt)
            const objX = obj.col * TILE_SIZE;
            const objY = obj.row * TILE_SIZE;
            const dist = Math.abs(objX - cameraX) + Math.abs(objY - cameraY);

            if (dist > KEEP_DISTANCE) {
                this.objects.delete(key);
            }
        }
    }

    getObject(col, row) {
        const key = `${col},${row}`;
        
        // Debug Campfire (Remove when done testing)
        if (col === 22 && row === 22 && !this.objects.has(key)) {
            this.placeObject(22, 22, 'CAMPFIRE'); 
            return this.objects.get(key);
        }

        if (this.objects.has(key)) return this.objects.get(key);

        const newObj = this.generateProceduralObject(col, row);
        
        if (newObj) this.objects.set(key, newObj);
        
        return newObj;
    }

    // Returns the ID string (e.g. 'SMALL_HOUSE_1') or null
    decideObject(col, row) {
        // 1. Terrain Checks
        if (this.isBlockedByFace(col, row)) return null;
        if (this.isCliffFace(col, row)) return null;
        if (this.isBiomeEdge(col, row)) return null;

        const tileId = this.getTileAt(col, row);
        const rng = this.pseudoRandom(col, row);

        // === GRASS BIOME ===
        if (tileId === this.TILES.LAYER_2) {
            if (rng < 0.001) return 'WOODEN_CHEST';
            
            // Testing Campfire
            if (rng < 0.005) return 'CAMPFIRE';

            if (rng < 0.004) {
                if (this.isFootprintValid(col, row, 4)) return 'SMALL_HOUSE_1';
                return null;
            }
            if (rng < 0.014) {
                 if (this.isFootprintValid(col, row, 2)) return 'OAK_TREE_1';
                 return null;
            }
            if (rng < 0.044) return 'PINE_TREE';
            if (rng < 0.074) return 'SMALL_ROCKS_1';
            
            if (rng >= 0.10 && rng < 0.20) {
                const p = Math.floor(rng * 1000) % 3;
                if (p === 0) return 'TULIPS_RED';
                if (p === 1) return 'TULIPS_WHITE';
                return 'TULIPS_ORANGE';
            }
            
            if (rng >= 0.30 && rng < 0.50) {
                const p = Math.floor(rng * 1000) % 3;
                if (p === 0) return 'GRASS_COVERAGE_1';
                if (p === 1) return 'GRASS_COVERAGE_2';
                return 'GRASS_COVERAGE_3';
            }
        }

        if (tileId === this.TILES.LAYER_1) {
            if (rng < 0.15) return 'SMALL_ROCKS_1';
        }

        if (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) {
            if (rng < 0.05) return 'PINE_TREE';
            if (rng > 0.05 && rng < 0.10) return 'SMALL_ROCKS_1';
            if (rng > 0.15 && rng < 0.30) {
                 const p = Math.floor(rng * 1000) % 3;
                 if (p === 0) return 'GRASS_COVERAGE_1';
                 return 'GRASS_COVERAGE_2';
            }
        }

        return null;
    }

    isOccupied(col, row) {
        const SCAN = 4; 
        for (let r = row; r <= row + SCAN; r++) {
            for (let c = col - SCAN; c <= col; c++) {
                if (c === col && r === row) continue;

                const neighborId = this.decideObject(c, r);
                
                if (neighborId) {
                    const config = MAP_OBJECTS[neighborId];
                    if (!config) continue; 

                    const w = config.width || config.w || 1;
                    const h = config.height || config.h || 1;

                    const left = c;
                    const right = c + w - 1;
                    const bottom = r;
                    const top = r - h + 1;

                    if (col >= left && col <= right && row <= bottom && row >= top) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    generateProceduralObject(col, row) {
        if (this.isOccupied(col, row)) return null;
        const objectId = this.decideObject(col, row);
        if (objectId) {
            return this.createObjectInstance(col, row, objectId);
        }
        return null;
    }

    createObjectInstance(col, row, objectId) {
        const config = MAP_OBJECTS[objectId];
        if (!config) {
            console.warn(`WorldManager: ID '${objectId}' returned by decideObject but missing in MAP_OBJECTS.`);
            return null;
        }
        
        const width = config.width || config.w || 1; 
        const height = config.height || config.h || 1;
        
        return {
            ...config,
            type: objectId,
            spriteKey: config.spriteKey || objectId, 
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
        
        const width = config.width || config.w || 1;
        const height = config.height || config.h || 1;

        const masterId = `${col},${row}`; 
        const masterObject = { 
            ...config, 
            type: objectId,
            spriteKey: config.spriteKey || objectId, 
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
            if (id === this.TILES.LAYER_5) return 3; 
            if (id === this.TILES.LAYER_4) return 2; 
            if (id === this.TILES.LAYER_3) return 1; 
            return 0; 
        };
        const tr = getWallRank(targetId);
        const nr = getWallRank(neighborId);
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
        if (id === this.TILES.LAYER_0) return -999; 
        if (id === this.TILES.LAYER_3) return 1;    
        if (id === this.TILES.LAYER_4) return 2;    
        if (id === this.TILES.LAYER_5) return 3;    
        return 0; 
    }

    getWallFaceDepth(tileId) {
        if (tileId === this.TILES.LAYER_3) return 2; 
        if (tileId === this.TILES.LAYER_4) return 1; 
        if (tileId === this.TILES.LAYER_5) return 2; 
        return 0;
    }

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

    isFootprintValid(col, row, width) {
        const anchorElev = this.getElevation(col, row);
        for (let i = 0; i < width; i++) {
            const c = col + i;
            const r = row;
            if (this.getElevation(c, r) !== anchorElev) return false;
            if (this.isBlockedByFace(c, r)) return false;
            if (this.isCliffFace(c, r)) return false;
            if (this.isBiomeEdge(c, r)) return false;
        }
        return true;
    }

    isBiomeEdge(col, row) {
        const myId = this.getTileAt(col, row);
        const myDepth = CONFIG.TILE_DEPTH[myId] || 0;
        const isLower = (c, r) => {
            const nId = this.getTileAt(c, r);
            const nDepth = CONFIG.TILE_DEPTH[nId] || 0;
            return nDepth < myDepth;
        };
        if (isLower(col, row - 1)) return true;
        if (isLower(col + 1, row)) return true;
        if (isLower(col, row + 1)) return true;
        if (isLower(col - 1, row)) return true;
        return false;
    }

    getSolidObjectAt(col, row) {
        const RADIUS = 3; 
        for (let r = row; r <= row + RADIUS; r++) { 
            for (let c = col - RADIUS; c <= col; c++) { 
                const obj = this.getObject(c, r); 
                if (!obj || !obj.isSolid) continue;
                const hitW = obj.hitbox ? obj.hitbox.w : (obj.w || 1);
                const left = c; 
                const right = c + hitW - 1;
                if (col < left || col > right) continue;
                const hitH = obj.hitbox ? obj.hitbox.h : (obj.h || 1);
                const bottom = r; 
                const top = r - hitH + 1;
                if (row <= bottom && row >= top) {
                    return obj;
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
                    if (id === this.TILES.LAYER_2) { 
                        if (!this.getSolidObjectAt(c, r) && 
                            !this.isBlockedByFace(c, r) &&
                            !this.isBiomeEdge(c, r)) { 
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
    // SECTION 5: UTILITIES FOR RENDERERS (RE-OPTIMIZED)
    // =========================================================

    /**
     * OPTIMIZED: This now filters the known object list instead of scanning tiles.
     * Use this for LightingRenderer.
     */
    getVisibleObjects(camera, canvasWidth, canvasHeight) {
        const GAME_SCALE = CONFIG.GAME_SCALE || 1;
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const SCREEN_W = canvasWidth / GAME_SCALE;
        const SCREEN_H = canvasHeight / GAME_SCALE;

        // Expanded bounds for lights
        const minX = camera.x - (TILE_SIZE * 4);
        const maxX = camera.x + SCREEN_W + (TILE_SIZE * 4);
        const minY = camera.y - (TILE_SIZE * 4);
        const maxY = camera.y + SCREEN_H + (TILE_SIZE * 4);

        // Filter the active list - FAST (Iterating ~100 items vs scanning ~1200 tiles)
        return Array.from(this.objects.values()).filter(obj => {
            const px = obj.col * TILE_SIZE;
            const py = obj.row * TILE_SIZE;
            return (px >= minX && px <= maxX && py >= minY && py <= maxY);
        });
    }

    // =========================================================
    // SECTION 6: NOISE ENGINE
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

        if (value < -0.30) return this.TILES.LAYER_0; 
        if (value < -0.15) return this.TILES.LAYER_1; 
        if (value < 0.25)  return this.TILES.LAYER_2; 
        if (value < 0.50)  return this.TILES.LAYER_3; 
        if (value < 0.75)  return this.TILES.LAYER_4; 
        return this.TILES.LAYER_5;                     
    }

    generateDebugMap(col, row) {
        const cx = 20; const cy = 20;
        const dist = Math.sqrt((col-cx)**2 + (row-cy)**2);
        if (dist < 2) return this.TILES.LAYER_0; 
        if (dist < 3) return this.TILES.LAYER_1; 
        if (dist < 4) return this.TILES.LAYER_2; 
        if (dist < 5) return this.TILES.LAYER_3; 
        if (dist < 6) return this.TILES.LAYER_4; 
        return this.TILES.LAYER_5;               
    }
}
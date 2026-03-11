import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS } from '../data/mapObjects.js';
import { gameState } from '../state/gameState.js';
import { biomeFactory } from './factories/biomeFactory.js';

// ==========================================
// CONFIGURATION
// ==========================================

const MASK_DIRECTIONS = [
    { c: 0,  r: -1, bit: BITMASK.TOP },
    { c: 1,  r: -1, bit: BITMASK.TOP_RIGHT },
    { c: 1,  r: 0,  bit: BITMASK.RIGHT },
    { c: 1,  r: 1,  bit: BITMASK.BOTTOM_RIGHT },
    { c: 0,  r: 1,  bit: BITMASK.BOTTOM },
    { c: -1, r: 1,  bit: BITMASK.BOTTOM_LEFT },
    { c: -1, r: 0,  bit: BITMASK.LEFT },
    { c: -1, r: -1, bit: BITMASK.TOP_LEFT }
];

export class WorldManager {
    constructor() {
        if (!gameState.seed) gameState.seed = Math.floor(Math.random() * 1000000);
        if (!gameState.world.changes) gameState.world.changes = {};

        this.seed = gameState.seed;
        console.log(`%c[WorldManager] Seed: ${this.seed}`, 'color: #00ff00; font-weight: bold;');

        this.offsetX = this.seed * 9973;
        this.offsetY = this.seed * 10007;
        this.TILES = CONFIG.TILE_TYPES;
        
        // --- PERFORMANCE CACHES ---
        this._tileCache = new Map();
        this._procCache = new Map(); 
        this.objects = new Map();

        // --- NOISE GENERATORS ---
        this.elevationNoise = new PerlinNoise(this.seed);
        this.temperatureNoise = new PerlinNoise(this.seed + 12345);
        this.moistureNoise = new PerlinNoise(this.seed + 54321); 
    }

    _k(col, row) {
        return (col & 0xFFFF) << 16 | (row & 0xFFFF);
    }
    
    _s(col, row) {
        return `${col},${row}`;
    }

    // ==========================================
    // API: OVERWORLD CONTROLLER
    // ==========================================

    getBiomeAt(col, row) {
        // 1. INCREASED SCALE: Bumped 0.01 to 0.03 so biomes aren't impossibly massive
        const rawTemp = this.temperatureNoise.get((col * 0.01) + this.offsetX, (row * 0.01) + this.offsetY);
        const rawMoist = this.moistureNoise.get((col * 0.01) + this.offsetX, (row * 0.01) + this.offsetY);
        
        // 2. FIXED MATH: Shift the -0.5 to 0.5 range directly to 0.0 to 1.0. 
        // We use slightly wider division to smooth out extreme peaks.
        const tempVal = Math.min(1, Math.max(0, (rawTemp + 0.5)));
        const moistVal = Math.min(1, Math.max(0, (rawMoist + 0.5)));
        
        // 3. DEBUG: Uncomment this if you want to watch the values change!
        // console.log(`Normalized Temp: ${tempVal.toFixed(2)}, Moist: ${moistVal.toFixed(2)}`);

        // 4. Pass the normalized 0.0 - 1.0 values to the factory
        return biomeFactory.determineBiome(tempVal, moistVal);
    }

    getTileAt(col, row) {
        const key = this._k(col, row);
        if (this._tileCache.has(key)) return this._tileCache.get(key);
        
        const elevVal = this.elevationNoise.get((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
        const biome = this.getBiomeAt(col, row);
        
        const tileId = biome.getTileId(elevVal);

        this._tileCache.set(key, tileId);
        return tileId;
    }

    canMove(fromCol, fromRow, toCol, toRow) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);
        
        // 1. Cannot walk into water
        if (toElev === -999) return false; 
        
        // 2. Fetch the specific depths for Layer 1 (Dirt) and Layer 2 (Surface)
        const depthL1 = CONFIG.TILE_DEPTH[this.TILES.LAYER_1] || 1;
        const depthL2 = CONFIG.TILE_DEPTH[this.TILES.LAYER_2] || 2;
        
        // 3. Allow movement if elevations are identical, OR if stepping between Dirt and Surface
        const isDirtToGrass = (fromElev === depthL1 && toElev === depthL2) || 
                              (fromElev === depthL2 && toElev === depthL1);
        
        if (fromElev !== toElev && !isDirtToGrass) {
            return false;
        }
        
        // 4. Normal wall and object collision checks
        if (this.isBlockedByFace(toCol, toRow)) return false;
        if (this.getSolidObjectAt(toCol, toRow)) return false; 
        
        return true;
    }

    findSpawnPoint() {
        let radius = 0;
        while(radius < 500) {
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;
                    if (this.isTileFree(c, r) && this.getElevation(c, r) === 1) return { col: c, row: r };
                }
            }
            radius++;
        }
        return { col: 0, row: 0 };
    }

    // ==========================================
    // API: MEMORY MANAGEMENT
    // ==========================================

    prune(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const SAFE_DISTANCE = 2500; 
        const distSq = SAFE_DISTANCE * SAFE_DISTANCE;

        for (const [key, obj] of this.objects) {
            const dx = (obj.col * TILE_SIZE) - cameraX;
            const dy = (obj.row * TILE_SIZE) - cameraY;
            
            if ((dx * dx + dy * dy) > distSq) {
                this.objects.delete(key);
            }
        }

        if (this._procCache.size > 20000) {
            console.log(`[WorldManager] Pruning Memory: Cleared ${this._procCache.size} cached tiles.`);
            this._procCache.clear();
            this._tileCache.clear();
        }
    }

    // ==========================================
    // API: MAP RENDERER
    // ==========================================

    getTileData(col, row) {
        const tileId = this.getTileAt(col, row);
        const biome = this.getBiomeAt(col, row); // Needed for sheetId
        const isBlob = CONFIG.BLOB_TILES?.includes(tileId);
        
        return { 
            id: tileId, 
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0, 
            isBlob: isBlob, 
            isWall: (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5), 
            object: this.getObject(col, row),
            biomeId: biome.id,
            sheetId: biome.sheetId,
            objectSheetId: biome.objectSheetId // NEW: Expose the object sheet ID
        };
    }

    getSpecificMask(col, row, targetId) {
        let mask = 0;
        const myBiome = this.getBiomeAt(col, row);

        for (const d of MASK_DIRECTIONS) {
            const nCol = col + d.c;
            const nRow = row + d.r;
            
            const nId = this.getTileAt(nCol, nRow);
            const nBiome = this.getBiomeAt(nCol, nRow);

            const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
            const neighborDepth = CONFIG.TILE_DEPTH[nId] || 0;

            // 1. Structural layers (Water, Dirt, Cliffs) form the solid earth. 
            // They should ALWAYS connect to each other across biome boundaries!
            const isStructuralLayer = (targetId !== this.TILES.LAYER_2);

            // 2. Surface layer (Grass/Sand) splits across biomes to reveal dirt paths.
            // BUT, if it hits a Cliff (higher elevation) in a neighboring biome, 
            // it should flush up against it so we don't get weird dirt gaps at mountain bases.
            const isConnectingUpward = (neighborDepth > targetDepth);

            // Connect ONLY IF:
            // - It's a structural layer OR the same biome OR flushing against a cliff
            if (isStructuralLayer || myBiome.id === nBiome.id || isConnectingUpward) {
                // Standard autotile rule: connect if neighbor is same tile or higher elevation
                if (targetId === nId || neighborDepth >= targetDepth) {
                    mask |= d.bit;
                }
            }
        }
        return mask;
    }

    getActiveObjects() { 
        return Array.from(this.objects.values()); 
    }

    getVisibleObjects(camera, canvasWidth, canvasHeight) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const scale = CONFIG.GAME_SCALE || 1;
        
        const startCol = Math.floor((camera.x) / TILE_SIZE) - 2;
        const endCol = startCol + Math.ceil((canvasWidth / scale) / TILE_SIZE) + 4;
        const startRow = Math.floor((camera.y) / TILE_SIZE) - 2;
        const endRow = startRow + Math.ceil((canvasHeight / scale) / TILE_SIZE) + 4;

        const visible = [];

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const obj = this.getObject(c, r);
                if (obj) visible.push(obj);
            }
        }
        return visible;
    }

    // ==========================================
    // LOGIC: OBJECTS & SPAWNING
    // ==========================================

    getObject(col, row) {
        const key = this._s(col, row);
        if (this.objects.has(key)) return this.objects.get(key);

        const id = this.getPotentialObjectId(col, row);
        if (id) {
            const newObj = this.createObjectInstance(col, row, id);
            this.objects.set(key, newObj);
            return newObj;
        }
        return null;
    }

    getPotentialObjectId(col, row) {
        const key = this._s(col, row);
        if (gameState.world.changes?.[key] !== undefined) {
            return gameState.world.changes[key];
        }

        const cacheKey = this._k(col, row);
        if (this._procCache.has(cacheKey)) return this._procCache.get(cacheKey);

        const result = this._calculatePotentialObjectId(col, row);
        
        this._procCache.set(cacheKey, result);
        return result;
    }

    _calculatePotentialObjectId(col, row) {
        const MAX_LOOKBACK = 4;
        for (let r = row - MAX_LOOKBACK; r <= row; r++) {
            for (let c = col - MAX_LOOKBACK; c <= col; c++) {
                if (c === col && r === row) continue;

                const nId = this._getRawProceduralId(c, r);
                if (nId) {
                    const cfg = MAP_OBJECTS[nId];
                    const w = cfg.w || cfg.width || 1;
                    const h = cfg.h || cfg.height || 1;
                    if (c + w > col && r + h > row) return null; 
                }
            }
        }
        return this._getRawProceduralId(col, row);
    }

    _getRawProceduralId(col, row) {
        if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) return null;

        const tileId = this.getTileAt(col, row);
        const biome = this.getBiomeAt(col, row);
        const isWall = (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5);

        const rng = this.pseudoRandom(col, row);
        
        const spawnData = biome.getSpawnId(tileId, rng, isWall);

        if (!spawnData) return null;

        if (spawnData.footprint && !this.isFootprintValid(col, row, spawnData.footprint)) {
            return null;
        }
        
        return spawnData.id;
    }

    createObjectInstance(col, row, id) {
        const config = MAP_OBJECTS[id];
        if (!config) return null;

        // NEW: Fetch the biome to get the object spritesheet ID
        const biome = this.getBiomeAt(col, row);

        return {
            ...config,
            type: id, col, row,
            w: config.width || config.w || 1,
            h: config.height || config.h || 1,
            instanceId: `proc_${col}_${row}`,
            isAnchor: true,
            sheetId: biome.objectSheetId, // NEW: Attach the sheet ID directly to the object!
            interaction: config.interaction || null
        };
    }

    modifyWorld(col, row, newValue) {
        const key = this._s(col, row);
        gameState.world.changes[key] = newValue;
        
        this.objects.delete(key); 
        this._procCache.delete(this._k(col, row));
    }

    // ==========================================
    // LOGIC: PHYSICS & COLLISION
    // ==========================================

    getSolidObjectAt(col, row) {
        const RADIUS = 3;
        for (let r = row - RADIUS; r <= row; r++) {
            for (let c = col - RADIUS; c <= col; c++) {
                
                const id = this.getPotentialObjectId(c, r);
                if (!id) continue;

                const cfg = MAP_OBJECTS[id];
                if (!cfg?.isSolid) continue;

                const hitW = cfg.hitbox?.w ?? (cfg.width || cfg.w || 1);
                const hitH = cfg.hitbox?.h ?? (cfg.height || cfg.h || 1);
                const offX = cfg.hitbox?.x || 0;
                const offY = cfg.hitbox?.y || 0;

                const left = c + offX;
                const top  = r + offY;

                if (col >= left && col < left + hitW && row >= top && row < top + hitH) {
                    return this.getObject(c, r);
                }
            }
        }
        return null;
    }

    isTileFree(col, row) {
        const tileId = this.getTileAt(col, row);
        if (tileId === this.TILES.LAYER_0) return false;
        if (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) return false;
        if (this.isBlockedByFace(col, row) || this.isBiomeEdge(col, row)) return false;
        if (this.getSolidObjectAt(col, row)) return false;
        return true;
    }

    isFootprintValid(col, row, width) {
        const elev = this.getElevation(col, row);
        // Proper 2D loop to ensure the whole X/Y grid footprint is on flat ground
        for (let r = row; r < row + width; r++) {
            for (let c = col; c < col + width; c++) {
                if (c === col && r === row) continue; // Skip anchor
                
                if (this.getElevation(c, r) !== elev || 
                    this.isBlockedByFace(c, r) || 
                    this.isCliffFace(c, r) || 
                    this.isBiomeEdge(c, r)) return false;
            }
        }
        return true;
    }
    
    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999; 
        return CONFIG.TILE_DEPTH[id] || 0;
    }

    getWallFaceDepth(tileId) {
        const depth = CONFIG.TILE_DEPTH[tileId] || 0;
        return (depth >= 3) ? depth - 1 : (depth === 2 ? 1 : 0);
    }

    isBlockedByFace(col, row) {
        const myElev = this.getElevation(col, row);
        const check = (rOffset, depthReq) => {
            const nTile = this.getTileAt(col, row - rOffset);
            return (this.getElevation(col, row - rOffset) > myElev && this.getWallFaceDepth(nTile) >= depthReq);
        };
        return check(1, 1) || check(2, 2);
    }
    
    isCliffFace(col, row) {
        const elev = this.getElevation(col, row);
        if (elev <= 0) return false;
        const depth = this.getWallFaceDepth(this.getTileAt(col, row));
        for (let i = 1; i <= depth; i++) {
            if (this.getElevation(col, row + i) < elev) return true;
        }
        return false;
    }

    isBiomeEdge(col, row) {
        const myBiomeId = this.getBiomeAt(col, row).id;
        const myD = CONFIG.TILE_DEPTH[this.getTileAt(col, row)] || 0;
        
        const check = (c, r) => {
            // It is an edge if the elevation drops OR the biome changes
            return ((CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < myD) || 
                   (this.getBiomeAt(c, r).id !== myBiomeId);
        };
        
        return check(col, row-1) || check(col+1, row) || check(col, row+1) || check(col-1, row);
    }

    pseudoRandom(col, row) {
        const dot = col * 12.9898 + row * 78.233 + this.seed;
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }
}

class PerlinNoise {
    constructor(seed) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.perm[i] = i;
        let s = seed;
        const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        for (let i = 0; i < 256; i++) {
            const r = rand();
            const j = Math.floor(r * 256);
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = this.perm[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        const h = hash & 15; const u = h < 8 ? x : y; const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    get(x, y) {
        const X = Math.floor(x) & 255; const Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = this.fade(x); const v = this.fade(y);
        const A = this.p[X] + Y; const B = this.p[X + 1] + Y;
        return this.lerp(v, this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)), 
                         this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1)));
    }
}
import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS } from '../data/mapObjects.js';
import { gameState } from '../state/gameState.js';

// ==========================================
// CONFIGURATION
// ==========================================
const SPAWN_TABLE = {
    [CONFIG.TILE_TYPES.LAYER_2]: [ 
        { chance: 0.001, id: 'WOODEN_CHEST' },
        { chance: 0.004, id: 'CAMPFIRE' },
        { chance: 0.004, id: 'SMALL_HOUSE_1', footprint: 4 },
        { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 },
        { chance: 0.044, id: 'PINE_TREE' },
        { chance: 0.074, id: 'SMALL_ROCKS_1' },
        { chance: 0.20, rangeStart: 0.10, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] },
        { chance: 0.50, rangeStart: 0.30, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] }
    ],
    [CONFIG.TILE_TYPES.LAYER_1]: [ { chance: 0.15, id: 'SMALL_ROCKS_1' } ],
    _WALLS: [
        { chance: 0.05, id: 'PINE_TREE' },
        { chance: 0.10, id: 'SMALL_ROCKS_1' },
        { chance: 0.30, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] }
    ]
};

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

        this.noiseGen = new PerlinNoise(this.seed);
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

    getTileAt(col, row) {
        const key = this._k(col, row);
        if (this._tileCache.has(key)) return this._tileCache.get(key);
        
        const val = this.noiseGen.get((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
        
        let tileId;
        if (val < -0.30) tileId = this.TILES.LAYER_0;
        else if (val < -0.15) tileId = this.TILES.LAYER_1;
        else if (val < 0.25)  tileId = this.TILES.LAYER_2;
        else if (val < 0.50)  tileId = this.TILES.LAYER_3;
        else if (val < 0.75)  tileId = this.TILES.LAYER_4;
        else tileId = this.TILES.LAYER_5;

        this._tileCache.set(key, tileId);
        return tileId;
    }

    canMove(fromCol, fromRow, toCol, toRow) {
        const toElev = this.getElevation(toCol, toRow);
        
        if (toElev === -999) return false;
        if (this.getElevation(fromCol, fromRow) !== toElev) return false;
        
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
    // API: MEMORY MANAGEMENT (NEW)
    // ==========================================

    /**
     * Removes objects and cache data that are far away from the player.
     * Call this every ~2 seconds.
     */
    prune(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        // Distance in pixels to keep objects (e.g., 2000px radius)
        const SAFE_DISTANCE = 2500; 
        const distSq = SAFE_DISTANCE * SAFE_DISTANCE;

        // 1. Prune Instantiated Objects
        for (const [key, obj] of this.objects) {
            // Calculate distance from object to camera
            const dx = (obj.col * TILE_SIZE) - cameraX;
            const dy = (obj.row * TILE_SIZE) - cameraY;
            
            // If too far, delete from Map
            if ((dx * dx + dy * dy) > distSq) {
                this.objects.delete(key);
            }
        }

        // 2. Clear caches if they get too massive
        // (It is faster to clear all and regenerate than to search/prune bitwise keys individually)
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
        const isBlob = CONFIG.BLOB_TILES?.includes(tileId);
        
        return { 
            id: tileId, 
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0, 
            isBlob: isBlob, 
            isWall: (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5), 
            object: this.getObject(col, row) 
        };
    }

    getSpecificMask(col, row, targetId) {
        let mask = 0;
        for (const d of MASK_DIRECTIONS) {
            const nId = this.getTileAt(col + d.c, row + d.r);
            if (targetId === nId || (CONFIG.TILE_DEPTH[nId] || 0) >= (CONFIG.TILE_DEPTH[targetId] || 0)) {
                mask |= d.bit;
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
        const rules = SPAWN_TABLE[tileId] || ((tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) ? SPAWN_TABLE._WALLS : null);
        
        if (!rules) return null;

        const rng = this.pseudoRandom(col, row);

        for (const rule of rules) {
            if (rule.rangeStart && rng < rule.rangeStart) continue;
            
            if (rng < rule.chance) {
                let id = rule.id;
                if (rule.pool) id = rule.pool[Math.floor(rng * 1000) % rule.pool.length];
                
                if (rule.footprint && !this.isFootprintValid(col, row, rule.footprint)) return null;
                
                return id;
            }
        }
        return null;
    }

    createObjectInstance(col, row, id) {
        const config = MAP_OBJECTS[id];
        if (!config) return null;
        return {
            ...config,
            type: id, col, row,
            w: config.width || config.w || 1,
            h: config.height || config.h || 1,
            instanceId: `proc_${col}_${row}`,
            isAnchor: true,
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
        for (let i = 1; i < width; i++) {
            const c = col + i;
            if (this.getElevation(c, row) !== elev || 
                this.isBlockedByFace(c, row) || 
                this.isCliffFace(c, row) || 
                this.isBiomeEdge(c, row)) return false;
        }
        return true;
    }
    
    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999;
        if (id === this.TILES.LAYER_1 || id === this.TILES.LAYER_2) return 1;
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
        const myD = CONFIG.TILE_DEPTH[this.getTileAt(col, row)] || 0;
        const check = (c, r) => (CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < myD;
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
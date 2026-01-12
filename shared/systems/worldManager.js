import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS } from '../data/mapObjects.js';

// ==========================================
// CONFIGURATION: SPAWN RULES
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
    [CONFIG.TILE_TYPES.LAYER_1]: [
        { chance: 0.15, id: 'SMALL_ROCKS_1' }
    ],
    _WALLS: [
        { chance: 0.05, id: 'PINE_TREE' },
        { chance: 0.10, id: 'SMALL_ROCKS_1' },
        { chance: 0.30, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] }
    ]
};

export class WorldManager {
    constructor(seed) {
        this.seed = (typeof seed === 'number') ? seed : Math.floor(Math.random() * 1000000);
        console.log(`%c[WorldManager] Seed: ${this.seed}`, 'color: #00ff00; font-weight: bold;');

        this.offsetX = this.seed * 9973;
        this.offsetY = this.seed * 10007;

        this.TILES = CONFIG.TILE_TYPES;
        
        this._cache = new Map();
        this.objects = new Map();
        this.lastPruneTime = 0;

        this.initNoise(this.seed);
    }

    // ==========================================
    // API: OVERWORLD CONTROLLER
    // ==========================================

    getTileAt(col, row) {
        const key = `${col},${row}`;
        if (this._cache.has(key)) return this._cache.get(key);
        const tileId = this.generateOverworld(col, row);
        this._cache.set(key, tileId);
        return tileId;
    }

    canMove(fromCol, fromRow, toCol, toRow) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);

        // 1. Void Check
        if (toElev === -999) return false;
        
        // 2. Elevation Check 
        if (fromElev !== toElev) return false;
        
        // 3. Solid Objects
        if (this.getSolidObjectAt(toCol, toRow)) return false;
        
        // 4. North-facing Walls (Cliff collisions)
        if (this.isBlockedByFace(toCol, toRow)) return false;

        return true;
    }

    // --- NEW: Helper to check if a specific tile is totally safe ---
    isTileFree(col, row) {
        // 1. Check Terrain
        const tileId = this.getTileAt(col, row);
        if (tileId === this.TILES.LAYER_0) return false; // Water
        if (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) return false; // Walls

        // 2. Check Biome Edge/Cliffs
        if (this.isBlockedByFace(col, row)) return false;
        if (this.isBiomeEdge(col, row)) return false;

        // 3. Check for Object ON this tile
        // IMPORTANT: We must call getObject to FORCE generation if it doesn't exist yet
        const obj = this.getObject(col, row);
        if (obj && obj.isSolid) return false;

        // 4. Check for Overlapping Objects (Big trees nearby)
        if (this.getSolidObjectAt(col, row)) return false;

        return true;
    }

    // --- NEW: Helper to find nearest safe spot to a target ---
    findSafeSpawn(startCol, startRow) {
        if (this.isTileFree(startCol, startRow)) {
            return { x: startCol, y: startRow };
        }

        const radius = 6; 
        for (let r = 1; r <= radius; r++) {
            for (let y = -r; y <= r; y++) {
                for (let x = -r; x <= r; x++) {
                    const c = startCol + x;
                    const r_ = startRow + y;
                    if (this.isTileFree(c, r_)) {
                        return { x: c, y: r_ };
                    }
                }
            }
        }
        return { x: startCol, y: startRow }; // Fallback
    }

    findSpawnPoint() {
        let radius = 0;
        const maxRadius = 500;
        while (radius < maxRadius) {
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;
                    
                    // Only spawn on Grass (Layer 2)
                    if (this.getTileAt(c, r) === this.TILES.LAYER_2) {
                        // Use the new strict check
                        if (this.isTileFree(c, r)) {
                            return { col: c, row: r };
                        }
                    }
                }
            }
            radius++;
        }
        return { col: 0, row: 0 };
    }

    // ==========================================
    // API: MAP RENDERER
    // ==========================================

    getTileData(col, row) {
        const tileId = this.getTileAt(col, row);
        const isBlob = CONFIG.BLOB_TILES && CONFIG.BLOB_TILES.includes(tileId);
        const isWall = (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5);

        return { 
            id: tileId, 
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0, 
            isBlob: isBlob,
            isWall: isWall,
            object: this.getObject(col, row)
        };
    }

    getSpecificMask(col, row, targetId) {
        const check = (c, r) => this.connects(targetId, this.getTileAt(c, r));
        let mask = 0;
        if (check(col, row-1)) mask |= BITMASK.TOP;
        if (check(col+1, row-1)) mask |= BITMASK.TOP_RIGHT;
        if (check(col+1, row)) mask |= BITMASK.RIGHT;
        if (check(col+1, row+1)) mask |= BITMASK.BOTTOM_RIGHT;
        if (check(col, row+1)) mask |= BITMASK.BOTTOM;
        if (check(col-1, row+1)) mask |= BITMASK.BOTTOM_LEFT;
        if (check(col-1, row)) mask |= BITMASK.LEFT;
        if (check(col-1, row-1)) mask |= BITMASK.TOP_LEFT;
        return mask;
    }

    getActiveObjects() { return Array.from(this.objects.values()); }

    getVisibleObjects(camera, canvasWidth, canvasHeight) {
        const GAME_SCALE = CONFIG.GAME_SCALE || 1;
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const pad = TILE_SIZE * 4;
        const minX = camera.x - pad;
        const maxX = camera.x + (canvasWidth / GAME_SCALE) + pad;
        const minY = camera.y - pad;
        const maxY = camera.y + (canvasHeight / GAME_SCALE) + pad;

        return Array.from(this.objects.values()).filter(obj => {
            const px = obj.col * TILE_SIZE;
            const py = obj.row * TILE_SIZE;
            return (px >= minX && px <= maxX && py >= minY && py <= maxY);
        });
    }

    // ==========================================
    // INTERNAL: OBJECTS & PHYSICS
    // ==========================================

    getObject(col, row) {
        const key = `${col},${row}`;
        if (this.objects.has(key)) return this.objects.get(key);
        const newObj = this.generateProceduralObject(col, row);
        if (newObj) this.objects.set(key, newObj);
        return newObj;
    }

    generateProceduralObject(col, row) {
        // Prevent spawning on top of existing multi-tile objects
        if (this.getSolidObjectAt(col, row)) return null;
        if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) return null;

        const tileId = this.getTileAt(col, row);
        let rules = SPAWN_TABLE[tileId];
        if (!rules && (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5)) {
            rules = SPAWN_TABLE._WALLS;
        }

        if (!rules) return null;
        const rng = this.pseudoRandom(col, row);

        for (const rule of rules) {
            if (rule.rangeStart && rng < rule.rangeStart) continue;
            if (rng < rule.chance) {
                let selectedId = rule.id;
                if (rule.pool) {
                    const idx = Math.floor(rng * 1000) % rule.pool.length;
                    selectedId = rule.pool[idx];
                }
                if (rule.footprint && !this.isFootprintValid(col, row, rule.footprint)) return null;
                return this.createObjectInstance(col, row, selectedId);
            }
        }
        return null;
    }

    createObjectInstance(col, row, objectId) {
        const config = MAP_OBJECTS[objectId];
        if (!config) return null;
        return {
            ...config,
            type: objectId,
            col, row,
            w: config.width || config.w || 1, 
            h: config.height || config.h || 1,
            instanceId: `proc_${col}_${row}`,
            isAnchor: true, // Ensures it renders in sorted pass
            interaction: config.interaction || null 
        };
    }

    pruneObjects(cameraX, cameraY) {
        const LIMIT = 30 * CONFIG.TILE_SIZE;
        for (const [key, obj] of this.objects) {
            const dx = Math.abs((obj.col * CONFIG.TILE_SIZE) - cameraX);
            const dy = Math.abs((obj.row * CONFIG.TILE_SIZE) - cameraY);
            if (dx > LIMIT || dy > LIMIT) this.objects.delete(key);
        }
    }

    getSolidObjectAt(col, row) {
        const RADIUS = 3; 
        for (let r = row; r <= row + RADIUS; r++) { 
            for (let c = col - RADIUS; c <= col; c++) { 
                const obj = this.objects.get(`${c},${r}`); 
                if (!obj || !obj.isSolid) continue;
                const hitW = obj.hitbox ? obj.hitbox.w : (obj.width || obj.w || 1);
                const hitH = obj.hitbox ? obj.hitbox.h : (obj.height || obj.h || 1);
                const left = c;
                const right = c + hitW - 1;
                const top = r - hitH + 1;
                const bottom = r; 
                if (col >= left && col <= right && row <= bottom && row >= top) return obj;
            }
        }
        return null;
    }

    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999;
        if (id === this.TILES.LAYER_1 || id === this.TILES.LAYER_2) return 1;
        return CONFIG.TILE_DEPTH[id] || 0;
    }

    getWallFaceDepth(tileId) {
        const depth = CONFIG.TILE_DEPTH[tileId] || 0;
        if (depth >= 3) return depth - 1; 
        if (depth === 2) return 1;
        return 0;
    }

    isBlockedByFace(col, row) {
       const myElev = this.getElevation(col, row);
       const nTile = this.getTileAt(col, row - 1);
       if (this.getElevation(col, row - 1) > myElev && this.getWallFaceDepth(nTile) >= 1) return true;
       const nnTile = this.getTileAt(col, row - 2);
       if (this.getElevation(col, row - 2) > myElev && this.getWallFaceDepth(nnTile) >= 2) return true;
       return false;
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
        const d = CONFIG.TILE_DEPTH[this.getTileAt(col, row)] || 0;
        const lower = (c, r) => (CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < d;
        return lower(col, row-1) || lower(col+1, row) || lower(col, row+1) || lower(col-1, row);
    }

    isFootprintValid(col, row, width) {
        const elev = this.getElevation(col, row);
        for (let i = 0; i < width; i++) {
            const c = col + i;
            if (this.getElevation(c, row) !== elev) return false;
            if (this.isBlockedByFace(c, row)) return false;
            if (this.isCliffFace(c, row)) return false;
            if (this.isBiomeEdge(c, row)) return false;
        }
        return true;
    }

    connects(tId, nId) {
        if (tId === nId) return true;
        const d1 = CONFIG.TILE_DEPTH[tId] || 0;
        const d2 = CONFIG.TILE_DEPTH[nId] || 0;
        return d2 >= d1;
    }

    // ==========================================
    // MATH & NOISE ENGINE
    // ==========================================

    generateOverworld(col, row) {
        const val = this.noise((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
        if (val < -0.30) return this.TILES.LAYER_0;
        if (val < -0.15) return this.TILES.LAYER_1;
        if (val < 0.25)  return this.TILES.LAYER_2;
        if (val < 0.50)  return this.TILES.LAYER_3;
        if (val < 0.75)  return this.TILES.LAYER_4;
        return this.TILES.LAYER_5;
    }

    pseudoRandom(col, row) {
        const dot = col * 12.9898 + row * 78.233 + this.seed;
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }

    initNoise(seed) {
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
    noise(x, y) {
        const X = Math.floor(x) & 255; const Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = this.fade(x); const v = this.fade(y);
        const A = this.p[X] + Y; const B = this.p[X + 1] + Y;
        return this.lerp(v, this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)), 
                         this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1)));
    }
}
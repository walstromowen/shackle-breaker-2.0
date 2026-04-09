import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS_DEFINITIONS } from '../data/mapObjectDefinitions.js';
import { gameState } from '../state/gameState.js';
import { biomeFactory } from './factories/biomeFactory.js';
import { mapObjectFactory } from '../../shared/systems/factories/mapObjectsFactory.js';
import { WeatherFactory } from '../../shared/systems/factories/weatherFactory.js';

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
        
        if (!gameState.world.currentWeather) {
            gameState.world.currentWeather = WeatherFactory.createWeather('CLEAR');
            gameState.world.currentWeather.intensity = 1.0;
        }

        this.seed = gameState.seed;
        console.log(`%c[WorldManager] Seed: ${this.seed} (Chunked Mode)`, 'color: #00ff00; font-weight: bold;');

        this.offsetX = this.seed * 9973;
        this.offsetY = this.seed * 10007;
        this.TILES = CONFIG.TILE_TYPES;
        
        // --- CHUNKING & MEMORY ---
        this.CHUNK_SIZE = 16; 
        this.chunks = new Map();         // Stores active chunk metadata
        this._tileCache = new Map();     // Global fast-access tile cache
        this._biomeCache = new Map();    // Global fast-access biome cache
        this.objects = new Map();        // Active global objects (by origin)
        this._collisionMap = new Map();  // O(1) Object hitboxes!

        // --- NOISE GENERATORS ---
        this.elevationNoise = new PerlinNoise(this.seed);
        this.temperatureNoise = new PerlinNoise(this.seed + 12345);
        this.moistureNoise = new PerlinNoise(this.seed + 54321); 
    }

    _k(col, row) { return (col & 0xFFFF) << 16 | (row & 0xFFFF); }
    _s(col, row) { return `${col},${row}`; }

    // ==========================================
    // API: CHUNK GENERATOR
    // ==========================================

    ensureChunkLoaded(col, row) {
        const cx = Math.floor(col / this.CHUNK_SIZE);
        const cy = Math.floor(row / this.CHUNK_SIZE);
        const chunkKey = `${cx},${cy}`;

        if (this.chunks.has(chunkKey)) return;

        this.generateChunk(cx, cy, chunkKey);
    }

    generateChunk(cx, cy, chunkKey) {
        const startCol = cx * this.CHUNK_SIZE;
        const startRow = cy * this.CHUNK_SIZE;
        const endCol = startCol + this.CHUNK_SIZE;
        const endRow = startRow + this.CHUNK_SIZE;

        const chunk = {
            cx, cy,
            keys: [] // Track keys belonging to this chunk for fast pruning
        };

        // Phase 1: Pre-calculate all Tiles & Biomes (Optimized)
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                chunk.keys.push(key);

                // Now safely grabs the pure math value and caches it permanently for the chunk
                this._biomeCache.set(key, this.getBiomeAt(c, r));
                this._tileCache.set(key, this.getTileAt(c, r));
            }
        }

        // Phase 2: Procedural Objects
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);

                // If a previously spawned object is overlapping this tile, skip spawning!
                if (this._collisionMap.has(key)) continue;

                const objId = this._getRawProceduralId(c, r);
                if (objId) {
                    const newObj = this.createObjectInstance(c, r, objId);
                    this.objects.set(key, newObj);

                    // Register Hitbox to Collision Map (O(1) lookups later)
                    const def = MAP_OBJECTS_DEFINITIONS[objId] || {};
                    const hbX = newObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
                    const hbY = newObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
                    const hbW = newObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
                    const hbH = newObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;

                    for(let hr = 0; hr < hbH; hr++) {
                        for(let hc = 0; hc < hbW; hc++) {
                            this._collisionMap.set(this._s(c + hbX + hc, r + hbY + hr), newObj);
                        }
                    }
                }
            }
        }

        this.chunks.set(chunkKey, chunk);
    }

    // ==========================================
    // API: OVERWORLD CONTROLLER
    // ==========================================

    getBiomeAt(col, row) {
        const key = this._s(col, row);
        
        // 1. Fast Cache Return
        if (this._biomeCache.has(key)) return this._biomeCache.get(key);
        
        // 2. Pure Math Fallback (Does NOT trigger chunk generation)
        const rawTemp = this.temperatureNoise.get((col * 0.01) + this.offsetX, (row * 0.01) + this.offsetY);
        const rawMoist = this.moistureNoise.get((col * 0.01) + this.offsetX, (row * 0.01) + this.offsetY);
        const tempVal = Math.min(1, Math.max(0, (rawTemp + 0.5)));
        const moistVal = Math.min(1, Math.max(0, (rawMoist + 0.5)));
        
        return biomeFactory.determineBiome(tempVal, moistVal);
    }

    getTileAt(col, row) {
        const key = this._s(col, row);
        
        // 1. Fast Cache Return
        if (this._tileCache.has(key)) return this._tileCache.get(key);
        
        // 2. Pure Math Fallback (Does NOT trigger chunk generation)
        const elevVal = this.elevationNoise.get((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
        const biome = this.getBiomeAt(col, row);
        
        return biome.getTileId(elevVal);
    }

    canMove(fromCol, fromRow, toCol, toRow, direction) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);
        
        if (toElev === -999) return false; 
        
        // --- UPDATED STAIR LOGIC START ---
        const currentObj = this.getObjectAt(fromCol, fromRow);
        const targetObj = this.getObjectAt(toCol, toRow);

        // Fetch the raw definitions to access 'isStairs' and 'allowedDirections'
        const currentDef = currentObj ? MAP_OBJECTS_DEFINITIONS[currentObj.id] : null;
        const targetDef = targetObj ? MAP_OBJECTS_DEFINITIONS[targetObj.id] : null;

        const targetAllowsMove = targetDef?.isStairs && targetDef.allowedDirections.includes(direction);
        const currentAllowsMove = currentDef?.isStairs && currentDef.allowedDirections.includes(direction);

        if (targetAllowsMove || currentAllowsMove) {
            // Bypass elevation and face-block checks, but still check for solid obstacles
            if (this.getSolidObjectAt(toCol, toRow)) return false;
            return true; 
        }
        // --- UPDATED STAIR LOGIC END ---

        const depthL1 = CONFIG.TILE_DEPTH[this.TILES.LAYER_1] || 1;
        const depthL2 = CONFIG.TILE_DEPTH[this.TILES.LAYER_2] || 2;
        
        const isDirtToGrass = (fromElev === depthL1 && toElev === depthL2) || 
                              (fromElev === depthL2 && toElev === depthL1);
        
        if (fromElev !== toElev && !isDirtToGrass) return false;
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
    // API: MEMORY MANAGEMENT (Prunes Whole Chunks)
    // ==========================================

    prune(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const SAFE_DISTANCE = 2500; 
        const distSq = SAFE_DISTANCE * SAFE_DISTANCE;

        for (const [chunkKey, chunk] of this.chunks) {
            // Calculate chunk center distance
            const chunkPixelX = (chunk.cx * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
            const chunkPixelY = (chunk.cy * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
            
            const dx = chunkPixelX - cameraX;
            const dy = chunkPixelY - cameraY;
            
            if ((dx * dx + dy * dy) > distSq) {
                // Unload entire chunk memory instantly
                for (const key of chunk.keys) {
                    this._tileCache.delete(key);
                    this._biomeCache.delete(key);
                    
                    if (this.objects.has(key)) {
                        this.objects.delete(key);
                    }
                    if (this._collisionMap.has(key)) {
                        this._collisionMap.delete(key);
                    }
                }
                this.chunks.delete(chunkKey);
            }
        }
    }

    // ==========================================
    // API: MAP RENDERER
    // ==========================================

    getTileData(col, row) {
        this.ensureChunkLoaded(col, row);
        
        const tileId = this.getTileAt(col, row);
        const biome = this.getBiomeAt(col, row); 
        const isBlob = CONFIG.BLOB_TILES?.includes(tileId);
        
        return { 
            id: tileId, 
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0, 
            isBlob: isBlob, 
            isWall: (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5), 
            
            // Use this for drawing so it only draws once
            object: this.getObject(col, row), 
            
            // Use this for logic/hiding faces across the whole footprint
            occupyingObject: this.getObjectAt(col, row), 
            
            biomeId: biome.id,
            sheetId: biome.sheetId,
            objectSheetId: biome.objectSheetId 
        };
    }

    getSpecificMask(col, row, targetId) {
        let mask = 0;
        for (const d of MASK_DIRECTIONS) {
            const nCol = col + d.c;
            const nRow = row + d.r;
            
            const nId = this.getTileAt(nCol, nRow);
            const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
            const neighborDepth = CONFIG.TILE_DEPTH[nId] || 0;

            const isStructuralLayer = (targetId !== this.TILES.LAYER_2);
            const isConnectingUpward = (neighborDepth > targetDepth);
            const isSameDepth = (neighborDepth === targetDepth);

            if (isStructuralLayer || isSameDepth || isConnectingUpward) {
                if (targetId === nId || neighborDepth >= targetDepth) mask |= d.bit;
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
        // Returns object ONLY if its origin matches (used for rendering)
        const key = this._s(col, row);
        return this.objects.get(key) || null;
    }

    _getRawProceduralId(col, row) {
        if (gameState.world.changes?.[this._s(col, row)] !== undefined) {
            return gameState.world.changes[this._s(col, row)];
        }

        const myTileId = this.getTileAt(col, row);
        const tileAboveId = this.getTileAt(col, row - 1);
        const tileTwoAboveId = this.getTileAt(col, row - 2);
        
        const myElev = this.getElevation(col, row);
        const elevAbove = this.getElevation(col, row - 1);
        const elevTwoAbove = this.getElevation(col, row - 2);

        // ==========================================
        // 1. PROCEDURAL STAIR GENERATION
        // ==========================================
        
        // Upper level stairs (1-tall) on L4/L5 cliffs (Spawns right below the cliff edge)
        if (elevAbove > myElev) {
            if (tileAboveId === this.TILES.LAYER_4 || tileAboveId === this.TILES.LAYER_5) {
                if (this.pseudoRandom(col, row) < 0.1) {
                    return 'STAIRS_VERTICAL_1';
                }
            }
        }

        // Lower level stairs (3-tall, 2-wide) on L3 cliffs -> Placed ONE LEVEL DOWN
        if (elevTwoAbove > myElev && tileTwoAboveId === this.TILES.LAYER_3 && tileAboveId !== this.TILES.LAYER_3) {
            
            // CRITICAL: Check if the column to the right is ALSO a perfectly flat L3 cliff!
            // This prevents 2-wide stairs from generating on 1-wide cliff corners.
            const rightMyElev = this.getElevation(col + 1, row);
            const rightElevTwoAbove = this.getElevation(col + 1, row - 2);
            const rightTileTwoAboveId = this.getTileAt(col + 1, row - 2);
            const rightTileAboveId = this.getTileAt(col + 1, row - 1);

            const isRightSideValid = (
                rightElevTwoAbove > rightMyElev && 
                rightTileTwoAboveId === this.TILES.LAYER_3 && 
                rightTileAboveId !== this.TILES.LAYER_3
            );

            if (isRightSideValid) {
                if (this.pseudoRandom(col, row - 1) < 0.1) {
                    // Make sure you add this ID to your MAP_OBJECTS_DEFINITIONS!
                    return 'STAIRS_LARGE_VERTICAL'; 
                }
            }
        }

        // ==========================================
        // 2. STANDARD OBJECT REJECTIONS
        // ==========================================
        // We block normal props on cliffs/faces (or near edges)
        if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) {
            return null;
        }

        // ==========================================
        // 3. STANDARD BIOME GENERATION
        // ==========================================
        const biome = this.getBiomeAt(col, row);
        const objRng = this.pseudoRandom(col + 100, row + 100); 
        
        const spawnData = biome.getSpawnId(myTileId, objRng, false);

        if (!spawnData) return null;

        const def = MAP_OBJECTS_DEFINITIONS[spawnData.id] || {};
        const w = def.w || def.width || 1;
        const h = def.h || def.height || 1;

        // Bypassed by stairs returning early, applies only to standard biome props
        if (!this.isFootprintValid(col, row, w, h)) return null;
        
        return spawnData.id;
    }

    createObjectInstance(col, row, id) {
        const biome = this.getBiomeAt(col, row);
        return mapObjectFactory.create(id, col, row, biome);
    }

    modifyWorld(col, row, newValue) {
        const key = this._s(col, row);
        gameState.world.changes[key] = newValue;
        
        if (this.objects.has(key)) {
            const oldObj = this.objects.get(key);
            
            // Reconstruct the hitbox footprint
            const def = MAP_OBJECTS_DEFINITIONS[oldObj.id] || {};
            const hbX = oldObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
            const hbY = oldObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
            const hbW = oldObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
            const hbH = oldObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;

            // Loop through the footprint and scrub it from the collision map
            for(let hr = 0; hr < hbH; hr++) {
                for(let hc = 0; hc < hbW; hc++) {
                    const targetKey = this._s(col + hbX + hc, row + hbY + hr);
                    this._collisionMap.delete(targetKey);
                }
            }

            // Remove the main visual object reference
            this.objects.delete(key);
        }
    }

    // ==========================================
    // LOGIC: PHYSICS & COLLISION
    // ==========================================

    getObjectAt(col, row) {
        this.ensureChunkLoaded(col, row); // Keep this here for physics checks!
        return this._collisionMap.get(this._s(col, row)) || null;
    }

    getSolidObjectAt(col, row) {
        const obj = this.getObjectAt(col, row);
        if (obj && obj.isSolid !== false) return obj;
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

    isFootprintValid(col, row, w, h) {
        const elev = this.getElevation(col, row);
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (c === col && r === row) continue; 
                
                if (this.getElevation(c, r) !== elev || 
                    this.isBlockedByFace(c, r) || 
                    this.isCliffFace(c, r) || 
                    this.isBiomeEdge(c, r)) return false;
            }
        }
        return true;
    }
    getLightObjects(camera, canvasWidth, canvasHeight) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const scale = CONFIG.GAME_SCALE || 1;
        
        // WIDE padding so lights don't pop in at the edges
        const LIGHT_PAD = 15; 
        
        const startCol = Math.floor(camera.x / TILE_SIZE) - LIGHT_PAD;
        const endCol = startCol + Math.ceil((canvasWidth / scale) / TILE_SIZE) + (LIGHT_PAD * 2);
        const startRow = Math.floor(camera.y / TILE_SIZE) - LIGHT_PAD;
        const endRow = startRow + Math.ceil((canvasHeight / scale) / TILE_SIZE) + (LIGHT_PAD * 2);

        const lightObjects = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const obj = this.getObject(c, r);
                
                // CRITICAL: Only return objects that actually emit light!
                if (obj && obj.light && obj.light.hasLight) {
                    lightObjects.push(obj);
                }
            }
        }
        return lightObjects;
    }
    
    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999; 
        return CONFIG.TILE_DEPTH[id] || 0;
    }

    getWallFaceDepth(tileId) {
        // Hardcode face depths to stop upper cliffs from generating massive invisible collision walls
        if (tileId === this.TILES.LAYER_3) return 2; // Bottom cliffs are 2 tiles deep visually
        if (tileId === this.TILES.LAYER_4 || tileId === this.TILES.LAYER_5) return 1; // Upper cliffs are 1 tile deep
        return 0;
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
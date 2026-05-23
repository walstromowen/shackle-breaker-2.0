import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS_DEFINITIONS } from '../data/mapObjectDefinitions.js';
import { STRUCTURES } from '../data/structures.js';
import { gameState } from '../state/gameState.js';
import { mapObjectFactory } from '../../shared/systems/factories/mapObjectsFactory.js';
import { WeatherFactory } from '../../shared/systems/factories/weatherFactory.js';
import { TerrainGenerator } from './TerrainGenerator.js';

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
        if (!gameState.world.terrainOverrides) gameState.world.terrainOverrides = {};
        if (!gameState.world.currentWeather) {
            gameState.world.currentWeather = WeatherFactory.createWeather('CLEAR');
            gameState.world.currentWeather.intensity = 1.0;
        }
        this.seed = gameState.seed;
        console.log(`%c[WorldManager] Seed: ${this.seed} (Chunked Mode)`, 'color: #00ff00; font-weight: bold;');
        this.TILES = CONFIG.TILE_TYPES;
        this.CHUNK_SIZE = 16;
        
        // --- MEMORY ---
        this.chunks = new Map();
        this.objects = new Map();
        this._collisionMap = new Map();
        
        // --- SYSTEMS ---
        this.terrain = new TerrainGenerator(this.seed);
    }

    _k(col, row) { return (col & 0xFFFF) << 16 | (row & 0xFFFF); }
    _s(col, row) { return `${col},${row}`; }
    getTileAt(col, row) { return this.terrain.getTileAt(col, row); }
    getBiomeAt(col, row) { return this.terrain.getBiomeAt(col, row); }

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
        const chunk = { cx, cy, keys: [] };

        // Phase 1: Pre-calculate Tiles
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                chunk.keys.push(key);
                this.getBiomeAt(c, r);
                this.getTileAt(c, r);
            }
        }

        // Phase 1.5: Spawn Prefab Structures
        this._spawnStructuresForChunk(cx, cy, startCol, startRow);

        // Phase 2: Procedural Objects
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                if (this._collisionMap.has(key)) continue;
                const objId = this._getRawProceduralId(c, r);
                if (objId) {
                    this._placeObject(c, r, objId);
                }
            }
        }
        this.chunks.set(chunkKey, chunk);
    }

    // ==========================================
    // LOGIC: STRUCTURE PREFABS & BLUEPRINTS
    // ==========================================
    _spawnStructuresForChunk(cx, cy, startCol, startRow) {
        const centerCol = startCol + Math.floor(this.CHUNK_SIZE / 2);
        const centerRow = startRow + Math.floor(this.CHUNK_SIZE / 2);
        const biome = this.getBiomeAt(centerCol, centerRow);
        const structureRng = this.pseudoRandom(cx * 137, cy * 193);
        const structureId = biome.getStructureId(structureRng);
        if (!structureId) return;

        const prefabOrBlueprint = STRUCTURES[structureId];
        if (!prefabOrBlueprint) return;

        const checkWidth = prefabOrBlueprint.type === 'BLUEPRINT' ? STRUCTURES[prefabOrBlueprint.centerPrefab].width : prefabOrBlueprint.width;
        const checkHeight = prefabOrBlueprint.type === 'BLUEPRINT' ? STRUCTURES[prefabOrBlueprint.centerPrefab].height : prefabOrBlueprint.height;
        const maxLocalCol = Math.max(1, this.CHUNK_SIZE - checkWidth);
        const maxLocalRow = Math.max(1, this.CHUNK_SIZE - checkHeight);
        const startX = Math.floor(this.pseudoRandom(cx * 401, cy * 503) * maxLocalCol);
        const startY = Math.floor(this.pseudoRandom(cx * 607, cy * 701) * maxLocalRow);

        for (let rOffset = 0; rOffset < maxLocalRow; rOffset++) {
            for (let cOffset = 0; cOffset < maxLocalCol; cOffset++) {
                const localCol = (startX + cOffset) % maxLocalCol;
                const localRow = (startY + rOffset) % maxLocalRow;
                const originCol = startCol + localCol;
                const originRow = startRow + localRow;

                if (this._isStructureFootprintValid(originCol, originRow, checkWidth, checkHeight)) {
                    if (prefabOrBlueprint.type === 'BLUEPRINT') {
                        this._planBlueprint(originCol, originRow, prefabOrBlueprint, cx, cy);
                    } else {
                        this._writePrefabToGlobalState(originCol, originRow, prefabOrBlueprint);
                    }
                    return;
                }
            }
        }
    }

    _planBlueprint(startCol, startRow, blueprint, cx, cy) {
    const centerPrefab = STRUCTURES[blueprint.centerPrefab];
    if (!centerPrefab) return;

    console.log(`[WorldManager] Planning Blueprint Structure at ${startCol}, ${startRow}`);
    this._writePrefabToGlobalState(startCol, startRow, centerPrefab);

    const baseElev = this.getElevation(startCol, startRow);
    const claimedTiles = new Set();
    const markClaimed = (c, r, w, h) => {
        for(let y = 0; y < h; y++) {
            for(let x = 0; x < w; x++) claimedTiles.add(this._s(c + x, r + y));
        }
    };
    markClaimed(startCol, startRow, centerPrefab.width, centerPrefab.height);

    // Directions: 0=North, 1=East, 2=South, 3=West
    const DIRS = [
        {c: 0, r: -1}, // North
        {c: 1, r: 0},  // East
        {c: 0, r: 1},  // South
        {c: -1, r: 0}  // West
    ];

    let activePaths = [];
    for (let i = 0; i < 4; i++) {
        if (this.pseudoRandom(cx * 11, cy * i * 13) < blueprint.branchChance) {
            const midC = startCol + Math.floor(centerPrefab.width / 2);
            const midR = startRow + Math.floor(centerPrefab.height / 2);

            const edgeC = midC + (DIRS[i].c * Math.floor(centerPrefab.width / 2));
            const edgeR = midR + (DIRS[i].r * Math.floor(centerPrefab.height / 2));

            const startC = edgeC;
            const startR = edgeR;

            const lenRng = this.pseudoRandom(cx * i, cy * 31);
            const maxLen = Math.floor(lenRng * (blueprint.branchLength.max - blueprint.branchLength.min)) + blueprint.branchLength.min;
            
            activePaths.push({ 
                c: startC, 
                r: startR, 
                dirIndex: i, 
                len: 0, 
                maxLen: maxLen, 
                stepsSinceLastModule: 0,
                stepsSinceLastTurn: 0 // <-- Added tracking for turns
            });
        }
    }

    while (activePaths.length > 0) {
        const nextPaths = [];
        for (const p of activePaths) {
            if (p.len >= p.maxLen) continue;

            // --- 1. SPONTANEOUS TURNING LOGIC ---
            // Pull settings from blueprint or fall back to defaults
            const turnChance = blueprint.turnChance ?? 0.15; // 15% chance to attempt a turn per step
            const minStepsBetweenTurns = blueprint.minStepsBetweenTurns ?? 4; // Ensure straight sections

            if (p.stepsSinceLastTurn >= minStepsBetweenTurns) {
                if (this.pseudoRandom(p.c * 53, p.r * 67) < turnChance) {
                    const leftDir = (p.dirIndex + 3) % 4;
                    const rightDir = (p.dirIndex + 1) % 4;
                    // Deterministically pick left or right
                    const turnDir = this.pseudoRandom(p.c * 71, p.r * 79) < 0.5 ? leftDir : rightDir;

                    // Only commit to the turn if the very next tile in that direction is valid
                    if (this._isPathValid(p.c + DIRS[turnDir].c, p.r + DIRS[turnDir].r, baseElev, claimedTiles)) {
                        p.dirIndex = turnDir;
                        p.stepsSinceLastTurn = 0; 
                    }
                }
            }
            // ------------------------------------

            let nextC = p.c + DIRS[p.dirIndex].c;
            let nextR = p.r + DIRS[p.dirIndex].r;
            let valid = this._isPathValid(nextC, nextR, baseElev, claimedTiles);

            // --- 2. OBSTACLE AVOIDANCE STEERING (Existing fallback logic) ---
            if (!valid) {
                const leftDir = (p.dirIndex + 3) % 4;
                const rightDir = (p.dirIndex + 1) % 4;
                const tryFirst = this.pseudoRandom(p.c, p.r) < 0.5 ? leftDir : rightDir;
                const trySecond = tryFirst === leftDir ? rightDir : leftDir;

                if (this._isPathValid(p.c + DIRS[tryFirst].c, p.r + DIRS[tryFirst].r, baseElev, claimedTiles)) {
                    p.dirIndex = tryFirst;
                    nextC = p.c + DIRS[p.dirIndex].c;
                    nextR = p.r + DIRS[p.dirIndex].r;
                    valid = true;
                    p.stepsSinceLastTurn = 0; // Reset turn counter on forced steer
                } else if (this._isPathValid(p.c + DIRS[trySecond].c, p.r + DIRS[trySecond].r, baseElev, claimedTiles)) {
                    p.dirIndex = trySecond;
                    nextC = p.c + DIRS[p.dirIndex].c;
                    nextR = p.r + DIRS[p.dirIndex].r;
                    valid = true;
                    p.stepsSinceLastTurn = 0; // Reset turn counter on forced steer
                }
            }

            if (valid) {
                p.c = nextC;
                p.r = nextR;
                p.len++;
                p.stepsSinceLastModule++;
                p.stepsSinceLastTurn++; // <-- Increment turn steps counter

                const key = this._s(p.c, p.r);
                gameState.world.terrainOverrides[key] = blueprint.pathTile;
                this.terrain.invalidateTile(key);
                claimedTiles.add(key);

                this.modifyWorld(p.c, p.r, null);

                // Spawning modules alongside paths
                for (const modConfig of blueprint.modules) {
                    if (p.stepsSinceLastModule >= modConfig.spacing) {
                        if (this.pseudoRandom(p.c * 7, p.r * 11) < modConfig.spawnChance) {
                            const modPrefab = STRUCTURES[modConfig.prefab];
                            const sideDir = DIRS[(p.dirIndex + 1) % 4];
                            let moduleOriginC = 0;
                            let moduleOriginR = 0;

                            if (p.dirIndex === 0 || p.dirIndex === 2) {
                                moduleOriginR = p.r - Math.floor(modPrefab.height / 2);
                                if (sideDir.c > 0) {
                                    moduleOriginC = p.c + modConfig.offset;
                                } else {
                                    moduleOriginC = p.c - modConfig.offset - modPrefab.width + 1;
                                }
                            } else {
                                moduleOriginC = p.c - Math.floor(modPrefab.width / 2);
                                if (sideDir.r > 0) {
                                    moduleOriginR = p.r + modConfig.offset;
                                } else {
                                    moduleOriginR = p.r - modConfig.offset - modPrefab.height + 1;
                                }
                            }

                            if (this._isStructureFootprintValid(moduleOriginC, moduleOriginR, modPrefab.width, modPrefab.height)) {
                                let overlap = false;
                                for(let y=0; y<modPrefab.height; y++) {
                                    for(let x=0; x<modPrefab.width; x++) {
                                        if (claimedTiles.has(this._s(moduleOriginC+x, moduleOriginR+y))) overlap = true;
                                    }
                                }
                                if (!overlap) {
                                    this._writePrefabToGlobalState(moduleOriginC, moduleOriginR, modPrefab);
                                    markClaimed(moduleOriginC, moduleOriginR, modPrefab.width, modPrefab.height);
                                    p.stepsSinceLastModule = 0;
                                    break;
                                }
                            }
                        }
                    }
                }
                nextPaths.push(p);
            }
        }
        activePaths = nextPaths;
    }
}

    _isPathValid(c, r, baseElev, claimedTiles) {
        if (claimedTiles.has(this._s(c, r))) return false;
        if (this.getElevation(c, r) !== baseElev) return false;
        if (this.isBlockedByFace(c, r)) return false;
        if (this.isCliffFace(c, r)) return false;
        return true;
    }

   _writePrefabToGlobalState(originCol, originRow, prefab) {
        // Writes designated prefab objects or completely clears footprint space to block procedural clutter
        for (let r = 0; r < prefab.height; r++) {
            for (let c = 0; c < prefab.width; c++) {
                const key = this._s(originCol + c, originRow + r);
                const explicitObjId = prefab.objects?.[r]?.[c] ?? null;

                // 1. Evict any stale procedural objects that spawned due to chunk loading order
                if (this.objects.has(key)) {
                    this.modifyWorld(originCol + c, originRow + r, null);
                }

                // 2. Commit the prefab object to global state changes
                gameState.world.changes[key] = explicitObjId;

                // 3. Force immediate instantiation into active tracking maps
                if (explicitObjId) {
                    this._placeObject(originCol + c, originRow + r, explicitObjId);
                }
            }
        }

        if (prefab.terrain) {
            for (let r = 0; r < prefab.height; r++) {
                for (let c = 0; c < prefab.width; c++) {
                    const tileId = prefab.terrain[r][c];
                    if (tileId !== null) {
                        const key = this._s(originCol + c, originRow + r);
                        gameState.world.terrainOverrides[key] = tileId;
                        this.terrain.invalidateTile(key);
                    }
                }
            }
        }
    }

    _isStructureFootprintValid(col, row, w, h) {
        const baseElev = this.getElevation(col, row);
        if (baseElev <= 0) return false;

        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                const key = this._s(c, r);
                
                //  FIX: Prevent neighboring structures/paths from stomping on this footprint
                if (gameState.world.changes[key] !== undefined) return false;

                if (this.getElevation(c, r) !== baseElev) return false;
                if (this.isBlockedByFace(c, r)) return false;
                if (this.isCliffFace(c, r)) return false;
            }
        }
        return true;
    }
    prune(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const SAFE_DISTANCE = 2500;
        const distSq = SAFE_DISTANCE * SAFE_DISTANCE;
        for (const [chunkKey, chunk] of this.chunks) {
            const chunkPixelX = (chunk.cx * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
            const chunkPixelY = (chunk.cy * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
            const dx = chunkPixelX - cameraX; const dy = chunkPixelY - cameraY;
            if ((dx * dx + dy * dy) > distSq) {
                this.terrain.clearCacheForKeys(chunk.keys);
                for (const key of chunk.keys) {
                    if (this.objects.has(key)) this.objects.delete(key);
                    if (this._collisionMap.has(key)) this._collisionMap.delete(key);
                }
                this.chunks.delete(chunkKey);
            }
        }
    }

    getTileData(col, row) {
        this.ensureChunkLoaded(col, row);
        const tileId = this.getTileAt(col, row);
        const biome = this.getBiomeAt(col, row);
        const isBlob = CONFIG.BLOB_TILES?.includes(tileId);
        let occupyingObject = this.getObjectAt(col, row);
        if (occupyingObject && !occupyingObject.isStairs && this.isBlockedByFace(col, row)) {
            occupyingObject = null;
        }
        return {
            id: tileId,
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0,
            isBlob: isBlob,
            isWall: (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5),
            object: this.getObject(col, row),
            occupyingObject: occupyingObject,
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

    getActiveObjects() { return Array.from(this.objects.values()); }

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

    getObject(col, row) {
        const key = this._s(col, row);
        
        // LAZY INITIALIZATION CATCH-ALL
        // If the object map is empty but global state claims an object belongs here,
        // instantiate it now to catch cross-chunk structure bleeding.
        if (!this.objects.has(key)) {
            const forcedObjId = gameState.world.changes?.[key];
            if (forcedObjId) {
            this._placeObject(col, row, forcedObjId);
            }
        }

        return this.objects.get(key) || null;
        }

    _placeObject(col, row, id) {
        const newObj = this.createObjectInstance(col, row, id);
        this.objects.set(this._s(col, row), newObj);
        const def = MAP_OBJECTS_DEFINITIONS[id] || {};
        const hbX = newObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
        const hbY = newObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
        const hbW = newObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
        const hbH = newObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;
        for(let hr = 0; hr < hbH; hr++) {
            for(let hc = 0; hc < hbW; hc++) {
                this._collisionMap.set(this._s(col + hbX + hc, row + hbY + hr), newObj);
            }
        }
    }

    _getRawProceduralId(col, row) {
        const forcedObjId = gameState.world.changes?.[this._s(col, row)];
        if (forcedObjId !== undefined) {
            if (forcedObjId === null) return null;
            const def = MAP_OBJECTS_DEFINITIONS[forcedObjId] || {};
            if (!def.isStairs && this.isBlockedByFace(col, row)) return null;
            return forcedObjId;
        }
        const myTileId = this.getTileAt(col, row);
        const tileAboveId = this.getTileAt(col, row - 1);
        const tileTwoAboveId = this.getTileAt(col, row - 2);
        const myElev = this.getElevation(col, row);
        const elevAbove = this.getElevation(col, row - 1);
        const elevTwoAbove = this.getElevation(col, row - 2);

        if (elevAbove > myElev && (tileAboveId === this.TILES.LAYER_4 || tileAboveId === this.TILES.LAYER_5)) {
            if (this.pseudoRandom(col, row) < 0.1) return 'STAIRS_VERTICAL_1';
        }
        if (elevTwoAbove > myElev && tileTwoAboveId === this.TILES.LAYER_3 && tileAboveId !== this.TILES.LAYER_3) {
            const rightMyElev = this.getElevation(col + 1, row);
            const rightElevTwoAbove = this.getElevation(col + 1, row - 2);
            const rightTileTwoAboveId = this.getTileAt(col + 1, row - 2);
            const rightTileAboveId = this.getTileAt(col + 1, row - 1);
            const isRightSideValid = ( rightElevTwoAbove > rightMyElev && rightTileTwoAboveId === this.TILES.LAYER_3 && rightTileAboveId !== this.TILES.LAYER_3 );
            if (isRightSideValid && this.pseudoRandom(col, row - 1) < 0.1) {
                return 'STAIRS_LARGE_VERTICAL';
            }
        }
        if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) return null;
        const tileMask = this.getSpecificMask(col, row, myTileId);
        if (tileMask !== 255) return null;
        const biome = this.getBiomeAt(col, row);
        const objRng = this.pseudoRandom(col + 100, row + 100);
        let spawnCategory = myTileId;
        if (myTileId >= this.TILES.LAYER_3 && myTileId <= this.TILES.LAYER_5) {
            spawnCategory = '_WALLS';
        }
        const spawnData = biome.getSpawnId(spawnCategory, objRng, false);
        if (!spawnData) return null;
        const def = MAP_OBJECTS_DEFINITIONS[spawnData.id] || {};
        const w = def.w || def.width || 1; const h = def.h || def.height || 1;
        if (!this.isFootprintValid(col, row, w, h)) return null;
        return spawnData.id;
    }

    moduleOriginC = 0;

    createObjectInstance(col, row, id) {
        const biome = this.getBiomeAt(col, row);
        return mapObjectFactory.create(id, col, row, biome);
    }

    modifyWorld(col, row, newValue) {
        const key = this._s(col, row);
        gameState.world.changes[key] = newValue;
        if (this.objects.has(key)) {
            const oldObj = this.objects.get(key);
            const def = MAP_OBJECTS_DEFINITIONS[oldObj.id] || {};
            const hbX = oldObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
            const hbY = oldObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
            const hbW = oldObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
            const hbH = oldObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;
            for(let hr = 0; hr < hbH; hr++) {
                for(let hc = 0; hc < hbW; hc++) {
                    this._collisionMap.delete(this._s(col + hbX + hc, row + hbY + hr));
                }
            }
            this.objects.delete(key);
        }
    }

    getObjectAt(col, row) { this.ensureChunkLoaded(col, row); return this._collisionMap.get(this._s(col, row)) || null; }
    getSolidObjectAt(col, row) { const obj = this.getObjectAt(col, row); return (obj && obj.isSolid !== false) ? obj : null; }

    canMove(fromCol, fromRow, toCol, toRow, direction) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);
        if (toElev === -999) return false;
        const currentObj = this.getObjectAt(fromCol, fromRow);
        const targetObj = this.getObjectAt(toCol, toRow);
        const currentDef = currentObj ? MAP_OBJECTS_DEFINITIONS[currentObj.id] : null;
        const targetDef = targetObj ? MAP_OBJECTS_DEFINITIONS[targetObj.id] : null;
        const targetAllowsMove = targetDef?.isStairs && targetDef.allowedDirections.includes(direction);
        const currentAllowsMove = currentDef?.isStairs && currentDef.allowedDirections.includes(direction);
        const isSameStair = (currentObj && targetObj && currentObj === targetObj && currentDef?.isStairs);
        if (targetAllowsMove || currentAllowsMove || isSameStair) {
            return !this.getSolidObjectAt(toCol, toRow);
        }
        const depthL1 = CONFIG.TILE_DEPTH[this.TILES.LAYER_1] || 1;
        const depthL2 = CONFIG.TILE_DEPTH[this.TILES.LAYER_2] || 2;
        const isDirtToGrass = (fromElev === depthL1 && toElev === depthL2) || (fromElev === depthL2 && toElev === depthL1);
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
                    if (this.isTileFree(c, r) && this.getElevation(c, r) === 1) {
                        return { col: c, row: r };
                    }
                }
            }
            radius++;
        }
        return { col: 0, row: 0 };
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
        if (elev <= 0) return false;
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                const key = this._s(c, r);
                if (gameState.world.changes[key] !== undefined) return false;
                if (c === col && r === row) continue;
                if (this.getElevation(c, r) !== elev) return false;
                if (this.isBlockedByFace(c, r)) return false;
                if (this.isCliffFace(c, r)) return false;
                if (this.isBiomeEdge(c, r)) return false;
            }
        }
        return true;
    }

    getLightObjects(camera, canvasWidth, canvasHeight) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const scale = CONFIG.GAME_SCALE || 1;
        const LIGHT_PAD = 15;
        const startCol = Math.floor(camera.x / TILE_SIZE) - LIGHT_PAD;
        const endCol = startCol + Math.ceil((canvasWidth / scale) / TILE_SIZE) + (LIGHT_PAD * 2);
        const startRow = Math.floor(camera.y / TILE_SIZE) - LIGHT_PAD;
        const endRow = startRow + Math.ceil((canvasHeight / scale) / TILE_SIZE) + (LIGHT_PAD * 2);
        const lightObjects = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const obj = this.getObject(c, r);
                if (obj && obj.light && obj.light.hasLight) lightObjects.push(obj);
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
        if (tileId === this.TILES.LAYER_3) return 2;
        if (tileId === this.TILES.LAYER_4 || tileId === this.TILES.LAYER_5) return 1;
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
            return ((CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < myD) || (this.getBiomeAt(c, r).id !== myBiomeId);
        };
        return check(col, row-1) || check(col+1, row) || check(col, row+1) || check(col-1, row);
    }

    pseudoRandom(col, row) {
        const dot = col * 12.9898 + row * 78.233 + this.seed;
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }
}
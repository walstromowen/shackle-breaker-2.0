import { CONFIG, BITMASK } from '../core/constants.js';
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { isPlateau, layerIndex } from './biomeDefinitions.js';
import { gameState } from '../core/gameState.js';
import { mapObjectFactory } from './mapObjectsFactory.js';
import { WeatherFactory } from './weatherFactory.js';
import { TerrainGenerator } from './terrainGenerator.js';
/* --- NEW: Import the Factory instead of the old Generator --- */
import { InteriorFactory } from './interiorFactory.js';
import { VillagePlanner } from './villagePlanner.js';
import { StructureSpawner } from './structureSpawner.js';
/* Multiplayer: every change a player makes to the map (an object taken away or put down, a container searched, a regrowth scheduled) is
   reported through worldSync.onLocalChange(key, value) so it can be sent to the others; a change that arrives from another player is put in
   with WorldManager.applyRemoteChange, which is not reported again. Null when nobody is listening (single player). Generated structures
   are not reported: every player's browser builds the same villages from the same seed. */
export const worldSync = { onLocalChange: null };
const reportChange = (key, value) => { if (worldSync.onLocalChange) worldSync.onLocalChange(key, value); };

const MASK_DIRECTIONS = [
    { c: 0, r: -1, bit: BITMASK.TOP },
    { c: 1, r: -1, bit: BITMASK.TOP_RIGHT },
    { c: 1, r: 0, bit: BITMASK.RIGHT },
    { c: 1, r: 1, bit: BITMASK.BOTTOM_RIGHT },
    { c: 0, r: 1, bit: BITMASK.BOTTOM },
    { c: -1, r: 1, bit: BITMASK.BOTTOM_LEFT },
    { c: -1, r: 0, bit: BITMASK.LEFT },
    { c: -1, r: -1, bit: BITMASK.TOP_LEFT },
];
export class WorldManager {
    constructor() {
        if (!gameState.seed) gameState.seed = Math.floor(Math.random() * 1000000);
        if (!gameState.world.changes) gameState.world.changes = {};
        if (!gameState.world.terrainOverrides) gameState.world.terrainOverrides = {};
        if (!gameState.world.villageStairs) gameState.world.villageStairs = [];
        if (!gameState.world.levelPaths) gameState.world.levelPaths = {};
        if (!gameState.world.waypoints) gameState.world.waypoints = [];
        if (!gameState.world.currentWeather) {
            gameState.world.currentWeather = WeatherFactory.createWeather('CLEAR');
            gameState.world.currentWeather.intensity = 1.0;
        }
        this.seed = gameState.seed;
        this.TILES = CONFIG.TILE_TYPES;
        this.CHUNK_SIZE = 16;
        /* --- MEMORY --- */
        this.chunks = new Map();
        this.objects = new Map();
        this._collisionMap = new Map();
        this._structureSpawnedChunks = new Set();
        /* Overworld map objects (trees, flowers, rocks, stairs...) and structures are not generated while this is false. Objects placed by the
           player or by a saved change (gameState.world.changes) and interiors are not affected. Set it to true to bring generation back. */
        this.GENERATE_MAP_OBJECTS = true;
        /* --- SYSTEMS --- */
        if (gameState.world.isInterior) {
            console.log(`%c[WorldManager] Interior Mode: ${gameState.world.interiorType}`, 'color: #00ffaa; font-weight: bold;');
            /* --- NEW: Use the Factory to generate the layout based on the ID --- */
            this.terrain = InteriorFactory.create(this.seed, gameState.world.interiorType, gameState.world.interiorId);
        } else {
            console.log(`%c[WorldManager] Seed: ${this.seed} (Chunked Mode)`, 'color: #00ff00; font-weight: bold;');
            this.terrain = new TerrainGenerator(this.seed);
        }
    }
    _k(col, row) {
        return ((col & 0xffff) << 16) | (row & 0xffff);
    }
    _s(col, row, explicitMapId = null) {
        if (explicitMapId === 'overworld') {
            return `${col},${row}`;
        } else if (explicitMapId) {
            return `INT_${explicitMapId}_${col},${row}`;
        }
        if (gameState.world.isInterior && gameState.world.interiorId) {
            return `INT_${gameState.world.interiorId}_${col},${row}`;
        }
        return `${col},${row}`;
    }
    getTileAt(col, row) {
        return this.terrain.getTileAt(col, row);
    }
    getBiomeAt(col, row) {
        return this.terrain.getBiomeAt(col, row);
    }
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
        if (!gameState.world.isInterior && this.GENERATE_MAP_OBJECTS) {
            const STRUCTURE_CHECK_RADIUS = 2;
            for (let nx = cx - STRUCTURE_CHECK_RADIUS; nx <= cx + STRUCTURE_CHECK_RADIUS; nx++) {
                for (let ny = cy - STRUCTURE_CHECK_RADIUS; ny <= cy + STRUCTURE_CHECK_RADIUS; ny++) {
                    this._ensureStructuresSpawned(nx, ny);
                }
            }
        }
        /* Phase 1: Pre-calculate Tiles */
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                chunk.keys.push(key);
                this.getBiomeAt(c, r);
                this.getTileAt(c, r);
            }
        }
        /* Phase 2: Object Population */
        const storyObjects = this._storyObjects();
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                if (this._collisionMap.has(key)) continue;
                // a story character standing here because of this player's story (Nikoli by his campfire): before anything the map would put there
                const story = storyObjects.get(`${c},${r}`);
                if (story) { this._placeStory(c, r, story); continue; }
                const forcedObjId = gameState.world.changes?.[key];
                if (forcedObjId !== undefined) {
                    /* nothing is ever placed on open water; a saved object there is left over from another world (see resetWorldForNewGame) */
                    if (forcedObjId !== null && (gameState.world.isInterior || this.getTileAt(c, r) !== this.TILES.LAYER_0)) {
                        this._placeObject(c, r, forcedObjId);
                    }
                    continue;
                }
                let objId = null;
                if (gameState.world.isInterior) {
                    if (typeof this.terrain.getObjectIdAt === 'function') {
                        objId = this.terrain.getObjectIdAt(c, r);
                        if (objId && typeof objId !== 'string') {
                            // a generator handed back something that is not an object id: say which one (once) instead of crashing
                            if (!this._warnedBadObjId) {
                                this._warnedBadObjId = true;
                                console.error(`[WorldManager] ${gameState.world.interiorType} (${this.terrain && this.terrain.constructor && this.terrain.constructor.name}) returned a non-string object id at ${c},${r}:`, objId, '- check that the generator file matches interiorDefinitions.js');
                            }
                            objId = null;
                        }
                        if (objId && !objId.includes('DOOR')) {
                            const tileId = this.getTileAt(c, r);
                            const isWallTile = typeof this.terrain.isWallCell === 'function' ? this.terrain.isWallCell(c, r) : isPlateau(tileId);
                            if (isWallTile || this.isBlockedByFace(c, r) || this.isCliffFace(c, r)) {
                                objId = null;
                            }
                        }
                    }
                } else {
                    objId = this._getRawProceduralId(c, r);
                }
                if (objId) {
                    this._placeObject(c, r, objId);
                }
            }
        }
        this.chunks.set(chunkKey, chunk);
    }
    /* forget one loaded chunk (its objects, collision cells and cached terrain); it is generated afresh the next time something asks for it */
    _unloadChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return;
        this.terrain.clearCacheForKeys(chunk.keys);
        for (const key of chunk.keys) {
            if (this.objects.has(key)) this.objects.delete(key);
            if (this._collisionMap.has(key)) this._collisionMap.delete(key);
        }
        this.chunks.delete(chunkKey);
    }
    prune(cameraX, cameraY) {
        const TILE_SIZE = CONFIG.TILE_SIZE;
        const SAFE_DISTANCE = 2500;
        const distSq = SAFE_DISTANCE * SAFE_DISTANCE;
        for (const [chunkKey, chunk] of this.chunks) {
            const chunkPixelX = (chunk.cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2) * TILE_SIZE;
            const chunkPixelY = (chunk.cy * this.CHUNK_SIZE + this.CHUNK_SIZE / 2) * TILE_SIZE;
            const dx = chunkPixelX - cameraX;
            const dy = chunkPixelY - cameraY;
            if (dx * dx + dy * dy > distSq) this._unloadChunk(chunkKey);
        }
    }
    getTileData(col, row) {
        this.ensureChunkLoaded(col, row);
        const tileId = this.getTileAt(col, row);
        const biome = this.getBiomeAt(col, row);
        const isBlob = CONFIG.BLOB_TILES?.includes(tileId);
        let occupyingObject = this.getObjectAt(col, row);
        if (occupyingObject && this.isBlockedByFace(col, row)) {
            occupyingObject = null;
        }
        return {
            id: tileId,
            mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0,
            isBlob: isBlob,
            isWall: isPlateau(tileId),
            object: this.getObject(col, row),
            occupyingObject: occupyingObject,
            biomeId: biome.id,
            objectSheetId: biome.objectSheetId,
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
            const isStructuralLayer = targetId !== this.TILES.LAYER_2;
            const isConnectingUpward = neighborDepth > targetDepth;
            const isSameDepth = neighborDepth === targetDepth;
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
        const startCol = Math.floor(camera.x / TILE_SIZE) - 2;
        const endCol = startCol + Math.ceil(canvasWidth / scale / TILE_SIZE) + 4;
        const startRow = Math.floor(camera.y / TILE_SIZE) - 2;
        const endRow = startRow + Math.ceil(canvasHeight / scale / TILE_SIZE) + 4;
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
        if (!newObj) return;
        this.objects.set(this._s(col, row), newObj);
        if (id === 'CAMPFIRE') this._campfirePlaced(col, row);
        let activeHitboxes = [];
        if (newObj.hitboxes && Array.isArray(newObj.hitboxes)) {
            activeHitboxes = newObj.hitboxes;
        } else if (newObj.hitbox) {
            activeHitboxes = [newObj.hitbox];
        } else {
            return;
        }
        for (const hb of activeHitboxes) {
            for (let hr = 0; hr < hb.h; hr++) {
                for (let hc = 0; hc < hb.w; hc++) {
                    const targetKey = this._s(col + hb.xOffset + hc, row + hb.yOffset + hr);
                    this._collisionMap.set(targetKey, newObj);
                }
            }
        }
    }
    /* ---- story characters on the map ----
       Nikoli makes camp beside the first campfire of the snowy mountains the world puts down near the player (claimed for the world:
       InteriorFactory.claimHome 'nikoliCampfire'). Until this player has met him, the scene of the meeting stands there: Nikoli just north of the
       fire facing up, and three snow leopards further north stalking down toward him (both start the meeting when the player comes near). Once met,
       the cats are gone and he stands there facing the player, until this player's story sends him on (act 2, once told where to look: then he is in
       the Hooded Stranger's old workshop, InteriorFactory.workshopResident). None of it is written into the world's changes: each player sees the
       scene where their own story has it, and refreshStoryObjects brings the loaded world up to date (SceneManager, on every return to the overworld). */
    _storyObjects() {
        const out = new Map();
        const w = gameState.world;
        if (!w.nikoliCampfire || w.isInterior) return out;
        const ms = Array.isArray(gameState.milestones) ? gameState.milestones : [];
        if (ms.includes('act2') && ms.includes('nikoli_told')) return out;
        const [c, r] = String(w.nikoliCampfire).split(',').map(Number);
        if (!Number.isFinite(c) || !Number.isFinite(r)) return out;
        const met = ms.includes('nikoli_met');
        out.set(`${c},${r - 1}`, met ? 'NIKOLI_NPC' : 'NIKOLI_NPC_WATCHING');
        // the cats on the village's north road (the hub's road cells, which hold no objects), the middle one a step further back
        if (!met) for (const [dc, dr] of [[-1, -4], [0, -5], [1, -4]]) out.set(`${c + dc},${r + dr}`, 'SNOW_LEOPARD_STALKING');
        return out;
    }
    _storyObjectAt(col, row) {
        return this._storyObjects().get(`${col},${row}`) || null;
    }
    _placeStory(col, row, id) {
        if (!this._storyPlaced) this._storyPlaced = new Map();
        this._storyPlaced.set(`${col},${row}`, id);
        this._placeObject(col, row, id);
    }
    /* takes an object off the loaded map (and its collision cells), without writing anything into the world's changes */
    _unplaceObject(col, row) {
        const key = this._s(col, row);
        const obj = this.objects.get(key);
        if (!obj) return;
        const boxes = obj.hitboxes && Array.isArray(obj.hitboxes) ? obj.hitboxes : (obj.hitbox ? [obj.hitbox] : []);
        for (const hb of boxes) for (let hr = 0; hr < hb.h; hr++) for (let hc = 0; hc < hb.w; hc++) {
            const k = this._s(col + hb.xOffset + hc, row + hb.yOffset + hr);
            if (this._collisionMap.get(k) === obj) this._collisionMap.delete(k);
        }
        this.objects.delete(key);
    }
    /* The story characters as this player's story has them now: what changed since they were put down (met, told, act 2) is swapped in place. */
    refreshStoryObjects() {
        if (gameState.world.isInterior) return;
        const want = this._storyObjects();
        const had = this._storyPlaced || new Map();
        for (const [key, id] of [...had]) {
            if (want.get(key) === id) continue;
            const [c, r] = key.split(',').map(Number);
            this._unplaceObject(c, r);
            had.delete(key);
        }
        for (const [key, id] of want) {
            if (had.get(key) === id) continue;
            const [c, r] = key.split(',').map(Number);
            this._placeStory(c, r, id);
        }
    }
    _campfirePlaced(col, row) {
        const w = gameState.world;
        if (w.isInterior) return;
        if (!w.nikoliCampfire) {
            const biome = this.getBiomeAt(col, row);
            if (!biome || biome.id !== 'SNOWY_MOUNTAINS') return;
            InteriorFactory.claimHome('nikoliCampfire', `${col},${row}`);
        }
        if (w.nikoliCampfire !== `${col},${row}`) return;
        for (const [key, id] of this._storyObjects()) {
            const [c, r] = key.split(',').map(Number);
            this._placeStory(c, r, id);
        }
    }
    // what a cell of a stair piece is: { st, t } with t = 'W' walkway, 'F' / 'G' / 'T' open ground, 'R' rock (see STAIR_MASK in terrainGenerator.js);
    // null for a cell that is in no stair piece
    _stairCell(col, row) {
        const st = this.terrain && this.terrain.getStairAt ? this.terrain.getStairAt(col, row) : null;
        if (!st) return null;
        const line = st.mask && st.mask[row - st.oy];
        const t = line ? line[col - st.ox] : (this._inWalk(st, col, row) ? 'W' : 'R');
        return { st, t };
    }
    _inWalk(st, col, row) {
        const w = st.walk;
        return !w || (col >= w[0] && col < w[0] + w[2] && row >= w[1] && row < w[1] + w[3]);
    }
    // the stair whose WALKWAY cell this is
    _stairAt(col, row) {
        const c = this._stairCell(col, row);
        return c && c.t === 'W' ? c.st : null;
    }
    // a cell of a stair piece that is solid rock: not walkable
    _stairWallAt(col, row) {
        const c = this._stairCell(col, row);
        return !!c && c.t === 'R';
    }
    // a cell of a village street on a cliff level: drawn as dirt (it cannot be a dirt tile there, a dirt tile is the low ground); see VillagePlanner._paveRoads
    isLevelPath(col, row) {
        const p = gameState.world.levelPaths;
        return !!p && p[this._s(col, row)] === 1;
    }
    _nearStair(col, row) {
        if (!this.terrain || !this.terrain.getStairAt) return false;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (this.terrain.getStairAt(col + dc, row + dr)) return true;
        return false;
    }
    _getRawProceduralId(col, row) {
        const forcedObjId = gameState.world.changes?.[this._s(col, row)];
        if (forcedObjId !== undefined) {
            if (forcedObjId === null) return null;
            if (!MAP_OBJECTS_DEFINITIONS[forcedObjId]) return null; // e.g. a removed object type still stored in an old save
            if (this.isBlockedByFace(col, row)) return null;
            return forcedObjId;
        }
        if (!this.GENERATE_MAP_OBJECTS) return null;
        if (this._isCaveMouth(col, row)) return 'CAVE_ENTRANCE';
        if (this._nearCaveMouth(col, row)) return null;
        if (this._nearStair(col, row)) return null;
        const myTileId = this.getTileAt(col, row);
        if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) return null;
        const tileMask = this.getSpecificMask(col, row, myTileId);
        if (tileMask !== 255) return null;
        const biome = this.getBiomeAt(col, row);
        const objRng = this.pseudoRandom(col + 100, row + 100);
        let spawnCategory = myTileId;
        if (isPlateau(myTileId)) {
            spawnCategory = '_WALLS';
        }
        /* altitude rules (a biome's `mapObjects._ALTITUDE`: { id, chance, minLevel, maxLevel }): objects that only lie on the higher plateau levels, such as the iron of
           the snowy mountains. Each rule rolls for itself and wins over the ordinary list. */
        const altRules = isPlateau(myTileId) && biome.mapObjects && biome.mapObjects._ALTITUDE;
        if (altRules) {
            const lvl = layerIndex(myTileId);
            for (let i = 0; i < altRules.length; i++) {
                const rule = altRules[i];
                if (lvl < (rule.minLevel ?? 0) || lvl > (rule.maxLevel ?? 99)) continue;
                if (this.pseudoRandom(col * 31 + i * 7 + 500, row * 37 + i * 11 + 500) >= rule.chance) continue;
                const adef = MAP_OBJECTS_DEFINITIONS[rule.id];
                if (!adef || !this.isFootprintValid(col, row, adef.w || adef.width || 1, adef.h || adef.height || 1)) continue;
                return rule.id;
            }
        }
        const spawnData = biome.getSpawnId(spawnCategory, objRng, false);
        if (!spawnData) return null;
        if (spawnData.id === 'CAVE_ENTRANCE') return null; // only _isCaveMouth places one, where a cliff face has room for it
        const def = MAP_OBJECTS_DEFINITIONS[spawnData.id] || {};
        const w = def.w || def.width || 1;
        const h = def.h || def.height || 1;
        // an object that stands UP from its anchor (a hitbox with a negative yOffset: the ruined carriage, 2 x 3) is checked where it really stands,
        // and the rows above its anchor (generated before it) must hold nothing standing (ground cover is fine)
        const up = Math.min(0, (def.hitbox && def.hitbox.yOffset) || 0);
        if (!this.isFootprintValid(col, row + up, w, h)) return null;
        if (up < 0 && !this._probingAbove) {
            this._probingAbove = true;
            try {
                for (let r = row + up; r < row; r++) for (let c = col; c < col + w; c++) {
                    const above = this._getRawProceduralId(c, r);
                    if (above && !(MAP_OBJECTS_DEFINITIONS[above] && MAP_OBJECTS_DEFINITIONS[above].isGround)) return null;   // (grass and flowers lie under it)
                }
            } finally { this._probingAbove = false; }
        }
        return spawnData.id;
    }
    /* Cave mouths: a CAVE_ENTRANCE (3 x 3 cells) is painted into a straight, south-facing cliff face. `col, row` is its anchor, the left cell of the ground row
       in front of the face: the face is the row above, the plateau edge the row above that, and the doorway is the middle cell (col + 1, row). The biome decides
       how often through a spawn rule at the end of its LAYER_2 list ({ chance: 0.5, id: 'CAVE_ENTRANCE' }: the share of fitting cliff faces that get a mouth).
       Only every 4th column can be an anchor, so two mouths never overlap. */
    _isCaveMouth(col, row) {
        if (gameState.world.isInterior || (col & 3) !== 0) return false;
        const key = this._s(col, row);
        this._mouthCache = this._mouthCache || new Map();
        if (this._mouthCache.has(key)) return this._mouthCache.get(key);
        const ok = this._caveMouthOk(col, row);
        this._mouthCache.set(key, ok);
        return ok;
    }
    _caveMouthOk(col, row) {
        const L2 = this.TILES.LAYER_2;
        const tile = this.getTileAt(col, row);
        const g = this.getElevation(col, row);
        if (g < 2 || (tile !== L2 && !isPlateau(tile))) return false; // the ground, or the top of a lower cliff level (not dirt, water or void)
        for (let dc = 0; dc < 3; dc++) {
            const c = col + dc;
            // rows from the plateau down: plateau, plateau edge (the face hangs under it), face, ground in front, one more row of ground
            if (this.getElevation(c, row - 1) !== g || this.getElevation(c, row - 2) !== g + 1 || this.getElevation(c, row - 3) !== g + 1 || this.getElevation(c, row + 1) !== g) return false;
            if (this.getTileAt(c, row) !== tile || this.getTileAt(c, row - 1) !== tile || this.getTileAt(c, row + 1) !== tile) return false;
        }
        const biome = this.getBiomeAt(col, row);
        const rule = (biome.mapObjects && biome.mapObjects[L2] || []).find((r) => r.id === 'CAVE_ENTRANCE');
        if (!rule || this.pseudoRandom(col * 3 + 7, row * 5 + 11) >= rule.chance) return false; // the biome's `chance` is the share of fitting cliff faces that get a mouth
        for (let dc = 0; dc < 3; dc++) {
            const c = col + dc;
            if (this.getBiomeAt(c, row).id !== biome.id) return false;
            if (!this.isBlockedByFace(c, row - 1) || !this.isCliffFace(c, row - 2) || this.isBlockedByFace(c, row) || this.isCliffFace(c, row)) return false;
            if (this.isBiomeEdge(c, row) || this.isBiomeEdge(c, row + 1)) return false;
            for (let r = row - 3; r <= row + 1; r++) {
                if (this._nearStair(c, r)) return false;
                if (gameState.world.changes && gameState.world.changes[this._s(c, r)] !== undefined) return false;
            }
        }
        return true;
    }
    /* a cell where another object would stand in front of a cave mouth or hide it: next to the mouth, or on the three rows in front of it */
    _nearCaveMouth(col, row) {
        for (let dr = 0; dr <= 2; dr++)
            for (let a = (col - 2) & ~3; a <= col + 2; a += 4)
                if (a >= col - 2 && this._isCaveMouth(a, row - dr)) return true;
        return false;
    }
    createObjectInstance(col, row, id) {
        const biome = this.getBiomeAt(col, row);
        return mapObjectFactory.create(id, col, row, biome);
    }
    /* Containers you search (crate, wardrobe, sacks) stay where they are; the search is remembered in gameState.world.changes (so it is saved)
       under "searched:<cell key>", the cell key being the same one the object's own changes use (interiors included). */
    isSearched(col, row) {
        return gameState.world.changes?.['searched:' + this._s(col, row)] === true;
    }
    markSearched(col, row) {
        if (!gameState.world.changes) gameState.world.changes = {};
        gameState.world.changes['searched:' + this._s(col, row)] = true;
        reportChange('searched:' + this._s(col, row), true);
    }
    /* Respawning: a tree you cut, a herb you picked... is remembered in gameState.world.changes like any other change, and `scheduleRespawn` writes beside it
       "respawn:<the same key>" = the in-game day it comes back (the day counter is saved with the world, so this is saved too). `expireRespawns` forgets every
       change whose day has come, so the world generates that cell as it first did, and unloads the chunks that held them so the change shows up at once.
       Only the open world respawns (the keys of a house or cave start with INT_). */
    scheduleRespawn(col, row, days, prefix = '') {
        if (gameState.world.isInterior || !(days > 0)) return;
        if (!gameState.world.changes) gameState.world.changes = {};
        const cellKey = prefix + this._s(col, row);
        gameState.world.changes['respawn:' + cellKey] = (gameState.world.day || 1) + days;
        reportChange('respawn:' + cellKey, gameState.world.changes['respawn:' + cellKey]);
    }

    /**
     * A change another player made (worldSync): written into gameState.world.changes (value undefined = the change is gone), and the chunk
     * that holds the cell is dropped so it is built again with the change in it, if that chunk is part of the map this player is on.
     */
    applyRemoteChange(key, value) {
        if (typeof key !== 'string' || !key) return;
        if (!gameState.world.changes) gameState.world.changes = {};
        if (value === undefined || value === '__deleted__') delete gameState.world.changes[key];
        else gameState.world.changes[key] = value;
        const cell = key.replace(/^(searched|respawn):/, '');
        const m = /^(?:INT_(.+)_)?(-?\d+),(-?\d+)$/.exec(cell);
        if (!m) return;
        const interiorId = m[1] || null;
        const here = gameState.world.isInterior ? String(gameState.world.interiorId || '') : null;
        if ((interiorId === null && here === null) || (interiorId !== null && here === interiorId)) {
            this._unloadChunk(Math.floor(+m[2] / this.CHUNK_SIZE) + ',' + Math.floor(+m[3] / this.CHUNK_SIZE));
        }
    }
    expireRespawns() {
        if (gameState.world.isInterior) return 0;
        const changes = gameState.world.changes;
        if (!changes) return 0;
        const today = gameState.world.day || 1;
        let expired = 0;
        const reload = new Set();
        for (const key of Object.keys(changes)) {
            if (!key.startsWith('respawn:')) continue;
            if (changes[key] > today) continue;
            const cellKey = key.slice('respawn:'.length);
            delete changes[key];
            delete changes[cellKey];
            expired++;
            const m = /(-?\d+),(-?\d+)$/.exec(cellKey);
            if (m && !cellKey.startsWith('INT_')) reload.add(Math.floor(+m[1] / this.CHUNK_SIZE) + ',' + Math.floor(+m[2] / this.CHUNK_SIZE));
        }
        for (const chunkKey of reload) this._unloadChunk(chunkKey);
        return expired;
    }
    /** A change that is not an object on a cell (what a grave holds, see world/graves.js): kept in the world's changes and sent to the other players.
     *  undefined removes it. */
    setChange(key, value) {
        if (!gameState.world.changes) gameState.world.changes = {};
        if (value === undefined) delete gameState.world.changes[key]; else gameState.world.changes[key] = value;
        reportChange(key, value === undefined ? '__deleted__' : value);
    }

    modifyWorld(col, row, newValue, explicitMapId = null) {
        const key = this._s(col, row, explicitMapId);
        gameState.world.changes[key] = newValue;
        reportChange(key, newValue === undefined ? '__deleted__' : newValue);
        if (this.objects.has(key)) {
            const oldObj = this.objects.get(key);
            let activeHitboxes = [];
            if (oldObj.hitboxes && Array.isArray(oldObj.hitboxes)) {
                activeHitboxes = oldObj.hitboxes;
            } else if (oldObj.hitbox) {
                activeHitboxes = [oldObj.hitbox];
            }
            for (const hb of activeHitboxes) {
                for (let hr = 0; hr < hb.h; hr++) {
                    for (let hc = 0; hc < hb.w; hc++) {
                        const targetKey = this._s(col + hb.xOffset + hc, row + hb.yOffset + hr, explicitMapId);
                        this._collisionMap.delete(targetKey);
                    }
                }
            }
            this.objects.delete(key);
        }
    }
    getObjectAt(col, row) {
        this.ensureChunkLoaded(col, row);
        this.ensureChunkLoaded(col - 2, row); // an object anchored in the chunk to the left (a cave mouth's doorway is one cell right of its anchor)
        return this._collisionMap.get(this._s(col, row)) || null;
    }
    getSolidObjectAt(col, row) {
        const obj = this.getObjectAt(col, row);
        return obj && obj.isSolid !== false ? obj : null;
    }
    canMove(fromCol, fromRow, toCol, toRow, direction) {
        const fromElev = this.getElevation(fromCol, fromRow);
        const toElev = this.getElevation(toCol, toRow);
        if (toElev === -999) return false;
        // terrain stairs / ramps (terrain.getStairAt): a move along the stair's axis that starts or ends on one of its cells is allowed
        const fromCell = this._stairCell(fromCol, fromRow);
        const toCell = this._stairCell(toCol, toRow);
        const fromStair = fromCell && fromCell.t === 'W' ? fromCell.st : null;
        const toStair = toCell && toCell.t === 'W' ? toCell.st : null;
        if (toCell && toCell.t === 'R') return false;
        if (fromCell && toCell && fromCell.st === toCell.st) {
            const a = fromCell.t, b = toCell.t;
            // inside one stair: the walkway connects to its neighbours (side to side too), to the open ground F beside it and to the low ground G of the
            // notch; G and T are cut off from each other, and T (the plateau strip under the notch) from the walkway
            if (a === 'W' || b === 'W') return a === 'T' || b === 'T' ? false : !this.getSolidObjectAt(toCol, toRow);
            if ((a === 'G') !== (b === 'G')) {
                // the one exception: the plateau cell at the head of the side-view stair (the top corner of the piece, drawn as the first pillar) leads straight down into
                // the upper notch row below it, and back up
                const tCell = a === 'T' ? fromCell : toCell, tc = a === 'T' ? fromCol : toCol, tr = a === 'T' ? fromRow : toRow;
                return (a === 'T' || b === 'T') && fromCol === toCol && tr === tCell.st.oy && tc === tCell.st.ox + tCell.st.mask[0].indexOf('T') && !this.getSolidObjectAt(toCol, toRow);
            }
        }
        // the G cell in the head column of a side-view stair (the column drawn as the first pillar, the one next to the plateau) is level with the plateau
        // beside it: it is entered from, and left to, that plateau cell in the same row (the stair's other G cells stay cut off from the plateau)
        if (toCell && toCell.t === 'G' && !fromCell && fromRow === toRow && fromElev === toElev && toCol === toCell.st.ox + toCell.st.mask[0].indexOf('T') && Math.abs(fromCol - toCol) === 1 && fromCol !== toCol + (toCell.st.mask[0].indexOf('T') === 0 ? 1 : -1))
            return !this.isBlockedByFace(fromCol, fromRow) && !this.isCliffFace(fromCol, fromRow) && !this.getSolidObjectAt(toCol, toRow);
        if (fromCell && fromCell.t === 'G' && !toCell && fromRow === toRow && fromElev === toElev && fromCol === fromCell.st.ox + fromCell.st.mask[0].indexOf('T') && Math.abs(fromCol - toCol) === 1 && toCol !== fromCol + (fromCell.st.mask[0].indexOf('T') === 0 ? 1 : -1))
            return !this.isBlockedByFace(toCol, toRow) && !this.isCliffFace(toCol, toRow) && !this.getSolidObjectAt(toCol, toRow);
        // low ground G inside a notch: entered from, and left to, the lower ground in front of the notch only (never the plateau)
        if (toCell && toCell.t === 'G' && !(fromCell && fromCell.st === toCell.st)) return fromElev > 0 && fromElev < toElev && !fromCell && !this.getSolidObjectAt(toCol, toRow);
        if (fromCell && fromCell.t === 'G' && !(toCell && toCell.st === fromCell.st)) return !toCell && toElev > 0 && toElev < fromElev && !this.getSolidObjectAt(toCol, toRow);
        // the stair is walled in on both sides: from outside, or off the stair, only its own axis can be used
        if ((toStair && !toStair.dirs.includes(direction)) || (fromStair && !fromStair.dirs.includes(direction))) return false;
        if ((fromStair && fromStair.dirs.includes(direction)) || (toStair && toStair.dirs.includes(direction))) {
            return !this.getSolidObjectAt(toCol, toRow);
        }
        const depthL1 = CONFIG.TILE_DEPTH[this.TILES.LAYER_1] || 1;
        const depthL2 = CONFIG.TILE_DEPTH[this.TILES.LAYER_2] || 2;
        const isDirtToGrass = (fromElev === depthL1 && toElev === depthL2) || (fromElev === depthL2 && toElev === depthL1);
        if (fromElev !== toElev && !isDirtToGrass) return false;
        if (this.isBlockedByFace(toCol, toRow)) return false;
        // the lip of a south-facing cliff (the last row of a plateau, whose rock face is drawn in it) is not ground to stand on
        if (this.isCliffFace(toCol, toRow)) return false;
        if (this.getSolidObjectAt(toCol, toRow)) return false;
        return true;
    }
    findSpawnPoint() {
        if (gameState.world.isInterior) {
            if (this.terrain.getEntrySpawnPoint) {
                return this.terrain.getEntrySpawnPoint();
            }
            for (let r = 2; r < 20; r++) {
                for (let c = 2; c < 20; c++) {
                    if (this.isTileFree(c, r)) return { col: c, row: r };
                }
            }
            return { col: 4, row: 4 };
        }
        // every game starts in the plains, well inside them: the nearest such spot to the middle of the world, then the nearest free flat tile to it
        const centre = this._plainsHeart();
        let radius = 0;
        while (radius < 500) {
            for (let r = -radius; r <= radius; r++) {
                for (let c = -radius; c <= radius; c++) {
                    if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;
                    const col = centre.col + c, row = centre.row + r;
                    if (this.isTileFree(col, row) && this.getElevation(col, row) === 1) {
                        return { col, row };
                    }
                }
            }
            radius++;
        }
        return { col: centre.col, row: centre.row };
    }

    /* The spot nearest the middle of the world (0, 0) that is plains and still plains 90 tiles away in every direction: the
       middle of a stretch of plains, so a new game never opens on the edge of the desert or the snow. Searched in rings 16 tiles apart. */
    _plainsHeart() {
        const DEPTH = 90, STEP = 16, MAX = 4000;
        const plains = (c, r) => { const b = this.terrain.getBiomeAt(c, r); return !!b && b.id === 'PLAINS'; };
        const deep = (c, r) => {
            if (!plains(c, r)) return false;
            for (const dist of [DEPTH / 2, DEPTH]) {
                for (let a = 0; a < 16; a++) {
                    const ang = a * Math.PI / 8;
                    if (!plains(c + Math.round(Math.cos(ang) * dist), r + Math.round(Math.sin(ang) * dist))) return false;
                }
            }
            return true;
        };
        for (let ring = 0; ring <= MAX; ring += STEP) {
            for (let r = -ring; r <= ring; r += STEP) {
                for (let c = -ring; c <= ring; c += STEP) {
                    if (Math.abs(r) !== ring && Math.abs(c) !== ring) continue;
                    if (deep(c, r)) return { col: c, row: r };
                }
            }
        }
        return { col: 0, row: 0 };
    }
    isTileFree(col, row) {
        const tileId = this.getTileAt(col, row);
        if (tileId === this.TILES.LAYER_0) return false;
        if (isPlateau(tileId)) return false;
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
                if (this._nearStair(c, r)) return false;
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
        const endCol = startCol + Math.ceil(canvasWidth / scale / TILE_SIZE) + LIGHT_PAD * 2;
        const startRow = Math.floor(camera.y / TILE_SIZE) - LIGHT_PAD;
        const endRow = startRow + Math.ceil(canvasHeight / scale / TILE_SIZE) + LIGHT_PAD * 2;
        const lightObjects = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const obj = this.getObject(c, r);
                if (obj && ((obj.light && obj.light.hasLight) || obj.lights)) lightObjects.push(obj);   // `lights`: a lit window, a chimney (the workshop)
            }
        }
        return lightObjects;
    }
    getElevation(col, row) {
        const id = this.getTileAt(col, row);
        if (id === this.TILES.LAYER_0) return -999;
        return CONFIG.TILE_DEPTH[id] || 0;
    }
    /* How many tiles below a cliff-level tile its rock face hangs (the generated cliff tilesets draw a 1-tile face). */
    getWallFaceDepth(tileId) {
        return isPlateau(tileId) ? 1 : 0;
    }
    isBlockedByFace(col, row) {
        if (this.terrain && this.terrain.isDoorway && this.terrain.isDoorway(col, row)) return false; // the doorway of a cave mouth in an interior's rim
        const myElev = this.getElevation(col, row);
        const check = (rOffset, depthReq) => {
            const nTile = this.getTileAt(col, row - rOffset);
            return this.getElevation(col, row - rOffset) > myElev && this.getWallFaceDepth(nTile) >= depthReq;
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
            return (CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < myD || this.getBiomeAt(c, r).id !== myBiomeId;
        };
        return check(col, row - 1) || check(col + 1, row) || check(col, row + 1) || check(col - 1, row);
    }
    pseudoRandom(col, row) {
        const dot = col * 12.9898 + row * 78.233 + this.seed;
        const sin = Math.sin(dot) * 43758.5453;
        return sin - Math.floor(sin);
    }
}


/* The village planner and the structure spawner are methods of the WorldManager that live in files of their own (see their headers). */
for (const part of [VillagePlanner, StructureSpawner]) {
    for (const name of Object.getOwnPropertyNames(part.prototype)) {
        if (name !== 'constructor') Object.defineProperty(WorldManager.prototype, name, Object.getOwnPropertyDescriptor(part.prototype, name));
    }
}

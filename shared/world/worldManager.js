import { CONFIG, BITMASK } from '../core/constants.js';
import { movedNorth, heroesOutcome, has as storyHas } from '../story/heroes.js';
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { isPlateau, layerIndex } from './biomeDefinitions.js';
import { gameState } from '../core/gameState.js';
import { mapObjectFactory } from './mapObjectsFactory.js';
import { WeatherFactory } from './weatherFactory.js';
import { TerrainGenerator } from './terrainGenerator.js';
import { biomeFactory } from './biomeFactory.js';
/* --- NEW: Import the Factory instead of the old Generator --- */
import { InteriorFactory } from './interiorFactory.js';
import { VillagePlanner } from './villagePlanner.js';
import { StructureSpawner } from './structureSpawner.js';
/* Multiplayer: every change a player makes to the map (an object taken away or put down, a container searched, a regrowth scheduled) is
   reported through worldSync.onLocalChange(key, value) so it can be sent to the others; a change that arrives from another player is put in
   with WorldManager.applyRemoteChange, which is not reported again. Null when nobody is listening (single player). Generated structures
   are not reported: every player's browser builds the same villages from the same seed. */
export { worldSync } from '../core/worldSync.js';   // (it lives in core so the story can use it: shared/story/worldStory.js)
import { worldSync } from '../core/worldSync.js';
import { ActSystem } from '../story/actSystem.js';
import { CASTLE_SITES } from './castleSites.js';
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
/* How near the player must come to a snowy-mountain campfire for it to become Nikoli's camp: just beyond the edge of the screen (60 x 34 tiles
   of 32 px on the 1920 x 1080 canvas: 30 to either side, 17 above and below), so the scene is in place, Nikoli at his fire and the cats
   5 tiles north of it, a little before it scrolls into view, and he never pops in where the player can see. */
export const NIKOLI_CAMP_SIGHT = { cols: 30 + 6, rows: 17 + 6 + 5 };

/* The Amputators (story/encounters/story/amputators.js): Senior Surgeon Osric on his seat among the graves (world.amputatorGraveyard), once claimed, for
   good; Surgeon Garrick where Osric sent you (world.amputatorQuarry), until he has been put to rest. */
function amputatorObjects(out) {
    const w = gameState.world;
    const cell = (s) => { const [c, r] = String(s || '').split(',').map(Number); return Number.isFinite(c) && Number.isFinite(r) ? `${c},${r}` : null; };
    const seat = cell(w.amputatorGraveyard);
    if (seat) out.set(seat, 'OSRIC_NPC');
    const quarry = cell(w.amputatorQuarry);
    if (quarry && !storyHas('garrick_slain')) out.set(quarry, 'GARRICK_NPC');
}

/* An Arc Knight (story/encounters/story/arcKnight.js): once shackled3 is handed in (world flag arc_knight_roused; an older save: the quest done),
   he stands on the footpath before the Hooded Stranger's workshop door, facing it, until he is put down (arc_knight_slain): the player meets him on
   walking out (his trigger fires on arrival, overworldController). The yard's three free rows lie below the door (structures.js): the cell in front
   of it is where the player comes out, the next is the footpath. */
function arcKnightRoused() {
    if (storyHas('arc_knight_slain')) return false;
    const done = gameState.quests && Array.isArray(gameState.quests.completed) && gameState.quests.completed.includes('shackled3');
    return !!(gameState.world.strangerHome && (storyHas('arc_knight_roused') || done));
}
function arcKnightObjects(out) {
    if (!arcKnightRoused()) return;
    const [dc, dr] = String(gameState.world.strangerHome).split(/[_,]/).map(Number);
    if (Number.isFinite(dc) && Number.isFinite(dr)) out.set(`${dc},${dr + 2}`, 'ARC_KNIGHT_NPC');
}

/* Wanderers: map objects whose definition has `wander` (the madmen, the act 2 Arc Knights on patrol) walk about their home cell, never leaving its
   chunk (the chunk is made and unmade with them). Every player sees them in the same place: each walks a round of its own, worked out from the
   world's seed and its home (a few waypoints near home, the paths between them, pauses on the way), and where it is on that round is the clock's
   (Date.now, a step every stepMs). wander: { radius, stepMs: [min, max] (the mean is its step), pauseChance (a pause at a step of the way),
   pauseMs: [min, max], straight: 0..1, how far its waypoints lie (a patrol walks long stretches), waypoints }. */
const WANDER_DIRS = { DOWN: [0, 1], RIGHT: [1, 0], UP: [0, -1], LEFT: [-1, 0] };
/* a seeded 0..1 generator (mulberry32) from a few integers: the same numbers on every player's screen */
function seededRng(...ints) {
    let h = 2166136261 >>> 0;
    for (const n of ints) { h ^= (n | 0); h = Math.imul(h, 16777619) >>> 0; }
    return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

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
        // inside a ruined castle (castleSites.js) the cells are the castle's own biome: drawn with its tile set, growing nothing of the plains'
        const castles = this.terrain.castles;
        if (castles && castles.isCastleCell(col, row)) return biomeFactory.getBiome('CASTLE_GROUNDS');
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
            if (this._wanderedFrom) this._wanderedFrom.delete(key);
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
        if (!this.objects.has(key) && !(this._wanderedFrom && this._wanderedFrom.has(key))) {
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
        if (newObj.wander) { newObj._home = [col, row]; (this._wanderers ||= new Set()).add(newObj); }   // (a step to another cell keeps the first home: _moveWanderer)
        if (id === 'CAMPFIRE') this._campfirePlaced(col, row);
        else if (id === 'TOMBSTONE' || id === 'OLD_GRAVESTONE') this._gravestonePlaced(col, row);
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
        if (w.isInterior) return out;
        amputatorObjects(out);
        arcKnightObjects(out);
        if (!w.nikoliCampfire) return out;
        // the story's flags belong to the world (story/worldStory.js): everyone in it sees the same scene
        const ms = { includes: (id) => storyHas(id) };
        if (ms.includes('act2') && ms.includes('nikoli_told')) return out;
        const [c, r] = String(w.nikoliCampfire).split(',').map(Number);
        if (!Number.isFinite(c) || !Number.isFinite(r)) return out;
        // act 3, neither brother told ("ashes", story/heroes.js): his camp is cold, and his greatsword stands planted in the snow where he stood
        if (movedNorth() && heroesOutcome() === 'ashes') {
            if (!ms.includes('brothers_sword_taken')) out.set(`${c},${r - 1}`, 'BROTHERS_SWORD');
            return out;
        }
        const met = ms.includes('nikoli_met');
        out.set(`${c},${r - 1}`, met ? 'NIKOLI_NPC' : 'NIKOLI_NPC_WATCHING');
        // the cats on the village's north road (the hub's road cells, which hold no objects), the middle one a step further back
        if (!met) for (const [dc, dr] of [[-1, -4], [0, -5], [1, -4]]) out.set(`${c + dc},${r + dr}`, 'SNOW_LEOPARD_STALKING');
        return out;
    }
    /* A gravestone was put down. In act 1, before Osric has a seat, each one outside a castle is a candidate graveyard; noticeAmputatorGraveyard claims
       the first the player comes near (as with Nikoli's campfire: the world makes the land well beyond the screen). */
    _gravestonePlaced(col, row) {
        const w = gameState.world;
        if (w.isInterior || w.amputatorGraveyard || ActSystem.getAct() !== 1) return;
        if (this.terrain && this.terrain.castles && this.terrain.castles.isCastleCell(col, row)) return;
        (this._graveCandidates ||= new Set()).add(`${col},${row}`);
    }
    /** Called as each step ends, in act 1: the nearest graveyard within NIKOLI_CAMP_SIGHT of the player (just beyond the screen) becomes Osric of the
     *  Saw's, if he has none yet: he sits on a free cell beside its stones. */
    noticeAmputatorGraveyard(col, row) {
        const w = gameState.world;
        if (w.amputatorGraveyard || w.isInterior || !this._graveCandidates || !this._graveCandidates.size || ActSystem.getAct() !== 1) return false;
        // a graveyard is 3 to 5 stones in one 7 x 7 plot (structures.js GRAVEYARD); the lone stones on a village's verge (9 or more steps apart) are not one
        const all = [...this._graveCandidates].map(k => k.split(',').map(Number));
        const inPlot = (c, r) => all.filter(([c2, r2]) => Math.abs(c2 - c) <= 6 && Math.abs(r2 - r) <= 6).length;
        let best = null, bestD = Infinity;
        for (const [c, r] of all) {
            const dc = Math.abs(c - col), dr = Math.abs(r - row);
            if (dc > NIKOLI_CAMP_SIGHT.cols || dr > NIKOLI_CAMP_SIGHT.rows) continue;
            const d = dc * dc + dr * dr;
            if (d < bestD && inPlot(c, r) >= 3) { best = [c, r]; bestD = d; }
        }
        if (!best) return false;
        // the graveyard: the stones within its 7 x 7 box of the nearest; Osric sits on the free cell nearest their middle that can be walked up to
        const stones = all.filter(([c, r]) => Math.abs(c - best[0]) <= 6 && Math.abs(r - best[1]) <= 6);
        const mc = Math.round(stones.reduce((s, p) => s + p[0], 0) / stones.length), mr = Math.round(stones.reduce((s, p) => s + p[1], 0) / stones.length);
        const seat = this._freeNear(mc, mr, 5);
        if (!seat) { for (const [c, r] of stones) this._graveCandidates.delete(`${c},${r}`); return false; }
        InteriorFactory.claimHome('amputatorGraveyard', `${seat[0]},${seat[1]}`);
        this._graveCandidates.clear();
        this.refreshStoryObjects();
        return true;
    }
    /** Called every frame on the map: the wanderers near the player go to where the clock has them on their round (see `wander` above).
     *  `now`: the clock (ms), the same on every player's screen. Returns how many moved. */
    tickWanderers(now = Date.now()) {
        if (gameState.world.isInterior || !this._wanderers || !this._wanderers.size) return 0;
        const p = gameState.player || {};
        let moved = 0;
        for (const obj of [...this._wanderers]) {
            if (this.objects.get(this._s(obj.col, obj.row)) !== obj) { this._wanderers.delete(obj); continue; }   // gone (its chunk unmade, or taken away)
            if (!obj.wander || obj.isFading || Math.abs(obj.col - (p.col || 0)) > 24 || Math.abs(obj.row - (p.row || 0)) > 24) continue;
            const round = this._wanderRound(obj);
            if (!round) continue;
            const i = ((Math.floor(now / round.stepMs) + round.phase) % round.cells.length + round.cells.length) % round.cells.length;
            const [tc, tr] = round.cells[i];
            if (tc === obj.col && tr === obj.row) { obj._facing = round.facing[i]; continue; }   // a pause
            const there = this.objects.get(this._s(tc, tr));
            if (there && there !== obj && !(there.isGround && !there.isSolid)) continue;   // another wanderer in the way: it waits
            if (tc === p.col && tr === p.row) continue;   // not onto the player
            if (this._moveWanderer(obj, tc, tr, round.facing[i], round.stepMs)) moved++;
        }
        return moved;
    }
    /** A wanderer's round: { cells: [[col, row], ...], facing: [...], stepMs, phase }, the same for everyone (the world's seed, its home, the land);
     *  worked out once per home. Other wanderers do not count as in the way (where they stand right now is not the land's). */
    _wanderRound(obj) {
        const w = obj.wander, home = obj._home || [obj.col, obj.row];
        const key = `${obj.id}@${home[0]},${home[1]}`;
        if (!this._wanderRounds) this._wanderRounds = new Map();
        if (this._wanderRounds.has(key)) return this._wanderRounds.get(key);
        const rng = seededRng(gameState.seed || 0, home[0], home[1]);
        const C = this.CHUNK_SIZE, R = w.radius || 3;
        const k = (c, r) => `${c},${r}`;
        // the wanderers' own collision is set aside while the land is read
        const stash = [];
        for (const o of this._wanderers || []) { const ck = this._s(o.col, o.row); if (this._collisionMap.get(ck) === o) { stash.push([ck, o]); this._collisionMap.delete(ck); } }
        const free = (c, r) => { const o = this.objects.get(this._s(c, r)); return (!o || o.wander || (o.isGround && !o.isSolid)) && !this._storyObjectAt(c, r); };
        const reach = new Map([[k(...home), null]]), order = [home];
        try {
            for (let q = 0; q < order.length; q++) {
                const [c, r] = order[q];
                for (const [dir, [ox, oy]] of Object.entries(WANDER_DIRS)) {
                    const nc = c + ox, nr = r + oy, nk = k(nc, nr);
                    if (reach.has(nk) || Math.max(Math.abs(nc - home[0]), Math.abs(nr - home[1])) > R) continue;
                    if (Math.floor(nc / C) !== Math.floor(home[0] / C) || Math.floor(nr / C) !== Math.floor(home[1] / C)) continue;
                    if (!free(nc, nr) || !this.canMove(c, r, nc, nr, dir)) continue;
                    reach.set(nk, k(c, r)); order.push([nc, nr]);
                }
            }
        } finally {
            for (const [ck, o] of stash) this._collisionMap.set(ck, o);
        }
        const stepMs = ((w.stepMs || [1200, 2400])[0] + (w.stepMs || [1200, 2400])[1]) / 2;
        if (order.length < 2) { const round = { cells: [home], facing: [obj.character ? obj.character.facing : 'DOWN'], stepMs, phase: 0 }; this._wanderRounds.set(key, round); return round; }
        // the shortest way from a to b among the cells it can reach
        const pathBetween = (a, b) => {
            const prev = new Map([[k(...a), null]]), qq = [a];
            for (let q = 0; q < qq.length; q++) {
                const [c, r] = qq[q];
                if (c === b[0] && r === b[1]) break;
                for (const [ox, oy] of Object.values(WANDER_DIRS)) {
                    const nk = k(c + ox, r + oy);
                    if (!reach.has(nk) || prev.has(nk)) continue;
                    prev.set(nk, k(c, r)); qq.push([c + ox, r + oy]);
                }
            }
            const out = [];
            for (let at = k(...b); at && at !== k(...a); at = prev.get(at)) out.unshift(at.split(',').map(Number));
            return out;
        };
        // its waypoints: far ones for a patrol (straight), near or far for the rest
        const others = order.slice(1);
        const dist = (c) => Math.abs(c[0] - home[0]) + Math.abs(c[1] - home[1]);
        if (w.straight) others.sort((a, b) => dist(b) - dist(a));
        const pool = w.straight ? others.slice(0, Math.max(2, Math.ceil(others.length * (1 - w.straight)))) : others;
        const wps = [];
        for (let n = 0; n < (w.waypoints || 4); n++) wps.push(pool[Math.floor(rng() * pool.length)]);
        const pauseSteps = () => Math.max(1, Math.round(((w.pauseMs || [1500, 4000])[0] + rng() * ((w.pauseMs || [1500, 4000])[1] - (w.pauseMs || [1500, 4000])[0])) / stepMs));
        const cells = [home], facing = [obj.character ? obj.character.facing : 'DOWN'];
        const dirOf = (a, b) => Object.entries(WANDER_DIRS).find(([, [ox, oy]]) => b[0] - a[0] === ox && b[1] - a[1] === oy)?.[0] || facing[facing.length - 1];
        // a stop: it stands a moment and looks about, turning once or twice before it goes on
        const DIRS = Object.keys(WANDER_DIRS);
        const stop = (c) => {
            let f = facing[facing.length - 1];
            const n = pauseSteps() + 1;
            for (let t = 0; t < n; t++) {
                if (t > 0 && rng() < 0.5) { const turn = DIRS.filter(d => d !== f); f = turn[Math.floor(rng() * turn.length)]; }
                cells.push(c); facing.push(f);
            }
        };
        let at = home;
        for (const wp of [...wps, home]) {
            for (const c of pathBetween(at, wp)) {
                facing.push(dirOf(cells[cells.length - 1], c)); cells.push(c);
                if (rng() < (w.pauseChance || 0) * 0.5) stop(c);   // stops on the way
            }
            at = wp;
            stop(at);   // and at each waypoint
        }
        const round = { cells, facing, stepMs, phase: Math.floor(rng() * cells.length) };
        this._wanderRounds.set(key, round);
        return round;
    }
    /* a wanderer to (nc, nr): the object moves (its collision with it, nothing written into the world), facing `dir`, gliding from where it was
       when the step is to a cell beside it (a round met part way, after its chunk was made, is a jump) */
    _moveWanderer(obj, nc, nr, dir, stepMs) {
        const from = [obj.col, obj.row];
        const fromKey = this._s(obj.col, obj.row), toKey = this._s(nc, nr);
        const under = this.objects.get(toKey);   // grass or flowers it steps onto: kept, and put back when it moves on
        this._unplaceObject(obj.col, obj.row);
        if (obj._under) this.objects.set(fromKey, obj._under);   // what it stood on, back
        if (under) this.objects.delete(toKey);
        this._placeObject(nc, nr, obj.id);
        const moved = this.objects.get(toKey);
        if (!moved) { if (under) this.objects.set(toKey, under); return null; }
        moved._under = under || null;
        moved._home = obj._home || from;
        moved._facing = dir;
        if (Math.abs(nc - from[0]) + Math.abs(nr - from[1]) === 1) {
            moved._glide = { fromCol: from[0], fromRow: from[1], start: (typeof performance !== 'undefined' ? performance.now() : Date.now()), dur: Math.min(700, stepMs * 0.7) };
        }
        // its home cell, if the world remembers an object there (a village's madman, world.changes), is not made again while it is away
        const homeKey = this._s(moved._home[0], moved._home[1]);
        if (!this._wanderedFrom) this._wanderedFrom = new Set();
        if (nc === moved._home[0] && nr === moved._home[1]) this._wanderedFrom.delete(homeKey);
        else this._wanderedFrom.add(homeKey);
        return moved;
    }
    /* a cell near (col, row), within `radius`, with nothing on it that can be stepped onto from beside it (nearest first), or null */
    _freeNear(col, row, radius) {
        for (let rad = 0; rad <= radius; rad++) {
            for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
                if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
                const c = col + dc, r = row + dr;
                if (this._standable(c, r)) return [c, r];
            }
        }
        return null;
    }
    _standable(c, r) {
        if (this.getObjectAt(c, r) || this._storyObjectAt(c, r)) return false;
        if (this.terrain && this.terrain.castles && this.terrain.castles.levelAt(c, r) >= 0) return false;
        const D = [[0, 1, 'UP'], [0, -1, 'DOWN'], [1, 0, 'LEFT'], [-1, 0, 'RIGHT']];
        return D.some(([dc, dr, dir]) => this.canMove(c + dc, r + dr, c, r, dir));
    }
    /** Where Surgeon Garrick is (world.amputatorQuarry, the world's, picked once when Osric's quest starts): a free cell out of sight of Osric's graveyard
     *  (18 to 30 cells from it) that can be walked to from where the player stands, picked from the world's seed. [col, row], or null. */
    pickAmputatorQuarry() {
        const w = gameState.world;
        const parse = (s) => { const [c, r] = String(s || '').split(',').map(Number); return Number.isFinite(c) && Number.isFinite(r) ? [c, r] : null; };
        const have = parse(w.amputatorQuarry);
        if (have) return have;
        const seat = parse(w.amputatorGraveyard) || [gameState.player.col, gameState.player.row];
        const start = [gameState.player.col, gameState.player.row];
        const seen = new Map([[`${start[0]},${start[1]}`, 0]]), q = [start], cands = [];
        const D = [[0, -1, 'UP'], [0, 1, 'DOWN'], [-1, 0, 'LEFT'], [1, 0, 'RIGHT']];
        for (let i = 0; i < q.length && i < 20000; i++) {
            const [c, r] = q[i], d = seen.get(`${c},${r}`);
            const fromSeat = Math.hypot(c - seat[0], r - seat[1]);
            if (fromSeat >= 18 && fromSeat <= 30 && !this.getObjectAt(c, r) && !this._storyObjectAt(c, r)) cands.push([c, r]);
            if (d >= 70) continue;
            for (const [dc, dr, dir] of D) {
                const nc = c + dc, nr = r + dr, k = `${nc},${nr}`;
                if (seen.has(k) || Math.hypot(nc - seat[0], nr - seat[1]) > 32) continue;
                if (this.terrain && this.terrain.castles && this.terrain.castles.levelAt(nc, nr) >= 0) continue;
                if (!this.canMove(c, r, nc, nr, dir)) continue;
                seen.set(k, d + 1); q.push([nc, nr]);
            }
        }
        // open ground around him (all four neighbours walkable), so the party can come at him from any side
        const open = cands.filter(([c, r]) => D.every(([dc, dr]) => !this.getObjectAt(c + dc, r + dr) && seen.has(`${c + dc},${r + dr}`)));
        const pool = open.length ? open : cands;
        if (!pool.length) return null;
        const pick = pool[Math.floor(this.pseudoRandom(seat[0] * 7 + 911, seat[1] * 13 + 377) * pool.length) % pool.length];
        InteriorFactory.claimHome('amputatorQuarry', `${pick[0]},${pick[1]}`);
        return parse(w.amputatorQuarry) || pick;
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
    /* A campfire was put down. Nikoli's camp is the first snowy-mountain campfire the PLAYER comes upon, not the first the world happens to make:
       the world makes the land well beyond the screen, so the first one made was often one the player never saw. So a snowy campfire is only a
       candidate here; noticeNikoliCampfire() claims the first the player walks within NIKOLI_CAMP_SIGHT of. Once claimed, the meeting's scene
       stands there whenever its chunk is made again. */
    _campfirePlaced(col, row) {
        const w = gameState.world;
        if (w.isInterior) return;
        if (!w.nikoliCampfire) {
            const biome = this.getBiomeAt(col, row);
            if (biome && biome.id === 'SNOWY_MOUNTAINS') (this._snowyCampfires ||= new Set()).add(`${col},${row}`);
            return;
        }
        if (w.nikoliCampfire !== `${col},${row}`) return;
        for (const [key, id] of this._storyObjects()) {
            const [c, r] = key.split(',').map(Number);
            this._placeStory(c, r, id);
        }
    }

    /** Called as each step ends: the nearest snowy campfire within NIKOLI_CAMP_SIGHT of the player (just beyond the screen) becomes Nikoli's
     *  camp, if he has none yet. */
    noticeNikoliCampfire(col, row) {
        const w = gameState.world;
        if (w.nikoliCampfire || w.isInterior || !this._snowyCampfires || !this._snowyCampfires.size) return false;
        let best = null, bestD = Infinity;
        for (const key of this._snowyCampfires) {
            const [c, r] = key.split(',').map(Number);
            const dc = Math.abs(c - col), dr = Math.abs(r - row);
            if (dc > NIKOLI_CAMP_SIGHT.cols || dr > NIKOLI_CAMP_SIGHT.rows) continue;
            const d = dc * dc + dr * dr;
            if (d < bestD) { best = key; bestD = d; }
        }
        if (!best) return false;
        InteriorFactory.claimHome('nikoliCampfire', best);
        this._snowyCampfires.clear();
        const [c, r] = best.split(',').map(Number);
        this._campfirePlaced(c, r);
        return true;
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
        if (p && p[this._s(col, row)] === 1) return true;
        const castles = this.terrain.castles;   // a castle's cobbled yards, on the plateau's level and the inner ward's
        return !!castles && castles.levelPathAt(col, row);
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
                if (this.terrain.castles && this.terrain.castles.isCastleCell(c, r)) return false;   // never painted into a castle's walls
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
    /* Whether a castle's gate is shut (its gatehouse showing the portcullis down, the way through barred). 'outer': every way into a castle, shut
       before act CASTLE_SITES.OPEN_ACT when GATES_SHUT; 'inner': the inner ward's gate at (col, row), shut when INNER_SHUT until openInnerGate.
       Both open for now (act 4 is not in the game yet). */
    castleGatesShut(kind = 'outer', col = 0, row = 0) {
        if (kind === 'inner') return CASTLE_SITES.INNER_SHUT && !this._innerOpened(col, row);
        return CASTLE_SITES.GATES_SHUT && ActSystem.getAct() < CASTLE_SITES.OPEN_ACT;
    }
    _innerOpened(col, row) {
        const site = this.terrain.castles && this.terrain.castles.siteAt(col, row);
        return !!site && !!(gameState.world.castleGatesOpened || {})[site.id];
    }
    /* Opens the inner gate of the castle at (col, row) for good (an encounter at the gate calls this). */
    openInnerGate(col, row) {
        const site = this.terrain.castles && this.terrain.castles.siteAt(col, row);
        if (!site) return false;
        if (!gameState.world.castleGatesOpened) gameState.world.castleGatesOpened = {};
        gameState.world.castleGatesOpened[site.id] = true;
        return true;
    }
    canMove(fromCol, fromRow, toCol, toRow, direction) {
        const gateKind = this.terrain.castles ? this.terrain.castles.gateKindAt(toCol, toRow) : null;
        if (gateKind && this.castleGatesShut(gateKind, toCol, toRow)) return false;   // a castle's gate, its portcullis down
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

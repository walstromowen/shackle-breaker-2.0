import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS_DEFINITIONS } from '../data/mapObjectDefinitions.js';
import { STRUCTURES } from '../data/structures.js';
import { isPlateau, layerIndex } from '../data/biomeDefinitions.js';
import { gameState } from '../state/gameState.js';
import { mapObjectFactory } from '../../shared/systems/factories/mapObjectsFactory.js';
import { WeatherFactory } from '../../shared/systems/factories/weatherFactory.js';
import { TerrainGenerator } from './terrainGenerator.js';
/* --- NEW: Import the Factory instead of the old Generator --- */
import { InteriorFactory } from './factories/interiorFactory.js';
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
/* N, E, S, W: the ways a road can head (the index is the `d` of a road cell) */
const VILLAGE_DIRS = [
    { c: 0, r: -1 },
    { c: 1, r: 0 },
    { c: 0, r: 1 },
    { c: -1, r: 0 },
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
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const key = this._s(c, r);
                if (this._collisionMap.has(key)) continue;
                const forcedObjId = gameState.world.changes?.[key];
                if (forcedObjId !== undefined) {
                    if (forcedObjId !== null) {
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
    _ensureStructuresSpawned(cx, cy) {
        const key = `${cx},${cy}`;
        if (this._structureSpawnedChunks.has(key)) return;
        this._structureSpawnedChunks.add(key);
        const startCol = cx * this.CHUNK_SIZE;
        const startRow = cy * this.CHUNK_SIZE;
        this._spawnStructuresForChunk(cx, cy, startCol, startRow);
    }
    _spawnStructuresForChunk(cx, cy, startCol, startRow) {
        const centerCol = startCol + Math.floor(this.CHUNK_SIZE / 2);
        const centerRow = startRow + Math.floor(this.CHUNK_SIZE / 2);
        const biome = this.getBiomeAt(centerCol, centerRow);
        const structureRng = this.pseudoRandom(cx * 137, cy * 193);
        /* a chunk with no village may get a landmark (a graveyard), on its own roll */
        const structureId = biome.getStructureId(structureRng) || biome.getLandmarkId(this.pseudoRandom(cx * 271 + 19, cy * 313 + 23));
        if (!structureId) return;
        const prefabOrBlueprint = STRUCTURES[structureId];
        if (!prefabOrBlueprint) return;
        const checkWidth =
            prefabOrBlueprint.type === 'BLUEPRINT' ? STRUCTURES[prefabOrBlueprint.centerPrefab].width : prefabOrBlueprint.width;
        const checkHeight =
            prefabOrBlueprint.type === 'BLUEPRINT' ? STRUCTURES[prefabOrBlueprint.centerPrefab].height : prefabOrBlueprint.height;
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
    /* ================================================================================================================
       VILLAGE PLANNER (a BLUEPRINT in structures.js)

       1. the hub prefab is written;
       2. the main roads grow out of its four sides. A road is a line of centre cells; every centre is stamped as a
          (2 * rad + 1) x (2 * rad + 1) square (3 x 3 for a 3-wide road), which gives a clean band in every direction and
          filled corners where a road turns. Nothing is written yet: the roads only claim cells in `plan.roadOwner`;
       3. side streets fork off the straight parts of the main roads;
       4. buildings are placed along every road, on both sides, with the gate facing the road;
       5. street dressing is put on the grass beside the roads, and trees are planted along them and in the empty lots;
       6. finally the roads are painted into the terrain and the cells they cover (and a verge around them) are cleared.
       ================================================================================================================ */
    _planBlueprint(startCol, startRow, blueprint, cx, cy) {
        const hub = STRUCTURES[blueprint.centerPrefab];
        if (!hub) return;
        console.log(`[WorldManager] Planning Blueprint Structure at ${startCol}, ${startRow}`);
        const cfg = this._villageConfig(blueprint);
        /* read before the hub is written: its terrain changes the corner cell */
        const baseElev = this.getElevation(startCol, startRow);
        this._writePrefabToGlobalState(startCol, startRow, hub);
        const plan = {
            cfg,
            baseElev,
            salt: (cx * 31 + cy * 17) % 997,
            hubTiles: new Set(),
            buildingTiles: new Set(),
            roadOwner: new Map() /* cell key -> { road: id, step } */,
            roads: [] /* { id, kind: 'arm' | 'side', parent, centres: [{ c, r, d }] } (d = the way the road was heading when it reached the cell) */,
        };
        for (let y = 0; y < hub.height; y++) {
            for (let x = 0; x < hub.width; x++) plan.hubTiles.add(this._s(startCol + x, startRow + y));
        }
        this._planMainRoads(plan, startCol, startRow, hub, blueprint, cx, cy);
        this._planSideStreets(plan);
        this._planBuildings(plan, blueprint);
        this._planStreetProps(plan, blueprint);
        this._planTrees(plan, blueprint);
        this._paveRoads(plan);
    }
    _villageConfig(bp) {
        const width = Math.max(1, Math.round(bp.roadWidth ?? 3));
        const rad = Math.floor((width - 1) / 2);
        const gap = Math.max(0, bp.roadGap ?? 1);
        const side = bp.sideStreets || {};
        return {
            rad,
            gap,
            pathTile: bp.pathTile ?? 1,
            wear: bp.edgeWear ?? 0,
            verge: bp.verge ?? 1,
            turnChance: bp.turnChance ?? 0.15,
            minTurn: bp.minStepsBetweenTurns ?? 5,
            /* a road may touch its own recent stamps (a bend), but not an older stretch of itself: 2 * (reach + rad) steps back is as far
               as two cells of one road can be and still be within `reach` of each other round a 90 degree bend */
            foldSteps: 2 * (2 * rad + gap),
            /* a side street may touch its parent for this many steps (the junction) */
            graceSteps: 2 * rad + gap,
            sideChance: side.chance ?? 0,
            sideSpacing: side.spacing ?? 10,
            sideStart: side.startAt ?? 8,
            sideEnd: side.endBefore ?? 6,
            sideMin: side.length ? side.length.min : 7,
            sideMax: side.length ? side.length.max : 14,
            sideCount: side.max ?? 6,
            density: bp.buildingDensity ?? 0.5,
            maxBuildings: bp.maxBuildings ?? 28,
            setback: bp.setback ?? 0,
            skipStart: 3,
        };
    }
    /* a cell a road may be painted on */
    _roadTileOk(plan, c, r) {
        const key = this._s(c, r);
        if (plan.hubTiles.has(key)) return true;
        if (plan.buildingTiles.has(key)) return false;
        if (gameState.world.changes[key] !== undefined) return false;
        if (this.getElevation(c, r) !== plan.baseElev) return false;
        if (this.isBlockedByFace(c, r) || this.isCliffFace(c, r)) return false;
        if (this._nearStair(c, r)) return false;
        return true;
    }
    /* can the road `road` have a centre at (c, r)? `step` is the index that centre would get on the road */
    _centreOk(plan, road, c, r, step) {
        const cfg = plan.cfg;
        const rad = cfg.rad;
        if (plan.hubTiles.has(this._s(c, r))) return false; // a road leaves the hub, it never runs inside it
        for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
                if (!this._roadTileOk(plan, c + dx, r + dy)) return false;
            }
        }
        /* keep `gap` cells of grass between this road and any other road, and do not fold back onto an older stretch of itself */
        const reach = rad + cfg.gap;
        for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
                const o = plan.roadOwner.get(this._s(c + dx, r + dy));
                if (!o) continue;
                if (o.road === road.id) {
                    if (step - o.step > cfg.foldSteps) return false;
                    continue;
                }
                if (road.parent !== undefined && o.road === road.parent && step <= cfg.graceSteps) continue;
                return false;
            }
        }
        return true;
    }
    _stampRoad(plan, road, c, r, step, created = null) {
        const rad = plan.cfg.rad;
        for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
                const key = this._s(c + dx, r + dy);
                const o = plan.roadOwner.get(key);
                if (!o) {
                    plan.roadOwner.set(key, { road: road.id, step });
                    if (created) created.push(key);
                } else if (o.road === road.id) {
                    o.step = step;
                }
            }
        }
    }
    /* true when the road runs straight from `back` centres before centre i to `fwd` centres after it */
    _straightAt(cs, i, back, fwd) {
        if (i - back < 0 || i + fwd >= cs.length) return false;
        const d = cs[i].d;
        for (let j = i - back + 1; j <= i + fwd; j++) {
            if (cs[j].d !== d) return false;
        }
        return true;
    }
    _planMainRoads(plan, startCol, startRow, hub, bp, cx, cy) {
        const cfg = plan.cfg;
        const midC = startCol + Math.floor(hub.width / 2);
        const midR = startRow + Math.floor(hub.height / 2);
        const wanted = [];
        for (let i = 0; i < 4; i++) {
            if (this.pseudoRandom(cx * 11, cy * i * 13) < bp.branchChance) wanted.push(i);
        }
        /* a village needs at least two streets */
        for (let i = 0; i < 4 && wanted.length < 2; i++) {
            if (!wanted.includes(i)) wanted.push(i);
        }
        let active = [];
        for (const i of wanted) {
            const d = VILLAGE_DIRS[i];
            const c = midC + d.c * Math.floor(hub.width / 2);
            const r = midR + d.r * Math.floor(hub.height / 2);
            const lenRng = this.pseudoRandom(cx * 17 + i * 5, cy * 31 + i * 3);
            const maxLen = Math.floor(lenRng * (bp.branchLength.max - bp.branchLength.min)) + bp.branchLength.min;
            const road = { id: plan.roads.length, kind: 'arm', parent: undefined, centres: [{ c, r, d: i }] };
            plan.roads.push(road);
            active.push({ road, c, r, dirIndex: i, len: 0, maxLen, sinceTurn: 0 });
        }
        /* all roads grow one step at a time, in turns, so none of them gets first pick of the land */
        while (active.length > 0) {
            const nextActive = [];
            for (const p of active) {
                if (p.len >= p.maxLen) continue;
                if (p.sinceTurn >= cfg.minTurn && this.pseudoRandom(p.c * 53, p.r * 67) < cfg.turnChance) {
                    const leftDir = (p.dirIndex + 3) % 4;
                    const rightDir = (p.dirIndex + 1) % 4;
                    const turnDir = this.pseudoRandom(p.c * 71, p.r * 79) < 0.5 ? leftDir : rightDir;
                    if (this._centreOk(plan, p.road, p.c + VILLAGE_DIRS[turnDir].c, p.r + VILLAGE_DIRS[turnDir].r, p.len + 1)) {
                        p.dirIndex = turnDir;
                        p.sinceTurn = 0;
                    }
                }
                let nextC = p.c + VILLAGE_DIRS[p.dirIndex].c;
                let nextR = p.r + VILLAGE_DIRS[p.dirIndex].r;
                let valid = this._centreOk(plan, p.road, nextC, nextR, p.len + 1);
                if (!valid) {
                    /* blocked: bend round the obstacle */
                    const leftDir = (p.dirIndex + 3) % 4;
                    const rightDir = (p.dirIndex + 1) % 4;
                    const tryFirst = this.pseudoRandom(p.c, p.r) < 0.5 ? leftDir : rightDir;
                    const trySecond = tryFirst === leftDir ? rightDir : leftDir;
                    for (const dir of [tryFirst, trySecond]) {
                        const tc = p.c + VILLAGE_DIRS[dir].c;
                        const tr = p.r + VILLAGE_DIRS[dir].r;
                        if (this._centreOk(plan, p.road, tc, tr, p.len + 1)) {
                            p.dirIndex = dir;
                            nextC = tc;
                            nextR = tr;
                            valid = true;
                            p.sinceTurn = 0;
                            break;
                        }
                    }
                }
                if (!valid) continue;
                p.c = nextC;
                p.r = nextR;
                p.len++;
                p.sinceTurn++;
                p.road.centres.push({ c: nextC, r: nextR, d: p.dirIndex });
                this._stampRoad(plan, p.road, nextC, nextR, p.len);
                nextActive.push(p);
            }
            active = nextActive;
        }
    }
    _planSideStreets(plan) {
        const cfg = plan.cfg;
        if (!cfg.sideChance) return;
        let made = 0;
        const arms = plan.roads.filter((rd) => rd.kind === 'arm');
        for (const arm of arms) {
            const cs = arm.centres;
            let last = -999;
            for (let i = cfg.sideStart; i < cs.length - cfg.sideEnd; i++) {
                if (made >= cfg.sideCount) return;
                if (i - last < cfg.sideSpacing) continue;
                /* the junction needs a straight stretch on both sides, so the parent cannot bend into the new street */
                if (!this._straightAt(cs, i, 6, 6)) continue;
                const here = cs[i];
                if (this.pseudoRandom(here.c * 29 + plan.salt, here.r * 31 + 5) >= cfg.sideChance) continue;
                const flip = this.pseudoRandom(here.c * 37 + 3, here.r * 41 + plan.salt) < 0.5;
                const dirs = flip ? [(here.d + 3) % 4, (here.d + 1) % 4] : [(here.d + 1) % 4, (here.d + 3) % 4];
                const len = cfg.sideMin + Math.floor(this.pseudoRandom(here.c * 43, here.r * 47 + 9) * (cfg.sideMax - cfg.sideMin + 1));
                for (const dir of dirs) {
                    if (this._growSideStreet(plan, arm, here, dir, len)) {
                        last = i;
                        made++;
                        break;
                    }
                }
            }
        }
    }
    _growSideStreet(plan, parent, at, dirIndex, len) {
        const cfg = plan.cfg;
        const road = { id: plan.roads.length, kind: 'side', parent: parent.id, centres: [{ c: at.c, r: at.r, d: dirIndex }] };
        const d = VILLAGE_DIRS[dirIndex];
        const created = [];
        let c = at.c;
        let r = at.r;
        let steps = 0;
        for (let k = 1; k <= len; k++) {
            const nc = c + d.c;
            const nr = r + d.r;
            if (!this._centreOk(plan, road, nc, nr, k)) break;
            c = nc;
            r = nr;
            steps = k;
            road.centres.push({ c, r, d: dirIndex });
            this._stampRoad(plan, road, c, r, k, created);
        }
        if (steps < cfg.sideMin) {
            for (const key of created) plan.roadOwner.delete(key);
            return false;
        }
        plan.roads.push(road);
        return true;
    }
    _planBuildings(plan, bp) {
        const cfg = plan.cfg;
        const mods = (bp.modules || []).filter((m) => STRUCTURES[m.prefab]).map((m) => ({ ...m, placed: 0 }));
        if (mods.length === 0) return;
        /* every spot along a road where a yard could stand, on either side: centred on a road cell, on the straight parts. Whether it really fits
           (nothing in the way, and its footpath ends right on the road) is decided in _placeModule. */
        const slots = [];
        for (const road of plan.roads) {
            const cs = road.centres;
            for (let i = cfg.skipStart; i < cs.length; i++) {
                if (!this._straightAt(cs, i, 1, 1)) continue;
                slots.push({ road, i, side: 0 });
                slots.push({ road, i, side: 1 });
            }
        }
        const hash = (slot, salt) => {
            const ctr = slot.road.centres[slot.i];
            return this.pseudoRandom(ctr.c * 19 + slot.side * 7 + salt * 5, ctr.r * 23 + salt * 3 + plan.salt);
        };
        let total = 0;
        const place = (slot, mod) => {
            if (!this._placeModule(plan, slot, mod)) return false;
            mod.placed++;
            total++;
            return true;
        };
        /* 1. the buildings every village must have (the crafting stations): the first spot that fits, nearest the hub first, with some jitter */
        mods.forEach((mod, m) => {
            if (!mod.required) return;
            const order = slots.map((s) => ({ s, k: s.i + hash(s, 11 + m) * 14 })).sort((a, b) => a.k - b.k);
            for (const { s } of order) {
                if (total >= cfg.maxBuildings) break;
                if (place(s, mod)) break;
            }
        });
        /* 2. everything else, walking outwards from the hub */
        slots.sort((a, b) => a.i - b.i || hash(a, 3) - hash(b, 3));
        for (const s of slots) {
            if (total >= cfg.maxBuildings) break;
            if (hash(s, 5) >= cfg.density) continue;
            const open = mods.filter((m) => m.max === undefined || m.placed < m.max);
            const sum = open.reduce((acc, m) => acc + (m.weight ?? 1), 0);
            if (sum <= 0) break;
            let roll = hash(s, 7) * sum;
            let pick = open[open.length - 1];
            for (const m of open) {
                roll -= m.weight ?? 1;
                if (roll < 0) {
                    pick = m;
                    break;
                }
            }
            place(s, pick);
        }
    }
    _placeModule(plan, slot, mod) {
        const cfg = plan.cfg;
        const ctr = slot.road.centres[slot.i];
        const horizontal = ctr.d === 1 || ctr.d === 3;
        /* the variant whose gate faces the road. Horizontal road: side 0 is north, 1 is south. Vertical road: side 0 is west, 1 is east. */
        let gate;
        if (horizontal) {
            if (slot.side === 0) gate = 'S';
            else gate = this.pseudoRandom(ctr.c * 5 + 1, ctr.r * 3 + 2) < 0.5 ? 'EN' : 'WN';
        } else {
            gate = slot.side === 0 ? 'E' : 'W';
        }
        const proto = STRUCTURES[mod.prefab];
        const prefab = (proto.variants && proto.variants[gate]) || proto;
        const w = prefab.width;
        const h = prefab.height;
        const off = cfg.rad + 1 + cfg.setback;
        let originC;
        let originR;
        if (horizontal) {
            originC = ctr.c - Math.floor(w / 2);
            originR = slot.side === 0 ? ctr.r - off - (h - 1) : ctr.r + off;
        } else {
            originR = ctr.r - Math.floor(h / 2);
            originC = slot.side === 0 ? ctr.c - off - (w - 1) : ctr.c + off;
        }
        /* the footpath leaves the yard at `entry`; the cell it points at must be road (or hub), or the yard would face a field */
        if (prefab.entry) {
            const e = prefab.entry;
            const key = this._s(originC + e.x + e.dx, originR + e.y + e.dy);
            if (!plan.roadOwner.has(key) && !plan.hubTiles.has(key)) return false;
        }
        if (!this._moduleFits(plan, originC, originR, w, h)) return false;
        this._writePrefabToGlobalState(originC, originR, prefab);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) plan.buildingTiles.add(this._s(originC + x, originR + y));
        }
        return true;
    }
    _moduleFits(plan, originC, originR, w, h) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const key = this._s(originC + x, originR + y);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) return false;
                if (this._nearStair(originC + x, originR + y)) return false;
            }
        }
        if (this.getElevation(originC, originR) !== plan.baseElev) return false;
        return this._isStructureFootprintValid(originC, originR, w, h);
    }
    /* A standing torch now and then beside the road (blueprint `streetTorches`). Same cell rules as the street dressing; planned first, so a torch
       takes its cell before any barrel or tuft of grass can. */
    _planStreetTorches(plan, bp) {
        const tc = bp.streetTorches;
        if (!tc || !tc.chance || !MAP_OBJECTS_DEFINITIONS[tc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = tc.spacing ?? 10;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length; i++) {
                if (i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 83 + plan.salt, cs[i].r * 89 + 17) >= tc.chance) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                const side = this.pseudoRandom(cs[i].c * 97 + 5, cs[i].r * 101 + plan.salt) < 0.5 ? 0 : 1;
                const sgn = side === 0 ? -off : off;
                const c = horizontal ? cs[i].c : cs[i].c + sgn;
                const r = horizontal ? cs[i].r + sgn : cs[i].r;
                const key = this._s(c, r);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;     // not on a scarecrow's second tile either
                if (this.getElevation(c, r) !== plan.baseElev || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                this.modifyWorld(c, r, tc.id);
                this._placeObject(c, r, tc.id);
                last = i;
            }
        }
    }
    /* A scarecrow now and then on the verge NORTH of an east-west road (blueprint `scarecrows`), so that the 5 tiles it sees straight beneath it (the
       PECULIAR_SCARECROW's `triggerLine`, as wide as the scarecrow) run across the road. Same cell rules as the torches, for every tile of its two wide base
       and the row above it; planned before them. The only place the object is ever made. */
    _planStreetScarecrows(plan, bp) {
        const sc = bp.scarecrows;
        if (!sc || !sc.chance || !MAP_OBJECTS_DEFINITIONS[sc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = sc.spacing ?? 12;
        const w = MAP_OBJECTS_DEFINITIONS[sc.id].width || 1;
        let placed = 0;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length && placed < (sc.max ?? 3); i++) {
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                if (!horizontal || i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 71 + plan.salt, cs[i].r * 73 + 29) >= sc.chance) continue;
                const c = cs[i].c, r = cs[i].r - off;
                let free = true;
                for (let dc = 0; dc < w && free; dc++) {
                    const key = this._s(c + dc, r);
                    if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key) || plan.buildingTiles.has(this._s(c + dc, r - 1))) free = false;
                    else if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) free = false;
                    else if (this.getElevation(c + dc, r) !== plan.baseElev || this.isBlockedByFace(c + dc, r) || this.isCliffFace(c + dc, r) || this._nearStair(c + dc, r)) free = false;
                }
                if (!free) continue;
                this.modifyWorld(c, r, sc.id);
                this._placeObject(c, r, sc.id);
                last = i;
                placed++;
            }
        }
    }
    /* Old graves on the verge beside the roads (blueprint `gravestones`): the same cell rules as the torches. `encounterChance` of the stones are the
       dig-able OLD_GRAVESTONE, the rest the plain TOMBSTONE (same sprite). Planned after the scarecrows and torches, before the street dressing. */
    _planGravestones(plan, bp) {
        const gc = bp.gravestones;
        if (!gc || !gc.chance || !MAP_OBJECTS_DEFINITIONS[gc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = gc.spacing ?? 9;
        let placed = 0;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length && placed < (gc.max ?? 10); i++) {
                if (i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 107 + plan.salt, cs[i].r * 109 + 31) >= gc.chance) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                const side = this.pseudoRandom(cs[i].c * 113 + 7, cs[i].r * 127 + plan.salt) < 0.5 ? 0 : 1;
                const sgn = side === 0 ? -off : off;
                const c = horizontal ? cs[i].c : cs[i].c + sgn;
                const r = horizontal ? cs[i].r + sgn : cs[i].r;
                const key = this._s(c, r);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;
                if (this.getElevation(c, r) !== plan.baseElev || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                const id = gc.encounterId && MAP_OBJECTS_DEFINITIONS[gc.encounterId] && this.pseudoRandom(c * 131 + 3, r * 137 + plan.salt) < (gc.encounterChance ?? 0)
                    ? gc.encounterId : gc.id;
                this.modifyWorld(c, r, id);
                this._placeObject(c, r, id);
                last = i;
                placed++;
            }
        }
    }
    _planStreetProps(plan, bp) {
        this._planStreetScarecrows(plan, bp);
        this._planStreetTorches(plan, bp);
        this._planGravestones(plan, bp);
        const sp = bp.streetProps;
        if (!sp || !sp.chance || !sp.pool || sp.pool.length === 0) return;
        const off = plan.cfg.rad + 1;
        for (const road of plan.roads) {
            const cs = road.centres;
            for (let i = 2; i < cs.length; i++) {
                if (!this._straightAt(cs, i, 2, 0)) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                for (let side = 0; side < 2; side++) {
                    if (this.pseudoRandom(cs[i].c * 61 + side * 13 + plan.salt, cs[i].r * 67 + 11) >= sp.chance) continue;
                    const sgn = side === 0 ? -off : off;
                    const c = horizontal ? cs[i].c : cs[i].c + sgn;
                    const r = horizontal ? cs[i].r + sgn : cs[i].r;
                    const key = this._s(c, r);
                    if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                    if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;     // not on a scarecrow's second tile either
                    if (this.getElevation(c, r) !== plan.baseElev || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                    /* the dressing follows the biome of the cell: `streetProps.biomes[biomeId]` replaces `pool` there (an empty list = nothing) */
                    const pool = this._biomePool(sp, this.getBiomeAt(c, r).id);
                    if (pool.length === 0) continue;
                    const id = pool[Math.floor(this.pseudoRandom(c * 73 + 1, r * 79 + 2) * pool.length)];
                    if (!MAP_OBJECTS_DEFINITIONS[id]) continue;
                    this.modifyWorld(c, r, id);
                    this._placeObject(c, r, id);
                }
            }
        }
    }
    /* Trees along the roads and in the empty lots of the village. Every cell within `reach` of a road is a candidate; a tree stands where its whole
       footprint stays `clearRoad` cells off the road (so the canopy never covers it) and `clearBuilding` cells off every yard, where nothing else is,
       and where the terrain allows (the same test the natural trees pass). Cells close to a road are more likely (an avenue), and a slow wave makes
       the trees come in groves rather than evenly. The footprint is reserved, so the natural trees of the biome cannot grow into it later. */
    /* the list a village feature (`trees`, `streetProps`) draws from in a biome: `cfg.biomes[biomeId]` when the blueprint lists that biome (an empty
       list means "none here"), otherwise the default `cfg.pool` */
    _biomePool(cfg, biomeId) {
        const own = cfg.biomes && cfg.biomes[biomeId];
        return own !== undefined ? own : (cfg.pool || []);
    }
    _planTrees(plan, bp) {
        const tr = bp.trees;
        if (!tr || !tr.chance || (!tr.pool && !tr.biomes)) return;
        /* weighted pick lists per biome, built once */
        const pools = new Map();
        const poolOf = (biomeId) => {
            let p = pools.get(biomeId);
            if (!p) {
                const list = this._biomePool(tr, biomeId).filter((t) => MAP_OBJECTS_DEFINITIONS[t.id]);
                p = { list, total: list.reduce((acc, t) => acc + (t.weight ?? 1), 0) };
                pools.set(biomeId, p);
            }
            return p;
        };
        const cfg = plan.cfg;
        const reach = tr.reach ?? 14;
        const clearRoad = tr.clearRoad ?? 2;
        const clearBuilding = tr.clearBuilding ?? 2;
        const cap = reach + 4;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        const grow = (key) => {
            const comma = key.indexOf(',');
            const c = +key.slice(0, comma);
            const r = +key.slice(comma + 1);
            if (c < x0) x0 = c;
            if (c > x1) x1 = c;
            if (r < y0) y0 = r;
            if (r > y1) y1 = r;
        };
        for (const key of plan.roadOwner.keys()) grow(key);
        for (const key of plan.hubTiles) grow(key);
        for (const key of plan.buildingTiles) grow(key);
        if (x0 === Infinity) return;
        x0 -= reach; y0 -= reach; x1 += reach; y1 += reach;
        const W = x1 - x0 + 1;
        const H = y1 - y0 + 1;
        const roadMask = new Uint8Array(W * H);
        const bldMask = new Uint8Array(W * H);
        const mark = (set, mask) => {
            for (const key of set) {
                const comma = key.indexOf(',');
                mask[(+key.slice(comma + 1) - y0) * W + (+key.slice(0, comma) - x0)] = 1;
            }
        };
        mark(plan.roadOwner.keys(), roadMask);
        mark(plan.hubTiles, roadMask);
        mark(plan.buildingTiles, bldMask);
        const dRoad = this._distanceField(W, H, roadMask, cap);
        const dBld = this._distanceField(W, H, bldMask, cap);
        const taken = new Uint8Array(W * H);
        let planted = 0;
        for (let r = y0; r <= y1 && planted < (tr.max ?? 200); r++) {
            for (let c = x0; c <= x1 && planted < (tr.max ?? 200); c++) {
                const i = (r - y0) * W + (c - x0);
                const d = dRoad[i];
                if (d > reach || d < clearRoad) continue;
                /* groves: a slow wave over the village, never quite zero */
                const wave = 0.5 + 0.5 * Math.sin(c * 0.23 + plan.salt) * Math.sin(r * 0.19 - plan.salt * 0.7);
                let p = tr.chance * (0.3 + 1.4 * wave);
                if (d <= clearRoad + 1) p *= tr.roadsideBoost ?? 1.8;
                if (this.pseudoRandom(c * 83 + 3, r * 89 + plan.salt) >= p) continue;
                /* the trees of the biome this cell is in (a village road can run out of the plains into a desert or a snowfield) */
                const biomeId = this.getBiomeAt(c, r).id;
                const bpool = poolOf(biomeId);
                if (bpool.list.length === 0) continue;
                let roll = this.pseudoRandom(c * 97 + 7, r * 101 + 5) * bpool.total;
                let pick = bpool.list[bpool.list.length - 1];
                for (const t of bpool.list) {
                    roll -= t.weight ?? 1;
                    if (roll < 0) { pick = t; break; }
                }
                const def = MAP_OBJECTS_DEFINITIONS[pick.id];
                if (!def) continue;
                const w = def.w || def.width || 1;
                const h = def.h || def.height || 1;
                let ok = c + w - 1 <= x1 && r + h - 1 <= y1;
                for (let y = 0; y < h && ok; y++) {
                    for (let x = 0; x < w; x++) {
                        const j = (r + y - y0) * W + (c + x - x0);
                        const key = this._s(c + x, r + y);
                        if (dRoad[j] < clearRoad || dBld[j] < clearBuilding || taken[j] || this._collisionMap.has(key) || gameState.world.changes[key] !== undefined) { ok = false; break; }
                        /* the whole footprint stays in one biome (isFootprintValid below keeps the other cells off the biome border, the anchor is checked here) */
                        if ((x || y) && this.getBiomeAt(c + x, r + y).id !== biomeId) { ok = false; break; }
                        if (!x && !y && this.isBiomeEdge(c, r)) { ok = false; break; }
                    }
                }
                if (!ok || !this.isFootprintValid(c, r, w, h)) continue;
                /* reserve the footprint and a ring round it, so trees never touch */
                for (let y = -1; y <= h; y++) {
                    for (let x = -1; x <= w; x++) {
                        const cc = c + x, rr = r + y;
                        if (cc < x0 || cc > x1 || rr < y0 || rr > y1) continue;
                        taken[(rr - y0) * W + (cc - x0)] = 1;
                    }
                }
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (x === 0 && y === 0) continue;
                        this.modifyWorld(c + x, r + y, null);
                    }
                }
                this.modifyWorld(c, r, pick.id);
                this._placeObject(c, r, pick.id);
                planted++;
            }
        }
    }
    /* Chebyshev distance of every cell of a W x H box to the nearest set cell of `mask`, capped at `cap` */
    _distanceField(W, H, mask, cap) {
        const dist = new Int16Array(W * H).fill(cap);
        const queue = new Int32Array(W * H);
        let head = 0;
        let tail = 0;
        for (let i = 0; i < W * H; i++) {
            if (mask[i]) { dist[i] = 0; queue[tail++] = i; }
        }
        while (head < tail) {
            const i = queue[head++];
            const nd = dist[i] + 1;
            if (nd >= cap) continue;
            const x = i % W;
            const y = (i / W) | 0;
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= H) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= W) continue;
                    const j = ny * W + nx;
                    if (dist[j] > nd) { dist[j] = nd; queue[tail++] = j; }
                }
            }
        }
        return dist;
    }
    _paveRoads(plan) {
        const cfg = plan.cfg;
        const overrides = gameState.world.terrainOverrides;
        const centreSet = new Set();
        for (const road of plan.roads) {
            for (const ctr of road.centres) centreSet.add(this._s(ctr.c, ctr.r));
        }
        const roadKeys = [];
        for (const key of plan.roadOwner.keys()) {
            if (plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
            roadKeys.push(key);
        }
        const isRoad = new Set(roadKeys);
        const nextToBuilding = (c, r) => {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const k = this._s(c + dx, r + dy);
                    if (plan.buildingTiles.has(k) || plan.hubTiles.has(k)) return true;
                }
            }
            return false;
        };
        /* the edge columns of the road wear away in places. Never the centre cells, never where a footpath or the hub meets the road, and never two
           worn cells within 2 cells of each other, so the road is at least two cells wide everywhere. */
        const worn = new Set();
        const nearWorn = (c, r) => {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) if (worn.has(this._s(c + dx, r + dy))) return true;
            }
            return false;
        };
        /* a cell on a straight edge of the road: grass on exactly one side, road on the opposite side. (A corner, a junction mouth or a cell between
           two roads is never worn, which would leave a grass island or a ragged corner.) */
        const outside = (k) => !isRoad.has(k) && !plan.hubTiles.has(k) && !plan.buildingTiles.has(k);
        const straightEdge = (c, r) => {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (!outside(this._s(c + dx, r + dy))) continue;
                if (!isRoad.has(this._s(c - dx, r - dy))) return false;
                return outside(this._s(c + dy, r + dx)) === false && outside(this._s(c - dy, r - dx)) === false;
            }
            return false;
        };
        for (const key of roadKeys) {
            const [c, r] = key.split(',').map(Number);
            if (cfg.wear > 0 && !centreSet.has(key) && !nextToBuilding(c, r) && straightEdge(c, r) && !nearWorn(c, r) && this.pseudoRandom(c * 41 + 5, r * 43 + 9) < cfg.wear) worn.add(key);
        }
        for (const key of roadKeys) {
            const [c, r] = key.split(',').map(Number);
            const paved = !worn.has(key);
            if (paved) {
                overrides[key] = cfg.pathTile;
                this.terrain.invalidateTile(key);
            }
            this.modifyWorld(c, r, null);
        }
        /* a verge round the roads: no random tree or rock grows right up to the dirt (structures and anything already decided are left alone) */
        if (cfg.verge > 0) {
            const v = cfg.verge;
            for (const key of roadKeys) {
                const [c, r] = key.split(',').map(Number);
                for (let dy = -v; dy <= v; dy++) {
                    for (let dx = -v; dx <= v; dx++) {
                        const k = this._s(c + dx, r + dy);
                        if (isRoad.has(k) || plan.hubTiles.has(k) || plan.buildingTiles.has(k)) continue;
                        if (gameState.world.changes[k] !== undefined) continue;
                        this.modifyWorld(c + dx, r + dy, null);
                    }
                }
            }
        }
    }
    /* The objects of a prefab as they will be placed: the grid in the prefab, with
         wear     { fenceBreak }              a share of the straight fence pieces gone (never a corner or the gate)
         scatter  { chance, pool, rect? }     ground decoration on empty, non-dirt cells (inside `rect` = { x, y, w, h } when given)
       Both are decided per cell from the seed, so a yard looks the same every time it is generated. */
    _prefabObjects(originCol, originRow, prefab) {
        const grid = [];
        for (let r = 0; r < prefab.height; r++) {
            grid.push(Array.from({ length: prefab.width }, (_, c) => prefab.objects?.[r]?.[c] ?? null));
        }
        const rnd = (c, r, salt) => this.pseudoRandom((originCol + c) * 13 + salt * 101, (originRow + r) * 17 + salt * 53);
        const wear = prefab.wear;
        if (wear && wear.fenceBreak) {
            for (let r = 0; r < prefab.height; r++) {
                for (let c = 0; c < prefab.width; c++) {
                    const id = grid[r][c];
                    if ((id === 'WOODEN_FENCE_H' || id === 'WOODEN_FENCE_V') && rnd(c, r, 1) < wear.fenceBreak) grid[r][c] = null;
                }
            }
        }
        if (prefab.graveyard) this._graveyardObjects(grid, prefab, rnd);
        const sc = prefab.scatter;
        if (sc && sc.chance && sc.pool && sc.pool.length > 0) {
            const rect = sc.rect || { x: 0, y: 0, w: prefab.width, h: prefab.height };
            for (let r = rect.y; r < rect.y + rect.h; r++) {
                for (let c = rect.x; c < rect.x + rect.w; c++) {
                    if (grid[r]?.[c] !== null || prefab.terrain?.[r]?.[c] === 1) continue;
                    if (rnd(c, r, 2) >= sc.chance) continue;
                    const id = sc.pool[Math.floor(rnd(c, r, 3) * sc.pool.length)];
                    if (MAP_OBJECTS_DEFINITIONS[id]) grid[r][c] = id;
                }
            }
        }
        return grid;
    }
    /* A graveyard (a prefab with `graveyard`, see structures.js): `stones` gravestones at random cells of the box, one of them the OLD_GRAVESTONE with
       the chance `encounterChance`; then every free cell touching a stone may hold bones or small rocks, and a few diagonal ones a boulder (never one
       straight beside a stone, so each grave can be walked up to). Written into `grid`, decided per cell from the seed. */
    _graveyardObjects(grid, prefab, rnd) {
        const gy = prefab.graveyard;
        const W = prefab.width, H = prefab.height;
        const lo = Math.max(1, gy.stones?.min ?? 3);
        const hi = Math.max(lo, gy.stones?.max ?? 5);
        const count = lo + Math.floor(rnd(0, 0, 11) * (hi - lo + 1));
        /* the stones: random cells, a shuffled list of all cells, taken in order */
        const cells = [];
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cells.push({ c, r, k: rnd(c, r, 12) });
        cells.sort((a, b) => a.k - b.k);
        const stones = cells.slice(0, Math.min(count, cells.length));
        const isStone = (c, r) => stones.some((s) => s.c === c && s.r === r);
        const pick = (pool, c, r, salt) => pool[Math.floor(rnd(c, r, salt) * pool.length) % pool.length];
        const withEncounter = gy.encounterStone && MAP_OBJECTS_DEFINITIONS[gy.encounterStone] && rnd(1, 1, 13) < (gy.encounterChance ?? 0);
        const special = withEncounter ? Math.min(stones.length - 1, Math.floor(rnd(2, 2, 14) * stones.length)) : -1;
        stones.forEach((s, i) => { grid[s.r][s.c] = i === special ? gy.encounterStone : gy.stone; });
        /* what lies beside them */
        let boulders = 0;
        const orthStone = (c, r) => isStone(c - 1, r) || isStone(c + 1, r) || isStone(c, r - 1) || isStone(c, r + 1);
        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (grid[r][c] !== null) continue;
                let touching = false;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isStone(c + dx, r + dy)) touching = true;
                if (!touching) continue;
                const roll = rnd(c, r, 15);
                const bo = gy.boulders, bn = gy.bones, rk = gy.rocks;
                if (bo && bo.pool?.length && !orthStone(c, r) && boulders < (gy.boulderMax ?? 3) && roll < bo.chance) {
                    grid[r][c] = pick(bo.pool, c, r, 16);
                    boulders++;
                } else if (bn && bn.pool?.length && rnd(c, r, 17) < bn.chance) {
                    grid[r][c] = pick(bn.pool, c, r, 18);
                } else if (rk && rk.pool?.length && rnd(c, r, 19) < rk.chance) {
                    grid[r][c] = pick(rk.pool, c, r, 20);
                }
                if (grid[r][c] && !MAP_OBJECTS_DEFINITIONS[grid[r][c]]) grid[r][c] = null;
            }
        }
    }
    _writePrefabToGlobalState(originCol, originRow, prefab) {
        const cells = this._prefabObjects(originCol, originRow, prefab);
        for (let r = 0; r < prefab.height; r++) {
            for (let c = 0; c < prefab.width; c++) {
                const key = this._s(originCol + c, originRow + r);
                const explicitObjId = cells[r][c];
                if (this.objects.has(key)) {
                    this.modifyWorld(originCol + c, originRow + r, null);
                }
                gameState.world.changes[key] = explicitObjId;
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
            const chunkPixelX = (chunk.cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2) * TILE_SIZE;
            const chunkPixelY = (chunk.cy * this.CHUNK_SIZE + this.CHUNK_SIZE / 2) * TILE_SIZE;
            const dx = chunkPixelX - cameraX;
            const dy = chunkPixelY - cameraY;
            if (dx * dx + dy * dy > distSq) {
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
        if (!this.isFootprintValid(col, row, w, h)) return null;
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
    modifyWorld(col, row, newValue, explicitMapId = null) {
        const key = this._s(col, row, explicitMapId);
        gameState.world.changes[key] = newValue;
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
        let radius = 0;
        while (radius < 500) {
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
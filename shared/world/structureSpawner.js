// shared/world/structureSpawner.js
//
// Where a chunk's structure (a village, a graveyard) goes and how a PREFAB is written into the world: the objects of a prefab (wear, scatter, the
// graveyard's stones), the terrain it lays, and the check that a footprint is flat and free. Methods of the WorldManager, like the village planner:
// worldManager.js copies them onto WorldManager.prototype, so `this` is the WorldManager.
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { STRUCTURES } from './structures.js';
import { isPlateau } from './biomeDefinitions.js';
import { gameState } from '../core/gameState.js';
import { drain } from './villagePlanner.js';

// How far ahead the world plans structures: every chunk within AHEAD_RADIUS chunks of the player (a chunk is generated when it comes near the view,
// and asks for the structures of the chunks up to 2 away, so this keeps the planning a couple of chunks ahead of that).
const AHEAD_RADIUS = 5;
// The chunks a loading screen generates around the player (prebuildSteps), and the look-ahead keeps generated as the player walks: what the
// view and its margin ask for, and a little more (chunks further than about 5 away are unloaded again, WorldManager.prune).
const PREBUILD_RADIUS = 2;
const PREGEN_RADIUS = 2;
// The terrain a structure job works out before it plans (cells round the chunk's centre): a village's roads and yards reach far, a graveyard does not.
const WARM_VILLAGE = 56;
const WARM_PREFAB = 12;

export class StructureSpawner {
    /* Each chunk gets its turn at a structure ONCE per world. The record (gameState.world.structureChunks) is saved with the world: without it,
       every new WorldManager (loading a save, leaving a house or cave) ran the roll again, found the old structure in the way and built another
       copy beside it.
       Planning a village is the heaviest thing the world does (half a second to a second), so it is normally done ahead of the player, a few
       milliseconds per frame (prepareAhead). Anything that needs a chunk's structure NOW (a chunk being generated) first finishes the job that is
       running, so the world is never read half-built, and otherwise does the work at once as before. */
    _ensureStructuresSpawned(cx, cy) {
        if (this._structureJob) this._finishStructureJob();
        if (!this._claimStructureChunk(cx, cy)) return;
        drain(this._spawnStructuresSteps(cx, cy, false));
    }
    /* Marks the chunk's turn as taken; false when it was taken already (this session, or in the saved record). */
    _claimStructureChunk(cx, cy) {
        const key = `${cx},${cy}`;
        if (this._structureSpawnedChunks.has(key)) return false;
        this._structureSpawnedChunks.add(key);
        const record = this._structureRecord();
        if (record.chunks[key]) return false;
        record.chunks[key] = 1;
        /* a save from before the record: a chunk that has anything written in it has had its turn already */
        if (record.legacy && this._chunkHasChanges(cx * this.CHUNK_SIZE, cy * this.CHUNK_SIZE)) return false;
        return true;
    }
    /* { seed, chunks: { 'cx,cy': 1 }, legacy } for this world. A record for another seed, or one left beside an emptied world (a test, a reset), is
       started afresh; a world with changes but no record at all is a save from before the record existed (legacy). */
    _structureRecord() {
        const world = gameState.world;
        let record = world.structureChunks;
        if (record && record.seed === this.seed && record.chunks) {
            if (this._recordChecked === record) return record;
        }
        let hasChanges = false;
        for (const k in (world.changes || {})) { hasChanges = true; break; }
        if (!record || record.seed !== this.seed || (!hasChanges && Object.keys(record.chunks || {}).length > 0)) {
            record = { seed: this.seed, chunks: {}, legacy: !record && hasChanges };
            world.structureChunks = record;
        }
        if (!record.chunks) record.chunks = {};
        this._recordChecked = record;
        return record;
    }
    _chunkHasChanges(startCol, startRow) {
        const changes = gameState.world.changes || {};
        for (let r = startRow; r < startRow + this.CHUNK_SIZE; r++) {
            for (let c = startCol; c < startCol + this.CHUNK_SIZE; c++) {
                if (changes[this._s(c, r)] !== undefined) return true;
            }
        }
        return false;
    }
    /* The chunk's structure, rolled and placed, in steps (see villagePlanner.drain). With `warm`, the terrain the structure will read is worked out
       first, a little at a time (that is most of the cost of a village's first look at the land). */
    *_spawnStructuresSteps(cx, cy, warm) {
        const startCol = cx * this.CHUNK_SIZE;
        const startRow = cy * this.CHUNK_SIZE;
        const centerCol = startCol + Math.floor(this.CHUNK_SIZE / 2);
        const centerRow = startRow + Math.floor(this.CHUNK_SIZE / 2);
        const biome = this.getBiomeAt(centerCol, centerRow);
        const structureRng = this.pseudoRandom(cx * 137, cy * 193);
        /* a chunk with no village may get a landmark (a graveyard), on its own roll */
        const structureId = biome.getStructureId(structureRng) || biome.getLandmarkId(this.pseudoRandom(cx * 271 + 19, cy * 313 + 23));
        if (!structureId) return;
        const prefabOrBlueprint = STRUCTURES[structureId];
        if (!prefabOrBlueprint) return;
        const isVillage = prefabOrBlueprint.type === 'BLUEPRINT';
        if (warm) yield* this._warmTerrainSteps(centerCol, centerRow, isVillage ? WARM_VILLAGE : WARM_PREFAB);
        const checkWidth = isVillage ? STRUCTURES[prefabOrBlueprint.centerPrefab].width : prefabOrBlueprint.width;
        const checkHeight = isVillage ? STRUCTURES[prefabOrBlueprint.centerPrefab].height : prefabOrBlueprint.height;
        const maxLocalCol = Math.max(1, this.CHUNK_SIZE - checkWidth);
        const maxLocalRow = Math.max(1, this.CHUNK_SIZE - checkHeight);
        const startX = Math.floor(this.pseudoRandom(cx * 401, cy * 503) * maxLocalCol);
        const startY = Math.floor(this.pseudoRandom(cx * 607, cy * 701) * maxLocalRow);
        let tried = 0;
        for (let rOffset = 0; rOffset < maxLocalRow; rOffset++) {
            for (let cOffset = 0; cOffset < maxLocalCol; cOffset++) {
                const localCol = (startX + cOffset) % maxLocalCol;
                const localRow = (startY + rOffset) % maxLocalRow;
                const originCol = startCol + localCol;
                const originRow = startRow + localRow;
                if (this._isStructureFootprintValid(originCol, originRow, checkWidth, checkHeight, biome.id)) {
                    if (isVillage) {
                        if (warm) yield* this._planBlueprintSteps(originCol, originRow, prefabOrBlueprint, cx, cy);
                        else this._planBlueprint(originCol, originRow, prefabOrBlueprint, cx, cy);
                    } else {
                        this._writePrefabToGlobalState(originCol, originRow, prefabOrBlueprint);
                    }
                    return;
                }
                if (warm && ++tried % 8 === 0) yield;
            }
        }
    }
    /* The tiles and natural stairs within `radius` cells of (col, row), worked out a row at a time. Nothing in the world changes: it only fills the
       terrain's caches, so the structure that comes next reads them instead of computing them all in one go. */
    *_warmTerrainSteps(col, row, radius) {
        const t = this.terrain;
        for (let r = row - radius; r <= row + radius; r++) {
            for (let c = col - radius; c <= col + radius; c++) t.getTileAt(c, r);
            yield;
        }
        if (!t.getStairAt) return;
        const B = t.STAIR_BLOCK || 32;
        for (let r = row - radius; r <= row + radius + B; r += B) {
            for (let c = col - radius; c <= col + radius + B; c += B) { t.getStairAt(c, r); yield; }
        }
    }

    // ------------------------------------------------------------------ ahead of the player

    /**
     * Called every overworld frame with where the player stands: spends up to `budgetMs` on the structures of the chunks around them (nearest first,
     * up to AHEAD_RADIUS chunks away), so a village is planned bit by bit before the player gets near it instead of all at once when they do.
     */
    prepareAhead(col, row, budgetMs = 4) {
        if (gameState.world.isInterior || !this.GENERATE_MAP_OBJECTS) return;
        const deadline = performance.now() + budgetMs;
        const pcx = Math.floor(col / this.CHUNK_SIZE), pcy = Math.floor(row / this.CHUNK_SIZE);
        while (performance.now() < deadline) {
            if (!this._structureJob) {
                const next = this._nextChunkAhead(pcx, pcy);
                if (!next) break;
                if (!this._claimStructureChunk(next.cx, next.cy)) continue;
                this._structureJob = this._spawnStructuresSteps(next.cx, next.cy, true);
            }
            if (this._structureJob.next().done) this._structureJob = null;
        }
        /* every structure around is planned: the time left goes on generating the chunks just beyond the view, nearest first, so walking into a
           new row of chunks finds them ready (a chunk is one piece of work, so one is only started with a couple of milliseconds left) */
        while (!this._structureJob && deadline - performance.now() > 2) {
            const chunk = this._nextChunkToGenerate(pcx, pcy);
            if (!chunk) break;
            this.generateChunk(chunk.cx, chunk.cy, `${chunk.cx},${chunk.cy}`);
        }
    }
    /* the nearest chunk within PREGEN_RADIUS of the player's that is not generated yet, or null */
    _nextChunkToGenerate(pcx, pcy) {
        for (let d = 0; d <= PREGEN_RADIUS; d++) {
            for (let dy = -d; dy <= d; dy++) {
                for (let dx = -d; dx <= d; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
                    if (!this.chunks.has(`${pcx + dx},${pcy + dy}`)) return { cx: pcx + dx, cy: pcy + dy };
                }
            }
        }
        return null;
    }
    /* the nearest chunk within AHEAD_RADIUS whose structure has not been rolled yet, or null */
    _nextChunkAhead(pcx, pcy) {
        const record = this._structureRecord();
        for (let d = 0; d <= AHEAD_RADIUS; d++) {
            for (let dy = -d; dy <= d; dy++) {
                for (let dx = -d; dx <= d; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
                    const key = `${pcx + dx},${pcy + dy}`;
                    if (!this._structureSpawnedChunks.has(key) && !record.chunks[key]) return { cx: pcx + dx, cy: pcy + dy };
                }
            }
        }
        return null;
    }
    /* Finish the structure being planned ahead (before a save, or before the overworld is left for a house or a cave). */
    finishPendingWork() { this._finishStructureJob(); }
    /* Forget it unfinished: only when this world is being thrown away (a new game, a loaded save). */
    dropPendingWork() { this._structureJob = null; }
    _finishStructureJob() {
        const job = this._structureJob;
        this._structureJob = null;
        if (job) drain(job);
    }
    /**
     * The world around (col, row) built ahead, in steps (for a loading screen: run it a few milliseconds a frame). Every structure within
     * AHEAD_RADIUS chunks, then the chunks within PREBUILD_RADIUS generated. Yields { done, total } as it goes.
     */
    *prebuildSteps(col, row) {
        if (gameState.world.isInterior || !this.GENERATE_MAP_OBJECTS) return;
        this._finishStructureJob();
        const pcx = Math.floor(col / this.CHUNK_SIZE), pcy = Math.floor(row / this.CHUNK_SIZE);
        const todo = [];
        for (let d = 0; d <= AHEAD_RADIUS; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d) todo.push([pcx + dx, pcy + dy]);
        const chunks = [];
        for (let dy = -PREBUILD_RADIUS; dy <= PREBUILD_RADIUS; dy++) for (let dx = -PREBUILD_RADIUS; dx <= PREBUILD_RADIUS; dx++) chunks.push([pcx + dx, pcy + dy]);
        const total = todo.length + chunks.length;
        let done = 0;
        for (const [cx, cy] of todo) {
            if (this._claimStructureChunk(cx, cy)) {
                for (const _ of this._spawnStructuresSteps(cx, cy, true)) yield { done, total };
            }
            done++;
            yield { done, total };
        }
        for (const [cx, cy] of chunks) {
            const key = `${cx},${cy}`;
            if (!this.chunks.has(key)) this.generateChunk(cx, cy, key);
            done++;
            yield { done, total };
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
        if (prefab.battlefield) this._battlefieldObjects(grid, prefab, rnd);
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
    /* A battlefield (a prefab with `battlefield`, see structures.js): the centre object in the middle, then `bodies` fallen soldiers at random cells,
       none touching the centre or another body (they are 2 x 2 tiles of art), and a few loose stones. Decided per cell from the seed. */
    _battlefieldObjects(grid, prefab, rnd) {
        const bf = prefab.battlefield;
        const W = prefab.width, H = prefab.height;
        const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
        if (bf.centre && MAP_OBJECTS_DEFINITIONS[bf.centre]) grid[cy][cx] = bf.centre;
        const lo = Math.max(1, bf.bodies?.min ?? 5), hi = Math.max(lo, bf.bodies?.max ?? 8);
        const want = lo + Math.floor(rnd(0, 0, 21) * (hi - lo + 1));
        const cells = [];
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cells.push({ c, r, k: rnd(c, r, 22) });
        cells.sort((a, b) => a.k - b.k);
        const taken = [{ c: cx, r: cy }];
        const near = (c, r) => taken.some(t => Math.abs(t.c - c) <= 1 && Math.abs(t.r - r) <= 1);
        let placed = 0;
        for (const { c, r } of cells) {
            if (placed >= want) break;
            if (grid[r][c] !== null || near(c, r) || c >= W - 1 || r < 1) continue;   // (2 x 2 art: keep it inside the box)
            const id = bf.pool[Math.floor(rnd(c, r, 23) * bf.pool.length) % bf.pool.length];
            if (!MAP_OBJECTS_DEFINITIONS[id]) continue;
            grid[r][c] = id;
            taken.push({ c, r });
            placed++;
        }
        // bones, then loose stones, in the free grass (not under the remains or a body)
        const strew = (spec, s1, s2) => {
            if (!spec || !spec.pool?.length) return;
            for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
                if (grid[r][c] !== null || near(c, r)) continue;
                if (rnd(c, r, s1) < spec.chance) {
                    const id = spec.pool[Math.floor(rnd(c, r, s2) * spec.pool.length) % spec.pool.length];
                    if (MAP_OBJECTS_DEFINITIONS[id]) grid[r][c] = id;
                }
            }
            // at least `min` of them: the rest go on the free cells the seed ranks first
            const placed = grid.flat().filter(id => spec.pool.includes(id)).length;
            if (spec.min && placed < spec.min) {
                const free = [];
                for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === null && !near(c, r)) free.push([rnd(c, r, s1 + 2), c, r]);
                free.sort((a, b) => a[0] - b[0]);
                for (const [, c, r] of free.slice(0, spec.min - placed)) {
                    const id = spec.pool[Math.floor(rnd(c, r, s2) * spec.pool.length) % spec.pool.length];
                    if (MAP_OBJECTS_DEFINITIONS[id]) grid[r][c] = id;
                }
            }
        };
        strew(bf.bones, 26, 27);
        strew(bf.rocks, 24, 25);
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
            /* on a cliff level a dirt tile would be a pit, so a path there is only drawn as dirt (gameState.world.levelPaths, see isLevelPath); other tiles are left as they are.
               Asked before anything is written: painting a neighbour changes what a cell reads as. */
            const onCliff = prefab.terrain.map((line, r) => line.map((tileId, c) => tileId !== null && isPlateau(this.getTileAt(originCol + c, originRow + r))));
            let paths = false;
            for (let r = 0; r < prefab.height; r++) {
                for (let c = 0; c < prefab.width; c++) {
                    const tileId = prefab.terrain[r][c];
                    if (tileId === null) continue;
                    const key = this._s(originCol + c, originRow + r);
                    if (onCliff[r][c]) {
                        if (tileId === 1) { gameState.world.levelPaths[key] = 1; paths = true; }
                        continue;
                    }
                    gameState.world.terrainOverrides[key] = tileId;
                    this.terrain.invalidateTile(key);
                }
            }
            if (paths) this.terrain.overrideVersion = (this.terrain.overrideVersion || 0) + 1;
        }
    }
    /* Can a structure of w x h cells stand with its top-left corner at (col, row)? Every cell is free (nothing written there yet), on one level, and
       not a cliff face or the ground under one. With `biomeId`, every cell is in that biome: a structure is dressed for the biome that rolled it,
       so it may not reach over a border (that is also where the rivers run). And no higher ground right beside it, or in the two rows above it
       (_higherNear): a house's roof, a tree's crown or a gravestone is drawn taller than its cell and would lie over the rock face. */
    _isStructureFootprintValid(col, row, w, h, biomeId = null) {
        const baseElev = this.getElevation(col, row);
        if (baseElev <= 0) return false;
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                const key = this._s(c, r);
                if (gameState.world.changes[key] !== undefined) return false;
                if (this.getElevation(c, r) !== baseElev) return false;
                if (this.isBlockedByFace(c, r)) return false;
                if (this.isCliffFace(c, r)) return false;
                if (biomeId && this.getBiomeAt(c, r).id !== biomeId) return false;
            }
        }
        return !this._higherNear(col, row, w, h, baseElev);
    }
    /* is any cell in the ring round the w x h box at (col, row), or in the two rows above it, on a higher level than `elev`? */
    _higherNear(col, row, w, h, elev) {
        for (let r = row - 2; r <= row + h; r++) {
            for (let c = col - 1; c <= col + w; c++) {
                const inside = r >= row && r < row + h && c >= col && c < col + w;
                if (!inside && this.getElevation(c, r) > elev) return true;
            }
        }
        return false;
    }
}

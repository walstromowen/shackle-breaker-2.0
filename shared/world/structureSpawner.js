// shared/world/structureSpawner.js
//
// Where a chunk's structure (a village, a graveyard) goes and how a PREFAB is written into the world: the objects of a prefab (wear, scatter, the
// graveyard's stones), the terrain it lays, and the check that a footprint is flat and free. Methods of the WorldManager, like the village planner:
// worldManager.js copies them onto WorldManager.prototype, so `this` is the WorldManager.
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { STRUCTURES } from './structures.js';
import { isPlateau } from './biomeDefinitions.js';
import { gameState } from '../core/gameState.js';

export class StructureSpawner {
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
}

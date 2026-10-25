// BlobTerrainRenderer - draws the ground and cliff levels of a biome from the nine generated blob-47 tilesets.
//
// A biome opts in with `blobTileset` in its definition (see biomeDefinitions.js). Cells of biomes without one are not drawn here.
//
// Pack options besides the nine image keys:
//   levelDirt  { scale, threshold } | function | null   dirt patches on the cliff levels (visual only)
//   water      false for packs without water (interiors): LAYER_0 cells are filled with `voidColor` instead of water and no water
//              sheets are needed
//   voidColor  CSS colour of the void (default '#000')
//   levelTop   'void' for interiors: the top of a cliff level (the roof of a wall) is void instead of floor, so only the wall face
//              (wall + ext) is drawn on those cells
//
// How the game's terrain maps onto the tilesets
//   LAYER_0  water   ground water patch (animated; always sits on a ground of dirt, so the shore fringe tints dirt)
//   LAYER_1  dirt    ground secondary floor (ground next to water is treated as dirt too, see info())
//   LAYER_2  grass   ground primary floor
//   LAYER_3  cliff level 1     LAYER_4  cliff level 2     LAYER_5  cliff level 3     LAYER_6, LAYER_7 ... (as many as TILE_TYPES lists)      (nested: a cell on level 3 is also on 2 and 1)
//
// The rules below are a port of the Python compositor that made the tilesets (composite_levels in godot_blob47_gen.py), so the
// result is pixel-identical to the demo maps. Draw order:
//   ground: grass, dirt patches (blob-47, running on under cliffs), strip fix under hanging faces, water
//   each level 1..3: cliff shadow on the cells around it, then per cell wall + ext (the face hanging into the cell below) + floor
//   + secondary overlay, then the strip fix for the cells under the next level's hanging faces.
//
// Everything about a cell depends only on its neighbourhood, so it is planned once and cached; only water changes per frame.

import {
    BLOB_TILE_PX,
    BLOB_SHEET_COLS,
    OVERLAY_COLS,
    OVERLAY_TABLE,
    SHADOW_COLS,
    SHADOW_TABLE,
    SHADOW_SPILL_TABLE,
    SHADOW_WIN_TABLE,
    WATER_FRAMES,
    WATER_VARIANTS,
    WATER_FRAME_SECONDS,
    STAIR_RECTS,
} from './blobTerrainTables.js';

const N = 1,
    NE = 2,
    E = 4,
    SE = 8,
    S = 16,
    SW = 32,
    W = 64,
    NW = 128;
const OFFS8 = [
    [N, 0, -1],
    [NE, 1, -1],
    [E, 1, 0],
    [SE, 1, 1],
    [S, 0, 1],
    [SW, -1, 1],
    [W, -1, 0],
    [NW, -1, -1],
];
// (the number of cliff levels is read from the LAYER_3, LAYER_4 ... entries of TILE_TYPES: this._levels)
// The cast shadow a cliff throws on the ground around it (the cliff_blob47_shadow sheet): one flat translucent shade, no gradient.
// Set to false to switch it off. It wraps round the cliffs the stairs make (see _stairCarved).
const SHADOW_WIN = Object.keys(SHADOW_WIN_TABLE).length > 0;   // this tile set has the window shadow table (flat shadows)
const DRAW_CLIFF_SHADOWS = true;

// A corner only counts when both of its sides are set (Godot's own blob-47 reduction).
function reduce(bm) {
    if (!(bm & N && bm & E)) bm &= ~NE;
    if (!(bm & S && bm & E)) bm &= ~SE;
    if (!(bm & S && bm & W)) bm &= ~SW;
    if (!(bm & N && bm & W)) bm &= ~NW;
    return bm;
}
// The 47 reduced masks in ascending order; mask i sits at column i % 8, row i >> 3 of every blob sheet.
const SHEET_POS = new Array(256).fill(null);
{
    const masks = [...new Set(Array.from({ length: 256 }, (_, i) => reduce(i)))].sort((a, b) => a - b);
    masks.forEach((m, i) => {
        SHEET_POS[m] = [i % BLOB_SHEET_COLS, i >> 3];
    });
}
function neighbourMask(get, x, y) {
    let bm = 0;
    for (const [bit, dx, dy] of OFFS8) if (get(x + dx, y + dy)) bm |= bit;
    return reduce(bm);
}
// Blob-47 mask over the neighbours that are dirt; a neighbour missing from the level's own mask counts as dirt.
function dirtMask(levelBm, isDirt, x, y) {
    let raw = 0;
    for (const [bit, dx, dy] of OFFS8) if (isDirt(x + dx, y + dy)) raw |= bit;
    return reduce(raw | (~levelBm & 255));
}

// ---- hashing / noise -------------------------------------------------------------------------------------------------------------
// Same hash the Python generator uses to pick an interior water variant and start frame (BigInt: the products exceed 2^53).
function cellHash(x, y, salt) {
    const v = ((BigInt(x) * 73856093n) ^ (BigInt(y) * 19349663n) ^ (BigInt(salt) * 83492791n)) * 2654435761n;
    return Number(BigInt.asUintN(32, v));
}
function lattice(i, j, seed) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, scale, seed) {
    x /= scale;
    y /= scale;
    const i = Math.floor(x),
        j = Math.floor(y);
    let u = x - i,
        v = y - j;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    const a = lattice(i, j, seed) * (1 - u) + lattice(i + 1, j, seed) * u;
    const b = lattice(i, j + 1, seed) * (1 - u) + lattice(i + 1, j + 1, seed) * u;
    return a * (1 - v) + b * v;
}

// Secondary-floor (dirt) patches on the cliff levels. The game's terrain has no dirt up there, so this is purely visual and
// deterministic per world seed. `levelDirt` in the biome's blobTileset: { scale, threshold }, a function (col,row,level)->bool, or null.
function makeLevelDirt(cfg, seed) {
    if (!cfg) return () => false;
    if (typeof cfg === 'function') return cfg;
    const scale = cfg.scale ?? 6,
        thr = cfg.threshold ?? 0.64;
    return (x, y, li) => {
        const s = (seed | 0) + li * 7919;
        return 0.65 * valueNoise(x, y, scale, s) + 0.35 * valueNoise(x, y, scale / 2, s + 1) > thr;
    };
}

// Image slots of a pack, in the order the plan's ops refer to them.
const SLOT = {
    void: -1,
    primary: 0,
    secondary: 1,
    onLevel: 2,
    cliffFloor: 3,
    cliffWall: 4,
    cliffExt: 5,
    cliffShadow: 6,
    waterAnim: 7,
    waterInterior: 8,
    cliffStairs: 9,
};
const PACK_KEYS = [
    'primaryFloor',
    'secondaryFloor',
    'secondaryOnLevel',
    'cliffFloor',
    'cliffWall',
    'cliffExt',
    'cliffShadow',
    'waterAnim',
    'waterInterior',
    'cliffStairs',
];

export class BlobTerrainRenderer {
    /** @param loader  your AssetLoader (loader.get(key) -> image)   @param config  your CONFIG (needs TILE_TYPES) */
    constructor(loader, config) {
        this.loader = loader;
        this.config = config;
        this.TILES = config.TILE_TYPES;
        // plateau tile id -> how many cliff levels it is on (LAYER_3 = 1, LAYER_4 = 2, ... as many as TILE_TYPES lists)
        this._lvById = new Map();
        for (let n = 3; this.TILES['LAYER_' + n] !== undefined; n++) this._lvById.set(this.TILES['LAYER_' + n], n - 2);
        this._levels = this._lvById.size;
        this._wm = null;
        this._version = -1;
        this._plans = new Map();
        this._infos = new Map();
        this._imgCache = new Map(); // pack -> [9 images] once all are loaded
        this._dirtFns = new Map(); // pack -> (col,row,level) -> bool, built from the pack's levelDirt settings and the world seed
    }

    // ---- what a cell is ----------------------------------------------------------------------------------------------------------
    // { lv: how many cliff levels the cell is on (0 = ground), dirt: ground secondary floor (dirt, and the bed under water), water }
    // Overridable, so tests can feed it a map that is not a worldManager.
    info(col, row) {
        const key = col * 4194304 + row;
        let i = this._infos.get(key);
        if (i) return i;
        const id = this._wm.getTileAt(col, row),
            T = this.TILES;
        const lv = this._lvById.get(id) || 0;
        // Ground that meets water (any of the 8 neighbours) is always the secondary floor, whatever the terrain says.
        let dirt = lv === 0 && (id === T.LAYER_0 || id === T.LAYER_1);
        if (lv === 0 && !dirt && (this._pack(col, row) || {}).water !== false) {
            for (let dy = -1; dy <= 1 && !dirt; dy++)
                for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && this._wm.getTileAt(col + dx, row + dy) === T.LAYER_0) dirt = true;
        }
        i = { lv, dirt, water: lv === 0 && id === T.LAYER_0 };
        this._infos.set(key, i);
        return i;
    }
    _pack(col, row) {
        let b = this._wm.getBiomeAt(col, row);
        // a river runs between two biomes: all of its water is drawn in one style, instead of changing colour down the middle at the border
        const terrain = this._wm.terrain;
        if (b && terrain && terrain.isRiverCell && this._wm.getTileAt(col, row) === this.TILES.LAYER_0 && terrain.isRiverCell(col, row)) b = terrain.getRiverBiome();
        return (b && b.blobTileset) || null;
    }

    /** True when this renderer draws the terrain of the cell (so MapRenderer must not draw its own tiles / wall faces there). */
    coversCell(col, row) {
        const p = this._plans.get(col * 4194304 + row);
        return !!(p && p.pack);
    }

    // ---- planning -----------------------------------------------------------------------------------------------------------------
    // Op = [slot, sheetCol, sheetRow, rowOffset]; rowOffset 1 draws into the cell below (the cliff face "ext" tile).
    plan(col, row) {
        const key = col * 4194304 + row;
        let p = this._plans.get(key);
        if (p) return p;
        const pack = this._pack(col, row);
        p = { pack, ground: null, water: null, levels: null };
        this._plans.set(key, p);
        if (!pack) return p;

        const lv = (x, y) => this.info(x, y).lv;
        const inLevel = (li) => (x, y) => lv(x, y) > li;
        const noWater = pack.water === false;
        // levelTop 'void': every cliff level has a void top. voidFromLayer N: only LAYER_N and up do (a cave's rim, while its ledges keep their floor).
        const voidAt = (li) => pack.levelTop === 'void' || (pack.voidFromLayer !== undefined && li + 3 >= pack.voidFromLayer);
        const gd = noWater
            ? (x, y) => {
                  const i = this.info(x, y);
                  return i.dirt && !i.water;
              }
            : (x, y) => this.info(x, y).dirt;
        const pos = (bm) => SHEET_POS[bm];
        const x = col,
            y = row;

        // ---------- ground ----------
        const above0 = inLevel(0);
        const cov0 = (a, b) => above0(a, b) || (above0(a, b - 1) && !above0(a, b)); // level 1's cells + the face hanging below them
        const groundEff = (a, b) => gd(a, b) || cov0(a, b); // dirt runs on under the rock
        const full = pos(255);
        const ground = [[SLOT.primary, full[0], full[1], 0]];
        if (gd(x, y)) {
            const t = pos(neighbourMask(groundEff, x, y));
            ground.push([SLOT.secondary, t[0], t[1], 0]);
        }
        // The cell under a hanging face shows only its bottom rows; if its texture differs from the cell below it, take the
        // texture of the cell below (the whole cell: the rock's lower edge has notches).
        if (!above0(x, y) && above0(x, y - 1)) {
            const want = gd(x, y + 1);
            if (want !== gd(x, y)) {
                if (want) ground.push([SLOT.secondary, full[0], full[1], 0]);
                else {
                    ground.length = 0;
                    ground.push([SLOT.primary, full[0], full[1], 0]);
                }
            }
        }
        p.ground = ground;

        // ---------- ground water (or void) ----------
        if (noWater) {
            if (this.info(x, y).water) p.ground = [[SLOT.void, 0, 0, 0]];
        } else if (this.info(x, y).water) {
            const bm = neighbourMask((a, b) => this.info(a, b).water, x, y);
            if (bm === 255)
                p.water = { interior: true, variant: cellHash(x, y, 1) % WATER_VARIANTS, start: cellHash(x, y, 2) % WATER_FRAMES };
            else p.water = { interior: false, pos: pos(bm) };
        }

        // ---------- cliff levels ----------
        if (lv(x, y) > 0 || this._nearLevel(x, y)) {
            const levels = [];
            for (let li = 0; li < this._levels; li++) {
                const voidTop = voidAt(li);
                const get = inLevel(li);
                const lp = { shadow: null, cell: null, fix: null };
                let any = false;

                // shadow: raw (unreduced) neighbour mask + whether the cell itself is in the level. The cells a stair is cut out of count as NOT in
                // the level here, so the shadow wraps round the cliff the stair makes (its notch walls and the ends of the cliff beside it).
                const sh = (a, b) => get(a, b) && !this._stairCarved(a, b);
                // pack.shadowErode (a cave): the overworld's rock hangs a whole cell below its last row (wall + ext), a cave's rock is one row tall (cliff_height 1). So the shadow
                // is computed as if every level ended one row earlier: the sides and the south edge of the shadow then start right at the cave's rock, and the north side,
                // which does not depend on the last row, stays exactly where the overworld puts it
                const shE = pack.shadowErode ? (a, b) => sh(a, b) && sh(a, b + 1) : sh;
                let t;
                if (SHADOW_WIN) {
                    // flat shadows: one tile per cell, picked by which cells of the 3 x 4 window (columns -1..1, rows -2..+1) are in the level, so the rock of
                    // faces two rows up (which a wide shadow reaches past) and of stepped cliff ends is seen by every cell it shades
                    let k = 0, b = 0;
                    for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++, b++) if (shE(x + dx, y + dy)) k |= 1 << b;
                    t = SHADOW_WIN_TABLE[k];
                } else {
                    let m = 0;
                    for (const [bit, dx, dy] of OFFS8) if (sh(x + dx, y + dy)) m |= bit;
                    const inL = sh(x, y);
                    t = SHADOW_TABLE[m + (inL ? 256 : 0)];
                    if (!t && !inL && !sh(x, y - 1)) {
                        // a wide shadow under a south face reaches past the 6 px left in the cell under the rock: the cell above spills into this one
                        let mu = 0;
                        for (const [bit, dx, dy] of OFFS8) if (sh(x + dx, y - 1 + dy)) mu |= bit;
                        t = SHADOW_SPILL_TABLE[mu];
                    }
                }
                if (t && DRAW_CLIFF_SHADOWS && pack.shadows !== false) {
                    lp.shadow = [SLOT.cliffShadow, t[0], t[1], 0];
                    any = true;
                }

                const dirt0 = this._dirtFn(pack);
                // the floor of a south-open cell shows only its top rows above the rock, so it copies the cell above it
                const isDirt = (a, b) => (get(a, b) && !get(a, b + 1) && get(a, b - 1) ? dirt0(a, b - 1, li) : dirt0(a, b, li));
                const next = li + 1 < this._levels ? inLevel(li + 1) : null;
                const cov = next ? (a, b) => next(a, b) || (next(a, b - 1) && !next(a, b)) : () => false;
                const dirtEff = (a, b) => isDirt(a, b) || cov(a, b);

                if (get(x, y)) {
                    const bm = neighbourMask(get, x, y),
                        tp = pos(bm),
                        cell = [];
                    const open = bm !== 255;
                    if (open) {
                        cell.push([SLOT.cliffWall, tp[0], tp[1], 0]);
                        if (!(bm & S)) cell.push([SLOT.cliffExt, tp[0], tp[1], 1]); // the face hangs into the cell below
                    }
                    if (voidTop) cell.unshift([SLOT.void, 0, 0, 0]);
                    else cell.push(open ? [SLOT.cliffFloor, tp[0], tp[1], 0] : [SLOT.primary, tp[0], tp[1], 0]);
                    if (!voidTop && isDirt(x, y)) {
                        const o = OVERLAY_TABLE[bm * 256 + dirtMask(bm, dirtEff, x, y)];
                        cell.push([SLOT.onLevel, o[0], o[1], 0]);
                    }
                    lp.cell = cell;
                    any = true;
                }
                // strip fix for the cells under the NEXT level's hanging faces (this level's floor, snapped to the cell below)
                if (!voidTop && next && !next(x, y) && next(x, y - 1)) {
                    const want = isDirt(x, y + 1);
                    if (want !== isDirt(x, y)) {
                        const o = OVERLAY_TABLE[255 * 256 + 255];
                        lp.fix = want ? [SLOT.onLevel, o[0], o[1], 0] : [SLOT.primary, full[0], full[1], 0];
                        any = true;
                    }
                }
                levels.push(any ? lp : null);
            }
            if (levels.some(Boolean)) p.levels = levels;
        }
        return p;
    }
    // Cells within 1 of a level (shadows) or hanging faces (strip fix) - cheap pre-check so open ground does no level work.
    _nearLevel(x, y) {
        for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.info(x + dx, y + dy).lv > 0) return true;
        return false;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------------------
    _images(pack) {
        let imgs = this._imgCache.get(pack);
        if (imgs) return imgs;
        const need = pack.water === false ? 7 : PACK_KEYS.length; // packs without water need no water sheets
        imgs = PACK_KEYS.map((k) => (pack[k] ? this.loader.get(pack[k]) : null));
        if (imgs.slice(0, need).some((im) => !im)) return null; // not loaded yet: draw nothing for this pack this frame
        this._imgCache.set(pack, imgs);
        return imgs;
    }

    /**
     * Draw the blob terrain for every visible cell of a blob biome.
     * @param ctx          2d context
     * @param worldManager your WorldManager (needs getTileAt, getBiomeAt, ensureChunkLoaded, seed)
     * @param bounds       MapRenderer's view bounds {startCol,endCol,startRow,endRow} (end exclusive)
     * @param camX, camY   camera in world pixels (renderCamera)
     * @param scale        GAME_SCALE * resScale
     * @param totalTime    seconds
     */
    render(ctx, worldManager, bounds, camX, camY, scale, totalTime) {
        this._sync(worldManager);
        const TILE = this.config.TILE_SIZE;
        const c0 = bounds.startCol,
            c1 = bounds.endCol,
            r0 = bounds.startRow,
            r1 = bounds.endRow;

        // Make sure every chunk that can still change terrain around the view (structures overwrite tiles) is generated before planning.
        if (worldManager.ensureChunkLoaded) {
            const step = worldManager.CHUNK_SIZE || 16;
            for (let cy = Math.floor((r0 - 3) / step); cy <= Math.floor((r1 + 2) / step); cy++) {
                for (let cx = Math.floor((c0 - 3) / step); cx <= Math.floor((c1 + 2) / step); cx++)
                    worldManager.ensureChunkLoaded(cx * step, cy * step);
            }
            this._sync(worldManager); // structures may have bumped the override version
        }

        const cells = [];
        for (let r = r0; r < r1; r++)
            for (let c = c0; c < c1; c++) {
                const p = this.plan(c, r);
                if (p.pack) cells.push(c, r, p);
            }
        if (!cells.length) return;

        // Tile edges: a tile spans px(c)..px(c + 1) (and py(r)..py(r + 1)), so neighbours share one edge exactly. Tiles are never drawn a pixel
        // larger to hide gaps: where translucent tiles (the cast shadow) overlapped, that left darker lines along the tile borders.
        const px = (c) => Math.floor((c * TILE - camX) * scale);
        const py = (r) => Math.floor((r * TILE - camY) * scale);
        const pw = (c) => px(c + 1) - px(c);
        const ph = (r) => py(r + 1) - py(r);
        const draw = (imgs, op, c, r, pack) => {
            if (op[0] < 0) {
                ctx.fillStyle = pack.voidColor || '#000';
                ctx.fillRect(px(c), py(r), pw(c), ph(r));
                return;
            }
            const img = imgs[op[0]];
            let sx = op[1] * BLOB_TILE_PX;
            // Cliff sheets may hold 8 variants side by side (see "variants" in blob47_manifest.json): the variant is the part of the long rock
            // strip under the cell, (column & 3) + 4 * (row & 1), so a straight run of cliff never repeats on a one-tile beat. A sheet
            // that is only one variant wide (the older sets) is drawn as before.
            if (op[0] === SLOT.cliffFloor || op[0] === SLOT.cliffWall || op[0] === SLOT.cliffExt || op[0] === SLOT.onLevel) {
                const baseW = (op[0] === SLOT.onLevel ? OVERLAY_COLS : BLOB_SHEET_COLS) * BLOB_TILE_PX;
                const nv = Math.round(img.width / baseW);
                if (nv > 1) sx += ((c & 3) + 4 * ((r + op[3]) & 1)) % nv * baseW;
            }
            ctx.drawImage(img, sx, op[2] * BLOB_TILE_PX, BLOB_TILE_PX, BLOB_TILE_PX, px(c), py(r + op[3]), pw(c), ph(r + op[3]));
        };
        const frame = Math.floor(totalTime / WATER_FRAME_SECONDS) % WATER_FRAMES;

        // ground (+ its water)
        for (let i = 0; i < cells.length; i += 3) {
            const c = cells[i],
                r = cells[i + 1],
                p = cells[i + 2],
                imgs = this._images(p.pack);
            if (!imgs) continue;
            for (const op of p.ground) draw(imgs, op, c, r, p.pack);
            const w = p.water;
            if (w) {
                if (w.interior) {
                    // open water: hashed variant + hashed start frame, so it does not pulse in lockstep
                    const f = (frame + w.start) % WATER_FRAMES;
                    ctx.drawImage(
                        imgs[SLOT.waterInterior],
                        (w.variant + f * WATER_VARIANTS) * BLOB_TILE_PX,
                        0,
                        BLOB_TILE_PX,
                        BLOB_TILE_PX,
                        px(c),
                        py(r),
                        pw(c),
                        ph(r),
                    );
                } else {
                    // shore: every cell on the same frame so the wash lines up along the bank
                    ctx.drawImage(
                        imgs[SLOT.waterAnim],
                        (w.pos[0] + frame * BLOB_SHEET_COLS) * BLOB_TILE_PX,
                        w.pos[1] * BLOB_TILE_PX,
                        BLOB_TILE_PX,
                        BLOB_TILE_PX,
                        px(c),
                        py(r),
                        pw(c),
                        ph(r),
                    );
                }
            }
        }
        // cliff levels, lowest first
        for (let li = 0; li < this._levels; li++) {
            for (let pass = 0; pass < 3; pass++) {
                // 0 shadows, 1 wall/ext/floor/overlay, 2 strip fix
                for (let i = 0; i < cells.length; i += 3) {
                    const p = cells[i + 2],
                        lp = p.levels && p.levels[li];
                    if (!lp) continue;
                    const imgs = this._images(p.pack);
                    if (!imgs) continue;
                    const c = cells[i],
                        r = cells[i + 1];
                    if (pass === 0) {
                        if (lp.shadow) draw(imgs, lp.shadow, c, r, p.pack);
                    } else if (pass === 1) {
                        if (lp.cell) for (const op of lp.cell) draw(imgs, op, c, r, p.pack);
                    } else if (lp.fix) draw(imgs, lp.fix, c, r, p.pack);
                }
            }
        }

        // stairs / ramps: whole pieces (2-3 cells wide, 2 tall) drawn over the cliff tiles they are cut into. TerrainGenerator.getStairAt says where.
        const terrain = worldManager.terrain;
        if (terrain && terrain.getStairAt) {
            const seen = new Set();
            for (let r = r0 - 2; r < r1 + 2; r++)
                for (let c = c0 - 3; c < c1 + 3; c++) {
                    const st = terrain.getStairAt(c, r);
                    if (!st || seen.has(st.id)) continue;
                    seen.add(st.id);
                    const pack = this._pack(st.ox, st.oy);
                    const imgs = pack && this._images(pack);
                    const sheet = imgs && imgs[SLOT.cliffStairs];
                    const rect = STAIR_RECTS[st.kind] && STAIR_RECTS[st.kind][st.style];
                    if (!sheet || !rect) continue;
                    ctx.drawImage(sheet, rect[0], rect[1], rect[2], rect[3], px(st.ox), py(st.oy), px(st.ox + rect[2] / BLOB_TILE_PX) - px(st.ox), py(st.oy + rect[3] / BLOB_TILE_PX) - py(st.oy));
                }
        }

        // depth shade (caves): a pack with `depthShade: { from: N, step: a, max: m, color: 'r,g,b' }` darkens a cell by `step` per layer below LAYER_N,
        // so the ledges of a cave get darker the deeper they are (the floor in the middle is the darkest)
        for (let i = 0; i < cells.length; i += 3) {
            const ds = cells[i + 2].pack.depthShade;
            if (!ds) continue;
            const c = cells[i], r = cells[i + 1];
            const lv = this.info(c, r).lv;
            const a = Math.min(ds.max !== undefined ? ds.max : 0.6, (ds.from - (lv > 0 ? lv + 2 : 2)) * ds.step);
            if (a <= 0) continue;
            ctx.fillStyle = 'rgba(' + (ds.color || '0,0,8') + ',' + a + ')';
            ctx.fillRect(px(c), py(r), pw(c), ph(r));
        }
    }

    // true for a cell the stair there cuts out of the plateau (see `carve` in TerrainGenerator.getStairAt): only the cast shadow looks at this
    _stairCarved(x, y) {
        const terrain = this._wm && this._wm.terrain;
        if (!terrain || !terrain.getStairAt) return false;
        const st = terrain.getStairAt(x, y);
        const k = st && st.carve;
        return !!k && x >= k[0] && x < k[0] + k[2] && y >= k[1] && y < k[1] + k[3];
    }

    _dirtFn(pack) {
        let f = this._dirtFns.get(pack);
        if (!f) {
            const natural = makeLevelDirt(pack.levelDirt, this._wm.seed), wm = this._wm;
            // the streets a village lays on a cliff level (WorldManager.isLevelPath) are dirt too
            f = (x, y, li) => (wm.isLevelPath && wm.isLevelPath(x, y)) || natural(x, y, li);
            this._dirtFns.set(pack, f);
        }
        return f;
    }

    // Drop cached plans when the world changes (new WorldManager / interior swap, or a structure rewrote tiles).
    _sync(worldManager) {
        const terrain = worldManager.terrain;
        const version = (terrain && terrain.overrideVersion) || 0;
        if (worldManager !== this._wm || version !== this._version || this._plans.size > 80000) {
            this._wm = worldManager;
            this._version = version;
            this._plans.clear();
            this._infos.clear();
            this._dirtFns.clear();
        }
    }
}
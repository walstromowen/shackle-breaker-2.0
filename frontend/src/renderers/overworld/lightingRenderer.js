import { gameState } from '../../../../shared/state/gameState.js';

/* LightingRenderer - tile light map: coloured lights that fade a fixed amount per tile and seep into walls.
 *
 * How a light is worked out
 *   1. Every light floods outwards over the tile grid. The distance travelled grows by 1 per tile step (CONFIG.LIGHT_DIAGONAL_COST per diagonal step, and a
 *      knight's move, 2 across and 1 along, costs its true length), so in the open the light spreads in a round pool with no creases along the diagonals.
 *      The light's strength at a tile is  maxAlpha * (1 - distance / radius): a fixed amount lost per tile (CONFIG.LIGHT_EDGE_EASE rounds off the tip and the rim).
 *   2. A wall tile does not stop the light, it eats some of it: stepping into a blocking tile costs CONFIG.LIGHT_WALL_ABSORB extra tiles of distance
 *      (default 3). A thin wall lets a dim glow through, a thick cliff swallows the light within a tile or two, and the wall face you look at is lit.
 *   3. Lights have a colour. The three colour channels are kept apart, so a warm torch next to a cold lamp mix where they meet.
 *   4. The result is one light value per tile, blurred a little (CONFIG.LIGHT_SMOOTHING passes of a 3 x 3 blur, so the edges of walls and the last creases
 *      melt away), then drawn as a small image scaled up with smoothing, so tile steps blend into a smooth gradient.
 *
 * What blocks light (see cellInfo / makeAbsorb)
 *   - A cliff level that is higher than the level the light stands on (a light on the ground is dimmed by the cliff; a light on top of the cliff shines
 *     down off its edge). The cells a stair is cut out of do not block.
 *   - A map object (not a ground object) with `blocksLight: true` in its definition (absorbs CONFIG.LIGHT_WALL_ABSORB), or `blocksLight: <number>` for
 *     its own absorption in tiles. It blocks on the tiles of its hitboxes (the same shape as its collision), or on its whole w x h without hitboxes.
 *     MapObjectModel copies `blocksLight` from the definition. Objects that appear or disappear are noticed by themselves.
 *   Nothing else blocks, so trees and bushes without the flag let the light through.
 *
 * A light's definition (the `light` of a map object definition or of an entity):
 *     { hasLight, radius (tiles), maxAlpha (strength 0..1, default 1; `strength` is accepted as another name), color, flickerAmp, flickerSpeed }
 *   `color` is optional: '255, 120, 50' (as in the object definitions), 'rgb(255,120,50)', '#ff7832', [255, 120, 50] or { r, g, b }. Its brightest channel is
 *   scaled to full, so only the hue matters, and CONFIG.LIGHT_COLOR_TINT says how much of that hue shows (1 = the pure colour, 0 = white). No colour =
 *   plain white light. `flickerSpeed` 0.1 (the default) is the speed the flicker always had; more = faster.
 *
 * Drawing: the darkness is a per-channel blend between the lit scene and the ambient colour, L being the light (0..1) of that channel:
 *     result = scene * ((1 - A) + A * L)  +  A * ambient * (1 - L)
 * which is the old "ambient colour at alpha A, with holes" for white light. It is drawn as a 'multiply' layer followed by a 'lighter' layer.
 *
 * Called from MapRenderer.renderMap as render(ctx, ambient, renderCamera, entities, lightObjects, worldManager, interpolationFactor). Without a worldManager
 * nothing blocks.
 */

const DEFAULT_DIAGONAL = 1.41;  // distance of a diagonal step: 1 = square pools, 1.41 = round pools, 2 = diamonds (4-way spreading)
const DEFAULT_SMOOTHING = 1;    // passes of the 3 x 3 blur over the finished light map (0 = none)
const DEFAULT_EASE = 0.5;       // 0 = the light fades in a straight line, 1 = fully eased (soft tip and soft rim)
const DEFAULT_ABSORB = 3;       // tiles of distance a wall tile costs the light that enters it
const DEFAULT_TINT = 0.6;       // how much of a light's colour shows: 1 = the pure colour, 0 = white light
const KEY = (c, r) => c * 4194304 + r;
/* 4 straight steps, 4 diagonal steps, then 8 knight's moves (2 across, 1 along). The knight's moves are what make the pool round: with 8 directions only
   the distance error is up to 8%, and the light shows straight creases along the axes and the diagonals; with 16 it is under 3% and the creases are gone. */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
    [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [-1, 2], [1, -2], [-1, -2]];

/* Spread a light from the point (px, py) (tile units: tile (c, r) covers c..c+1, r..r+1) as far as `reach` tiles of travelled distance.
   absorbAt(c, r) = extra tiles of distance for entering that tile (0 for open ground). The light starts in the four tile centres around the point, each
   at its real distance from it, so a light that moves a little moves its whole pool a little (no jump when it crosses into the next tile).
   Returns the lit tiles as parallel arrays { c, r, d }: tile, and the distance travelled to its centre. */
export function traceLight(px, py, reach, absorbAt, diag = DEFAULT_DIAGONAL) {
    const hc = Math.floor(px), hr = Math.floor(py);
    const knight = Math.min(Math.hypot(2, 1), diag + 1);       // a knight's move: its true length, but never more than a diagonal step plus a straight one
    const half = Math.ceil(reach) + 2, S = half * 2 + 1;       // every tile the light can reach lies in this square window around its own tile
    const dist = new Float64Array(S * S).fill(Infinity);  // 64-bit: the heap holds 64-bit distances, which a 32-bit copy would round below and wrongly call stale
    const done = new Uint8Array(S * S);
    const ab = new Float32Array(S * S).fill(-1);               // absorbAt of each window tile, looked up once
    const idx = (c, r) => (r - hr + half) * S + (c - hc + half);
    const absorb = (c, r, i) => (ab[i] >= 0 ? ab[i] : (ab[i] = absorbAt(c, r)));
    // binary min-heap in two parallel arrays (distance, window index); stale entries are skipped when popped
    const hg = [], hi = [];
    const push = (g, id) => {
        let i = hg.length;
        hg.push(g); hi.push(id);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (hg[p] <= g) break;
            hg[i] = hg[p]; hi[i] = hi[p]; i = p;
        }
        hg[i] = g; hi[i] = id;
    };
    const cx = Math.floor(px - 0.5), cy = Math.floor(py - 0.5);
    for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
            const c = cx + i, r = cy + j, id = idx(c, r);
            let g = Math.hypot(px - (c + 0.5), py - (r + 0.5));
            if (!(c === hc && r === hr)) g += absorb(c, r, id);   // the tile the light stands in never absorbs
            if (g <= reach && g < dist[id]) { dist[id] = g; push(g, id); }
        }
    }
    while (hg.length) {
        const g0 = hg[0], id = hi[0];
        const lg = hg.pop(), li = hi.pop();
        const len = hg.length;
        if (len) {                                              // sift the last entry down from the root
            let i = 0;
            for (;;) {
                let l = 2 * i + 1;
                if (l >= len) break;
                if (l + 1 < len && hg[l + 1] < hg[l]) l++;
                if (hg[l] >= lg) break;
                hg[i] = hg[l]; hi[i] = hi[l]; i = l;
            }
            hg[i] = lg; hi[i] = li;
        }
        if (done[id] || g0 > dist[id]) continue;
        done[id] = 1;
        const cc = hc - half + (id % S), cr = hr - half + ((id / S) | 0);
        for (let d = 0; d < 16; d++) {
            const nc = cc + DIRS[d][0], nr = cr + DIRS[d][1];
            if (nc < hc - half || nc > hc + half || nr < hr - half || nr > hr + half) continue;
            const nid = idx(nc, nr);
            if (done[nid]) continue;
            if (d >= 8) {       // a knight's move jumps over the two tiles between: only when both are open, so it never slips light through a thin wall
                const sx = Math.sign(DIRS[d][0]), sy = Math.sign(DIRS[d][1]), long = Math.abs(DIRS[d][0]) === 2;
                const ac = long ? cc + sx : cc, ar = long ? cr : cr + sy;               // the tile next to the current one, on the long side
                const bc = long ? cc + sx : cc + DIRS[d][0], br = long ? cr + DIRS[d][1] : cr + sy;   // and the one diagonal to it
                const free = (c, r) => (c === hc && r === hr) || absorb(c, r, idx(c, r)) === 0;
                if (!free(ac, ar) || !free(bc, br)) continue;
            }
            const g = g0 + (d < 4 ? 1 : d < 8 ? diag : knight) + absorb(nc, nr, nid);
            if (g <= reach && g < dist[nid]) { dist[nid] = g; push(g, nid); }
        }
    }
    let n = 0;
    for (let i = 0; i < dist.length; i++) if (dist[i] !== Infinity) n++;
    const out = { c: new Int32Array(n), r: new Int32Array(n), d: new Float32Array(n) };
    for (let i = 0, k = 0; i < dist.length; i++) {
        if (dist[i] === Infinity) continue;
        out.c[k] = hc - half + (i % S);
        out.r[k] = hr - half + ((i / S) | 0);
        out.d[k] = dist[i];
        k++;
    }
    return out;
}

/* Multiply the per-channel darkness `dark` (cols x rows tiles x 3 channels, 1 = dark, 0 = fully lit, origin = tile (c0, r0)) by one traced light.
   Strength at distance d is maxAlpha * (1 - d / radius), eased by `ease` (0..1, see DEFAULT_EASE), times the colour of the light for each channel. */
export function addLight(dark, cols, rows, c0, r0, trace, radius, maxAlpha, color, ease = 0) {
    if (!(radius > 0)) return;
    for (let k = 0; k < trace.d.length; k++) {
        const d = trace.d[k];
        if (d >= radius) continue;
        const c = trace.c[k] - c0, r = trace.r[k] - r0;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const x = 1 - d / radius;
        const s = maxAlpha * (ease > 0 ? x + ease * (x * x * (3 - 2 * x) - x) : x);    // a straight fade, eased towards smoothstep by `ease`: no sharp tip, no hard rim
        const i = (r * cols + c) * 3;
        dark[i] *= 1 - s * color[0];
        dark[i + 1] *= 1 - s * color[1];
        dark[i + 2] *= 1 - s * color[2];
    }
}

/* Blur the per-channel darkness map with a 3 x 3 binomial kernel (1 2 1), `passes` times. Tiles outside the map count as their nearest edge tile.
   `tmp` is scratch space of the same size. */
export function smoothDark(dark, cols, rows, passes, tmp) {
    for (let pass = 0; pass < passes; pass++) {
        for (let r = 0; r < rows; r++) {                       // across
            for (let c = 0; c < cols; c++) {
                const i = (r * cols + c) * 3, a = c > 0 ? i - 3 : i, b = c < cols - 1 ? i + 3 : i;
                tmp[i] = (dark[a] + 2 * dark[i] + dark[b]) * 0.25;
                tmp[i + 1] = (dark[a + 1] + 2 * dark[i + 1] + dark[b + 1]) * 0.25;
                tmp[i + 2] = (dark[a + 2] + 2 * dark[i + 2] + dark[b + 2]) * 0.25;
            }
        }
        for (let r = 0; r < rows; r++) {                       // down
            const up = r > 0 ? r - 1 : r, dn = r < rows - 1 ? r + 1 : r;
            for (let c = 0; c < cols; c++) {
                const i = (r * cols + c) * 3, a = (up * cols + c) * 3, b = (dn * cols + c) * 3;
                dark[i] = (tmp[a] + 2 * tmp[i] + tmp[b]) * 0.25;
                dark[i + 1] = (tmp[a + 1] + 2 * tmp[i + 1] + tmp[b + 1]) * 0.25;
                dark[i + 2] = (tmp[a + 2] + 2 * tmp[i + 2] + tmp[b + 2]) * 0.25;
            }
        }
    }
}

/* blocksLight value -> absorption in tenths of a tile: a number is that many tiles, anything else truthy = 255 = the default absorption. */
const tenths = (v) => (typeof v === 'number' ? Math.max(1, Math.min(254, Math.round(v * 10))) : 255);

const WHITE = [1, 1, 1];
const colorCache = new Map();
/* A light colour as [r, g, b] in 0..1 with the brightest channel at 1. Accepts '255, 120, 50' (what the object definitions use), 'rgb(255,120,50)',
   '#rgb', '#rrggbb', [r,g,b] (0..255) and { r, g, b }. */
export function parseLightColor(c) {
    if (!c) return WHITE;
    const key = typeof c === 'string' ? c : Array.isArray(c) ? c.join(',') : (c.r + ',' + c.g + ',' + c.b);
    let v = colorCache.get(key);
    if (v) return v;
    let r = 255, g = 255, b = 255;
    if (typeof c === 'string') {
        let m = /^#([0-9a-f]{3})$/i.exec(c.trim());
        if (m) { const h = m[1]; r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16); }
        else if ((m = /^#([0-9a-f]{6})$/i.exec(c.trim()))) { const h = m[1]; r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
        else if ((m = /^(?:rgba?\()?\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)/i.exec(c.trim()))) { r = +m[1]; g = +m[2]; b = +m[3]; }
    } else if (Array.isArray(c)) { [r, g, b] = c; }
    else { r = c.r; g = c.g; b = c.b; }
    const top = Math.max(r, g, b);
    v = top > 0 ? [r / top, g / top, b / top] : WHITE;
    colorCache.set(key, v);
    return v;
}

export class LightingRenderer {
    constructor(config) {
        this.config = config;
        this.diag = config.LIGHT_DIAGONAL_COST ?? DEFAULT_DIAGONAL;
        this.wallAbsorb = config.LIGHT_WALL_ABSORB ?? DEFAULT_ABSORB;
        this._dark = null;        // per-channel darkness of the view, one entry per tile
        this._mul = null;         // the 'multiply' layer: small canvas, one pixel per tile
        this._add = null;         // the 'lighter' layer
        this._memo = null;        // per-frame memo of cellInfo for the tiles around the view: Int32Array, 0 = not looked up yet, else (info + 1)
        this._memoBox = null;     // { c0, r0, w, h } of the memo
        this.tint = config.LIGHT_COLOR_TINT ?? DEFAULT_TINT;
        this.smoothing = Math.max(0, Math.round(config.LIGHT_SMOOTHING ?? DEFAULT_SMOOTHING));
        this.ease = Math.min(1, Math.max(0, config.LIGHT_EDGE_EASE ?? DEFAULT_EASE));
        this._tmp = null;         // scratch for the blur
        this._blockers = new Map(); // tile -> absorption (tenths of a tile) of the blocksLight objects near the view, rebuilt every frame
        this._blockSig = null;      // fingerprint of all blocksLight objects: a change drops the remembered traces
        this._useObjects = false;   // true when the world manager can list its objects (getActiveObjects); else blockers are read tile by tile
        this._traces = new Map(); // light on a map object -> its traced tiles (they never move); dropped when the terrain changes, see invalidate()
        this._tracesWm = null;
        this._tracesVersion = -1;
        // tile id -> how many cliff levels it is on (LAYER_3 = 1, LAYER_4 = 2 ... as in BlobTerrainRenderer)
        this._lvById = new Map();
        const T = config.TILE_TYPES || {};
        for (let n = 3; T['LAYER_' + n] !== undefined; n++) this._lvById.set(T['LAYER_' + n], n - 2);
    }

    /* Cliff level and blocking object of a tile, remembered for the frame: level | (object << 4), where object is 0 (none), 255 (blocksLight: true) or the
       absorption in tenths of a tile (blocksLight: <number>). */
    cellInfo(wm, c, r) {
        const m = this._memoBox;
        let at = -1;
        if (m && c >= m.c0 && c < m.c0 + m.w && r >= m.r0 && r < m.r0 + m.h) {
            at = (r - m.r0) * m.w + (c - m.c0);
            const hit = this._memo[at];
            if (hit !== 0) return hit - 1;
        }
        const lv = this._lvById.get(wm.getTileAt(c, r)) || 0;
        let obj = 0;
        if (this._useObjects) {
            obj = this._blockers.get(KEY(c, r)) || 0;
        } else {                  // a world manager that cannot list its objects: ask the tile
            const o = wm.getTileData ? (wm.getTileData(c, r) || {}).object : null;
            if (o && !o.isGround && o.blocksLight) obj = tenths(o.blocksLight);
        }
        const v = lv | (obj << 4);
        if (at >= 0) this._memo[at] = v + 1;
        return v;
    }

    /* Collect the tiles the blocksLight objects block, for the tiles of the memo box, and a fingerprint of all of them. Blocking tiles = the tiles of the
       object's hitboxes (as collidesWith counts them), or its whole w x h without hitboxes. */
    gatherBlockers(wm) {
        const map = this._blockers;
        map.clear();
        const objs = wm && wm.getActiveObjects ? wm.getActiveObjects() : null;
        this._useObjects = !!objs;
        if (!objs) return 0;
        const box = this._memoBox;
        let sig = 0;
        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            if (!o.blocksLight || o.isGround) continue;
            const t = tenths(o.blocksLight);
            sig = (Math.imul(sig, 31) + Math.imul(o.col, 7919) + Math.imul(o.row, 104729) + t) | 0;
            if (o.col < box.c0 - 8 || o.col > box.c0 + box.w + 8 || o.row < box.r0 - 8 || o.row > box.r0 + box.h + 8) continue;
            const boxes = o.hitboxes && o.hitboxes.length ? o.hitboxes : [{ xOffset: 0, yOffset: 0, w: o.w || 1, h: o.h || 1 }];
            for (const hb of boxes) {
                const left = o.col + (hb.xOffset || 0), top = o.row + (hb.yOffset || 0);
                for (let r = top; r < top + (hb.h || 1); r++) {
                    for (let c = left; c < left + (hb.w || 1); c++) {
                        const k = KEY(c, r);
                        map.set(k, Math.max(map.get(k) || 0, t));
                    }
                }
            }
        }
        return sig;
    }

    /* Forget the remembered light of map-object lights. Normally not needed: a change of the terrain (terrain.overrideVersion, like BlobTerrainRenderer)
       and objects with blocksLight appearing or disappearing are noticed by themselves. */
    invalidate() {
        this._traces.clear();
    }

    /* True for a tile a stair is cut out of the cliff at (see BlobTerrainRenderer._stairCarved): it looks open, so it does not dim the light. */
    stairCarved(wm, c, r) {
        const terrain = wm.terrain;
        if (!terrain || !terrain.getStairAt) return false;
        const st = terrain.getStairAt(c, r);
        const k = st && st.carve;
        return !!k && c >= k[0] && c < k[0] + k[2] && r >= k[1] && r < k[1] + k[3];
    }

    /* absorbAt(c, r) for a light that stands on cliff level `level`: extra tiles of distance for entering the tile. */
    makeAbsorb(wm, level) {
        if (!wm || !wm.getTileAt) return () => 0;
        return (c, r) => {
            const v = this.cellInfo(wm, c, r);
            let a = 0;
            if ((v & 15) > level && !this.stairCarved(wm, c, r)) a = this.wallAbsorb;
            const obj = v >> 4;
            if (obj) a = Math.max(a, obj === 255 ? this.wallAbsorb : obj / 10);
            return a;
        };
    }

    /* Every light in the view as { x, y (tile units), light, fixed }. Positions are the middle of the entity's / map object's box. */
    collectLights(entities, mapObjects, interpolationFactor) {
        const { TILE_SIZE } = this.config;
        const out = [];
        if (entities) {
            for (const ent of entities) {
                if (!ent.light || !ent.light.hasLight) continue;
                const rx = ent.prevX !== undefined ? ent.prevX + (ent.x - ent.prevX) * interpolationFactor : ent.x;
                const ry = ent.prevY !== undefined ? ent.prevY + (ent.y - ent.prevY) * interpolationFactor : ent.y;
                out.push({ x: (rx + (ent.width || TILE_SIZE) / 2) / TILE_SIZE, y: (ry + (ent.height || TILE_SIZE) / 2) / TILE_SIZE, light: ent.light });
            }
        }
        if (mapObjects) {
            for (const obj of mapObjects) {
                if (!obj.light || !obj.light.hasLight) continue;
                out.push({ x: obj.col + obj.w / 2, y: obj.row + obj.h / 2, light: obj.light, fixed: true }); // a map object never moves: its trace can be remembered
            }
        }
        return out;
    }

    /* The colour of a light as the three channel weights: its hue, mixed with white by CONFIG.LIGHT_COLOR_TINT. */
    lightColor(c) {
        const hue = parseLightColor(c);
        if (hue === WHITE || this.tint >= 1) return hue;
        const t = Math.max(0, this.tint);
        return [1 - t * (1 - hue[0]), 1 - t * (1 - hue[1]), 1 - t * (1 - hue[2])];
    }

    /* A small canvas of cols x rows pixels (and its ImageData), re-made when the view size changes. */
    layer(old, cols, rows) {
        if (old && old.cv.width === cols && old.cv.height === rows) return old;
        const cv = document.createElement('canvas');
        cv.width = cols;
        cv.height = rows;
        const cx = cv.getContext('2d');
        return { cv, cx, img: cx.createImageData(cols, rows) };
    }

    render(ctx, baseAmbientData, renderCamera, entities, mapObjects = [], worldManager = null, interpolationFactor = 1) {
        // --- BLEND DAY/NIGHT WITH WEATHER ---
        let finalR = baseAmbientData.r;
        let finalG = baseAmbientData.g;
        let finalB = baseAmbientData.b;
        let finalA = baseAmbientData.a;
        const activeWeather = gameState.world.currentWeather;

        if (activeWeather && activeWeather.visualEffect === 'particle_rain') {
            const intensity = activeWeather.intensity || 1.0;
            const stormR = 15;
            const stormG = 20;
            const stormB = 35;
            const stormMaxAlpha = 0.65;

            finalR = Math.floor((finalR * (1 - intensity)) + (stormR * intensity));
            finalG = Math.floor((finalG * (1 - intensity)) + (stormG * intensity));
            finalB = Math.floor((finalB * (1 - intensity)) + (stormB * intensity));
            finalA = Math.max(finalA, stormMaxAlpha * intensity);
        } else if (activeWeather && activeWeather.visualEffect === 'particle_blizzard') {
            // a blizzard greys the day into a cold blue-grey dusk (lighter than a rain storm: the snow itself is bright)
            const intensity = activeWeather.intensity || 1.0;
            const coldR = 70, coldG = 84, coldB = 108;
            const coldMaxAlpha = 0.4;

            finalR = Math.floor((finalR * (1 - intensity)) + (coldR * intensity));
            finalG = Math.floor((finalG * (1 - intensity)) + (coldG * intensity));
            finalB = Math.floor((finalB * (1 - intensity)) + (coldB * intensity));
            finalA = Math.max(finalA, coldMaxAlpha * intensity);
        }

        // If completely bright (alpha 0 or less), do nothing
        if (finalA <= 0) return;

        const { width, height } = ctx.canvas;
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * (width / 800); // same scale as MapRenderer; renderCamera is already the top-left corner of the view

        // the tiles the overlay covers: the view plus one tile each side
        const c0 = Math.floor(renderCamera.x / TILE_SIZE) - 1;
        const r0 = Math.floor(renderCamera.y / TILE_SIZE) - 1;
        const c1 = Math.ceil((renderCamera.x + width / scale) / TILE_SIZE) + 1;
        const r1 = Math.ceil((renderCamera.y + height / scale) / TILE_SIZE) + 1;
        const cols = c1 - c0, rows = r1 - r0;

        // per-channel darkness of every tile: 1 everywhere, each light multiplies it down
        if (!this._dark || this._dark.length !== cols * rows * 3) this._dark = new Float32Array(cols * rows * 3);
        const dark = this._dark;
        dark.fill(1);

        const wm = worldManager;
        const lights = this.collectLights(entities, mapObjects, interpolationFactor);
        // memo box: the view plus the widest light's reach all round
        let pad = 2;
        for (const L of lights) pad = Math.max(pad, Math.ceil(L.light.radius + 0.15 * Math.abs(L.light.flickerAmp || 0)) + 3);
        const mw = cols + pad * 2, mh = rows + pad * 2;
        if (!this._memo || this._memo.length !== mw * mh) this._memo = new Int32Array(mw * mh);
        else this._memo.fill(0);
        this._memoBox = { c0: c0 - pad, r0: r0 - pad, w: mw, h: mh };
        // the remembered traces of map-object lights are only good while the terrain and the blocking objects are as they were
        const terrainVersion = (wm && wm.terrain && wm.terrain.overrideVersion) || 0;
        const blockSig = this.gatherBlockers(wm);
        if (wm !== this._tracesWm || terrainVersion !== this._tracesVersion || blockSig !== this._blockSig) {
            this._traces.clear();
            this._tracesWm = wm;
            this._tracesVersion = terrainVersion;
            this._blockSig = blockSig;
        }

        for (const L of lights) {
            const lc = L.light;
            let radius = lc.radius;
            if (lc.flickerAmp) {
                // flickerSpeed 0.1 is the speed the flicker always had; lights on map objects start at different points of it, so a row of torches does not pulse as one
                const time = Date.now() * 0.05 * (lc.flickerSpeed ?? 0.1) + (L.fixed ? (L.x * 12.9898 + L.y * 78.233) % 6.283 : 0);
                const noise = (Math.sin(time) + Math.sin(time * 3) * 0.5) * 0.1;
                radius += noise * lc.flickerAmp;
            }
            if (!(radius > 0)) continue;
            // far outside the view: nothing of it can reach the overlay
            if (L.x + radius < c0 || L.x - radius > c1 || L.y + radius < r0 || L.y - radius > r1) continue;
            const reach = lc.radius + 0.15 * Math.abs(lc.flickerAmp || 0) + 0.01;
            const level = wm && wm.getTileAt ? (this.cellInfo(wm, Math.floor(L.x), Math.floor(L.y)) & 15) : 0;
            let trace;
            if (L.fixed) {
                const key = L.x + ',' + L.y + ',' + reach + ',' + level;
                trace = this._traces.get(key);
                if (!trace) {
                    if (this._traces.size > 400) this._traces.clear();
                    trace = traceLight(L.x, L.y, reach, this.makeAbsorb(wm, level), this.diag);
                    this._traces.set(key, trace);
                }
            } else {
                trace = traceLight(L.x, L.y, reach, this.makeAbsorb(wm, level), this.diag);
            }
            addLight(dark, cols, rows, c0, r0, trace, radius, lc.maxAlpha ?? lc.strength ?? 1.0, this.lightColor(lc.color), this.ease);
        }
        if (this.smoothing > 0) {
            if (!this._tmp || this._tmp.length !== dark.length) this._tmp = new Float32Array(dark.length);
            smoothDark(dark, cols, rows, this.smoothing, this._tmp);
        }

        // light map -> two small canvases, one pixel per tile:  multiply layer = (1 - A) + A * L,  add layer = A * ambient * (1 - L)   (L = light of the channel)
        this._mul = this.layer(this._mul, cols, rows);
        this._add = this.layer(this._add, cols, rows);
        const mul = this._mul.img.data, add = this._add.img.data;
        const A = finalA, amb = [finalR, finalG, finalB];
        for (let t = 0, p = 0; t < cols * rows; t++, p += 4) {
            for (let ch = 0; ch < 3; ch++) {
                const L = 1 - dark[t * 3 + ch];
                mul[p + ch] = ((1 - A) + A * L) * 255;
                add[p + ch] = A * amb[ch] * (1 - L);
            }
            mul[p + 3] = 255;
            add[p + 3] = 255;
        }
        this._mul.cx.putImageData(this._mul.img, 0, 0);
        this._add.cx.putImageData(this._add.img, 0, 0);

        const px = (c) => Math.floor((c * TILE_SIZE - renderCamera.x) * scale);
        const py = (r) => Math.floor((r * TILE_SIZE - renderCamera.y) * scale);
        const dx = px(c0), dy = py(r0), dw = px(c1) - dx, dh = py(r1) - dy;
        ctx.save();
        ctx.imageSmoothingEnabled = true; // the game draws with smoothing off; the light must be soft
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this._mul.cv, 0, 0, cols, rows, dx, dy, dw, dh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this._add.cv, 0, 0, cols, rows, dx, dy, dw, dh);
        ctx.restore();
    }
}
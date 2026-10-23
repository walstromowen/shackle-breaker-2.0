import { gameState } from '../../../../shared/core/gameState.js';
import { BIOME_DEFINITIONS, FIRST_PLATEAU, CLIFF_LEVELS, layerIndex } from '../../../../shared/world/biomeDefinitions.js';

/* MinimapRenderer - a small round, north-up map of the terrain around the player, drawn in the bottom-left corner of the overworld screen.
 *
 * What it shows (one screen pixel block of CONFIG.MINIMAP.zoom per tile, CONFIG.MINIMAP.radius tiles each side of the player, so 2 x radius + 1 tiles across,
 * inside a circle; CONFIG.MINIMAP.shape = 'square' gives the square map back):
 *   - terrain by level: water, dirt, ground, and each cliff level a little more rocky (greyer / browner) than the one below; the rock face under a cliff edge is dark, so the
 *     outlines of the hills and plateaus read at a glance; the walkable part of a stair is a light strip. Ground, dirt and water take their colours from
 *     the biome of the tile: the `minimap` block of that biome in biomeDefinitions.js (a biome without one, or a colour missing from it, uses CONFIG.MINIMAP.colors).
 *     A thin line in the colour of that level's cliff face (CONFIG.MINIMAP.outline pixels wide) runs along the north, east and west edge of every cliff level
 *     where the land next to it is lower, so the outline of each plateau shows (the south edge is the rock face itself). It is not drawn next to a stair.
 *     The levels come from biomeDefinitions.js too (layerIndex, FIRST_PLATEAU, CLIFF_LEVELS), so a taller TOP_LAYER needs no change here.
 *   - buildings (solid objects of 6+ tiles without an interaction, e.g. the houses) as brown blocks, and dots for doors (WARP) and crafting stations
 *     (CONFIG.MINIMAP.markers: interaction type -> colour). Trees, rocks, pickups, chests and encounters are not shown.
 *   - a faint rectangle for the part of the world the main view shows, and an arrow for the player that points the way the player faces.
 *
 * How it stays cheap: the terrain is painted once into small canvases of CHUNK x CHUNK tiles (zoom pixels per tile, so the outline can be thinner than a tile)
 * and put together into one picture of the map, which is only made again when the player enters another tile or a chunk finishes, so most frames are a single
 * drawImage. The map scrolls smoothly, but only ever by whole screen pixels (never between pixels), so nothing flickers or shows seams while the player
 * moves. New chunks are painted a few tiles per frame within CONFIG.MINIMAP.budgetMs, nearest the player
 * first (a chunk not painted yet shows as a dim version of the ground colour), so walking into new land never causes a hitch; chunks outside the circle are not painted at all. Chunks are painted again, one by one while the old
 * picture stays up, when the terrain changes (terrain.overrideVersion, e.g. a structure that rewrites tiles), and all are dropped when the world manager
 * changes. It reads tiles only (getTileAt, getBiomeAt, terrain.getStairAt): it never makes the world generate chunks, and the world cannot see it.
 *
 * Not drawn in interiors (gameState.world.isInterior) unless an Interior Map has been read there (gameState.world.interiorMapId === gameState.world.interiorId; the
 * item sets it, the scene manager clears it on leaving), and not when CONFIG.MINIMAP.enabled is false. Inside, the void outside the rooms is drawn dark (CONFIG.MINIMAP
 * colors.void) and the floor in a stone colour (colors.floor) instead of water / ground.
 *
 * Called from OverworldUIRenderer.render(ctx, state) as render(ctx, ui, state), with state = { camera, worldManager, entities } from the controller.
 */

const CHUNK = 16;

const DEFAULTS = {
    enabled: true,
    radius: 32,                    // tiles shown to each side of the player (the map is 2 x radius + 1 tiles across)
    zoom: 3,                       // screen pixels per tile (a whole number: it is rounded)
    outline: 1,                    // width in pixels of the cliff-coloured line along the north, east and west edge of a cliff level (0 = none)
    shape: 'circle',               // 'circle' or 'square'
    frame: 'rgba(168, 146, 112, 0.55)',   // colour of the ring round a circular map
    margin: 24,                    // distance of the panel from the left and bottom edges of the screen
    padding: 6,                    // frame around the map
    background: 'rgba(25, 23, 20, 0.75)',
    showView: true,                // outline of the area the main view shows
    budgetMs: 2,                   // time per frame spent painting new chunks
    prefetch: 16,                  // tiles beyond the map edge that are painted ahead of time, so land the player walks towards is ready before it scrolls in
    maxChunks: 150,                // painted chunks kept; the ones furthest from the player are dropped first
    markers: { WARP: '#ffd24a', CRAFTING_STATION: '#e8873a' },
    buildings: '#7a5a3c',
    colors: { grass: '#5b9448', dirt: '#8c6c47', water: '#3b73a6', rock: '#8f8b82', stair: '#f2e27a' },   // for a biome with no `minimap` block (or a colour missing from it)
    interior: { void: '#0e0d0b', floor: '#7d6e58' },   // inside an interior with a map: the void round the rooms, and the floor
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

/* The colours of one biome as [r, g, b] arrays: water, dirt, grass, stair, and per cliff level (index 0 = the first cliff level) its top and its rock face. */
function buildPalette(src) {
    const grass = hex(src.grass), rock = hex(src.rock);
    const top = [], face = [];
    for (let k = 1; k <= CLIFF_LEVELS; k++) {
        top.push(mix(grass, rock, Math.min(0.75, 0.16 * k)));       // higher land is more rock: the levels separate in light biomes (snow) as well as dark ones
        face.push(mix(rock, [0, 0, 0], Math.min(0.7, 0.3 + 0.05 * k)));
    }
    return { water: hex(src.water), dirt: hex(src.dirt), grass, stair: hex(src.stair), top, face };
}

const DIRS = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

export class MinimapRenderer {
    constructor(config) {
        this.config = config;
        const user = config.MINIMAP || {};
        this.cfg = {
            ...DEFAULTS, ...user,
            markers: user.markers || DEFAULTS.markers,
            colors: { ...DEFAULTS.colors, ...(user.colors || {}) },
        };
        this.cfg.zoom = Math.max(1, Math.round(this.cfg.zoom));
        this._pals = new Map();     // biome id -> palette
        this._wm = null;
        this._chunks = new Map();   // 'cx,cy' -> { cx, cy, cv, ver, job }
        this._marks = null;         // { t, list } buildings and doors near the player, refreshed a few times a second
        this._view = null;          // the picture of the map: { cv, ctx }, size x size pixels, made again when _viewKey / _viewGen change
        this._viewKey = null;       // the player's tile when _view was made
        this._viewGen = -1;         // _gen when _view was made
        this._gen = 0;              // counts the chunks that have been painted (or painted again)
        this._ph = [0, 0, 0];       // colour of land that is not painted yet
        this._inside = false;       // true while the picture is of an interior (set by render; a new world manager clears the chunks, so a chunk is never mixed)
    }

    /* The palette of a biome id: its `minimap` colours from biomeDefinitions.js over the defaults. Ids without a `minimap` block share one default palette. */
    _pal(id) {
        const src = BIOME_DEFINITIONS[id] && BIOME_DEFINITIONS[id].minimap, key = src ? id : '';
        let p = this._pals.get(key);
        if (!p) { p = buildPalette({ ...this.cfg.colors, ...src }); this._pals.set(key, p); }
        return p;
    }

    /* The colours used inside an interior, as [r, g, b] arrays (CONFIG.MINIMAP.interior over the defaults). */
    _interiorColors() {
        if (!this._ic) {
            const src = { ...DEFAULTS.interior, ...((this.config.MINIMAP && this.config.MINIMAP.interior) || {}) };
            this._ic = { void: hex(src.void), floor: hex(src.floor) };
        }
        return this._ic;
    }

    /* Is (c, r) a walkable cell of a stair? */
    _stair(wm, c, r) {
        const terrain = wm.terrain;
        if (!terrain || !terrain.getStairAt) return false;
        const st = terrain.getStairAt(c, r), w = st && st.walk;
        return !!(w && c >= w[0] && c < w[0] + w[2] && r >= w[1] && r < w[1] + w[3]);
    }

    /* Read the land of a chunk, one grid cell at a time until `deadline` (always at least one cell, so the picture keeps coming), then draw it. Returns true when
       the chunk is finished. The grid is the chunk plus a border of one tile (the outline and the rock face look at the neighbours): each cell is read once, its level
       and whether it is a stair, and the biome palette of the tiles inside. The clock is read after every cell: reading land nobody has been near yet can be slow,
       and a whole row at once could cost a frame. */
    _paint(e, wm, ver, deadline) {
        const G = CHUNK + 2;
        if (!e.cv) {                         // made once and never resized (resizing a canvas clears it, and an old picture stays up while a chunk is repainted)
            e.cv = document.createElement('canvas');
            e.cv.width = CHUNK * this.cfg.zoom;
            e.cv.height = CHUNK * this.cfg.zoom;
            e.ctx = e.cv.getContext('2d');
        }
        if (!e.job || e.job.ver !== ver) e.job = { ver, i: 0, lv: new Int8Array(G * G), st: new Uint8Array(G * G), pal: new Array(CHUNK * CHUNK), inside: this._inside };
        const job = e.job, N = G * G;
        let i = job.i;
        do {
            const gx = i % G, gy = (i / G) | 0, c = e.cx * CHUNK + gx - 1, r = e.cy * CHUNK + gy - 1;
            job.lv[i] = layerIndex(wm.getTileAt(c, r));      // 0 water, 1 dirt, 2 ground, FIRST_PLATEAU.. the cliff levels, -1 not a terrain level
            job.st[i] = this._stair(wm, c, r) ? 1 : 0;
            if (gx >= 1 && gx <= CHUNK && gy >= 1 && gy <= CHUNK) {
                const biome = wm.getBiomeAt(c, r);
                job.pal[(gy - 1) * CHUNK + gx - 1] = this._pal(biome && biome.id);
            }
            i++;
        } while (i < N && performance.now() < deadline);
        job.i = i;
        if (i < N) return false;
        this._draw(e, job);   // finished: show it. (The canvas of an old version stayed on screen until now.)
        e.ver = ver;
        e.job = null;
        this._gen++;
        return true;
    }

    /* Draw a chunk from its grid: one square of `zoom` pixels per tile, then the line (in the colour of the cliff face) along the edges of the cliff levels. */
    _draw(e, job) {
        const G = CHUNK + 2, Z = this.cfg.zoom, S = CHUNK * Z, o = Math.min(this.cfg.outline, Z), lv = job.lv, st = job.st;
        const img = e.ctx.createImageData(S, S), d = img.data;
        const fill = (x0, y0, w, h, rgb) => {
            for (let y = y0; y < y0 + h; y++) {
                let p = (y * S + x0) * 4;
                for (let x = 0; x < w; x++, p += 4) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255; }
            }
        };
        const inside = !!job.inside, iv = this._interiorColors();
        for (let ty = 0; ty < CHUNK; ty++) {
            for (let tx = 0; tx < CHUNK; tx++) {
                const g = (ty + 1) * G + tx + 1, n = lv[g], up = lv[g - G], pal = job.pal[ty * CHUNK + tx], stair = st[g] === 1;
                let rgb;
                if (stair) rgb = pal.stair;
                else if (up >= FIRST_PLATEAU && n >= 0 && up > n) rgb = pal.face[up - FIRST_PLATEAU];   // the rock face under the edge of a cliff
                else if (inside && n === 0) rgb = iv.void;                 // an interior: level 0 is the void round the rooms, not water
                else if (inside && (n < 0 || n === 1 || n === 2)) rgb = iv.floor;
                else if (n < 0 || n === 1) rgb = pal.dirt;
                else if (n === 0) rgb = pal.water;
                else if (n === 2) rgb = pal.grass;
                else rgb = pal.top[n - FIRST_PLATEAU];
                const x0 = tx * Z, y0 = ty * Z;
                fill(x0, y0, Z, Z, rgb);
                if (o > 0 && !stair && n >= FIRST_PLATEAU) {          // a cliff level: a line on each side (north, west, east) where the land beside it is lower
                    const lower = (k) => lv[k] >= 0 && lv[k] < n && st[k] === 0, edge = pal.face[n - FIRST_PLATEAU];
                    if (lower(g - G)) fill(x0, y0, Z, o, edge);
                    if (lower(g - 1)) fill(x0, y0, o, Z, edge);
                    if (lower(g + 1)) fill(x0 + Z - o, y0, o, Z, edge);
                }
            }
        }
        e.ctx.putImageData(img, 0, 0);
    }

    /* Make sure the chunks of the window (and `prefetch` tiles beyond it) have their pictures, painting a few tiles within the time budget: the chunks on
       screen first, nearest the player first, then the ones ahead of them. Drops chunks far from the player. `round`: only the chunks that touch the circle
       of the map (and the prefetch margin round it) count. */
    _update(wm, left, top, span, px, py, round = false) {
        const ver = (wm.terrain && wm.terrain.overrideVersion) || 0, pre = this.cfg.prefetch;
        const vc0 = Math.floor(left / CHUNK), vc1 = Math.floor((left + span) / CHUNK);
        const vr0 = Math.floor(top / CHUNK), vr1 = Math.floor((top + span) / CHUNK);
        const c0 = Math.floor((left - pre) / CHUNK), c1 = Math.floor((left + span + pre) / CHUNK);
        const r0 = Math.floor((top - pre) / CHUNK), r1 = Math.floor((top + span + pre) / CHUNK);
        const todo = [], half = span / 2;
        const gap = (cx, cy) => Math.hypot(Math.max(cx * CHUNK - px, 0, px - (cx * CHUNK + CHUNK)), Math.max(cy * CHUNK - py, 0, py - (cy * CHUNK + CHUNK)));   // from the player to the chunk
        for (let cy = r0; cy <= r1; cy++) {
            for (let cx = c0; cx <= c1; cx++) {
                if (round && gap(cx, cy) > half + pre) continue;        // a corner of the square that the circle does not show
                const key = cx + ',' + cy;
                let e = this._chunks.get(key);
                if (!e) { e = { cx, cy, cv: null, ctx: null, ver: -1, job: null }; this._chunks.set(key, e); }
                if (e.ver !== ver) todo.push(e);
            }
        }
        if (todo.length) {
            const dist = (e) => Math.hypot((e.cx + 0.5) * CHUNK - px, (e.cy + 0.5) * CHUNK - py);
            const seen = (e) => ((round ? gap(e.cx, e.cy) <= half : e.cx >= vc0 && e.cx <= vc1 && e.cy >= vr0 && e.cy <= vr1) ? 0 : 1);
            todo.sort((a, b) => seen(a) - seen(b) || dist(a) - dist(b));
            const deadline = performance.now() + this.cfg.budgetMs;
            for (const e of todo) {
                this._paint(e, wm, ver, deadline);
                if (performance.now() >= deadline) break;
            }
        }
        if (this._chunks.size > this.cfg.maxChunks) {
            const all = [...this._chunks.values()].sort((a, b) =>
                Math.hypot((b.cx + 0.5) * CHUNK - px, (b.cy + 0.5) * CHUNK - py) - Math.hypot((a.cx + 0.5) * CHUNK - px, (a.cy + 0.5) * CHUNK - py));
            for (const e of all) {
                if (this._chunks.size <= this.cfg.maxChunks) break;
                if (e.cx >= c0 && e.cx <= c1 && e.cy >= r0 && e.cy <= r1) continue;   // never the ones on screen or being prepared
                this._chunks.delete(e.cx + ',' + e.cy);
            }
        }
    }

    /* Buildings and points of interest near the window, as { box: true, x, y, w, h } (tile units) or { x, y, color } (centre). Refreshed 4 times a second. */
    _marksNear(wm, left, top, span, now) {
        if (this._marks && now - this._marks.t < 250) return this._marks.list;
        const list = [];
        const objs = wm.getActiveObjects ? wm.getActiveObjects() : [];
        const pad = 4, mk = this.cfg.markers;
        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            if (o.isGround) continue;
            const w = o.w || 1, h = o.h || 1, x = o.col, y = o.row - (h - 1);   // a tall object stands on its row and rises above it
            if (x + w < left - pad || x > left + span + pad || y + h < top - pad || y > top + span + pad) continue;
            const type = o.interaction && o.interaction.type;
            if (type && mk[type]) list.push({ x: x + w / 2, y: y + h / 2, color: mk[type] });
            else if (!type && o.isSolid && w * h >= 6) list.push({ box: true, x, y, w, h });
        }
        this._marks = { t: now, list };
        return list;
    }

    /* Put the picture of the map together: the painted chunks on a canvas of the size of the map plus a tile on every side, one pixel of canvas per screen pixel, so
       drawing it later is a single 1:1 copy. (Unpainted land shows as a dim version of the ground colour of the player's biome.) */
    _compose(wm, tx, ty, left, top) {
        const cfg = this.cfg, Z = cfg.zoom, span = 2 * cfg.radius + 3, size = span * Z, S = CHUNK * Z;   // (left, top) is the corner of the picture: one tile beyond the map on every side, for the smooth scroll
        if (!this._view || this._view.cv.width !== size) {
            const cv = document.createElement('canvas');
            cv.width = size;
            cv.height = size;
            this._view = { cv, ctx: cv.getContext('2d') };
        }
        const v = this._view.ctx;
        const biome = wm.getBiomeAt(tx, ty), grass = this._pal(biome && biome.id).grass;
        this._ph = this._inside ? this._interiorColors().void : mix(grass, [14, 13, 11], 0.55);
        v.fillStyle = 'rgb(' + this._ph.join(',') + ')';
        v.fillRect(0, 0, size, size);
        const c0 = Math.floor(left / CHUNK), c1 = Math.floor((left + span - 1) / CHUNK);
        const r0 = Math.floor(top / CHUNK), r1 = Math.floor((top + span - 1) / CHUNK);
        for (let cy = r0; cy <= r1; cy++) {
            for (let cx = c0; cx <= c1; cx++) {
                const e = this._chunks.get(cx + ',' + cy);
                if (!e || e.ver < 0) continue;       // not painted yet
                v.drawImage(e.cv, 0, 0, S, S, (cx * CHUNK - left) * Z, (cy * CHUNK - top) * Z, S, S);
            }
        }
        this._viewKey = tx + ',' + ty;
        this._viewGen = this._gen;
    }

    render(ctx, ui, state) {
        const cfg = this.cfg;
        const wm = state && state.worldManager, cam = state && state.camera;
        const w = gameState.world || {}, inside = !!w.isInterior;
        // In an interior the map only shows once an Interior Map has been read in this very interior (the item sets interiorMapId, the scene manager clears it on leaving).
        if (!cfg.enabled || !wm || !cam || (inside && !(w.interiorMapId && w.interiorMapId === w.interiorId))) return;
        if (inside !== this._inside) { this._inside = inside; this._chunks.clear(); this._marks = null; this._viewKey = null; }   // never mix an interior's chunks with the overworld's
        if (wm !== this._wm) {                 // a new world (interior swap, new game): nothing of the old one is good
            this._wm = wm;
            this._chunks.clear();
            this._marks = null;
            this._viewKey = null;
        }
        const { TILE_SIZE: T, GAME_SCALE } = this.config;
        const round = cfg.shape !== 'square';
        const R = cfg.radius, Z = cfg.zoom, size = (2 * R + 1) * Z, pad = cfg.padding, outer = size + 2 * pad;
        const x0 = cfg.margin, y0 = ctx.canvas.height - cfg.margin - outer;
        const ix = x0 + pad, iy = y0 + pad;
        // The picture of the map is made for the player's tile (left, top = its corner, a tile beyond the map on every side) and slid in whole pixels as the player
        // walks through that tile, so the player stays in the middle, the scroll is smooth and everything still lands on whole screen pixels (no shimmer, no seams).
        const px = cam.x / T + 0.5, py = cam.y / T + 0.5;               // the player's position in tiles
        const tx = Math.floor(px), ty = Math.floor(py);
        const shx = Math.round((0.5 - (px - tx)) * Z), shy = Math.round((0.5 - (py - ty)) * Z);
        const left = tx - R - 1, top = ty - R - 1;
        const sx = (t) => ix + shx + Math.round((t - (tx - R)) * Z);
        const sy = (t) => iy + shy + Math.round((t - (ty - R)) * Z);

        this._update(wm, left, top, 2 * R + 3, tx + 0.5, ty + 0.5, round);
        if (!this._view || this._viewKey !== tx + ',' + ty || this._viewGen !== this._gen) this._compose(wm, tx, ty, left, top);

        const mx = x0 + outer / 2, my = y0 + outer / 2;           // middle of the map
        if (round) {
            ctx.beginPath();
            ctx.arc(mx, my, outer / 2, 0, Math.PI * 2);
            ctx.fillStyle = cfg.background;
            ctx.fill();
        } else {
            ui.drawPanel(x0, y0, outer, outer, cfg.background);
        }
        ctx.save();
        ctx.beginPath();
        if (round) ctx.arc(mx, my, size / 2, 0, Math.PI * 2); else ctx.rect(ix, iy, size, size);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this._view.cv, ix + shx - Z, iy + shy - Z);

        // buildings, then doors and stations on top
        const marks = this._marksNear(wm, left, top, 2 * R + 3, performance.now());
        ctx.fillStyle = cfg.buildings;
        for (const m of marks) if (m.box) ctx.fillRect(sx(m.x), sy(m.y), sx(m.x + m.w) - sx(m.x), sy(m.y + m.h) - sy(m.y));
        const dot = Z + 2, half = dot >> 1;
        for (const m of marks) {
            if (m.box) continue;
            const dx = sx(m.x), dy = sy(m.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(dx - half - 1, dy - half - 1, dot + 2, dot + 2);
            ctx.fillStyle = m.color;
            ctx.fillRect(dx - half, dy - half, dot, dot);
        }

        // the area the main view shows
        if (cfg.showView) {
            const scale = GAME_SCALE * (ctx.canvas.width / 800);
            const vw = ctx.canvas.width / scale / T, vh = ctx.canvas.height / scale / T;
            const cx = tx + 0.5, cy = ty + 0.5;
            const bx0 = sx(cx - vw / 2), bx1 = sx(cx + vw / 2), by0 = sy(cy - vh / 2), by1 = sy(cy + vh / 2);
            // four one-pixel bars on whole pixels (a stroked rectangle can lose an edge when it lands between pixels); a faint dark bar outside each keeps it visible on light land
            const bars = (g, w, h, x, y) => {
                ctx.fillRect(x - g, y - g, w + 2 * g + 1, 1);                   // top
                ctx.fillRect(x - g, y + h + g, w + 2 * g + 1, 1);               // bottom
                ctx.fillRect(x - g, y - g + 1, 1, h + 2 * g - 1);               // left
                ctx.fillRect(x + w + g, y - g + 1, 1, h + 2 * g - 1);               // right
            };
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            bars(1, bx1 - bx0, by1 - by0, bx0, by0);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            bars(0, bx1 - bx0, by1 - by0, bx0, by0);
        }

        // the player: an arrow pointing the way they face, on the middle pixel of the map
        const ent = state.entities && state.entities[0];
        const d = (ent && DIRS[ent.direction]) || DIRS.DOWN, p = [-d[1], d[0]];
        const ax = ix + R * Z + (Z >> 1), ay = iy + R * Z + (Z >> 1);
        ctx.beginPath();
        ctx.moveTo(ax + d[0] * 6, ay + d[1] * 6);
        ctx.lineTo(ax - d[0] * 3 + p[0] * 4, ay - d[1] * 3 + p[1] * 4);
        ctx.lineTo(ax - d[0] * 3 - p[0] * 4, ay - d[1] * 3 - p[1] * 4);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // the edge of the map: a thin dark line against the map, and for a circle a lighter ring round the frame
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        if (round) {
            ctx.beginPath();
            ctx.arc(mx, my, size / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(mx, my, outer / 2 - 1, 0, Math.PI * 2);
            ctx.strokeStyle = cfg.frame;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.strokeRect(ix - 0.5, iy - 0.5, size + 1, size + 1);
        }
        ctx.restore();
    }
}
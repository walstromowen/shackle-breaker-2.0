// src/world/generators/CaveGenerator.js
//
// A cave system made of inverted mountains. The land is a depth field: the solid rock sits on the highest layer (wallTile, LAYER_7 by default)
// and everything that is dug out of it steps DOWN, one layer per ledge, toward its lowest point.
//
//   ROOMS     pockets: an inverted mountain each (rim > ledges > floor). They differ in size, in how wide their ledges are and in how deep they
//             go (one bottoms out on the cave floor, others on a ledge), and they may overlap, so ledges of two rooms merge into one cavern.
//   CORRIDORS flat passages on the top ledge that join the rooms.
//   CANYONS   wide winding gorges between two rooms; their floor steps down (or up) along the way and they have ledges on both banks.
//   CHUTES    narrow trenches cut into the rock from a top ledge: a dead end that drops two to four layers.
//   ENTRANCE  a gap in the south rim onto the nearest top ledge.
//
// The cave floor (LAYER_2 by default) carries moss (LAYER_1); every other layer between the floor and the rim is a walkable ledge.
// Ledges are joined by terrain stairs (the same pieces the overworld uses: getStairAt, STAIR_MASK, carve). A planner puts a stair wherever a
// ledge would otherwise be cut off, and adds extra ones for loops; anything that still cannot be reached is filled in.
//
// Options of the cave definition (all optional, see interiorDefinitions.js):
//   size { min, max }      half-width / half-height of the map in cells, picked per cave (default 28..46)
//   rooms { min, max }     number of rooms (2..5), canyons { min, max } (0..2), chutes { min, max } (1..4)

import { CONFIG } from '../../shared/data/constants.js';
import { biomeFactory } from '../systems/factories/biomeFactory.js';

/* What each cell of a stair piece is (same table as terrainGenerator.js): W walkway, F / G / T open ground, R rock. */
const STAIR_MASK = {
    S: ['FWWWF', 'RWWWR', 'RWWWR'],
    N: ['FWWWF', 'FWWWF'],
    E: ['TRR', 'GGG', 'WWW', 'TTT'],
    W: ['RRT', 'GGG', 'WWW', 'TTT'],
};
const KEY = (c, r) => (c + 2048) * 4096 + (r + 2048);
const layerNumber = (name) => parseInt(String(name).replace('LAYER_', ''), 10);
const MIN_REGION = 14; // a walkable region smaller than this is not worth a stair (it is left as a nook)

export class CaveGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;

        // Parse unique ID to guarantee this specific cave is always the same
        let uniqueCaveModifier = 0;
        if (interiorId) {
            uniqueCaveModifier = interiorId.split('_').reduce((acc, val) => {
                const parsed = parseInt(val);
                return acc + (isNaN(parsed) ? 0 : parsed);
            }, 0);
        }
        this.seed = seed + uniqueCaveModifier;

        /* layers */
        this.wallN = layerNumber(config.wallTile || 'LAYER_7');
        this.floorN = layerNumber(config.floorTile || 'LAYER_2');
        this.mossN = config.mossTile ? layerNumber(config.mossTile) : null;
        this.steps = Math.max(1, this.wallN - this.floorN - 1); // ledges between the floor and the rim
        this.top = this.wallN - 1; // the highest ledge (where the entrance opens)

        this._rng = this._makeRng(this.seed);
        this._build();
    }

    /* ------------------------------------------------------------------ random numbers / noise */
    _makeRng(s) {
        let a = (s ^ 0x9e3779b9) >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    _range(lo, hi) {
        return lo + this._rng() * (hi - lo);
    }
    _int(lo, hi) {
        return lo + Math.floor(this._rng() * (hi - lo + 1));
    }
    _hash(a, b, salt) {
        let h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul((salt + this.seed) | 0, 83492791);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    /* smooth value noise, -1..1 */
    _vnoise(x, y, scale, salt) {
        const fx0 = x / scale, fy0 = y / scale;
        const gx = Math.floor(fx0), gy = Math.floor(fy0);
        const fx = fx0 - gx, fy = fy0 - gy;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const h = (i, j) => this._hash(i, j, salt) * 2 - 1;
        const a = h(gx, gy), b = h(gx + 1, gy), c = h(gx, gy + 1), d = h(gx + 1, gy + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }

    /* ------------------------------------------------------------------ grid access */
    _idx(c, r) {
        return (r - this.bounds.minR) * this.W + (c - this.bounds.minC);
    }
    _inside(c, r) {
        return c >= this.bounds.minC && c <= this.bounds.maxC && r >= this.bounds.minR && r <= this.bounds.maxR;
    }
    /* the level of a cell; outside the map is solid rock, like the buffer ring getTileAt returns */
    _lv(c, r) {
        return this._inside(c, r) ? this.level[this._idx(c, r)] : this.wallN;
    }

    /* ------------------------------------------------------------------ the depth field */
    /* A room: the level of a cell is the room's bottom `b` inside radius `f`, then one more per `tw` cells. The distance is a rounded square
       warped by smooth noise (slow enough that the field has no dip or bump of its own, so every ledge is one connected ring). */
    _roomLevel(rm, c, r) {
        const dx = (c - rm.cx) / rm.ax, dy = (r - rm.cy) / rm.ay;
        let d = Math.pow(Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dy), 3), 1 / 3);
        d += rm.n1 * this._vnoise(c, r, rm.l1, rm.salt) + rm.n2 * this._vnoise(c, r, rm.l2, rm.salt + 1);
        if (d < rm.f) return rm.b;
        return Math.min(this.wallN, rm.b + 1 + Math.floor((d - rm.f) / rm.tw));
    }

    _placeRooms() {
        const W = this.W, H = this.H, cfg = this.config.rooms || {};
        const area = W * H;
        const want = Math.min(this._int(cfg.min || 2, cfg.max || 5), Math.max(2, Math.floor(area / 1500)));
        const rooms = [];
        const small = Math.min(W, H);
        for (let i = 0, tries = 0; i < want && tries < 900; tries++) {
            const main = i === 0;
            let f = main ? this._range(6, 9) : this._range(3, 7);
            let tw = main ? this._range(4.5, 6) : this._range(4, 5.5);
            const maxE = small * (main ? 0.38 : this._range(0.2, 0.32));
            // the main room is deep (it reaches the cave floor); the others go as deep as their size allows, so small pockets are shallow
            let steps = this.steps;
            if (!main) steps = Math.max(1, Math.min(this.steps, Math.floor((maxE - 2 - f) / tw)));
            let e = f + steps * tw + 2;
            while (e > maxE && (tw > 4 || f > 3.5)) {
                tw = Math.max(4, tw - 0.25);
                f = Math.max(3.5, f - 0.5);
                e = f + steps * tw + 2;
            }
            if (e > maxE * 1.15) continue;
            const b = this.wallN - 1 - steps;
            const m = 0.7 * e + 4;
            const rangeC = this.halfC - m, rangeR = this.halfR - m;
            if (rangeC < 2 || rangeR < 2) continue;
            const cx = main ? Math.round(this._range(-0.25, 0.25) * rangeC) : Math.round(this._range(-rangeC, rangeC));
            const cy = main ? Math.round(this._range(-0.25, 0.25) * rangeR) : Math.round(this._range(-rangeR, rangeR));
            // solid rock between pockets, with the odd pair allowed to merge into one cavern
            const gap = (i > 1 && this._rng() < 0.25 ? 0.55 : 0.9) * (1 - tries / 1500); // (relaxes if the map is crowded)
            if (rooms.some((o) => Math.hypot(cx - o.cx, cy - o.cy) < gap * (e + o.e))) continue;
            rooms.push({
                cx, cy, b, f, tw, e,
                ax: this._range(0.7, 1.35), ay: this._range(0.7, 1.35),
                n1: 0.36 * tw, l1: Math.max(10, 3 * tw), n2: 0.12 * tw, l2: Math.max(5, 1.4 * tw),
                salt: 100 + i * 37,
            });
            i++;
        }
        return rooms;
    }

    /* A path feature (corridor, canyon, chute): a winding line with a flat floor `w` cells either side whose level goes from la to lb along its
       length, and banks that rise one layer every `bank` cells (bank 0: straight into rock). */
    _makePath(a, b, o) {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(2, Math.ceil(len / 4));
        const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
        const amp = o.wind ? this._range(0.04, 0.1) * len : 0;
        const ph = this._range(0, 6.28), fr = this._range(1, 2.2);
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const s = i / n;
            const off = amp * Math.sin(ph + fr * 6.283 * s) * Math.pow(Math.sin(Math.PI * s), 0.6);
            pts.push([a[0] + (b[0] - a[0]) * s + nx * off, a[1] + (b[1] - a[1]) * s + ny * off]);
        }
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const reach = o.w + (o.bank ? o.bank * (this.steps + 1) : 0) + 2;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
        return { pts, cum, total: cum[cum.length - 1] || 1, w: o.w, bank: o.bank || 0, la: o.la, lb: o.lb, x0: x0 - reach, y0: y0 - reach, x1: x1 + reach, y1: y1 + reach };
    }
    _pathLevel(p, c, r) {
        if (c < p.x0 || c > p.x1 || r < p.y0 || r > p.y1) return this.wallN;
        let best = 1e9, bt = 0;
        for (let i = 1; i < p.pts.length; i++) {
            const ax = p.pts[i - 1][0], ay = p.pts[i - 1][1], bx = p.pts[i][0], by = p.pts[i][1];
            const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
            let u = ((c - ax) * vx + (r - ay) * vy) / l2;
            u = u < 0 ? 0 : u > 1 ? 1 : u;
            const d = Math.hypot(c - (ax + vx * u), r - (ay + vy * u));
            if (d < best) { best = d; bt = (p.cum[i - 1] + (p.cum[i] - p.cum[i - 1]) * u) / p.total; }
        }
        const lc = Math.max(this.floorN, Math.min(this.top, Math.round(p.la + (p.lb - p.la) * bt)));
        if (best <= p.w) return lc;
        return p.bank ? Math.min(this.wallN, lc + 1 + Math.floor((best - p.w) / p.bank)) : this.wallN;
    }

    _fieldLevel(c, r) {
        let lv = this.wallN;
        for (const rm of this.rooms) {
            const v = this._roomLevel(rm, c, r);
            if (v < lv) lv = v;
        }
        for (const p of this.paths) {
            if (lv <= this.floorN) break;
            const v = this._pathLevel(p, c, r);
            if (v < lv) lv = v;
        }
        return lv;
    }

    _build() {
        const sz = this.config.size || {};
        this.halfC = this._int(sz.min || 28, sz.max || 46);
        this.halfR = this._int(sz.min || 28, sz.max || 46);
        this.bounds = { minC: -this.halfC, maxC: this.halfC, minR: -this.halfR, maxR: this.halfR };
        this.W = this.halfC * 2 + 1;
        this.H = this.halfR * 2 + 1;

        /* 1. the features */
        this.rooms = this._placeRooms();
        this.paths = [];
        this._planPaths();

        /* 2. the level of every cell: the lowest of all the features, rock at the edge of the map */
        this.level = new Int8Array(this.W * this.H);
        this.protect = new Uint8Array(this.W * this.H);
        for (let r = this.bounds.minR; r <= this.bounds.maxR; r++)
            for (let c = this.bounds.minC; c <= this.bounds.maxC; c++) {
                const edge = Math.min(c - this.bounds.minC, this.bounds.maxC - c, r - this.bounds.minR, this.bounds.maxR - r) < 2;
                this.level[this._idx(c, r)] = edge ? this.wallN : this._fieldLevel(c, r);
            }
        this._cleanUp();

        /* 3. the way in */
        this._carveEntrance();
        this._cleanUp();

        /* 4. stairs and reachability */
        this.stairs = [];
        this._stairCells = new Map();
        this._connect();
        this._cleanUp();
        // the clean-up can cut a link again: one more look
        this._connect();
        this._cleanUp();
        // ... and it can do it once more after that. So check, and mend (no extra stairs this time) until no walkable area of any size is left out of reach
        for (let i = 0; i < 8; i++) {
            this._reach = this._reachable();
            if (!this._reach.lost.length) break;
            this._connect(false);
            this._cleanUp();
        }
        // a ledge strip too thin for a stair is raised or lowered again by the clean-up as often as it is filled in: lower it to the ledge beside it and pin it there
        for (let i = 0; i < 4; i++) {
            const info = this._reachable();
            if (!info.lost.length) break;
            this._pinDown(info);
            this._cleanUp();
        }
        this._reach = this._reachable();

        this._moss();
        this._scatter();
    }

    /* corridors between the rooms (nearest-neighbour tree), then canyons between two rooms, then chutes into the rock */
    _planPaths() {
        const rooms = this.rooms, cfg = this.config;
        const rw = [2, 2.5, 3];
        // corridors on the top ledge: a minimum spanning tree over the room centres
        const inTree = new Set([0]);
        while (inTree.size < rooms.length) {
            let best = null;
            for (const i of inTree)
                for (let j = 0; j < rooms.length; j++) {
                    if (inTree.has(j)) continue;
                    const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy);
                    if (!best || d < best.d) best = { i, j, d };
                }
            inTree.add(best.j);
            this.paths.push(this._makePath([rooms[best.i].cx, rooms[best.i].cy], [rooms[best.j].cx, rooms[best.j].cy], { w: rw[this._int(0, 2)], la: this.top, lb: this.top, wind: true }));
        }
        // canyons: wide gorges from one room's floor to another's, stepping between their bottoms
        const cc = cfg.canyons || {};
        const nCan = rooms.length > 1 ? this._int(cc.min !== undefined ? cc.min : 0, cc.max !== undefined ? cc.max : 2) : 0;
        for (let k = 0; k < nCan; k++) {
            const i = this._int(0, rooms.length - 1);
            let j = this._int(0, rooms.length - 1);
            if (j === i) j = (i + 1) % rooms.length;
            this.paths.push(this._makePath([rooms[i].cx, rooms[i].cy], [rooms[j].cx, rooms[j].cy], { w: this._range(3.5, 4.5), bank: this._int(3, 4), la: rooms[i].b, lb: rooms[j].b, wind: true }));
        }
        // chutes: narrow trenches from a top ledge outward into the rock, dropping two to four layers
        const ch = cfg.chutes || {};
        const nChute = this._int(ch.min !== undefined ? ch.min : 1, ch.max !== undefined ? ch.max : 4);
        for (let k = 0; k < nChute; k++) {
            const rm = rooms[this._int(0, rooms.length - 1)];
            const ang = this._range(0, 6.283), dx = Math.cos(ang), dy = Math.sin(ang);
            // walk out from the room's centre to where its top ledge ends and the rock begins
            let t = 0, found = false;
            for (; t < 90; t += 0.5) {
                const c = Math.round(rm.cx + dx * t), r = Math.round(rm.cy + dy * t);
                if (Math.abs(c) > this.halfC - 6 || Math.abs(r) > this.halfR - 6) break;
                if (this._roomLevel(rm, c, r) >= this.wallN) { found = true; break; }
            }
            if (!found) continue;
            const len = this._range(12, 20);
            const sx = rm.cx + dx * (t - 3), sy = rm.cy + dy * (t - 3);
            let ex = sx + dx * len, ey = sy + dy * len;
            const m = 5;
            ex = Math.max(-this.halfC + m, Math.min(this.halfC - m, ex));
            ey = Math.max(-this.halfR + m, Math.min(this.halfR - m, ey));
            if (Math.hypot(ex - sx, ey - sy) < 9) continue;
            this.paths.push(this._makePath([sx, sy], [ex, ey], { w: 2.5, bank: 2, la: this.top, lb: Math.max(this.floorN + 1, this.top - this._int(2, 4)), wind: false }));
        }
    }

    /* the entrance: a 3-wide gap in the south rim straight down from the top-ledge cell that is nearest to the south edge */
    /* The way out is a cave mouth in the NORTH wall, like a cave on the overworld: a south-facing rock face with an opening in it. It needs a
       straight piece of face three cells wide (the rim above, the top ledge below). `doorRow` is the second ledge row under the rim (the rock hangs over the first), `doorCol` the
       middle column: that one cell is the doorway (worldManager.isBlockedByFace lets it through, see isDoorway); the player is put one row below it.
       Three columns x four rows of the top ledge are protected. */
    _carveEntrance() {
        const top = this.top, wall = this.wallN;
        const fits = (c, r, rows, side) => {
            for (let dc = -1 - side; dc <= 1 + side; dc++) {
                if (this._lv(c + dc, r - 1) !== wall) return false;
                for (let k = 0; k < rows; k++) if (this._lv(c + dc, r + k) !== top) return false;
            }
            return true;
        };
        let best = null;
        for (const [rows, side] of [[4, 1], [3, 0]]) {
            for (let r = this.bounds.minR + 1; r <= this.bounds.maxR - 6 && !best; r++) {
                for (let c = this.bounds.minC + 4; c <= this.bounds.maxC - 4; c++) {
                    if (!fits(c, r, rows, side)) continue;
                    if (!best || Math.abs(c) < Math.abs(best.c)) best = { c, r };
                }
            }
            if (best) break;
        }
        if (!best) {
            // no straight piece of face anywhere: cut one into the north-most bit of the top ledge
            for (let r = this.bounds.minR + 2; r <= this.bounds.maxR - 6 && !best; r++)
                for (let c = this.bounds.minC + 4; c <= this.bounds.maxC - 4; c++)
                    if (this._lv(c, r) === top) { best = { c, r }; break; }
            if (!best) best = { c: 0, r: this.bounds.minR + 4 };
        }
        const c0 = best.c, r0 = best.r;
        this.doorCol = c0;
        this.doorRow = r0 + 1; // the rock is two cells tall (the lip + the face hanging into row r0), so the doorway is the first open row below it, like the overworld's mouths
        for (let r = r0 - 1; r <= r0 + 3; r++)
            for (let c = c0 - 2; c <= c0 + 2; c++) {
                const inPad = Math.abs(c - c0) <= 1;
                this.level[this._idx(c, r)] = r === r0 - 1 ? wall : (inPad || r <= r0 + 1 ? top : this.level[this._idx(c, r)]);
                if (inPad || r <= r0 + 1) this.protect[this._idx(c, r)] = 1;
            }
    }

    /* ------------------------------------------------------------------ clean-up */
    /* The same two rules the overworld applies: a cell that is a one-cell strip between two cells of another level joins them, and a cliff
       is never more than one level per two cells. Cells that are protected (stair pads, the doorway) are never changed. */
    _cleanUp() {
        const R = 4;
        for (let pass = 0; pass < 12; pass++) {
            let changed = 0;
            const next = this.level.slice();
            for (let r = this.bounds.minR + 1; r < this.bounds.maxR; r++) {
                for (let c = this.bounds.minC + 1; c < this.bounds.maxC; c++) {
                    const i = this._idx(c, r);
                    if (this.protect[i]) continue;
                    const m = this.level[i];
                    let v = m;
                    const a = this._lv(c - 1, r), b = this._lv(c + 1, r);
                    if (a === b && a !== m && Math.max(a, m) >= this.floorN + 1) v = a;
                    else {
                        const u = this._lv(c, r - 1), d = this._lv(c, r + 1);
                        if (u === d && u !== m && Math.max(u, m) >= this.floorN + 1) v = u;
                    }
                    if (v === m && m > this.floorN) {
                        // slope limit: look for a lower cell too close
                        for (let d = 1; d <= R && v === m; d++) {
                            const allowed = Math.floor((d - 1) / 2) + 1;
                            for (let q = -d; q <= d && v === m; q++) {
                                for (const [cc, rr] of [[c + q, r - d], [c + q, r + d], [c - d, r + q], [c + d, r + q]]) {
                                    if (!this._inside(cc, rr)) continue;
                                    const o = this.level[this._idx(cc, rr)];
                                    if (m - o > allowed) { v = o + allowed; break; }
                                }
                            }
                        }
                    }
                    if (v !== m) { next[i] = v; changed++; }
                }
            }
            this.level = next;
            if (!changed) break;
        }
    }

    /* ------------------------------------------------------------------ walking model (the same rules as worldManager.canMove) */
    _walkable(c, r) {
        const lv = this._lv(c, r);
        if (lv < this.floorN || lv >= this.wallN || !this._inside(c, r)) return false;
        if (this._lv(c, r - 1) > lv) return false; // under a rock face
        if (this._lv(c, r + 1) < lv) return false; // the lip of a south face
        return !this._stairCells.has(KEY(c, r));
    }

    /* walkable regions: 4-connected cells on one level */
    _label() {
        const W = this.W, H = this.H, n = W * H;
        const comp = new Int32Array(n).fill(-1);
        const sizes = [];
        const stack = new Int32Array(n);
        for (let i = 0; i < n; i++) {
            if (comp[i] !== -1) continue;
            const c = (i % W) + this.bounds.minC, r = Math.floor(i / W) + this.bounds.minR;
            if (!this._walkable(c, r)) continue;
            const id = sizes.length;
            const lv = this.level[i];
            let sp = 0, size = 0;
            stack[sp++] = i;
            comp[i] = id;
            while (sp) {
                const j = stack[--sp];
                size++;
                const jc = (j % W) + this.bounds.minC, jr = Math.floor(j / W) + this.bounds.minR;
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nc = jc + dc, nr = jr + dr;
                    if (!this._inside(nc, nr)) continue;
                    const k = this._idx(nc, nr);
                    if (comp[k] !== -1 || this.level[k] !== lv || !this._walkable(nc, nr)) continue;
                    comp[k] = id;
                    stack[sp++] = k;
                }
            }
            sizes.push(size);
        }
        return { comp, sizes };
    }

    /* which regions can be reached from the doorway, going by the stairs placed so far */
    _reachable(minSize = MIN_REGION) {
        const { comp, sizes } = this._label();
        const at = (p) => (p && this._inside(p[0], p[1]) ? comp[this._idx(p[0], p[1])] : -1);
        const adj = new Map();
        const link = (a, b) => {
            if (a < 0 || b < 0 || a === b) return;
            if (!adj.has(a)) adj.set(a, []);
            if (!adj.has(b)) adj.set(b, []);
            adj.get(a).push(b);
            adj.get(b).push(a);
        };
        for (const s of this.stairs) {
            const e0 = at(s.entries[0]), e1 = at(s.entries[1]);
            if (e0 >= 0 && e1 >= 0) link(e0, e1);
            else link(at(s.anchors[0]), at(s.anchors[1]));
        }
        const start = at([this.doorCol, this.doorRow + 1]);
        const seen = new Set();
        if (start >= 0) {
            const q = [start];
            seen.add(start);
            while (q.length) {
                const a = q.pop();
                for (const b of adj.get(a) || []) if (!seen.has(b)) { seen.add(b); q.push(b); }
            }
        }
        // a region with no cell that has all eight neighbours in it is a thin strip (a bank of a canyon or chute: the slope limit makes them); it needs no stair
        const core = new Uint8Array(sizes.length);
        const W = this.W;
        for (let i = 0; i < comp.length; i++) {
            const id = comp[i];
            if (id < 0 || core[id]) continue;
            const c = (i % W) + this.bounds.minC, r = Math.floor(i / W) + this.bounds.minR;
            let all = true;
            for (let dr = -1; dr <= 1 && all; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    if (!this._inside(c + dc, r + dr) || comp[this._idx(c + dc, r + dr)] !== id) { all = false; break; }
                }
            if (all) core[id] = 1;
        }
        let nReached = 0;
        const lost = [];
        for (let id = 0; id < sizes.length; id++) {
            if (sizes[id] < minSize || !core[id]) continue;
            if (seen.has(id)) nReached += sizes[id];
            else lost.push(id);
        }
        return { comp, sizes, seen, nReached, lost, at };
    }

    /* ------------------------------------------------------------------ stairs */
    /* The pad of a stair (the cells TerrainGenerator._computeStairBlock demands) and the piece itself. c, r: for S / N the first walkway column
       and the edge row, for E / W the edge column and the walk row. `hi` is the upper level. */
    _stairPlan(kind, c, r, hi) {
        const lo = hi - 1;
        let writes, piece, hiA, loA, hiE, loE;
        if (kind === 'S') {
            writes = [[c - 2, r - 2, c + 4, r, hi], [c - 2, r + 1, c + 4, r + 3, lo]];
            piece = { kind, ox: c - 1, oy: r - 1, w: 5, h: 3, walk: [c, r - 1, 3, 3], carve: [c, r, 3, 1], dirs: ['UP', 'DOWN'] };
            hiA = [[c + 1, r - 3], [c + 1, r - 4]]; loA = [[c + 1, r + 4], [c + 1, r + 5]];
            hiE = [c + 1, r - 2]; loE = [c + 1, r + 2];
        } else if (kind === 'N') {
            writes = [[c - 2, r - 3, c + 4, r - 1, lo], [c - 2, r, c + 4, r + 3, hi]];
            piece = { kind, ox: c - 1, oy: r, w: 5, h: 2, walk: [c, r, 3, 2], carve: [c, r, 3, 1], dirs: ['UP', 'DOWN'] };
            hiA = [[c + 1, r + 4], [c + 1, r + 5]]; loA = [[c + 1, r - 4], [c + 1, r - 5]];
            hiE = [c + 1, r + 2]; loE = [c + 1, r - 1];
        } else if (kind === 'E') {
            writes = [[c - 3, r - 3, c, r + 2, hi], [c + 1, r - 3, c + 3, r + 2, lo]];
            piece = { kind, ox: c - 2, oy: r - 2, w: 3, h: 4, walk: [c - 2, r, 3, 1], carve: [c - 2, r - 1, 3, 2], dirs: ['LEFT', 'RIGHT'] };
            hiA = [[c - 4, r], [c - 5, r]]; loA = [[c + 4, r], [c + 5, r]];
            hiE = [c - 3, r]; loE = [c + 1, r];
        } else {
            writes = [[c, r - 3, c + 3, r + 2, hi], [c - 3, r - 3, c - 1, r + 2, lo]];
            piece = { kind, ox: c, oy: r - 2, w: 3, h: 4, walk: [c, r, 3, 1], carve: [c, r - 1, 3, 2], dirs: ['LEFT', 'RIGHT'] };
            hiA = [[c + 4, r], [c + 5, r]]; loA = [[c - 4, r], [c - 5, r]];
            hiE = [c + 3, r]; loE = [c - 1, r];
        }
        return { writes, piece, hiA, loA, hiE, loE, hi, lo };
    }

    /* how many cells the pad would change, or Infinity when it does not fit (too near the rim, over another pad, or a bigger change than one level) */
    _padCost(plan) {
        const m = 4;
        let cost = 0;
        for (const [c0, r0, c1, r1, lvl] of plan.writes)
            for (let rr = r0; rr <= r1; rr++)
                for (let cc = c0; cc <= c1; cc++) {
                    if (cc < this.bounds.minC + m || cc > this.bounds.maxC - m || rr < this.bounds.minR + m || rr > this.bounds.maxR - m) return Infinity;
                    const i = this._idx(cc, rr), cur = this.level[i];
                    if (cur === lvl) continue;
                    if (this.protect[i] || Math.abs(cur - lvl) > 1) return Infinity;
                    cost++;
                }
        const p = plan.piece;
        for (const o of this.stairs) if (p.ox < o.ox + o.w + 2 && o.ox < p.ox + p.w + 2 && p.oy < o.oy + o.h + 2 && o.oy < p.oy + p.h + 2) return Infinity;
        return cost;
    }

    _apply(plan) {
        const undo = [];
        for (const [c0, r0, c1, r1, lvl] of plan.writes)
            for (let rr = r0; rr <= r1; rr++)
                for (let cc = c0; cc <= c1; cc++) {
                    const i = this._idx(cc, rr);
                    undo.push([i, this.level[i], this.protect[i]]);
                    this.level[i] = lvl;
                    this.protect[i] = 1;
                }
        const piece = plan.piece;
        piece.style = Math.floor(this._hash(piece.ox, piece.oy, 47) * 2);
        piece.mask = STAIR_MASK[piece.kind];
        piece.id = piece.ox + ',' + piece.oy;
        piece.anchors = [null, null];
        piece.entries = [plan.hiE, plan.loE]; // the cells just outside the piece, on its two levels: what it really joins (the anchors are further out and can be changed by a later clean-up)
        this.stairs.push(piece);
        for (let rr = piece.oy; rr < piece.oy + piece.h; rr++)
            for (let cc = piece.ox; cc < piece.ox + piece.w; cc++) this._stairCells.set(KEY(cc, rr), piece);
        return { undo, piece };
    }
    _revert(done) {
        for (const [i, lv, pr] of done.undo) { this.level[i] = lv; this.protect[i] = pr; }
        this.stairs.pop();
        const p = done.piece;
        for (let rr = p.oy; rr < p.oy + p.h; rr++) for (let cc = p.ox; cc < p.ox + p.w; cc++) this._stairCells.delete(KEY(cc, rr));
    }

    /* every place a stair could be cut: an edge between level h and h - 1, in each of the four directions */
    _stairCandidates() {
        const out = [];
        for (let r = this.bounds.minR + 4; r <= this.bounds.maxR - 4; r++)
            for (let c = this.bounds.minC + 4; c <= this.bounds.maxC - 4; c++) {
                const h = this.level[this._idx(c, r)];
                if (h <= this.floorN || h >= this.wallN) continue;
                if (this._lv(c, r + 1) === h - 1) out.push(['S', c - 1, r, h]);
                if (this._lv(c, r - 1) === h - 1) out.push(['N', c - 1, r, h]);
                if (this._lv(c + 1, r) === h - 1) out.push(['E', c, r, h]);
                if (this._lv(c - 1, r) === h - 1) out.push(['W', c, r, h]);
            }
        return out;
    }

    /* Join the regions: while some region cannot be reached from the doorway, cut the cheapest stair between a reached and an unreached region.
       Then add a few extra stairs for loops, and fill in what still cannot be reached. */
    _connect(extras = true) {
        for (let round = 0; round < 60; round++) {
            let info = this._reachable();
            if (!info.lost.length) break;
            const cands = [];
            for (const [kind, c, r, h] of this._stairCandidates()) {
                const plan = this._stairPlan(kind, c, r, h);
                const cost = this._padCost(plan);
                if (cost > 14) continue;
                const pick = (list, lv) => list.find((p) => this._inside(p[0], p[1]) && info.at(p) >= 0 && this.level[this._idx(p[0], p[1])] === lv);
                const a = pick(plan.hiA, plan.hi), b = pick(plan.loA, plan.lo);
                if (!a || !b) continue;
                const ca = info.at(a), cb = info.at(b);
                const ra = info.seen.has(ca), rb = info.seen.has(cb);
                if (ra === rb) continue; // joins two regions that are both reached or both lost
                if (info.sizes[ra ? cb : ca] < MIN_REGION) continue;
                cands.push({ plan, cost, a, b, size: info.sizes[ra ? cb : ca], tie: this._hash(c, r, 811) });
            }
            // cheapest pads first, trying them in order until one really joins a lost region
            cands.sort((x, y) => x.cost - y.cost || y.size - x.size || x.tie - y.tie);
            let ok = false;
            for (const cd of cands.slice(0, 14)) {
                if (this._padCost(cd.plan) === Infinity) continue;
                const done = this._apply(cd.plan);
                done.piece.anchors = [cd.a, cd.b];
                const after = this._reachable();
                if (after.nReached > info.nReached) { ok = true; break; }
                this._revert(done);
            }
            if (!ok) {
                this._seal(info);
                continue;
            }
        }
        if (extras) this._extraStairs();
        // anything big that is still out of reach is filled in
        for (let i = 0; i < 4; i++) {
            const info = this._reachable();
            if (!info.lost.length) break;
            this._seal(info);
        }
        this._reach = this._reachable();
    }

    /* fill in the regions that cannot be reached: a pocket in a higher ledge is raised to it, a stray mesa is lowered to what is around it */
    _seal(info) {
        if (!info.seen.size) return; // the doorway is on no region: something is wrong, do not touch the cave
        const W = this.W;
        for (const id of info.lost) {
            const cells = [];
            const around = [];
            for (let i = 0; i < info.comp.length; i++) if (info.comp[i] === id) cells.push(i);
            const lv = this.level[cells[0]];
            for (const i of cells) {
                const c = (i % W) + this.bounds.minC, r = Math.floor(i / W) + this.bounds.minR;
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                    const k = this._idx(c + dc, r + dr);
                    if (this._inside(c + dc, r + dr) && info.comp[k] !== id) around.push(this.level[k]);
                }
            }
            const higher = around.filter((v) => v > lv), lower = around.filter((v) => v < lv);
            const to = higher.length ? Math.min(...higher) : lower.length ? Math.max(...lower) : this.wallN;
            for (const i of cells) if (!this.protect[i]) this.level[i] = to;
            // the face row under it and the cells on its sides can be left: the clean-up evens them out
        }
    }

    /* The regions that cannot be reached are set to the highest ledge below them that touches a reached region (else filled to the rim) and pinned: the clean-up
       then moves the cells around them instead of putting these back. */
    _pinDown(info) {
        if (!info.seen.size) return;
        const W = this.W;
        for (const id of info.lost) {
            const cells = [];
            for (let i = 0; i < info.comp.length; i++) if (info.comp[i] === id) cells.push(i);
            const lv = this.level[cells[0]];
            let to = -1;
            for (const i of cells) {
                const c = (i % W) + this.bounds.minC, r = Math.floor(i / W) + this.bounds.minR;
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    if (!this._inside(c + dc, r + dr)) continue;
                    const k = this._idx(c + dc, r + dr);
                    if (info.comp[k] >= 0 && info.seen.has(info.comp[k]) && this.level[k] < lv && this.level[k] > to) to = this.level[k];
                }
            }
            if (to < 0) to = this.wallN; // nothing reached beside it: fill it in
            for (const i of cells) if (!this.protect[i]) { this.level[i] = to; this.protect[i] = 1; }
        }
    }

    /* more than one way between two ledges: extra stairs where the pad is cheap and no other stair is near */
    _extraStairs() {
        const want = 2 + this.rooms.length;
        let added = 0;
        const cands = this._stairCandidates();
        // shuffle by hash
        cands.sort((x, y) => this._hash(x[1], x[2], 921) - this._hash(y[1], y[2], 921));
        for (const [kind, c, r, h] of cands) {
            if (added >= want) break;
            const plan = this._stairPlan(kind, c, r, h);
            if (this._padCost(plan) > 4) continue;
            // keep clear of other stairs
            const mc = plan.piece.ox + plan.piece.w / 2, mr = plan.piece.oy + plan.piece.h / 2;
            if (this.stairs.some((s) => Math.hypot(s.ox + s.w / 2 - mc, s.oy + s.h / 2 - mr) < 14)) continue;
            const before = this._reachable();
            const pick = (list, lv) => list.find((p) => this._inside(p[0], p[1]) && before.at(p) >= 0 && this.level[this._idx(p[0], p[1])] === lv);
            const a = pick(plan.hiA, plan.hi), b = pick(plan.loA, plan.lo);
            if (!a || !b) continue;
            if (!before.seen.has(before.at(a)) || !before.seen.has(before.at(b))) continue;
            if (before.sizes[before.at(a)] < 30 || before.sizes[before.at(b)] < 30) continue;
            const done = this._apply(plan);
            done.piece.anchors = [a, b];
            const after = this._reachable();
            if (after.nReached < before.nReached || after.lost.length > before.lost.length) { this._revert(done); continue; }
            added++;
        }
    }

    getStairAt(col, row) {
        return this._stairCells.get(KEY(col, row)) || null;
    }

    /* ------------------------------------------------------------------ moss / objects */
    _moss() {
        this.moss = new Uint8Array(this.W * this.H);
        if (this.mossN === null) return;
        for (let r = this.bounds.minR; r <= this.bounds.maxR; r++)
            for (let c = this.bounds.minC; c <= this.bounds.maxC; c++) {
                if (this._lv(c, r) !== this.floorN) continue;
                // keep moss two cells away from every higher cell and from the stairs
                let ok = true;
                for (let dr = -2; dr <= 2 && ok; dr++)
                    for (let dc = -2; dc <= 2; dc++) {
                        if (this._lv(c + dc, r + dr) !== this.floorN || this._stairCells.has(KEY(c + dc, r + dr))) { ok = false; break; }
                    }
                if (!ok) continue;
                const n = 0.65 * this._vnoise(c, r, 6, 303) + 0.35 * this._vnoise(c, r, 3, 404);
                if (n > 0.22) this.moss[this._idx(c, r)] = 1;
            }
    }

    /* a cell an object may stand on: open ground the player can reach, well inside an open area, away from the stairs and the doorway */
    _openCell(c, r) {
        if (!this._walkable(c, r)) return false;
        const comp = this._reach.comp[this._idx(c, r)];
        if (comp < 0 || !this._reach.seen.has(comp)) return false;
        // every neighbour is open ground on the same level: a solid object here can never cut a narrow passage
        const lv = this._lv(c, r);
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) if (this._lv(c + dc, r + dr) !== lv || !this._walkable(c + dc, r + dr)) return false;
        for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) if (this._stairCells.has(KEY(c + dc, r + dr))) return false;
        if (Math.abs(c - this.doorCol) <= 2 && Math.abs(r - this.doorRow) <= 3) return false;
        return true;
    }

    _scatter() {
        this.objects = new Map();
        const list = this.config.scatter || (this.config.lootObject ? [this.config.lootObject] : []);
        const chance = this.config.scatterChance !== undefined ? this.config.scatterChance : 0.025;
        if (list.length) {
            for (let r = this.bounds.minR + 1; r < this.bounds.maxR; r++)
                for (let c = this.bounds.minC + 1; c < this.bounds.maxC; c++) {
                    if (!this._openCell(c, r)) continue;
                    if (this._hash(c, r, 505) >= chance) continue;
                    // never two objects side by side: a few boulders in a row could wall a pocket off
                    let crowded = false;
                    for (let dr = -1; dr <= 1 && !crowded; dr++)
                        for (let dc = -1; dc <= 1; dc++) if (this.objects.has(`${c + dc},${r + dr}`)) { crowded = true; break; }
                    if (crowded) continue;
                    this.objects.set(`${c},${r}`, list[Math.floor(this._hash(c, r, 606) * list.length) % list.length]);
                }
        }
        // something at the bottom of the deepest room, when the definition asks for it
        if (this.config.depthObject && this.rooms.length) {
            const rm = this.rooms[0];
            for (let k = 0; k < 40; k++) {
                const c = rm.cx + (k % 5) - 2, r = rm.cy + Math.floor(k / 5) - 2;
                if (this._openCell(c, r)) { this.objects.set(`${c},${r}`, this.config.depthObject); break; }
            }
        }
    }

    /* ------------------------------------------------------------------ the generator interface */
    getBiomeAt(col, row) {
        return biomeFactory.getBiome('CAVE_INTERIOR') || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        const b = this.bounds;
        if (col < b.minC - 2 || col > b.maxC + 2 || row < b.minR - 2 || row > b.maxR + 2) return this.TILES.LAYER_0;
        // buffer ring: more rim, so the edge of the map is solid rock
        if (!this._inside(col, row)) return this.TILES['LAYER_' + this.wallN];
        const i = this._idx(col, row);
        const lv = this.level[i];
        if (lv === this.floorN && this.moss[i]) return this.TILES['LAYER_' + this.mossN];
        return this.TILES['LAYER_' + lv];
    }

    /* the doorway cell: the first open row under the hanging rock face (worldManager.isBlockedByFace is also told to let it through) */
    isDoorway(col, row) {
        return col === this.doorCol && row === this.doorRow;
    }

    /* the cells worldManager must not drop objects on: only the solid rim counts as wall (the ledges are ordinary ground) */
    isWallCell(col, row) {
        return this._lv(col, row) >= this.wallN || !this._inside(col, row);
    }

    getObjectIdAt(col, row) {
        if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) return null;
        // the mouth is a 3-wide sprite anchored at its left cell, on the doorway row; only its middle cell is the doorway
        if (col === this.doorCol - 1 && row === this.doorRow) return this.config.doorObject;
        return this.objects.get(`${col},${row}`) || null;
    }

    getEntrySpawnPoint() {
        // one tile below the cave mouth
        return { col: this.doorCol, row: this.doorRow + 1 };
    }

    invalidateTile(key) {
        // Unused for pre-generated interiors
    }
    clearCacheForKeys(keys) {
        // Unused for pre-generated interiors
    }
}
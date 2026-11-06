// shared/world/generators/catacombGenerator.js
//
// The catacombs under a mysterious altar: a dungeon, not a cave. One flat floor (floorTile) cut out of solid rock (wallTile), the walls' tops are void.
//
//   ENTRANCE     a built room at the south edge; the stairway up (doorObject) is in its north wall, like a cave mouth (isDoorway).
//   ROOMS        built rooms (straight walls of stone brick, flagstone floors) and caverns (natural rock, rough floor), a dozen or so.
//   CORRIDORS    3-wide passages routed between the rooms (a tree, plus a few loops): straight brick halls, or winding natural tunnels.
//   MAIN CHAMBER a large hall at the north edge. The ONLY way in is a short corridor from the ANTECHAMBER below it, closed by a gate (CATACOMB_GATE).
//   THE PUZZLE   a lever (LEVER) in each of the farthest dead-end rooms. The antechamber holds one cold brazier (BRAZIER_UNLIT) per lever; every lever pulled
//                lights one, and when every lever is down the gate rises (world/catacombPuzzle.js). `this.puzzle` = { levers, braziers, gate }.
//
// The same id always builds the same dungeon. Walls carry a style (getWallStyle: 'brick' round built rooms and halls, 'natural' round caverns and tunnels)
// and floors one too (getFloorStyle), which the BlobTerrainRenderer uses to pick the half of the catacomb tile sheets to draw from.
//
// Options of the definition (interiorDefinitions.js CATACOMBS): size { min, max } (half-width of the square map), rooms { min, max }, levers { min, max }.

import { CONFIG } from '../../core/constants.js';
import { biomeFactory } from '../biomeFactory.js';

const layerNumber = (name) => parseInt(String(name).replace('LAYER_', ''), 10);
const BRICK = 1, NATURAL = 2;

export class CatacombGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;
        let mod = 0;
        if (interiorId) mod = String(interiorId).split('_').reduce((acc, v) => acc + (isNaN(parseInt(v)) ? 0 : parseInt(v)), 0);
        this.seed = seed + mod;
        this.floorN = layerNumber(config.floorTile || 'LAYER_6');
        this.wallN = layerNumber(config.wallTile || 'LAYER_7');
        // a layout that cannot be finished (a room out of reach, too few rooms for the levers) is thrown away and the next seed tried
        for (let attempt = 0; attempt < 16; attempt++) {
            this._rng = this._makeRng(this.seed + attempt * 7919);
            this._salt = attempt;
            if (this._build()) return;
        }
        throw new Error('[CatacombGenerator] no layout after 16 attempts: ' + (this.failures || []).join(', '));
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
    _int(lo, hi) { return lo + Math.floor(this._rng() * (hi - lo + 1)); }
    _hash(a, b, salt) {
        let h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul((salt + this.seed + this._salt * 131) | 0, 83492791);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    _vnoise(x, y, scale, salt) {
        const fx0 = x / scale, fy0 = y / scale, gx = Math.floor(fx0), gy = Math.floor(fy0);
        const fx = fx0 - gx, fy = fy0 - gy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const h = (i, j) => this._hash(i, j, salt) * 2 - 1;
        return (h(gx, gy) * (1 - u) + h(gx + 1, gy) * u) * (1 - v) + (h(gx, gy + 1) * (1 - u) + h(gx + 1, gy + 1) * u) * v;
    }

    /* ------------------------------------------------------------------ grid */
    _idx(c, r) { return (r - this.bounds.minR) * this.W + (c - this.bounds.minC); }
    _inside(c, r) { const b = this.bounds; return c >= b.minC && c <= b.maxC && r >= b.minR && r <= b.maxR; }
    _floor(c, r) { return this._inside(c, r) && this.level[this._idx(c, r)] === this.floorN; }
    _setFloor(c, r, style, corridor = false) {
        if (!this._inside(c, r)) return;
        const b = this.bounds;
        if (c <= b.minC + 1 || c >= b.maxC - 1 || r <= b.minR + 1 || r >= b.maxR - 1) return;   // the outer ring stays rock
        const i = this._idx(c, r);
        if (this.protect[i]) return;
        if (this.level[i] !== this.floorN) { this.level[i] = this.floorN; this.style[i] = style; if (corridor) this.corridor[i] = 1; }
    }
    /* a floor cell the player can stand on: not under the face of a wall (the rock hangs into the cell below it) */
    _walkable(c, r) {
        if (!this._floor(c, r)) return false;
        if (c === this.doorCol && r === this.doorRow) return true;
        return this._floor(c, r - 1);
    }
    _rectFree(x0, y0, x1, y1, margin) {
        const b = this.bounds;
        if (x0 - margin < b.minC + 2 || x1 + margin > b.maxC - 2 || y0 - margin < b.minR + 2 || y1 + margin > b.maxR - 2) return false;
        for (const rm of this.rooms) if (x0 - margin <= rm.x1 && x1 + margin >= rm.x0 && y0 - margin <= rm.y1 && y1 + margin >= rm.y0) return false;
        for (let r = y0 - margin; r <= y1 + margin; r++) for (let c = x0 - margin; c <= x1 + margin; c++) if (this.forbid[this._idx(c, r)]) return false;
        return true;
    }
    _addRoom(kind, x0, y0, x1, y1, role = 'room') {
        const rm = { kind, role, x0, y0, x1, y1, cx: Math.round((x0 + x1) / 2), cy: Math.round((y0 + y1) / 2), id: this.rooms.length };
        if (kind === 'built') {
            for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) this._setFloor(c, r, BRICK);
        } else {
            const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, salt = 300 + rm.id * 7;
            for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) {
                const dx = (c - rm.cx) / rx, dy = (r - rm.cy) / ry;
                if (Math.sqrt(dx * dx + dy * dy) + 0.28 * this._vnoise(c, r, 3.5, salt) < 0.95) this._setFloor(c, r, NATURAL);
            }
            for (let r = rm.cy - 1; r <= rm.cy + 1; r++) for (let c = rm.cx - 1; c <= rm.cx + 1; c++) this._setFloor(c, r, NATURAL);
        }
        this.rooms.push(rm);
        return rm;
    }

    /* a layout given up on: why (kept for the tests and for tuning), and false */
    _fail(reason) { (this.failures || (this.failures = [])).push(reason); return false; }

    /* ------------------------------------------------------------------ the layout */
    _build() {
        const sz = this.config.size || {};
        const half = this._int(sz.min || 46, sz.max || 56);
        this.bounds = { minC: -half, maxC: half, minR: -half, maxR: half };
        this.W = this.H = half * 2 + 1;
        const N = this.W * this.H;
        this.level = new Int8Array(N).fill(this.wallN);
        this.style = new Uint8Array(N);
        this.corridor = new Uint8Array(N);
        this.forbid = new Uint8Array(N);   // corridors may not be cut here (the main chamber and the gate corridor, the stairway)
        this.protect = new Uint8Array(N);  // cells nothing may change after they are set
        this.rooms = [];
        const b = this.bounds;
        const mark = (arr, x0, y0, x1, y1) => { for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) if (this._inside(c, r)) arr[this._idx(c, r)] = 1; };

        /* 1. the main chamber at the north, the gate corridor and the antechamber below it */
        const mw = this._int(7, 9) * 2 + 1, mh = this._int(10, 12);
        const mcx = this._int(-Math.floor(half / 3), Math.floor(half / 3));
        const M = this._addRoom('built', mcx - (mw - 1) / 2, b.minR + 4, mcx + (mw - 1) / 2, b.minR + 3 + mh, 'chamber');
        const aw = this._int(5, 6) * 2 + 1, ah = this._int(7, 9), gap = this._int(5, 7);
        const ay0 = M.y1 + 1 + gap;
        const A = this._addRoom('built', mcx - (aw - 1) / 2, ay0, mcx + (aw - 1) / 2, ay0 + ah - 1, 'antechamber');
        for (let r = M.y1 + 1; r < ay0; r++) for (let c = mcx - 1; c <= mcx + 1; c++) this._setFloor(c, r, BRICK, true);
        this.gate = { c: mcx - 1, r: M.y1 + 2 };   // the gate's anchor: the bottom-left of its 3 x 2 cells, one row into the corridor
        mark(this.forbid, M.x0 - 3, M.y0 - 3, M.x1 + 3, M.y1 + 3);
        mark(this.forbid, mcx - 3, M.y1, mcx + 3, ay0 - 1);
        mark(this.protect, M.x0 - 1, M.y0 - 1, M.x1 + 1, M.y1 + 1);
        mark(this.protect, mcx - 2, M.y1 + 1, mcx + 2, ay0 - 1);

        /* 2. the entrance at the south, the stairway up in its north wall */
        const ew = this._int(4, 5) * 2 + 1, eh = this._int(7, 8);
        const ecx = this._int(-Math.floor(half / 2), Math.floor(half / 2));
        const ey1 = b.maxR - 5;
        if (!this._rectFree(ecx - (ew - 1) / 2, ey1 - eh + 1, ecx + (ew - 1) / 2, ey1, 3)) return this._fail('entrance');
        const E = this._addRoom('built', ecx - (ew - 1) / 2, ey1 - eh + 1, ecx + (ew - 1) / 2, ey1, 'entrance');
        this.doorCol = ecx;
        this.doorRow = E.y0 + 1;   // the wall's face hangs into row y0; the doorway is the first open row under it
        mark(this.forbid, ecx - 3, E.y0 - 3, ecx + 3, E.y0 + 2);
        mark(this.protect, ecx - 2, E.y0 - 1, ecx + 2, E.y0 - 1);

        /* 3. the other rooms: built rooms and caverns */
        const rc = this.config.rooms || {};
        const want = this._int(rc.min || 11, rc.max || 15);
        for (let tries = 0; tries < 900 && this.rooms.length < want + 3; tries++) {
            const cavern = this._rng() < 0.42;
            const w = cavern ? this._int(10, 16) : this._int(7, 12), h = cavern ? this._int(9, 14) : this._int(6, 10);
            const x0 = this._int(b.minC + 3, b.maxC - 3 - w), y0 = this._int(b.minR + 3, b.maxR - 3 - h);
            if (!this._rectFree(x0, y0, x0 + w - 1, y0 + h - 1, 3)) continue;
            this._addRoom(cavern ? 'cavern' : 'built', x0, y0, x0 + w - 1, y0 + h - 1);
        }
        const others = this.rooms.filter((rm) => rm.role === 'room');
        if (others.length < 6) return this._fail('rooms ' + others.length);

        /* 4. corridors: a minimum spanning tree over every room but the chamber, from the entrance, plus a few loops */
        const nodes = this.rooms.filter((rm) => rm.role !== 'chamber');
        const dist = (p, q) => Math.hypot(p.cx - q.cx, p.cy - q.cy);
        const inTree = new Set([E.id]), edges = [];
        while (inTree.size < nodes.length) {
            let best = null;
            for (const p of nodes) if (inTree.has(p.id)) for (const q of nodes) if (!inTree.has(q.id)) {
                const d = dist(p, q);
                if (!best || d < best.d) best = { p, q, d };
            }
            edges.push([best.p, best.q]);
            inTree.add(best.q.id);
        }
        const has = (p, q) => edges.some(([x, y]) => (x === p && y === q) || (x === q && y === p));
        for (const p of nodes) {
            if (this._rng() > 0.3) continue;
            const near = nodes.filter((q) => q !== p && !has(p, q)).sort((x, y) => dist(p, x) - dist(p, y))[0];
            if (near && dist(p, near) < half * 0.9) edges.push([p, near]);
        }
        this.edges = edges;
        for (const [p, q] of edges) {
            const natural = p.kind === 'cavern' && q.kind === 'cavern' ? true : (p.kind === 'built' && q.kind === 'built' ? false : this._rng() < 0.5);
            if (!this._corridor(p, q, natural)) return this._fail('corridor');
        }

        /* 5. clean-up: no one-cell slivers of rock between two floors (they would only be a stray face) */
        for (let pass = 0; pass < 2; pass++)
            for (let r = b.minR + 2; r <= b.maxR - 2; r++) for (let c = b.minC + 2; c <= b.maxC - 2; c++) {
                const i = this._idx(c, r);
                if (this.level[i] === this.floorN || this.protect[i]) continue;
                const ns = this._floor(c, r - 1) && this._floor(c, r + 1), ew2 = this._floor(c - 1, r) && this._floor(c + 1, r);
                if (ns || ew2) { const j = ns ? this._idx(c, r - 1) : this._idx(c - 1, r); this.level[i] = this.floorN; this.style[i] = this.style[j] || BRICK; this.corridor[i] = this.corridor[j]; }
            }

        /* 6. every room reachable from the stairway (the gate counts as open) */
        this._reach = this._reachable();
        for (const rm of this.rooms) if (!this._roomReached(rm)) return this._fail('unreached ' + rm.role + ' ' + rm.kind);

        /* 7. the puzzle: levers in the farthest rooms (dead ends first), braziers in the antechamber */
        if (!this._placePuzzle(E, A, M)) return this._fail('puzzle');

        /* 8. the styles of the walls, then the furnishings */
        this._wallStyles();
        this._furnish(E, A, M);
        this.entrance = E; this.antechamber = A; this.chamber = M;
        return true;
    }

    /* A corridor between two rooms: an A* path between their middles over the rock (a cell already cut is cheaper, so halls join up), cut 3 wide.
       A natural tunnel's cost is warped by noise, so it winds; a brick hall pays for every turn, so it runs straight. */
    _corridor(p, q, natural) {
        const b = this.bounds, W = this.W;
        const okCell = (c, r) => {
            if (c - 1 <= b.minC + 1 || c + 1 >= b.maxC - 1 || r - 1 <= b.minR + 1 || r + 1 >= b.maxR - 1) return false;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (this.forbid[this._idx(c + dc, r + dr)] && !this._floor(c + dc, r + dr)) return false;
            return true;
        };
        const start = this._idx(p.cx, p.cy), goal = this._idx(q.cx, q.cy);
        const N = this.W * this.H, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), dirOf = new Int8Array(N).fill(-1);
        const heap = [];
        const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const pa = (k - 1) >> 1; if (heap[pa][0] <= heap[k][0]) break; [heap[pa], heap[k]] = [heap[k], heap[pa]]; k = pa; } };
        const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
        const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        g[start] = 0; push(start, 0);
        while (heap.length) {
            const [, i] = pop();
            if (i === goal) break;
            const c = (i % W) + b.minC, r = Math.floor(i / W) + b.minR;
            for (let d = 0; d < 4; d++) {
                const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
                if (!this._inside(nc, nr) || !okCell(nc, nr)) continue;
                const j = this._idx(nc, nr);
                let cost = this._floor(nc, nr) ? 0.4 : 1;
                if (natural) cost += 1.6 * (this._vnoise(nc, nr, 5, 900 + p.id * 3 + q.id) + 1) * 0.5;
                else if (dirOf[i] !== -1 && dirOf[i] !== d) cost += 2.5;
                const ng = g[i] + cost;
                if (ng < g[j]) { g[j] = ng; from[j] = i; dirOf[j] = d; push(j, ng + Math.abs(nc - q.cx) + Math.abs(nr - q.cy)); }
            }
        }
        if (from[goal] === -1 && goal !== start) return false;
        const style = natural ? NATURAL : BRICK;
        for (let i = goal; i !== -1; i = from[i]) {
            const c = (i % W) + b.minC, r = Math.floor(i / W) + b.minR;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) this._setFloor(c + dc, r + dr, style, true);
            if (natural && this._hash(c, r, 77) < 0.3) {   // a tunnel's walls are ragged
                const dc = this._hash(c, r, 78) < 0.5 ? -2 : 2, dr = this._hash(c, r, 79) < 0.5 ? -2 : 2;
                if (okCell(c + dc, r)) this._setFloor(c + dc, r, style, true);
                if (okCell(c, r + dr)) this._setFloor(c, r + dr, style, true);
            }
            if (i === start) break;
        }
        return true;
    }

    _reachable() {
        const seen = new Uint8Array(this.W * this.H);
        const gateCells = new Set([0, 1, 2].map((k) => this._idx(this.gate.c + k, this.gate.r)));
        const sc = this.doorCol, sr = this.doorRow + 1;
        const queue = [[sc, sr]];
        seen[this._idx(sc, sr)] = 1;
        const distance = new Int32Array(this.W * this.H).fill(-1);
        distance[this._idx(sc, sr)] = 0;
        while (queue.length) {
            const [c, r] = queue.shift();
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nc = c + dc, nr = r + dr;
                if (!this._inside(nc, nr)) continue;
                const j = this._idx(nc, nr);
                if (seen[j] || !(this._walkable(nc, nr) || gateCells.has(j))) continue;
                seen[j] = 1;
                distance[j] = distance[this._idx(c, r)] + 1;
                queue.push([nc, nr]);
            }
        }
        return { seen, distance };
    }
    _roomReached(rm) {
        for (let r = rm.y0; r <= rm.y1; r++) for (let c = rm.x0; c <= rm.x1; c++) if (this._inside(c, r) && this._reach.seen[this._idx(c, r)]) return true;
        return false;
    }
    _roomDistance(rm) {
        let best = Infinity;
        for (let r = rm.y0; r <= rm.y1; r++) for (let c = rm.x0; c <= rm.x1; c++) {
            const d = this._inside(c, r) ? this._reach.distance[this._idx(c, r)] : -1;
            if (d >= 0 && d < best) best = d;
        }
        return best;
    }

    /* ------------------------------------------------------------------ the puzzle */
    _placePuzzle(E, A, M) {
        const lv = this.config.levers || {};
        const want = this._int(lv.min || 3, lv.max || 4);
        const degree = new Map();
        for (const [p, q] of this.edges) { degree.set(p.id, (degree.get(p.id) || 0) + 1); degree.set(q.id, (degree.get(q.id) || 0) + 1); }
        const cands = this.rooms.filter((rm) => rm.role === 'room').map((rm) => ({ rm, cell: this._leverCell(rm), far: this._roomDistance(rm), leaf: degree.get(rm.id) === 1 }))
            .filter((x) => x.cell && Number.isFinite(x.far));
        if (cands.length < 3) return this._fail('lever rooms ' + cands.length);
        // greedy: far from the stairway, dead ends preferred, and spread apart from each other
        const picked = [];
        while (picked.length < Math.min(want, cands.length)) {
            let best = null;
            for (const x of cands) {
                if (picked.includes(x)) continue;
                const spread = picked.length ? Math.min(...picked.map((y) => Math.hypot(x.rm.cx - y.rm.cx, x.rm.cy - y.rm.cy))) : 40;
                const score = x.far * 0.6 + spread * 1.4 + (x.leaf ? 25 : 0);
                if (!best || score > best.score) best = { x, score };
            }
            picked.push(best.x);
        }
        const levers = picked.map((x, k) => { x.rm.role = 'lever'; x.rm.lever = k; return { c: x.cell.c, r: x.cell.r, room: x.rm.id }; });
        const offsets = [-2, 2, -4, 4, -6, 6].slice(0, levers.length);
        const braziers = offsets.map((dx) => ({ c: M.cx + dx, r: A.y0 + 1 }));
        if (!braziers.every((p) => this._floor(p.c, p.r) && this._floor(p.c, p.r + 1))) return this._fail('braziers');
        this.puzzle = { levers, braziers, gate: { ...this.gate } };
        this.objects = new Map();
        this.solid = new Set();
        this.reserved = new Set();
        for (const p of levers) { this._put(p.c, p.r, 'LEVER'); this._reserve(p.c - 1, p.r, p.c + 1, p.r + 1); }
        for (const p of braziers) { this._put(p.c, p.r, 'BRAZIER_UNLIT'); this._reserve(p.c, p.r - 1, p.c, p.r + 1); }
        this._put(this.gate.c, this.gate.r, 'CATACOMB_GATE');
        this._reserve(this.gate.c, this.gate.r - 1, this.gate.c + 2, this.gate.r + 1);
        return true;
    }
    /* a lever stands against a wall: the second row under a north wall (the face fills the first), with room to stand in front of it, as near the middle of the room as can be */
    _leverCell(rm) {
        let best = null;
        for (let r = rm.y0; r <= rm.y1; r++) for (let c = rm.x0 + 1; c <= rm.x1 - 1; c++) {
            if (!this._walkable(c, r) || this._floor(c, r - 2) || !this._floor(c, r - 1)) continue;   // the wall is two rows up
            if (!this._walkable(c, r + 1) || !this._walkable(c - 1, r) || !this._walkable(c + 1, r) || this.corridor[this._idx(c, r)]) continue;
            const d = Math.abs(c - rm.cx) + Math.abs(r - rm.y0) * 0.5;
            if (!best || d < best.d) best = { c, r, d };
        }
        return best;
    }

    /* ------------------------------------------------------------------ styles and furnishings */
    _wallStyles() {
        // every rock cell takes the style of the nearest floor within three cells (a breadth-first spread outward from the floor)
        const N = this.W * this.H, ws = new Uint8Array(N);
        let frontier = [];
        for (let r = this.bounds.minR; r <= this.bounds.maxR; r++) for (let c = this.bounds.minC; c <= this.bounds.maxC; c++) {
            const i = this._idx(c, r);
            if (this.level[i] === this.floorN) { ws[i] = this.style[i] || BRICK; frontier.push([c, r]); }
        }
        for (let step = 0; step < 3; step++) {
            const next = [];
            for (const [c, r] of frontier) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
                const nc = c + dc, nr = r + dr;
                if (!this._inside(nc, nr)) continue;
                const j = this._idx(nc, nr);
                if (ws[j]) continue;
                ws[j] = ws[this._idx(c, r)];
                next.push([nc, nr]);
            }
            frontier = next;
        }
        this.wallStyle = ws;
    }
    _put(c, r, id, solid = true) { this.objects.set(`${c},${r}`, id); if (solid) this.solid.add(`${c},${r}`); }
    _reserve(x0, y0, x1, y1) { for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) this.reserved.add(`${c},${r}`); }
    _free(c, r) { const k = `${c},${r}`; return !this.objects.has(k) && !this.reserved.has(k); }
    /* room for a solid object: open all round, nothing solid beside it, and not in a corridor (nothing may block a passage) */
    _roomy(c, r) {
        if (!this._walkable(c, r) || !this._free(c, r) || this.corridor[this._idx(c, r)]) return false;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!this._walkable(c + dc, r + dr) && !(dr === -1 && this._floor(c + dc, r + dr))) return false;
            if (this.solid.has(`${c + dc},${r + dr}`)) return false;
        }
        return true;
    }
    _furnish(E, A, M) {
        // the entrance: a torch on each side of the stairway, the spawn row kept clear
        this._reserve(this.doorCol - 1, this.doorRow, this.doorCol + 1, this.doorRow + 2);
        for (const dx of [-3, 3]) if (this._walkable(this.doorCol + dx, this.doorRow) && this._free(this.doorCol + dx, this.doorRow)) this._put(this.doorCol + dx, this.doorRow, 'STANDING_TORCH');
        // the antechamber: a torch in each lower corner
        for (const c of [A.x0 + 1, A.x1 - 1]) if (this._roomy(c, A.y1 - 1)) this._put(c, A.y1 - 1, 'STANDING_TORCH');
        // the main chamber: the hoard on a dais of torches at the far end, graves along the sides
        const hx = M.cx, hy = M.y0 + 3;
        this._put(hx, hy, 'IRON_CHEST');
        this._put(hx - 2, hy, 'WOODEN_CHEST'); this._put(hx + 2, hy, 'WOODEN_CHEST');
        for (const [dx, dy] of [[-4, -1], [4, -1], [-4, 3], [4, 3]]) this._put(hx + dx, hy + dy, 'STANDING_TORCH');
        this._reserve(hx - 3, hy + 1, hx + 3, hy + 1);
        for (let r = M.y0 + 6; r <= M.y1 - 2; r += 2) for (const c of [M.x0 + 1, M.x1 - 1]) if (this._roomy(c, r)) this._put(c, r, 'TOMBSTONE');
        this._reserve(M.cx - 1, M.y0, M.cx + 1, M.y1);   // the way up the hall to the hoard
        // the other rooms: crypt rows of graves in built rooms, fallen rock in caverns; torches here and there; chests now and then
        for (const rm of this.rooms) {
            if (rm.role !== 'room' && rm.role !== 'lever') continue;
            if (rm.kind === 'built') {
                for (let c = rm.x0 + 1; c <= rm.x1 - 1; c += 2) if (this._hash(c, rm.y0, 41) < 0.55 && this._roomy(c, rm.y0 + 2)) this._put(c, rm.y0 + 2, 'TOMBSTONE');
            }
            if (this._hash(rm.cx, rm.cy, 43) < 0.45) {
                const c = rm.x0 + 1, r = rm.y1 - 1;
                if (this._roomy(c, r)) this._put(c, r, 'STANDING_TORCH');
            }
            if (this._hash(rm.cx, rm.cy, 47) < (rm.role === 'lever' ? 0.6 : 0.3)) {
                for (let k = 0; k < 20; k++) {
                    const c = rm.x0 + 1 + Math.floor(this._hash(rm.id, k, 48) * Math.max(1, rm.x1 - rm.x0 - 1)), r = rm.y0 + 2 + Math.floor(this._hash(rm.id, k, 49) * Math.max(1, rm.y1 - rm.y0 - 2));
                    if (this._roomy(c, r)) { this._put(c, r, 'WOODEN_CHEST'); break; }
                }
            }
        }
        // the dead's own stores: a few barrels (ancient, or burst and ruined) and crates against the walls of most rooms (searched like any container)
        for (const rm of this.rooms) {
            if (rm.role !== 'room' && rm.role !== 'lever' && rm.role !== 'antechamber') continue;
            if (this._hash(rm.id, 3, 71) > 0.75) continue;
            const want = 1 + Math.floor(this._hash(rm.id, 4, 72) * 3);
            let placed = 0;
            for (let k = 0; k < 60 && placed < want; k++) {
                const c = rm.x0 + 1 + Math.floor(this._hash(rm.id, k, 73) * Math.max(1, rm.x1 - rm.x0 - 1));
                const r = rm.y0 + 2 + Math.floor(this._hash(rm.id, k, 74) * Math.max(1, rm.y1 - rm.y0 - 2));
                const byWall = !this._floor(c - 2, r) || !this._floor(c + 2, r) || !this._floor(c, r + 2) || !this._floor(c, r - 3);
                if (!byWall || !this._roomy(c, r)) continue;
                const h = this._hash(c, r, 75);
                this._put(c, r, h < 0.4 ? 'ANCIENT_BARREL' : h < 0.65 ? 'RUINED_BARREL' : 'CRATE');
                placed++;
            }
        }
        this._placeTraps();
        // loose things everywhere a foot can go; boulders only in the natural parts
        for (let r = this.bounds.minR; r <= this.bounds.maxR; r++) for (let c = this.bounds.minC; c <= this.bounds.maxC; c++) {
            if (!this._walkable(c, r) || !this._free(c, r)) continue;
            const nat = this.style[this._idx(c, r)] === NATURAL, h = this._hash(c, r, 61);
            if (nat && h < 0.012 && this._roomy(c, r)) { this._put(c, r, this._hash(c, r, 62) < 0.5 ? 'BOULDER_1' : 'BOULDER_2'); continue; }
            if (h > 0.96) this._put(c, r, 'BONE_PILE', false);
            else if (h > 0.948) this._put(c, r, 'DESERT_SKULL', false);
            else if (nat && h > 0.93) this._put(c, r, ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'][Math.floor(this._hash(c, r, 63) * 3) % 3], false);
        }
    }

    /* The traps: an arrow plate, a sinking floor or swinging blades in the halls (and now and then a room), never near the stairway, never on the
       puzzle's cells, at least SPACING cells from one another. Each is one floor tile drawn from the flagstone floor, so only flagstone cells take one
       (on the rough rock of a cavern it would stand out). They block nothing: each is a walk-in encounter you can survive. */
    _placeTraps() {
        const SPACING = 9, MIN_FROM_STAIRS = 14;
        const want = this._int(9, 13);
        const cands = [];
        for (let r = this.bounds.minR; r <= this.bounds.maxR; r++) for (let c = this.bounds.minC; c <= this.bounds.maxC; c++) {
            if (!this._walkable(c, r) || !this._free(c, r) || this.style[this._idx(c, r)] !== BRICK) continue;
            const d = this._reach.distance[this._idx(c, r)];
            if (d < MIN_FROM_STAIRS) continue;
            const hall = this.corridor[this._idx(c, r)];
            if (!hall && this._hash(c, r, 81) > 0.25) continue;            // mostly the halls
            cands.push({ c, r, key: this._hash(c, r, 82) });
        }
        cands.sort((a, b) => a.key - b.key);
        this.traps = [];
        const kinds = ['TRAP_ARROW', 'TRAP_PIT', 'TRAP_AXES'];
        for (const p of cands) {
            if (this.traps.length >= want) break;
            if (this.traps.some((t) => Math.abs(t.c - p.c) + Math.abs(t.r - p.r) < SPACING)) continue;
            const kind = kinds[this.traps.length % 3];
            this._put(p.c, p.r, kind, false);
            this.traps.push({ c: p.c, r: p.r, kind });
        }
    }

    /* ------------------------------------------------------------------ the generator interface */
    getBiomeAt() { return biomeFactory.getBiome(this.config.biome || 'CATACOMBS_INTERIOR') || biomeFactory.getBiome('CAVE_INTERIOR'); }
    getTileAt(col, row) {
        const b = this.bounds;
        if (col < b.minC - 2 || col > b.maxC + 2 || row < b.minR - 2 || row > b.maxR + 2) return this.TILES.LAYER_0;
        if (!this._inside(col, row)) return this.TILES['LAYER_' + this.wallN];
        return this.TILES['LAYER_' + this.level[this._idx(col, row)]];
    }
    getStairAt() { return null; }
    isDoorway(col, row) { return col === this.doorCol && row === this.doorRow; }
    isWallCell(col, row) { return !this._inside(col, row) || this.level[this._idx(col, row)] >= this.wallN; }
    getObjectIdAt(col, row) {
        if (!this._inside(col, row)) return null;
        if (col === this.doorCol - 1 && row === this.doorRow) return this.config.doorObject;
        return this.objects.get(`${col},${row}`) || null;
    }
    getEntrySpawnPoint() { return { col: this.doorCol, row: this.doorRow + 1 }; }
    /** 'brick' or 'natural': which half of the catacomb wall sheets this cell's rock is drawn from (BlobTerrainRenderer) */
    getWallStyle(col, row) { return this._inside(col, row) && this.wallStyle[this._idx(col, row)] === NATURAL ? 'natural' : 'brick'; }
    /** 'brick' (flagstones) or 'natural' (rough rock): the floor's look */
    getFloorStyle(col, row) { return this._inside(col, row) && this.style[this._idx(col, row)] === NATURAL ? 'natural' : 'brick'; }
    invalidateTile() {}
    clearCacheForKeys() {}
}

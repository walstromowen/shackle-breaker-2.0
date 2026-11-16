/* CASTLE SITES - where the ruined castles stand in the overworld, and what the terrain is there.

   The world is cut into REGION x REGION squares. Each square holds a castle with chance CHANCE, at a spot picked from the world seed (of TRIES), where
   the ground it would take is plains (all of its middle, most of its fringe), away from the start of the world, with no older structure there. A castle stands on a great plateau
   raised for it: the castle's plan (castleLayout.js) on a plateau that follows the castle's outline, MARGIN to MARGIN + WOBBLE cells round it, and
   a RING of open ground round the foot of the plateau so its cliff is one clean level everywhere; a broad stair climbs it in front of the gate.

   Nothing of this is stored: every player computes the same castles from the seed (the plan is a few hundred milliseconds, done once per castle when
   the terrain first looks inside its box). The map objects (towers, keep, gatehouse, houses, the clutter) are written into the world's changes once,
   the first time a chunk in the box has its turn at a structure (StructureSpawner), so what is taken or broken stays so; gameState.world.castlesBuilt
   remembers which castles have been written.

   Per cell, for the terrain and the renderer:
     levelAt(col, row)     the cell's level index (2 the open ground of the ring, 3 the plateau and the castle's yards, 4 its walls and the inner ward,
                           5 the inner wall and the keep's skirt, 6 the keep's core), or -1 where the castle does not reach (the terrain's own)
     levelPathAt           a cobbled yard on a level (WorldManager.isLevelPath: drawn with the pack's cobbles)
     isCastleCell          inside the castle (its walls, towers, yards, the gate's approach): the CASTLE_GROUNDS biome
     coverAt               no battlements drawn here (a tower, the keep, the gatehouse's piers, the inner wall's step stand over them)
     stairAt               the castle's stone flights (kind 'C') and the stair up the plateau (kind 'S')
     gateKindAt            'outer' / 'inner' on the way through one of its gates (WorldManager bars it while that gate is shut), else null
     plainWallAt           round a gatehouse: the walls' faces drawn from their plain variants only
*/
import { planCastle, CASTLE } from './castleLayout.js';
import { gameState } from '../core/gameState.js';

export const CASTLE_SITES = {
    REGION: 560,
    CHANCE: 0.85,
    PLAINS_SHARE: 0.8,   // of the box's samples (its middle wholly)
    TRIES: 24,
    BOX: 270,            // the most a castle and its plateau can take, cells square (the plan is at most ~190 across)
    MARGIN: 9,           // cells of open plateau round the castle's outline at the least
    WOBBLE: 9,           // and up to this many more, swelling and drawing in along the edge
    SEG: 14,             // over stretches about this long
    GATE_BAND: 4,        // the plateau's edge runs straight this many cells either side of the stair up it
    RING: 3,             // open ground round the plateau's foot
    BASE: 3,             // the plateau's level (LAYER_3)
    START_CLEAR: 220,    // no castle within this many cells of the start of the world
    GATES_SHUT: false,   // true: the outer gates are shut (portcullises down, the ways through barred) before OPEN_ACT. Open for now: act 4 is not in the game yet
    OPEN_ACT: 4,
    INNER_SHUT: false,   // true: every inner gate is shut until opened (WorldManager.openInnerGate, from an encounter at it). Open for now
};
const NONE = -1, F_PATH = 1, F_CASTLE = 2, F_COVER = 4;

function hash(seed, a, b, salt) {
    let h = (seed | 0) ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(salt | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

export class CastleSites {
    constructor(terrain) {
        this.terrain = terrain;
        this.seed = terrain.seed;
        this._regions = new Map();        // region key -> site | null
        this._last = null;                // the site the last query fell in (most queries come in runs)
    }

    // ---- sites ----
    _regionKey(rx, ry) { return rx * 65536 + ry; }
    /* the site of region (rx, ry): { id, seed, bx, by (its box's top-left), built?, planned data once planned }, or null */
    _site(rx, ry) {
        const k = this._regionKey(rx, ry);
        if (this._regions.has(k)) return this._regions.get(k);
        const C = CASTLE_SITES, s = this.seed;
        let site = null;
        if (hash(s, rx, ry, 1) < C.CHANCE) {
            // up to TRIES spots in the region, the first whose whole box is plains (biomes are a few hundred cells across: a castle's box is big)
            const room = C.REGION - C.BOX - 40;
            for (let k = 0; k < C.TRIES && !site; k++) {
                const bx = rx * C.REGION + 20 + Math.floor(hash(s, rx, ry, 10 + k * 2) * room);
                const by = ry * C.REGION + 20 + Math.floor(hash(s, rx, ry, 11 + k * 2) * room);
                const cand = { id: rx + ',' + ry, seed: Math.floor(hash(s, rx, ry, 4) * 2147483646) + 1, bx, by, data: null };
                if (this._valid(cand)) site = cand;
            }
        }
        this._regions.set(k, site);
        return site;
    }
    /* a site is kept when it was built already (a saved world), or when its whole box is plains, away from the start, with no older structure in it */
    _valid(site) {
        const C = CASTLE_SITES, B = C.BOX;
        const built = gameState.world && gameState.world.castlesBuilt;
        if (built && built[site.id] && built[site.id] !== 1 && built[site.id] !== site.bx + ',' + site.by) return false;   // (built at another spot)
        if (built && built[site.id]) return true;
        const cx = site.bx + B / 2, cy = site.by + B / 2;
        if (Math.abs(cx) < C.START_CLEAR + B / 2 && Math.abs(cy) < C.START_CLEAR + B / 2) return false;
        // the middle of the box (where the castle stands) all plains, and most of the rest (the plateau's fringe may run into a neighbour's land)
        let plains = 0;
        for (let j = 0; j <= 8; j++) for (let i = 0; i <= 8; i++) {
            const b = this.terrain._naturalBiomeAt(site.bx + Math.round(i * (B - 1) / 8), site.by + Math.round(j * (B - 1) / 8));
            const isPlains = !!b && b.id === 'PLAINS';
            if (isPlains) plains++;
            else if (i >= 2 && i <= 6 && j >= 2 && j <= 6) return false;
        }
        if (plains < 81 * C.PLAINS_SHARE) return false;
        // a saved world that had structures planned here before castles stood in the plains keeps them
        const rec = gameState.world && gameState.world.structureChunks;
        if (rec && rec.chunks) {
            const CS = 16;
            for (let y = Math.floor(site.by / CS); y <= Math.floor((site.by + B) / CS); y++)
                for (let x = Math.floor(site.bx / CS); x <= Math.floor((site.bx + B) / CS); x++)
                    if (rec.chunks[x + ',' + y]) return false;
        }
        return true;
    }
    /* the site whose box holds (col, row), or null (planned on first use) */
    siteAt(col, row) {
        const L = this._last, B = CASTLE_SITES.BOX;
        if (L && col >= L.bx && col < L.bx + B && row >= L.by && row < L.by + B) return L;
        const R = CASTLE_SITES.REGION;
        const site = this._site(Math.floor(col / R), Math.floor(row / R));
        if (!site || col < site.bx || col >= site.bx + B || row < site.by || row >= site.by + B) return null;
        this._last = site;
        return site;
    }
    /* every site whose box meets the cells c0..c1 x r0..r1 */
    sitesIn(c0, r0, c1, r1) {
        const R = CASTLE_SITES.REGION, B = CASTLE_SITES.BOX, out = [];
        for (let ry = Math.floor(r0 / R); ry <= Math.floor(r1 / R); ry++)
            for (let rx = Math.floor(c0 / R); rx <= Math.floor(c1 / R); rx++) {
                const s = this._site(rx, ry);
                if (s && s.bx <= c1 && s.bx + B > c0 && s.by <= r1 && s.by + B > r0) out.push(s);
            }
        return out;
    }

    // ---- the plan, laid on the world ----
    _data(site) {
        if (site.data) return site.data;
        const C = CASTLE_SITES, B = C.BOX, s = site.seed;
        const plan = planCastle(s);
        const ox = site.bx + Math.floor((B - plan.w) / 2), oy = site.by + Math.floor((B - plan.h) / 2);   // the plan's top-left, in the world
        const lvl = new Int8Array(B * B).fill(NONE), flag = new Uint8Array(B * B);
        const at = (x, y) => (y - site.by) * B + (x - site.bx);
        // the plateau: the castle's footprint (its cells and all they wall in) and a margin round it that follows its outline, MARGIN cells plus
        // up to WOBBLE more, the extra a smooth field over the box (runs of SEG cells) so the edge swells and draws in; its corners rounded, then
        // opened and closed by 2 cells so no sliver of cliff or notch too thin to draw is left. In front of the gate its edge runs straight: the stair.
        const T0 = plan.tiles;
        const foot = new Uint8Array(B * B);
        {   // the plan's open ground (2) reached from its border is outside; everything else is the castle
            const out = new Uint8Array(plan.w * plan.h), q = [];
            const push = (x, y) => { const k = y * plan.w + x; if (!out[k] && T0[y][x] === 2) { out[k] = 1; q.push(k); } };
            for (let x = 0; x < plan.w; x++) { push(x, 0); push(x, plan.h - 1); }
            for (let y = 0; y < plan.h; y++) { push(0, y); push(plan.w - 1, y); }
            while (q.length) {
                const k = q.pop(), x = k % plan.w, y = (k - x) / plan.w;
                if (x > 0) push(x - 1, y); if (x < plan.w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < plan.h - 1) push(x, y + 1);
            }
            for (let y = 0; y < plan.h; y++) for (let x = 0; x < plan.w; x++) if (!out[y * plan.w + x]) foot[at(ox + x, oy + y)] = 1;
        }
        // distance from the footprint (chamfer 5-7-11, in fifths of a cell: round corners)
        const dist = new Int32Array(B * B).fill(1 << 28);
        for (let i = 0; i < B * B; i++) if (foot[i]) dist[i] = 0;
        const K = [[-1, 0, 5], [0, -1, 5], [-1, -1, 7], [1, -1, 7], [-2, -1, 11], [-1, -2, 11], [1, -2, 11], [2, -1, 11]];
        for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
            let d = dist[y * B + x];
            for (const [dx, dy, w] of K) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < B && yy >= 0 && yy < B) d = Math.min(d, dist[yy * B + xx] + w); }
            dist[y * B + x] = d;
        }
        for (let y = B - 1; y >= 0; y--) for (let x = B - 1; x >= 0; x--) {
            let d = dist[y * B + x];
            for (const [dx, dy, w] of K) { const xx = x - dx, yy = y - dy; if (xx >= 0 && xx < B && yy >= 0 && yy < B) d = Math.min(d, dist[yy * B + xx] + w); }
            dist[y * B + x] = d;
        }
        const field = (x, y) => {   // smooth 0..1 over the box: value noise on a SEG grid
            const gx0 = Math.floor(x / C.SEG), gy0 = Math.floor(y / C.SEG), fx = x / C.SEG - gx0, fy = y / C.SEG - gy0;
            const v = (i, j) => hash(s, gx0 + i, gy0 + j, 9);
            const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
            return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sy) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sy;
        };
        let plat = new Uint8Array(B * B);
        const edge = C.RING + 4;   // room left in the box for the ring
        for (let y = edge; y < B - edge; y++) for (let x = edge; x < B - edge; x++) {
            const i = y * B + x;
            if (dist[i] <= 5 * (C.MARGIN + C.WOBBLE * field(x, y))) plat[i] = 1;
        }
        const morph = (src, grow, r) => {   // dilate (grow) or erode by a (2r+1) square
            const dst = new Uint8Array(B * B);
            for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
                let any = false, all = true;
                for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                    const xx = x + dx, yy = y + dy, v = xx >= 0 && xx < B && yy >= 0 && yy < B ? src[yy * B + xx] : 0;
                    if (v) any = true; else all = false;
                }
                dst[y * B + x] = (grow ? any : all) ? 1 : 0;
            }
            return dst;
        };
        // the gate's front: a straight edge at least MARGIN cells below the lowest castle cell in the stair's columns, the ground before it clear down to the
        // box's edge (a band GATE_BAND either side of the stair: wider first, so the clean-up below can round off what it cuts, then the stair's own)
        const P = C.MARGIN, gx = plan.gate ? ox + plan.gate.col + Math.floor(plan.gate.w / 2) : ox + Math.floor(plan.w / 2);
        let low = plan.gate ? oy + plan.gate.row : oy + plan.h - 1;
        for (let y = 0; y < B; y++) for (let x = gx - C.GATE_BAND; x <= gx + C.GATE_BAND; x++) if (foot[at(x, site.by + y)]) low = Math.max(low, site.by + y);
        // (or, where the plateau beside the stair reaches further south, as far as it does: the stair stands out on a shelf, never down a slot)
        let reach = low + P;
        for (let x = gx - C.GATE_BAND - 2; x <= gx + C.GATE_BAND + 2; x++)
            for (let y = site.by + B - 1; y > reach; y--) if (plat[at(x, y)]) { reach = y; break; }
        const bottom = Math.min(reach + 1, site.by + B - edge);
        const band = (w) => { for (let y = low; y < site.by + B; y++) for (let x = gx - w; x <= gx + w; x++) plat[at(x, y)] = y < bottom ? 1 : 0; };
        band(C.GATE_BAND + 2);
        plat = morph(morph(plat, true, 2), false, 2);    // close: fill notches
        plat = morph(morph(plat, false, 2), true, 2);    // open: drop slivers
        band(C.GATE_BAND);
        for (let i = 0; i < B * B; i++) if (plat[i] || foot[i]) lvl[i] = C.BASE;
        // the ring of open ground round its foot
        const R = C.RING;
        for (let y = site.by; y < site.by + B; y++) for (let x = site.bx; x < site.bx + B; x++) {
            if (lvl[at(x, y)] !== NONE) continue;
            let near = false;
            for (let dy = -R; dy <= R && !near; dy++) for (let dx = -R; dx <= R; dx++) {
                const xx = x + dx, yy = y + dy;
                if (xx >= site.bx && xx < site.bx + B && yy >= site.by && yy < site.by + B && lvl[at(xx, yy)] === C.BASE) { near = true; break; }
            }
            if (near) lvl[at(x, y)] = 2;
        }
        // the castle: its plan's tiles a level up from what they were drawn on (ground 2 and the yards' cobbles 1 are the plateau's level, each level of
        // wall one more), its cobbles and the inner ward's terrace drawn as cobbles on their level
        const T = plan.tiles, LP = new Set(plan.levelPaths || []);
        for (let y = 0; y < plan.h; y++) for (let x = 0; x < plan.w; x++) {
            const t = T[y][x], i = at(ox + x, oy + y);
            if (t > 2) lvl[i] = C.BASE + (t - 2); else if (foot[i]) lvl[i] = C.BASE;   // (the plan's open ground outside the walls is left to the plateau)
            if (t === 1 || LP.has(x + ',' + y)) flag[i] |= F_PATH;
            if (t !== 2) flag[i] |= F_CASTLE;
        }
        // no battlements under the towers, the keep, the gatehouse's piers, the inner wall's step
        const cover = (x, y) => { if (x >= 0 && y >= 0 && x < plan.w && y < plan.h) flag[at(ox + x, oy + y)] |= F_COVER; };
        for (const k of plan.noFront || []) { const [x, y] = k.split(',').map(Number); cover(x, y); }
        for (const t of plan.towers) for (let y = t.row; y < t.row + 4; y++) for (let x = t.col; x < t.col + 4; x++) cover(x, y);
        if (plan.keep) for (let y = plan.keep.row; y < plan.keep.row + plan.keep.h; y++) for (let x = plan.keep.col; x < plan.keep.col + plan.keep.w; x++) cover(x, y);
        // the stairs: the castle's flights, and a broad stair up the plateau's south face in front of the gate
        const stairs = plan.stairs.map((st) => ({ ...st, id: 'k' + site.id + ':' + st.id, ox: st.ox + ox, oy: st.oy + oy,
            walk: [st.walk[0] + ox, st.walk[1] + oy, st.walk[2], st.walk[3]], carve: [st.carve[0] + ox, st.carve[1] + oy, st.carve[2], st.carve[3]] }));
        const lipY = bottom - 1, sc = gx - 1;           // the plateau's last row in front of the gate; the stair's walkway columns sc .. sc+2
        stairs.push({ id: 'ks' + site.id, kind: 'S', ox: sc - 1, oy: lipY - 1, w: 5, h: 3, walk: [sc, lipY - 1, 3, 3], carve: [sc, lipY, 3, 1],
            dirs: ['UP', 'DOWN'], mask: ['FWWWF', 'RWWWR', 'RWWWR'], style: Math.floor(hash(s, 7, 7, 7) * 2) });
        for (let y = lipY + 1; y <= lipY + 3; y++) for (let x = sc - 2; x <= sc + 4; x++) lvl[at(x, y)] = 2;   // open ground before it
        // the ways through the gates (between each gatehouse's piers, through the wall's depth): 'outer' or 'inner', barred while that gate is shut;
        // and round each gatehouse the walls' faces plain (no decorated stone, no niche or drain, beside or under it)
        const gateCells = new Map(), plain = new Set();
        const gatehouse = (g, kind) => {
            for (let y = g.row - CASTLE.THICK.ns + 1; y <= g.row; y++) for (let x = g.col + 1; x < g.col + g.w - 1; x++) gateCells.set((ox + x) + ',' + (oy + y), kind);
            for (let y = g.row - CASTLE.THICK.ns - 1; y <= g.row + 2; y++) for (let x = g.col - 1; x <= g.col + g.w; x++) plain.add((ox + x) + ',' + (oy + y));
        };
        for (const g of plan.gates || []) gatehouse(g, 'outer');
        if (plan.inner && plan.inner.gatehouse) gatehouse(plan.inner.gatehouse, 'inner');
        const stairCells = new Map();
        for (const st of stairs) for (let y = st.oy; y < st.oy + st.h; y++) for (let x = st.ox; x < st.ox + st.w; x++) stairCells.set(x + ',' + y, st);
        site.data = { plan, ox, oy, lvl, flag, stairs, stairCells, gateCells, plain };
        return site.data;
    }
    _idx(col, row) {
        const site = this.siteAt(col, row);
        if (!site) return null;
        const d = this._data(site);
        return { d, i: (row - site.by) * CASTLE_SITES.BOX + (col - site.bx) };
    }
    levelAt(col, row) { const q = this._idx(col, row); return q ? q.d.lvl[q.i] : NONE; }
    levelPathAt(col, row) { const q = this._idx(col, row); return !!q && (q.d.flag[q.i] & F_PATH) !== 0; }
    isCastleCell(col, row) { const q = this._idx(col, row); return !!q && (q.d.flag[q.i] & F_CASTLE) !== 0; }
    gateKindAt(col, row) { const site = this.siteAt(col, row); return (site && this._data(site).gateCells.get(col + ',' + row)) || null; }
    isGateCell(col, row) { return !!this.gateKindAt(col, row); }
    plainWallAt(col, row) { const site = this.siteAt(col, row); return !!site && this._data(site).plain.has(col + ',' + row); }
    coverAt(col, row) { const q = this._idx(col, row); return !!q && (q.d.flag[q.i] & F_COVER) !== 0; }
    stairAt(col, row) {
        const site = this.siteAt(col, row);
        if (!site) return null;
        return this._data(site).stairCells.get(col + ',' + row) || null;
    }

    /* The castle's map objects, in world cells: [{ col, row, id }] (each at its object cell: the bottom-left of its sprite). The tower's object is the
       frame for how it meets its walls (castle_tower_obj.png: 0 a door, 1 none, 2-4 its foot stopping where a wall runs south of it). */
    objects(site) {
        const { plan, ox, oy } = this._data(site);
        const out = [];
        for (const t of plan.towers) {
            const wb = t.wallBelow || [];
            const f = t.frame === 0 ? 0 : !wb.length ? 1 : wb.length >= 4 ? 4 : !wb.includes(0) ? 2 : 3;
            out.push({ col: ox + t.col, row: oy + t.row + 3, id: 'CASTLE_TOWER_' + f });
        }
        if (plan.keep) {
            out.push({ col: ox + plan.keep.col, row: oy + plan.keep.row + plan.keep.h - 1, id: 'CASTLE_KEEP' });
            out.push({ col: ox + plan.keep.col + 9, row: oy + plan.keep.row + plan.keep.h, id: 'CASTLE_KEEP_DOOR' });   // on the terrace, over the keep's painted door
        }
        for (const g of plan.gates || (plan.gate ? [plan.gate] : [])) out.push({ col: ox + g.col, row: oy + g.row, id: 'CASTLE_GATEHOUSE' });
        if (plan.inner && plan.inner.gatehouse) out.push({ col: ox + plan.inner.gatehouse.col, row: oy + plan.inner.gatehouse.row, id: 'CASTLE_GATEHOUSE_INNER' });
        for (const b of plan.buildings) {
            out.push({ col: ox + b.col, row: oy + b.row, id: b.id });
            if (b.door) out.push({ col: ox + b.door.col, row: oy + b.door.row, id: b.door.id });
        }
        for (const p of plan.props) out.push({ col: ox + p.col, row: oy + p.row, id: p.id });
        return out;
    }
}

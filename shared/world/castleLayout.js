/* CASTLE LAYOUT - the plan of a ruined castle, sprawling: never one rectangle, but a keep ward with other wards built onto it over the years,
 * each a walled yard of its own size, so the outline has corners going in and out. Pure and seeded: the same seed, the same castle.
 *
 * What it gives back, in the castle's own cells (0, 0 is its top-left corner; the caller puts it in the world):
 *   tiles[row][col]  the terrain ids the blob renderer and the world use (shared/core/constants TILE_TYPES):
 *                      2 ground (grass), 1 the courtyards' cobbles (the secondary floor), 3 level 1, 4 level 2
 *   towers           [{ col, row, frame, corner }]: gothic towers, tall map objects (castle_tower.png: frame 0 a door on the ground, frame 2
 *                    none; only a tower whose south face looks into a courtyard has a door, those facing out over the country or with a wall
 *                    running on south from them have none), each on a
 *                    TOWER x TOWER footprint (4 x 4: a house is 4 x 4) whose top-left cell is (col, row): it covers the wall's thickness and stands
 *                    a cell proud of it on the outside, the wall made taller there (its face runs down to the foot of its own south edge, like the
 *                    wall's). They sort by the row under the footprint (row + TOWER). wallBelow: the tower's columns (0 .. TOWER-1) that a wall runs
 *                    on south from; in those the tower is drawn only down to the bottom of its footprint, the nearer wall hiding its foot.
 *   gate             { col, row, w }: the way in through a south-facing outer wall, a tower either side; the gatehouse (castle_gatehouse.png,
 *                    a tall sprite w cells wide) stands over it, its foot on the wall's face row (row): drawn at x = col * 32, y = (row + 1) * 32 -
 *                    its height, sorted by row + 1. Its piers (the first and last column) are wall; between them the way through is open ground and
 *                    the arch over it see-through, so whoever walks under is drawn first and seen through it
 *   gates            [{ col, row, w, dir }]: every way out through the outer wall, the main gate first: each a gatehouse between two towers,
 *                    as the gate is. dir 'S' a south face (row its face row, as the gate's), 'N' a north face (row the wall's inner face row, the
 *                    gatehouse seen from the yard). No way out through an east or west face: the gatehouse is drawn face on
 *   platform         { col, row, w, h } | null: the keep's platform, a broad block of solid wall in the middle of the greatest ward, at the walls'
 *                    height, paved on top with battlements round it, a stair up the middle of its south face
 *   keep             { col, row, w, h } | null: the keep (castle_keep.png, a tall map object) on the platform: its base the whole platform but the
 *                    terrace before its door and the lip the stair comes up through, its great door (its middle two columns) over the stair. It sorts by the
 *                    row under its footprint (row + h); drawn at x = col * 32, y = (row + h) * 32 - the sprite's height
 *   buildings        [{ id, col, row, w, h, door }]: the town inside the walls (and the castle's one CASTLE_ARMORY, 11 x 9, with a door), map objects (mapObjectDefinitions: CASTLE_TOWNHOUSE and its
 *                    kin) at their object cell (col, row: the bottom-left cell of the w x h sprite, its walls the bottom two rows); the front-view
 *                    house's door { id, col, row } is the door object to put in its gap (the side views are sealed and have none)
 *   props            [{ id, col, row }]: the alleys' clutter, map objects at their cell: crates and barrels against the houses' walls (solid,
 *                    searchable), standing torches (1 x 2, lit), bone piles (walked over), the graveyards' TOMBSTONEs, fallen legionaries
 *                    (FALLEN_SOLDIER_1 .. 15, 2 x 2, solid, their cell the bottom-left), the market squares' stands (MARKET_STALL_1 .. 3 and
 *                    _BACK, 3 x 3, the bottom 3 x 2 solid; _SIDE_E / _SIDE_W, 2 x 3, the bottom 2 x 2), wells (MARKET_WELL, 2 x 3) and wheelbarrows
 *                    (WHEELBARROW_1 .. 3, 2 x 2, the bottom row solid); none cuts any part of the yards off
 *   graveyards, markets  [{ x, y, w, h }]: the pockets of yard held back for them
 *   levelPaths       ['col,row']: the inner ward's open terrace cells, drawn as cobbles on their level (WorldManager.isLevelPath)
 *   noFront          ['col,row']: the berm round the foot of the inner wall: no battlements drawn there (terrain.coversFront)
 *   solidCells       ['col,row']: cells no one may stand on though their level would allow it (the berm, a ledge too narrow to walk)
 *   stairs           stair pieces of kind 'C' (the shape terrainGenerator.getStairAt gives: { id, kind, ox, oy, w, h, walk, carve, mask, dirs, style }):
 *                    a stone flight two cells wide up from a ward's yard onto its north wall (the wall's lip cell and the two cells in front of
 *                    it, climbed north). The caller adds them to the stairs the terrain knows, the way a village's stairs are added.
 *
 * The walls are one tile tall (level 1). An east-west wall is three cells deep (two rows of wall-walk and the lip its battlements stand on),
 * a north-south wall two cells wide (both walkable). (Two tall works too: WALL_LEVEL = 4 with a one-cell step of level 1 under every
 * south-facing face, the upper face hanging over it; see STEP.) The towers rise out of the wall at its corners, along its long runs and either
 * side of each gate. Every way out of the castle is a gate with its gatehouse; every gap between two wards is a broken gateway.
 */

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const CASTLE = {
    WARDS: [3, 4],            // how many wards (the keep's and the ones built onto it)
    KEEP: { w: [92, 98], h: [84, 90] },   // the keep's ward: the outer bailey round the inner ward (INNER) and its streets of houses
    // the inner ward: a raised terrace (level L1, cobbled) in the middle of the keep's ward, ringed by its own wall a level higher still (L2),
    // a cell of the terrace (the berm) left outside that wall all round so its foot steps down a level at a time; a gate through its south wall
    // with a flight up from the bailey. The keep stands highest of all, on a stepped platform in it (KEEP_PLATFORM).
    INNER: { w: 56, h: 50, gate: 4 },
    WARD: { w: [36, 44], h: [30, 38] },
    THICK: { ns: 3, ew: 3 },   // the walls' depth: an east-west wall 3 cells (two to walk on and its lip), a north-south wall 3
    TOWER: 4,                  // a tower's footprint, TOWER x TOWER cells (a house is 4 x 4): over the wall's 3 and a cell proud of it
    MARGIN: 5,                // open ground round the castle inside its plan (the towers stand a cell out into it)
    POSTERNS: [1, 3],         // more gates through the outer wall's north and south faces, each with its gatehouse (no other way out)
    FALLEN: [0, 0],           // outer wall stretches fallen to half height (only with a two-tall wall)
    WALL_LEVEL: 3,            // 3: one tile tall; 4: two tall (with STEP)
    STEP: false,              // a level-1 step under each south face of a two-tall wall
    TOWER_EVERY: 18,          // a tower along a long straight outer wall about this often
    GATE_W: 6,                // the main gate: the gatehouse's width (castle_gatehouse.png), a pier a cell wide either side of the way through
    // the keep's platform, in two steps: a skirt at the inner wall's level (L2) round a core a level higher (L3) that the keep stands on; the
    // skirt SKIRT cells wide at the sides and back and SKIRT_FRONT before the core (the core's stair lands on it, its own goes down to the terrace)
    KEEP_PLATFORM: { w: 20, h: 12, yard: 4, SKIRT: 2, SKIRT_FRONT: 4 },
    // the keep stands on the whole platform but its last two rows (a terrace before its door, and the lip the stair comes up through); castle_keep.png
    // is drawn for this footprint (20 x 10) and rises KEEP_ABOVE cells above its top (700 px tall)
    KEEP_SIZE: { w: 20, h: 10 },
    KEEP_ABOVE: 12,
    // the town inside the walls: the town's own stone houses (castleTownhouse.py, castleTownhouseSide.py, castleTownVariants.py), of several
    // sizes, w x h tiles, their walls the bottom two rows. Nearly all are seen from the side and sealed (no door): only the front-view house
    // has a door you can go in by, and there are at most MAX_DOORS of those. They stand in tight rows down each yard, each row as tall as its
    // tallest house may be (ROW_H), shoulder to shoulder in blocks of BLOCK houses with a one- or two-cell alley between blocks, and a lane one
    // cell wide or more (LANE) before each row, rows staggered (STAGGER), cross streets left open (CROSS_STREET); the roofs of the row below rise over the lane's far side, so it reads as a
    // cramped alley. A spot is passed over (a little square) with chance EMPTY_PLOT. In the alleys: crates and barrels against the walls, bones,
    // and standing torches (PROPS), never where they would cut anywhere off.
    HOUSES: [
        { id: 'CASTLE_TOWNHOUSE', w: 5, h: 5, door: 'CASTLE_DOOR', doorIdx: 2, weight: 1.5 },   // the one you can go into
        { id: 'CASTLE_TOWNHOUSE_LEFT', w: 5, h: 5, weight: 3 }, { id: 'CASTLE_TOWNHOUSE_RIGHT', w: 5, h: 5, weight: 3 },
        { id: 'CASTLE_HOUSE_NARROW', w: 3, h: 5, weight: 3 },
        { id: 'CASTLE_HOUSE_HALL', w: 7, h: 5, weight: 2 },
        { id: 'CASTLE_HOUSE_TALL', w: 4, h: 6, weight: 3 },
        { id: 'CASTLE_HOUSE_TOWER', w: 4, h: 7, weight: 1.5 },
        { id: 'CASTLE_HOUSE_ROW', w: 6, h: 5, weight: 2.5 },
        { id: 'CASTLE_HOUSE_RUIN', w: 5, h: 5, weight: 2 },
    ],
    MAX_DOORS: 4,
    ARMORY: { id: 'CASTLE_ARMORY', w: 11, h: 9, door: 'CASTLE_ARMORY_DOOR', doorIdx: 5 },   // (its door leads into the armory: ARMORY_INTERIOR)   // every castle has one: in the inner ward if it fits, else the bailey
    ROW_H: [[5, 0.55], [6, 0.25], [7, 0.2]],   // a row's height (its tallest house), by chance
    BLOCK: [1, 5],            // houses shoulder to shoulder in a block
    LANE: [[1, 0.66], [2, 0.27], [3, 0.07]],   // a row's lane, how many cells wide, by chance
    ALLEY: [[1, 0.7], [2, 0.25], [3, 0.05]],   // the alley between two blocks, by chance
    STAGGER: 3,               // a row starts up to this many cells in from its yard's edge, so the alleys don't line up row on row
    CROSS_STREET: [2, 3],     // a street running north-south through a yard wider than 30 cells, this wide, that the rows leave open
    STREET_MARGIN: 1,         // cells of open yard kept along the inside of every wall
    EMPTY_PLOT: 0.015,
    // graveyards: a pocket or two of gravestones in each yard, kept free of houses (GRAVEYARD per yard, each w x h cells, the stones in rows
    // with a path between); and the dead of the last fight: fallen legionaries (FALLEN_SOLDIER_1 .. 15, 2 x 2, solid) lying in the streets
    GRAVEYARD: { chance: 0, keep: 1, w: [6, 8], h: [5, 6], skip: 0.2 },   // one small one, in the keep's bailey (the rest of the dead lie in the alleys)
    // market squares: an open square or two (MARKET per yard, the keep's bailey one more), held back from the houses, its stalls (MARKET_STALL_1 .. 3,
    // 3 x 3, the counter and the row behind it solid) in a row or two facing south, wheelbarrows, and barrels and crates stacked about
    MARKET: { chance: 0.2, keep: 1, w: [12, 14], h: [11, 12], barrels: [12, 20] },   // one in the keep's bailey, now and then one in another ward
    THE_FALLEN: { every: 3 }, // about one body for every this many houses, lying in the alleys beside them
    PATROLS: { every: 12, min: 2 },   // legionaries on patrol (LEGIONARY_PATROL) walking the lanes: one for every this many houses, and never fewer than min
    ALLEY_GRAVES: { every: 4 },   // and a lone grave for every this many, against a wall in an alley
    PROPS: {
        CLUTTER: ['BARREL', 'BARREL', 'BARREL', 'BARREL', 'RUINED_BARREL', 'RUINED_BARREL', 'CRATE', 'CRATE', 'CRATE_SACK'],   // against the walls of the houses
        CLUTTER_PER_HOUSE: [0, 4],
        BONES: 0.05,          // the chance an alley cell has a pile of bones
        TORCH_EVERY: 9,       // a standing torch about this many cells apart along the lanes
    },
};

const GROUND = 2, COBBLE = 1, L1 = 3, L2 = 4, L3 = 5;

export function planCastle(seed, cfg = CASTLE) {
    const rand = mulberry32(seed);
    const between = ([a, b]) => a + Math.floor(rand() * (b - a + 1));

    // ---- the wards: the keep's, then each new one built against a side of one already there, sharing its wall ----
    const wards = [];
    const keep = { x: 0, y: 0, w: between(cfg.KEEP.w), h: between(cfg.KEEP.h) };
    wards.push(keep);
    const want = between(cfg.WARDS);
    for (let tries = 0; wards.length < want && tries < 200; tries++) {
        const p = wards[Math.floor(rand() * wards.length)];
        const w = between(cfg.WARD.w), h = between(cfg.WARD.h);
        const side = Math.floor(rand() * 4);   // 0 north, 1 east, 2 south, 3 west
        let x, y;
        // along the side, shifted so it shares at least 5 cells of wall with its parent; across it, overlapping the parent's wall (2 cells)
        if (side === 0 || side === 2) {
            x = p.x - w + 5 + Math.floor(rand() * (p.w + w - 10));
            y = side === 0 ? p.y - h + cfg.THICK.ns : p.y + p.h - cfg.THICK.ns;
        } else {
            y = p.y - h + 5 + Math.floor(rand() * (p.h + h - 10));
            x = side === 3 ? p.x - w + cfg.THICK.ew : p.x + p.w - cfg.THICK.ew;
        }
        const r = { x, y, w, h, parent: p, side };
        // not on top of another ward (beyond the shared wall)
        const clash = wards.some(o => o !== p && x < o.x + o.w - 3 && x + w > o.x + 3 && y < o.y + o.h - 3 && y + h > o.y + 3);
        if (!clash) wards.push(r);
    }
    // the plan's extent, with a margin
    const M = cfg.MARGIN;
    const minX = Math.min(...wards.map(r => r.x)) - M, minY = Math.min(...wards.map(r => r.y)) - M;
    const maxX = Math.max(...wards.map(r => r.x + r.w)) + M, maxY = Math.max(...wards.map(r => r.y + r.h)) + M + 2;
    for (const r of wards) { r.x -= minX; r.y -= minY; }
    const W = maxX - minX, H = maxY - minY;
    const inside = Array.from({ length: H }, () => new Array(W).fill(false));
    for (const r of wards) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) inside[y][x] = true;
    const isIn = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside[y][x];

    // ---- walls: the outline two cells thick, and every ward's own ring (the walls between wards) ----
    const wall = Array.from({ length: H }, () => new Array(W).fill(false));
    const outer = Array.from({ length: H }, () => new Array(W).fill(false));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!isIn(x, y)) continue;
        let edge = false;
        const TX = cfg.THICK.ew, TY = cfg.THICK.ns;
        for (let dy = -TY; dy <= TY && !edge; dy++) for (let dx = -TX; dx <= TX; dx++) if (!isIn(x + dx, y + dy)) { edge = true; break; }
        if (edge) { wall[y][x] = true; outer[y][x] = true; }
    }
    for (const r of wards) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (x < r.x + cfg.THICK.ew || x >= r.x + r.w - cfg.THICK.ew || y < r.y + cfg.THICK.ns || y >= r.y + r.h - cfg.THICK.ns) wall[y][x] = true;
    }

    // ---- gateways between wards: a 3-wide gap in the shared wall of each ward built onto another ----
    for (const r of wards) {
        if (!r.parent) continue;
        const p = r.parent;
        if (r.side === 0 || r.side === 2) {
            const lo = Math.max(r.x, p.x) + 3, hi = Math.min(r.x + r.w, p.x + p.w) - 6;
            if (hi < lo) continue;
            const gx = lo + Math.floor(rand() * (hi - lo + 1));
            const y0 = r.side === 0 ? r.y + r.h - cfg.THICK.ns : r.y;
            for (let y = y0; y < y0 + cfg.THICK.ns; y++) for (let x = gx; x < gx + 4; x++) if (!outer[y][x]) wall[y][x] = false;
        } else {
            const lo = Math.max(r.y, p.y) + 3, hi = Math.min(r.y + r.h, p.y + p.h) - 6;
            if (hi < lo) continue;
            const gy = lo + Math.floor(rand() * (hi - lo + 1));
            const x0 = r.side === 3 ? r.x + r.w - cfg.THICK.ew : r.x;
            for (let y = gy; y < gy + 4; y++) for (let x = x0; x < x0 + cfg.THICK.ew; x++) if (!outer[y][x]) wall[y][x] = false;
        }
    }

    // ---- straight runs of the outer wall: where a gate or a fallen stretch can go (a run is a line of outer-ring cells along one face) ----
    // a face is "south-facing" when the cell two below is outside the castle
    const runs = [];
    const facing = (x, y) => (!isIn(x, y + 2) && isIn(x, y) ? 'S' : !isIn(x, y - 2) && isIn(x, y) ? 'N' : !isIn(x + 2, y) && isIn(x, y) ? 'E' : !isIn(x - 2, y) && isIn(x, y) ? 'W' : null);
    for (const dir of ['N', 'S']) {
        for (let y = 0; y < H; y++) {
            let start = -1;
            for (let x = 0; x <= W; x++) {
                const ok = x < W && outer[y][x] && facing(x, y) === dir && (dir === 'S' ? !isIn(x, y + 1) : !isIn(x, y - 1));
                if (ok && start < 0) start = x;
                if (!ok && start >= 0) { if (x - start >= 7) runs.push({ dir, y, x0: start, x1: x - 1 }); start = -1; }
            }
        }
    }
    for (const dir of ['E', 'W']) {
        for (let x = 0; x < W; x++) {
            let start = -1;
            for (let y = 0; y <= H; y++) {
                const ok = y < H && outer[y][x] && facing(x, y) === dir && (dir === 'E' ? !isIn(x + 1, y) : !isIn(x - 1, y));
                if (ok && start < 0) start = y;
                if (!ok && start >= 0) { if (y - start >= 7) runs.push({ dir, x, y0: start, y1: y - 1 }); start = -1; }
            }
        }
    }
    const used = new Set();
    const pickRun = (filter) => {
        const c = runs.filter((r, i) => !used.has(i) && filter(r));
        if (!c.length) return null;
        const r = c[Math.floor(rand() * c.length)];
        used.add(runs.indexOf(r));
        return r;
    };
    // the two cells of wall thickness behind an outer-face cell
    const depth = (r, i) => {
        const n = r.dir === 'S' || r.dir === 'N' ? cfg.THICK.ns : cfg.THICK.ew, out = [];
        for (let k = 0; k < n; k++) out.push(r.dir === 'S' ? [i, r.y - k] : r.dir === 'N' ? [i, r.y + k] : r.dir === 'E' ? [r.x - k, i] : [r.x + k, i]);
        return out;
    };
    const along = (r) => r.dir === 'S' || r.dir === 'N' ? [r.x0, r.x1] : [r.y0, r.y1];

    // the gate: on a south face, GATE_W wide, in the middle part of its run (room for a gate tower either side)
    let gate = null;
    const GW = cfg.GATE_W;
    const gr = pickRun(r => r.dir === 'S' && r.x1 - r.x0 >= GW + 12);
    const level = Array.from({ length: H }, (_, y) => wall[y].map(w => (w ? cfg.WALL_LEVEL : 0)));
    if (gr) {
        const gx = gr.x0 + 6 + Math.floor(rand() * Math.max(1, gr.x1 - gr.x0 - GW - 11));
        for (let x = gx + 1; x < gx + GW - 1; x++) for (const [cx, cy] of depth(gr, x)) level[cy][cx] = 0;   // the way through, between the gatehouse's piers
        gate = { col: gx, row: gr.y, w: GW, dir: 'S' };
    }
    // the posterns: more gates, on north and south faces, in the middle part of a long run, well apart from the others
    const gates = gate ? [gate] : [];
    for (let k = 0, n = between(cfg.POSTERNS), tries = 0; k < n && tries < 24; tries++) {
        const r = pickRun(r => (r.dir === 'S' || r.dir === 'N') && r.x1 - r.x0 >= GW + 12);
        if (!r) break;
        const row = r.dir === 'S' ? r.y : r.y + cfg.THICK.ns - 1;
        const gx = r.x0 + 6 + Math.floor(rand() * Math.max(1, r.x1 - r.x0 - GW - 11));
        if (gates.some(g => Math.abs(g.col - gx) < GW + 16 && Math.abs(g.row - row) < 24)) continue;
        for (let x = gx + 1; x < gx + GW - 1; x++) for (const [cx, cy] of depth(r, x)) level[cy][cx] = 0;
        gates.push({ col: gx, row, w: GW, dir: r.dir });
        k++;
    }
    // fallen stretches (half height)
    for (const [n, to] of [[between(cfg.FALLEN), L1]]) {
        for (let k = 0; k < n; k++) {
            const r = pickRun(() => true);
            if (!r) break;
            const [a, b] = along(r);
            const len = 3 + Math.floor(rand() * 3);
            const s = a + 2 + Math.floor(rand() * Math.max(1, b - a - len - 3));
            for (let i = s; i < Math.min(b - 1, s + len); i++) for (const [cx, cy] of depth(r, i)) level[cy][cx] = to;
        }
    }

    // ---- the tiles: ground outside, cobbles in the yards, then the walls and their steps ----
    const tiles = Array.from({ length: H }, () => new Array(W).fill(GROUND));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (isIn(x, y)) tiles[y][x] = COBBLE;   // inside the walls the yards are paved, all of them
        if (level[y][x]) tiles[y][x] = level[y][x];
    }
    // the step: under every south-facing face of a two-tall wall, one cell of level 1 (unless that cell is wall already)
    if (cfg.STEP) for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
        if (tiles[y][x] === L2 && tiles[y + 1][x] !== L2 && tiles[y + 1][x] !== L1) tiles[y + 1][x] = L1;
    }
    // the gate's way in: cobbles out across the step and onto the ground below it
    // (through a north face: cobbles through the wall and out three rows onto the ground beyond it)
    for (const g of gates) {
        const top = g.row - cfg.THICK.ns + 1;
        if (g.dir === 'S') { for (let y = top; y < Math.min(H, g.row + 4); y++) for (let x = g.col + (y <= g.row ? 1 : 0); x < g.col + g.w - (y <= g.row ? 1 : 0); x++) tiles[y][x] = COBBLE; }
        else for (let y = Math.max(0, top - 3); y <= g.row; y++) for (let x = g.col + (y >= top ? 1 : 0); x < g.col + g.w - (y >= top ? 1 : 0); x++) tiles[y][x] = COBBLE;
    }

    // ---- the inner ward: a raised terrace in the middle of the keep's ward, its own wall a level higher, a gate on the south ----
    // (towers on the inner wall's corners stand a cell out from it, over the bailey's ground, like the outer wall's)
    const keepWard = wards[0];
    const levelPaths = new Set();             // the terrace's open cells: drawn as cobbles on the level (WorldManager.isLevelPath)
    const noFront = new Set();                // cells whose battlements are not drawn (the berm at the inner wall's foot)
    let inner = null;
    {
        const iw = Math.min(cfg.INNER.w, keepWard.w - 2 * cfg.THICK.ew - 20), ih = Math.min(cfg.INNER.h, keepWard.h - 2 * cfg.THICK.ns - 20);
        const ix = keepWard.x + Math.floor((keepWard.w - iw) / 2), iy = keepWard.y + Math.floor((keepWard.h - ih) / 2) - 2;
        inner = { x: ix, y: iy, w: iw, h: ih };
        const T = cfg.THICK.ns;
        // the wall T thick on the north, west and east (straight down to the ground there: one taller wall, one set of battlements), and on the
        // south T thick over the step (the berm), the one row its two-tall face needs to stand in two storeys
        for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) {
            const berm = y === iy + ih - 1;
            const ring = !berm && (x < ix + T || y < iy + T || x >= ix + iw - T || y >= iy + ih - 1 - T);
            tiles[y][x] = ring ? L2 : L1;
            if (berm) noFront.add(x + ',' + y);
            else if (!ring) levelPaths.add(x + ',' + y);
        }
        // the inner gate: a gap through the south wall at the terrace's level, the berm's lip below it a flight down to the bailey
        const gx = ix + Math.floor(iw / 2) - Math.floor(cfg.INNER.gate / 2);
        inner.gate = { col: gx, row: iy + ih - 1, w: cfg.INNER.gate };
        for (let y = iy + ih - 1 - T; y < iy + ih - 1; y++) for (let x = gx; x < gx + cfg.INNER.gate; x++) { tiles[y][x] = L1; levelPaths.add(x + ',' + y); }
        for (let x = gx; x < gx + cfg.INNER.gate; x++) noFront.delete(x + ',' + (iy + ih - 1));
        for (let y = iy + ih; y < iy + ih + 3; y++) for (let x = gx - 1; x < gx + cfg.INNER.gate + 1; x++) tiles[y][x] = COBBLE;
        // its gatehouse (castle_gatehouse_inner.png, 4 cells wide): its piers the gap's first and last columns, wall again, the way through
        // between them two cells wide over the flight; it stands on the wall's last row (the lip), so the flight ends at the foot of its arch
        for (let y = iy + ih - 1 - T; y < iy + ih - 1; y++) for (const x of [gx, gx + cfg.INNER.gate - 1]) { tiles[y][x] = L2; levelPaths.delete(x + ',' + y); }
        for (const x of [gx, gx + cfg.INNER.gate - 1]) noFront.add(x + ',' + (iy + ih - 1));
        inner.gatehouse = { col: gx, row: iy + ih - 2, w: cfg.INNER.gate };
        inner.interior = { x: ix + T + 1, y: iy + T + 1, w: iw - 2 * T - 2, h: ih - 2 * T - 3 };
    }
    const inInner = (x, y) => inner && x >= inner.x && y >= inner.y && x < inner.x + inner.w && y < inner.y + inner.h;
    // the gatehouse covers its piers' wall: no battlements of theirs drawn over it (but they are not walked on either)
    const gateCover = new Set();
    for (const g of gates) for (let y = g.row - cfg.THICK.ns + 1; y <= g.row; y++) for (const x of [g.col, g.col + g.w - 1]) gateCover.add(x + ',' + y);
    if (inner) { const g = inner.gatehouse; for (let y = g.row - cfg.THICK.ns + 1; y <= g.row; y++) for (const x of [g.col, g.col + g.w - 1]) gateCover.add(x + ',' + y); }

    // ---- towers: rising out of the wall at the outline's outer corners, along long outer walls, and either side of the gate ----
    // Each stands on a 3 x 3 footprint (top-left cell col, row) over the wall's two cells of thickness and one cell outside them.
    const towers = [];
    const TS = cfg.TOWER, TY = cfg.THICK.ns, TX = cfg.THICK.ew;
    const near = (c, r) => towers.some(t => Math.abs(t.col - c) < TS + 5 && Math.abs(t.row - r) < TS + 5);   // towers keep their distance
    const onGate = (c, r) => gates.some(g => c + TS - 1 >= g.col && c <= g.col + g.w - 1 && r + TS - 1 >= g.row - TY && r <= g.row + 1);
    const addTower = (c, r, corner = false, lvl = cfg.WALL_LEVEL, pair = false) => {
        if (c < 0 || r < 0 || c + TS > W || r + TS > H || (!pair && near(c, r)) || onGate(c, r)) return;
        if (lvl === cfg.WALL_LEVEL && inInner(c, r) || lvl === cfg.WALL_LEVEL && inInner(c + TS - 1, r + TS - 1)) return;
        towers.push({ col: c, row: r, frame: 2, corner, level: lvl });
    };
    // the gates' two first: on a south face a cell proud toward us, on a north face a cell proud outward (their south faces flush with the wall's)
    for (const g of gates) {
        const tr = g.dir === 'S' ? g.row - TY + 1 : g.row - TS + 1;
        addTower(g.col - TS, tr, false, cfg.WALL_LEVEL, g !== gate); addTower(g.col + g.w, tr, false, cfg.WALL_LEVEL, true);
    }
    // a convex corner of the outline: an inside cell with outside on two adjacent sides; the tower covers the corner and a cell out each way
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!isIn(x, y)) continue;
        const n = !isIn(x, y - 1), s = !isIn(x, y + 1), e = !isIn(x + 1, y), w = !isIn(x - 1, y);
        if (!((n || s) && (e || w))) continue;
        if (!level[y][x]) continue;                                            // a breached corner keeps no tower
        // the tower covers the corner's wall and stands a cell out on both outer sides
        // over the corner's wall and a cell proud of it outward: on a north corner its south face is flush with the wall's, on a south one a cell nearer us
        addTower(w ? x - (TS - TX) : x - TX + 1, n ? y - (TS - TY) : y - TY + 1, true);
    }
    for (const r of runs) {
        const [a, b] = along(r);
        for (let i = a + cfg.TOWER_EVERY; i < b - 5; i += cfg.TOWER_EVERY) {
            const [cx, cy] = depth(r, i)[0];
            if (!level[cy][cx]) continue;                                      // not on a breach
            if (r.dir === 'S') addTower(i - 1, r.y - TY + 1);          // a cell proud of the wall toward us
            else if (r.dir === 'N') addTower(i - 1, r.y - (TS - TY));  // a cell proud outward, its south face flush with the wall's
            else if (r.dir === 'E') addTower(r.x - TX + 1, i - 1);
            else addTower(r.x - (TS - TX), i - 1);
        }
    }
    // the inner wall's towers: on its four corners (over the corner's wall and the berm outside it) and either side of its gate
    if (inner) {
        const { x: ix, y: iy, w: iw, h: ih } = inner;
        addTower(inner.gate.col - TS, iy + ih - TS, false, L2); addTower(inner.gate.col + inner.gate.w, iy + ih - TS, false, L2, true);
        for (const [c, r] of [[ix - 1, iy - 1], [ix + iw - TS + 1, iy - 1], [ix - 1, iy + ih - TS], [ix + iw - TS + 1, iy + ih - TS]]) addTower(c, r, true, L2);
        for (let c = ix + 16; c < ix + iw - 18; c += 18) addTower(c, iy - 1, false, L2);    // and along its north wall, a cell proud outward, flush with its inner face
    }
    // under each tower the wall is whole (its footprint is wall, the tower's taller face drawn over it)
    for (const t of towers) for (let y = t.row; y < t.row + TS; y++) for (let x = t.col; x < t.col + TS; x++) { tiles[y][x] = t.level; levelPaths.delete(x + ',' + y); noFront.delete(x + ',' + y); }
    // where a wall runs on south from a tower, that wall is nearer than the tower's foot and hides it: `wallBelow` lists the tower's columns
    // (0 .. TOWER-1) with wall under them, and in those the tower is drawn only down to the bottom of its footprint (the walk runs into its face)
    for (const t of towers) {
        t.wallBelow = [];
        for (let k = 0; k < TS; k++) if (tiles[t.row + TS] && tiles[t.row + TS][t.col + k] === t.level) t.wallBelow.push(k);
        // castle_tower.png's frames: a door (frame 0) only where the tower's south face looks into a courtyard, the cells before its door
        // (its middle two columns) the yard's open cobbles inside the walls; facing out over the country, or a wall before it, no door (frame 2)
        const yard = k => isIn(t.col + k, t.row + TS) && (tiles[t.row + TS][t.col + k] === COBBLE || levelPaths.has((t.col + k) + ',' + (t.row + TS)));
        t.frame = yard(1) && yard(2) ? 0 : 2;
    }
    towers.sort((p, q) => p.row - q.row);

    // ---- the keep's platform: in the inner ward, a skirt at the inner wall's level (L2) round a core a level higher (L3), paved on top with
    // battlements round its edges (the level tiles give every open side its parapet), the keep on the core; the terrace all round it ----
    const WL = cfg.WALL_LEVEL;
    let plat = null, skirt = null;
    if (inner) {
        const P = cfg.KEEP_PLATFORM, I = inner.interior;
        const kw = P.w, kh = P.h, S = P.SKIRT, SF = P.SKIRT_FRONT;
        const kx = I.x + Math.floor((I.w - kw) / 2), ky = I.y + S + 2;
        if (ky + kh + SF + 3 < I.y + I.h && kx - S >= I.x) {
            skirt = { col: kx - S, row: ky - S, w: kw + 2 * S, h: kh + S + SF };
            for (let y = skirt.row; y < skirt.row + skirt.h; y++) for (let x = skirt.col; x < skirt.col + skirt.w; x++) { tiles[y][x] = L2; levelPaths.delete(x + ',' + y); }
            for (let y = ky; y < ky + kh; y++) for (let x = kx; x < kx + kw; x++) tiles[y][x] = L3;
            plat = { col: kx, row: ky, w: kw, h: kh };
        }
    }
    // the keep on the platform: the platform is its base, all of it but the terrace before its door and the lip the stair comes up through
    let keepB = null;
    if (plat) {
        keepB = { col: plat.col + Math.floor((plat.w - cfg.KEEP_SIZE.w) / 2), row: plat.row + plat.h - 2 - cfg.KEEP_SIZE.h, w: cfg.KEEP_SIZE.w, h: cfg.KEEP_SIZE.h };
        // a tower behind the keep would have its door hidden by the keep's tall sprite (it reaches KEEP_ABOVE cells up past its footprint): none
        const top = keepB.row - cfg.KEEP_ABOVE;
        for (const t of towers) {
            const dr = t.row + TS;   // the row before its door
            if (t.frame === 0 && t.col + 2 >= keepB.col && t.col + 1 < keepB.col + keepB.w && dr >= top && dr < keepB.row + keepB.h) t.frame = 2;
        }
    }
    const inKeep = (x, y) => skirt && x >= skirt.col - 1 && x <= skirt.col + skirt.w && y >= skirt.row - 1 && y <= skirt.row + skirt.h + 3;

    // ---- stairs: a flight up from each ward's yard onto its north wall (the wall's inner face looks south into the yard) ----
    const stairs = [];
    const flight = (id, x, y, style = 0) => stairs.push({ id: id + x + ',' + y, kind: 'C', ox: x, oy: y, w: 2, h: 3, walk: [x, y, 2, 3], carve: [x, y, 2, 1], mask: ['WW', 'WW', 'WW'], dirs: ['UP', 'DOWN'], style });
    if (inner) flight('g', inner.gate.col + Math.floor(inner.gate.w / 2) - 1, inner.gate.row);   // up from the bailey through the inner gate
    if (plat) {   // the keep's two flights, one above the other in the middle: the core's down onto the skirt, the skirt's down onto the terrace
        const x = plat.col + Math.floor(plat.w / 2) - 1;
        flight('k', x, plat.row + plat.h - 1);
        flight('s', x, skirt.row + skirt.h - 1);
        for (let y = skirt.row + skirt.h; y < skirt.row + skirt.h + 2; y++) for (let xx = x; xx < x + 2; xx++) levelPaths.add(xx + ',' + y);
    }
    let isWall = (x, y) => !!tiles[y] && tiles[y][x] === WL;
    let free = (x, y) => !!tiles[y] && (tiles[y][x] === GROUND || tiles[y][x] === COBBLE) && isIn(x, y) && !inInner(x, y);
    const nearTower = (x, y) => towers.some(t => x >= t.col - 2 && x < t.col + TS + 2 && y >= t.row - 2 && y < t.row + TS + 2);
    const nearGate = (x, y) => gate && Math.abs(x - gate.col) < gate.w + 3 && Math.abs(y - gate.row) < 5;
    for (const r of wards) {
        const cands = [];
        for (let y = r.y + 1; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w - 1; x++) {
            if (!(isWall(x, y) && isWall(x + 1, y) && isWall(x, y - 1) && isWall(x + 1, y - 1) && isWall(x, y - 2) && isWall(x + 1, y - 2))) continue;   // the lip, and the walk behind it
            let ok = true;
            for (let yy = y + 1; yy <= y + 3 && ok; yy++) for (let xx = x - 1; xx <= x + 2; xx++) if (!free(xx, yy)) { ok = false; break; }
            if (ok && !inKeep(x, y) && !nearTower(x, y) && !nearTower(x + 1, y) && !nearGate(x, y) && !stairs.some(st => Math.abs(st.ox - x) < 8 && Math.abs(st.oy - y) < 8)) cands.push([x, y]);
        }
        if (!cands.length) continue;
        const [x, y] = cands[Math.floor(rand() * cands.length)];
        stairs.push({ id: 'c' + x + ',' + y, kind: 'C', ox: x, oy: y, w: 2, h: 3, walk: [x, y, 2, 3], carve: [x, y, 2, 1], mask: ['WW', 'WW', 'WW'], dirs: ['UP', 'DOWN'], style: rand() < 0.5 ? 0 : 1 });
        for (let yy = y + 1; yy <= y + 2; yy++) for (let xx = x; xx <= x + 1; xx++) tiles[yy][xx] = COBBLE;
    }
    // and in the inner ward, two flights up from the terrace onto its north wall
    if (inner) {
        const { x: ix, y: iy, w: iw } = inner, T = cfg.THICK.ns;
        const y = iy + T - 1;                                // the inner north wall's lip
        const cands = [];
        for (let x = ix + T + 3; x < ix + iw - T - 5; x++) {
            let ok = [0, 1].every(d => tiles[y][x + d] === L2 && tiles[y - 1][x + d] === L2 && tiles[y - 2][x + d] === L2);
            for (let yy = y + 1; yy <= y + 3 && ok; yy++) for (let xx = x - 1; xx <= x + 2; xx++) if (!levelPaths.has(xx + ',' + yy)) ok = false;
            if (ok && !nearTower(x, y) && !nearTower(x + 1, y) && !inKeep(x, y + 4)) cands.push(x);
        }
        for (const side of [0, 1]) {
            const c = cands.filter(x => side ? x > ix + iw / 2 + 4 : x < ix + iw / 2 - 6);
            if (c.length) flight('i', c[Math.floor(rand() * c.length)], y, side);
        }
    }
    // ---- every level reachable: walk the castle from outside its gate the way WorldManager.canMove does (one level at a time, never onto a
    // cliff's lip, a stair's walkway joining the cells along it; a tower is walked through along its wall, its tall sprite drawn over you), and
    // wherever a stretch of wall-walk or a yard can't be reached, give it a stair up from the ground below it, or for a yard shut in by
    // walls, a gateway through to the yard next door ----
    {
        const elev = (x, y) => { const v = tiles[y] && tiles[y][x]; return v === undefined ? -1 : v <= GROUND ? GROUND : v; };
        const stairOn = (x, y) => stairs.find(st => x >= st.walk[0] && x < st.walk[0] + st.walk[2] && y >= st.walk[1] && y < st.walk[1] + st.walk[3]);
        const lip = (x, y) => elev(x, y) > GROUND && elev(x, y + 1) < elev(x, y);
        const standable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !noFront.has(x + ',' + y) && !gateCover.has(x + ',' + y) && (stairOn(x, y) || !lip(x, y));
        const can = (x, y, nx, ny) => {
            if (!standable(nx, ny)) return false;
            const a = stairOn(x, y), b = stairOn(nx, ny);
            if ((a || b) && x === nx) return true;
            if (a && b && a === b) return true;
            if (a || b) return false;
            return elev(x, y) === elev(nx, ny);
        };
        const inCastle = (x, y) => isIn(x, y);
        const start = gate ? [gate.col + 1, Math.min(H - 1, gate.row + 2)] : [keepWard.x + cfg.THICK.ew + 1, keepWard.y + cfg.THICK.ns + 1];
        const walkFrom = () => {
            const seen = new Uint8Array(W * H), q = [start];
            seen[start[1] * W + start[0]] = 1;
            while (q.length) {
                const [x, y] = q.pop();
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !can(x, y, nx, ny)) continue;
                    seen[ny * W + nx] = 1; q.push([nx, ny]);
                }
            }
            return seen;
        };
        const nearTowerFoot = (x, y) => towers.some(t => x >= t.col - 1 && x < t.col + TS + 1 && y >= t.row && y < t.row + TS + 3);
        const given = new Set();
        for (let round = 0; round < 60; round++) {
            const seen = walkFrom();
            // the pieces left out
            const done = new Uint8Array(W * H), pieces = [];
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                if (seen[y * W + x] || done[y * W + x] || !inCastle(x, y) || !standable(x, y) || stairOn(x, y)) continue;
                const cells = [], st = [[x, y]]; done[y * W + x] = 1;
                while (st.length) {
                    const [a, b] = st.pop(); cells.push([a, b]);
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = a + dx, ny = b + dy;
                        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || done[ny * W + nx] || !can(a, b, nx, ny)) continue;
                        done[ny * W + nx] = 1; st.push([nx, ny]);
                    }
                }
                if (cells.length >= 6 && !given.has(cells[0].join())) pieces.push(cells);
            }
            if (!pieces.length) break;
            pieces.sort((a, b) => b.length - a.length);
            const piece = pieces[0];
            given.add(piece[0].join());
            const lvl = elev(...piece[0]);
            const has = new Set(piece.map(c => c.join()));
            let fixed = false;
            if (lvl > GROUND) {
                // a stair from the piece's south lip down to reached ground a level lower: the lip pair, then two cells below it
                const opts = [];
                for (const [x, y] of piece) {
                    if (!has.has((x + 1) + ',' + y)) continue;
                    const ly = y + 1;
                    if (!(lip(x, ly) && lip(x + 1, ly) && elev(x, ly) === lvl && elev(x + 1, ly) === lvl)) continue;
                    if (inInner(x, ly) || inInner(x + 1, ly)) continue;   // (the inner ward has one way in: its gate)
                    let ok = true;
                    for (let yy = ly + 1; yy <= ly + 3 && ok; yy++) for (let xx = x; xx <= x + 1; xx++) {
                        if (elev(xx, yy) !== lvl - 1 && !(lvl - 1 < GROUND + 1 && elev(xx, yy) === GROUND)) ok = false;
                        if (stairOn(xx, yy) || (yy > ly + 2 && !seen[yy * W + xx])) ok = false;
                    }
                    if (ok && !nearTowerFoot(x, ly) && !nearTowerFoot(x + 1, ly) && !stairs.some(st => Math.abs(st.ox - x) < 4 && Math.abs(st.oy - ly) < 4)) opts.push([x, ly]);
                }
                if (opts.length) {
                    const [x, y] = opts[Math.floor(rand() * opts.length)];
                    flight('r', x, y, rand() < 0.5 ? 0 : 1);
                    fixed = true;
                }
            } else {
                // a yard shut in: a gateway four wide straight through the wall (three thick) to a yard that can be reached
                for (const [x, y] of piece) {
                    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                        const far = [x + dx * 4, y + dy * 4];
                        if (!seen[far[1] * W + far[0]] || elev(...far) !== GROUND || !isIn(...far)) continue;   // (only to another yard: a way out is a gate)
                        const across = dx ? [0, 1] : [1, 0];
                        let ok = true;
                        for (let w2 = 0; w2 < 4 && ok; w2++) {
                            const bx = x + across[0] * w2, by = y + across[1] * w2;
                            if (elev(bx, by) !== GROUND || elev(bx + dx * 4, by + dy * 4) !== GROUND) ok = false;
                            for (let k = 1; k <= 3 && ok; k++) if (elev(bx + dx * k, by + dy * k) <= GROUND || towers.some(t => bx + dx * k >= t.col && bx + dx * k < t.col + TS && by + dy * k >= t.row && by + dy * k < t.row + TS)) ok = false;
                        }
                        if (!ok) continue;
                        for (let w2 = 0; w2 < 4; w2++) for (let k = 1; k <= 3; k++) {
                            const cx = x + across[0] * w2 + dx * k, cy = y + across[1] * w2 + dy * k;
                            tiles[cy][cx] = COBBLE; wall[cy][cx] = true;   // (a gap in a wall: the town keeps clear of it)
                        }
                        fixed = true; break;
                    }
                    if (fixed) break;
                }
            }
        }
    }
    // ---- the town: tight rows of houses down each yard, wherever a house and its lane are open cobbles clear of the walls' margin, the
    // stairs, the keep's platform, the doors of the towers, the gateways and breaches, and the towers' tall sprites ----
    const buildings = [], props = [], graveyards = [], markets = [];
    {
        const SM = cfg.STREET_MARGIN;
        const blocked = new Set();
        const block = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked.add(x + ',' + y); };
        for (const st of stairs) block(st.ox - 1, st.oy - 1, st.ox + st.w, st.oy + st.h + 2);
        if (skirt) block(skirt.col - 1, skirt.row - 1, skirt.col + skirt.w, skirt.row + skirt.h + 3);
        if (inner) block(inner.gate.col - 3, inner.gate.row - 10, inner.gate.col + inner.gate.w + 2, inner.gate.row + 6);   // (its gatehouse's sprite rises ~8 cells)
        if (keepB) block(keepB.col - 1, keepB.row - cfg.KEEP_ABOVE - 2, keepB.col + keepB.w, keepB.row);   // behind the keep, hidden by its sprite
        for (const t of towers) {
            block(t.col, t.row - 10, t.col + TS - 1, t.row + TS - 1);                     // its sprite rises about ten cells over its footprint
            if (t.frame === 0) block(t.col, t.row + TS, t.col + TS - 1, t.row + TS + 3);  // before its door
        }
        for (const g of gates) {
            if (g.dir === 'S') block(g.col - 3, g.row - 8, g.col + g.w + 2, g.row + 3);   // under its sprite, and before it
            else block(g.col - 3, g.row - 3, g.col + g.w + 2, g.row + 5);                 // the way up to it from the yard
        }
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall[y][x] && tiles[y][x] !== WL && isIn(x, y)) block(x - 3, y - 3, x + 3, y + 3);   // gateways, breaches
        // a yard cell: 1 the bailey's or a ward's cobbles (on the ground), 2 the inner ward's terrace (on its level), 0 none
        const kindOf = (x, y) => (!tiles[y] ? 0 : levelPaths.has(x + ',' + y) ? 2 : tiles[y][x] === COBBLE && isIn(x, y) && !inInner(x, y) ? 1 : 0);
        const yard = (x, y) => kindOf(x, y) > 0;
        const openYard = (x, y) => {
            const k = kindOf(x, y);
            if (!k || blocked.has(x + ',' + y)) return false;
            for (let dy = -SM; dy <= SM; dy++) for (let dx = -SM; dx <= SM; dx++) if (kindOf(x + dx, y + dy) !== k) return false;
            return true;
        };
        let doors = 0;
        const pick = (maxH, maxW = 99) => {
            const pool = cfg.HOUSES.filter(h => h.h <= maxH && h.w <= maxW && (!h.door || doors < cfg.MAX_DOORS));
            const total = pool.reduce((a, h) => a + h.weight, 0);
            let r = rand() * total;
            for (const h of pool) { if ((r -= h.weight) < 0) return h; }
            return pool[0];
        };
        const taken = new Set();
        // the graveyards first: a pocket of open yard, wholly on one level and clear of everything kept open, held back from the houses
        const reserve = (spec, out) => { for (const r of (inner ? [{ x: inner.interior.x - 2 - cfg.THICK.ew, y: inner.interior.y - 2 - cfg.THICK.ns, w: inner.interior.w + 4 + 2 * cfg.THICK.ew, h: inner.interior.h + 4 + 2 * cfg.THICK.ns }] : []).concat(wards)) {
            const want = (rand() < spec.chance ? 1 : 0) + (r === wards[0] ? spec.keep : 0);
            for (let k = 0, tries = 0; k < want && tries < 300; tries++) {
                const gw = between(spec.w), gh = between(spec.h);
                const gx = r.x + cfg.THICK.ew + 1 + Math.floor(rand() * Math.max(1, r.w - 2 * cfg.THICK.ew - gw - 2));
                const gy = r.y + cfg.THICK.ns + 1 + Math.floor(rand() * Math.max(1, r.h - 2 * cfg.THICK.ns - gh - 2));
                let ok = true;
                const k0 = kindOf(gx, gy);
                for (let y = gy - 1; y <= gy + gh && ok; y++) for (let x = gx - 1; x <= gx + gw && ok; x++) if (!openYard(x, y) || kindOf(x, y) !== k0 || taken.has(x + ',' + y)) ok = false;
                if (!ok) continue;
                for (let y = gy - 1; y <= gy + gh; y++) for (let x = gx - 1; x <= gx + gw; x++) taken.add(x + ',' + y);
                out.push({ x: gx, y: gy, w: gw, h: gh });
                k++;
            }
        } };
        reserve(cfg.MARKET, markets);
        reserve(cfg.GRAVEYARD, graveyards);
        // a house w x h standing with its bottom row on `bottom`, its lane `lane` rows below: the house on open yard clear of the walls' margin,
        // its lane on any open yard, none of it taken
        const fits = (hx, bottom, hw, hh, lane) => {
            const k0 = kindOf(hx, bottom);
            for (let y = bottom - hh + 1; y <= bottom + lane; y++) for (let x = hx; x < hx + hw; x++) {
                if (kindOf(x, y) !== k0) return false;                    // all of it on one level
                if (taken.has(x + ',' + y)) return false;
                if (y <= bottom ? !openYard(x, y) : (!yard(x, y) || blocked.has(x + ',' + y))) return false;
            }
            return true;
        };
        // a house is only put down where its walls cut nothing off: the open ground round it shrinks by exactly the cells its walls stand on
        const hsolid = new Set();
        const hwalk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && yard(x, y) && !hsolid.has(x + ',' + y);
        const hreach = (sx, sy) => {
            const seen = new Uint8Array(W * H), q = [sx, sy];
            seen[sy * W + sx] = 1;
            let n = 0;
            while (q.length) {
                const y = q.pop(), x = q.pop(); n++;
                if (hwalk(x + 1, y) && !seen[y * W + x + 1]) { seen[y * W + x + 1] = 1; q.push(x + 1, y); }
                if (hwalk(x - 1, y) && !seen[y * W + x - 1]) { seen[y * W + x - 1] = 1; q.push(x - 1, y); }
                if (hwalk(x, y + 1) && !seen[(y + 1) * W + x]) { seen[(y + 1) * W + x] = 1; q.push(x, y + 1); }
                if (hwalk(x, y - 1) && !seen[(y - 1) * W + x]) { seen[(y - 1) * W + x] = 1; q.push(x, y - 1); }
            }
            return n;
        };
        const cutsNothing = (h, hx, bottom) => {
            const sx = hx, sy = bottom + 1;                      // the lane before it
            if (!hwalk(sx, sy)) return false;
            const before = hreach(sx, sy);
            const cells = [];
            for (let y = bottom - 1; y <= bottom; y++) for (let x = hx; x < hx + h.w; x++) cells.push(x + ',' + y);
            cells.forEach(k => hsolid.add(k));
            if (hreach(sx, sy) === before - cells.length) return true;
            cells.forEach(k => hsolid.delete(k));
            return false;
        };
        const place = (h, hx, bottom, lane, alleys) => {
            if (!cutsNothing(h, hx, bottom)) return false;
            for (let y = bottom - h.h + 1; y <= bottom + lane; y++) for (let x = hx - (alleys ? 1 : 0); x < hx + h.w + (alleys ? 1 : 0); x++) taken.add(x + ',' + y);
            if (h.door) doors++;
            buildings.push({ id: h.id, col: hx, row: bottom, w: h.w, h: h.h, door: h.door ? { id: h.door, col: hx + h.doorIdx, row: bottom } : null });
            return true;
        };
        const chance = (tbl) => { let r = rand(); for (const [v, p] of tbl) { if ((r -= p) < 0) return v; } return tbl[0][0]; };
        const rowH = () => chance(cfg.ROW_H);
        // the armory first: a spot in the inner ward where it and the street before it fit (else in the bailey, else any ward), picked at random
        {
            const A = cfg.ARMORY;
            const spots = [[], [], []];
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const k = kindOf(x, y);
                if (!k || !fits(x, y, A.w, A.h, 2)) continue;
                const kw = wards[0];
                spots[k === 2 ? 0 : (x >= kw.x && x < kw.x + kw.w && y >= kw.y && y < kw.y + kw.h ? 1 : 2)].push([x, y]);
            }
            for (const list of spots) {
                let placed = false;
                for (let t = 0; t < 12 && list.length && !placed; t++) {
                    const [x, y] = list.splice(Math.floor(rand() * list.length), 1)[0];
                    if (place(A, x, y, 2, true)) { doors--; placed = true; }   // (the armory's door is its own, not one of the houses' few)
                }
                if (placed) break;
            }
        }
        // the inner ward's terrace first (its own rows), then the bailey and the other wards
        const areas = (inner ? [{ x: inner.interior.x - 2 - cfg.THICK.ew, y: inner.interior.y - 2 - cfg.THICK.ns, w: inner.interior.w + 4 + 2 * cfg.THICK.ew, h: inner.interior.h + 4 + 2 * cfg.THICK.ns }] : []).concat(wards);
        for (const r of areas) {
            const x0 = r.x + cfg.THICK.ew, x1 = r.x + r.w - cfg.THICK.ew, y1 = r.y + r.h - cfg.THICK.ns;
            // a cross street or two through a wide yard, left open by every row
            const cross = [];
            for (let k = 0; k < Math.floor((x1 - x0) / 30); k++) {
                const cw = between(cfg.CROSS_STREET), cx = x0 + Math.floor((x1 - x0) * (k + 1) / (Math.floor((x1 - x0) / 30) + 1)) + between([-4, 4]);
                cross.push([cx, cx + cw]);
            }
            const onCross = (a, b) => cross.some(([c0, c1]) => a < c1 && b > c0);
            let hy = r.y + cfg.THICK.ns;
            while (hy + 5 < y1) {
                const lane = chance(cfg.LANE), RH = rowH(), bottom = hy + RH - 1;
                let inBlock = 0, blockLen = between(cfg.BLOCK), placed = false;
                for (let hx = x0 + between([0, cfg.STAGGER]); hx + 3 <= x1;) {
                    let h = null;
                    for (let t = 0; t < 4 && !h; t++) { const c = pick(RH, x1 - hx); if (c && !onCross(hx, hx + c.w) && fits(hx, bottom, c.w, c.h, lane)) h = c; }
                    if (!h) { hx++; inBlock = 0; continue; }
                    if (rand() >= cfg.EMPTY_PLOT) { if (!place(h, hx, bottom, lane, false)) { hx++; inBlock = 0; continue; } }
                    else for (let y = bottom - h.h + 1; y <= bottom + lane; y++) for (let x = hx; x < hx + h.w; x++) taken.add(x + ',' + y);   // a little square
                    placed = true;
                    hx += h.w;
                    if (++inBlock >= blockLen) { hx += chance(cfg.ALLEY); inBlock = 0; blockLen = between(cfg.BLOCK); }   // an alley between blocks
                }
                hy += placed ? RH + lane : 1;
            }
        }
        // then every pocket left over that still takes a house (the biggest that fits, its lane one cell, an alley either side), so the town
        // fills right up to the open ground it must keep
        const bySize = cfg.HOUSES.filter(h => !h.door).slice().sort((p, q) => q.w * q.h - p.w * p.h);
        for (let hy = 0; hy < H; hy++) for (let hx = 0; hx < W; hx++) {
            const h = bySize.find(c => fits(hx, hy + c.h - 1, c.w, c.h, 1) && !taken.has((hx - 1) + ',' + (hy + c.h - 1)) && !taken.has((hx + c.w) + ',' + (hy + c.h - 1)));
            if (!h || !place(h, hx, hy + h.h - 1, 1, true)) continue;
            hx += h.w;
        }
        buildings.sort((p, q) => p.row - q.row);

        // ---- the alleys' clutter: crates and barrels against the houses' walls, standing torches along the lanes, bones. A solid one is only
        // put down where it cuts nothing off: the open ground it stands in (its ward's, or the town's) shrinks by exactly the one cell ----
        const P = cfg.PROPS;
        const solid = new Set();
        for (const bd of buildings) for (let y = bd.row - 1; y <= bd.row; y++) for (let x = bd.col; x < bd.col + bd.w; x++) solid.add(x + ',' + y);
        const keepOut = new Set();   // before every door, a tower's included, and on the stairs' feet: nothing at all
        for (const bd of buildings) if (bd.door) for (let dx = -1; dx <= 1; dx++) { keepOut.add((bd.door.col + dx) + ',' + (bd.row + 1)); keepOut.add((bd.door.col + dx) + ',' + (bd.row + 2)); }
        const walk = (x, y) => yard(x, y) && !solid.has(x + ',' + y);
        const reach = (start) => {
            const seen = new Uint8Array(W * H), q = [start];
            seen[start[1] * W + start[0]] = 1;
            let n = 0;
            while (q.length) {
                const [x, y] = q.pop(); n++;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !walk(nx, ny)) continue;
                    seen[ny * W + nx] = 1; q.push([nx, ny]);
                }
            }
            return n;
        };
        // a solid thing on the cells (w x h, its cell the bottom-left) only where it cuts nothing off
        const tryPut = (id, x, y, w = 1, h = 1) => {
            const cells = [];
            for (let yy = y - h + 1; yy <= y; yy++) for (let xx = x; xx < x + w; xx++) {
                const k = xx + ',' + yy;
                if (!walk(xx, yy) || keepOut.has(k) || blocked.has(k)) return false;
                cells.push([xx, yy]);
            }
            const before = reach([x, y]);
            cells.forEach(([a, b]) => solid.add(a + ',' + b));
            const nb = cells.flatMap(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]).find(([a, b]) => walk(a, b));
            const k0 = kindOf(x, y);
            const ok = nb && reach(nb) === before - cells.length && cells.every(([a, b]) => kindOf(a, b) === k0);
            if (!ok) { cells.forEach(([a, b]) => solid.delete(a + ',' + b)); return false; }
            props.push({ id, col: x, row: y }); return true;
        };
        {
            for (const bd of buildings) {   // against its front wall (either side of the door), its side walls, its back
                const spots = [];
                for (let x = bd.col; x < bd.col + bd.w; x++) spots.push([x, bd.row + 1]);
                spots.push([bd.col - 1, bd.row], [bd.col - 1, bd.row - 1], [bd.col + bd.w, bd.row], [bd.col + bd.w, bd.row - 1]);
                let n = between(P.CLUTTER_PER_HOUSE);
                for (let tries = 0; n > 0 && tries < 12; tries++) {
                    const [x, y] = spots[Math.floor(rand() * spots.length)];
                    if (tryPut(P.CLUTTER[Math.floor(rand() * P.CLUTTER.length)], x, y)) {
                        n--;
                        if (n > 0 && rand() < 0.5) { const [nx] = [x + (rand() < 0.5 ? -1 : 1)]; if (tryPut(P.CLUTTER[Math.floor(rand() * P.CLUTTER.length)], nx, y)) n--; }   // stacked in twos
                    }
                }
            }
            // torches: along the lanes before the rows, between the houses' doors, about every TORCH_EVERY cells
            let sinceTorch = 0;
            for (const bd of buildings) {
                sinceTorch += bd.w;
                if (sinceTorch < P.TORCH_EVERY) continue;
                const x = rand() < 0.5 ? bd.col : bd.col + bd.w - 1, y = bd.row + 1;
                if (tryPut('STANDING_TORCH', x, y)) sinceTorch = 0;
            }
            // the patrols: legionaries walking the lanes before the rows of houses (each walks his round from where he stands: LEGIONARY_PATROL's wander)
            if (buildings.length && cfg.PATROLS) {
                const want = Math.max(cfg.PATROLS.min, Math.round(buildings.length / cfg.PATROLS.every));
                for (let k = 0, tries = 0; k < want && tries < want * 40; tries++) {
                    const bd = buildings[Math.floor(rand() * buildings.length)];
                    const x = bd.col + Math.floor(bd.w / 2), y = bd.row + 1 + Math.floor(rand() * 2);
                    if (tryPut('LEGIONARY_PATROL', x, y)) k++;
                }
            }
            // the markets: a row of stalls along the square's top (and another lower down in a deep square), each facing south with room
            // before it; wheelbarrows; barrels and crates stacked in clusters
            for (const mk of markets) {
                // a square: stands round all four sides facing in (their fronts along the north side, their backs to us along the south side, side
                // on along the west and east), the well in the middle, a barrow or two, barrels and crates stacked by the stands
                const R0 = mk.x + 3, R1 = mk.x + mk.w - 3;
                for (let x = R0; x + 3 <= R1; x += 4) {
                    if (rand() > 0.1) tryPut('MARKET_STALL_' + (1 + Math.floor(rand() * 3)), x, mk.y + 2, 3, 2);
                    if (rand() > 0.15) tryPut('MARKET_STALL_BACK', x, mk.y + mk.h - 1, 3, 2);
                }
                for (let y = mk.y + 5; y <= mk.y + mk.h - 4; y += 3) {
                    if (rand() > 0.1) tryPut('MARKET_STALL_SIDE_E', mk.x, y, 2, 2);
                    if (rand() > 0.1) tryPut('MARKET_STALL_SIDE_W', mk.x + mk.w - 2, y, 2, 2);
                }
                tryPut('MARKET_WELL', mk.x + Math.floor(mk.w / 2) - 1, mk.y + Math.floor(mk.h / 2) + 1, 2, 2);
                for (let k = 0, t = 0; k < 2 && t < 30; t++) {
                    const x = mk.x + 3 + Math.floor(rand() * (mk.w - 7)), y = mk.y + 4 + Math.floor(rand() * Math.max(1, mk.h - 8));
                    if (tryPut('WHEELBARROW_' + (1 + Math.floor(rand() * 3)), x, y, 2, 1)) k++;
                }
                let nb = between(cfg.MARKET.barrels);
                for (let t = 0; nb > 0 && t < 60; t++) {              // clusters of two to five, by the stands
                    let x = mk.x + 2 + Math.floor(rand() * (mk.w - 4)), y = rand() < 0.5 ? mk.y + 3 : mk.y + mk.h - 3;
                    if (rand() < 0.4) { x = rand() < 0.5 ? mk.x + 2 : mk.x + mk.w - 3; y = mk.y + 3 + Math.floor(rand() * (mk.h - 6)); }
                    const size = 2 + Math.floor(rand() * 4);
                    for (let j = 0; j < size && nb > 0; j++) {
                        const id = rand() < 0.7 ? (rand() < 0.75 ? 'BARREL' : 'RUINED_BARREL') : (rand() < 0.5 ? 'CRATE' : 'CRATE_SACK');
                        if (tryPut(id, x, y)) nb--;
                        if (rand() < 0.5) x += rand() < 0.5 ? -1 : 1; else y += rand() < 0.5 ? -1 : 1;
                    }
                }
            }
            // the graveyards' stones: in rows two apart with a path between, a few gone, the odd one out of line
            for (const g of graveyards) {
                for (let y = g.y + 1; y < g.y + g.h; y += 2) for (let x = g.x + 1; x < g.x + g.w - 1; x += 2) {
                    if (rand() < cfg.GRAVEYARD.skip) continue;
                    tryPut('TOMBSTONE', x + (rand() < 0.15 ? 1 : 0), y);
                }
            }
            // the alleys' dead: fallen legionaries lying in the lanes and alleys beside the houses, and lone graves against their walls (never
            // shutting a way through)
            const besideHouse = () => {                         // a spot in the alley round a house: its lane, or the gap at its side
                const bd = buildings[Math.floor(rand() * buildings.length)];
                const r = rand();
                if (r < 0.6) return [bd.col + Math.floor(rand() * bd.w), bd.row + 1 + Math.floor(rand() * 2)];
                return [rand() < 0.5 ? bd.col - 1 - Math.floor(rand() * 2) : bd.col + bd.w + Math.floor(rand() * 2), bd.row - Math.floor(rand() * 2)];
            };
            if (buildings.length) {
                const nFallen = Math.round(buildings.length / cfg.THE_FALLEN.every);
                for (let k = 0, tries = 0; k < nFallen && tries < nFallen * 40; tries++) {
                    const [x, y] = besideHouse();
                    if (tryPut('FALLEN_SOLDIER_' + (1 + Math.floor(rand() * 15)), x - (rand() < 0.5 ? 1 : 0), y + (rand() < 0.5 ? 1 : 0), 2, 2)) k++;
                }
                const nGraves = Math.round(buildings.length / cfg.ALLEY_GRAVES.every);
                for (let k = 0, tries = 0; k < nGraves && tries < nGraves * 30; tries++) {
                    const [x, y] = besideHouse();
                    const byWall = solid.has(x + ',' + (y - 1)) || solid.has((x - 1) + ',' + y) || solid.has((x + 1) + ',' + y);
                    if (byWall && tryPut('TOMBSTONE', x, y)) k++;
                }
            }
            // bones: anywhere open along the alleys (you can walk over them)
            const used = new Set(props.map(p => p.col + ',' + p.row));
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const k = x + ',' + y;
                if (!walk(x, y) || keepOut.has(k) || used.has(k) || blocked.has(k)) continue;
                const nearHouse = solid.has(x + ',' + (y - 1)) || solid.has((x - 1) + ',' + y) || solid.has((x + 1) + ',' + y);
                if (nearHouse && rand() < P.BONES * 3 || rand() < P.BONES * 0.2) props.push({ id: 'BONE_PILE', col: x, row: y });
            }
        }
        props.sort((p, q) => p.row - q.row);
    }
    return { w: W, h: H, tiles, towers, gate, gates, stairs, platform: plat, skirt, inner, levelPaths: [...levelPaths], noFront: [...noFront, ...gateCover], solidCells: [...noFront, ...gateCover], keep: keepB, buildings, props, graveyards, markets, wards: wards.map(({ x, y, w, h }) => ({ x, y, w, h })) };
}

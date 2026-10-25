/* =============================================================================================================
   STRUCTURES

   Two kinds of entry:
     PREFAB     a fixed rectangle of terrain + objects, written into the world as it is.
     BLUEPRINT  a recipe the WorldManager follows: a hub prefab, roads that grow out of it, and buildings that are
                placed along those roads (see WorldManager._planBlueprint).

   Everything below the helpers is plain data you can tune.

   Grids are indexed [row][col]. In a terrain grid  null = leave the natural tile, 1 = dirt, 2 = grass.
   In an objects grid  null = nothing (and no random tree / rock is allowed to grow there).
   ============================================================================================================= */

/* ---------- small helpers, only used to build the tables below ---------- */

const grid = (w, h, v = null) => Array.from({ length: h }, () => Array(w).fill(v));

/* ground decoration that never blocks a step; sprinkled over yards and the plaza (the WorldManager picks per cell,
   so no two yards look the same). Repeated names make a kind more likely. */
const GROUND_DECOR = [
    'GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_2',
    'TULIPS_WHITE', 'TULIPS_ORANGE', 'TULIPS_RED',
    'SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3', 'STICK',
];

/* ---------- fenced yards (houses, workshops, storehouses) ----------

   Every building is a fenced yard with the same anatomy (8 wide):

          col  0 1 2 3 4 5 6 7
      row 0    . . . . . . . .      margin (kept clear, the footpath runs through it)
      row 1    . + - - - - + .      fence
      row 2    . | H D . . | .      H = house, D = its door (the door faces south into the yard)
      ...      . | . . . . | .
      row y2   . + - - - - + .      fence
      row h-1  . . . . . . . .      margin

   A yard has ONE gate and a dirt footpath from the door to the gate and on to the edge of the prefab, so the
   footpath always ends right next to the road. The WorldManager picks the variant whose gate faces the road:

      S   gate in the south fence                 (building north of an east-west road)
      E   gate in the east fence                  (building west of a north-south road)
      W   gate in the west fence                  (building east of a north-south road)
      EN  gate in the east fence, alley north     (building south of an east-west road)
      WN  gate in the west fence, alley north

   The yard grows with its house: `houseW` x `houseH` tiles (default 4 x 4, like a crop field's empty yard) put the house's bottom-left cell at (2, houseH - 1), so the
   whole sprite sits inside the prefab, the fence is houseW + 2 wide, and the door is on column `doorCol` of the house's bottom row. Three free rows lie between the house
   and the front fence (the cell in front of the door, the footpath row, the prop row). Prop columns are written for the old 4-wide yard (2 = left of the door, 3 = the
   door's own column, 4 and 5 = right of it) and are moved to the matching places of a wider house.
   `wear` and `scatter` are applied by the WorldManager per placed yard (broken fence pieces, flowers and rocks). */

const GATES = {
    S: { side: 'S' },
    E: { side: 'E' },
    W: { side: 'W' },
    EN: { side: 'E', alley: true },
    WN: { side: 'W', alley: true },
};

/* COMPACT YARDS (every house): the fence is the edge of the yard, so a yard is only `houseW + 2` wide and `houseRow + 4` tall (two free rows in front of the house: the footpath row, with the gate of a side gate in it, and a row of props), and only has an empty column beside the fence where the
   footpath needs one (an alley running along the side) or where it keeps two neighbours one tile apart. The sprite's own top row is the empty row between a yard and the next one down a
   north-south road. The gate is in the fence itself, so the road runs right along the fence (a street of tightly packed plots, not a village of fields). Margins per gate:
        S  one column on the left     E, W  none     EN  one on the right (the alley)     WN  one on the left (the alley) */
const COMPACT_MARGIN = {
    S: { l: 1, r: 0 },
    E: { l: 0, r: 0 },
    W: { l: 0, r: 0 },
    EN: { l: 0, r: 1 },
    WN: { l: 1, r: 0 },
};

function buildYard(spec, gate) {
    const g = GATES[gate];
    const m = spec.compact ? COMPACT_MARGIN[gate] : null;
    const hr = spec.houseRow ?? 2;                         // the row of the house's bottom edge (and of its door)
    const houseW = spec.houseW ?? 4;
    const w = m ? houseW + 2 + m.l + m.r : spec.w;
    const h = m ? hr + 4 : spec.h;
    const x1 = m ? m.l : 1, y1 = 1, x2 = m ? w - 1 - m.r : w - 2, y2 = m ? h - 1 : h - 2;
    const hc = m ? m.l + 1 : 2;                            // the column of the house's left edge
    const doorCol = m ? hc + (spec.doorIdx ?? 0) : (spec.doorCol ?? 3);
    const anchor = m ? [hc + (spec.doorIdx ?? (houseW >> 1)), hr + 1] : spec.anchor;
    const gr = m ? hr + 1 : spec.gateRow;
    const shift = m ? m.l - 1 : 0;                         // props are written for a yard whose house starts on column 2
    const widen = houseW - 4;
    const propCell = ([x, y, id]) => [Math.min(Math.max(x <= 2 ? x + shift : x === 3 ? doorCol : x + widen + shift, x1 + 1), x2 - 1), y + (hr - (m ? 3 : 2)), id];
    const houseId = spec.houseByGate ? spec.houseByGate[gate] : spec.house;
    const terrain = grid(w, h);
    const objects = grid(w, h);

    // the fence
    for (let x = x1 + 1; x < x2; x++) { objects[y1][x] = 'WOODEN_FENCE_H'; objects[y2][x] = 'WOODEN_FENCE_H'; }
    for (let y = y1 + 1; y < y2; y++) { objects[y][x1] = 'WOODEN_FENCE_V'; objects[y][x2] = 'WOODEN_FENCE_V'; }
    objects[y1][x1] = 'WOODEN_FENCE_TL_CORNER';
    objects[y1][x2] = 'WOODEN_FENCE_TR_CORNER';
    objects[y2][x1] = 'WOODEN_FENCE_BL_CORNER';
    objects[y2][x2] = 'WOODEN_FENCE_BR_CORNER';

    // the house and its door, then the props
    if (houseId) { objects[hr][hc] = houseId; if (spec.door) objects[hr][doorCol] = spec.door; }
    for (const prop of spec.props) { const [x, y, id] = propCell(prop); objects[y][x] = id; }

    // the footpath: from the cell in front of the door (the anchor) through the gate to the edge of the prefab
    const [ax, ay] = anchor;
    const path = [];
    let gx, gy;
    if (g.side === 'S') {
        gx = ax; gy = y2;
        for (let y = ay; y < h; y++) path.push([ax, y]);
    } else {
        for (let y = ay; y <= gr; y++) path.push([ax, y]);
        if (g.side === 'E') { gx = x2; gy = gr; for (let x = ax + 1; x < w; x++) path.push([x, gr]); }
        else { gx = x1; gy = gr; for (let x = ax - 1; x >= 0; x--) path.push([x, gr]); }
        if (g.alley) {
            const ex = g.side === 'E' ? w - 1 : 0;
            for (let y = gr - 1; y >= 0; y--) path.push([ex, y]);
        }
    }
    for (const [x, y] of path) terrain[y][x] = 1;
    objects[gy][gx] = null; // the gate

    // a crop field: the plots (spec.crop.plots, [x, y] cells) are tilled earth planted with ONE herb; the footpath stays a path whichever gate was picked
    if (spec.crop) {
        const onPath = new Set(path.map(([x, y]) => `${x},${y}`));
        for (const [x, y] of spec.crop.plots) {
            if (onPath.has(`${x},${y}`)) continue;
            terrain[y][x] = 1;
            objects[y][x] = spec.crop.id;
        }
    }

    // where the footpath leaves the prefab and the way it points: the road has to be on the other side of that cell
    const [ex, ey] = path[path.length - 1];
    const entry = g.side === 'S' ? { x: ex, y: ey, dx: 0, dy: 1 }
        : g.alley ? { x: ex, y: ey, dx: 0, dy: -1 }
        : g.side === 'E' ? { x: ex, y: ey, dx: 1, dy: 0 }
        : { x: ex, y: ey, dx: -1, dy: 0 };

    return {
        type: 'PREFAB',
        gate,
        entry,
        width: w,
        height: h,
        terrain,
        objects,
        wear: { fenceBreak: spec.fenceBreak ?? 0.12 },
        scatter: { chance: spec.scatterChance ?? 0.32, pool: spec.scatterPool || GROUND_DECOR, rect: m ? { x: x1 + 1, y: hr + 1, w: houseW, h: 3 } : spec.scatterRect },
    };
}

/* the default look of a yard is the S variant (so the entry also works as a plain prefab); `variants` has all five */
function yard(spec) {
    const variants = {};
    for (const key of Object.keys(GATES)) variants[key] = buildYard(spec, key);
    return { ...variants.S, variants };
}

/* ---------- the hub: a plaza where the roads meet ----------

   11 x 11. Two 3-wide roads cross in the middle (rows / cols 4..6) inside a 5 x 5 dirt plaza with the campfire in the
   middle. The four corners hold a little scene each: a stump and stones, a market table, a garden gone wild, a fallen fence. No chests out here (they are
   indoors) and no storage corner.
   The roads that grow out of the four sides start exactly on the 3-wide road cells. */

function buildCenter(theme = {}) {
    const N = 11;
    const terrain = grid(N, N);
    const objects = grid(N, N);
    const dirt = (x, y) => (x >= 4 && x <= 6) || (y >= 4 && y <= 6) || (x >= 3 && x <= 7 && y >= 3 && y <= 7);

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (dirt(x, y)) { terrain[y][x] = 1; continue; }
            // grass wherever dirt is next door, so the edge of the road is always a clean dirt / grass edge; the far corners stay natural
            let nearDirt = false;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dirt(x + dx, y + dy)) nearDirt = true;
            if (nearDirt && !theme.noGrass) terrain[y][x] = 2;   // sand and snow are left as they are: no grass is laid there
        }
    }

    const put = (x, y, id) => { objects[y][x] = id; };
    put(5, 5, 'CAMPFIRE');
    put(4, 4, 'STOOL'); put(6, 4, 'STOOL'); put(4, 6, 'STOOL'); put(6, 6, 'STOOL');   // right round the fire

    if (theme.corners) {
        theme.corners(put);
    } else {
        // north-west: a stump among the stones
        put(1, 1, 'SMALL_ROCKS_2'); put(2, 1, 'TREE_STUMP'); put(1, 2, 'SMALL_ROCKS_1'); put(2, 2, 'GRASS_COVERAGE_1');
        // north-east: a market table
        put(8, 1, 'TABLE_LONG'); put(10, 1, 'BARREL'); put(9, 2, 'CRATE_SACK'); put(8, 3, 'TULIPS_WHITE');
        // south-east: a garden gone wild
        put(9, 9, 'TREE_STUMP'); put(8, 9, 'TULIPS_RED'); put(9, 8, 'TULIPS_WHITE'); put(8, 8, 'GRASS_COVERAGE_2'); put(10, 9, 'SMALL_ROCKS_2');
        // south-west: a fallen fence in the grass
        put(1, 9, 'WOODEN_FENCE_FALLEN'); put(2, 9, 'TREE_STUMP'); put(1, 8, 'GRASS_COVERAGE_3'); put(2, 8, 'GRASS_COVERAGE_2');
    }

    return {
        type: 'PREFAB',
        width: N,
        height: N,
        terrain,
        objects,
        scatter: { chance: 0.18, pool: theme.scatterPool || GROUND_DECOR },
    };
}

/* ---------- the buildings ---------- */

/* the houses' size in tiles and the column (counted from the left edge of the sprite) of the door gap painted into it; the yard is built around it (see buildYard).
   A SIDE house (`_LEFT` / `_RIGHT`: the same house seen from the side, for a plot beside a north-south road) has no door: it is a sealed shell, so it has no `doorIdx`.
   Props sit on the second free row below the house (row hr + 2) so the footpath along the first one stays open. */
const HOUSE_SIZES = {
    ABANDONED_HOUSE_1: { w: 5, h: 5, doorIdx: 2 },
    ABANDONED_STONE_HOUSE: { w: 5, h: 5, doorIdx: 2 },
    ABANDONED_SMITHY: { w: 5, h: 5, doorIdx: 2 },
    CRAFTING_HOUSE: { w: 7, h: 6, doorIdx: 2 },
    ABANDONED_HOUSE_1_LEFT: { w: 5, h: 5 }, ABANDONED_HOUSE_1_RIGHT: { w: 5, h: 5 },
    ABANDONED_STONE_HOUSE_LEFT: { w: 5, h: 5 }, ABANDONED_STONE_HOUSE_RIGHT: { w: 5, h: 5 },
    ABANDONED_SMITHY_LEFT: { w: 5, h: 5 }, ABANDONED_SMITHY_RIGHT: { w: 5, h: 5 },
    CRAFTING_HOUSE_LEFT: { w: 6, h: 6 }, CRAFTING_HOUSE_RIGHT: { w: 6, h: 6 },
};

function houseSpec(house, door, props) {
    const { w, h, doorIdx } = HOUSE_SIZES[house];
    return { compact: true, houseW: w, houseH: h, houseRow: h - 1, doorIdx, house, door, props };
}

/* a side-view house: which sprite it is depends on the gate (a plot west of the road has its gable towards the east); `swap` flips left and right so the two modules of a kind differ */
function sideSpec(base, props, swap = false) {
    const { w, h } = HOUSE_SIZES[`${base}_LEFT`];
    const [onE, onW] = swap ? ['LEFT', 'RIGHT'] : ['RIGHT', 'LEFT'];
    const byGate = { E: `${base}_${onE}`, EN: `${base}_${onE}`, W: `${base}_${onW}`, WN: `${base}_${onW}`, S: `${base}_${onE}` };
    return { compact: true, houseW: w, houseH: h, houseRow: h - 1, houseByGate: byGate, door: null, props };
}

const HOUSE_SPEC = houseSpec('ABANDONED_HOUSE_1', 'HOUSE_DOOR_WOODEN', [[2, 5, 'TREE_STUMP'], [5, 5, 'BARREL']]);

const STONE_HOUSE_SPEC = houseSpec('ABANDONED_STONE_HOUSE', 'HOUSE_DOOR_WOODEN', [[2, 5, 'CRATE'], [5, 5, 'SMALL_ROCKS_2']]);

const SMITHY_SPEC = houseSpec('ABANDONED_SMITHY', 'SMITHY_DOOR', [[2, 5, 'BARREL'], [5, 5, 'CRATE']]);

const WORKSHOP = (door, props) => houseSpec('CRAFTING_HOUSE', door, props);

const CROP_FIELD = (herb) => ({
    w: 8, h: 8, anchor: [3, 2], gateRow: 5, scatterRect: { x: 2, y: 5, w: 4, h: 1 }, scatterPool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'],
    house: null, door: null,
    props: [],
    crop: { id: herb, plots: [2, 3, 4].flatMap(y => [[2, y], [4, y], [5, y]]) },
});

/* the buildings of a village, each as a yard with a biome's props (`t`): the five houses, the smithy and the workshop (every one has a door), and the SIDE houses for the
   plots beside north-south roads (sealed: no door). `suffix` names the biome ('' for the plains: ABANDONED_HOUSE, 'DESERT': ABANDONED_HOUSE_DESERT, ...); `t.base` is merged into
   every yard spec, `t.sides.<kind>` holds the props of the two modules of each side house (the second one has its left and right sprites swapped). */
function buildingSet(suffix, t) {
    const n = (base) => (suffix ? `${base}_${suffix}` : base);
    const b = t.base || {};
    const side = (key, base, i) => ({ [n(`${key}_SIDE_${i + 1}`)]: yard({ ...sideSpec(base, t.sides[key][i], i === 1), ...b }) });
    return {
        [n('ABANDONED_HOUSE')]: yard({ ...HOUSE_SPEC, ...b, props: t.house }),
        [n('ABANDONED_COTTAGE')]: yard({ ...HOUSE_SPEC, ...b, props: t.cottage }),
        [n('ABANDONED_FARMHOUSE')]: yard({ ...HOUSE_SPEC, ...b, props: t.farmhouse }),
        [n('ABANDONED_HUT')]: yard({ ...HOUSE_SPEC, ...b, props: t.hut }),
        [n('ABANDONED_STONE_HOUSE')]: yard({ ...STONE_HOUSE_SPEC, ...b, props: t.stone }),
        [n('ABANDONED_SMITHY')]: yard({ ...SMITHY_SPEC, ...b, props: t.smithy }),
        [n('ABANDONED_WORKSHOP')]: yard({ ...WORKSHOP('WORKSHOP_DOOR', t.workshop), ...b }),
        ...side('ABANDONED_HOUSE', 'ABANDONED_HOUSE_1', 0), ...side('ABANDONED_HOUSE', 'ABANDONED_HOUSE_1', 1),
        ...side('ABANDONED_STONE_HOUSE', 'ABANDONED_STONE_HOUSE', 0), ...side('ABANDONED_STONE_HOUSE', 'ABANDONED_STONE_HOUSE', 1),
        ...side('ABANDONED_SMITHY', 'ABANDONED_SMITHY', 0), ...side('ABANDONED_SMITHY', 'ABANDONED_SMITHY', 1),
        ...side('ABANDONED_WORKSHOP', 'CRAFTING_HOUSE', 0), ...side('ABANDONED_WORKSHOP', 'CRAFTING_HOUSE', 1),
    };
}

/* the modules of a village (see `modules` in ABANDONED_VILLAGE): `verticalWeight` is the weight beside a north-south road, `horizontalWeight` beside an east-west one (both default to `weight`).
   The side houses show their long wall to a street that runs north-south and have no door, so they are only ever put there (horizontalWeight 0); the houses with a door are the ones
   that stand on every street. */
function villageModules(suffix) {
    const n = (base) => (suffix ? `${base}_${suffix}` : base);
    const sides = (key, weight, max) => [1, 2].map(i => ({ prefab: n(`${key}_SIDE_${i}`), weight, horizontalWeight: 0, ...(max ? { max } : {}) }));
    return [
        { prefab: n('ABANDONED_HOUSE'), weight: 4, verticalWeight: 1.5 },
        { prefab: n('ABANDONED_COTTAGE'), weight: 3, verticalWeight: 1 },
        { prefab: n('ABANDONED_FARMHOUSE'), weight: 2, verticalWeight: 0.8 },
        { prefab: n('ABANDONED_HUT'), weight: 2, verticalWeight: 0.8 },
        { prefab: n('ABANDONED_STONE_HOUSE'), weight: 3, verticalWeight: 1.5 },
        { prefab: n('ABANDONED_SMITHY'), weight: 1.5, verticalWeight: 0.8, max: 3 },
        ...sides('ABANDONED_HOUSE', 3.5),
        ...sides('ABANDONED_STONE_HOUSE', 3),
        ...sides('ABANDONED_SMITHY', 1, 3),
        ...sides('ABANDONED_WORKSHOP', 0.6, 2),
    ];
}

const PLAINS_BUILDINGS = {
    base: {},
    house: [[2, 5, 'TREE_STUMP'], [5, 5, 'BARREL']],
    cottage: [[2, 5, 'SACKS'], [5, 5, 'TREE_STUMP']],
    farmhouse: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'SACKS']],
    hut: [[2, 5, 'TULIPS_RED'], [4, 5, 'TULIPS_WHITE'], [5, 5, 'TREE_STUMP']],
    stone: [[2, 5, 'CRATE'], [5, 5, 'SMALL_ROCKS_2']],
    smithy: [[2, 5, 'BARREL'], [4, 5, 'SMALL_ROCKS_1'], [5, 5, 'CRATE']],
    workshop: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'CRATE_SACK']],
    sides: {
        ABANDONED_HOUSE: [[[2, 5, 'TULIPS_RED'], [5, 5, 'BARREL']], [[2, 5, 'SACKS'], [4, 5, 'TREE_STUMP']]],
        ABANDONED_STONE_HOUSE: [[[2, 5, 'CRATE'], [5, 5, 'SMALL_ROCKS_2']], [[2, 5, 'BARREL'], [5, 5, 'TULIPS_WHITE']]],
        ABANDONED_SMITHY: [[[2, 5, 'BARREL'], [5, 5, 'CRATE']], [[2, 5, 'SMALL_ROCKS_1'], [4, 5, 'BARREL']]],
        ABANDONED_WORKSHOP: [[[2, 5, 'CRATE'], [5, 5, 'CRATE_SACK']], [[2, 5, 'BARREL'], [5, 5, 'SACKS']]],
    },
};

export const STRUCTURES = {
    // ==========================================
    // SUPER STRUCTURE (The Blueprint)
    // ==========================================
    ABANDONED_VILLAGE: {
        type: 'BLUEPRINT',
        centerPrefab: 'ABANDONED_CENTER',

        /* ROADS */
        pathTile: 1,                              // 1 = dirt
        roadWidth: 3,                             // tiles; odd numbers only (an even number is rounded down to the odd one below)
        roadGap: 1,                               // grass kept between two roads that run side by side
        edgeWear: 0.10,                           // share of the road's two edge columns left as grass, so the edge is ragged, never the middle
        verge: 1,                                 // tiles beside a road kept free of random trees / rocks
        branchChance: 0.8,                        // chance for each of the hub's four sides to grow a main road (at least two always do)
        branchLength: { min: 36, max: 56 },                // longer streets: more plots, a town rather than a hamlet
        turnChance: 0.10,
        minStepsBetweenTurns: 8,
        sideStreets: {                            // alleys that fork off the main roads (and off each other)
            chance: 1,                            //   per candidate spot
            width: 1,                             //   the alleys are one tile wide (the main roads are `roadWidth`): the yards stand right along them, fence to fence
            spacing: 16,                          //   steps between two forks on one road: two yards (7 to 8 wide) fit between two alleys
            startAt: 5,                           //   no fork before this many steps from the hub
            endBefore: 4,                         //   ... or this close to the end of the road
            length: { min: 9, max: 32 },
            max: 48,                              //   per village
            depth: 3,                             //   3 = alleys fork off the side streets, and off those again (a lattice of lanes between the blocks)
        },
        levels: {                                 // a street that meets a cliff gets a stair and goes on up (or down) the next level, with side streets and yards of its own
            max: 6,                               //   stairs per village
            depth: 3,                             //   most stairs between a street and the hub (3 = up three levels)
            chance: 1,                            //   per spur tried
            spacing: 8,                           //   empty cells between two stairs
            probeStep: 2,                         //   a spur is tried from every n-th cell of a street
            spur: { min: 2, max: 30 },            //   length of the short street that leads to the stair
            upper: { min: 8, max: 40 },           //   length of the street on the far side of the stair (it bends round the ledge it is on)
        },

        /* BUILDINGS (along every road, on both sides, gate facing the road) */
        buildingDensity: 1,                       // chance a free spot along a road gets a building (1 = every free spot: the plots touch)
        buildingTries: 10,                        // when the module a spot rolled does not fit, up to this many others are tried, so the streets fill without gaps
        maxBuildings: 150,
        setback: 0,                               // extra grass between a yard and the road
        /* weight = how often it is picked; required = at least one per village (when there is room); max = cap per village */
        modules: [
            ...villageModules(''),
            /* crop fields: a fenced field of one herb each (the three herbs are picked by walking over them); a town has fewer of them than a village */
            { prefab: 'ABANDONED_CROP_FIELD_HEALING',       weight: 0.6 },
            { prefab: 'ABANDONED_CROP_FIELD_INVIGORATING',  weight: 0.6 },
            { prefab: 'ABANDONED_CROP_FIELD_ILLUMINATING',  weight: 0.6 },

            // The one workshop: its interior holds every crafting station (see ABANDONED_WORKSHOP in interiorDefinitions.js)
            { prefab: 'ABANDONED_WORKSHOP',   weight: 1.5, required: true, max: 1 },
        ],

        /* TREES along the roads and in the empty lots (a tree keeps its whole footprint off roads and yards). `chance` is per free cell
           inside `reach` of a road, cells right beside a road are `roadsideBoost` times as likely, and `max` caps a village. */
        trees: {
            chance: 0.05,                         // a town has fewer trees than a village: the plots are packed, the trees stand in the gaps and at the edge
            reach: 18,
            clearRoad: 2,
            clearBuilding: 1,
            roadsideBoost: 3,
            max: 200,
            /* `pool` is what grows in every biome that has no entry of its own below. The trees follow the biome of the cell they stand on (a road can run
               out of the plains into a snowfield or a desert), so list a biome here to give it its own trees; an empty list = no trees there. */
            pool: [
                { id: 'OAK_TREE_1', weight: 3 },
                { id: 'PINE_TREE', weight: 4 },
                { id: 'TREE_STUMP', weight: 1 },
            ],
            biomes: {
                SNOWY_MOUNTAINS: [
                    { id: 'SNOWY_PINE_TREE', weight: 7 },
                    { id: 'SNOWY_TREE_STUMP', weight: 1 },
                ],
                DESERT: [],                           // the desert grows no trees
            },
        },

        /* STANDING TORCHES: now and then a lit torch beside the road. Walking a road, each step has `chance` of getting one on a random side, and no two
           torches on a road are closer than `spacing` steps. (They are solid and give light at night: see STANDING_TORCH in mapObjectDefinitions.js.) */
        streetTorches: {
            id: 'STANDING_TORCH',
            chance: 0.08,
            spacing: 10,
        },

        /* SCARECROWS: the Peculiar Scarecrow, the only place it is made (see _planStreetScarecrows in worldManager.js). It stands on the verge north of an
           east-west road, looking south, so the 5 tiles beneath it run across the road. Each step along such a road has `chance` of getting one, no two on a
           road are closer than `spacing` steps, and a village has at most `max`. (Three times as common as they were: 0.04 / 14 / 3.) */
        scarecrows: {
            id: 'PECULIAR_SCARECROW',
            chance: 0.12,
            spacing: 8,
            max: 8,
        },

        /* GRAVESTONES: old graves on the verge beside the roads (see _planGravestones in worldManager.js). Each step along a straight road has `chance` of one,
           no two on a road are closer than `spacing` steps, and a village has at most `max`. Every stone is the plain TOMBSTONE except `encounterChance` of them,
           which are the OLD_GRAVESTONE you can dig up (encounter old_gravestone). Both use the same sprite. */
        gravestones: {
            id: 'TOMBSTONE',
            encounterId: 'OLD_GRAVESTONE',
            encounterChance: 0.05,
            chance: 0.06,
            spacing: 9,
            max: 10,
        },

        /* STREET DRESSING (on the grass just beside the road; the solid ones are never in the way of the road) */
        streetProps: {
            chance: 0.10,                         // per step, per side
            pool: [
                'GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3',
                'TULIPS_WHITE', 'TULIPS_RED',
                'SMALL_ROCKS_1', 'SMALL_ROCKS_2',
                'TREE_STUMP', 'BARREL', 'CRATE',
            ],
            /* same rule as the trees: a biome listed here uses its own list instead of `pool` (no grass or tulips on snow or sand) */
            biomes: {
                SNOWY_MOUNTAINS: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SNOWY_TREE_STUMP', 'BARREL', 'CRATE'],
                DESERT: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'BARREL', 'CRATE'],
            },
        },
    },

    // ==========================================
    // SUB-STRUCTURES (The Modular Pieces)
    // ==========================================
    ABANDONED_CENTER: buildCenter(),

    /* the houses, the smithy, the workshop and the sealed side houses (see buildingSet) */
    ...buildingSet('', PLAINS_BUILDINGS),

    /* CROP FIELDS: the same fenced yard with no house. Three rows of tilled earth (rows 2..4: columns 2, 4 and 5, the footpath runs down column 3 and along
       row 5 to the gate) planted with ONE herb, so a field is a field of Healing, of Invigorating or of Illuminating Herb. Row 5 and the grass between stay
       open, with a few weeds. (Which gate faces the road only changes where the footpath leaves; it never crosses a plot, and `crop` skips any plot it would.) */
    ABANDONED_CROP_FIELD_HEALING: yard(CROP_FIELD('HEALING_HERB')),
    ABANDONED_CROP_FIELD_INVIGORATING: yard(CROP_FIELD('INVIGORATING_HERB')),
    ABANDONED_CROP_FIELD_ILLUMINATING: yard(CROP_FIELD('ILLUMINATING_HERB')),

};

/* =============================================================================================================
   BIOME VARIANTS OF THE ABANDONED VILLAGE
   The desert and the snowy mountains each get their own village: the same roads, yards, workshop and scarecrows (it is copied from ABANDONED_VILLAGE, so
   every number above, the scarecrow rate included, applies), dressed for the ground it stands on. No grass is laid (sand and snow stay as they are), the
   plaza and the yards are strewn with the biome's own litter, cacti or snowy pines and stumps stand along the roads, and the desert's crop fields grow
   aloe (the herbs do not grow there). The houses use the same two sprites as the plains village (the abandoned house, the crafting house for the workshop): give ABANDONED_HOUSE_1 /
   CRAFTING_HOUSE a per-biome `sheet` in mapObjectDefinitions.js, like the small rocks have, to give them their own look.
   Biome ids a road can run into: PLAINS, DESERT and SNOWY_MOUNTAINS; each variant lists all three in `trees` and `streetProps`, so a street that leaves
   its own biome is dressed like the village it came from in that biome.
   ============================================================================================================= */

const DESERT_DECOR = ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3', 'SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3', 'DESERT_SKULL', 'BONE_PILE'];
const SNOWY_DECOR = ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3', 'STICK'];

Object.assign(STRUCTURES, {
    ABANDONED_CENTER_DESERT: buildCenter({
        noGrass: true,
        scatterPool: DESERT_DECOR,
        corners(put) {
            // north-west: bones and stones in the sand
            put(1, 1, 'SMALL_ROCKS_2'); put(2, 1, 'BONE_PILE'); put(1, 2, 'DESERT_SKULL'); put(2, 2, 'SAND_DUNE_1');
            // north-east: a market table
            put(8, 1, 'TABLE_LONG'); put(10, 1, 'BARREL'); put(9, 2, 'CRATE_SACK'); put(8, 3, 'SAND_DUNE_2');
            // south-east: a lone cactus
            put(9, 9, 'SMALL_CACTUS_1'); put(8, 9, 'SAND_DUNE_3'); put(8, 8, 'DESERT_SKULL'); put(10, 9, 'SMALL_ROCKS_2');
            // south-west: a fallen fence, half buried
            put(1, 9, 'WOODEN_FENCE_FALLEN'); put(2, 9, 'BONE_PILE'); put(1, 8, 'SAND_DUNE_1'); put(2, 8, 'SMALL_ROCKS_1');
        },
    }),
    ...buildingSet('DESERT', {
        base: { scatterPool: DESERT_DECOR, scatterChance: 0.4, fenceBreak: 0.25 },     // the sand has had the fences down more often
        house: [[2, 5, 'BONE_PILE'], [5, 5, 'BARREL']],
        cottage: [[2, 5, 'SACKS'], [5, 5, 'DESERT_SKULL']],
        farmhouse: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'SACKS']],
        hut: [[2, 5, 'SMALL_ROCKS_1'], [4, 5, 'SAND_DUNE_1'], [5, 5, 'BONE_PILE']],
        stone: [[2, 5, 'CRATE'], [5, 5, 'DESERT_SKULL']],
        smithy: [[2, 5, 'BARREL'], [4, 5, 'SMALL_ROCKS_1'], [5, 5, 'BONE_PILE']],
        workshop: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'CRATE_SACK']],
        sides: {
            ABANDONED_HOUSE: [[[2, 5, 'BONE_PILE'], [5, 5, 'BARREL']], [[2, 5, 'SACKS'], [4, 5, 'SAND_DUNE_1']]],
            ABANDONED_STONE_HOUSE: [[[2, 5, 'CRATE'], [5, 5, 'DESERT_SKULL']], [[2, 5, 'BARREL'], [5, 5, 'SMALL_ROCKS_2']]],
            ABANDONED_SMITHY: [[[2, 5, 'BARREL'], [5, 5, 'CRATE']], [[2, 5, 'SMALL_ROCKS_1'], [4, 5, 'BONE_PILE']]],
            ABANDONED_WORKSHOP: [[[2, 5, 'CRATE'], [5, 5, 'CRATE_SACK']], [[2, 5, 'BARREL'], [5, 5, 'SACKS']]],
        },
    }),
    /* the desert's crop field: the same fenced field, planted with aloe */
    ABANDONED_CROP_FIELD_ALOE: yard({ ...CROP_FIELD('ALOE_PLANT'), scatterPool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SAND_DUNE_1'] }),

    ABANDONED_CENTER_SNOWY: buildCenter({
        noGrass: true,
        scatterPool: SNOWY_DECOR,
        corners(put) {
            // north-west: a stump among the stones
            put(1, 1, 'SMALL_ROCKS_2'); put(2, 1, 'SNOWY_TREE_STUMP'); put(1, 2, 'SMALL_ROCKS_1'); put(2, 2, 'SMALL_ROCKS_3');
            // north-east: a market table
            put(8, 1, 'TABLE_LONG'); put(10, 1, 'BARREL'); put(9, 2, 'CRATE_SACK'); put(8, 3, 'SMALL_ROCKS_1');
            // south-east: a snowy boulder and a stump
            put(9, 9, 'SNOWY_TREE_STUMP'); put(10, 9, 'SNOWY_BOULDER_2'); put(9, 8, 'SMALL_ROCKS_3'); put(8, 9, 'SMALL_ROCKS_2'); put(8, 8, 'STICK');
            // south-west: a fallen fence in the snow
            put(1, 9, 'WOODEN_FENCE_FALLEN'); put(2, 9, 'SNOWY_TREE_STUMP'); put(1, 8, 'SMALL_ROCKS_1'); put(2, 8, 'STICK');
        },
    }),
    ...buildingSet('SNOWY', {
        base: { scatterPool: SNOWY_DECOR, scatterChance: 0.3, fenceBreak: 0.18 },
        house: [[2, 5, 'SNOWY_TREE_STUMP'], [5, 5, 'BARREL']],
        cottage: [[2, 5, 'SACKS'], [5, 5, 'SNOWY_TREE_STUMP']],
        farmhouse: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'SACKS']],
        hut: [[2, 5, 'SMALL_ROCKS_1'], [4, 5, 'SMALL_ROCKS_2'], [5, 5, 'SNOWY_TREE_STUMP']],
        stone: [[2, 5, 'CRATE'], [5, 5, 'SNOWY_TREE_STUMP']],
        smithy: [[2, 5, 'BARREL'], [4, 5, 'SMALL_ROCKS_1'], [5, 5, 'CRATE']],
        workshop: [[2, 5, 'BARREL'], [4, 5, 'CRATE'], [5, 5, 'CRATE_SACK']],
        sides: {
            ABANDONED_HOUSE: [[[2, 5, 'SNOWY_TREE_STUMP'], [5, 5, 'BARREL']], [[2, 5, 'SACKS'], [4, 5, 'SMALL_ROCKS_3']]],
            ABANDONED_STONE_HOUSE: [[[2, 5, 'CRATE'], [5, 5, 'SNOWY_TREE_STUMP']], [[2, 5, 'BARREL'], [5, 5, 'SMALL_ROCKS_2']]],
            ABANDONED_SMITHY: [[[2, 5, 'BARREL'], [5, 5, 'CRATE']], [[2, 5, 'SMALL_ROCKS_1'], [4, 5, 'SNOWY_TREE_STUMP']]],
            ABANDONED_WORKSHOP: [[[2, 5, 'CRATE'], [5, 5, 'CRATE_SACK']], [[2, 5, 'BARREL'], [5, 5, 'SACKS']]],
        },
    }),
});

const PLAINS_VILLAGE = STRUCTURES.ABANDONED_VILLAGE;
const CACTI = [{ id: 'SMALL_CACTUS_1', weight: 2 }, { id: 'MEDIUM_CACTUS_1', weight: 1 }];
const SNOWY_TREES = PLAINS_VILLAGE.trees.biomes.SNOWY_MOUNTAINS;
const DESERT_PROPS = ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SAND_DUNE_1', 'SAND_DUNE_2', 'DESERT_SKULL', 'BONE_PILE', 'BARREL', 'CRATE'];
const SNOWY_PROPS = PLAINS_VILLAGE.streetProps.biomes.SNOWY_MOUNTAINS;

STRUCTURES.ABANDONED_VILLAGE_DESERT = {
    ...PLAINS_VILLAGE,
    centerPrefab: 'ABANDONED_CENTER_DESERT',
    modules: [
        ...villageModules('DESERT'),
        { prefab: 'ABANDONED_CROP_FIELD_ALOE', weight: 1 },
        { prefab: 'ABANDONED_WORKSHOP_DESERT', weight: 1.5, required: true, max: 1 },
    ],
    trees: {
        ...PLAINS_VILLAGE.trees,
        chance: 0.05,                                 // a cactus is not a tree: the desert village is open
        max: 160,
        pool: CACTI,
        biomes: { PLAINS: PLAINS_VILLAGE.trees.pool, SNOWY_MOUNTAINS: SNOWY_TREES, DESERT: CACTI },
    },
    streetProps: {
        ...PLAINS_VILLAGE.streetProps,
        pool: DESERT_PROPS,
        biomes: { PLAINS: PLAINS_VILLAGE.streetProps.pool, SNOWY_MOUNTAINS: SNOWY_PROPS, DESERT: DESERT_PROPS },
    },
};

/* =============================================================================================================
   GRAVEYARDS
   A small landmark in every exterior biome (the biomes' `landmarks` in biomeDefinitions.js say how often and which one): 3 to 5 gravestones strewn at
   random inside a 7 x 7 box, with bones, small rocks and boulders lying beside them. `graveyard` is read by WorldManager._graveyardObjects:
     stones         { min, max }   how many gravestones
     encounterChance               the chance that ONE of them is the OLD_GRAVESTONE (the others are plain TOMBSTONEs)
     bones / rocks / boulders      what lies beside the stones (a pool of object ids, `chance` = per free cell touching a stone)
     boulderMax                    a graveyard has at most this many boulders (a boulder is never straight beside a stone, so every grave can be reached)
   The box is written like any prefab: the natural trees and rocks inside it are cleared, the ground stays as it is.
   ============================================================================================================= */

function graveyard(spec) {
    const N = 7;
    return {
        type: 'PREFAB',
        width: N,
        height: N,
        terrain: grid(N, N),
        objects: grid(N, N),
        graveyard: {
            stones: { min: 3, max: 5 },
            encounterChance: 0.5,
            stone: 'TOMBSTONE',
            encounterStone: 'OLD_GRAVESTONE',
            boulderMax: 3,
            ...spec,
        },
    };
}

Object.assign(STRUCTURES, {
    GRAVEYARD: graveyard({
        bones: { chance: 0.30, pool: ['BONE_PILE'] },
        rocks: { chance: 0.30, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
        boulders: { chance: 0.25, pool: ['BOULDER_1', 'BOULDER_2'] },
    }),
    GRAVEYARD_DESERT: graveyard({
        bones: { chance: 0.40, pool: ['BONE_PILE', 'DESERT_SKULL'] },
        rocks: { chance: 0.30, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
        boulders: { chance: 0.25, pool: ['BOULDER_1', 'BOULDER_2'] },
    }),
    GRAVEYARD_SNOWY: graveyard({
        bones: { chance: 0.30, pool: ['BONE_PILE'] },
        rocks: { chance: 0.30, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
        boulders: { chance: 0.25, pool: ['SNOWY_BOULDER_1', 'SNOWY_BOULDER_2'] },
    }),
});

STRUCTURES.ABANDONED_VILLAGE_SNOWY = {
    ...PLAINS_VILLAGE,
    centerPrefab: 'ABANDONED_CENTER_SNOWY',
    modules: [
        ...villageModules('SNOWY'),
        { prefab: 'ABANDONED_WORKSHOP_SNOWY', weight: 1.5, required: true, max: 1 },     // no crop fields: the ground is frozen
    ],
    trees: {
        ...PLAINS_VILLAGE.trees,
        pool: SNOWY_TREES,
        biomes: { PLAINS: PLAINS_VILLAGE.trees.pool, SNOWY_MOUNTAINS: SNOWY_TREES, DESERT: [] },
    },
    streetProps: {
        ...PLAINS_VILLAGE.streetProps,
        pool: SNOWY_PROPS,
        biomes: { PLAINS: PLAINS_VILLAGE.streetProps.pool, SNOWY_MOUNTAINS: SNOWY_PROPS, DESERT: PLAINS_VILLAGE.streetProps.biomes.DESERT },
    },
};

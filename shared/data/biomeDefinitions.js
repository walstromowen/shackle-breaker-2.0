import { CONFIG } from './constants.js';
/* Terrain levels (kept in this file so there is one file less to copy; used by terrainGenerator.js and worldManager.js). LAYER_0 water, LAYER_1 dirt, LAYER_2 ground, LAYER_3 .. LAYER_<TOP_LAYER> the plateau (cliff) levels, one above the other.
   Change TOP_LAYER to make hills taller or shorter (the renderer, the stairs and the walk rules all follow it).
   LAYER_6 / LAYER_7 are added to CONFIG here when constants.js does not list them yet; if you register them there yourself, keep the ids
   consecutive (LAYER_n = LAYER_0 + n; the stair and slope code does `id - 1`) and give each a TILE_DEPTH one higher than the layer below. */
export const TOP_LAYER = 7;
export const FIRST_PLATEAU = 3;
for (let i = 0; i <= TOP_LAYER; i++) {
    const k = 'LAYER_' + i;
    if (CONFIG.TILE_TYPES[k] === undefined) {
        // not listed in constants.js: the id right after the layer below (and a depth one higher)
        const below = CONFIG.TILE_TYPES['LAYER_' + (i - 1)];
        const id = below + 1;
        if (Object.values(CONFIG.TILE_TYPES).includes(id)) console.error(`terrainLevels: ${k} needs id ${id}, which another TILE_TYPES entry already uses. Add LAYER_6 and LAYER_7 to TILE_TYPES / TILE_DEPTH in constants.js with free, consecutive ids.`);
        CONFIG.TILE_TYPES[k] = id;
        CONFIG.TILE_DEPTH[id] = (CONFIG.TILE_DEPTH[below] !== undefined ? CONFIG.TILE_DEPTH[below] : i - 1) + 1;
    } else if (CONFIG.TILE_DEPTH[CONFIG.TILE_TYPES[k]] === undefined) CONFIG.TILE_DEPTH[CONFIG.TILE_TYPES[k]] = i;
}
const _index = new Map();
for (let i = 0; i <= TOP_LAYER; i++) _index.set(CONFIG.TILE_TYPES['LAYER_' + i], i);
/** 0..TOP_LAYER for a LAYER_n tile id, -1 for anything else. */
export const layerIndex = (id) => { const v = _index.get(id); return v === undefined ? -1 : v; };
/** True for the plateau levels (LAYER_3 and up): the tiles that have a rock face and a top. */
export const isPlateau = (id) => { const v = _index.get(id); return v !== undefined && v >= FIRST_PLATEAU; };
/** How many cliff levels the tile is on: 0 for ground, water and dirt, 1 for LAYER_3 ... TOP_LAYER - 2 for the top level. */
export const cliffLevel = (id) => { const v = _index.get(id); return v !== undefined && v >= FIRST_PLATEAU ? v - FIRST_PLATEAU + 1 : 0; };
export const CLIFF_LEVELS = TOP_LAYER - FIRST_PLATEAU + 1;
/* Hill shaping (see TerrainGenerator.getHillValue). `hill` is a smooth, low-frequency value in about [-1, 1] (above 0.2 for ~30% of the map,
   above 0.7 for ~5%, above 1.0 almost never). Each tier is a smooth step on that value that lifts the land by one level, so the outline of a hill
   follows a contour of the hill field: big, curving, natural. Ponds are filled in on and around a hill (a cliff never drops straight into a pond). */
const _step = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/* Canyon: `c` is the distance to the winding canyon line (0 on it, ~0.025 per cell). Walls: cut the hill away where c < 0.07 (a gorge ~6 cells
   wide); floor: a dirt bed along the middle (c < 0.025), only where there is a hill for it to run through. */
const _cut = (c) => 1 - _step(c, 0.06, 0.075);
const _bed = (c, hill) => (1 - _step(c, 0.028, 0.04)) * _step(hill, 0.0, 0.3);
const HILL_TIERS = { plains: [0.12, 0.7, 1.2], desert: [1.5], snowy: [-0.25, 0.0, 0.24, 0.46, 0.66] };
/* Snowy mountains: 5 tiers, one per plateau level (LAYER_3 .. LAYER_7), each lifting the land by a quarter of the elevation scale so the tiers land
   in the middle of the GLOBAL_ELEVATION_MAP bands. The tiers are read on the massif field (TerrainGenerator.getMassifValue, about [-1.3, 1.3]),
   not the ridge-and-ring hill field. Move a tier down to make that level more common, up to make it rarer. */
const _lift = (hill, tiers, k = 0.27, w = 0.06) => tiers.reduce((sum, t) => sum + k * _step(hill, t, t + w), 0);
export const BIOME_DEFINITIONS = {
    PLAINS: {
        id: 'PLAINS',
        defaultLootTable: 'plains',
        blobTileset: {
            primaryFloor: 'plainsPrimaryFloor',
            secondaryFloor: 'plainsSecondaryFloor',
            secondaryOnLevel: 'plainsSecondaryOnLevel',
            cliffFloor: 'plainsCliffFloor',
            cliffWall: 'plainsCliffWall',
            cliffExt: 'plainsCliffExt',
            cliffShadow: 'plainsCliffShadow',
            cliffStairs: 'plainsCliffStairs',
            waterAnim: 'plainsWaterAnim',
            waterInterior: 'plainsWaterInterior',
            levelDirt: null /* dirt only generates on the lower (ground) level, never on the tops of cliffs */,
        },
        objectSheetId: 'plainsMapObjects',
        allowedWeather: ['rain', 'fog'],
        music: { day: 'plainsBgmDay', night: 'plainsBgmNight', battle: 'plainsBattleBgm' },
        battleBackgrounds: { day: 'plainsBattleDayBg', dusk: 'plainsBattleDuskBg', night: 'plainsBattleNightBg' },
        shapeElevation: (noise, hill = 0, c = 1) => {
            /* Plains: lakes keep their shape, the rest of the ground is flattened and carried up in tiers by the hill field (large hills with cliffs). */
            let ground = noise < 0 ? noise * (1 - _step(hill, 0.0, 0.14)) : Math.min(noise, 0.5) * 0.4;
            ground += (-0.22 - ground) * _bed(c, hill);
            return Math.min(0.99, ground + _lift(hill - 3 * _cut(c), HILL_TIERS.plains)); /* capped: plains hills stop at LAYER_5 */
        },
        structures: { rate: 0.1, pools: [{ chance: 1.0, id: 'ABANDONED_VILLAGE' }] },
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_3]: [
                /* Spawns on Layer 3 only when the noise threshold is 0.50 or higher */
                {
                    chance: 0.8,
                    rangeStart: 0.5,
                    id: 'STRANGE_OBELISK',
                },
                { chance: 0.015, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
            ],
            [CONFIG.TILE_TYPES.LAYER_2]: [
                { chance: 0.02, pool: ['HEALING_HERB', 'INVIGORATING_HERB', 'ILLUMINATING_HERB'] },
                { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 },
                { chance: 0.044, id: 'PINE_TREE' },
                { chance: 0.04, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.2, rangeStart: 0.1, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] },
                { chance: 0.7, rangeStart: 0.3, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] },
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [{ chance: 0.05, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
            _WALLS: [
                { chance: 0.05, id: 'PINE_TREE' },
                { chance: 0.035, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.3, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] },
            ],
        },
        encounters: {
            rate: 0.01,
            type: 'time_weighted',
            pools: [
                { weight: 10, id: 'wild_hunt', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 10, id: 'wounded_mutt', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 20, id: 'a_disturbing_sight', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 20, id: 'suspicious_merchant', allowedTimes: ['day', 'dusk', 'night'] },
            ],
        },
        battles: { rate: 0.01, tables: { day: 'plains_battles_day', dusk: 'plains_battles_day', night: 'plains_battles_night' } },
    },
    DESERT: {
        id: 'DESERT',
        defaultLootTable: 'desert',
        blobTileset: {
            primaryFloor: 'desertPrimaryFloor',
            secondaryFloor: 'desertSecondaryFloor',
            secondaryOnLevel: 'desertSecondaryOnLevel',
            cliffFloor: 'desertCliffFloor',
            cliffWall: 'desertCliffWall',
            cliffExt: 'desertCliffExt',
            cliffShadow: 'desertCliffShadow',
            cliffStairs: 'desertCliffStairs',
            waterAnim: 'desertWaterAnim',
            waterInterior: 'desertWaterInterior',
            levelDirt: null /* dirt only generates on the lower (ground) level, never on the tops of cliffs */,
        },
        allowedWeather: ['sandstorm'],
        objectSheetId: 'desertMapObjects',
        music: { day: 'desertBgmDay', night: 'desertBgmNight', battle: 'desertBattleBgm' },
        battleBackgrounds: { day: 'desertBattleDayBg', dusk: 'desertBattleDuskBg', night: 'desertBattleNightBg' },
        shapeElevation: (noise, hill = 0, c = 1) => {
            /* Desert: flat dunes; plateaus (mesas, one level high, flat-topped) only stand where the hill field is very high, so they are rare. */
            let ground = noise < -0.2 ? noise * (1 - _step(hill, 0.5, 0.7)) + 0.05 * _step(hill, 0.5, 0.7) : 0.05 + noise * 0.1;
            ground += (-0.22 - ground) * _bed(c, hill - 0.3);
            return ground + _lift(hill - 3 * _cut(c), HILL_TIERS.desert);
        },
        structures: { rate: 0.0, pools: [] },
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_3]: [{ chance: 0.05, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
            [CONFIG.TILE_TYPES.LAYER_2]: [
                { chance: 0.001, id: 'DESERT_SKULL' },
                { chance: 0.04, id: 'SMALL_CACTUS_1' },
                { chance: 0.05, id: 'SMALL_CACTUS_2' },
                { chance: 0.10, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.5, rangeStart: 0.3, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] },
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [{ chance: 0.10, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
            _WALLS: [
                { chance: 0.03, id: 'SMALL_CACTUS_1' },
                { chance: 0.04, id: 'SMALL_CACTUS_2' },
                { chance: 0.07, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.5, rangeStart: 0.3, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] },
            ],
        },
        encounters: { rate: 0.005, type: 'time_weighted', pools: [{ weight: 100, id: 'suspicious_merchant', allowedTimes: ['day'] }] },
        battles: { rate: 0.01, tables: { day: 'desert_battles_day', dusk: 'desert_battles_day', night: 'desert_battles_night' } },
    },
    SNOWY_MOUNTAINS: {
        id: 'SNOWY_MOUNTAINS',
        plateauWidth: 4 /* every step of a mountain is at least 4 cells wide (default 2): a ledge can be walked and a stair fits on it */,
        hillField: 'massif' /* broad domes (see TerrainGenerator.getMassifValue) instead of the ridge-and-ring hill field */,
        stairChance: 1.0 /* chance that a 32 x 32 block gets stairs (the default is 0.35) ... */,
        stairsPerBlock: 3 /* ... and how many at most (default 1): there are five levels to climb */,
        stairMargin: 4 /* cells kept free at the block edge (default 6): the pieces of two blocks stay 2 cells apart */,
        straight: { colW: 8, colA: 1, rowW: 6, rowA: 1 } /* longer straight cliffs than the default 5/2/4/1, so stairs fit on more edges */,
        defaultLootTable: 'plains',
        blobTileset: {
            primaryFloor: 'snowyMountainsPrimaryFloor',
            secondaryFloor: 'snowyMountainsSecondaryFloor',
            secondaryOnLevel: 'snowyMountainsSecondaryOnLevel',
            cliffFloor: 'snowyMountainsCliffFloor',
            cliffWall: 'snowyMountainsCliffWall',
            cliffExt: 'snowyMountainsCliffExt',
            cliffShadow: 'snowyMountainsCliffShadow',
            cliffStairs: 'snowyMountainsCliffStairs',
            waterAnim: 'snowyMountainsWaterAnim',
            waterInterior: 'snowyMountainsWaterInterior',
            levelDirt: null /* frozen dirt only on the lowest ground, never on the tops of the cliffs */,
        },
        objectSheetId: 'plainsMapObjects' /* placeholder: swap for a snowy object sheet when there is one */,
        allowedWeather: ['fog'] /* add 'snow' here once the weather exists */,
        music: { day: 'plainsBgmDay', night: 'plainsBgmNight', battle: 'plainsBattleBgm' } /* placeholders */,
        battleBackgrounds: { day: 'plainsBattleDayBg', dusk: 'plainsBattleDuskBg', night: 'plainsBattleNightBg' } /* placeholders */,
        shapeElevation: (noise, hill = 0, c = 1) => {
            /* Snowy mountains: frozen lakes keep their shape on the low ground; everywhere else the ground is nearly flat and the massif field
               carries it up through five tiers (LAYER_3 .. LAYER_7). Tall hills are frequent and very broad. */
            const H = hill; /* the massif field, see hillField below */
            let ground = noise < 0 ? noise * (1 - _step(H, -0.2, -0.05)) : 0.1 + Math.min(noise, 0.5) * 0.14;
            return ground + _lift(H, HILL_TIERS.snowy, 0.25, 0.07); /* no gorges: every terrace stays whole, so the mountain can be climbed */
        },
        structures: { rate: 0.0, pools: [] },
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_2]: [
                { chance: 0.05, id: 'SNOWY_PINE_TREE' },
                { chance: 0.05, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.02, pool: ['BOULDER_1', 'BOULDER_2'] },
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [{ chance: 0.06, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
            [CONFIG.TILE_TYPES.LAYER_3]: [
                { chance: 0.04, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.012, pool: ['BOULDER_1', 'BOULDER_2'] },
            ],
            _WALLS: [
                { chance: 0.04, id: 'SNOWY_PINE_TREE' },
                { chance: 0.05, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
            ],
        },
    },
    HOUSE_INTERIOR: {
        id: 'HOUSE_INTERIOR',
        defaultLootTable: 'house',
        blobTileset: {
            primaryFloor: 'houseInteriorPrimaryFloor',
            secondaryFloor: 'houseInteriorSecondaryFloor',
            secondaryOnLevel: 'houseInteriorSecondaryOnLevel',
            cliffFloor: 'houseInteriorCliffFloor',
            cliffWall: 'houseInteriorCliffWall',
            cliffExt: 'houseInteriorCliffExt',
            cliffShadow: 'houseInteriorCliffShadow',
            /* Interiors: no water (LAYER_0 is void), and the top of a wall (LAYER_3..5) is void too, so only the wall face shows. */
            water: false,
            shadows: false, /* the interior shadow sheet has the old layout: no cast shadows there (blobTerrainTables.js is for the new flat sheets) */
            voidColor: '#07080a',
            levelTop: 'void',
        },
        objectSheetId: 'houseInteriorMapObjects',
        allowedWeather: [],
        music: { day: 'houseInteriorBgmDay', night: 'houseInteriorBgmNight', battle: 'houseInteriorBattleBgm' },
        battleBackgrounds: { day: 'houseInteriorBg', dusk: 'houseInteriorBg', night: 'houseInteriorBg' },
        shapeElevation: (noise) => noise,
        structures: { rate: 0, pools: [] },
        mapObjects: { [CONFIG.TILE_TYPES.LAYER_2]: [], _WALLS: [] },
        encounters: { rate: 0, pools: [] },
        battles: { rate: 0, tables: null },
    },
};
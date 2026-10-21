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
/* Every biome below now reads the massif field (the snowy mountains' broad domes, about [-1.3, 1.3] with a few percent beyond: 36% of the land is above 0.3,
   12% above 0.9, 6% above 1.2), each with its own tiers: plains 3 (LAYER_3 .. LAYER_5), desert 2 (LAYER_3 .. LAYER_4, so a mesa is never higher), snowy 5. */
const HILL_TIERS = { plains: [0.3, 0.8, 1.25], desert: [0.3, 0.85], snowy: [-0.25, 0.0, 0.24, 0.46, 0.66] };
/* Snowy mountains: 5 tiers, one per plateau level (LAYER_3 .. LAYER_7), each lifting the land by a quarter of the elevation scale so the tiers land
   in the middle of the GLOBAL_ELEVATION_MAP bands. The tiers are read on the massif field (TerrainGenerator.getMassifValue, about [-1.3, 1.3]),
   not the ridge-and-ring hill field. Move a tier down to make that level more common, up to make it rarer. */
const _lift = (hill, tiers, k = 0.27, w = 0.06) => tiers.reduce((sum, t) => sum + k * _step(hill, t, t + w), 0);
export const BIOME_DEFINITIONS = {
    PLAINS: {
        id: 'PLAINS',
        plateauWidth: 4 /* as in the snowy mountains: every step of a hill is at least 4 cells wide (default 2) */,
        hillField: 'massif' /* broad domes (see TerrainGenerator.getMassifValue) instead of the ridge-and-ring hill field */,
        stairChance: 1.0 /* chance that a 32 x 32 block gets stairs (the default is 0.35) ... */,
        stairsPerBlock: 2 /* ... and how many at most (default 1): there are three levels to climb */,
        stairMargin: 4 /* cells kept free at the block edge (default 6) */,
        straight: { colW: 8, colA: 1, rowW: 6, rowA: 1 } /* long straight cliffs, as in the snowy mountains */,
        massifStretch: [1.6, 1.0] /* hills (and the canyon line) a little longer east-west */,
        gorge: 0.04 /* ravines cut cell by cell through the hills (narrower than the desert's) */,
        features: {
            rings: { chance: 0.3, wall: 1.4 } /* a few donut hills */,
            ridge: { wall: 0.8 } /* winding ridges */,
            crevice: { width: 0.06, freq: 0.03, warp: 12, maskLow: 0.15 } /* the odd crack */,
        } /* see TerrainGenerator._applyFeatures */,
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
        minimap: { grass: '#5b9448', dirt: '#8c6c47', water: '#3b73a6', rock: '#8f8b82', stair: '#f2e27a' } /* colours of the minimap (see MinimapRenderer): ground, dirt, water, the rock that the cliff levels turn into, and the walkable part of a stair */,
        allowedWeather: ['rain', 'fog'],
        music: { day: 'plainsBgmDay', night: 'plainsBgmNight', battle: 'plainsBattleBgm' },
        battleBackgrounds: { day: 'plainsBattleDayBg', dusk: 'plainsBattleDuskBg', night: 'plainsBattleNightBg' },
        shapeElevation: (noise, hill = 0, c = 1) => {
            /* Plains: like the snowy mountains the ground is nearly flat and the massif field carries it up in tiers, but there are only three of them
               (LAYER_3 .. LAYER_5) and they start higher, so the hills are lower and rarer. Lakes keep their shape on the low ground and are filled in
               where a hill stands, so a cliff never drops straight into a pond. No gorges: every terrace stays whole. */
            const t0 = HILL_TIERS.plains[0];
            let ground = noise < 0 ? noise * (1 - _step(hill, t0 - 0.12, t0 + 0.02)) : Math.min(noise, 0.5) * 0.4;
            ground += (-0.22 - ground) * _bed(c, hill - (t0 - 0.35)) * 0.8; /* dry ravine floor */
            return Math.min(0.99, ground + _lift(hill - 3 * _cut(c), HILL_TIERS.plains)); /* capped: plains hills stop at LAYER_5 */
        },
        structures: { rate: 0.1, pools: [{ chance: 1.0, id: 'ABANDONED_VILLAGE' }] },
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_3]: [
                { chance: 0.003, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
            ],
            [CONFIG.TILE_TYPES.LAYER_2]: [
                { chance: 0.004, pool: ['HEALING_HERB', 'INVIGORATING_HERB', 'ILLUMINATING_HERB'] },
                { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 },
                { chance: 0.044, id: 'PINE_TREE' },
                { chance: 0.008, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.012, id: 'STICK' } /* a little more common than before (was 0.008): 1.2% of the ground, and of every plateau top (this list is copied to them as _WALLS, see the loop at the bottom) */,
                { chance: 0.2, rangeStart: 0.128, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] },
                { chance: 0.206, rangeStart: 0.2, pool: ['BOULDER_1', 'BOULDER_2'] } /* grey boulders, 0.6% of the ground: their own band [0.2, 0.206), in the free gap between the tulips and the grass, so no other rule's share moves */,
                { chance: 0.211, rangeStart: 0.206, id: 'TIN_ORE_DEPOSIT' } /* tin: 0.5% of the ground, its own band [0.206, 0.211) in the same gap. Mined with a pickaxe */,
                { chance: 0.7, rangeStart: 0.3, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] },
                { chance: 0.1, id: 'CAVE_ENTRANCE' } /* a cave mouth painted into a straight south-facing cliff: the share of fitting cliff faces that get one (WorldManager._isCaveMouth). Keep this rule LAST in the LAYER_2 list */,
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [
                { chance: 0.01, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.04, rangeStart: 0.01, id: 'FLINT_ROCK' } /* flint: 3% of the dirt (the shores and the dry ravine floors), its own band [0.01, 0.04) so the rocks' share does not move. Walk over it to pick it up */,
            ],
        },
        encounters: {
            rate: 0.005,
            type: 'time_weighted',
            pools: [
                { weight: 10, id: 'aftermath', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 10, id: 'wild_hunt', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 10, id: 'wounded_mutt', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 20, id: 'a_disturbing_sight', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 20, id: 'suspicious_merchant', allowedTimes: ['day', 'dusk', 'night'] },
                { weight: 18, id: 'crimson_vigil', allowedTimes: ['dusk', 'night'], minAct: 2 },   // act 2 only
            ],
        },
        battles: { rate: 0.01, tables: { day: 'plains_battles_day', dusk: 'plains_battles_day', night: 'plains_battles_night', bloodMoon: 'plains_battles_blood_moon' } },
    },
    DESERT: {
        id: 'DESERT',
        plateauWidth: 4 /* as in the snowy mountains: every step is at least 4 cells wide, so the canyon walls come in broad terraces (default 2) */,
        hillField: 'massif' /* broad domes (see TerrainGenerator.getMassifValue) instead of the ridge-and-ring hill field */,
        massifStretch: [2.2, 1.0] /* the domes (and the canyon line) are stretched along x: the mesas are long, east-west */,
        gorge: 0.065 /* the canyon is cut cell by cell through the plateaus, so it stays one piece (see TerrainGenerator._getRawElevationLevel) */,
        features: {
            rings: { chance: 0.6, wall: 1.4 } /* donuts: a rock wall round a sunken basin, one gap */,
            ridge: { wall: 0.72 } /* winding ridges that bend back on themselves */,
            crevice: { width: 0.07, freq: 0.03, warp: 12, maskLow: 0.02 } /* narrow twisting cracks through the mesas */,
        } /* see TerrainGenerator._applyFeatures */,
        stairChance: 1.0 /* chance that a 32 x 32 block gets stairs (the default is 0.35) ... */,
        stairsPerBlock: 2 /* ... and how many at most (default 1) */,
        stairMargin: 4 /* cells kept free at the block edge (default 6) */,
        straight: { colW: 10, colA: 2, rowW: 6, rowA: 1 } /* long straight cliffs: the mesas have long, level edges */,
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
        minimap: { grass: '#d9bf7c', dirt: '#b4935a', water: '#3b8aa6', rock: '#9a7648', stair: '#c4562e' } /* colours of the minimap (see MinimapRenderer): ground, dirt, water, the rock that the cliff levels turn into, and the walkable part of a stair */,
        allowedWeather: ['sandstorm'],
        music: { day: 'desertBgmDay', night: 'desertBgmNight', battle: 'desertBattleBgm' },
        battleBackgrounds: { day: 'desertBattleDayBg', dusk: 'desertBattleDuskBg', night: 'desertBattleNightBg' },
        shapeElevation: (noise, hill = 0, c = 1) => {
            /* Desert: flat sand with large, long, low mesas. The massif field (stretched along x, see massifStretch) carries the land up in two tiers only
               (LAYER_3 and LAYER_4), so a mesa is never more than two levels high. Oases and dirt patches stay on the low ground and are filled in where
               a mesa stands. A winding canyon cuts through the mesas (gorge walls, see `gorge`) and runs on across the flats as a dry bed of dirt. */
            const t0 = HILL_TIERS.desert[0];
            const s = _step(hill, t0 - 0.12, t0 + 0.02);
            let ground = noise < -0.2 ? noise * (1 - s) + 0.05 * s : 0.05 + noise * 0.1;
            ground += (-0.22 - ground) * _bed(c, hill - (t0 - 0.35));
            return ground + _lift(hill - 4 * _cut(c), HILL_TIERS.desert);
        },
        structures: { rate: 0.0, pools: [] },
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_3]: [{ chance: 0.01, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
            [CONFIG.TILE_TYPES.LAYER_2]: [
                { chance: 0.001, id: 'DESERT_SKULL' },
                { chance: 0.04, id: 'MEDIUM_CACTUS_1' },
                { chance: 0.05, id: 'SMALL_CACTUS_1' },
                { chance: 0.02, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.258, rangeStart: 0.25, pool: ['BOULDER_1', 'BOULDER_2'] } /* grey boulders, 0.8% of the ground: band [0.25, 0.258), in the free gap before the dunes */,
                { chance: 0.274, rangeStart: 0.27, id: 'ALOE_PLANT' } /* aloe: 0.4% of the ground (the same as a herb on the plains), its own band [0.27, 0.274), in the free gap between the salt and the dunes. Walk over it to pick it up: it cures burns */,
                { chance: 0.262, rangeStart: 0.26, id: 'SALT_DEPOSIT' } /* salt: 0.2% of the ground (was 0.5%), its own band [0.26, 0.262), in the free gap before the dunes. Mined with a pickaxe */,
                { chance: 0.244, rangeStart: 0.24, id: 'BONE_PILE' } /* a pile of bones, 0.4% of the ground: walk over it or interact to pick up a bone. Its own band [0.24, 0.244), in the free gap between the cave mouths and the dunes, so no other rule's share moves */,
                { chance: 0.36, rangeStart: 0.3, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] } /* dunes: 6% of the ground (was 20%, band [0.3, 0.5)); the rest of that band is now empty */,
                { chance: 0.1, id: 'CAVE_ENTRANCE' } /* a cave mouth painted into a straight south-facing cliff: the share of fitting cliff faces that get one (WorldManager._isCaveMouth). Keep this rule LAST in the LAYER_2 list */,
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [{ chance: 0.02, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }],
        },
        encounters: { rate: 0.005, type: 'time_weighted', pools: [{ weight: 100, id: 'suspicious_merchant', allowedTimes: ['day'] }, { weight: 60, id: 'crimson_vigil', allowedTimes: ['dusk', 'night'], minAct: 2 }] },
        battles: { rate: 0.01, tables: { day: 'desert_battles_day', dusk: 'desert_battles_day', night: 'desert_battles_night', bloodMoon: 'desert_battles_blood_moon' } },
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
        minimap: { grass: '#e6eef3', dirt: '#9fa9b0', water: '#4a86b5', rock: '#8c969f', stair: '#e0a030' } /* colours of the minimap (see MinimapRenderer): ground, dirt, water, the rock that the cliff levels turn into, and the walkable part of a stair */,
        allowedWeather: ['fog', 'blizzard'],
        music: { day: 'snowyMountainsBgmDay', night: 'snowyMountainsBgmNight', battle: 'snowyMountainsBattleBgm' } /* the battle track is the snowy one; the overworld night track is still a placeholder (its line is commented out in main.js) */,
        battleBackgrounds: { day: 'snowyMountainsBattleDayBg', dusk: 'snowyMountainsBattleDuskBg', night: 'snowyMountainsBattleNightBg' },
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
                { chance: 0.01, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.02, pool: ['SNOWY_BOULDER_1', 'SNOWY_BOULDER_2'] },
                { chance: 0.01, id: 'STICK' } /* 1% of the ground and of every plateau top (this list is copied to them as _WALLS). Same sprite as the plains' stick */,
                { chance: 0.501, rangeStart: 0.5, id: 'ANIMAL_TRACKS' } /* rare: 0.1% of the ground (about one per chunk), its own band [0.5, 0.501), in a free gap so no other rule's share moves. Walk over it (or face it and interact) to start the Tracks In The Snow encounter */,
                { chance: 0.04, id: 'CAVE_ENTRANCE' } /* a cave mouth painted into a straight south-facing cliff: the share of fitting cliff faces that get one (WorldManager._isCaveMouth). Keep this rule LAST in the LAYER_2 list */,
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [
                { chance: 0.012, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.042, rangeStart: 0.012, id: 'FLINT_ROCK' } /* flint: 3% of the frozen dirt, its own band [0.012, 0.042). Walk over it to pick it up */,
            ],
            /* `_ALTITUDE`: rules for the plateau levels only (WorldManager._getRawProceduralId). Each rule has its OWN roll per cell and wins before the
               ordinary `_WALLS` list: { id, chance, minLevel, maxLevel } with the level a LAYER_n number (3 = the first cliff level, 7 = the summit).
               Iron lies bare on the high slopes. The strange obelisks stand on the summits only (LAYER_7), and nowhere else in the world: raise their
               chance for more of them. Keep new rules AFTER the existing ones: each rule's roll depends on its position in this list, so inserting one
               above would re-roll where the iron lies. */
            _ALTITUDE: [
                { id: 'IRON_ORE_DEPOSIT', chance: 0.01, minLevel: 5 },
                { id: 'STRANGE_OBELISK', chance: 0.003, minLevel: 7, maxLevel: 7 },
            ],
            [CONFIG.TILE_TYPES.LAYER_3]: [
                { chance: 0.008, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] },
                { chance: 0.012, pool: ['SNOWY_BOULDER_1', 'SNOWY_BOULDER_2'] },
            ],
        },
        battles: { rate: 0.005, tables: { day: 'snowy_mountains_battles_day', dusk: 'snowy_mountains_battles_day', night: 'snowy_mountains_battles_night', bloodMoon: 'snowy_mountains_battles_blood_moon' } } /* half the plains' / desert's 0.01 */,
        encounters: { rate: 0.003, type: 'time_weighted', pools: [{ weight: 100, id: 'crimson_vigil', allowedTimes: ['dusk', 'night'], minAct: 2 }] },   /* act 2 only: nothing roams the peaks before it */
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
            shadows: true, /* the house tileset has the overworld's shadow layout (cliff_blob47_shadow.png), so walls cast a soft shadow on the floor */
            voidColor: '#07080a',
            levelTop: 'void',
        },
        /* Dim indoor light (see CAVE_INTERIOR below for how ambientLight works): fireplaces, candelabras and candles cut through it. a: 0 = daylight .. 1 = pitch black. */
        ambientLight: { r: 14, g: 8, b: 18, a: 0.55 },
        allowedWeather: [],
        music: { day: 'plainsBgmDay', night: 'plainsBgmNight', battle: 'houseInteriorBattleBgm' } /* indoors the plains' own overworld tracks play, day and night (they carry on unbroken when a plains player walks in); the battle track is still the house's */,
        battleBackgrounds: { day: 'houseInteriorBg', dusk: 'houseInteriorBg', night: 'houseInteriorBg' },
        shapeElevation: (noise) => noise,
        structures: { rate: 0, pools: [] },
        mapObjects: { [CONFIG.TILE_TYPES.LAYER_2]: [], _WALLS: [] },
        encounters: { rate: 0, pools: [] },
        battles: { rate: 0, tables: null },
    },
    CAVE_INTERIOR: {
        id: 'CAVE_INTERIOR',
        defaultLootTable: 'cave' /* a loot table named 'cave', or change to 'house' / 'plains' if you have none yet */,
        blobTileset: {
            primaryFloor: 'caveInteriorPrimaryFloor',
            secondaryFloor: 'caveInteriorSecondaryFloor',
            secondaryOnLevel: 'caveInteriorSecondaryOnLevel',
            cliffFloor: 'caveInteriorCliffFloor',
            cliffWall: 'caveInteriorCliffWall',
            cliffExt: 'caveInteriorCliffExt',
            cliffShadow: 'plainsCliffShadow' /* the overworld's own shadow sheet, so cave shadows are always identical to the overworld's */,
            cliffStairs: 'caveInteriorCliffStairs',
            /* Caves: no water (LAYER_0 is void). Only the rim (LAYER_7) has a void top, so the ledges below it (LAYER_6 .. LAYER_3) show floor and a rock face,
               and every level further down is a little darker (depthShade). */
            water: false,
            voidColor: '#050407',
            voidFromLayer: 7,
            levelDirt: { scale: 7, threshold: 0.68 } /* patches of brown earth on the ledges */,
            depthShade: { from: 6, step: 0.1, max: 0.42, color: '2,1,10' },
        },
        /* Natural darkness: the biome is always at least this dark, whatever the time of day (see MapRenderer.naturalAmbient). r, g, b = the colour the dark
           takes (0..255; 0, 0, 0 is black, a cold blue is "night"), a = how dark (0 = none, 1 = pitch black, nothing is seen without a light; the day / night cycle is used instead whenever IT is darker).
           Lights (torches, a campfire, anything with a `light`) still cut through it. Leave `ambientLight` out for a biome that follows the clock. */
        ambientLight: { r: 0, g: 0, b: 0, a: 1 } /* pitch black: only lights show anything (try a: 0.85 and r, g, b: 6, 10, 28 for a dim blue dark) */,
        allowedWeather: [],
        music: { day: 'caveBgm', night: 'caveBgm', battle: 'caveBattleBgm' } /* the overworld tracks are still the house's placeholders; the battle track is the cave's own (caveBattleBgm, registered in main.js) */,
        battleBackgrounds: { day: 'caveBattleBg', dusk: 'caveBattleBg', night: 'caveBattleBg' } /* the same background at every hour: a cave has no daylight */,
        shapeElevation: (noise) => noise,
        structures: { rate: 0, pools: [] },
        mapObjects: { [CONFIG.TILE_TYPES.LAYER_2]: [] } /* the CaveGenerator places the rocks itself (see `scatter` in interiorDefinitions.js) */,
        encounters: { rate: 0, pools: [] },
        battles: { rate: 0.01, tables: { day: 'cave_battles', dusk: 'cave_battles', night: 'cave_battles' } } /* half the plains' / desert's 0.01; same table at every hour */,
    },
};

/* The tops of the cliff levels (LAYER_3 and up) spawn exactly the map objects the ground level (LAYER_2) does, in every biome: the `_WALLS` category the
   world manager asks for on a plateau is the biome's LAYER_2 list. To give a biome different objects on its plateaus, write its own `_WALLS` list
   in its mapObjects and this loop leaves it alone. */
for (const def of Object.values(BIOME_DEFINITIONS)) {
    const mo = def.mapObjects;
    if (mo && mo._WALLS === undefined) mo._WALLS = mo[CONFIG.TILE_TYPES.LAYER_2] || [];
}
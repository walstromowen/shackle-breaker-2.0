import { CONFIG } from './constants.js'; 

export const BIOME_DEFINITIONS = { 
    PLAINS: { 
        id: 'PLAINS', 
        defaultLootTable: 'plains', 
        sheetId: 'plains', 
        objectSheetId: 'plainsMapObjects', 
        allowedWeather: ['rain', 'fog'], 
        music: { 
            day: 'plainsBgmDay', 
            night: 'plainsBgmNight', 
            battle: 'plainsBattleBgm' 
        }, 
        battleBackgrounds: { 
            day: 'plainsBattleDayBg', 
            dusk: 'plainsBattleDuskBg', 
            night: 'plainsBattleNightBg' 
        }, 
        shapeElevation: (noise) => noise, 
        structures: { 
            rate: 0.10, 
            pools: [{ chance: 1.00, id: 'ABANDONED_VILLAGE' }] 
        }, 
        mapObjects: { 
            [CONFIG.TILE_TYPES.LAYER_3]: [ 
                { chance: 0.60, id: 'STRANGE_OBELISK' }, // Increased significantly to make it very common
                { chance: 0.040, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }
            ], 
            [CONFIG.TILE_TYPES.LAYER_2]: [ 
                { chance: 0.020, id: 'WILD_HERBS' }, 
                { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 }, 
                { chance: 0.044, id: 'PINE_TREE' }, 
                { chance: 0.192, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }, 
                { chance: 0.20, rangeStart: 0.10, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] }, 
                { chance: 0.70, rangeStart: 0.30, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] } 
            ], 
            [CONFIG.TILE_TYPES.LAYER_1]: [ 
                { chance: 0.330, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] } 
            ], 
            _WALLS: [ 
                { chance: 0.05, id: 'PINE_TREE' }, 
                { chance: 0.230, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }, 
                { chance: 0.30, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] } 
            ] 
        }, 
        encounters: { 
            rate: 0.01, 
            type: "time_weighted", 
            pools: [ 
                { weight: 10, id: 'wild_hunt', allowedTimes: ['day', 'dusk', 'night'] }, 
                { weight: 10, id: 'wounded_mutt', allowedTimes: ['day', 'dusk', 'night'] }, 
                { weight: 20, id: 'a_disturbing_sight', allowedTimes: ['day', 'dusk', 'night'] } , 
                { weight: 20, id: 'suspicious_merchant', allowedTimes: ['day', 'dusk', 'night'] } 
            ] 
        }, 
        battles: { 
            rate: 0.01, 
            tables: { 
                day: 'plains_battles_day', 
                dusk: 'plains_battles_day', 
                night: 'plains_battles_night' 
            } 
        } 
    }, 
    DESERT: { 
        id: 'DESERT', 
        defaultLootTable: 'desert', 
        sheetId: 'desert', 
        allowedWeather: ['sandstorm'], 
        objectSheetId: 'desertMapObjects', 
        music: { 
            day: 'desertBgmDay', 
            night: 'desertBgmNight', 
            battle: 'desertBattleBgm' 
        }, 
        battleBackgrounds: { 
            day: 'desertBattleDayBg', 
            dusk: 'desertBattleDuskBg', 
            night: 'desertBattleNightBg' 
        }, 
        shapeElevation: (noise) => { 
            if (noise < -0.20) { 
                return noise; 
            } else if (noise < 0.50) { 
                return 0.05 + (noise * 0.1); 
            } else { 
                return Math.min(0.65, 0.25 + ((noise - 0.50) * 10.0)); 
            } 
        }, 
        structures: { 
            rate: 0.0, 
            pools: [] 
        }, 
        mapObjects: { 
            [CONFIG.TILE_TYPES.LAYER_3]: [ 
                { chance: 0.030, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] } 
            ], 
            [CONFIG.TILE_TYPES.LAYER_2]: [ 
                { chance: 0.001, id: 'DESERT_SKULL' }, // Decreased from 0.015 to be significantly less common
                { chance: 0.040, id: 'SMALL_CACTUS_1' }, 
                { chance: 0.050, id: 'SMALL_CACTUS_2' }, 
                { chance: 0.065, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }, 
                { chance: 0.500, rangeStart: 0.30, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] } 
            ], 
            [CONFIG.TILE_TYPES.LAYER_1]: [ 
                { chance: 0.065, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] } 
            ], 
            _WALLS: [ 
                { chance: 0.030, id: 'SMALL_CACTUS_1' }, 
                { chance: 0.040, id: 'SMALL_CACTUS_2' }, 
                { chance: 0.045, pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'] }, 
                { chance: 0.500, rangeStart: 0.30, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] } 
            ] 
        }, 
        encounters: { 
            rate: 10.01, 
            type: "time_weighted", 
            pools: [ 
                { weight: 100, id: 'suspicious_merchant', allowedTimes: ['day'] }, 
            ] 
        }, 
        battles: { 
            rate: 0.01, 
            tables: { 
                day: 'desert_battles_day', 
                dusk: 'desert_battles_day', 
                night: 'desert_battles_night' 
            } 
        } 
    }, 
    HOUSE_INTERIOR: { 
        id: 'HOUSE_INTERIOR', 
        defaultLootTable: 'house', 
        sheetId: 'houseInterior', 
        objectSheetId: 'houseInteriorMapObjects', 
        allowedWeather: [], 
        music: { 
            day: 'houseInteriorBgmDay', 
            night: 'houseInteriorBgmNight', 
            battle: 'houseInteriorBattleBgm' 
        }, 
        battleBackgrounds: { 
            day: 'houseInteriorBg', 
            dusk: 'houseInteriorBg', 
            night: 'houseInteriorBg' 
        }, 
        shapeElevation: (noise) => noise, 
        structures: { 
            rate: 0, 
            pools: [] 
        }, 
        mapObjects: { 
            [CONFIG.TILE_TYPES.LAYER_2]: [], 
            _WALLS: [] 
        }, 
        encounters: { 
            rate: 0, 
            pools: [] 
        }, 
        battles: { 
            rate: 0, 
            tables: null 
        } 
    } 
};
import { CONFIG } from './constants.js';

export const BIOME_DEFINITIONS = {
    PLAINS: {
        id: 'PLAINS',
        sheetId: 'plains',                 // Terrain tileset
        objectSheetId: 'plainsMapObjects', // Map objects tileset (Trees, rocks, etc.)
        elevationMap: [
            { threshold: -0.30, tile: CONFIG.TILE_TYPES.LAYER_0 },
            { threshold: -0.15, tile: CONFIG.TILE_TYPES.LAYER_1 },
            { threshold: 0.25,  tile: CONFIG.TILE_TYPES.LAYER_2 },
            { threshold: 0.50,  tile: CONFIG.TILE_TYPES.LAYER_3 },
            { threshold: 0.75,  tile: CONFIG.TILE_TYPES.LAYER_4 },
            { threshold: 1.0,   tile: CONFIG.TILE_TYPES.LAYER_5 }
        ],
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_2]: [ 
                { chance: 0.001, id: 'WOODEN_CHEST' },
                { chance: 0.004, id: 'CAMPFIRE' },
                { chance: 0.004, id: 'SMALL_HOUSE_1', footprint: 4 },
                { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 },
                { chance: 0.044, id: 'PINE_TREE' },
                { chance: 0.074, id: 'SMALL_ROCKS_1' },
                { chance: 0.20,  rangeStart: 0.10, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] },
                { chance: 0.50,  rangeStart: 0.30, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] }
            ],
            [CONFIG.TILE_TYPES.LAYER_1]: [ 
                { chance: 0.15, id: 'SMALL_ROCKS_1' } 
            ],
            _WALLS: [
                { chance: 0.05, id: 'PINE_TREE' },
                { chance: 0.10, id: 'SMALL_ROCKS_1' },
                { chance: 0.30, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] }
            ]
        },
        battles: {
            rate: 0.05,
            pools: [
                { chance: 0.50, enemies: ['WOLF', 'WOLF'] },           
                { chance: 0.30, enemies: ['WOLF', 'WOLF', 'WOLF'] },   
                { chance: 0.20, enemies: ['LEGIONARY', 'LEGIONARY'] }  
            ]
        }
    },
    
    DESERT: {
        id: 'DESERT',
        sheetId: 'desert',                 // Terrain tileset
        objectSheetId: 'desertMapObjects', // Map objects tileset
        elevationMap: [
            { threshold: -0.40, tile: CONFIG.TILE_TYPES.LAYER_0 },
            { threshold: -0.30, tile: CONFIG.TILE_TYPES.LAYER_1 },
            { threshold: 0.40,  tile: CONFIG.TILE_TYPES.LAYER_2 },
            { threshold: 0.70,  tile: CONFIG.TILE_TYPES.LAYER_4 },
            { threshold: 1.0,   tile: CONFIG.TILE_TYPES.LAYER_5 }  
        ],
        mapObjects: {
            [CONFIG.TILE_TYPES.LAYER_2]: [ 
                { chance: 0.002, id: 'WOODEN_CHEST' },
                { chance: 0.15,  id: 'SMALL_ROCKS_1' }
            ],
            _WALLS: [
                { chance: 0.05, id: 'SMALL_ROCKS_1' }
            ]
        },
        battles: {
            rate: 0.03,
            pools: [
                { chance: 0.50, enemies: ['WOLF', 'WOLF'] },           
                { chance: 0.30, enemies: ['WOLF', 'WOLF', 'WOLF'] },   
                { chance: 0.20, enemies: ['LEGIONARY', 'LEGIONARY'] }  
            ]
        }
    }
};
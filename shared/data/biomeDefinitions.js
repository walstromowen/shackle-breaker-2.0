import { CONFIG } from './constants.js';

export const BIOME_DEFINITIONS = {
    PLAINS: {
        id: 'PLAINS',
        sheetId: 'plains',                 // Terrain tileset
        objectSheetId: 'plainsMapObjects', // Map objects tileset (Trees, rocks, etc.)
        allowedWeather: ['rain', 'fog'],
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
            rate: 0.005,
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
        allowedWeather: ['sandstorm'],
        objectSheetId: 'desertMapObjects', // Map objects tileset
        // Ensure BOTH PLAINS and DESERT share the exact same threshold numbers!
        elevationMap: [
            { threshold: -0.30, tile: CONFIG.TILE_TYPES.LAYER_0 }, // Water
            { threshold: -0.15, tile: CONFIG.TILE_TYPES.LAYER_1 }, // Dirt / Transition
            { threshold: 0.40,  tile: CONFIG.TILE_TYPES.LAYER_2 }, // Main Surface (Grass/Sand)
            { threshold: 0.65,  tile: CONFIG.TILE_TYPES.LAYER_3 }, // Lower Cliff
            { threshold: 0.85,  tile: CONFIG.TILE_TYPES.LAYER_4 }, // Mid Cliff
            { threshold: 1.0,   tile: CONFIG.TILE_TYPES.LAYER_5 }  // High Peak
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
            rate: 0.003,
            pools: [
                { chance: 0.50, enemies: ['WOLF', 'WOLF'] },           
                { chance: 0.30, enemies: ['WOLF', 'WOLF', 'WOLF'] },   
                { chance: 0.20, enemies: ['LEGIONARY', 'LEGIONARY'] }  
            ]
        }
    }
};
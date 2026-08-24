// src/data/interiorDefinitions.js
export const INTERIOR_DEFINITIONS = {
    ABANDONED_HOUSE: {
        generatorType: 'HOUSE',
        floorTile: 'LAYER_2', // Wooden floor
        wallTile: 'LAYER_3',  // Wooden wall
        doorObject: 'HOUSE_EXIT_DOOR',
        lootObject: 'WOODEN_CHEST'
    },
    ABANDONED_BLACKSMITH: {
        generatorType: 'CRAFTING_HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        craftingStation: 'FORGE'
    },
    ABANDONED_CARPENTER: {
        generatorType: 'CRAFTING_HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        craftingStation: 'CARPENTERS_BENCH'
    },
    ABANDONED_MASON: {
        generatorType: 'CRAFTING_HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        craftingStation: 'STONE_BANKER'
    },
    ABANDONED_TAILOR: {
        generatorType: 'CRAFTING_HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        craftingStation: 'TAILORS_BENCH'
    },
    CAVE: {
        generatorType: 'CAVE',
        floorTile: 'LAYER_1', // Dirt floor
        wallTile: 'LAYER_5',  // Stone wall
        roughness: 0.45,      // For future cellular automata tuning
        doorObject: 'CAVE_EXIT_DOOR',
        lootObject: 'SMALL_ROCKS_1'
    }
};
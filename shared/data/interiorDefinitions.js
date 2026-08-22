// src/data/interiorDefinitions.js

export const INTERIOR_DEFINITIONS = {
    ABANDONED_HOUSE: {
        generatorType: 'HOUSE',
        floorTile: 'LAYER_2', // Wooden floor
        wallTile: 'LAYER_3',  // Wooden wall
        doorObject: 'HOUSE_EXIT_DOOR',
        lootObject: 'WOODEN_CHEST'
    },
    CAVE: {
        generatorType: 'CAVE',
        floorTile: 'LAYER_1', // Dirt floor
        wallTile: 'LAYER_5',  // Stone wall
        roughness: 0.45,      // For future cellular automata tuning
        doorObject: 'CAVE_EXIT_DOOR',
        lootObject: 'SMALL_ROCKS_1' // Or whatever cave loot you prefer
    }
};
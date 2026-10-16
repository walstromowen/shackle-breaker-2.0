// src/data/interiorDefinitions.js
export const INTERIOR_DEFINITIONS = {
    // The plain house door (HOUSE_DOOR_WOODEN) and the warp's own default both ask for HOUSE_INTERIOR:
    HOUSE_INTERIOR: {
        generatorType: 'HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        lootObject: 'WOODEN_CHEST'
    },
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

        // Objects on the open ground of the cave (see CaveGenerator._scatter). Each rule has its own chance per cell (0.01 = 1 %). The first rule that hits a cell wins.
        // `ground: true` = drawn on the floor, never blocks a step, so it may lie anywhere the player can walk; anything else is solid and
        // only goes where every neighbouring cell is open and no other solid object is next to it. `pool` picks one of the ids at random.
        scatter: [
            { id: 'WOODEN_CHEST', chance: 0.0015 },                                              // rare: about 1 or 2 per cave
            { pool: ['BOULDER_1', 'BOULDER_2'], chance: 0.012 },                                  // solid grey boulders, about 12 per cave
            { id: 'BONE_PILE', chance: 0.012, ground: true },                                     // about 30 per cave
            { pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'], chance: 0.04, ground: true }  // loose stones (pick-up), about 80 per cave
        ],

        // The bottom of the deepest room: an iron chest in the middle of a 5 x 5 square with a standing torch on each corner (offsets from the chest's cell).
        // The whole square is kept clear of other objects.
        depthObjects: [
            { id: 'IRON_CHEST', dx: 0, dy: 0 },
            { id: 'STANDING_TORCH', dx: -2, dy: -2 },
            { id: 'STANDING_TORCH', dx: 2, dy: -2 },
            { id: 'STANDING_TORCH', dx: -2, dy: 2 },
            { id: 'STANDING_TORCH', dx: 2, dy: 2 }
        ]
    }
};
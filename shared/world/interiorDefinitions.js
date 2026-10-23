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
    // The village's one workshop: every crafting station stands in a row against the north wall, in this order (left to right)
    ABANDONED_WORKSHOP: {
        generatorType: 'CRAFTING_HOUSE',
        floorTile: 'LAYER_2',
        wallTile: 'LAYER_3',
        doorObject: 'HOUSE_EXIT_DOOR',
        craftingStations: ['ANVIL', 'FORGE', 'CARPENTERS_BENCH', 'STONE_BANKER', 'TAILORS_BENCH']
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
            // ORE (solid, mined with a pickaxe). `above` = levels above the cave floor: iron only on the floor and the first ledge, the others anywhere
            { id: 'IRON_ORE_DEPOSIT', chance: 0.004, above: { max: 1 } },                         // the rarest: only deep down
            { id: 'COPPER_ORE_DEPOSIT', chance: 0.006 },
            { id: 'COAL_DEPOSIT', chance: 0.010 },                                                // the most common
            { pool: ['BOULDER_1', 'BOULDER_2'], chance: 0.012 },                                  // solid grey boulders, about 12 per cave
            { id: 'BONE_PILE', chance: 0.012, ground: true },                                     // about 30 per cave
            { pool: ['SMALL_ROCKS_1', 'SMALL_ROCKS_2', 'SMALL_ROCKS_3'], chance: 0.04, ground: true }  // loose stones (pick-up), about 80 per cave
        ],

        // The bottom of the deepest room: an iron chest flanked by a standing torch on each side, two cells away from it (offsets from the chest's cell).
        // The row of five cells they span is kept clear of other objects.
        depthObjects: [
            { id: 'IRON_CHEST', dx: 0, dy: 0 },
            { id: 'STANDING_TORCH', dx: -2, dy: 0 },
            { id: 'STANDING_TORCH', dx: 2, dy: 0 }
        ],

        // Other things that can lie at the bottom instead (CaveGenerator._placeDepth): each cave rolls once per entry, from its own seed, so a cave is always the same.
        // The first that hits replaces `depthObjects`: here the mysterious altar in about 1 cave in 2 (0.5), with a standing torch on each corner of a 5 x 5 square around it (four in all).
        // A multi-cell entry gives `w` and `h`; (dx, dy) is then its bottom-left cell. The altar is 3 x 3, centred on the middle of the square.
        depthAlternatives: [
            {
                chance: 0.5,
                objects: [
                    { id: 'MYSTERIOUS_ALTAR', dx: -1, dy: 1, w: 3, h: 3 },
                    { id: 'STANDING_TORCH', dx: -2, dy: -2 },
                    { id: 'STANDING_TORCH', dx: 2, dy: -2 },
                    { id: 'STANDING_TORCH', dx: -2, dy: 2 },
                    { id: 'STANDING_TORCH', dx: 2, dy: 2 }
                ]
            }
        ]
    }
};
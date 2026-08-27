export const STRUCTURES = {
    // ==========================================
    // SUPER STRUCTURE (The Blueprint)
    // ==========================================
    ABANDONED_VILLAGE: {
        type: 'BLUEPRINT',
        centerPrefab: 'ABANDONED_CENTER',
        pathTile: 1,
        branchChance: 0.8,
        branchLength: { min: 20, max: 35 },
        turnChance: 0.20,
        minStepsBetweenTurns: 5,
        modules: [
            { prefab: 'ABANDONED_HOUSE',      spacing: 6, offset: 1, spawnChance: 0.1 },
            { prefab: 'ABANDONED_STORAGE',    spacing: 6, offset: 1, spawnChance: 0.1 },
            
            // Crafting Station Variants
            { prefab: 'ABANDONED_BLACKSMITH', spacing: 6, offset: 1, spawnChance: 1.2 },
            { prefab: 'ABANDONED_CARPENTER',  spacing: 6, offset: 1, spawnChance: 0.2 },
            { prefab: 'ABANDONED_MASON',      spacing: 6, offset: 1, spawnChance: 0.2 },
            { prefab: 'ABANDONED_TAILOR',     spacing: 6, offset: 1, spawnChance: 0.2 }
        ]
    },

    // ==========================================
    // SUB-STRUCTURES (The Modular Pieces)
    // ==========================================
    ABANDONED_CENTER: {
        type: 'PREFAB',
        width: 7,
        height: 7,
        terrain: [
            [null, null, 2, 1, 2, null, null],
            [null, null,    2,    1,    2, null, null],
            [2,    2,    2,    1,    2,    2, 2],
            [1,    1,    1,    1,    1,    1, 1],
            [2,    2,    2,    1,    2,    2, 2],
            [null, null,    2,    1,    2, null, null],
            [null, null, 2, 1, 2, null, null],
        ],
        objects: [
            [null, null, null, null, null, null, null],
            [null, 'GRASS_COVERAGE_1', 'TREE_STUMP', null, 'SMALL_ROCKS_1', null, null],
            [null, null, null, null, null, null, null],
            [null, 'TULIPS_WHITE', null, 'CAMPFIRE', null, null, null],
            [null, null, null, null, null, null, null],
            [null, null, 'WOODEN_CHEST', null, 'TREE_STUMP', 'GRASS_COVERAGE_2', null],
            [null, null, null, null, null, null, null]
        ]
    },

    ABANDONED_HOUSE: {
        type: 'PREFAB',
        width: 8,
        height: 8,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, 'WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER', null],
            [null, 'WOODEN_FENCE_V', 'ABANDONED_HOUSE_1', 'HOUSE_DOOR_WOODEN', null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_2', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', null, null, null, 'GRASS_COVERAGE_1', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_BL_CORNER', 'WOODEN_FENCE_H', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', 'WOODEN_FENCE_H', 'WOODEN_FENCE_BR_CORNER', null],
            [null, null, null, null, null, null, null, null]
        ]
    },

    ABANDONED_STORAGE: {
        type: 'PREFAB',
        width: 8,
        height: 7,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, 'WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER', null],
            [null, 'WOODEN_FENCE_V', 'WOODEN_CHEST', 'GRASS_COVERAGE_1', 'WOODEN_CHEST', 'TULIPS_ORANGE', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'TULIPS_WHITE', 'TREE_STUMP', 'GRASS_COVERAGE_2', 'WOODEN_CHEST', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'SMALL_ROCKS_1', 'TULIPS_RED', 'SMALL_ROCKS_2', 'GRASS_COVERAGE_3', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_BL_CORNER', 'GRASS_COVERAGE_2', null, 'GRASS_COVERAGE_1', null, 'WOODEN_FENCE_BR_CORNER', null],
            [null, null, null, null, null, null, null, null]
        ]
    },

    // --- CRAFTING STATION HOUSES ---
    
    ABANDONED_BLACKSMITH: {
        type: 'PREFAB',
        width: 8,
        height: 8,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, 'WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', null, null],
            [null, 'WOODEN_FENCE_V', 'ABANDONED_HOUSE_2', 'BLACKSMITH_DOOR', null, null, null, null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'ANVIL', null, 'FORGE', null, null, null],
            [null, 'WOODEN_FENCE_V', null, null, null, 'GRASS_COVERAGE_1', null, null],
            [null, 'WOODEN_FENCE_BL_CORNER', 'WOODEN_FENCE_H', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', 'WOODEN_FENCE_H', null, null],
            [null, null, null, null, null, null, null, null]
        ]
    },

    ABANDONED_CARPENTER: {
        type: 'PREFAB',
        width: 8,
        height: 8,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, null, 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER', null],
            [null, null, 'ABANDONED_HOUSE_2', 'CARPENTER_DOOR', null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'TREE_STUMP', null, 'CARPENTERS_BENCH', null, 'WOODEN_FENCE_V', null],
            [null, null, null, null, null, 'GRASS_COVERAGE_2', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', 'WOODEN_FENCE_H', 'WOODEN_FENCE_BR_CORNER', null],
            [null, null, null, null, null, null, null, null]
        ]
    },

    ABANDONED_MASON: {
        type: 'PREFAB',
        width: 8,
        height: 8,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, 'WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', null, null, 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER', null],
            [null, 'WOODEN_FENCE_V', 'ABANDONED_HOUSE_2', 'MASON_DOOR', null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'SMALL_ROCKS_2', null, 'STONE_BANKER', 'SMALL_ROCKS_1', null, null],
            [null, 'WOODEN_FENCE_V', null, null, null, 'GRASS_COVERAGE_1', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_BL_CORNER', null, 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', null, 'WOODEN_FENCE_BR_CORNER', null],
            [null, null, null, null, null, null, null, null]
        ]
    },

    ABANDONED_TAILOR: {
        type: 'PREFAB',
        width: 8,
        height: 8,
        terrain: [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ],
        objects: [
            [null, null, null, null, null, null, null, null],
            [null, null, 'WOODEN_FENCE_H', null, 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER', null],
            [null, 'WOODEN_FENCE_V', 'ABANDONED_HOUSE_2', 'TAILOR_DOOR', null, null, null, null],
            [null, null, 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_V', 'GRASS_COVERAGE_2', null, 'TAILORS_BENCH', null, null, null],
            [null, 'WOODEN_FENCE_V', null, null, null, 'GRASS_COVERAGE_1', 'WOODEN_FENCE_V', null],
            [null, 'WOODEN_FENCE_BL_CORNER', 'WOODEN_FENCE_H', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', null, null, null],
            [null, null, null, null, null, null, null, null]
        ]
    }
};
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
            { prefab: 'ABANDONED_HOUSE',   spacing: 6, offset: 1, spawnChance: 0.6 },
            { prefab: 'ABANDONED_STORAGE', spacing: 6, offset: 1, spawnChance: 0.4 }
        ]
    },

    // ==========================================
    // SUB-STRUCTURES (The Modular Pieces)
    // ==========================================
    ABANDONED_CENTER: {
        type: 'PREFAB',
        width: 5,
        height: 5,
        terrain: [
            [null,    2,    1,    2,   null],
            [2,       2,    1,    2,      2],
            [1,       1,    1,    1,      1],
            [2,       2,    1,    2,      2],
            [null,    2,    1,    2,   null],
        ],
        objects: [
            ['GRASS_COVERAGE_1', 'TREE_STUMP', null, 'SMALL_ROCKS_1', null],
            [null, null, null, null, null],
            ['TULIPS_WHITE', null, 'CAMPFIRE', null, null],
            [null, null, null, null, null],
            [null, 'WOODEN_CHEST', null, 'TREE_STUMP', 'GRASS_COVERAGE_2']
        ]
    },

    ABANDONED_HOUSE: {
        type: 'PREFAB',
        width: 6,
        height: 6,
        terrain: [
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null]
        ],
        objects: [
            ['WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER'], // Row 0
            // --- UPDATED: Door moved 1 column left and 3 rows up to sit alongside the house anchor ---
            ['WOODEN_FENCE_V', 'ABANDONED_HOUSE_1', 'HOUSE_DOOR_WOODEN', null, null, 'WOODEN_FENCE_V'],                                 // Row 1 (House Anchor)
            ['WOODEN_FENCE_V', 'GRASS_COVERAGE_1', null, null, null, 'WOODEN_FENCE_V'],                                                 // Row 2
            ['WOODEN_FENCE_V', 'GRASS_COVERAGE_2', null, null, null, 'WOODEN_FENCE_V'],                                                 // Row 3
            ['WOODEN_FENCE_V', null, null, null, 'GRASS_COVERAGE_1', 'WOODEN_FENCE_V'],                                                 // Row 4
            ['WOODEN_FENCE_BL_CORNER', 'WOODEN_FENCE_H', 'GRASS_COVERAGE_1', 'GRASS_COVERAGE_1', 'WOODEN_FENCE_H', 'WOODEN_FENCE_BR_CORNER'] // Row 5
        ]
    },

    ABANDONED_STORAGE: {
        type: 'PREFAB',
        width: 6,
        height: 5,
        terrain: [
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null]
        ],
        objects: [
            ['WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_H', 'WOODEN_FENCE_TR_CORNER'],
            ['WOODEN_FENCE_V', 'WOODEN_CHEST', 'GRASS_COVERAGE_1', 'WOODEN_CHEST', 'TULIPS_ORANGE', 'WOODEN_FENCE_V'],
            ['WOODEN_FENCE_V', 'TULIPS_WHITE', 'TREE_STUMP', 'GRASS_COVERAGE_2', 'WOODEN_CHEST', 'WOODEN_FENCE_V'],
            ['WOODEN_FENCE_V', 'SMALL_ROCKS_1', 'TULIPS_RED', 'SMALL_ROCKS_2', 'GRASS_COVERAGE_3', 'WOODEN_FENCE_V'],
            ['WOODEN_FENCE_BL_CORNER', 'GRASS_COVERAGE_2', null, 'GRASS_COVERAGE_1', null, 'WOODEN_FENCE_BR_CORNER']
        ]
    }
};
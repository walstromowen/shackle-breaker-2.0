export const MAP_OBJECTS = {
    GRASS_COVERAGE_1: {
        spriteKey: 'GRASS_COVERAGE_1',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    GRASS_COVERAGE_2: {
        spriteKey: 'GRASS_COVERAGE_2',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    GRASS_COVERAGE_3: {
        spriteKey: 'GRASS_COVERAGE_3',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    PINE_TREE: {
        spriteKey: 'PINE_TREE_SMALL',
        width: 1, 
        height: 1, 
        isSolid: true,
        hitbox: { w: 1, h: 1 } // Fully solid
    },
    TULIPS_ORANGE: {
        spriteKey: 'TULIPS_ORANGE',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    TULIPS_WHITE: {
        spriteKey: 'TULIPS_WHITE',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    TULIPS_RED: {
        spriteKey: 'TULIPS_RED',
        width: 1, 
        height: 1, 
        isSolid: false
    },
    WOODEN_CHEST: {
        spriteKey: 'WOODEN_CHEST',
        width: 1, 
        height: 1, 
        isSolid: true,
        hitbox: { w: 1, h: 1 } // Fully solid
    },
    SMALL_ROCKS: {
        spriteKey: 'SMALL_ROCKS',
        width: 1,
        height: 1, 
        isSolid: false
    },
    OAK_TREE_1: {
        spriteKey: 'OAK_TREE_1',
        width: 2, 
        height: 2, 
        isSolid: true,
        // KEY CHANGE: Hitbox is only the bottom row (Trunk)
        // This lets the player walk "behind" the tree tops.
        hitbox: { w: 2, h: 1 } 
    },
};
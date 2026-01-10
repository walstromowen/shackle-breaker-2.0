export const MAP_OBJECTS = {
    GRASS_COVERAGE_1: {
        spriteKey: 'GRASS_COVERAGE_1',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    GRASS_COVERAGE_2: {
        spriteKey: 'GRASS_COVERAGE_2',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    GRASS_COVERAGE_3: {
        spriteKey: 'GRASS_COVERAGE_3',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    PINE_TREE: {
        spriteKey: 'PINE_TREE_SMALL',
        // LOGIC HEIGHT: 1 (The footprint on the ground)
        // VISUAL HEIGHT: 2 (Handled by SPRITES.js)
        width: 1, 
        height: 1, 
        isSolid: true,
        hitbox: { w: 1, h: 1 } 
    },
    TULIPS_ORANGE: {
        spriteKey: 'TULIPS_ORANGE',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    TULIPS_WHITE: {
        spriteKey: 'TULIPS_WHITE',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    TULIPS_RED: {
        spriteKey: 'TULIPS_RED',
        width: 1, 
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    WOODEN_CHEST: {
        spriteKey: 'WOODEN_CHEST',
        width: 1, 
        height: 1, 
        isSolid: true,
        hitbox: { w: 1, h: 1 } 
    },
    SMALL_ROCKS: {
        spriteKey: 'SMALL_ROCKS',
        width: 1,
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    OAK_TREE_1: {
        spriteKey: 'OAK_TREE_1',
        width: 2, 
        height: 2, 
        isSolid: true,
        hitbox: { w: 2, h: 1 } // Hitbox is only the bottom row (Trunk)
    },
    LARGE_HOUSE: {
        // FIX: Must match the key in SPRITES.js exactly
        spriteKey: 'LARGE_HOUSE', 
        width: 4, 
        height: 3, 
        isSolid: true,
        isGround: false, 
        
        // Physics engine will push this to the bottom
        // Result: Roof is walkable-behind, Walls are solid
        hitbox: { w: 4, h: 1 } 
    },
    CAMPFIRE: {
        spriteKey: 'CAMPFIRE', 
        width: 1, 
        height: 1, 
        isSolid: true,
        // Campfires usually have a smaller hitbox so you can walk near them
        hitbox: { w: 0.8, h: 0.8 },
        
        // --- NEW LIGHTING CONFIGURATION ---
        light: {
            hasLight: true,
            radius: 5.5,          // Size of the glow in tiles
            color: '255, 100, 0', // Warm Orange
            maxAlpha: 0.8,        // Brightness at center
            flickerSpeed: 0.1,    // Speed of jitter
            flickerAmp: 0.5       // Intensity of jitter (radius variance)
        }
    }
};
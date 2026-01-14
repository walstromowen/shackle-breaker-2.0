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
        width: 1, 
        height: 1, 
        isSolid: true,
        isGround: false,
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
        isGround: false,
        hitbox: { w: 1, h: 1 },
        interaction: {
            type: 'ENCOUNTER',
            id: 'WOODEN_CHEST_1', // Changed 'encounterId' to 'id' to match SceneManager logic
            isRepeatable: false            
        }
    },
    BOULDER_1: {
        spriteKey: 'BOULDER_1',
        width: 1, 
        height: 1, 
        isSolid: true,
        isGround: false,
        hitbox: { w: 1, h: 1 } 
    },
    SMALL_ROCKS_1: {
        spriteKey: 'SMALL_ROCKS_1',
        width: 1,
        height: 1, 
        isSolid: false,
        isGround: true 
    },
    SMALL_ROCKS_2: {
        spriteKey: 'SMALL_ROCKS_2',
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
        isGround: false,
        hitbox: { w: 2, h: 1 }, // Hitbox is only the bottom row (Trunk)
        
        // --- ADDED INTERACTION ---
        interaction: {
            type: 'ENCOUNTER',
            id: 'oakTree',
        }
    },
    SMALL_HOUSE_1: {
        spriteKey: 'SMALL_HOUSE_1', 
        width: 4, 
        height: 3, 
        isSolid: true,
        isGround: false, 
        hitbox: { w: 4, h: 1 } 
    },
    CAMPFIRE: {
        spriteKey: 'CAMPFIRE', 
        width: 1, 
        height: 1, 
        isSolid: true,
        isGround: false,
        hitbox: { w: 1, h: 1 },
        
        // --- ADDED INTERACTION ---
        interaction: {
            type: 'ENCOUNTER',
            id: 'bonfire',
        },

        light: {
            hasLight: true,
            radius: 5.5,          
            color: '255, 100, 0', 
            maxAlpha: 0.8,        
            flickerSpeed: 0.1,    
            flickerAmp: 0.5       
        }
    }
};
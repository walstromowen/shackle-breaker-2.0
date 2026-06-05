export const MAP_OBJECTS_DEFINITIONS = {
    // --- STAIRS ---
    STAIRS_LARGE_VERTICAL: { spriteX: 0, spriteY: 10, width: 2, height: 3, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['UP', 'DOWN'], hitbox: { xOffset: 0, yOffset: -1, w: 2, h: 4 } },
    STAIRS_VERTICAL_1: { spriteX: 2, spriteY: 10, width: 1, height: 2, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['UP', 'DOWN'], hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 2 } },
    STAIRS_VERTICAL_2: { spriteX: 0, spriteY: 10, width: 1, height: 2, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['UP', 'DOWN'], hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 3 } },
    STAIRS_VERTICAL_3: { spriteX: 0, spriteY: 10, width: 1, height: 3, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['UP', 'DOWN'], hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 4 } },
    STAIRS_HORIZONTAL_1: { spriteX: 2, spriteY: 10, width: 1, height: 1, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['LEFT', 'RIGHT'], hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STAIRS_HORIZONTAL_2: { spriteX: 3, spriteY: 10, width: 2, height: 1, isSolid: false, isGround: true, isStairs: true, allowedDirections: ['LEFT', 'RIGHT'], hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },

    // --- GROUND DECORATION ---
    GRASS_COVERAGE_1: { spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_2: { spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_3: { spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    TULIPS_ORANGE:    { spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    TULIPS_WHITE:     { spriteX: 2, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    TULIPS_RED:       { spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SMALL_ROCKS_1:    { spriteX: 4, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SMALL_ROCKS_2:    { spriteX: 5, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_1:      { spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_2:      { spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_3:      { spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },

    // --- BUILDINGS ---
    SMALL_HOUSE_1: { spriteX: 0, spriteY: 7, width: 4, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 2, w: 4, h: 1 } },
    
    ABANDONED_HOUSE_1: {
        spriteX: 5, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true,
        // --- UPDATED: Restored the physical gap to local column 1 to match the visual door ---
        hitboxes: [
            { xOffset: 0, yOffset: 0, w: 1, h: 2 }, // Left structural wall
            { xOffset: 1, yOffset: -1, w: 1, h: 1 }, // Transom/roof space directly above the door
            { xOffset: 2, yOffset: -1, w: 2, h: 2 }  // Right structural walls
        ]
    },

    // --- STRUCTURES / FENCES ---
    WOODEN_FENCE_H: { spriteX: 5, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_V: { spriteX: 5, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_TL_CORNER: { spriteX: 3, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_TR_CORNER: { spriteX: 4, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_BL_CORNER: { spriteX: 3, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_BR_CORNER: { spriteX: 4, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },

    // --- INTERACTABLES & OBSTACLES ---
    BOULDER_1: { spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    BOULDER_2: { spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_CHEST: { spriteX: 0, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'WOODEN_CHEST_1', isRepeatable: false } },
    PINE_TREE: { spriteX: 3, spriteY: 1, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    OAK_TREE_1: { spriteX: 0, spriteY: 1, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 1, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'oak_tree' } },
    TREE_STUMP: { spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    CACTUS:     { spriteX: 6, spriteY: 1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },

    // --- ANIMATED ---
    CAMPFIRE: { spriteX: 0, spriteY: 6, frames: 4, speed: 0.2, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'bonfire' }, light: { hasLight: true, radius: 5.5, color: '255, 100, 0', maxAlpha: 0.8, flickerSpeed: 0.1, flickerAmp: 0.5 } },
    HOUSE_DOOR_WOODEN: {
    spriteX: 0, spriteY: 12, width: 1, height: 1, frames: 4, speed: 0.15,
    isSolid: false, isGround: false, isAnchor: true,
    hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
    interaction: { 
        type: 'WARP', 
        id: 'procedural_room_trigger', 
        roomType: 'HOUSE_INTERIOR', // <-- ADD THIS! Matches your biome ID
        isRepeatable: true 
    }
},
    HOUSE_EXIT_DOOR: {
    spriteX: 0, 
    spriteY: 0, // Match your wood door graphic frames
    width: 1, 
    height: 1, 
    frames: 4, 
    speed: 0.15, 
    isSolid: false, 
    isGround: false, 
    isAnchor: true, 
    hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, 
    interaction: { 
        type: 'WARP', 
        id: 'exit_interior' // Triggers the overworld restoration block in SceneManager
    }
}
};
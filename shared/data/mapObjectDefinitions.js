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
    
    // --- UPDATED: SMALL ROCKS WITH PICKUP ---
    SMALL_ROCKS_1:    { spriteX: 4, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_2:    { spriteX: 5, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_3:    { spriteX: 10, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    // ----------------------------------------

    SAND_DUNE_1:      { spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_2:      { spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_3:      { spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    DESERT_SKULL:     { spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },

    // --- BUILDINGS ---
    ABANDONED_HOUSE_1: { spriteX: 5, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 0, yOffset: 0, w: 1, h: 2 }, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },
    ABANDONED_HOUSE_2: { spriteX: 9, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 0, yOffset: 0, w: 1, h: 2 }, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },

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
    WOODEN_CHEST: { spriteX: 0, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'treasure_chest', isRepeatable: false } },
    PINE_TREE: { spriteX: 3, spriteY: 1, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    OAK_TREE_1: { spriteX: 0, spriteY: 1, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 1, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'oak_tree' } },
    TREE_STUMP: { spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_CACTUS_1: { spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_CACTUS_2: { spriteX: 2, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STRANGE_OBELISK: { spriteX: 1, spriteY: 4, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'strange_obelisk', isRepeatable: false } },
    
    // --- HERBS ---
    HEALING_HERB: { spriteX: 9, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'healing_herb', amount: 1 } },
    INVIGORATING_HERB: { spriteX: 9, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'invigorating_herb', amount: 1 } },
    ILLUMINATING_HERB: { spriteX: 9, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'illuminating_herb', amount: 1 } },

    // --- CRAFTING STATIONS ---
    ANVIL: { spriteX: 6, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'anvil', title: 'Anvil' } },
    FORGE: { spriteX: 8, spriteY: 6, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'forge', title: 'Forge' }, light: { hasLight: true, radius: 4, color: '255, 120, 50', maxAlpha: 0.6, flickerSpeed: 0.1, flickerAmp: 0.2 } },
    CARPENTERS_BENCH: { spriteX: 7, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'carpenters_bench', title: "Carpenter's Bench" } },
    STONE_BANKER: { spriteX: 9, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'stone_banker', title: 'Stone Banker' } },
    TAILORS_BENCH: { spriteX: 8, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'tailors_bench', title: "Tailor's Bench" } },

    // --- ANIMATED ---
    CAMPFIRE: { spriteX: 0, spriteY: 6, frames: 4, speed: 0.2, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'bonfire' }, light: { hasLight: true, radius: 5.5, color: '255, 100, 0', maxAlpha: 0.8, flickerSpeed: 0.1, flickerAmp: 0.5 } },
    
    // ==========================================
    // DOORS & WARPS
    // ==========================================
    HOUSE_DOOR_WOODEN: {
      spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
      interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'HOUSE_INTERIOR', isRepeatable: true }
    },
    BLACKSMITH_DOOR: {
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_BLACKSMITH', isRepeatable: true }
    },
    CARPENTER_DOOR: {
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_CARPENTER', isRepeatable: true }
    },
    MASON_DOOR: {
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_MASON', isRepeatable: true }
    },
    TAILOR_DOOR: {
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_TAILOR', isRepeatable: true }
    },
};
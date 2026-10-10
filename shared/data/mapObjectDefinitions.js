export const MAP_OBJECTS_DEFINITIONS = {
    // --- GROUND DECORATION ---
    GRASS_COVERAGE_1: { sheet: 'objGrassCoverage1', spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_2: { sheet: 'objGrassCoverage2', spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_3: { sheet: 'objGrassCoverage3', spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    TULIPS_ORANGE: { sheet: 'objTulipsOrange', spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fiber', amount: 1 } },
    TULIPS_WHITE: { sheet: 'objTulipsWhite', spriteX: 2, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fiber', amount: 1 } },
    TULIPS_RED: { sheet: 'objTulipsRed', spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fiber', amount: 1 } },
    
    // --- UPDATED: SMALL ROCKS WITH PICKUP ---
    SMALL_ROCKS_1: { sheet: { default: 'objSmallRocks1', DESERT: 'objSmallRocks1Desert', SNOWY_MOUNTAINS: 'objSmallRocks1Snow' }, spriteX: 4, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_2: { sheet: { default: 'objSmallRocks2', DESERT: 'objSmallRocks2Desert', SNOWY_MOUNTAINS: 'objSmallRocks2Snow' }, spriteX: 5, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_3: { sheet: { default: 'objSmallRocks3', DESERT: 'objSmallRocks3Desert', SNOWY_MOUNTAINS: 'objSmallRocks3Snow' }, spriteX: 10, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    STICK: { sheet: 'objStick', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'soft_wood', amount: 1 } },
    // ----------------------------------------

    SAND_DUNE_1: { sheet: 'objSandDune1', spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_2: { sheet: 'objSandDune2', spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    SAND_DUNE_3: { sheet: 'objSandDune3', spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    DESERT_SKULL: { sheet: 'objDesertSkull', spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },

    // --- BUILDINGS ---
    ABANDONED_HOUSE_1: { sheet: 'objAbandonedHouse1', spriteX: 5, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 0, yOffset: 0, w: 1, h: 2 }, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },
    ABANDONED_HOUSE_2: { sheet: 'objAbandonedHouse2', spriteX: 9, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 0, yOffset: 0, w: 1, h: 2 }, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },

    // --- STRUCTURES / FENCES ---
    WOODEN_FENCE_H: { sheet: 'objWoodenFenceH', spriteX: 5, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_V: { sheet: 'objWoodenFenceV', spriteX: 5, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_TL_CORNER: { sheet: 'objWoodenFenceTlCorner', spriteX: 3, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_TR_CORNER: { sheet: 'objWoodenFenceTrCorner', spriteX: 4, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_BL_CORNER: { sheet: 'objWoodenFenceBlCorner', spriteX: 3, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_FENCE_BR_CORNER: { sheet: 'objWoodenFenceBrCorner', spriteX: 4, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },

    // --- INTERACTABLES & OBSTACLES ---
    BOULDER_1: { sheet: 'objBoulder1', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    BOULDER_2: { sheet: 'objBoulder2', spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WOODEN_CHEST: { sheet: 'objWoodenChest', spriteX: 0, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'treasure_chest', isRepeatable: false } },
    PINE_TREE: { sheet: 'objPineTree', spriteX: 3, spriteY: 1, width: 2, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'soft_wood', amount: 2, duration: 1.5, replaceWith: 'TREE_STUMP' } },
    SNOWY_PINE_TREE: { sheet: 'objPineTreeSnow', spriteX: 3, spriteY: 1, width: 2, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'soft_wood', amount: 2, duration: 1.5, replaceWith: 'SNOWY_TREE_STUMP' } },
    OAK_TREE_1: { sheet: 'objOakTree1', spriteX: 0, spriteY: 1, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 1, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'hardwood', amount: 2, duration: 2.0, replaceWith: 'TREE_STUMP' } },
    TREE_STUMP: { sheet: 'objTreeStump', spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SNOWY_TREE_STUMP: { sheet: 'objTreeStumpSnow', spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_CACTUS_1: { sheet: 'objSmallCactus1', spriteX: 1, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_CACTUS_2: { sheet: 'objSmallCactus2', spriteX: 2, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STRANGE_OBELISK: { sheet: 'objStrangeObelisk', spriteX: 1, spriteY: 4, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'strange_obelisk', isRepeatable: false } },
    
    // --- HERBS ---
    HEALING_HERB: { sheet: 'objHealingHerb', spriteX: 9, spriteY: 1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'healing_herb', amount: 1 } },
    INVIGORATING_HERB: { sheet: 'objInvigoratingHerb', spriteX: 10, spriteY: 1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'invigorating_herb', amount: 1 } },
    ILLUMINATING_HERB: { sheet: 'objIlluminatingHerb', spriteX: 11, spriteY: 1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'PICKUP', itemId: 'illuminating_herb', amount: 1 } },

    // --- CRAFTING STATIONS ---
    ANVIL: { sheet: 'objAnvil', spriteX: 6, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'anvil', title: 'Anvil' } },
    FORGE: { sheet: 'objForge', spriteX: 8, spriteY: 6, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'forge', title: 'Forge' }, light: { hasLight: true, radius: 4, color: '255, 120, 50', maxAlpha: 0.6, flickerSpeed: 0.1, flickerAmp: 0.2 } },
    CARPENTERS_BENCH: { sheet: 'objCarpentersBench', spriteX: 7, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'carpenters_bench', title: "Carpenter's Bench" } },
    STONE_BANKER: { sheet: 'objStoneBanker', spriteX: 9, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'stone_banker', title: 'Stone Banker' } },
    TAILORS_BENCH: { sheet: 'objTailorsBench', spriteX: 8, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'tailors_bench', title: "Tailor's Bench" } },

    // --- ANIMATED ---
    CAMPFIRE: { sheet: 'objCampfire', spriteX: 0, spriteY: 6, frames: 4, speed: 0.2, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'bonfire' }, light: { hasLight: true, radius: 5.5, color: '255, 100, 0', maxAlpha: 0.8, flickerSpeed: 0.1, flickerAmp: 0.5 } },
    
    // ==========================================
    // DOORS & WARPS
    // ==========================================
    HOUSE_DOOR_WOODEN: {
      sheet: 'objHouseDoorWooden',
      spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
      interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'HOUSE_INTERIOR', isRepeatable: true }
    },
    BLACKSMITH_DOOR: {
        sheet: 'objBlacksmithDoor',
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_BLACKSMITH', isRepeatable: true }
    },
    CARPENTER_DOOR: {
        sheet: 'objCarpenterDoor',
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_CARPENTER', isRepeatable: true }
    },
    MASON_DOOR: {
        sheet: 'objMasonDoor',
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_MASON', isRepeatable: true }
    },
    TAILOR_DOOR: {
        sheet: 'objTailorDoor',
        spriteX: 0, spriteY: 7, width: 1, height: 1, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_TAILOR', isRepeatable: true }
    },
};
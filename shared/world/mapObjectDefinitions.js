import { FENCE_FRAMES, FENCE_CONNECT_KEY } from './fenceConnections.js';

/* The gravestone's body, shared by TOMBSTONE and OLD_GRAVESTONE below: one sprite, one footprint, one hitbox, so nothing on screen tells the two apart. */
const GRAVESTONE = { sheet: 'objTombstone', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } };

/* A fence piece's body: 32 frames on one sheet, the right one picked by the renderer from the neighbouring fences (fenceConnections.js). */
const WOODEN_FENCE = { sheet: 'objWoodenFence', spriteX: 0, spriteY: 0, width: 1, height: 1, frames: FENCE_FRAMES, connects: FENCE_CONNECT_KEY, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } };

export const MAP_OBJECTS_DEFINITIONS = {
    // --- GROUND DECORATION ---
    GRASS_COVERAGE_1: { sheet: 'objGrassCoverage1', spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_2: { sheet: 'objGrassCoverage2', spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    GRASS_COVERAGE_3: { sheet: 'objGrassCoverage3', spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true },
    TULIPS_ORANGE: { sheet: 'objTulipsOrange', spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fibers', amount: 1 } },
    TULIPS_WHITE: { sheet: 'objTulipsWhite', spriteX: 2, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fibers', amount: 1 } },
    TULIPS_RED: { sheet: 'objTulipsRed', spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'plant_fibers', amount: 1 } },
    
    // --- UPDATED: SMALL ROCKS WITH PICKUP ---
    SMALL_ROCKS_1: { sheet: { default: 'objSmallRocks1', DESERT: 'objSmallRocks1Desert', SNOWY_MOUNTAINS: 'objSmallRocks1Snow' }, spriteX: 4, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_2: { sheet: { default: 'objSmallRocks2', DESERT: 'objSmallRocks2Desert', SNOWY_MOUNTAINS: 'objSmallRocks2Snow' }, spriteX: 5, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    SMALL_ROCKS_3: { sheet: { default: 'objSmallRocks3', DESERT: 'objSmallRocks3Desert', SNOWY_MOUNTAINS: 'objSmallRocks3Snow' }, spriteX: 10, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'stone', amount: 1 } },
    /* FLINT: a dark nodule with a chalky tan rind. Walk over it (or face it and interact) to pick up 1 flint. Generates on the dirt (LAYER_1) of the plains and the snowy mountains, see biomeDefinitions. */
    FLINT_ROCK: { sheet: { default: 'objFlintRock', SNOWY_MOUNTAINS: 'objFlintRockSnow' }, spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'flint', amount: 1 } },
    STICK: { sheet: 'objStick', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'soft_wood', amount: 1, lootTableId: 'stick_wood' } /* a stick is soft wood, or hard wood one time in four (see LootTableDefinitions.stick_wood) */ },
    // ----------------------------------------

    SAND_DUNE_1: { sheet: 'objSandDune1', spriteX: 6, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'sand', amount: 1 } },
    SAND_DUNE_2: { sheet: 'objSandDune2', spriteX: 7, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'sand', amount: 1 } },
    SAND_DUNE_3: { sheet: 'objSandDune3', spriteX: 8, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'sand', amount: 1 } },
    DESERT_SKULL: { sheet: 'objDesertSkull', spriteX: 3, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'bone', amount: 1 } },
    BONE_PILE: { sheet: 'objBonePile', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'bone', amount: 1 } },

    // --- BUILDINGS ---
    ABANDONED_HOUSE_1: { sheet: 'objAbandonedHouse1', spriteX: 5, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 1, h: 2 } /* the left wall: its two bottom rows, like the right wall's (it used to start a row too low and block the cell in front of the house) */, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },
    ABANDONED_HOUSE_2: { sheet: 'objAbandonedHouse2', spriteX: 9, spriteY: 7, width: 4, height: 4, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 1, h: 2 } /* the left wall: its two bottom rows, like the right wall's (it used to start a row too low and block the cell in front of the house) */, { xOffset: 1, yOffset: -1, w: 1, h: 1 }, { xOffset: 2, yOffset: -1, w: 2, h: 2 }] },

    // --- STRUCTURES / FENCES ---
    /* The wooden fence: six names for one connecting piece (a post with rails towards its neighbours, see fenceConnections.js). The names stay so
       the yards in structures.js keep reading like a plan (H a straight run along, V down, four corners); the picture is chosen from the neighbours. */
    WOODEN_FENCE_H: WOODEN_FENCE,
    WOODEN_FENCE_V: WOODEN_FENCE,
    WOODEN_FENCE_TL_CORNER: WOODEN_FENCE,
    WOODEN_FENCE_TR_CORNER: WOODEN_FENCE,
    WOODEN_FENCE_BL_CORNER: WOODEN_FENCE,
    WOODEN_FENCE_BR_CORNER: WOODEN_FENCE,
    /* A fence piece that has come down: a snapped post and a rail in the grass. It does not connect to anything. */
    WOODEN_FENCE_FALLEN: { sheet: 'objWoodenFenceFallen', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },

    // --- INTERACTABLES & OBSTACLES ---
    /* BOULDERS: mined with a pickaxe (equipped, like an axe for a tree) for 3 stone, and the boulder is gone. Without a pickaxe they are plain solid rocks and show no prompt. */
    BOULDER_1: { sheet: 'objBoulder1', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'stone', amount: 3, duration: 2.5 } },
    BOULDER_2: { sheet: 'objBoulder2', spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'stone', amount: 3, duration: 2.5 } },
    SNOWY_BOULDER_1: { sheet: 'objSnowyBoulder1', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'stone', amount: 3, duration: 2.5 } },
    SNOWY_BOULDER_2: { sheet: 'objSnowyBoulder2', spriteX: 1, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'stone', amount: 3, duration: 2.5 } },
    /* ORE DEPOSITS: solid rock with a vein in it. Mined with a pickaxe (it must be equipped, like an axe for a tree): the deposit gives `amount` of `itemId` and is gone. `duration` = seconds of swinging. */
    COAL_DEPOSIT: { sheet: 'objCoalDeposit', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'coal', amount: 2, duration: 2 } }, // caves
    IRON_ORE_DEPOSIT: { sheet: { default: 'objIronOreDeposit', SNOWY_MOUNTAINS: 'objIronOreDepositSnow' }, spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'iron_ore', amount: 1, duration: 3 } }, // deep caves, high in the snowy mountains
    COPPER_ORE_DEPOSIT: { sheet: 'objCopperOreDeposit', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'copper_ore', amount: 2, duration: 2.5 } }, // caves
    TIN_ORE_DEPOSIT: { sheet: 'objTinOreDeposit', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'tin_ore', amount: 2, duration: 2.5 } }, // plains
    SALT_DEPOSIT: { sheet: 'objSaltDeposit', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'pickaxe', itemId: 'salt', amount: 2, duration: 2 } }, // desert

    // --- ANIMAL TRACKS: a ground mark in the snow that starts the "Tracks In The Snow" encounter. Not solid: you walk onto it
    // (`walkIn: true`, needs the small OverworldController change in overworldController.walkin_encounter.patch.js; without it you face the tracks and press interact).
    ANIMAL_TRACKS: { sheet: 'objAnimalTracks', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'ENCOUNTER', id: 'tracks_in_the_snow', isRepeatable: false, walkIn: true } },
    
    WOODEN_CHEST: { sheet: 'objWoodenChest', spriteX: 0, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'treasure_chest', isRepeatable: false } },
    IRON_CHEST: { sheet: 'objIronChest', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'iron_chest', isRepeatable: false } },
    PINE_TREE: { sheet: 'objPineTree', spriteX: 3, spriteY: 1, width: 2, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'soft_wood', amount: 2, duration: 1.5, replaceWith: 'TREE_STUMP' } },
    SNOWY_PINE_TREE: { sheet: 'objPineTreeSnow', spriteX: 3, spriteY: 1, width: 2, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'soft_wood', amount: 2, duration: 1.5, replaceWith: 'SNOWY_TREE_STUMP' } },
    OAK_TREE_1: { sheet: 'objOakTree1', spriteX: 0, spriteY: 1, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 1, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'HARVEST', tool: 'axe', itemId: 'hard_wood', amount: 2, duration: 2.0, replaceWith: 'TREE_STUMP' } },
    TREE_STUMP: { sheet: 'objTreeStump', spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SNOWY_TREE_STUMP: { sheet: 'objTreeStumpSnow', spriteX: 0, spriteY: 4, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    MEDIUM_CACTUS_1: { sheet: 'objMediumCactus1', spriteX: 1, spriteY: 0, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    SMALL_CACTUS_1: { sheet: 'objSmallCactus1', spriteX: 2, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STRANGE_OBELISK: { sheet: 'objStrangeObelisk', spriteX: 1, spriteY: 4, width: 2, height: 3, isSolid: true, isGround: false, isAnchor: true, blocksLight: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'strange_obelisk', isRepeatable: false } },
    /* PECULIAR_SCARECROW: a scarecrow bound to a post, two tiles wide and two tall (64 x 64 sheet, its shadow baked in like the trees'; the two base tiles are solid).
       Stepping onto any of the 5 rows straight beneath its base, under either of its two columns (`triggerLine`: its line of sight), starts the encounter, once each
       time you step into that line (OverworldController.checkEncounterZones). It only stands in abandoned villages, on the verge north of an east-west road
       (structures.js `scarecrows`). */
    PECULIAR_SCARECROW: { sheet: 'objScarecrow', spriteX: 0, spriteY: 0, width: 2, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'peculiar_scarecrow', triggerLine: { direction: 'down', length: 5 } } },
    /* TOMBSTONE / OLD_GRAVESTONE: the same gravestone twice (GRAVESTONE above). The plain TOMBSTONE is scenery and is the common one; OLD_GRAVESTONE is the rare twin
       that starts the "Old Gravestone" encounter (dig for what was buried, or wake what was). Both stand on the plains (biomeDefinitions.js PLAINS, each its own band). */
    TOMBSTONE: { ...GRAVESTONE },
    OLD_GRAVESTONE: { ...GRAVESTONE, interaction: { type: 'ENCOUNTER', id: 'old_gravestone', isRepeatable: false } },
    MYSTERIOUS_ALTAR: { sheet: 'objMysteriousAltar', spriteX: 0, spriteY: 0, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 3, h: 2 }, interaction: { type: 'ENCOUNTER', id: 'mysterious_altar' } },
    
    // --- HERBS --- (walk over them to pick them up, like the small rocks and the bones)
    HEALING_HERB: { sheet: 'objHealingHerb', spriteX: 9, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'healing_herb', amount: 1 } },
    ALOE_PLANT: { sheet: 'objAloe', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'aloe', amount: 1 } },  // desert only (biomeDefinitions.js DESERT)
    INVIGORATING_HERB: { sheet: 'objInvigoratingHerb', spriteX: 10, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'invigorating_herb', amount: 1 } },
    ILLUMINATING_HERB: { sheet: 'objIlluminatingHerb', spriteX: 11, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'illuminating_herb', amount: 1 } },

    // --- CRAFTING STATIONS ---
    ANVIL: { sheet: 'objAnvil', spriteX: 6, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'anvil', title: 'Anvil' } },
    FORGE: { sheet: 'objForge', spriteX: 8, spriteY: 6, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'forge', title: 'Forge' }, light: { hasLight: true, radius: 4, color: '255, 120, 50', maxAlpha: 0.6, flickerSpeed: 0.1, flickerAmp: 0.2 } },
    CARPENTERS_BENCH: { sheet: 'objCarpentersBench', spriteX: 7, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'carpenters_bench', title: "Carpenter's Bench" } },
    STONE_BANKER: { sheet: 'objStoneBanker', spriteX: 9, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'stone_banker', title: 'Stone Banker' } },
    TAILORS_BENCH: { sheet: 'objTailorsBench', spriteX: 8, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'tailors_bench', title: "Tailor's Bench" } },

    // --- ANIMATED ---
    CAMPFIRE: { sheet: 'objCampfire', spriteX: 0, spriteY: 6, frames: 32, speed: 0.1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'bonfire' }, light: { hasLight: true, radius: 5.5, color: '255, 100, 0', maxAlpha: 0.8, flickerSpeed: 0.1, flickerAmp: 0.5 } },
    STANDING_TORCH: { sheet: 'objStandingTorch', spriteX: 0, spriteY: 0, frames: 4, speed: 0.14, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, light: { hasLight: true, radius: 5.5, color: '255, 140, 50', maxAlpha: 0.75, flickerSpeed: 0.1, flickerAmp: 0.4 } },
    
    // --- HOUSE FURNITURE ---
    BARREL: { sheet: 'objBarrel', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    CRATE: { sheet: 'objCrate', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    CRATE_SACK: { sheet: 'objCrateSack', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SACKS: { sheet: 'objSacks', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    POTTED_PLANT: { sheet: 'objPottedPlant', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STOOL: { sheet: 'objStool', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    CHAIR: { sheet: 'objChair', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_TABLE: { sheet: 'objSmallTable', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, light: { hasLight: true, radius: 3.5, color: '255, 190, 110', maxAlpha: 0.55, flickerSpeed: 0.12, flickerAmp: 0.25 } },
    TABLE_LONG: { sheet: 'objTableLong', spriteX: 0, spriteY: 0, width: 2, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    COUNTER: { sheet: 'objCounter', spriteX: 0, spriteY: 0, width: 2, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    BED_RED: { sheet: 'objBedRed', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 2 } },
    BED_BLUE: { sheet: 'objBedBlue', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 2 } },
    BOOKSHELF: { sheet: 'objBookshelf', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WARDROBE: { sheet: 'objWardrobe', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    FIREPLACE: { sheet: 'objFireplace', spriteX: 0, spriteY: 0, width: 2, height: 2, frames: 4, speed: 0.15, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 }, light: { hasLight: true, radius: 7, color: '255, 140, 60', maxAlpha: 0.85, flickerSpeed: 0.1, flickerAmp: 0.3 } },
    CANDELABRA: { sheet: 'objCandelabra', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, light: { hasLight: true, radius: 5, color: '255, 190, 110', maxAlpha: 0.7, flickerSpeed: 0.12, flickerAmp: 0.3 } },
    RUG_SMALL: { sheet: 'objRugSmall', spriteX: 0, spriteY: 0, width: 2, height: 2, isSolid: false, isGround: true, hitbox: { xOffset: 0, yOffset: 0, w: 0, h: 0 } },
    RUG_GREEN: { sheet: 'objRugGreen', spriteX: 0, spriteY: 0, width: 2, height: 2, isSolid: false, isGround: true, hitbox: { xOffset: 0, yOffset: 0, w: 0, h: 0 } },
    RUG_LONG: { sheet: 'objRugLong', spriteX: 0, spriteY: 0, width: 3, height: 2, isSolid: false, isGround: true, hitbox: { xOffset: 0, yOffset: 0, w: 0, h: 0 } },
    DOORMAT: { sheet: 'objDoormat', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, hitbox: { xOffset: 0, yOffset: 0, w: 0, h: 0 } },

    /* the inside of a house or workshop door (HouseGenerator / CraftingHouseGenerator put it on the south wall); it leads back out (SceneManager's 'exit_interior'). 2 tiles tall like every door: the door itself is 1.5 tiles (the lowest 48 px of the 64 px frame) and the top 10 px of the frame are the wall above it, painted into objHouseExitDoor.png.
       The generators put it on the row below the doorway cell, so the sprite fills the two wall-face rows; the hitbox (the cell you walk onto) is the doorway cell one row up. isGround draws it under the player, so you stand in front of the door while it opens. */
    HOUSE_EXIT_DOOR: {
      sheet: 'objHouseExitDoor',
      spriteX: 0, spriteY: 7, width: 1, height: 2, frames: 4, speed: 0.15, isSolid: false, isGround: true, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 1 },
      interaction: { type: 'WARP', id: 'exit_interior', isRepeatable: true }
    },
     HOUSE_DOOR_WOODEN: {
      sheet: 'objHouseDoorWooden',
      spriteX: 0, spriteY: 7, width: 1, height: 2, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
      interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'HOUSE_INTERIOR', isRepeatable: true }
    },
    /* the village's one workshop (every crafting station inside); it uses the blacksmith's door art until it gets one of its own: change `sheet` */
    WORKSHOP_DOOR: {
        sheet: 'objBlacksmithDoor',
        spriteX: 0, spriteY: 7, width: 1, height: 2, frames: 4, speed: 0.15, isSolid: false, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 },
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'ABANDONED_WORKSHOP', isRepeatable: true }
    },

    // ==========================================
    // CAVE MOUTHS (3 x 3 cells, painted into a cliff face; only the middle cell of the bottom row is the doorway).
    // `walkIn: true` on a WARP: with a single frame there is no door to open, so OverworldController.finishMove warps as soon as you step on the doorway cell.
    // ==========================================
    CAVE_ENTRANCE: {
        sheet: { default: 'objCaveEntrance', DESERT: 'objCaveEntranceDesert', SNOWY_MOUNTAINS: 'objCaveEntranceSnow' },
        spriteX: 0, spriteY: 0, width: 3, height: 3, isSolid: false, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 1, yOffset: 0, w: 1, h: 1 }],
        interaction: { type: 'WARP', id: 'procedural_room_trigger', roomType: 'CAVE', isRepeatable: true, walkIn: true }
    },
    CAVE_EXIT_DOOR: {
        sheet: 'objCaveExit',
        spriteX: 0, spriteY: 0, width: 3, height: 3, isSolid: false, isGround: false, isAnchor: true, hitboxes: [{ xOffset: 1, yOffset: 0, w: 1, h: 1 }],
        interaction: { type: 'WARP', id: 'exit_interior', isRepeatable: true, walkIn: true }
    },
};

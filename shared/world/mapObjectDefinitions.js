import { FENCE_FRAMES, FENCE_CONNECT_KEY } from './fenceConnections.js';
import { ENTITY_DEFINITIONS } from '../characters/entityDefinitions.js';

/* The gravestone's body, shared by TOMBSTONE and OLD_GRAVESTONE below: one sprite, one footprint, one hitbox, so nothing on screen tells the two apart. */
const GRAVESTONE = { sheet: 'objTombstone', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } };

/* A fence piece's body: 32 frames on one sheet, the right one picked by the renderer from the neighbouring fences (fenceConnections.js). */
const WOODEN_FENCE = { sheet: 'objWoodenFence', spriteX: 0, spriteY: 0, width: 1, height: 1, frames: FENCE_FRAMES, connects: FENCE_CONNECT_KEY, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } };

/* An NPC standing in the world is the character entity itself: it takes the overworld sheet of that entity (ENTITY_DEFINITIONS[entityId].spriteOverworld, the sheet the
   creature walks and runs from) and shows the idle animation of that sheet, rows 0-3 (South, East, North, West), in the direction `facing`. `row` is that row's index within the idle block (0 = the first row
   of the sheet while the idle block starts there), worked out here so it can be read at a glance and checked by a test; MapRenderer.drawCharacterObject draws that row. */
const IDLE_ROW_OF = { DOWN: 0, RIGHT: 1, UP: 2, LEFT: 3 };
const npcBody = (entityId, facing = 'DOWN') => {
    const entity = ENTITY_DEFINITIONS[entityId];
    if (!entity || !entity.spriteOverworld) throw new Error(`[mapObjectDefinitions] an NPC needs a character entity with an overworld sheet, got "${entityId}"`);
    return { character: { entity: entityId, sheet: entity.spriteOverworld, facing, row: IDLE_ROW_OF[facing] }, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } };
};

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
    /* The houses are painted on a 32 px grid with the door gap (one door wide, 1.5 tiles tall, down to the bottom edge) cut into the front wall; the door object (HOUSE_DOOR_WOODEN / WORKSHOP_DOOR)
       is placed in that gap by the yard (structures.js). The object's cell is the bottom-left tile of the sprite. Only the walls are solid: the bottom two rows, except the gap, whose own
       door object is the way in (the one cell above it is wall). The roof rows above are not solid, so you can walk behind a house and it draws over you. */
    ABANDONED_HOUSE_1: { sheet: 'objAbandonedHouse1', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 2, h: 2 } /* the wall left of the door */, { xOffset: 2, yOffset: -1, w: 1, h: 1 } /* the wall above the door */, { xOffset: 3, yOffset: -1, w: 2, h: 2 } /* the wall right of the door */] },
    /* the stone-walled house: the same size, door gap and walls as ABANDONED_HOUSE_1, with fieldstone instead of planks */
    ABANDONED_STONE_HOUSE: { sheet: 'objAbandonedStoneHouse', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 2, h: 2 }, { xOffset: 2, yOffset: -1, w: 1, h: 1 }, { xOffset: 3, yOffset: -1, w: 2, h: 2 }] },
    /* the workshop: a main gable (5 wide, with the door) and a lower side wing (3 wide) */
    CRAFTING_HOUSE: { sheet: 'objCraftingHouse', spriteX: 5, spriteY: 7, width: 7, height: 6, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 2, h: 2 }, { xOffset: 2, yOffset: -1, w: 1, h: 1 }, { xOffset: 3, yOffset: -1, w: 4, h: 2 } /* the wall right of the door, wing included */] },
    /* the blacksmith's house: house A's size and door gap in fieldstone under a slate roof; its door is the blacksmith's door art and leads into an ordinary house */
    ABANDONED_SMITHY: { sheet: 'objAbandonedSmithy', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 2, h: 2 }, { xOffset: 2, yOffset: -1, w: 1, h: 1 }, { xOffset: 3, yOffset: -1, w: 2, h: 2 }] },
    /* THE SIDE VIEWS: the same houses seen from the side, for the plots beside a north-south road (the gable with the door faces the road, so only the long wall shows). They have no
       door: the whole wall (the bottom two rows) is solid and the house is a sealed shell. Left / Right differ only in where the chimney and the windows are. Each is as tall as its front view. */
    ABANDONED_HOUSE_1_LEFT: { sheet: 'objAbandonedHouse1Left', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    ABANDONED_HOUSE_1_RIGHT: { sheet: 'objAbandonedHouse1Right', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    ABANDONED_STONE_HOUSE_LEFT: { sheet: 'objAbandonedStoneHouseLeft', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    ABANDONED_STONE_HOUSE_RIGHT: { sheet: 'objAbandonedStoneHouseRight', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    ABANDONED_SMITHY_LEFT: { sheet: 'objAbandonedSmithyLeft', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    ABANDONED_SMITHY_RIGHT: { sheet: 'objAbandonedSmithyRight', spriteX: 5, spriteY: 7, width: 5, height: 5, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 5, h: 2 }] },
    CRAFTING_HOUSE_LEFT: { sheet: 'objCraftingHouseLeft', spriteX: 5, spriteY: 7, width: 6, height: 6, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 6, h: 2 }] },
    CRAFTING_HOUSE_RIGHT: { sheet: 'objCraftingHouseRight', spriteX: 5, spriteY: 7, width: 6, height: 6, isSolid: true, isGround: false, isAnchor: true, blocksLight: 6, hitboxes: [{ xOffset: 0, yOffset: -1, w: 6, h: 2 }] },

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
    /* AFTERMATH_REMAINS: a helmet on the ground with a sword through it, what an old battle left behind. Face it and interact to start the Aftermath encounter (biomeDefinitions.js PLAINS, its own band). */
    AFTERMATH_REMAINS: { sheet: 'objAftermath', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'aftermath' } },
    OLD_GRAVESTONE: { ...GRAVESTONE, interaction: { type: 'ENCOUNTER', id: 'old_gravestone', isRepeatable: false } },
    MYSTERIOUS_ALTAR: { sheet: 'objMysteriousAltar', spriteX: 0, spriteY: 0, width: 3, height: 3, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 3, h: 2 }, interaction: { type: 'ENCOUNTER', id: 'mysterious_altar' } },
    
    // --- HERBS --- (walk over them to pick them up, like the small rocks and the bones)
    HEALING_HERB: { sheet: 'objHealingHerb', spriteX: 9, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'healing_herb', amount: 1, maxAmount: 2 } },
    ALOE_PLANT: { sheet: 'objAloe', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'aloe', amount: 1, maxAmount: 2 } },  // desert only (biomeDefinitions.js DESERT)
    INVIGORATING_HERB: { sheet: 'objInvigoratingHerb', spriteX: 10, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'invigorating_herb', amount: 1, maxAmount: 2 } },
    ILLUMINATING_HERB: { sheet: 'objIlluminatingHerb', spriteX: 11, spriteY: 1, width: 1, height: 1, isSolid: false, isGround: true, interaction: { type: 'PICKUP', itemId: 'illuminating_herb', amount: 1, maxAmount: 2 } },

    // --- CRAFTING STATIONS ---
    ANVIL: { sheet: 'objAnvil', spriteX: 6, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'anvil', title: 'Anvil' } },
    FORGE: { sheet: 'objForge', spriteX: 8, spriteY: 6, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'forge', title: 'Forge' }, light: { hasLight: true, radius: 4, color: '255, 120, 50', maxAlpha: 0.6, flickerSpeed: 0.1, flickerAmp: 0.2 } },
    CARPENTERS_BENCH: { sheet: 'objCarpentersBench', spriteX: 7, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'carpenters_bench', title: "Carpenter's Bench" } },
    STONE_BANKER: { sheet: 'objStoneBanker', spriteX: 9, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'stone_banker', title: 'Stone Banker' } },
    TAILORS_BENCH: { sheet: 'objTailorsBench', spriteX: 8, spriteY: 5, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'CRAFTING_STATION', station: 'tailors_bench', title: "Tailor's Bench" } },

    // --- NPCS ---
    /* People and animals standing in the world. They are map objects (placed by a biome's mapObjects rules like a tree, see PLAINS / DESERT / SNOWY_MOUNTAINS), but they have no
       picture of their own: `...npcBody(entityId, facing)` takes the creature's own character entity (ENTITY_DEFINITIONS) and draws the idle row of its overworld sheet (the one it walks and runs from) facing South / East / North / West
       ('DOWN' / 'RIGHT' / 'UP' / 'LEFT'), standing on the tile exactly as a character does (MapRenderer.drawCharacterObject). Face one and interact to start its encounter; the
       encounter takes the object off the map (DESTROY_OBJECT) when the creature leaves, flees, is fought or joins you.
         interaction.triggerRadius: the encounter also starts by itself when you step within that many tiles of it, in every direction (a square, diagonals too), once each time
                                    you come into range (OverworldController.findEncounterZones, the same as the scarecrow's `triggerLine` but all around). */
    SHADY_MERCHANT_NPC: { ...npcBody('SHADY_MERCHANT'), interaction: { type: 'ENCOUNTER', id: 'suspicious_merchant' } },
    DOG_NPC: { ...npcBody('DOG'), interaction: { type: 'ENCOUNTER', id: 'wounded_mutt' } },
    MADMAN_NPC: { ...npcBody('MAD_MAN', 'UP'), interaction: { type: 'ENCOUNTER', id: 'a_disturbing_sight', triggerRadius: 2 } },

    // --- ANIMATED ---
    CAMPFIRE: { sheet: 'objCampfire', spriteX: 0, spriteY: 6, frames: 32, speed: 0.1, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'bonfire' }, light: { hasLight: true, radius: 5.5, color: '255, 100, 0', maxAlpha: 0.8, flickerSpeed: 0.1, flickerAmp: 0.5 } },
    /* The waypoint banners, planted by the Waypoint item (shared/world/waypoints.js): 32 x 64, tattered, swaying (4 frames), one per origin in that origin's colours (Alterian: legionary crimson, Panzerian: warlord steel, Namuh: nightblade black). The cairn at the foot is solid; the world map lists them and fast travel goes to them. */
    WAYPOINT_BANNER_ALTERIAN: { sheet: 'objWaypointAlterian', spriteX: 0, spriteY: 0, frames: 4, speed: 0.22, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WAYPOINT_BANNER_PANZERIAN: { sheet: 'objWaypointPanzerian', spriteX: 0, spriteY: 0, frames: 4, speed: 0.22, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WAYPOINT_BANNER_NAMUH: { sheet: 'objWaypointNamuh', spriteX: 0, spriteY: 0, frames: 4, speed: 0.22, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WAYPOINT_BANNER: { sheet: 'objWaypointAlterian', spriteX: 0, spriteY: 0, frames: 4, speed: 0.22, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },   // older saves: the plain banner is the Alterian one
    STANDING_TORCH: { sheet: 'objStandingTorch', spriteX: 0, spriteY: 0, frames: 4, speed: 0.14, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, light: { hasLight: true, radius: 5.5, color: '255, 140, 50', maxAlpha: 0.75, flickerSpeed: 0.1, flickerAmp: 0.4 } },
    
    // --- HOUSE FURNITURE ---
    BARREL: { sheet: 'objBarrel', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } , interaction: { type: 'SEARCH', lootTableId: 'container_barrel', name: 'barrel' } },
    CRATE: { sheet: 'objCrate', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'SEARCH', lootTableId: 'container_crate', name: 'crate' } },
    CRATE_SACK: { sheet: 'objCrateSack', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'SEARCH', lootTableId: 'container_crate_sack', name: 'crate of sacks' } },
    SACKS: { sheet: 'objSacks', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'SEARCH', lootTableId: 'container_sacks', name: 'sacks' } },
    POTTED_PLANT: { sheet: 'objPottedPlant', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    STOOL: { sheet: 'objStool', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    CHAIR: { sheet: 'objChair', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    SMALL_TABLE: { sheet: 'objSmallTable', spriteX: 0, spriteY: 0, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, light: { hasLight: true, radius: 3.5, color: '255, 190, 110', maxAlpha: 0.55, flickerSpeed: 0.12, flickerAmp: 0.25 } },
    TABLE_LONG: { sheet: 'objTableLong', spriteX: 0, spriteY: 0, width: 2, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    COUNTER: { sheet: 'objCounter', spriteX: 0, spriteY: 0, width: 2, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 2, h: 1 } },
    BED_RED: { sheet: 'objBedRed', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 2 } },
    BED_BLUE: { sheet: 'objBedBlue', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: -1, w: 1, h: 2 } },
    BOOKSHELF: { sheet: 'objBookshelf', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } },
    WARDROBE: { sheet: 'objWardrobe', spriteX: 0, spriteY: 0, width: 1, height: 2, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'SEARCH', lootTableId: 'container_wardrobe', name: 'wardrobe' } },
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
    /* the blacksmith's door: the blacksmith's door art on an ordinary house door (it leads into a plain house interior) */
    SMITHY_DOOR: {
        sheet: 'objBlacksmithDoor',
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

/* ==========================================
   RESPAWNING: what grows back, and after how many in-game days.
   A tree you cut, a herb you pick, a stick, a flower or a rock you gather comes back this many days later (OverworldController schedules it through
   WorldManager.scheduleRespawn; WorldManager.expireRespawns brings it back). Anything not listed stays gone for good: ore deposits that hold iron,
   bones, chests, searched containers (a container only refills if it is listed in CONTAINER_REFILL_DAYS below) and every story object.
   Only the open world respawns things; houses and caves are built fresh from their seed and keep their own changes.
   ========================================== */
const HERB_DAYS = 7, TREE_DAYS = 7, SCRAP_DAYS = 7, ROCK_DAYS = 14;
export const RESPAWN_DAYS = {
    // trees (the stump goes with the cut tree)
    PINE_TREE: TREE_DAYS, SNOWY_PINE_TREE: TREE_DAYS, OAK_TREE_1: TREE_DAYS,
    // herbs and plants
    HEALING_HERB: HERB_DAYS, ALOE_PLANT: HERB_DAYS, INVIGORATING_HERB: HERB_DAYS, ILLUMINATING_HERB: HERB_DAYS,
    TULIPS_ORANGE: HERB_DAYS, TULIPS_WHITE: HERB_DAYS, TULIPS_RED: HERB_DAYS,
    // things lying on the ground
    STICK: SCRAP_DAYS, FLINT_ROCK: SCRAP_DAYS, SMALL_ROCKS_1: SCRAP_DAYS, SMALL_ROCKS_2: SCRAP_DAYS, SMALL_ROCKS_3: SCRAP_DAYS,
    SAND_DUNE_1: SCRAP_DAYS, SAND_DUNE_2: SCRAP_DAYS, SAND_DUNE_3: SCRAP_DAYS,
    // rock you mine (iron ore deposits are left out on purpose: they stay a finite, hard-won resource)
    BOULDER_1: ROCK_DAYS, BOULDER_2: ROCK_DAYS, SNOWY_BOULDER_1: ROCK_DAYS, SNOWY_BOULDER_2: ROCK_DAYS,
    COAL_DEPOSIT: ROCK_DAYS, COPPER_ORE_DEPOSIT: ROCK_DAYS, TIN_ORE_DEPOSIT: ROCK_DAYS, SALT_DEPOSIT: ROCK_DAYS
};
/* Containers you search (barrel, crate, wardrobe, sacks) refill after this many days. Left empty: searched containers stay searched. Add e.g. BARREL: 30 to refill them. */
export const CONTAINER_REFILL_DAYS = {};

for (const [id, days] of Object.entries(RESPAWN_DAYS)) {
    if (MAP_OBJECTS_DEFINITIONS[id]?.interaction) MAP_OBJECTS_DEFINITIONS[id].interaction.respawnDays = days;
}
for (const [id, days] of Object.entries(CONTAINER_REFILL_DAYS)) {
    if (MAP_OBJECTS_DEFINITIONS[id]?.interaction) MAP_OBJECTS_DEFINITIONS[id].interaction.refillDays = days;
}

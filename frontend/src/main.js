import { AssetLoader } from "./engine/assetLoader.js";
import { graphics } from './engine/graphics.js';
import { SceneManager } from "./engine/sceneManager.js";
import { GameLoop } from "./engine/gameLoop.js";
import { audioManager } from './engine/audioManager.js';
import { CONFIG } from "../../shared/core/constants.js";
import { gameState } from '../../shared/core/gameState.js';
import { aDisturbingSight } from "../../shared/story/encounters/aDisturbingSight.js";
import { runAuthGate } from './auth/authGate.js';

// Moved to top for clean imports
const assetLoader = new AssetLoader();

const ASSET_MANIFEST = {
title_bg: './assets/screens/title_bg.png',
shackle_breaker_theme_1: './assets/audio/music/Shackle_Breaker_Theme_1.mp3',
ui_icons: './assets/icons/ui_icons.png',

    plainsPrimaryFloor:     './assets/tilesets/plains/primary_floor_blob47.png',
    plainsSecondaryFloor:   './assets/tilesets/plains/secondary_floor_blob47.png',
    plainsSecondaryOnLevel: './assets/tilesets/plains/secondary_floor_on_level.png',
    plainsCliffFloor:       './assets/tilesets/plains/cliff_blob47_floor.png',
    plainsCliffWall:        './assets/tilesets/plains/cliff_blob47_wall.png',
    plainsCliffExt:         './assets/tilesets/plains/cliff_blob47_ext.png',
    plainsCliffShadow:      './assets/tilesets/plains/cliff_blob47_shadow.png',
    plainsWaterAnim:        './assets/tilesets/plains/water_blob47_anim.png',
    plainsWaterInterior:    './assets/tilesets/plains/water_interior_anim.png',
    plainsCliffStairs: './assets/tilesets/plains/cliff_stairs.png',   // after plainsCliffShadow


    /* desert */
    desertPrimaryFloor:     './assets/tilesets/desert/primary_floor_blob47.png',
    desertSecondaryFloor:   './assets/tilesets/desert/secondary_floor_blob47.png',
    desertSecondaryOnLevel: './assets/tilesets/desert/secondary_floor_on_level.png',
    desertCliffFloor:       './assets/tilesets/desert/cliff_blob47_floor.png',
    desertCliffWall:        './assets/tilesets/desert/cliff_blob47_wall.png',
    desertCliffExt:         './assets/tilesets/desert/cliff_blob47_ext.png',
    desertCliffShadow:      './assets/tilesets/desert/cliff_blob47_shadow.png',
    desertWaterAnim:        './assets/tilesets/desert/water_blob47_anim.png',
    desertWaterInterior:    './assets/tilesets/desert/water_interior_anim.png',
    desertCliffStairs: './assets/tilesets/desert/cliff_stairs.png',   // after desertCliffShadow

    /* snow mountains */
    snowyMountainsPrimaryFloor:     './assets/tilesets/snowy_mountains/primary_floor_blob47.png',
    snowyMountainsSecondaryFloor:   './assets/tilesets/snowy_mountains/secondary_floor_blob47.png',
    snowyMountainsSecondaryOnLevel: './assets/tilesets/snowy_mountains/secondary_floor_on_level.png',
    snowyMountainsCliffFloor:       './assets/tilesets/snowy_mountains/cliff_blob47_floor.png',
    snowyMountainsCliffWall:        './assets/tilesets/snowy_mountains/cliff_blob47_wall.png',
    snowyMountainsCliffExt:         './assets/tilesets/snowy_mountains/cliff_blob47_ext.png',
    snowyMountainsCliffShadow:      './assets/tilesets/snowy_mountains/cliff_blob47_shadow.png',
    snowyMountainsWaterAnim:        './assets/tilesets/snowy_mountains/water_blob47_anim.png',
    snowyMountainsRiverShore:       './assets/tilesets/snowy_mountains/river_shore_blob47_anim.png',
    snowyMountainsWaterInterior:    './assets/tilesets/snowy_mountains/water_interior_anim.png',
    snowyMountainsCliffStairs:      './assets/tilesets/snowy_mountains/cliff_stairs.png',   // after snowyMountainsCliffShadow

    /* house interior (no water: LAYER_0 is void) */
    houseInteriorPrimaryFloor:'./assets/tilesets/house_interior/primary_floor_blob47.png',
    houseInteriorSecondaryFloor:'./assets/tilesets/house_interior/secondary_floor_blob47.png',
    houseInteriorSecondaryOnLevel:'./assets/tilesets/house_interior/secondary_floor_on_level.png',
    houseInteriorCliffFloor:'./assets/tilesets/house_interior/cliff_blob47_floor.png',
    houseInteriorCliffWall: './assets/tilesets/house_interior/cliff_blob47_wall.png',
    houseInteriorCliffExt:  './assets/tilesets/house_interior/cliff_blob47_ext.png',
    houseInteriorCliffShadow:'./assets/tilesets/house_interior/cliff_blob47_shadow.png',

    /* cave interior (no water: LAYER_0 is void) */
    caveInteriorPrimaryFloor:     './assets/tilesets/cave_interior/primary_floor_blob47.png',
    caveInteriorSecondaryFloor:   './assets/tilesets/cave_interior/secondary_floor_blob47.png',
    caveInteriorSecondaryOnLevel: './assets/tilesets/cave_interior/secondary_floor_on_level.png',
    caveInteriorCliffFloor:       './assets/tilesets/cave_interior/cliff_blob47_floor.png',
    caveInteriorCliffWall:        './assets/tilesets/cave_interior/cliff_blob47_wall.png',
    caveInteriorCliffExt:         './assets/tilesets/cave_interior/cliff_blob47_ext.png',
    caveInteriorCliffShadow:      './assets/tilesets/cave_interior/cliff_blob47_shadow.png',
    caveInteriorCliffStairs:      './assets/tilesets/cave_interior/cliff_stairs.png',   // after caveInteriorCliffShadow
    // the catacombs under the mysterious altar: the cave's tiles made into crypt stone (bricked walls, flagstones, bones, grave soil), darker
    catacombsPrimaryFloor:     './assets/tilesets/catacombs_interior/primary_floor_blob47.png',
    catacombsSecondaryFloor:   './assets/tilesets/catacombs_interior/secondary_floor_blob47.png',
    catacombsSecondaryOnLevel: './assets/tilesets/catacombs_interior/secondary_floor_on_level.png',
    catacombsCliffFloor:       './assets/tilesets/catacombs_interior/cliff_blob47_floor.png',
    catacombsCliffWall:        './assets/tilesets/catacombs_interior/cliff_blob47_wall.png',
    catacombsCliffExt:         './assets/tilesets/catacombs_interior/cliff_blob47_ext.png',
    catacombsCliffShadow:      './assets/tilesets/catacombs_interior/cliff_blob47_shadow.png',
    catacombsCliffStairs:      './assets/tilesets/catacombs_interior/cliff_stairs.png',

    /* map objects: one image per object (the `sheet` of each MAP_OBJECTS_DEFINITIONS entry). Delete the line of any object whose PNG does not exist yet;
       that object then keeps drawing from the plains / desert sheet above. */
    objGrassCoverage1: './assets/mapObjects/objGrassCoverage1.png',
    objGrassCoverage2: './assets/mapObjects/objGrassCoverage2.png',
    objGrassCoverage3: './assets/mapObjects/objGrassCoverage3.png',
    objTulipsOrange: './assets/mapObjects/objTulipsOrange.png',
    objTulipsWhite: './assets/mapObjects/objTulipsWhite.png',
    objTulipsRed: './assets/mapObjects/objTulipsRed.png',
    objSmallRocks1: './assets/mapObjects/objSmallRocks1.png',
    objSmallRocks1Desert: './assets/mapObjects/objSmallRocks1Desert.png',
    objSmallRocks1Snow: './assets/mapObjects/objSmallRocks1Snow.png',
    objSmallRocks2: './assets/mapObjects/objSmallRocks2.png',
    objSmallRocks2Desert: './assets/mapObjects/objSmallRocks2Desert.png',
    objSmallRocks2Snow: './assets/mapObjects/objSmallRocks2Snow.png',
    objSmallRocks3: './assets/mapObjects/objSmallRocks3.png',
    objSmallRocks3Desert: './assets/mapObjects/objSmallRocks3Desert.png',
    objSmallRocks3Snow: './assets/mapObjects/objSmallRocks3Snow.png',
    objStick: './assets/mapObjects/objStick.png',
    objAftermath: './assets/mapObjects/objAftermath.png',
    objFallenSoldier1: './assets/mapObjects/fallen_soldiers/objFallenSoldier1.png',   // the battlefield's dead (BATTLEFIELD in structures.js): 1-8 slumped, 9-15 lying
    objFallenSoldier2: './assets/mapObjects/fallen_soldiers/objFallenSoldier2.png',
    objFallenSoldier3: './assets/mapObjects/fallen_soldiers/objFallenSoldier3.png',
    objFallenSoldier4: './assets/mapObjects/fallen_soldiers/objFallenSoldier4.png',
    objFallenSoldier5: './assets/mapObjects/fallen_soldiers/objFallenSoldier5.png',
    objFallenSoldier6: './assets/mapObjects/fallen_soldiers/objFallenSoldier6.png',
    objFallenSoldier7: './assets/mapObjects/fallen_soldiers/objFallenSoldier7.png',
    objFallenSoldier8: './assets/mapObjects/fallen_soldiers/objFallenSoldier8.png',
    objFallenSoldier9: './assets/mapObjects/fallen_soldiers/objFallenSoldier9.png',
    objFallenSoldier10: './assets/mapObjects/fallen_soldiers/objFallenSoldier10.png',
    objFallenSoldier11: './assets/mapObjects/fallen_soldiers/objFallenSoldier11.png',
    objFallenSoldier12: './assets/mapObjects/fallen_soldiers/objFallenSoldier12.png',
    objFallenSoldier13: './assets/mapObjects/fallen_soldiers/objFallenSoldier13.png',
    objFallenSoldier14: './assets/mapObjects/fallen_soldiers/objFallenSoldier14.png',
    objFallenSoldier15: './assets/mapObjects/fallen_soldiers/objFallenSoldier15.png',
    objSandDune1: './assets/mapObjects/objSandDune1.png',
    objSandDune2: './assets/mapObjects/objSandDune2.png',
    objSandDune3: './assets/mapObjects/objSandDune3.png',
    objDesertSkull: './assets/mapObjects/objDesertSkull.png',
    objBonePile: './assets/mapObjects/objBonePile.png',
    objAbandonedHouse1: './assets/mapObjects/objAbandonedHouse1.png',
    objAbandonedStoneHouse: './assets/mapObjects/objAbandonedStoneHouse.png',
    objStoneWorkshop: './assets/mapObjects/objStoneWorkshop.png',   // the stone house as the workshop: lit windows, a smouldering chimney
    objCraftingHouse: './assets/mapObjects/objCraftingHouse.png',
    objAbandonedSmithy: './assets/mapObjects/objAbandonedSmithy.png',
    objAbandonedHouse1Left: './assets/mapObjects/objAbandonedHouse1Left.png',
    objAbandonedHouse1Right: './assets/mapObjects/objAbandonedHouse1Right.png',
    objAbandonedStoneHouseLeft: './assets/mapObjects/objAbandonedStoneHouseLeft.png',
    objAbandonedStoneHouseRight: './assets/mapObjects/objAbandonedStoneHouseRight.png',
    objAbandonedSmithyLeft: './assets/mapObjects/objAbandonedSmithyLeft.png',
    objAbandonedSmithyRight: './assets/mapObjects/objAbandonedSmithyRight.png',
    objCraftingHouseLeft: './assets/mapObjects/objCraftingHouseLeft.png',
    objCraftingHouseRight: './assets/mapObjects/objCraftingHouseRight.png',
    objWoodenFence: './assets/mapObjects/objWoodenFence.png',                 // 32 frames: the post joined to each neighbouring fence (shared/world/fenceConnections.js)
    objWoodenFenceFallen: './assets/mapObjects/objWoodenFenceFallen.png',
    objBoulder1: './assets/mapObjects/objBoulder1.png',
    objBoulder2: './assets/mapObjects/objBoulder2.png',
    objSnowyBoulder1: './assets/mapObjects/objSnowyBoulder1.png',
    objSnowyBoulder2: './assets/mapObjects/objSnowyBoulder2.png',
    objCoalDeposit: './assets/mapObjects/objCoalDeposit.png',
    objIronOreDeposit: './assets/mapObjects/objIronOreDeposit.png',
    objIronOreDepositSnow: './assets/mapObjects/objIronOreDepositSnow.png',
    objCopperOreDeposit: './assets/mapObjects/objCopperOreDeposit.png',
    objTinOreDeposit: './assets/mapObjects/objTinOreDeposit.png',
    objSaltDeposit: './assets/mapObjects/objSaltDeposit.png',
    objAnimalTracks: './assets/mapObjects/objAnimalTracks.png',
    objWoodenChest: './assets/mapObjects/objWoodenChest.png',
    objIronChest: './assets/mapObjects/objIronChest.png',
    objPineTree: './assets/mapObjects/objPineTree.png',
    objPineTreeSnow: './assets/mapObjects/objPineTreeSnow.png',
    objOakTree1: './assets/mapObjects/objOakTree1.png',
    objTreeStump: './assets/mapObjects/objTreeStump.png',
    objTreeStumpSnow: './assets/mapObjects/objTreeStumpSnow.png',
    objMediumCactus1: './assets/mapObjects/objMediumCactus1.png',
    objSmallCactus1: './assets/mapObjects/objSmallCactus1.png',
    objStrangeObelisk: './assets/mapObjects/objStrangeObelisk.png',
    objMysteriousAltar: './assets/mapObjects/objMysteriousAltar.png',
    objScarecrow: './assets/mapObjects/objScarecrow.png',
    objTombstone: './assets/mapObjects/objTombstone.png',
    objCursedGrave: './assets/mapObjects/objCursedGrave.png',   // a beaten multiplayer party's grave (PLAYER_GRAVE): the tombstone, cursed
    objCaveEntrance: './assets/mapObjects/objCaveEntrance.png',
    objCaveEntranceDesert: './assets/mapObjects/objCaveEntranceDesert.png',
    objCaveEntranceSnow: './assets/mapObjects/objCaveEntranceSnow.png',
    objCaveExit: './assets/mapObjects/objCaveExit.png',
    objCatacombsStairs: './assets/mapObjects/objCatacombsStairs.png',   // the hidden staircase under the mysterious altar
    objCatacombsExit: './assets/mapObjects/objCatacombsExit.png',       // the stairway up out of the catacombs
    objLever: './assets/mapObjects/objLever.png',                       // the catacombs' gate puzzle (world/catacombPuzzle.js)
    objLeverOn: './assets/mapObjects/objLeverOn.png',
    objBrazierUnlit: './assets/mapObjects/objBrazierUnlit.png',
    objCatacombGate: './assets/mapObjects/objCatacombGate.png',
    objCatacombGateOpen: './assets/mapObjects/objCatacombGateOpen.png',
    objVaultDoor: './assets/mapObjects/objVaultDoor.png',               // the catacombs' locked vault (story/encounters/catacombDepths.js)
    objVaultDoorOpen: './assets/mapObjects/objVaultDoorOpen.png',
    objTrapArrow: './assets/mapObjects/objTrapArrow.png',               // the catacombs' traps (story/encounters/catacombTraps.js)
    objTrapArrowSprung: './assets/mapObjects/objTrapArrowSprung.png',
    objTrapPit: './assets/mapObjects/objTrapPit.png',
    objTrapPitSprung: './assets/mapObjects/objTrapPitSprung.png',
    objTrapAxes: './assets/mapObjects/objTrapAxes.png',
    objTrapAxesSprung: './assets/mapObjects/objTrapAxesSprung.png',
    objAncientBarrel: './assets/mapObjects/objAncientBarrel.png',       // the catacombs' barrels
    objRuinedBarrel: './assets/mapObjects/objRuinedBarrel.png',
    objHealingHerb: './assets/mapObjects/objHealingHerb.png',
    objCottonPlant: './assets/mapObjects/objCottonPlant.png',   // a village crop field's cotton (COTTON_PLANT)
    objWheatPlant: './assets/mapObjects/objWheatPlant.png',     // ... and its wheat (WHEAT_PLANT)
    objAloe: './assets/mapObjects/objAloe.png',
    objInvigoratingHerb: './assets/mapObjects/objInvigoratingHerb.png',
    objIlluminatingHerb: './assets/mapObjects/objIlluminatingHerb.png',
    objAnvil: './assets/mapObjects/objAnvil.png',
    objForge: './assets/mapObjects/objForge.png',
    objCarpentersBench: './assets/mapObjects/objCarpentersBench.png',
    objStoneBanker: './assets/mapObjects/objStoneBanker.png',
    objTailorsBench: './assets/mapObjects/objTailorsBench.png',
    objCampfire: './assets/mapObjects/objCampfire.png',
    objStandingTorch: './assets/mapObjects/objStandingTorch.png',
        objWaypointAlterian: './assets/mapObjects/objWaypointAlterian.png',
        objWaypointPanzerian: './assets/mapObjects/objWaypointPanzerian.png',
        objWaypointNamuh: './assets/mapObjects/objWaypointNamuh.png',
    objHouseDoorWooden: './assets/mapObjects/objHouseDoorWooden.png',
    objHouseExitDoor: './assets/mapObjects/objHouseExitDoor.png',
    objBlacksmithDoor: './assets/mapObjects/objBlacksmithDoor.png',
    objCarpenterDoor: './assets/mapObjects/objCarpenterDoor.png',
    objMasonDoor: './assets/mapObjects/objMasonDoor.png',
    objTailorDoor: './assets/mapObjects/objTailorDoor.png',
     objFlintRock: './assets/mapObjects/objFlintRock.png',
    objFlintRockSnow: './assets/mapObjects/objFlintRockSnow.png',
    /* house furniture (HouseGenerator / CraftingHouseGenerator) */
    objBarrel: './assets/mapObjects/objBarrel.png',
    objBedBlue: './assets/mapObjects/objBedBlue.png',
    objBedRed: './assets/mapObjects/objBedRed.png',
    objBookshelf: './assets/mapObjects/objBookshelf.png',
    objCandelabra: './assets/mapObjects/objCandelabra.png',
    objChair: './assets/mapObjects/objChair.png',
    objCounter: './assets/mapObjects/objCounter.png',
    objCrate: './assets/mapObjects/objCrate.png',
    objCrateSack: './assets/mapObjects/objCrateSack.png',
    objDoormat: './assets/mapObjects/objDoormat.png',
    objFireplace: './assets/mapObjects/objFireplace.png',
    objPottedPlant: './assets/mapObjects/objPottedPlant.png',
    objRugGreen: './assets/mapObjects/objRugGreen.png',
    objRugLong: './assets/mapObjects/objRugLong.png',
    objRugSmall: './assets/mapObjects/objRugSmall.png',
    objSacks: './assets/mapObjects/objSacks.png',
    objSmallTable: './assets/mapObjects/objSmallTable.png',
    objStool: './assets/mapObjects/objStool.png',
    objTableLong: './assets/mapObjects/objTableLong.png',
    objWardrobe: './assets/mapObjects/objWardrobe.png',

    spritesheet: './assets/sprites/hero.png',

    legionaryHeroPortrait: './assets/sprites/legionary_hero/legionary_hero_portrait.png',
    // the female version of each hero look (character creator: the Male / Female button). Blank placeholders for now, the same size as the male sheets.
    legionaryHeroFemalePortrait: './assets/sprites/legionary_hero/legionary_hero_female_portrait.png',
    legionaryHeroFemaleSprite: './assets/sprites/legionary_hero/legionary_hero_female_sprite.png',
    warlordHeroFemalePortrait: './assets/sprites/warlord_hero/warlord_hero_female_portrait.png',
    warlordHeroFemaleSprite: './assets/sprites/warlord_hero/warlord_hero_female_sprite.png',
    nightbladeHeroFemalePortrait: './assets/sprites/nightblade_hero/nightblade_hero_female_portrait.png',
    nightbladeHeroFemaleSprite: './assets/sprites/nightblade_hero/nightblade_hero_female_sprite.png',
    avalancherHeroFemalePortrait: './assets/sprites/avalancher_hero/avalancher_hero_female_portrait.png',
    avalancherHeroFemaleSprite: './assets/sprites/avalancher_hero/avalancher_hero_female_sprite.png',
    legionaryCompanionPortrait: './assets/sprites/legionary_companion/legionary_companion_portrait.png',
    warlordHeroPortrait: './assets/sprites/warlord_hero/warlord_hero_portrait.png',
    nightbladeHeroPortrait: './assets/sprites/nightblade_hero/nightblade_hero_portrait.png',
    legionaryHeroSprite: './assets/sprites/legionary_hero/legionary_hero_sprite.png',
    legionaryCompanionSprite: './assets/sprites/legionary_companion/legionary_companion_sprite.png',
    warlordHeroSprite: './assets/sprites/warlord_hero/warlord_hero_sprite.png',
    nightbladeHeroSprite: './assets/sprites/nightblade_hero/nightblade_hero_sprite.png',
    madmanSprite: './assets/sprites/madman/madman_sprite.png',
    shadyMerchantSprite: './assets/sprites/shady_merchant/shady_merchant_spritesheet.png',
    infernusSentinelSprite: './assets/sprites/infernus_sentinel/infernus_sentinel_sprite.png',   // the catacombs' boss as its map object draws it (128 px frames, a still statue)
    hoodedStrangerSprite: './assets/sprites/hooded_stranger/hooded_stranger_sprite.png',   // the quest giver in a village workshop (one front frame; tools/art/overworldSheetFromFrame.py)
    snowLeopardSprite: './assets/sprites/snow_leopard/snow_leopard_sprite.png',
    artificerHeroPortrait: './assets/sprites/artificer_hero/artificer_hero_portrait.png',
    avalancherHeroPortrait: './assets/sprites/avalancher_hero/avalancher_hero_portrait.png',
    avalancherHeroSprite: './assets/sprites/avalancher_hero/avalancher_hero_sprite.png',   // made from its 8-direction idle frames (idle, walk and run rows like every hero sheet)
    shadowCasterHeroPortrait: './assets/sprites/shadow_caster_hero/shadow_caster_hero_portrait.png',

    legionaryPortrait: './assets/sprites/legionary/legionary_portrait.png',
    watchmanPortrait: './assets/sprites/watchman/watchman_portrait.png',
    wolfPortrait: './assets/sprites/wolf/wolf_portrait.png',
    snowLeopardPortrait: './assets/sprites/snow_leopard/snow_leopard_portrait.png',
    caveSpiderPortrait: './assets/sprites/cave_spider/cave_spider_portrait.png',
    madmanPortrait: './assets/sprites/madman/madman_portrait.png',
    arcKnightPortrait: './assets/sprites/arc_knight/arc_knight_portrait.png',
    magicAddictPortrait: './assets/sprites/magic_addict/magic_addict_portrait.png',
    rotterPortrait: './assets/sprites/rotter/rotter_portrait.png',
    germanSheepherdSprite: './assets/sprites/dogs/german_sheepherd_sprite.png',
    germanSheepherdPortrait: './assets/sprites/dogs/german_sheepherd_portrait.png',
    hawkPortrait: './assets/sprites/hawk/hawk_portrait.png',   // the hunting hawk companion: battle sheet (rows 0-1 facing left, 4-5 facing right)
    hawkSprite: './assets/sprites/hawk/hawk_sprite.png',       // its map sheet: it hovers over its shadow
    shackledSteedPortrait: './assets/sprites/shackled_steed/shackled_steed_portrait.png',
    sandStalkerPortrait: './assets/sprites/sand_stalker/sand_stalker_portrait.png',
    grimStagPortrait: './assets/sprites/grim_stag/grim_stag_portrait.png',
    poachersNightmarePortrait: './assets/sprites/poachers_nightmare/poachers_nightmare_portrait.png',
    hollowHarvesterPortrait: './assets/sprites/hollow_harvester/hollow_harvester_portrait.png',
    skeletalWarriorPortrait: './assets/sprites/skeletal_warrior/skeletal_warrior_portrait.png',
    floatingSkullPortrait: './assets/sprites/floating_skull/floating_skull_portrait.png',
    shackledSpiritPortrait: './assets/sprites/shackled_spirit/shackled_spirit_portrait.png',
    ancientCultistPortrait: './assets/sprites/ancient_cultist/ancient_cultist_portrait.png',
    infernusSentinelPortrait: './assets/sprites/infernus_sentinel/infernus_sentinel_portrait.png',
    frozenTrapperPortrait: './assets/sprites/frozen_trapper/frozen_trapper_portrait.png',
    panzerkamferPortrait: './assets/sprites/panzerkamfer/panzerkamfer_portrait.png',
duneMawPortrait: './assets/sprites/dune_maw/dune_maw_portrait.png',
iceCoilPortrait: './assets/sprites/icecoil/icecoil_portrait.png',   // the Icecoil's battle sheet (16 x 6 frames of 128: rows 0-1 idle facing the party, side-on; rows 4-5 its other pose)
scorchedVagrantPortrait: './assets/sprites/scorched_vagrant/scorched_vagrant_portrait.png',
miragewrightPortrait: './assets/sprites/miragewright/miragewright_portrait.png',
calcifiedCrusaderPortrait: './assets/sprites/calcified_crusader/calcified_crusader_portrait.png',
shadyMerchantPortrait: './assets/sprites/shady_merchant/shady_merchant_portrait.png',
thunderLocustPortrait: './assets/sprites/thunder_locust/thunder_locust_portrait.png',
dariusTheGrovelerPortrait:'./assets/sprites/darius_the_groveler/darius_the_groveler_portrait.png',
// UI / Icon Atlases
    weapons: './assets/icons/weapons.png',
    armor: './assets/icons/armor.png',
    consumables: './assets/icons/consumables.png',
    materials: './assets/icons/materials.png',
    abilities: './assets/icons/abilities.png',
    statusEffects: './assets/icons/status_effects.png',
    battleProjectiles: './assets/icons/battle_projectiles.png',

    // --- 1:1 ABILITY ANIMATIONS ---
    acidPoolAnimation: './assets/abilityAnimations/acid_pool.png',
    acidicSmogAnimation: './assets/abilityAnimations/acidic_smog.png',
    arcaneDartAnimation: './assets/abilityAnimations/arcane_dart.png',
    arcaneBlastAnimation: './assets/abilityAnimations/arcane_blast.png',
    biteAnimation: './assets/abilityAnimations/bite.png',
    bleedAnimation: './assets/abilityAnimations/bleed.png',
    burnAnimation: './assets/abilityAnimations/burn.png',
    clawAnimation: './assets/abilityAnimations/claw.png',
    earthquakeAnimation: './assets/abilityAnimations/earthquake.png',
    eviscerateAnimation: './assets/abilityAnimations/eviscerate.png',
    firePunchAnimation: './assets/abilityAnimations/fire_punch.png',
    fireballAnimation: './assets/abilityAnimations/fireball.png',
    frozenAnimation: './assets/abilityAnimations/frozen.png',
    poisonAnimation: './assets/abilityAnimations/poison.png',
    punchAnimation: './assets/abilityAnimations/punch.png',
    shockAnimation: './assets/abilityAnimations/shock.png',
    slashAnimation: './assets/abilityAnimations/slash.png',
    thrustAnimation: './assets/abilityAnimations/thrust.png',
    throwingKnifeAnimation: './assets/abilityAnimations/throwing_knife.png',
    poisonKnifeAnimation: './assets/abilityAnimations/poison_throwing_knife.png',
    strikeAnimation: './assets/abilityAnimations/strike.png',
    uppercutAnimation: './assets/abilityAnimations/uppercut.png',
    vineLashAnimation: './assets/abilityAnimations/vine_lash.png',
    spiritReapAnimation: './assets/abilityAnimations/spirit_reap.png',
    iceBoltAnimation: './assets/abilityAnimations/ice_bolt.png',
    impactAnimation: './assets/abilityAnimations/impact.png',
    // Bow abilities: the projectile is a straight copy of the ability's own icon; the *Impact sheets are 4 frames of 64px.
    looseArrowAnimation: './assets/abilityAnimations/loose_arrow.png',
    looseArrowImpactAnimation: './assets/abilityAnimations/loose_arrow_impact.png',
    quickDrawAnimation: './assets/abilityAnimations/quick_draw.png',
    quickDrawImpactAnimation: './assets/abilityAnimations/quick_draw_impact.png',
    poisonedArrowAnimation: './assets/abilityAnimations/poisoned_arrow.png',
    poisonedArrowImpactAnimation: './assets/abilityAnimations/poisoned_arrow_impact.png',
    waterBlastAnimation: './assets/abilityAnimations/water_blast.png',
    bolsterAnimation: './assets/abilityAnimations/bolster.png',
    cleaveAnimation: './assets/abilityAnimations/cleave.png',
    wildSwingAnimation: './assets/abilityAnimations/wild_swing.png',
    whirlwindSlashAnimation: './assets/abilityAnimations/whirlwind_slash.png',
    lowSweepAnimation: './assets/abilityAnimations/low_sweep.png',
    leapingSlashAnimation: './assets/abilityAnimations/leaping_slash.png',
    guardBreakAnimation: './assets/abilityAnimations/guard_break.png',
    vulnerableAnimation: './assets/abilityAnimations/vulnerable.png',
    purifyAnimation: './assets/abilityAnimations/purify.png',
    meteorShowerAnimation: './assets/abilityAnimations/meteor_shower.png',
    frigidGaleAnimation: './assets/abilityAnimations/frigid_gale.png',
    flamethrowerAnimation: './assets/abilityAnimations/flamethrower.png',
    waterfallAnimation: './assets/abilityAnimations/waterfall.png',
    overloadAnimation: './assets/abilityAnimations/overload.png',
    spiteAnimation: './assets/abilityAnimations/spite.png',
    boulderThrowAnimation: './assets/abilityAnimations/boulder_throw.png',
    quickStabAnimation: './assets/abilityAnimations/quick_stab.png',
    boundAnimation: './assets/abilityAnimations/bound.png',
    sluggishAnimation: './assets/abilityAnimations/sluggish.png',
    intimidateAnimation: './assets/abilityAnimations/intimidate.png',
    rallyAnimation: './assets/abilityAnimations/rally.png',
    smokeAnimation: './assets/abilityAnimations/smoke.png',

    // Backgrounds
    arcaneVortexBg: './assets/backgrounds/arcane_vortex_bg.png',
    voidBackground: './assets/backgrounds/void_bg.png',
    plainsBattleDayBg: './assets/backgrounds/plains_battle_day_bg.jpg',
    plainsBattleDuskBg: './assets/backgrounds/plains_battle_dusk_bg.png',
    plainsBattleNightBg: './assets/backgrounds/plains_battle_night_bg.png',
    desertBattleDayBg: './assets/backgrounds/desert_battle_day_bg.png',
    desertBattleDuskBg: './assets/backgrounds/desert_battle_dusk_bg.png',
    desertBattleNightBg: './assets/backgrounds/desert_battle_night_bg.png',
    poachersNightmareBg: './assets/backgrounds/poachers_nightmare_bg.png',
    snowyMountainsBattleDayBg: './assets/backgrounds/snowy_mountains_battle_day_bg.png',
    snowyMountainsBattleDuskBg: './assets/backgrounds/snowy_mountains_battle_dusk_bg.png',
    snowyMountainsBattleNightBg: './assets/backgrounds/snowy_mountains_battle_night_bg.png',
    caveBattleBg: './assets/backgrounds/cave_battle_bg.png', // one background for every hour: it is always dark down there
    shackle_breaker_theme_1: './assets/audio/music/Shackle_Breaker_Theme_1.mp3',
    shackledMarchBgm: './assets/audio/music/shackled_march.mp3',
    prologueMarch: './assets/audio/sfx/encounters/story/prologue/prologue_march.wav',
    prologueWind: './assets/audio/sfx/encounters/story/prologue/prologue_wind.wav',
    chainSnap: './assets/audio/sfx/encounters/story/prologue/chain_snap.mp3',
    heartbeat: './assets/audio/sfx/encounters/story/prologue/heartbeat.mp3',
    // --- ENCOUNTER AMBIENCE (loops) AND STAGE SOUNDS (see the cues in data/encounters/*.js) ---
    fireCrackle: './assets/audio/sfx/encounters/fire_crackle.wav',
    forestNight: './assets/audio/sfx/encounters/forest_night.wav',
    snowWind: './assets/audio/sfx/encounters/snow_wind.wav',
    obeliskHum: './assets/audio/sfx/encounters/obelisk_hum.wav',
    altarDrone: './assets/audio/sfx/encounters/story/altar_drone.wav',
    battlefieldWind: './assets/audio/sfx/encounters/battlefield_wind.wav',
    twigSnap: './assets/audio/sfx/encounters/twig_snap.mp3',
    stoneGrind: './assets/audio/sfx/encounters/stone_grind.mp3',
    glyphChime: './assets/audio/sfx/encounters/glyph_chime.mp3',
    gemChime: './assets/audio/sfx/encounters/gem_chime.mp3',
    chestCreak: './assets/audio/sfx/encounters/chest_creak.mp3',
    lockClick: './assets/audio/sfx/encounters/lock_click.mp3',
    chestOpen: './assets/audio/sfx/encounters/chest_open.mp3',
    chestBlast: './assets/audio/sfx/encounters/chest_blast.mp3',
    bonesRattle: './assets/audio/sfx/encounters/bones_rattle.mp3',
    arrowHit: './assets/audio/sfx/encounters/arrow_hit.mp3',
    rockThud: './assets/audio/sfx/encounters/rock_thud.mp3',
    glowSwell: './assets/audio/sfx/encounters/glow_swell.mp3',
    whispers: './assets/audio/sfx/encounters/whispers.mp3',
    hoofbeats: './assets/audio/sfx/encounters/hoofbeats.mp3',
    snowSteps: './assets/audio/sfx/encounters/snow_steps.mp3',

    //Encounters
    encounter_wounded_mutt: './assets/icons/encounters/wounded_mutt.png',
    encounter_a_disturbing_sight: './assets/icons/encounters/a_disturbing_sight.png',
    encounter_bonfire: './assets/icons/encounters/bonfire.png',
    encounter_wild_hunt: './assets/icons/encounters/wild_hunt.png',
    encounter_treasure_chest: './assets/icons/encounters/treasure_chest.png',
    encounter_strange_obelisk: './assets/icons/encounters/strange_obelisk.png',
    encounter_mysterious_altar: './assets/icons/encounters/story/mysterious_altar.png',
    encounter_darius_approach: './assets/icons/encounters/story/darius_approach.png',   // Darius bowed over the altar, as you find him
    encounter_darius_kneeling: './assets/icons/encounters/story/darius_kneeling.png',   // Darius turned to face you, crowned: only when he turns on you, right before the fight
    encounter_darius_defeated: './assets/icons/encounters/story/darius_defeated.png',
    encounter_hooded_stranger: './assets/icons/encounters/story/hooded_stranger.png',   // the Hooded Stranger, arms folded (story/encounters/story/hoodedStranger.js)   // Darius slumped over the altar (act_two)
    encounter_old_gravestone: './assets/icons/encounters/old_gravestone.png',
    encounter_suspicious_merchant: './assets/icons/encounters/suspicious_merchant.png',
    encounter_aftermath: './assets/icons/encounters/aftermath.png',
    encounter_tracks_in_the_snow: './assets/icons/encounters/tracks_in_the_snow.png',
    encounter_prologue: './assets/icons/encounters/story/prologue.png',
    encounter_peculiar_scarecrow: './assets/icons/encounters/peculiar_scarecrow.png',
    encounter_cave_in: './assets/icons/encounters/cave_in.png',
    encounter_catacomb_traps: './assets/icons/encounters/catacomb_traps.png',
    encounter_catacomb_depths: './assets/icons/encounters/catacomb_depths.png',   // the vault door and the Infernus Sentinel (story/encounters/catacombDepths.js)
    // --- 1:1 ABILITY AUDIO SFX ---
    earthquake1Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_1.mp3',
    earthquake2Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_2.mp3',
    earthquake3Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_3.mp3',
    fireballCastSfx: './assets/audio/sfx/abilities/fireball/fireball_cast.mp3',
    fireballImpactSfx: './assets/audio/sfx/abilities/fireball/fireball_impact.mp3',
    acidPoolSfx: './assets/audio/sfx/abilities/acid_pool.mp3',
    healSfx: './assets/audio/sfx/abilities/heal.mp3',
    darkMagicSFX: './assets/audio/sfx/abilities/dark_magic.mp3',
    firePunchSfx: './assets/audio/sfx/abilities/fire_punch.mp3',
    bowReleaseSfx: './assets/audio/sfx/abilities/bow_release.mp3',
    arrowImpactSfx: './assets/audio/sfx/abilities/arrow_impact.mp3',
    poisonSplashSfx: './assets/audio/sfx/abilities/poison_splash.mp3',
    shockZapSfx: './assets/audio/sfx/abilities/shock_zap.mp3',
    arcaneDartSfx: './assets/audio/sfx/abilities/arcane_dart.mp3',
    cleaveSfx: './assets/audio/sfx/abilities/cleave.mp3',
    crunchSfx: './assets/audio/sfx/abilities/crunch.mp3',
    punchSfx: './assets/audio/sfx/abilities/punch.mp3',
    restSfx: './assets/audio/sfx/abilities/rest.mp3',
    retreatSfx: './assets/audio/sfx/abilities/retreat.mp3',
    shockSfx: './assets/audio/sfx/abilities/shock.mp3',
    slashSfx: './assets/audio/sfx/abilities/slash.mp3',
    thrustSfx: './assets/audio/sfx/abilities/thrust.mp3',
    strikeSfx: './assets/audio/sfx/abilities/strike.mp3',
    eviscerateSfx: './assets/audio/sfx/abilities/eviscerate.mp3',
    spiritReapSfx: './assets/audio/sfx/abilities/spirit_reap.mp3',
    iceBoltCastSfx: './assets/audio/sfx/abilities/ice_bolt/ice_bolt_cast.mp3',
    iceBoltImpactSfx: './assets/audio/sfx/abilities/ice_bolt/ice_bolt_impact.mp3',
    clawSfx: './assets/audio/sfx/abilities/claw.mp3',
    vineLashSfx: './assets/audio/sfx/abilities/vine_lash.mp3',
    recklessChargeApproachSfx: './assets/audio/sfx/abilities/reckless_charge/reckless_charge_approach.mp3',
    recklessChargeImpactSfx: './assets/audio/sfx/abilities/reckless_charge/reckless_charge_impact.mp3',
    waterBlastSfx: './assets/audio/sfx/abilities/water_blast.mp3',
    cleaveSfx: './assets/audio/sfx/abilities/cleave.mp3',
    wildSwingSfx: './assets/audio/sfx/abilities/wild_swing.mp3',
    purifySfx: './assets/audio/sfx/abilities/purify.mp3',
    lightShimmerSfx: './assets/audio/sfx/abilities/light_shimmer.mp3',   // glistening fairy dust: the holy abilities (Cleanse, Purify, Bless, Solar Beam)
    lightBellSfx: './assets/audio/sfx/abilities/light_bell.mp3',         // an ominous church bell: the same, as the light lands
    meteorShowerImpactSfx: './assets/audio/sfx/abilities/meteor_shower/meteor_shower_impact.mp3',
    quickStabSfx: './assets/audio/sfx/abilities/quick_stab.mp3',
    spiteCastSfx: './assets/audio/sfx/abilities/spite/spite_cast.mp3',
    rallySfx: './assets/audio/sfx/abilities/rally.mp3',
    smokeSfx: './assets/audio/sfx/abilities/smoke.mp3',
    intimidateSfx: './assets/audio/sfx/abilities/intimidate.mp3',
    
    //BATTLE STATUS AND WEATHER SFX
    poisonSfx: './assets/audio/sfx/statusEffects/poison.mp3',
    paralyzedSfx: './assets/audio/sfx/statusEffects/paralyzed.mp3',
    bleedSfx: './assets/audio/sfx/statusEffects/bleed.mp3',
    frozenSfx: './assets/audio/sfx/statusEffects/frozen.mp3',
    burnSfx: './assets/audio/sfx/statusEffects/burn.mp3',

    // --- GLOBAL MUSIC & ENVIRONMENT AUDIO ---
    plainsBattleBgm: './assets/audio/music/plains_battle_1.mp3',
    plainsBgmDay: './assets/audio/music/plains_overworld_day_1.mp3',
    plainsBgmNight: './assets/audio/music/plains_overworld_night.mp3',

    desertBattleBgm: './assets/audio/music/desert_battle_1.mp3',
    desertBgmDay: './assets/audio/music/desert_overworld_day.mp3',
    desertBgmNight: './assets/audio/music/desert_overworld_night.mp3',

    snowyMountainsBattleBgm: './assets/audio/music/snowy_mountains_battle_1.mp3',
    snowyMountainsBgmDay: './assets/audio/music/snowy_mountains_overworld_day.mp3',
    snowyMountainsBgmNight: './assets/audio/music/snowy_mountains_overworld_night.mp3',

    caveBattleBgm: './assets/audio/music/cave_battle_1.mp3',
    caveBgm: './assets/audio/music/cave_bgm.mp3',

    weatherFog: './assets/audio/sfx/weather_fog.wav',
    weatherRain: './assets/audio/sfx/weather_rain.wav',
    weatherRainShort: './assets/audio/sfx/weather_rain_short.mp3',
    thunderClose: './assets/audio/sfx/thunder_close.mp3',   // a thunderstorm's lightning, by how far off it struck (WeatherRenderer.updateLightning)
    thunderMid: './assets/audio/sfx/thunder_mid.mp3',
    thunderFar: './assets/audio/sfx/thunder_far.mp3',
    spookyWind: './assets/audio/sfx/spooky_wind.mp3',
    aDisturbingSightBgm: './assets/audio/music/a_disturbing_sight.mp3',
    poachersNightmareBgm: './assets/audio/music/poachers_nightmare.mp3',
    apexPredatorBgm: './assets/audio/music/apex_predator.mp3',
    choirOfTheDeadBgm: './assets/audio/music/choir_of_the_dead.mp3',   // the Infernus Sentinel: from the moment the statue wakes (catacombDepths.js, stage wakes) on into its fight
    dariusEncounterBgm: './assets/audio/music/darius-final-battle.mp3',   // Darius the Groveler: from the moment he turns on you (mysteriousAltar.js, stage darius_wrath) on into his fight

    // --- CREATURE CRIES & DEATHS ---
    legionaryCry: './assets/audio/sfx/cries/legionary_cry.mp3',
    wolfCry: './assets/audio/sfx/cries/wolf_cry.mp3',
    snowLeopardCry: './assets/audio/sfx/cries/snow_leopard_cry.mp3',
    hawkCry: './assets/audio/sfx/cries/hawk_cry.mp3',   // the hunting hawk companion: a falling scream, synthesized
    caveSpiderCry: './assets/audio/sfx/cries/cave_spider_cry.mp3',
    dogCry: './assets/audio/sfx/cries/dog_cry.mp3',
    shackledSteedCry: './assets/audio/sfx/cries/shackled_steed_cry.mp3',
    madmanCry: './assets/audio/sfx/cries/madman_cry.mp3',
    magicAddictCry: './assets/audio/sfx/cries/magic_addict_cry.mp3',
    dariusCry: './assets/audio/sfx/cries/darius_cry.mp3',   // Darius the Groveler's own cry (and his death)
    sandStalkerCry: './assets/audio/sfx/cries/sand_stalker_cry.mp3',
    dogDeath: './assets/audio/sfx/deaths/dog_death.mp3',
    unsheathSwordSfx: './assets/audio/sfx/unsheath_sword.mp3',
    grimStagCry: './assets/audio/sfx/cries/grim_stag_cry.mp3',
    poachersNightmareCry: './assets/audio/sfx/cries/poachers_nightmare_cry.mp3',
    hollowHarvesterCry: './assets/audio/sfx/cries/hollow_harvester_cry.mp3',
    rotterCry: './assets/audio/sfx/cries/rotter_cry.mp3',
    duneMawCry: './assets/audio/sfx/cries/dune_maw_cry.mp3',
    scorchedVagrantCry: './assets/audio/sfx/cries/scorched_vagrant_cry.mp3',
    miragewrightCry: './assets/audio/sfx/cries/miragewright_cry.mp3',
    calcifiedCrusaderCry: './assets/audio/sfx/cries/calcified_crusader_cry.mp3',
    thunderLocustCry: './assets/audio/sfx/cries/thunder_locust_cry.mp3',
    shadyMerchantCry: './assets/audio/sfx/cries/shady_merchant_cry.mp3',
    skeletalWarriorCry: './assets/audio/sfx/cries/skeletal_warrior_cry.mp3',
    floatingSkullCry: './assets/audio/sfx/cries/floating_skull_cry.mp3',
    frozenTrapperCry: './assets/audio/sfx/cries/frozen_trapper_cry.mp3',
    panzerkamferCry: './assets/audio/sfx/cries/panzerkamfer_cry.mp3',
    watchmanCry: './assets/audio/sfx/cries/watchman_cry.mp3',
    // --- UI SFX ---
    diceTick: './assets/audio/sfx/ui/dice_tick.mp3',
    hoverTick: './assets/audio/sfx/ui/hover_tick.mp3',
    cinematicBoom: './assets/audio/sfx/ui/cinematic_boom.mp3',
    cinematicBoomCancel: './assets/audio/sfx/ui/cinematic_boom_cancel.mp3',
    craftingSuccess: './assets/audio/sfx/ui/crafting_success.mp3',
    coinsJingle: './assets/audio/sfx/ui/coins_jingle.mp3',
    pickupSound: './assets/audio/sfx/ui/pickup_sound.mp3',
    uiClick: './assets/audio/sfx/ui/ui_click.mp3',




    ambushColdBreath: './assets/audio/sfx/ui/ambush_cold_breath.mp3',
    battleStart: './assets/audio/sfx/ui/battle_start.mp3',
    
};

let sceneManager;
let gameLoop;

// The canvas draws with these fonts, so wait for them (or give up after a few seconds: the fallback fonts still read fine)
const FONT_FACES = ['600 64px "Cormorant Garamond"', '700 40px "Cormorant Garamond"', '400 32px "Barlow"', '500 32px "Barlow"', '600 32px "Barlow"', 'italic 400 28px "Barlow"', '400 28px "DM Mono"'];
const loadFonts = () => Promise.race([
    Promise.all(FONT_FACES.map(face => document.fonts.load(face))),
    new Promise(resolve => setTimeout(resolve, 5000))
]).catch(err => console.warn('[main] Fonts could not be loaded:', err));

async function initialize() {
    const fontsReady = loadFonts();
    // 0. Log in / create an account BEFORE the game starts (no boot screen, no canvas yet). The assets download in the background meanwhile,
    //    so by the time the player is through the login the boot screen usually has nothing left to wait for.
    const assetsReady = assetLoader.loadAll(ASSET_MANIFEST).catch(err => console.error('[main] Asset loading failed:', err));
    await runAuthGate();

    await fontsReady;

    // 1. Link the AudioManager to the loader so it can fetch decoded audio buffers
    audioManager.init(assetLoader);

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d'); // <-- Grab the context here to apply scaling

    // The canvas always draws at the game's own 1920x1080; CSS stretches it to fit the window (styles.css).
    // It used to be multiplied by window.devicePixelRatio. On a laptop with Windows display scaling at 125% or 150% that drew 1.6x to 2.3x the pixels
    // every frame (for nothing: the browser shrank it back to the screen), and the mouse no longer lined up, since input and many screens read
    // canvas.width as the 1920-wide game space.
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    // Is the browser drawing with the graphics card? Without it, Light graphics (Settings > Display, 'auto') keeps the game playable, and the
    // title screen tells the player how to get the card back (engine/graphics.js)
    graphics.detect();
    graphics.applyTo(ctx);


    // 2. Initialize SceneManager and GameLoop FIRST so the Boot screen can render
    sceneManager = new SceneManager(canvas, assetLoader, CONFIG);

    gameLoop = new GameLoop(
        (deltaTime) => sceneManager.update(deltaTime),
        (interpolation, totalTime) => sceneManager.render(interpolation, totalTime)
    );

    sceneManager.debugOverlayRenderer.loop = gameLoop;   // the debug overlay ("~") reads the loop's frame timing

    // 3. START the game loop! The Boot screen will begin drawing immediately.
    gameLoop.start();

    // 4. The assets (Images AND Audio) started loading in step 0; the Boot screen shows the progress until they are all in
    await assetsReady;
}

initialize();

window.gameState = gameState; // Expose for console debugging

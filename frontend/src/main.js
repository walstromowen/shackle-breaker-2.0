import { AssetLoader } from "./engine/assetLoader.js";
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
    objSandDune1: './assets/mapObjects/objSandDune1.png',
    objSandDune2: './assets/mapObjects/objSandDune2.png',
    objSandDune3: './assets/mapObjects/objSandDune3.png',
    objDesertSkull: './assets/mapObjects/objDesertSkull.png',
    objBonePile: './assets/mapObjects/objBonePile.png',
    objAbandonedHouse1: './assets/mapObjects/objAbandonedHouse1.png',
    objAbandonedStoneHouse: './assets/mapObjects/objAbandonedStoneHouse.png',
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
    objCaveEntrance: './assets/mapObjects/objCaveEntrance.png',
    objCaveEntranceDesert: './assets/mapObjects/objCaveEntranceDesert.png',
    objCaveEntranceSnow: './assets/mapObjects/objCaveEntranceSnow.png',
    objCaveExit: './assets/mapObjects/objCaveExit.png',
    objHealingHerb: './assets/mapObjects/objHealingHerb.png',
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
    legionaryCompanionPortrait: './assets/sprites/legionary_companion/legionary_companion_portrait.png',
    warlordHeroPortrait: './assets/sprites/warlord_hero/warlord_hero_portrait.png',
    nightbladeHeroPortrait: './assets/sprites/nightblade_hero/nightblade_hero_portrait.png',
    legionaryHeroSprite: './assets/sprites/legionary_hero/legionary_hero_sprite.png',
    legionaryCompanionSprite: './assets/sprites/legionary_companion/legionary_companion_sprite.png',
    warlordHeroSprite: './assets/sprites/warlord_hero/warlord_hero_sprite.png',
    nightbladeHeroSprite: './assets/sprites/nightblade_hero/nightblade_hero_sprite.png',
    madmanSprite: './assets/sprites/madman/madman_sprite.png',
    shadyMerchantSprite: './assets/sprites/shady_merchant/shady_merchant_spritesheet.png',
    snowLeopardSprite: './assets/sprites/snow_leopard/snow_leopard_sprite.png',
    artificerHeroPortrait: './assets/sprites/artificer_hero/artificer_hero_portrait.png',
    avalancherHeroPortrait: './assets/sprites/avalancher_hero/avalancher_hero_portrait.png',
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
    hawkPortrait: './assets/sprites/hawk/hawk_portrait.png',
    shackledSteedPortrait: './assets/sprites/shackled_steed/shackled_steed_portrait.png',
    sandStalkerPortrait: './assets/sprites/sand_stalker/sand_stalker_portrait.png',
    grimStagPortrait: './assets/sprites/grim_stag/grim_stag_portrait.png',
    poachersNightmarePortrait: './assets/sprites/poachers_nightmare/poachers_nightmare_portrait.png',
    hollowHarvesterPortrait: './assets/sprites/hollow_harvester/hollow_harvester_portrait.png',
    skeletalWarriorPortrait: './assets/sprites/skeletal_warrior/skeletal_warrior_portrait.png',
    floatingSkullPortrait: './assets/sprites/floating_skull/floating_skull_portrait.png',
    shackledSpiritPortrait: './assets/sprites/shackled_spirit/shackled_spirit_portrait.png',
    ancientCultistPortrait: './assets/sprites/ancient_cultist/ancient_cultist_portrait.png',
    frozenTrapperPortrait: './assets/sprites/frozen_trapper/frozen_trapper_portrait.png',
    panzerkamferPortrait: './assets/sprites/panzerkamfer/panzerkamfer_portrait.png',
duneMawPortrait: './assets/sprites/dune_maw/dune_maw_portrait.png',
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
    chainSnap: './assets/audio/sfx/encounters/story/prologue/chain_snap.wav',
    heartbeat: './assets/audio/sfx/encounters/story/prologue/heartbeat.wav',
    // --- ENCOUNTER AMBIENCE (loops) AND STAGE SOUNDS (see the cues in data/encounters/*.js) ---
    fireCrackle: './assets/audio/sfx/encounters/fire_crackle.wav',
    forestNight: './assets/audio/sfx/encounters/forest_night.wav',
    snowWind: './assets/audio/sfx/encounters/snow_wind.wav',
    obeliskHum: './assets/audio/sfx/encounters/obelisk_hum.wav',
    altarDrone: './assets/audio/sfx/encounters/story/altar_drone.wav',
    battlefieldWind: './assets/audio/sfx/encounters/battlefield_wind.wav',
    twigSnap: './assets/audio/sfx/encounters/twig_snap.wav',
    stoneGrind: './assets/audio/sfx/encounters/stone_grind.wav',
    glyphChime: './assets/audio/sfx/encounters/glyph_chime.wav',
    gemChime: './assets/audio/sfx/encounters/gem_chime.wav',
    chestCreak: './assets/audio/sfx/encounters/chest_creak.wav',
    lockClick: './assets/audio/sfx/encounters/lock_click.wav',
    chestOpen: './assets/audio/sfx/encounters/chest_open.wav',
    chestBlast: './assets/audio/sfx/encounters/chest_blast.wav',
    bonesRattle: './assets/audio/sfx/encounters/bones_rattle.wav',
    arrowHit: './assets/audio/sfx/encounters/arrow_hit.wav',
    rockThud: './assets/audio/sfx/encounters/rock_thud.wav',
    glowSwell: './assets/audio/sfx/encounters/glow_swell.wav',
    whispers: './assets/audio/sfx/encounters/whispers.wav',
    hoofbeats: './assets/audio/sfx/encounters/hoofbeats.wav',
    snowSteps: './assets/audio/sfx/encounters/snow_steps.wav',

    //Encounters
    encounter_wounded_mutt: './assets/icons/encounters/wounded_mutt.png',
    encounter_a_disturbing_sight: './assets/icons/encounters/a_disturbing_sight.png',
    encounter_bonfire: './assets/icons/encounters/bonfire.png',
    encounter_wild_hunt: './assets/icons/encounters/wild_hunt.png',
    encounter_treasure_chest: './assets/icons/encounters/treasure_chest.png',
    encounter_strange_obelisk: './assets/icons/encounters/strange_obelisk.png',
    encounter_mysterious_altar: './assets/icons/encounters/story/mysterious_altar.png',
    encounter_old_gravestone: './assets/icons/encounters/old_gravestone.png',
    encounter_suspicious_merchant: './assets/icons/encounters/suspicious_merchant.png',
    encounter_aftermath: './assets/icons/encounters/aftermath.png',
    encounter_tracks_in_the_snow: './assets/icons/encounters/tracks_in_the_snow.png',
    encounter_prologue: './assets/icons/encounters/story/prologue.png',
    encounter_peculiar_scarecrow: './assets/icons/encounters/peculiar_scarecrow.png',
    encounter_cave_in: './assets/icons/encounters/cave_in.png',
    // --- 1:1 ABILITY AUDIO SFX ---
    earthquake1Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_1.wav',
    earthquake2Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_2.wav',
    earthquake3Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_3.wav',
    fireballCastSfx: './assets/audio/sfx/abilities/fireball/fireball_cast.wav',
    fireballImpactSfx: './assets/audio/sfx/abilities/fireball/fireball_impact.wav',
    acidPoolSfx: './assets/audio/sfx/abilities/acid_pool.wav',
    healSfx: './assets/audio/sfx/abilities/heal.wav',
    darkMagicSFX: './assets/audio/sfx/abilities/dark_magic.wav',
    firePunchSfx: './assets/audio/sfx/abilities/fire_punch.wav',
    bowReleaseSfx: './assets/audio/sfx/abilities/bow_release.wav',
    arrowImpactSfx: './assets/audio/sfx/abilities/arrow_impact.wav',
    poisonSplashSfx: './assets/audio/sfx/abilities/poison_splash.wav',
    shockZapSfx: './assets/audio/sfx/abilities/shock_zap.wav',
    arcaneDartSfx: './assets/audio/sfx/abilities/arcane_dart.wav',
    cleaveSfx: './assets/audio/sfx/abilities/cleave.wav',
    crunchSfx: './assets/audio/sfx/abilities/crunch.wav',
    punchSfx: './assets/audio/sfx/abilities/punch.wav',
    restSfx: './assets/audio/sfx/abilities/rest.wav',
    retreatSfx: './assets/audio/sfx/abilities/retreat.wav',
    shockSfx: './assets/audio/sfx/abilities/shock.wav',
    slashSfx: './assets/audio/sfx/abilities/slash.wav',
    thrustSfx: './assets/audio/sfx/abilities/thrust.wav',
    strikeSfx: './assets/audio/sfx/abilities/strike.wav',
    eviscerateSfx: './assets/audio/sfx/abilities/eviscerate.wav',
    spiritReapSfx: './assets/audio/sfx/abilities/spirit_reap.wav',
    iceBoltCastSfx: './assets/audio/sfx/abilities/ice_bolt/ice_bolt_cast.wav',
    iceBoltImpactSfx: './assets/audio/sfx/abilities/ice_bolt/ice_bolt_impact.wav',
    clawSfx: './assets/audio/sfx/abilities/claw.wav',
    vineLashSfx: './assets/audio/sfx/abilities/vine_lash.wav',
    recklessChargeApproachSfx: './assets/audio/sfx/abilities/reckless_charge/reckless_charge_approach.wav',
    recklessChargeImpactSfx: './assets/audio/sfx/abilities/reckless_charge/reckless_charge_impact.wav',
    waterBlastSfx: './assets/audio/sfx/abilities/water_blast.wav',
    cleaveSfx: './assets/audio/sfx/abilities/cleave.wav',
    wildSwingSfx: './assets/audio/sfx/abilities/wild_swing.wav',
    purifySfx: './assets/audio/sfx/abilities/purify.wav',
    meteorShowerImpactSfx: './assets/audio/sfx/abilities/meteor_shower/meteor_shower_impact.wav',
    quickStabSfx: './assets/audio/sfx/abilities/quick_stab.wav',
    spiteCastSfx: './assets/audio/sfx/abilities/spite/spite_cast.wav',
    rallySfx: './assets/audio/sfx/abilities/rally.wav',
    smokeSfx: './assets/audio/sfx/abilities/smoke.wav',
    intimidateSfx: './assets/audio/sfx/abilities/intimidate.wav',
    
    //BATTLE STATUS AND WEATHER SFX
    poisonSfx: './assets/audio/sfx/statusEffects/poison.wav',
    paralyzedSfx: './assets/audio/sfx/statusEffects/paralyzed.wav',
    bleedSfx: './assets/audio/sfx/statusEffects/bleed.wav',
    frozenSfx: './assets/audio/sfx/statusEffects/frozen.wav',
    burnSfx: './assets/audio/sfx/statusEffects/burn.wav',

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
    weatherRainShort: './assets/audio/sfx/weather_rain_short.wav',
    spookyWind: './assets/audio/sfx/spooky_wind.wav',
    aDisturbingSightBgm: './assets/audio/music/a_disturbing_sight.mp3',
    poachersNightmareBgm: './assets/audio/music/poachers_nightmare.mp3',
    apexPredatorBgm: './assets/audio/music/apex_predator.mp3',
    dariusEncounterBgm: './assets/audio/music/darius-final-battle.mp3',   // the altar, as Darius the Groveler crawls out (mysteriousAltar.js, stage darius_rises)
    bossBattleBgm: './assets/audio/music/bossbattle.mp3',               // the fight with Darius itself (the START_BATTLE of that stage)

    // --- CREATURE CRIES & DEATHS ---
    legionaryCry: './assets/audio/sfx/cries/legionary_cry.wav',
    wolfCry: './assets/audio/sfx/cries/wolf_cry.wav',
    snowLeopardCry: './assets/audio/sfx/cries/snow_leopard_cry.wav',
    caveSpiderCry: './assets/audio/sfx/cries/cave_spider_cry.wav',
    dogCry: './assets/audio/sfx/cries/dog_cry.wav',
    shackledSteedCry: './assets/audio/sfx/cries/shackled_steed_cry.wav',
    madmanCry: './assets/audio/sfx/cries/madman_cry.wav',
    magicAddictCry: './assets/audio/sfx/cries/magic_addict_cry.wav',
    sandStalkerCry: './assets/audio/sfx/cries/sand_stalker_cry.wav',
    dogDeath: './assets/audio/sfx/deaths/dog_death.wav',
    unsheathSwordSfx: './assets/audio/sfx/unsheath_sword.wav',
    grimStagCry: './assets/audio/sfx/cries/grim_stag_cry.wav',
    poachersNightmareCry: './assets/audio/sfx/cries/poachers_nightmare_cry.wav',
    hollowHarvesterCry: './assets/audio/sfx/cries/hollow_harvester_cry.wav',
    rotterCry: './assets/audio/sfx/cries/rotter_cry.wav',
    duneMawCry: './assets/audio/sfx/cries/dune_maw_cry.wav',
    scorchedVagrantCry: './assets/audio/sfx/cries/scorched_vagrant_cry.wav',
    miragewrightCry: './assets/audio/sfx/cries/miragewright_cry.wav',
    calcifiedCrusaderCry: './assets/audio/sfx/cries/calcified_crusader_cry.wav',
    thunderLocustCry: './assets/audio/sfx/cries/thunder_locust_cry.wav',
    shadyMerchantCry: './assets/audio/sfx/cries/shady_merchant_cry.wav',
    skeletalWarriorCry: './assets/audio/sfx/cries/skeletal_warrior_cry.wav',
    floatingSkullCry: './assets/audio/sfx/cries/floating_skull_cry.wav',
    frozenTrapperCry: './assets/audio/sfx/cries/frozen_trapper_cry.wav',
    panzerkamferCry: './assets/audio/sfx/cries/panzerkamfer_cry.wav',
    watchmanCry: './assets/audio/sfx/cries/watchman_cry.wav',
    // --- UI SFX ---
    diceTick: './assets/audio/sfx/ui/dice_tick.wav',
    hoverTick: './assets/audio/sfx/ui/hover_tick.wav',
    cinematicBoom: './assets/audio/sfx/ui/cinematic_boom.mp3',
    cinematicBoomCancel: './assets/audio/sfx/ui/cinematic_boom_cancel.wav',
    craftingSuccess: './assets/audio/sfx/ui/crafting_success.wav',
    coinsJingle: './assets/audio/sfx/ui/coins_jingle.wav',
    pickupSound: './assets/audio/sfx/ui/pickup_sound.wav',
    uiClick: './assets/audio/sfx/ui/ui_click.wav',




    ambushColdBreath: './assets/audio/sfx/ui/ambush_cold_breath.wav',
    battleStart: './assets/audio/sfx/ui/battle_start.wav',
    
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

    // --- NEW: Handle Window Resizing and High-DPI screens ---
    function applyCrispScaling() {
        const dpr = window.devicePixelRatio || 1;

        // Multiply your internal 1920x1080 by the monitor's pixel density
        canvas.width = CONFIG.CANVAS_WIDTH * dpr;  
        canvas.height = CONFIG.CANVAS_HEIGHT * dpr;

        // Scale the canvas context. 
        // This is the magic part: your game logic still draws at 1920x1080,
        // but the browser renders it using the extra pixels!
        ctx.scale(dpr, dpr);
        
        // Force crisp pixels (MUST be reapplied every time canvas dimensions change)
        ctx.imageSmoothingEnabled = false; 
    }

    // Apply the scaling right now
    applyCrispScaling();

    // Re-apply if the user drags the window to a different monitor with a different DPI
    window.addEventListener('resize', applyCrispScaling);
    // ---------------------------------------------------------


    // 2. Initialize SceneManager and GameLoop FIRST so the Boot screen can render
    sceneManager = new SceneManager(canvas, assetLoader, CONFIG);

    gameLoop = new GameLoop(
        (deltaTime) => sceneManager.update(deltaTime),
        (interpolation, totalTime) => sceneManager.render(interpolation, totalTime)
    );

    // 3. START the game loop! The Boot screen will begin drawing immediately.
    gameLoop.start();

    // 4. The assets (Images AND Audio) started loading in step 0; the Boot screen shows the progress until they are all in
    await assetsReady;
}

initialize();

window.gameState = gameState; // Expose for console debugging

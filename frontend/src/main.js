import { AssetLoader } from "./core/assetLoader.js";
import { SceneManager } from "./core/sceneManager.js";
import { GameLoop } from "./core/gameLoop.js";
import { audioManager } from './core/audioManager.js';
import { CONFIG } from "../../shared/data/constants.js";
import { gameState } from '../../shared/state/gameState.js';
import { aDisturbingSight } from "../../shared/data/encounters/aDisturbingSight.js";

// Moved to top for clean imports
const assetLoader = new AssetLoader();

const ASSET_MANIFEST = {
title_bg: './assets/screens/title_bg.png',
shackle_breaker_theme_1: './assets/audio/music/shackle_breaker_theme_1.mp3',
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
    objGrassCoverage1: './assets/mapobjects/objGrassCoverage1.png',
    objGrassCoverage2: './assets/mapobjects/objGrassCoverage2.png',
    objGrassCoverage3: './assets/mapobjects/objGrassCoverage3.png',
    objTulipsOrange: './assets/mapobjects/objTulipsOrange.png',
    objTulipsWhite: './assets/mapobjects/objTulipsWhite.png',
    objTulipsRed: './assets/mapobjects/objTulipsRed.png',
    objSmallRocks1: './assets/mapobjects/objSmallRocks1.png',
    objSmallRocks1Desert: './assets/mapobjects/objSmallRocks1Desert.png',
    objSmallRocks1Snow: './assets/mapobjects/objSmallRocks1Snow.png',
    objSmallRocks2: './assets/mapobjects/objSmallRocks2.png',
    objSmallRocks2Desert: './assets/mapobjects/objSmallRocks2Desert.png',
    objSmallRocks2Snow: './assets/mapobjects/objSmallRocks2Snow.png',
    objSmallRocks3: './assets/mapobjects/objSmallRocks3.png',
    objSmallRocks3Desert: './assets/mapobjects/objSmallRocks3Desert.png',
    objSmallRocks3Snow: './assets/mapobjects/objSmallRocks3Snow.png',
    objStick: './assets/mapobjects/objStick.png',
    objSandDune1: './assets/mapobjects/objSandDune1.png',
    objSandDune2: './assets/mapobjects/objSandDune2.png',
    objSandDune3: './assets/mapobjects/objSandDune3.png',
    objDesertSkull: './assets/mapobjects/objDesertSkull.png',
    objBonePile: './assets/mapobjects/objBonePile.png',
    objAbandonedHouse1: './assets/mapobjects/objAbandonedHouse1.png',
    objAbandonedHouse2: './assets/mapobjects/objAbandonedHouse2.png',
    objWoodenFenceH: './assets/mapobjects/objWoodenFenceH.png',
    objWoodenFenceV: './assets/mapobjects/objWoodenFenceV.png',
    objWoodenFenceTlCorner: './assets/mapobjects/objWoodenFenceTlCorner.png',
    objWoodenFenceTrCorner: './assets/mapobjects/objWoodenFenceTrCorner.png',
    objWoodenFenceBlCorner: './assets/mapobjects/objWoodenFenceBlCorner.png',
    objWoodenFenceBrCorner: './assets/mapobjects/objWoodenFenceBrCorner.png',
    objBoulder1: './assets/mapobjects/objBoulder1.png',
    objBoulder2: './assets/mapobjects/objBoulder2.png',
    objSnowyBoulder1: './assets/mapobjects/objSnowyBoulder1.png',
    objSnowyBoulder2: './assets/mapobjects/objSnowyBoulder2.png',
    objWoodenChest: './assets/mapobjects/objWoodenChest.png',
    objPineTree: './assets/mapobjects/objPineTree.png',
    objPineTreeSnow: './assets/mapobjects/objPineTreeSnow.png',
    objOakTree1: './assets/mapobjects/objOakTree1.png',
    objTreeStump: './assets/mapobjects/objTreeStump.png',
    objTreeStumpSnow: './assets/mapobjects/objTreeStumpSnow.png',
    objMediumCactus1: './assets/mapobjects/objMediumCactus1.png',
    objSmallCactus1: './assets/mapobjects/objSmallCactus1.png',
    objStrangeObelisk: './assets/mapobjects/objStrangeObelisk.png',
    objCaveEntrance: './assets/mapobjects/objCaveEntrance.png',
    objCaveEntranceDesert: './assets/mapobjects/objCaveEntranceDesert.png',
    objCaveEntranceSnow: './assets/mapobjects/objCaveEntranceSnow.png',
    objCaveExit: './assets/mapobjects/objCaveExit.png',
    objHealingHerb: './assets/mapobjects/objHealingHerb.png',
    objInvigoratingHerb: './assets/mapobjects/objInvigoratingHerb.png',
    objIlluminatingHerb: './assets/mapobjects/objIlluminatingHerb.png',
    objAnvil: './assets/mapobjects/objAnvil.png',
    objForge: './assets/mapobjects/objForge.png',
    objCarpentersBench: './assets/mapobjects/objCarpentersBench.png',
    objStoneBanker: './assets/mapobjects/objStoneBanker.png',
    objTailorsBench: './assets/mapobjects/objTailorsBench.png',
    objCampfire: './assets/mapobjects/objCampfire.png',
    objHouseDoorWooden: './assets/mapobjects/objHouseDoorWooden.png',
    objHouseExitDoor: './assets/mapobjects/objHouseExitDoor.png',
    objBlacksmithDoor: './assets/mapobjects/objBlacksmithDoor.png',
    objCarpenterDoor: './assets/mapobjects/objCarpenterDoor.png',
    objMasonDoor: './assets/mapobjects/objMasonDoor.png',
    objTailorDoor: './assets/mapobjects/objTailorDoor.png',

    /* house furniture (HouseGenerator / CraftingHouseGenerator) */
    objBarrel: './assets/mapobjects/objBarrel.png',
    objBedBlue: './assets/mapobjects/objBedBlue.png',
    objBedRed: './assets/mapobjects/objBedRed.png',
    objBookshelf: './assets/mapobjects/objBookshelf.png',
    objCandelabra: './assets/mapobjects/objCandelabra.png',
    objChair: './assets/mapobjects/objChair.png',
    objCounter: './assets/mapobjects/objCounter.png',
    objCrate: './assets/mapobjects/objCrate.png',
    objCrateSack: './assets/mapobjects/objCrateSack.png',
    objDoormat: './assets/mapobjects/objDoormat.png',
    objFireplace: './assets/mapobjects/objFireplace.png',
    objPottedPlant: './assets/mapobjects/objPottedPlant.png',
    objRugGreen: './assets/mapobjects/objRugGreen.png',
    objRugLong: './assets/mapobjects/objRugLong.png',
    objRugSmall: './assets/mapobjects/objRugSmall.png',
    objSacks: './assets/mapobjects/objSacks.png',
    objSmallTable: './assets/mapobjects/objSmallTable.png',
    objStool: './assets/mapobjects/objStool.png',
    objTableLong: './assets/mapobjects/objTableLong.png',
    objWardrobe: './assets/mapobjects/objWardrobe.png',

    spritesheet: './assets/sprites/hero.png',

    legionaryHeroPortrait: './assets/sprites/legionary_hero/legionary_hero_portrait.png',
    warlordHeroPortrait: './assets/sprites/warlord_hero/warlord_hero_portrait.png',
    nightbladeHeroPortrait: './assets/sprites/nightblade_hero/nightblade_hero_portrait.png',
    legionaryHeroSprite: './assets/sprites/legionary_hero/legionary_hero_sprite.png',
    warlordHeroSprite: './assets/sprites/warlord_hero/warlord_hero_sprite.png',
    nightbladeHeroSprite: './assets/sprites/nightblade_hero/nightblade_hero_sprite.png',
    artificerHeroPortrait: './assets/sprites/artificer_hero/artificer_hero_portrait.png',
    avalancherHeroPortrait: './assets/sprites/avalancher_hero/avalancher_hero_portrait.png',
    shadowCasterHeroPortrait: './assets/sprites/shadow_caster_hero/shadow_caster_hero_portrait.png',

    legionaryPortrait: './assets/sprites/legionary/legionary_portrait.png',
    watchmanPortrait: './assets/sprites/watchman/watchman_portrait.png',
    wolfPortrait: './assets/sprites/wolf/wolf_portrait.png',
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
    particles: './assets/icons/particles.png',

    // --- 1:1 ABILITY ANIMATIONS ---
    acidPoolAnimation: './assets/abilityAnimations/acid_pool.png',
    acidicSmogAnimation: './assets/abilityAnimations/acidic_smog.png',
    arcaneDartAnimation: './assets/abilityAnimations/arcane_dart.png',
    biteAnimation: './assets/abilityAnimations/bite.png',
    bleedAnimation: './assets/abilityAnimations/bleed.png',
    burnAnimation: './assets/abilityAnimations/burn.png',
    clawAnimation: './assets/abilityAnimations/claw.png',
    earthquakeAnimation: './assets/abilityAnimations/earthquake.png',
    eviscerateAnimation: './assets/abilityAnimations/eviscerate.png',
    fire_punchAnimation: './assets/abilityAnimations/fire_punch.png',
    fireballAnimation: './assets/abilityAnimations/fireball.png',
    frozenAnimation: './assets/abilityAnimations/frozen.png',
    poisonAnimation: './assets/abilityAnimations/poison.png',
    punchAnimation: './assets/abilityAnimations/punch.png',
    shockAnimation: './assets/abilityAnimations/shock.png',
    slashAnimation: './assets/abilityAnimations/slash.png',
    thrustAnimation: './assets/abilityAnimations/thrust.png',
    strikeAnimation: './assets/abilityAnimations/strike.png',
    uppercutAnimation: './assets/abilityAnimations/uppercut.png',
    vineLashAnimation: './assets/abilityAnimations/vine_lash.png',
    spiritReapAnimation: './assets/abilityAnimations/spirit_reap.png',
    iceBoltAnimation: './assets/abilityAnimations/ice_bolt.png',
    impactAnimation: './assets/abilityAnimations/impact.png',
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
    //quickStabAnimation: './assets/abilityAnimations/quick_stab.png',
    intimidateAnimation: './assets/abilityAnimations/intimidate.png',
    rallyAnimation: './assets/abilityAnimations/rally.png',
    smokeAnimation: './assets/abilityAnimations/smoke.png',

    // Backgrounds
    arcaneVortexBg: './assets/backgrounds/arcane_vortex_bg.png',
    plainsBattleDayBg: './assets/backgrounds/plains_battle_day_bg.jpg',
    plainsBattleDuskBg: './assets/backgrounds/plains_battle_dusk_bg.png',
    plainsBattleNightBg: './assets/backgrounds/plains_battle_night_bg.png',
    desertBattleDayBg: './assets/backgrounds/desert_battle_day_bg.png',
    desertBattleDuskBg: './assets/backgrounds/desert_battle_dusk_bg.png',
    desertBattleNightBg: './assets/backgrounds/desert_battle_night_bg.png',
    poachersNightmareBg: './assets/backgrounds/poachers_nightmare_bg.png',
    shackle_breaker_theme_1: './assets/audio/music/shackle_breaker_theme_1.mp3',

    //Encounters
    encounter_oaktree: './assets/icons/encounters/oak_tree.png',
    encounter_wounded_mutt: './assets/icons/encounters/wounded_mutt.png',
    encounter_a_disturbing_sight: './assets/icons/encounters/a_disturbing_sight.png',
    encounter_bonfire: './assets/icons/encounters/bonfire.png',
    encounter_wild_hunt: './assets/icons/encounters/wild_hunt.png',
    encounter_treasure_chest: './assets/icons/encounters/treasure_chest.png',
    encounter_wild_herbs: './assets/icons/encounters/wild_herbs.png',
    encounter_strange_obelisk: './assets/icons/encounters/strange_obelisk.png',
    encounter_suspicious_merchant: './assets/icons/encounters/suspicious_merchant.png',
    encounter_aftermath: './assets/icons/encounters/aftermath.png',
    // --- 1:1 ABILITY AUDIO SFX ---
    earthquake1Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_1.wav',
    earthquake2Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_2.wav',
    earthquake3Sfx: './assets/audio/sfx/abilities/earthquake/earthquake_3.wav',
    fireballCastSfx: './assets/audio/sfx/abilities/fireball/fireball_cast.wav',
    //fireballImpactSfx: './assets/audio/sfx/abilities/fireball/fireball_impact.wav',
    acidPoolSfx: './assets/audio/sfx/abilities/acid_pool.wav',
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
   // bleedSfx: './assets/audio/sfx/statusEffects/bleed.wav',
    //frozenSfx: './assets/audio/sfx/statusEffects/frozen.wav',
   // burnSfx: './assets/audio/sfx/statusEffects/burn.wav',

    // --- GLOBAL MUSIC & ENVIRONMENT AUDIO ---
    plainsBattleBgm: './assets/audio/music/plains_battle_1.mp3',
    plainsBgmDay: './assets/audio/music/plains_overworld_day_2.mp3',
    plainsBgmNight: './assets/audio/music/plains_overworld_night.mp3',

    desertBattleBgm: './assets/audio/music/desert_battle_1.mp3',
    desertBgmDay: './assets/audio/music/desert_overworld_day.mp3',
    desertBgmNight: './assets/audio/music/desert_overworld_night.mp3',

    snowyMountainsBattleBgm: './assets/audio/music/snowy_mountains_battle_1.mp3',
    snowyMountainsBgmDay: './assets/audio/music/snowy_mountains_overworld_day.mp3',
    //snowyMountainsBgmNight: './assets/audio/music/snowy_mountains_overworld_night.mp3',

    weatherFog: './assets/audio/sfx/weather_fog.wav',
    weatherRain: './assets/audio/sfx/weather_rain.wav',
    weatherRainShort: './assets/audio/sfx/weather_rain_short.wav',
    spookyWind: './assets/audio/sfx/spooky_wind.wav',
    aDisturbingSightBgm: './assets/audio/music/a_disturbing_sight.mp3',
    poachersNightmareBgm: './assets/audio/music/poachers_nightmare.mp3',

    // --- CREATURE CRIES & DEATHS ---
    legionaryCry: './assets/audio/sfx/cries/legionary_cry.wav',
    wolfCry: './assets/audio/sfx/cries/wolf_cry.wav',
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
    // --- UI SFX ---
    diceTick: './assets/audio/sfx/ui/dice_tick.wav',
    hoverTick: './assets/audio/sfx/ui/hover_tick.wav',
    cinematicBoom: './assets/audio/sfx/ui/cinematic_boom.mp3',
    cinematicBoomCancel: './assets/audio/sfx/ui/cinematic_boom_cancel.wav',
    ambushColdBreath: './assets/audio/sfx/ui/ambush_cold_breath.wav',
    battleStart: './assets/audio/sfx/ui/battle_start.wav',
    
};

let sceneManager;
let gameLoop;

async function initialize() {
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

    // 4. NOW load all assets (Images AND Audio) in the background
    await assetLoader.loadAll(ASSET_MANIFEST);
}

initialize();

window.gameState = gameState; // Expose for console debugging
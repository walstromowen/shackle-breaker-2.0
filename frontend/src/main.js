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
  plains: './assets/tilesets/plains.png', 
  desert: './assets/tilesets/desert.png', 
  houseInterior: './assets/tilesets/house_interior.png', 
  plainsMapObjects: './assets/tilesets/plains_map_objects.png', 
  desertMapObjects: './assets/tilesets/desert_map_objects.png', 
  spritesheet: './assets/sprites/hero.png', 
  shadows: './assets/tilesets/shadows.png', 
  
  // Weather textures
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
  wolfPortrait: './assets/sprites/wolf/wolf_portrait.png', 
  madmanPortrait: './assets/sprites/madman/madman_portrait.png', 
  arcKnightPortrait: './assets/sprites/arc_knight/arc_knight_portrait.png', 
  madMagePortrait: './assets/sprites/mad_mage/mad_mage_portrait.png', 
  rottingManPortrait: './assets/sprites/rotting_man/rotting_man_portrait.png', 
  germanSheepherdSprite: './assets/sprites/dogs/german_sheepherd_sprite.png', 
  germanSheepherdPortrait: './assets/sprites/dogs/german_sheepherd_portrait.png', 
  hawkPortrait: './assets/sprites/hawk/hawk_portrait.png', 
  shackledSteedPortrait: './assets/sprites/shackled_steed/shackled_steed_portrait.png', 
  sandStalkerPortrait: './assets/sprites/sand_stalker/sand_stalker_portrait.png', 
  grimStagPortrait: './assets/sprites/grim_stag/grim_stag_portrait.png', 
  poachersNightmarePortrait: './assets/sprites/poachers_nightmare/poachers_nightmare_portrait.png', 
  hollowHarvesterPortrait: './assets/sprites/hollow_harvester/hollow_harvester_portrait.png',
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
  flurryAnimation: './assets/abilityAnimations/flurry.png',
  frozenAnimation: './assets/abilityAnimations/frozen.png',
  poisonAnimation: './assets/abilityAnimations/poison.png',
  punchAnimation: './assets/abilityAnimations/punch.png',
  shockAnimation: './assets/abilityAnimations/shock.png',
  slashAnimation: './assets/abilityAnimations/slash.png',
  stabAnimation: './assets/abilityAnimations/stab.png',
  strikeAnimation: './assets/abilityAnimations/strike.png',
  uppercutAnimation: './assets/abilityAnimations/uppercut.png',
  vineLashAnimation: './assets/abilityAnimations/vine_lash.png',
spiritReapAnimation: './assets/abilityAnimations/spirit_reap.png',
  
  // Backgrounds
  arcaneVortexBg: './assets/backgrounds/arcane_vortex_bg.png', 
  plainsBattleDayBg: './assets/backgrounds/plains_battle_day_bg.png', 
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
  stabSfx: './assets/audio/sfx/abilities/stab.wav',
  strikeSfx: './assets/audio/sfx/abilities/strike.wav',
  eviscerateSfx: './assets/audio/sfx/abilities/eviscerate.wav',
spiritReapSfx: './assets/audio/sfx/abilities/spirit_reap.wav',

  //BATTLE STATUS AND WEATHER SFX
  poisonSfx: './assets/audio/sfx/statusEffects/poison.wav',
   // bleedSfx: './assets/audio/sfx/statusEffects/bleed.wav',
    //frozenSfx: './assets/audio/sfx/statusEffects/frozen.wav',
   // burnSfx: './assets/audio/sfx/statusEffects/burn.wav',

  // --- GLOBAL MUSIC & ENVIRONMENT AUDIO --- 
  plainsBattleBgm: './assets/audio/music/plains_battle_1.mp3', 
  plainsBgmDay: './assets/audio/music/plains_overworld_day_2.mp3', 
  plainsBgmNight: './assets/audio/music/plains_overworld_night.mp3', 
  desertBattleBgm: './assets/audio/music/plains_battle_1.mp3', 
  desertBgmDay: './assets/audio/music/plains_overworld_day_2.mp3', 
  desertBgmNight: './assets/audio/music/plains_overworld_night.mp3', 
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
  madMageCry: './assets/audio/sfx/cries/mad_mage_cry.wav', 
  sandStalkerCry: './assets/audio/sfx/cries/sand_stalker_cry.wav', 
  dogDeath: './assets/audio/sfx/deaths/dog_death.wav',
  unsheathSwordSfx: './assets/audio/sfx/unsheath_sword.wav', 
  grimStagCry: './assets/audio/sfx/cries/grim_stag_cry.wav',
poachersNightmareCry: './assets/audio/sfx/cries/poachers_nightmare_cry.wav',
  hollowHarvesterCry: './assets/audio/sfx/cries/hollow_harvester_cry.wav',
  
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
  
  // 2. Load all assets (Images AND Audio) 
  await assetLoader.loadAll(ASSET_MANIFEST); 
  
  const canvas = document.getElementById('game-canvas'); 
  // Use the CONFIG object to set dimensions so you only have a single source of truth 
  canvas.width = CONFIG.CANVAS_WIDTH;   // Resolves to 1920 
  canvas.height = CONFIG.CANVAS_HEIGHT; // Resolves to 1080 
  
  // The SceneManager will handle creating the EncounterController internally 
  sceneManager = new SceneManager(canvas, assetLoader, CONFIG); 
  
  gameLoop = new GameLoop( 
    (deltaTime) => sceneManager.update(deltaTime), 
    (interpolation, totalTime) => sceneManager.render(interpolation, totalTime) 
  ); 
  gameLoop.start(); 
} 

initialize(); 
window.gameState = gameState; // Expose for console debugging
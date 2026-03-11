import { AssetLoader } from "./core/assetLoader.js";
import { SceneManager } from "./core/sceneManager.js";
import { GameLoop } from "./core/gameLoop.js";
import { audioManager } from './core/audioManager.js';
import { CONFIG } from "../../shared/data/constants.js";
import { gameState } from '../../shared/state/gameState.js'; // Moved to top for clean imports

const assetLoader = new AssetLoader();

const ASSET_MANIFEST = {
    plains: './assets/tilesets/plains.png',
    desert: './assets/tilesets/desert.png',
    plainsMapObjects: './assets/tilesets/plains_map_objects.png',
    desertMapObjects: './assets/tilesets/plains_map_objects.png',
    spritesheet: './assets/sprites/hero.png',
    shadows: './assets/tilesets/shadows.png',

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
    germanSheepherdSprite: './assets/sprites/dogs/german_sheepherd_sprite.png',
    germanSheepherdPortrait: './assets/sprites/dogs/german_sheepherd_portrait.png',
    hawkPortrait: './assets/sprites/hawk/hawk_portrait.png',
    
    items: './assets/icons/items.png', 
    abilities: './assets/icons/abilities.png', 
    statusEffects: './assets/icons/status_effects.png',
    battleProjectiles: './assets/icons/battle_projectiles.png',

    plainsBattleDayBg: './assets/backgrounds/plains_battle_day_bg.png',
    plainsBattleDuskBg: './assets/backgrounds/plains_battle_dusk_bg.png',
    plainsBattleNightBg: './assets/backgrounds/plains_battle_night_bg.png',

    // --- NEW: Audio Assets go here! ---
    plainsBattle1: './assets/audio/music/plains_battle_1.mp3',
    plainsOverworldDay: './assets/audio/music/plains_overworld_day.mp3',  

    arcaneDartSFX: './assets/audio/sfx/arcane_dart.wav',
    bubbleSFX: './assets/audio/sfx/bubble.wav',
    swordSlashSFX: './assets/audio/sfx/sword_slash.wav',
    cleaveSFX: './assets/audio/sfx/cleave.wav',
    cannonShotSFX: './assets/audio/sfx/cannon_shot.wav',
    crunchSFX: './assets/audio/sfx/crunch.wav',
    earthquake1SFX: './assets/audio/sfx/earthquake_1.wav',
    earthquake2SFX: './assets/audio/sfx/earthquake_2.wav',
    earthquake3SFX: './assets/audio/sfx/earthquake_3.wav',
    magicCast1SFX: './assets/audio/sfx/magic_cast_1.wav',
    spearStabSFX: './assets/audio/sfx/spear_stab.wav',
    strikeSFX: './assets/audio/sfx/strike.wav',
    swordSlashSFX: './assets/audio/sfx/sword_slash.wav',
};

let sceneManager;
let gameLoop;

async function initialize() {
    // 1. Link the AudioManager to the loader so it can fetch decoded audio buffers
    audioManager.init(assetLoader);

    // 2. Load all assets (Images AND Audio)
    await assetLoader.loadAll(ASSET_MANIFEST);
    
    const canvas = document.getElementById('game-canvas'); 
    canvas.width = 800;
    canvas.height = 450;
    
    // The SceneManager will handle creating the EncounterController internally
    sceneManager = new SceneManager(canvas, assetLoader, CONFIG);
    
    gameLoop = new GameLoop(
        (deltaTime) => sceneManager.update(deltaTime), 
        (interpolation, totalTime) => sceneManager.render(interpolation, totalTime)
    );

    gameLoop.start();
}

initialize();

window.gameState = gameState; // Add this line! Expose for console debugging
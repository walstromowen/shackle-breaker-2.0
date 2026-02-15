import { AssetLoader } from "./core/assetLoader.js";
import { SceneManager } from "./core/sceneManager.js";
import { GameLoop } from "./core/gameLoop.js";
import { CONFIG } from "../../shared/data/constants.js";

const assetLoader = new AssetLoader();

// 1. UPDATE: Add the Encounter Background to the manifest
const ASSET_MANIFEST = {
    tileset: './assets/tilesets/plains.png',
    spritesheet: './assets/sprites/hero.png',
    mapObjects: './assets/tilesets/objects.png',
    shadows: './assets/tilesets/shadows.png',

    legionaryHeroPortrait: './assets/sprites/legionary_hero/legionary_hero_portrait.png',
    warlordHeroPortrait: './assets/sprites/warlord_hero/warlord_hero_portrait.png',
    nightbladeHeroPortrait: './assets/sprites/nightblade_hero/nightblade_hero_portrait.png',

    legionaryHeroSprite: './assets/sprites/legionary_hero/legionary_hero_sprite.png',
    warlordHeroSprite: './assets/sprites/warlord_hero/warlord_hero_sprite.png',
    nightbladeHeroSprite: './assets/sprites/nightblade_hero/nightblade_hero_sprite.png',

    legionaryPortrait: './assets/sprites/legionary/legionary_portrait.png',
    wolfPortrait: './assets/sprites/wolf/wolf_portrait.png',
    madmanPortrait: './assets/sprites/madman/madman_portrait.png',
    arcKnightPortrait: './assets/sprites/arc_knight/arc_knight_portrait.png',
    madMagePortrait: './assets/sprites/mad_mage/mad_mage_portrait.png',

    //bonfire_bg: './assets/sprites/bonfire.png',
    items: './assets/icons/items.png', 
    abilities: './assets/icons/abilities.png', 
};

let sceneManager;
let gameLoop;

async function initialize() {
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
import { gameState } from '../../shared/state/gameState.js';
window.gameState = gameState; // Add this line!sss
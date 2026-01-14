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
    
    // Add the specific image defined in your bonfire.js data
    bonfire_bg: './assets/sprites/hero.png', 
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
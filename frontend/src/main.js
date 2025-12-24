import { AssetLoader } from "./core/assetLoader.js";
import { SceneManager } from "./core/sceneManager.js";
import { GameLoop } from "./core/gameLoop.js";
import { CONFIG } from "../../shared/data/constants.js";

const assetLoader = new AssetLoader();
const ASSET_MANIFEST = {
    tileset: './assets/tilesets/plains.png',
    spritesheet: './assets/sprites/hero.png',
};

let sceneManager;
let gameLoop;

async function initialize() {
    await assetLoader.loadAll(ASSET_MANIFEST);
    const canvas = document.getElementById('game-canvas'); 
    canvas.width = 800;
    canvas.height = 450;
    sceneManager = new SceneManager(canvas, assetLoader, CONFIG);
    gameLoop = new GameLoop(
        (deltaTime) => sceneManager.update(deltaTime), 
        (interpolation) => sceneManager.render(interpolation)
    );

    gameLoop.start();
}

initialize();
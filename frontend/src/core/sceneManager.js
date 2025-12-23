import { OverworldController } from '../controllers/overworldController.js';
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { EntityRenderer } from '../renderers/overworld/entityRenderer.js'; // New Import
import { Input } from './input.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d'); // Get ctx here for easier passing
        this.loader = assetLoader;
        this.config = config;

        this.input = new Input();

        // 1. Logic Controllers
        this.overworldController = new OverworldController(this.input, this.config);

        // 2. Renderers
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.entityRenderer = new EntityRenderer(this.loader, this.config); // Initialize here

        this.currentScene = 'overworld';
    }

    update(dt) {
        switch (this.currentScene) {
            case 'overworld':
                this.overworldController.update(dt);
                break;
            case 'battle':
                // this.battleController.update(dt);
                break;
        }
    }

    render(interpolation) {
        if (!this.loader.isDone()) return;

        // Clear the canvas once per frame before any scene draws
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.currentScene) {
            case 'overworld':
                // 1. Get the unified state (map, entities, camera)
                const state = this.overworldController.getState();
                
                // 2. Draw the tiles first
                this.mapRenderer.renderMap(state.map, state.camera);

                // 3. Draw the entities (Player + NPCs) on top
                this.entityRenderer.render(this.ctx, state.entities, state.camera);
                break;

            case 'battle':
                // this.battleRenderer.draw(state);
                break;
        }
    }

    changeScene(newScene) {
        console.log(`Switching scene to: ${newScene}`);
        this.currentScene = newScene;
    }
}
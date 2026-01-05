import { OverworldController } from '../controllers/overworldController.js';
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { EntityRenderer } from '../renderers/overworld/entityRenderer.js';
import { Input } from './input.js';
import { WorldManager } from '../../../shared/systems/worldManager.js'; 

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        this.input = new Input();
        this.worldManager = new WorldManager(); 

        this.overworldController = new OverworldController(
            this.input, 
            this.config, 
            this.worldManager
        );

        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.entityRenderer = new EntityRenderer(this.loader, this.config);

        this.currentScene = 'overworld';

        // --- SYSTEM-WIDE KEY HANDLING ---
        this.setupKeyHandlers();
    }

    setupKeyHandlers() {
        /**
         * We listen for the 'keyPressed' event from our Input class.
         * This fires once per tap, perfect for toggles and menus.
         */
        this.input.on('keyPressed', (code) => {
            
            // 1. GLOBAL KEYS (Work in every scene)
            if (code === 'Backquote') { // The Tilde (~) key
                this.mapRenderer.showDebug = !this.mapRenderer.showDebug;
                console.log(`[Debug Mode] ${this.mapRenderer.showDebug ? 'ENABLED' : 'DISABLED'}`);
            }

            // 2. SCENE-SPECIFIC KEYS
            switch (this.currentScene) {
                case 'overworld':
                    this.handleOverworldKeys(code);
                    break;
                case 'battle':
                    this.handleBattleKeys(code);
                    break;
            }
        });
    }

    handleOverworldKeys(code) {
        if (code === 'Enter') {
            console.log("Opening Overworld Menu...");
            // future: this.openMenu();
        }
    }

    handleBattleKeys(code) {
        // Handle battle-only buttons like '1' for attack
    }

    update(dt) {
        switch (this.currentScene) {
            case 'overworld':
                this.overworldController.update(dt);
                break;
            case 'battle':
                break;
        }
    }

    render(interpolation) {
        if (!this.loader.isDone()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.currentScene) {
            case 'overworld':
                const state = this.overworldController.getState();
                
                // Render Map (Pass WorldManager and Camera)
                // The renderer checks its own internal 'showDebug' flag here
                this.mapRenderer.renderMap(this.worldManager, state.camera);
                this.entityRenderer.render(this.ctx, state.entities, state.camera);
                break;

            case 'battle':
                break;
        }
    }

    changeScene(newScene) {
        console.log(`Switching scene to: ${newScene}`);
        this.currentScene = newScene;
    }
}
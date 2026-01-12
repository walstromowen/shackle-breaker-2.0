import { OverworldController } from '../controllers/overworldController.js';
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { Input } from './input.js'; // The "Dumb" State Container
import { WorldManager } from '../../../shared/systems/worldManager.js'; 
import { TimeSystem } from '../../../shared/systems/timeSystem.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        // 1. Systems
        this.input = new Input();
        this.worldManager = new WorldManager(); 
        this.timeSystem = new TimeSystem();

        // 2. Controllers (The Logic)
        this.overworldController = new OverworldController(
            this.input, 
            this.config, 
            this.worldManager
        );

        // 3. Renderers (The Visuals)
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 

        this.currentScene = 'overworld';

        // 4. Setup Input Routing
        this.setupInputRouting();
    }

    /**
     * THE TRAFFIC COP
     * Listens for discrete key presses and sends them to the active Controller.
     */
    setupInputRouting() {
        window.addEventListener('keydown', (e) => {
            // A. Global Toggles (Always active)
            if (e.code === 'Backquote') { 
                this.mapRenderer.showDebug = !this.mapRenderer.showDebug;
                console.log(`[Debug] ${this.mapRenderer.showDebug ? 'ON' : 'OFF'}`);
            }

            // B. Scene-Specific Routing
            switch (this.currentScene) {
                case 'overworld':
                    // We assume OverworldController now has a handleKeyDown method
                    this.overworldController.handleKeyDown(e.code);
                    break;
                
                case 'battle':
                    // this.battleController.handleKeyDown(e.code);
                    break;

                case 'menu':
                    // this.menuController.handleKeyDown(e.code);
                    break;
            }
        });
    }

    update(dt) {
        this.timeSystem.update(dt);

        // Update the active scene's continuous logic (Movement, AI)
        if (this.currentScene === 'overworld') {
            this.overworldController.update(dt);
        }
    }

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        // Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Active Scene
        if (this.currentScene === 'overworld') {
            this.renderOverworld(totalTime);
        }
    }

    // Broken out for cleanliness
    renderOverworld(totalTime) {
        const state = this.overworldController.getState();
        
        // 1. World & Entities
        this.mapRenderer.renderMap(
            this.worldManager, 
            state.camera, 
            state.entities,
            totalTime 
        );

        // 2. Lighting Overlay
        const ambientColor = this.timeSystem.getCurrentColorData();
        const visibleObjects = this.worldManager.getVisibleObjects(
            state.camera,
            this.canvas.width,
            this.canvas.height
        );

        this.lightingRenderer.render(
            this.ctx, 
            ambientColor, 
            state.camera, 
            state.entities, 
            visibleObjects
        );
       
    }

}
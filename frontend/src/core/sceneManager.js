import { OverworldController } from '../controllers/overworldController.js';
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { EntityRenderer } from '../renderers/overworld/entityRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; // New Import
import { Input } from './input.js';
import { WorldManager } from '../../../shared/systems/worldManager.js'; 
import { TimeSystem } from '../../../shared/systems/timeSystem.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        this.input = new Input();
        this.worldManager = new WorldManager(); 
        this.timeSystem = new TimeSystem();

        this.overworldController = new OverworldController(
            this.input, 
            this.config, 
            this.worldManager
        );

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.entityRenderer = new EntityRenderer(this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); // New Instance

        this.currentScene = 'overworld';
        this.setupKeyHandlers();
    }

    setupKeyHandlers() {
        this.input.on('keyPressed', (code) => {
            if (code === 'Backquote') { 
                this.mapRenderer.showDebug = !this.mapRenderer.showDebug;
                console.log(`[Debug Mode] ${this.mapRenderer.showDebug ? 'ENABLED' : 'DISABLED'}`);
            }
            if (this.currentScene === 'overworld') this.handleOverworldKeys(code);
        });
    }

    handleOverworldKeys(code) {
        if (code === 'Enter') console.log("Opening Overworld Menu...");
    }

    update(dt) {
        this.timeSystem.update(dt);
        if (this.currentScene === 'overworld') {
            this.overworldController.update(dt);
        }
    }

    render(interpolation) {
        if (!this.loader.isDone()) return;

        // 1. Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.currentScene) {
            case 'overworld':
                const state = this.overworldController.getState();
                
                // 2. Render World Layers
                this.mapRenderer.renderMap(this.worldManager, state.camera);
                this.entityRenderer.render(this.ctx, state.entities, state.camera);

                // 3. Render Lighting (Delegated)
                const ambientColor = this.timeSystem.getCurrentColorData();
                this.lightingRenderer.render(this.ctx, ambientColor, state.camera, state.entities);

                // 4. Render UI
                this.renderUI();
                break;

            case 'battle':
                break;
        }
    }

    renderUI() {
        this.ctx.save();
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillStyle = 'white';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        const timeString = this.timeSystem.getFormattedTime();
        this.ctx.fillText(`TIME: ${timeString}`, 15, 30);
        this.ctx.restore();
    }
}
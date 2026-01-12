export class Input {
    constructor() {
        this.heldKeys = new Set();
        this.callbacks = {}; // Storage for event listeners

        // Setup listeners
        window.addEventListener("keydown", (e) => {
            // 1. Movement Polling
            // We only track "held" status for movement keys (WASD/Arrows)
            if (this.isValidKey(e.code)) {
                this.heldKeys.add(e.code);
            }

            // 2. Single-Press Events
            // We emit ALL key presses so the SceneManager can catch
            // special keys like 'Backquote' (~) or 'Enter'
            this.emit('keyPressed', e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });
    }

    /**
     * Event System: Subscriber
     * Allows SceneManager to say: input.on('keyPressed', ...)
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * Event System: Publisher
     * Internal use: Triggers the subscribed functions
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    /**
     * Strict filter for Movement keys only
     */
    isValidKey(code) {
        return [
            "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
            "KeyW", "KeyS", "KeyA", "KeyD"
        ].includes(code);
    }

    /**
     * Helper to get the primary direction being pressed for Movement
     */
    get direction() {
        const keys = Array.from(this.heldKeys);
        const lastKey = keys[keys.length - 1];

        if (lastKey === "ArrowUp" || lastKey === "KeyW") return "UP";
        if (lastKey === "ArrowDown" || lastKey === "KeyS") return "DOWN";
        if (lastKey === "ArrowLeft" || lastKey === "KeyA") return "LEFT";
        if (lastKey === "ArrowRight" || lastKey === "KeyD") return "RIGHT";

        return null;
    }

    isPressed(code) {
        return this.heldKeys.has(code);
    }
}


import { OverworldController } from '../controllers/overworldController.js';
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
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

        // MapRenderer handles visual world + sprite animations
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        
        // LightingRenderer handles darkness overlay + vignettes/glows
        this.lightingRenderer = new LightingRenderer(this.config); 

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

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        // 1. Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.currentScene) {
            case 'overworld':
                const state = this.overworldController.getState();
                
                // 2. Render World & Entities (Base Layer)
                this.mapRenderer.renderMap(
                    this.worldManager, 
                    state.camera, 
                    state.entities,
                    totalTime 
                );

                // 3. Render Lighting (Overlay Layer)
                // Get the ambient color (e.g., dark blue for night)
                const ambientColor = this.timeSystem.getCurrentColorData();
                
                // --- INTEGRATION FIX ---
                // Fetch only the objects currently visible on screen (Campfires, torches, etc.)
                const visibleObjects = this.worldManager.getVisibleObjects(
                    state.camera,
                    this.canvas.width,
                    this.canvas.height
                );

                this.lightingRenderer.render(
                    this.ctx, 
                    ambientColor, 
                    state.camera, 
                    state.entities, // Player/NPCs (for handheld torches if implemented)
                    visibleObjects  // Static objects (Campfires, Houses) <--- CRITICAL FIX
                );

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
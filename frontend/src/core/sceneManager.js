import { events } from './eventBus.js'; 
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { Input } from './input.js';
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';

// --- SHARED IMPORTS ---
import { WorldManager } from '../../../shared/systems/worldManager.js'; 
import { TimeSystem } from '../../../shared/systems/timeSystem.js';
import { gameState } from '../../../shared/state/gameState.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        // 1. Systems
        this.input = new Input();
        
        // initializing WorldManager checks/sets gameState.seed automatically
        this.worldManager = new WorldManager(); 
        this.timeSystem = new TimeSystem();

        // Debug Log: Confirm we are looking at the same state
        console.log(`%c[SceneManager] State Linked. Seed: ${gameState.seed}`, 'color: #00aaaa');

        // 2. Controllers
        this.overworldController = new OverworldController(
            this.input, 
            this.config, 
            this.worldManager
        );

        this.encounterController = new EncounterController(
            this.input,
            this.config,
            this.worldManager 
        );

        // 3. Renderers
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.encounterRenderer = new EncounterRenderer(this.config);
        this.transitionRenderer = new TransitionRenderer(this.config);

        // 4. State Management
        this.currentScene = 'overworld'; 
        
        // --- OPTIMIZATION: Memory Timer ---
        this.pruneTimer = 0;
        this.PRUNE_INTERVAL = 2000; // Check every 2 seconds
        // ----------------------------------

        this.setupInputRouting();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // A. Entering an Encounter (Fade Out -> Switch -> Fade In)
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                console.log("[SceneManager] Starting Transition to:", data.id);
                
                this.transitionRenderer.start(() => {
                    // This runs when the screen is fully black
                    this.encounterController.start(data.id);
                    this.currentScene = 'encounter';
                });
            }
        });

        // B. Exiting an Encounter (Fade Out -> Switch -> Fade In)
        events.on('ENCOUNTER_END', () => {
            console.log("[SceneManager] Returning to Overworld");

            this.transitionRenderer.start(() => {
                // This runs when the screen is fully black
                
                // 1. Clean up the data BEHIND the black screen
                if (this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }

                // 2. Swap the scene
                this.currentScene = 'overworld';
            });
        });
    }

    setupInputRouting() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Backquote') { 
                this.mapRenderer.showDebug = !this.mapRenderer.showDebug;
            }

            // Don't allow input while the screen is fading
            if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') {
                return;
            }

            switch (this.currentScene) {
                case 'overworld':
                    this.overworldController.handleKeyDown(e.code);
                    break;
                
                case 'encounter':
                    this.encounterController.handleKeyDown(e.code);
                    break;
            }
        });
    }

    update(dt) {
        // 1. Update Transition Animation
        this.transitionRenderer.update(dt);

        // 2. Only run World Logic if we are in the Overworld
        // (This pauses the Time System when in Encounter mode)
        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);

            // --- OPTIMIZATION: Memory Pruning ---
            this.pruneTimer += dt;
            if (this.pruneTimer > this.PRUNE_INTERVAL) {
                // Retrieve the camera from the controller so we know where the player is
                const camera = this.overworldController.getState().camera;
                
                // Clean up distant objects
                this.worldManager.prune(camera.x, camera.y);
                
                // Reset timer
                this.pruneTimer = 0;
            }
            // ------------------------------------
        }
    }

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Render Overworld (Always in background)
        this.renderOverworld(totalTime);

        // 2. Render Encounter UI (if active)
        if (this.currentScene === 'encounter') {
            const encounterState = this.encounterController.getState();
            this.encounterRenderer.render(this.ctx, encounterState);
        }

        // 3. Render Transition Overlay (Draws on top of EVERYTHING)
        this.transitionRenderer.render(this.ctx);
    }

    renderOverworld(totalTime) {
        const state = this.overworldController.getState();
        
        this.mapRenderer.renderMap(
            this.worldManager, 
            state.camera, 
            state.entities,
            totalTime 
        );

        const ambientColor = this.timeSystem.getCurrentColorData();
        
        // OPTIMIZATION: Arguments are already correct here!
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
import { events } from './eventBus.js'; 
import { Input } from './input.js';

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreatorController.js'; 
import { PartyController } from '../controllers/partyController.js';

// --- RENDERERS ---
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; 
import { PartyRenderer } from '../renderers/party/partyRenderer.js';

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
        // UPDATED: Pass canvas to Input for mouse coordinate calculation
        this.input = new Input(this.canvas);
        this.worldManager = new WorldManager(); 
        this.timeSystem = new TimeSystem();

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

        this.characterCreatorController = new CharacterCreatorController(); 
        this.partyController = new PartyController();


        // 3. Renderers
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.encounterRenderer = new EncounterRenderer(this.config);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx);

        // 4. State Management
        this.currentScene = 'character-creator'; 
        
        // --- OPTIMIZATION: Memory Timer ---
        this.pruneTimer = 0;
        this.PRUNE_INTERVAL = 2000;

        this.setupInputRouting();
        this.setupEventListeners();
    }

    /**
     * Central method to switch scenes.
     */
    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
    }

    setupEventListeners() {
        // --- STANDARD SCENE CHANGE EVENT ---
        events.on('CHANGE_SCENE', ({ scene }) => {
            this.transitionRenderer.start(() => {
                // Automatic Cleanup
                if (this.currentScene === 'encounter' && this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }

                // Perform the switch
                this.changeScene(scene);
            });
        });

        // --- SPECIFIC: INTERACTION EVENT ---
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id);
                    this.changeScene('encounter');
                });
            }
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

                case 'character-creator':
                    // UPDATED: Pass full event for text entry
                    this.characterCreatorController.handleKeyDown(e);
                    break;

                case 'party': 
                    this.partyController.handleKeyDown(e.code);
                    break;
            }
        });
    }

    update(dt) {
        // 1. Handle Mouse Input (Check for clicks every frame)
        // UPDATED: New logic to route mouse clicks to controllers
        const click = this.input.getAndResetClick();
        if (click) {
            if (this.currentScene === 'character-creator') {
                // Pass click coordinates AND the renderer (to check hitboxes)
                this.characterCreatorController.handleMouseDown(click.x, click.y, this.characterCreatorRenderer);
            }
        }

        // 2. Update Transition Animation
        this.transitionRenderer.update(dt);

        // 3. Scene Logic
        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);
            this.handlePruning(dt);
        }
        
        // Note: Character Creator and Party are fully event-driven (or updated via mouse/key above)
    }

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // --- SCENE RENDERING ---
        if (this.currentScene === 'character-creator') {
            const state = this.characterCreatorController.getState();
            this.characterCreatorRenderer.render(this.ctx, state);
        }
        else if (this.currentScene === 'overworld') {
            this.renderOverworld(totalTime);
        }
        else if (this.currentScene === 'party') {
            const state = this.partyController.getState();
            this.partyRenderer.render(state);
        }
        else if (this.currentScene === 'encounter') {
            this.renderOverworld(totalTime); 
            const encounterState = this.encounterController.getState();
            this.encounterRenderer.render(this.ctx, encounterState);
        }

        // --- OVERLAYS ---
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

    handlePruning(dt) {
        this.pruneTimer += dt;
        if (this.pruneTimer > this.PRUNE_INTERVAL) {
            const camera = this.overworldController.getState().camera;
            this.worldManager.prune(camera.x, camera.y);
            this.pruneTimer = 0;
        }
    }
}
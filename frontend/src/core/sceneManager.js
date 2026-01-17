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
        this.input = new Input();
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

        // Pass 'this' so it can call changeScene()
        this.characterCreatorController = new CharacterCreatorController(this); 
        this.partyController = new PartyController(this);


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
     * NEW: Central method to switch scenes.
     */
    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
    }

    setupEventListeners() {
        // A. Entering an Encounter
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id);
                    this.changeScene('encounter');
                });
            }
        });

        // B. Exiting an Encounter
        events.on('ENCOUNTER_END', () => {
            this.transitionRenderer.start(() => {
                if (this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }
                this.changeScene('overworld');
            });
        });

        events.on('PARTY', () => {
            this.transitionRenderer.start(() => {
                if (this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }
                this.changeScene('party');
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

                // *** CHANGE: Added routing for Character Creator ***
                case 'character-creator':
                    this.characterCreatorController.handleKeyDown(e.code);
                    break;

                case 'party': // NEW: Routing for Party Screen
                    this.partyController.handleKeyDown(e.code);
                    break;
            }
        });
    }

    update(dt) {
        // 1. Update Transition Animation
        this.transitionRenderer.update(dt);

        // 2. Scene Logic
        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);
            this.handlePruning(dt);
        }
        
        // *** CHANGE: Removed Character Creator update() call ***
        // It is now fully event-driven via setupInputRouting above.
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
            // NEW: Render the party screen when active
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
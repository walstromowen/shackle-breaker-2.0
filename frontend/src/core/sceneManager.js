import { events } from './eventBus.js'; 
import { Input } from './input.js';

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreatorController.js'; 
// 1. IMPORT PARTY CONTROLLER
import { PartyController } from '../controllers/partyController.js';

// --- RENDERERS ---
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; 
// 2. IMPORT PARTY RENDERER
import { PartyRenderer } from '../renderers/party/partyRenderer.js';

import { WorldManager } from '../../../shared/systems/worldManager.js'; 
import { TimeSystem } from '../../../shared/systems/timeSystem.js';
import { gameState } from '../../../shared/state/gameState.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        // Systems
        this.input = new Input(this.canvas);
        this.worldManager = new WorldManager(); 
        this.timeSystem = new TimeSystem();

        console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa');

        // --- CONTROLLERS ---
        this.overworldController = new OverworldController(this.input, this.config, this.worldManager);
        this.encounterController = new EncounterController(this.input, this.config, this.worldManager);
        this.characterCreatorController = new CharacterCreatorController(); 
        
        // 3. INIT PARTY CONTROLLER
        this.partyController = new PartyController();

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.encounterRenderer = new EncounterRenderer(this.config);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        
        // 4. INIT PARTY RENDERER (Pass 'this.loader')
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);

        // State
        this.currentScene = 'character-creator'; 
        
        this.setupInputRouting();
        this.setupEventListeners();
    }

    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
    }

    setupEventListeners() {
        events.on('CHANGE_SCENE', ({ scene }) => {
            this.transitionRenderer.start(() => {
                // Cleanup specific scenes if needed
                if (this.currentScene === 'encounter' && this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }
                this.changeScene(scene);
            });
        });

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
            // Block input during transitions
            if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return;

            // Debug Toggle
            if (e.code === 'Backquote') this.mapRenderer.showDebug = !this.mapRenderer.showDebug;

            switch (this.currentScene) {
                case 'overworld':
                    this.overworldController.handleKeyDown(e.code);
                    break;
                case 'encounter':
                    this.encounterController.handleKeyDown(e.code);
                    break;
                case 'character-creator':
                    this.characterCreatorController.handleKeyDown(e);
                    break;
                // 5. ROUTE INPUT TO PARTY
                case 'party': 
                    this.partyController.handleKeyDown(e.code);
                    break;
            }
        });
    }

    update(dt) {
        // Mouse Check
        const click = this.input.getAndResetClick();
        if (click && this.currentScene === 'character-creator') {
            this.characterCreatorController.handleMouseDown(click.x, click.y, this.characterCreatorRenderer);
        }

        this.transitionRenderer.update(dt);

        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);
        }
        // Party & Character Creator are event-driven, no frame update needed
    }

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 6. RENDER LOOP SWITCH
        switch (this.currentScene) {
            case 'character-creator':
                const ccState = this.characterCreatorController.getState();
                this.characterCreatorRenderer.render(this.ctx, ccState);
                break;

            case 'overworld':
                this.renderOverworld(totalTime);
                break;

            case 'party':
                const pState = this.partyController.getState();
                this.partyRenderer.render(pState);
                break;

            case 'encounter':
                this.renderOverworld(totalTime); // Render world behind encounter
                const encState = this.encounterController.getState();
                this.encounterRenderer.render(this.ctx, encState);
                break;
        }

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
}
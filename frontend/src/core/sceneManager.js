import { events } from './eventBus.js';
import { Input } from './input.js';

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreatorController.js'; 
import { PartyController } from '../controllers/partyController.js';
import { CharacterSummaryController } from '../controllers/characterSummaryController.js'; 

// --- RENDERERS ---
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; 
import { PartyRenderer } from '../renderers/party/partyRenderer.js';
import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js'; 

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
        this.partyController = new PartyController();
        this.characterSummaryController = null; // Initialized on demand

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.encounterRenderer = new EncounterRenderer(this.config);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        
        // Pass this.loader here so the renderer can draw portraits
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); 

        // State
        this.currentScene = 'character-creator'; 
        
        // Bind the router so we can remove it later
        this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);

        this.setupInputRouting();
        this.setupEventListeners();
    }

    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
    }

    setupEventListeners() {
        events.on('CHANGE_SCENE', ({ scene, data }) => {
            this.transitionRenderer.start(() => {
                
                // Cleanup specific to exiting scenes
                if (this.currentScene === 'encounter' && this.encounterController.cleanup) {
                    this.encounterController.cleanup();
                }

                // Logic for Character Summary initialization
                if (scene === 'character_summary') {
                    // We re-instantiate to pass fresh data (e.g. memberIndex)
                    // Note: We pass 'this.input' so the controller can check button states directly
                    this.characterSummaryController = new CharacterSummaryController(this.input, data);
                }

                this.changeScene(scene);
            });
        });

        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id, data.context);
                    this.changeScene('encounter');
                });
            }
        });
    }

    setupInputRouting() {
        // We use a named reference now so we can remove it in destroy()
        window.addEventListener('keydown', this._handleGlobalKeydown);
    }

    _handleGlobalKeydown(e) {
        if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return;
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
            case 'party': 
                this.partyController.handleKeyDown(e.code);
                break;
            case 'character_summary':
                if (this.characterSummaryController) {
                    this.characterSummaryController.handleKeyDown(e.code);
                }
                break;
        }
    }

    update(dt) {
        // --- 1. MOUSE CHECK ---
        const click = this.input.getAndResetClick();
        const scroll = this.input.getAndResetScroll();
        const mousePos = this.input.getMousePosition(); // {x, y}
        const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false;

        // --- Handle Input per Scene ---
        if (this.currentScene === 'character_summary' && this.characterSummaryController) {
            
            // A. Update Raw Mouse Pos & Drag State
            // We pass isMouseDown here to help the controller handle dragging logic
            this.characterSummaryController.handleMouseMove?.(mousePos.x, mousePos.y, isMouseDown);

            // B. Hit Testing (The "Bridge")
            const hitZoneId = this.characterSummaryRenderer.getHitZone(mousePos.x, mousePos.y);
            
            // C. Pass Hover ID to Controller (for Tooltips)
            this.characterSummaryController.handleHover?.(hitZoneId);

            // D. Handle Interactions (Clicks)
            if (click && hitZoneId) {
                this.characterSummaryController.handleInteraction(hitZoneId);
            }

            // E. Handle Scroll
            if (scroll !== 0) {
                this.characterSummaryController.handleScroll?.(scroll);
            }
        } 
        else if (click) {
            // Legacy handling for other scenes
            if (this.currentScene === 'character-creator') {
                this.characterCreatorController.handleMouseDown(click.x, click.y, this.characterCreatorRenderer);
            } 
            else if (this.currentScene === 'party') {
                this.partyController.handleMouseDown(click.x, click.y, this.partyRenderer);
            }
        }

        // --- 2. REGULAR UPDATES ---
        this.transitionRenderer.update(dt);

        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);
        }
    }

    render(interpolation, totalTime) { 
        if (!this.loader.isDone()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
                this.renderOverworld(totalTime);
                const encState = this.encounterController.getState();
                this.encounterRenderer.render(this.ctx, encState);
                break;

            case 'character_summary':
                if (this.characterSummaryController) {
                    const csState = this.characterSummaryController.getState();
                    this.characterSummaryRenderer.render(csState);
                }
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

    /**
     * Clean up event listeners. 
     * Call this if destroying the game instance or hot-reloading.
     */
    destroy() {
        this.input.destroy();
        // Fix: Remove the global listener we added
        window.removeEventListener('keydown', this._handleGlobalKeydown);
    }
}
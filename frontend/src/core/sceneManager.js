import { events } from './eventBus.js';
import { Input } from './input.js';

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreatorController.js'; 
import { PartyController } from '../controllers/partyController.js';
import { CharacterSummaryController } from '../controllers/characterSummaryController.js'; 
import { BattleController } from '../controllers/battleController.js';

// --- RENDERERS ---
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; 
import { PartyRenderer } from '../renderers/party/partyRenderer.js';
import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js'; 
import { BattleRenderer } from '../renderers/battle/battleRenderer.js';

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

        // 1. INITIALIZE BATTLE CONTROLLER
        this.battleController = new BattleController(this.input, this.config, this.worldManager);

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.encounterRenderer = new EncounterRenderer(this.config);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        
        // Pass this.loader here so the renderer can draw portraits
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); 

        // 2. INITIALIZE BATTLE RENDERER
        this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader);

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
        // 1. General Scene Switching (Menus, etc.)
        events.on('CHANGE_SCENE', ({ scene, data }) => {
            this.transitionRenderer.start(() => {
                
                // Reset Input to prevent stuck keys
                this.input.reset(); 

                // Unlock Overworld if returning
                if (scene === 'overworld') {
                    // console.log("[SceneManager] Unlocking Overworld");
                    this.overworldController.isLocked = false;
                }

                // Handle Scene Specific Data
                if (scene === 'character_summary') {
                    this.characterSummaryController = new CharacterSummaryController(this.input, data);
                }

                this.changeScene(scene);
            });
        });

        // 2. Physical Interactions (Chests, NPCs, Signs)
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    // This is likely for Dialogue/Text interactions
                    this.encounterController.start(data.id, data.context);
                    this.changeScene('encounter');
                });
            }
        });

        // 3. Combat Triggers (Ambush, Scripted Bosses)
        events.on('START_BATTLE', (data) => {
            this.transitionRenderer.start(() => {
                console.log("[SceneManager] Handing off entities to BattleController:", data.enemies);
                
                // Keep it decoupled: Pass data natively. No callbacks needed!
                this.battleController.start(data.enemies, data.context);
                
                this.changeScene('battle');
            });
        });

        // 4. NEW: Listen for the end of the battle to handle routing cleanly
        events.on('BATTLE_ENDED', (data) => {
            if (data.victory) {
                console.log("[SceneManager] Victory! Transitioning back to Overworld.");
                events.emit('CHANGE_SCENE', { scene: 'overworld' });
            } else {
                console.log("[SceneManager] The party was defeated! Routing to Game Over...");
                // NOTE: When you build your Game Over scene, route it here:
                // events.emit('CHANGE_SCENE', { scene: 'game_over' }); 
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
            
            // 3. ROUTE INPUT TO BATTLE
            case 'battle':
                this.battleController.handleKeyDown(e.code);
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
        const rightClick = this.input.getAndResetRightClick();
        const scroll = this.input.getAndResetScroll();
        const mousePos = this.input.getMousePosition(); 
        const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false;

        // ============================================================
        // SCENE SPECIFIC UPDATES
        // ============================================================

        // --- A. CHARACTER CREATOR ---
        if (this.currentScene === 'character-creator') {
            if (this.characterCreatorController.handleMouseMove) {
                this.characterCreatorController.handleMouseMove(mousePos.x, mousePos.y);
            }
            if (click) {
                this.characterCreatorController.handleMouseDown(click.x, click.y);
            }
        }

        // --- B. CHARACTER SUMMARY ---
        else if (this.currentScene === 'character_summary' && this.characterSummaryController) {
            this.characterSummaryController.handleMouseMove?.(mousePos.x, mousePos.y, isMouseDown);
            
            const hitZoneId = this.characterSummaryRenderer.getHitZone(mousePos.x, mousePos.y);
            this.characterSummaryController.handleHover?.(hitZoneId);

            if (click && hitZoneId) {
                this.characterSummaryController.handleInteraction(hitZoneId);
            }
            
            if (rightClick) {
                const rightClickZoneId = this.characterSummaryRenderer.getHitZone(rightClick.x, rightClick.y);
                this.characterSummaryController.handleRightClick(rightClickZoneId);
            }

            if (scroll !== 0) {
                this.characterSummaryController.handleScroll?.(scroll);
            }
        } 
        
        // --- C. LEGACY / OTHER SCENES ---
        else if (click) {
            if (this.currentScene === 'party') {
                this.partyController.handleMouseDown(click.x, click.y, this.partyRenderer);
            }
        }

        // --- 2. REGULAR UPDATES ---
        this.transitionRenderer.update(dt);

        if (this.currentScene === 'overworld') {
            this.timeSystem.update(dt); 
            this.overworldController.update(dt);
        }
        
        // 4. UPDATE BATTLE [DEBUGGING THIS SECTION]
        if (this.currentScene === 'battle') {
            // Check 1: Does the method exist?
            if (typeof this.battleController.update !== 'function') {
                console.error("CRITICAL ERROR: BattleController is missing 'update()' method! Please save BattleController.js and refresh.");
            } else {
                // Check 2: Is it running?
                // console.log("Battle updating... DT:", dt); // Uncomment this to flood console and prove it runs
                this.battleController.update(dt);
            }
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

            // 5. RENDER BATTLE
            case 'battle':
                // We render the overworld behind the battle for context
                this.renderOverworld(totalTime);
                const batState = this.battleController.getState();
                this.battleRenderer.render(batState);
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
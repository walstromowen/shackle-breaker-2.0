import { events } from './eventBus.js';
import { Input } from './input.js';
import { UIInteractionManager } from './UIInteractionManager.js'; 

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworld/overworldController.js';
import { EncounterController } from '../controllers/encounter/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreator/characterCreatorController.js'; 
import { PartyController } from '../controllers/party/partyController.js';
import { CharacterSummaryController } from '../controllers/characterSummary/characterSummaryController.js'; 
import { BattleController } from '../controllers/battle/battleController.js';
import { LevelUpController } from '../controllers/levelUp/levelUpController.js';    

// --- RENDERERS ---
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; 
import { WeatherRenderer } from '../renderers/overworld/weatherRenderer.js'; 
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; 
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; 
import { PartyRenderer } from '../renderers/party/partyRenderer.js';
import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js'; 
import { BattleRenderer } from '../renderers/battle/battleRenderer.js';
import { LevelUpRenderer } from '../renderers/levelUp/levelUpRenderer.js';

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
        this.uiInteractionManager = new UIInteractionManager(); 
        console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa');

        // --- CONTROLLERS ---
        this.overworldController = new OverworldController(this.input, this.config, this.worldManager);
        this.encounterController = new EncounterController(this.input, this.config, this.worldManager);
        this.characterCreatorController = new CharacterCreatorController(); 
        this.partyController = new PartyController(this.input);
        this.characterSummaryController = null; 
        this.levelUpController = new LevelUpController(this.input); 
        this.battleController = new BattleController(this.input, this.config, this.worldManager);

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader);
        this.encounterRenderer = new EncounterRenderer(this.config, this.loader);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); 
        this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader); 
        this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader);

        // State
        this.currentScene = 'character-creator'; 
        
        this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);
        this.setupInputRouting();
        this.setupEventListeners();
    }

    resolveTargetBGM(targetScene) {
        if (targetScene === 'battle') return 'plainsBattle1';
        if (targetScene === 'overworld') return 'plainsOverworldDay';
        return null; 
    }

    resolveTargetAmbience(targetScene) {
        if (['party', 'character_summary', 'level_up'].includes(targetScene)) return null;
        if (['battle', 'encounter', 'character-creator'].includes(targetScene)) return 'none';
        
        if (gameState.world && gameState.world.currentWeather) {
            return gameState.world.currentWeather.audioEffect || 'none';
        }
        return 'none';
    }

    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
        
        const targetBGM = this.resolveTargetBGM(sceneName);
        if (targetBGM !== null) { 
            events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 });
        }

        const targetAmbience = this.resolveTargetAmbience(sceneName);
        if (targetAmbience !== null) { 
            if (targetAmbience === 'none') {
                events.emit('STOP_AMBIENCE', { fadeTime: 1.0 });
            } else {
                events.emit('PLAY_AMBIENCE', { id: targetAmbience, fadeTime: 2.0 }); 
            }
        }
    }

    setupEventListeners() {
        events.on('CHANGE_SCENE', ({ scene, data }) => {
            this.transitionRenderer.start(() => {
                this.input.reset(); 
                if (scene === 'overworld') this.overworldController.isLocked = false;
                
                if (scene === 'character_summary') {
                    this.characterSummaryController = new CharacterSummaryController(this.input, data);
                }
                if (scene === 'level_up') {
                    this.levelUpController.init(data); 
                }
                if (scene === 'party') {
                    this.partyController.init(data || {}); 
                }
                this.changeScene(scene);
            }, 'fade'); 
        });
        
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id, data.context);
                    this.changeScene('encounter');
                }, 'fade'); 
            }
        });

        events.on('START_ENCOUNTER', (data) => {
            this.transitionRenderer.start(() => {
                this.encounterController.start(data.encounterId, data.context || {});
                this.changeScene('encounter');
            }, 'fade'); 
        });

        events.on('START_BATTLE', (data) => {
            this.transitionRenderer.start(() => {
                console.log("[SceneManager] Handing off entities to BattleController:", data.enemies);
                const context = data.context || {};
                context.backgroundId = data.background; 
                context.weather = data.weather; 

                this.battleController.start(data.enemies, context);
                this.changeScene('battle'); 
            }, 'flash', { speed: 4.0, color: '#ffffff' }); 
        });

        events.on('BATTLE_ENDED', (data) => {
            if (data.victory) {
                events.emit('CHANGE_SCENE', { scene: 'overworld' }); 
            } else {
                console.log("[SceneManager] Game Over...");
            }
        });

        events.on('REQUEST_PARTY_SWAP', (data) => {
            this.transitionRenderer.start(() => {
                this.partyController.init({
                    mode: data.mode || 'BATTLE_SELECT', 
                    activeIndices: data.activeIndices,
                    callback: data.callback 
                });
                this.changeScene('party');
            }, 'wipe', { speed: 3.0 }); 
        });

        events.on('CHARACTER_RECRUITED', (data) => {
            this.transitionRenderer.start(() => {
                this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.character });
                this.changeScene('character_summary');
            }, 'wipe', { speed: 3.0 });
        });

        events.on('TOGGLE_CHARACTER_SUMMARY', (data) => {
            this.transitionRenderer.start(() => {
                this.characterSummaryController = new CharacterSummaryController(this.input, { 
                    character: data.combatant,
                    returnScene: 'battle',
                    phase: data.phase,
                    onItemSelected: data.onItemSelected 
                });
                
                this.changeScene('character_summary');
            }, 'wipe', { speed: 4.0 }); 
        });
    }

    setupInputRouting() {
        window.addEventListener('keydown', this._handleGlobalKeydown);
    }

    _handleGlobalKeydown(e) {
        if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return;
        if (e.code === 'Backquote') this.mapRenderer.showDebug = !this.mapRenderer.showDebug;

        // --- POLYMORPHIC KEYDOWN ROUTING ---
        const activeController = this._getActiveController();
        if (activeController && activeController.handleKeyDown) {
            // Note: Passed both e.code and e in case some older controllers still expect the raw event
            activeController.handleKeyDown(e.code, e);
        }
    }

    _getActiveController() {
        switch (this.currentScene) {
            case 'overworld': return this.overworldController;
            case 'encounter': return this.encounterController;
            case 'battle': return this.battleController;
            case 'character-creator': return this.characterCreatorController;
            case 'party': return this.partyController;
            case 'character_summary': return this.characterSummaryController;
            case 'level_up': return this.levelUpController;
            default: return null;
        }
    }

    // Helper to fetch active renderer (useful for generic mouse clicks that depend on UI layout)
    _getActiveRenderer() {
        switch (this.currentScene) {
            case 'overworld': return this.mapRenderer;
            case 'encounter': return this.encounterRenderer;
            case 'battle': return this.battleRenderer;
            case 'character-creator': return this.characterCreatorRenderer;
            case 'party': return this.partyRenderer;
            case 'character_summary': return this.characterSummaryRenderer;
            case 'level_up': return this.levelUpRenderer;
            default: return null;
        }
    }

    update(dt) {
        let click = this.input.getAndResetClick();
        let rightClick = this.input.getAndResetRightClick();
        const scroll = this.input.getAndResetScroll();
        const mousePos = this.input.getMousePosition(); 
        const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false;
        
        const activeController = this._getActiveController();
        const activeRenderer = this._getActiveRenderer();

        if (activeController) {
            const inputProxy = {
                getMousePosition: () => mousePos,
                getIsMouseDown: () => isMouseDown,
                getAndResetClick: () => click,
                getAndResetRightClick: () => rightClick
            };
            
            // UI Interaction Manager
            const uiResult = this.uiInteractionManager.update(inputProxy, activeController);
            if (uiResult) {
                if (uiResult.handledClick) click = null;
                if (uiResult.handledRightClick) rightClick = null;
            }

            // --- POLYMORPHIC MOUSE/INPUT ROUTING ---
            // Relying on the new Base Controller interface to standardize inputs
            if (activeController.handleMouseMove) {
                activeController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown, activeRenderer);
            }
            if (click && activeController.handleMouseDown) {
                // Passed activeRenderer here to support Party/LevelUp controllers that previously required it
                activeController.handleMouseDown(click.x, click.y, activeRenderer);
            }
            if (rightClick && activeController.handleRightClick) {
                activeController.handleRightClick(rightClick.x, rightClick.y);
            }
            if (scroll !== 0 && activeController.handleScroll) {
                activeController.handleScroll(scroll);
            }

            // --- POLYMORPHIC CONTROLLER UPDATE ---
            if (activeController.update) {
                activeController.update(dt);
            }
        }

        // --- GLOBAL & ENVIRONMENTAL UPDATES ---
        this.transitionRenderer.update(dt);

        // Weather and Time updates (Only relevant in specific scenes)
        if (['overworld', 'encounter', 'battle'].includes(this.currentScene)) {
            if (this.currentScene === 'overworld') {
                this.timeSystem.update(dt); 
            }
            if (this.weatherRenderer.update && this.overworldController.getState().camera) {
                this.weatherRenderer.update(dt, this.overworldController.getState().camera);
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
                this.renderOverworld(interpolation, totalTime); 
                break;
            case 'party':
                const pState = this.partyController.getState();
                this.partyRenderer.render(pState);
                break;
            case 'encounter':
                this.renderOverworld(interpolation, totalTime); 
                const encState = this.encounterController.getState();
                this.encounterRenderer.render(this.ctx, encState);
                break;
            case 'battle':
                this.renderOverworld(interpolation, totalTime); 
                const batState = this.battleController.getState();
                this.battleRenderer.render(batState);
                break;
            case 'character_summary':
                if (this.characterSummaryController) {
                    const csState = this.characterSummaryController.getState();
                    this.characterSummaryRenderer.render(csState);
                }
                break;
            case 'level_up':
                const luState = this.levelUpController.getState();
                this.levelUpRenderer.render(luState);
                break;
        }

        this.transitionRenderer.render(this.ctx);
    }

    renderOverworld(interpolation, totalTime) { 
        const state = this.overworldController.getState();
        const ambientColor = this.timeSystem.getCurrentColorData();
        
        this.mapRenderer.renderMap(
            this.worldManager, 
            state.camera, 
            state.entities,
            interpolation, 
            totalTime,
            this.lightingRenderer,
            ambientColor,
            this.weatherRenderer 
        );
    }

    destroy() {
        this.input.destroy();
        window.removeEventListener('keydown', this._handleGlobalKeydown);
    }
}
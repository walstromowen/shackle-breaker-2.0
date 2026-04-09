import { events } from './eventBus.js';
import { Input } from './input.js';

// --- CONTROLLERS ---
import { OverworldController } from '../controllers/overworldController.js';
import { EncounterController } from '../controllers/encounterController.js'; 
import { CharacterCreatorController } from '../controllers/characterCreatorController.js'; 
import { PartyController } from '../controllers/partyController.js';
import { CharacterSummaryController } from '../controllers/characterSummaryController.js'; 
import { BattleController } from '../controllers/battleController.js';
import { LevelUpController } from '../controllers/levelUpController.js';    

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

        console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa');

        // --- CONTROLLERS ---
        this.overworldController = new OverworldController(this.input, this.config, this.worldManager);
        this.encounterController = new EncounterController(this.input, this.config, this.worldManager);
        this.characterCreatorController = new CharacterCreatorController(); 
        this.partyController = new PartyController();
        this.characterSummaryController = null; // Initialized on demand
        this.levelUpController = new LevelUpController(this.input); // <-- NEW

        // 1. INITIALIZE BATTLE CONTROLLER
        this.battleController = new BattleController(this.input, this.config, this.worldManager);

        // --- RENDERERS ---
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config); 
        this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader);
        this.encounterRenderer = new EncounterRenderer(this.config, this.loader);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        
        // Pass this.loader here so the renderer can draw portraits
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); 
        this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader); // <-- NEW

        // 2. INITIALIZE BATTLE RENDERER
        this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader);

        // State
        this.currentScene = 'character-creator'; 
        
        // Bind the router so we can remove it later
        this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);

        this.setupInputRouting();
        this.setupEventListeners();
    }

    resolveTargetBGM(targetScene) {
        if (targetScene === 'battle') {
            return 'plainsBattle1';
        }
        
        if (targetScene === 'overworld') {
            return 'plainsOverworldDay';
        }
        
        // By returning null for menus and encounters, we tell changeScene() 
        // to skip emitting a new PLAY_MUSIC event, allowing whatever is 
        // currently playing to continue uninterrupted!
        return null; 
    }

    resolveTargetAmbience(targetScene) {
        // NEW: Don't change ambience at all if we're just opening a menu screen
        if (['party', 'character_summary', 'level_up'].includes(targetScene)) {
            return null;
        }

        // Stop ambience during combat, encounters, or character creation to build focus/tension
        if (targetScene === 'battle' || targetScene === 'encounter' || targetScene === 'character-creator') {
            return 'none';
        }
        
        // Decoupled: For overworld, just ask the active weather object 
        if (gameState.world && gameState.world.currentWeather) {
            return gameState.world.currentWeather.audioEffect || 'none';
        }
        
        return 'none';
    }

    changeScene(sceneName) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;
        
        // 1. Manage Music
        const targetBGM = this.resolveTargetBGM(sceneName);
        // Check specifically against null so it doesn't trigger on 'none' or false
        if (targetBGM !== null) { 
            events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 });
        }

        // 2. Manage Weather Ambience
        const targetAmbience = this.resolveTargetAmbience(sceneName);
        if (targetAmbience !== null) { // Only change ambience if it isn't null
            if (targetAmbience === 'none') {
                events.emit('STOP_AMBIENCE', { fadeTime: 1.0 });
            } else {
                events.emit('PLAY_AMBIENCE', { id: targetAmbience, fadeTime: 2.0 }); 
            }
        }
    }
    setupEventListeners() {
        // 1. General Scene Switching -> Classic Fade
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
        
        // 2. Physical Interactions -> Circle Iris Wipe
        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id, data.context);
                    this.changeScene('encounter');
                }, 'fade'); 
            }
        });

        // 2.5 Random Map Encounters -> Classic Fade
        events.on('START_ENCOUNTER', (data) => {
            this.transitionRenderer.start(() => {
                this.encounterController.start(data.encounterId, data.context || {});
                this.changeScene('encounter');
            }, 'fade'); 
        });

        // 3. Combat Triggers -> Fast White Flash
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

        // 5. Party Swap Routing -> Quick Wipe
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

        // ---> NEW BLOCK START <---
        // 6. Character Recruitment -> Switch to Character Summary View
        events.on('CHARACTER_RECRUITED', (data) => {
            this.transitionRenderer.start(() => {
                this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.character });
                this.changeScene('character_summary');
            }, 'wipe', { speed: 3.0 });
        });
        // 7. Open Character Summary from Battle
        events.on('TOGGLE_CHARACTER_SUMMARY', (data) => {
            this.transitionRenderer.start(() => {
                this.characterSummaryController = new CharacterSummaryController(this.input, { 
                    character: data.combatant,
                    returnScene: 'battle',
                    phase: data.phase,
                    // --- NEW: Pass the callback down to the controller ---
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

        switch (this.currentScene) {
            case 'overworld':
                this.overworldController.handleKeyDown(e.code);
                break;
            case 'encounter':
                this.encounterController.handleKeyDown(e.code);
                break;
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
            case 'level_up':
                this.levelUpController.handleKeyDown(e.code);
                break;
        }
    }

    update(dt) {
        // 1. UPDATE GLOBAL SYSTEMS (Runs in every scene)
        const click = this.input.getAndResetClick();
        const rightClick = this.input.getAndResetRightClick();
        const scroll = this.input.getAndResetScroll();
        const mousePos = this.input.getMousePosition(); 
        const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false;
        
        // ============================================================
        // SCENE SPECIFIC UPDATES & INPUT HANDLING
        // ============================================================

        switch (this.currentScene) {
            case 'character-creator':
                if (this.characterCreatorController.handleMouseMove) {
                    this.characterCreatorController.handleMouseMove(mousePos.x, mousePos.y);
                }
                if (click) {
                    this.characterCreatorController.handleMouseDown(click.x, click.y);
                }
                break;

            case 'character_summary':
                if (this.characterSummaryController) {
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
                break;

            case 'level_up':
                if (click) {
                    this.levelUpController.handleMouseDown(click.x, click.y, this.levelUpRenderer);
                }
                break;

            case 'party':
                if (click) {
                    this.partyController.handleMouseDown(click.x, click.y, this.partyRenderer);
                }
                break;

            // ---> NEW: Added mouse routing for gameplay scenes <---
            case 'overworld':
                if (this.overworldController.handleMouseMove) {
                    this.overworldController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown);
                }
                if (click && this.overworldController.handleMouseDown) {
                    this.overworldController.handleMouseDown(click.x, click.y);
                }
                if (rightClick && this.overworldController.handleRightClick) {
                    this.overworldController.handleRightClick(rightClick.x, rightClick.y);
                }
                if (scroll !== 0 && this.overworldController.handleScroll) {
                    this.overworldController.handleScroll(scroll);
                }
                break;

            // Updated Encounter Mouse Logic
            case 'encounter':
                if (this.encounterController.handleMouseInput) {
                    // 1. Ask the renderer what button index the mouse is hovering over
                    const hoverIndex = this.encounterRenderer.getButtonIndex?.(mousePos.x, mousePos.y);
                    
                    // Send hover data
                    this.encounterController.handleMouseInput({ 
                        type: 'hover', 
                        index: hoverIndex 
                    });

                    // 2. If clicked, resolve the click target and send click data
                    if (click) {
                        const clickIndex = this.encounterRenderer.getButtonIndex?.(click.x, click.y);
                        this.encounterController.handleMouseInput({ 
                            type: 'click', 
                            index: clickIndex 
                        });
                    }
                }
                break;

            case 'battle':
                if (this.battleController.handleMouseMove) {
                    this.battleController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown);
                }
                if (click && this.battleController.handleMouseDown) {
                    this.battleController.handleMouseDown(click.x, click.y);
                }
                if (rightClick && this.battleController.handleRightClick) {
                    this.battleController.handleRightClick(rightClick.x, rightClick.y);
                }
                break;
            // ---> END NEW BLOCK <---
        }

        // --- 2. REGULAR UPDATES ---
        this.transitionRenderer.update(dt);

        if (this.currentScene === 'overworld') {
            // TIME NOW ONLY PROGRESSES HERE!
            this.timeSystem.update(dt); 

            this.overworldController.update(dt);
            if (this.weatherRenderer.update) {
                this.weatherRenderer.update(dt, this.overworldController.getState().camera);
            }
        }
        
        // ---> NEW BLOCK START <---
        if (this.currentScene === 'encounter') {
            // This is what makes the textTimer tick!
            this.encounterController.update(dt); 
            
            // Keep the weather animating in the background of encounters
            if (this.weatherRenderer.update) {
                this.weatherRenderer.update(dt, this.overworldController.getState().camera);
            }
        }
        // ---> NEW BLOCK END <---
        
        if (this.currentScene === 'battle') {
            if (typeof this.battleController.update !== 'function') {
                console.error("CRITICAL ERROR: BattleController is missing 'update()' method! Please save BattleController.js and refresh.");
            } else {
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
                this.renderOverworld(interpolation, totalTime); // <-- UPDATED
                break;
            case 'party':
                const pState = this.partyController.getState();
                this.partyRenderer.render(pState);
                break;
            case 'encounter':
                this.renderOverworld(interpolation, totalTime); // <-- UPDATED
                const encState = this.encounterController.getState();
                this.encounterRenderer.render(this.ctx, encState);
                break;
            case 'battle':
                this.renderOverworld(interpolation, totalTime); // <-- UPDATED
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
        
        // 1. Draw Map, Entities, Weather, AND Lighting in one pass
        this.mapRenderer.renderMap(
            this.worldManager, 
            state.camera, 
            state.entities,
            interpolation, 
            totalTime,
            this.lightingRenderer,
            ambientColor,
            this.weatherRenderer // <-- Pass the weather renderer down!
        );
    }

    destroy() {
        this.input.destroy();
        window.removeEventListener('keydown', this._handleGlobalKeydown);
    }
}
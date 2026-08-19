import { events } from './eventBus.js';
import { Input } from './input.js';
import { UIInteractionManager } from './UIInteractionManager.js';

// --- CONTROLLERS ---
import { BootController } from '../controllers/boot/bootController.js';        
import { TitleController } from '../controllers/title/titleController.js';      
import { OverworldController } from '../controllers/overworld/overworldController.js';
import { EncounterController } from '../controllers/encounter/encounterController.js';
import { CharacterCreatorController } from '../controllers/characterCreator/characterCreatorController.js';
import { PartyController } from '../controllers/party/partyController.js';
import { CharacterSummaryController } from '../controllers/characterSummary/characterSummaryController.js';
import { BattleController } from '../controllers/battle/battleController.js';
import { LevelUpController } from '../controllers/levelUp/levelUpController.js';
import { JournalController } from '../controllers/journal/journalController.js';
import { ShopController } from '../controllers/shop/shopController.js';          // <-- NEW

// --- RENDERERS ---
import { BootRenderer } from '../renderers/boot/bootRenderer.js';               
import { TitleRenderer } from '../renderers/title/titleRenderer.js';            
import { MapRenderer } from '../renderers/overworld/mapRenderer.js';
import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js';
import { WeatherRenderer } from '../renderers/overworld/weatherRenderer.js';
import { OverworldUIRenderer } from '../renderers/overworld/overworldUIRenderer.js';
import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js';
import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js';
import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js';
import { PartyRenderer } from '../renderers/party/partyRenderer.js';
import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js';
import { BattleRenderer } from '../renderers/battle/battleRenderer.js';
import { LevelUpRenderer } from '../renderers/levelUp/levelUpRenderer.js';
import { JournalRenderer } from '../renderers/journal/journalRenderer.js';
import { ShopRenderer } from '../renderers/shop/shopRenderer.js';                // <-- NEW

import { PartyManager } from '../../../shared/systems/partyManager.js';
import { WorldManager } from '../../../shared/systems/worldManager.js';
import { TimeSystem } from '../../../shared/systems/timeSystem.js';
import { gameState } from '../../../shared/state/gameState.js';
import { DIFFICULTY_MODIFIERS } from '../../../shared/data/constants.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';

export class SceneManager {
    constructor(canvas, assetLoader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = assetLoader;
        this.config = config;

        // Systems
        this.input = new Input(this.canvas);
        this.worldManager = null;
        this.timeSystem = new TimeSystem();
        this.uiInteractionManager = new UIInteractionManager();

        console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa');

        // --- CONTROLLERS ---
        this.bootController = new BootController(this.input, this.loader);  
        this.titleController = new TitleController(this.input);             
        this.characterCreatorController = new CharacterCreatorController();
        this.partyController = new PartyController(this.input);
        this.levelUpController = new LevelUpController(this.input);
        this.journalController = new JournalController(this.input);
        this.shopController = new ShopController(this.input);                    // <-- NEW
        
        this.overworldController = null;
        this.encounterController = null;
        this.battleController = null;
        this.characterSummaryController = null;

        // --- RENDERERS ---
        this.bootRenderer = new BootRenderer(this.canvas);                                 
        this.titleRenderer = new TitleRenderer(this.canvas, this.config, this.loader);     
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config);
        this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader);
        this.overworldUIRenderer = new OverworldUIRenderer(this.config, this.loader);
        this.encounterRenderer = new EncounterRenderer(this.config, this.loader);
        this.transitionRenderer = new TransitionRenderer(this.config);
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader);
        this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader);
        this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader);
        this.journalRenderer = new JournalRenderer(this.config, this.loader);
        this.shopRenderer = new ShopRenderer(this.ctx, this.loader);             // <-- NEW

        // State
        this.currentScene = 'boot'; 

        // --- NEW: Audio Memory Cache ---
        this.activeBattleBGM = null;
        this.activeEncounterBGM = null;

        this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);
        this.setupInputRouting();
        this.setupEventListeners();
    }

    resolveTargetBGM(targetScene, sceneContext = {}) {
        // 1. Explicit scene context overrides
        if (sceneContext.bgm) return sceneContext.bgm;

        // 2. Main menu and Boot exceptions (No world map exists yet)
        if (targetScene === 'boot') return null; 
        if (targetScene === 'title') return 'shackle_breaker_theme_1';
        if (targetScene === 'character-creator') return null;

        // 3. Cached Battle/Encounter overrides
        if (targetScene === 'battle' && this.activeBattleBGM) return this.activeBattleBGM;
        if (targetScene === 'encounter' && this.activeEncounterBGM) return this.activeEncounterBGM;

        // 4. Overworld/Battle default biome resolution
        if (!gameState.player || gameState.player.col === undefined) return null;

        // Safety guard to prevent crashes if worldManager hasn't been instantiated yet
        if (!this.worldManager) return null;

        const playerCol = gameState.player.col;
        const playerRow = gameState.player.row;
        const currentHour = (gameState.world.time || 0) / 60;

        const biome = this.worldManager.getBiomeAt(playerCol, playerRow);
        if (targetScene === 'battle') return biome.getMusic(currentHour, true);
        if (targetScene === 'overworld') return biome.getMusic(currentHour, false);

        return null;
    }

    resolveTargetAmbience(targetScene) {
        // <-- ADDED 'shop' to keep whatever background ambience is currently playing
        if (['party', 'character_summary', 'level_up', 'shop'].includes(targetScene)) return null; 
        if (['battle', 'encounter', 'character-creator', 'title', 'boot'].includes(targetScene)) return 'none';
        
        if (gameState.world && gameState.world.currentWeather) {
            return gameState.world.currentWeather.audioEffect || 'none';
        }
        return 'none';
    }

    changeScene(sceneName, sceneContext = {}) {
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;

        const targetBGM = this.resolveTargetBGM(sceneName, sceneContext);
        if (targetBGM !== null) {
            if (gameState.world.currentBgm !== targetBGM) {
                gameState.world.currentBgm = targetBGM;
                events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 });
            }
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
        events.on('PLAY_MUSIC', (data) => {
            if (gameState && gameState.world) {
                gameState.world.currentBgm = data.id;
            }
        });

        events.on('CHANGE_SCENE', ({ scene, data }) => {
            this.transitionRenderer.start(() => {
                this.input.reset();

                if (this.currentScene === 'character-creator' && scene === 'overworld') {
                    console.log(`%c[SceneManager] Generating World with finalized seed: ${gameState.seed}`, 'color: #00ff00');
                    this.worldManager = new WorldManager();
                    this.overworldController = new OverworldController(this.input, this.config, this.worldManager);
                    this.encounterController = new EncounterController(this.input, this.config, this.worldManager);
                    this.battleController = new BattleController(this.input, this.config, this.worldManager);
                }

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

                if (scene === 'journal') {                                  
                    this.journalController.init();
                }

                if (scene === 'shop') {                                          // <-- NEW
                    this.shopController.init(data || {});
                }

                this.changeScene(scene);
            }, 'fade');
        });

       // <-- NEW EXPLICIT OPEN_SHOP LISTENER
events.on('OPEN_SHOP', (data) => {
    console.log("1. EVENT RECEIVED DATA:", data);
    events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.6 });
    this.transitionRenderer.start(() => {
        
        // ADD THIS LINE: Pass the data to the controller so it can build the wares!
        this.shopController.init(data || {}); 
        
        this.changeScene('shop', data);
    }, 'wipe', { speed: 3.5 });
});

        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id, data.context);
                    const customBGM = data.context?.bgm || null;
                    this.activeEncounterBGM = customBGM;
                    this.changeScene('encounter', { bgm: customBGM });
                }, 'fade');
            } else if (data.type === 'WARP') {
                events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.8 });
                this.transitionRenderer.start(() => {
                    if (data.id === 'procedural_room_trigger') {
                        gameState.world.savedOverworld = {
                            seed: gameState.seed,
                            returnCol: data.context.col,
                            returnRow: data.context.row + 1
                        };
                        
                        gameState.seed = gameState.seed + (data.context.col * 73856) + (data.context.row * 19349);
                        gameState.world.isInterior = true;
                        gameState.world.interiorType = data.roomType || 'HOUSE_INTERIOR';
                        gameState.world.interiorId = `${data.context.col}_${data.context.row}`;
                        
                        this.worldManager = new WorldManager();
                        this.overworldController.worldManager = this.worldManager;
                        
                        const interiorSpawn = this.worldManager.findSpawnPoint() || { col: 3, row: 5 };
                        this.overworldController.warpTo(interiorSpawn.col, interiorSpawn.row);
                        this.overworldController.isLocked = false;
                        
                    } else if (data.id === 'exit_interior') {
                        const saved = gameState.world.savedOverworld;
                        if (saved) {
                            gameState.seed = saved.seed;
                            gameState.world.isInterior = false;
                            gameState.world.interiorType = null;
                            gameState.world.interiorId = null;
                            
                            this.worldManager = new WorldManager();
                            this.overworldController.worldManager = this.worldManager;
                            
                            this.overworldController.warpTo(saved.returnCol, saved.returnRow);
                            this.overworldController.isLocked = false;
                        }
                    }
                    this.activeEncounterBGM = null;
                    this.changeScene('overworld');
                }, 'fade', { speed: 2.0 });
            }
        });

        events.on('START_ENCOUNTER', (data) => {
            events.emit('PLAY_SFX', { id: 'cinematicBoom', volume: 1.0 });
            this.transitionRenderer.start(() => {
                this.encounterController.start(data.encounterId, data.context || {});
                
                const customBGM = data.bgm || data.context?.bgm || null;
                this.activeEncounterBGM = customBGM;
                this.changeScene('encounter', { bgm: customBGM });
            }, 'fade');
        });

        events.on('START_BATTLE', (data) => {
            events.emit('PLAY_SFX', { id: 'battleStart', volume: 0.9 });
            
            const difficulty = gameState.difficulty || 'normal';
            const globalOffset = DIFFICULTY_MODIFIERS[difficulty]?.enemyLevelOffset || 0;
            const baseLevel = PartyManager.getHighestLevel() + globalOffset;

            const scaledEnemies = [];
            for (const enemyData of data.enemies) {
                if (enemyData.stats) {
                    scaledEnemies.push(enemyData);
                    continue;
                }

                const enemyId = typeof enemyData === 'string' ? enemyData : enemyData.id;
                
                let finalLevel = Math.max(1, baseLevel);
                let factoryOverrides = { level: finalLevel };

                if (typeof enemyData === 'object') {
                    const specificOffset = enemyData.levelOffset || 0;
                    finalLevel = Math.max(1, baseLevel + specificOffset);
                    const { id, levelOffset, ...restOfProperties } = enemyData;
                    factoryOverrides = { level: finalLevel, ...restOfProperties };
                }

                const enemyEntity = EntityFactory.create(enemyId, factoryOverrides);
                scaledEnemies.push(enemyEntity);
            }

            const isFromOverworld = this.currentScene === 'overworld';
            const transitionType = isFromOverworld ? 'blade' : 'ethereal';
            const transitionSpeed = isFromOverworld ? 1.5 : 2.5;

            this.transitionRenderer.start(() => {
                console.log("[SceneManager] Handing off scaled entities to BattleController:", scaledEnemies);
                const context = data.context || {};
                context.backgroundId = data.background;
                context.weather = data.weather;

                this.battleController.start(scaledEnemies, context);
                
                const customBGM = data.bgm || context.bgm || null;
                this.activeBattleBGM = customBGM;
                this.changeScene('battle', { bgm: customBGM });
                
            }, transitionType, { speed: transitionSpeed, color: '#0a0a12' });
        });

        events.on('BATTLE_ENDED', (data) => {
            this.activeBattleBGM = null;
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
            events.emit('PLAY_SFX', { id: 'cinematicBoom', volume: 0.7 });
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

        const activeController = this._getActiveController();
        if (activeController && activeController.handleKeyDown) {
            activeController.handleKeyDown(e.code, e);
        }
    }

    _getActiveController() {
        switch (this.currentScene) {
            case 'boot': return this.bootController; 
            case 'title': return this.titleController; 
            case 'overworld': return this.overworldController;
            case 'encounter': return this.encounterController;
            case 'battle': return this.battleController;
            case 'character-creator': return this.characterCreatorController;
            case 'party': return this.partyController;
            case 'character_summary': return this.characterSummaryController;
            case 'level_up': return this.levelUpController; 
            case 'journal': return this.journalController;
            case 'shop': return this.shopController;                         // <-- NEW
            default: return null;
        }
    }

    _getActiveRenderer() {
        switch (this.currentScene) {
            case 'boot': return this.bootRenderer;                 
            case 'title': return this.titleRenderer;               
            case 'overworld': return this.mapRenderer;
            case 'encounter': return this.encounterRenderer;
            case 'battle': return this.battleRenderer;
            case 'character-creator': return this.characterCreatorRenderer;
            case 'party': return this.partyRenderer;
            case 'character_summary': return this.characterSummaryRenderer;
            case 'level_up': return this.levelUpRenderer;
            case 'journal': return this.journalRenderer;
            case 'shop': return this.shopRenderer;                           // <-- NEW
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
            
            const uiResult = this.uiInteractionManager.update(inputProxy, activeController);
            if (uiResult) {
                if (uiResult.handledClick) click = null;
                if (uiResult.handledRightClick) rightClick = null;
            }

            if (activeController.handleMouseMove) {
                activeController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown, activeRenderer);
            }
            if (click && activeController.handleMouseDown) {
                activeController.handleMouseDown(click.x, click.y, activeRenderer);
            }
            if (rightClick && activeController.handleRightClick) {
                activeController.handleRightClick(rightClick.x, rightClick.y);
            }
            if (scroll !== 0 && activeController.handleScroll) {
                activeController.handleScroll(scroll);
            }
            if (activeController.update) {
                activeController.update(dt);
            }
        }

        this.transitionRenderer.update(dt);

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
        if (!this.loader.isDone() && this.currentScene !== 'boot') return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.currentScene) {
            case 'boot':                                                             
                const bootState = this.bootController.getState();
                this.bootRenderer.render(this.ctx, bootState);
                break;
            case 'title':                                                            
                const titleState = this.titleController.getState();
                this.titleRenderer.render(this.ctx, titleState, this.titleController);
                break;
            case 'character-creator':
                const ccState = this.characterCreatorController.getState();
                this.characterCreatorRenderer.render(this.ctx, ccState);
                break;
            case 'overworld':
                this.renderOverworld(interpolation, totalTime);
                break;
            case 'journal':
                const journalState = this.journalController.getState();
                this.journalRenderer.render(this.ctx, journalState);
                break;
            case 'shop':                                                             // <-- NEW
                const shopState = this.shopController.getState();
                this.shopRenderer.render(shopState);
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
        this.overworldUIRenderer.render(this.ctx, state);
    }

    destroy() {
        this.input.destroy();
        window.removeEventListener('keydown', this._handleGlobalKeydown);
    }
}
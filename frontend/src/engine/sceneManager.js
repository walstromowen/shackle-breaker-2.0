import { events } from '../../../shared/core/eventBus.js';
import { Input } from './input.js';
import { UIInteractionManager } from './UIInteractionManager.js';

// --- CONTROLLERS ---
import { BootController } from '../screens/boot/bootController.js';
import { TitleController } from '../screens/title/titleController.js';
import { OverworldController } from '../screens/overworld/overworldController.js';
import { EncounterController } from '../screens/encounter/encounterController.js';
import { CharacterCreatorController } from '../screens/characterCreator/characterCreatorController.js';
import { PartyController } from '../screens/party/partyController.js';
import { CharacterSummaryController } from '../screens/characterSummary/characterSummaryController.js';
import { BattleController } from '../screens/battle/battleController.js';
import { LevelUpController } from '../screens/levelUp/levelUpController.js';
import { JournalController } from '../screens/journal/journalController.js';
import { WorldMapController } from '../screens/worldMap/worldMapController.js';
import { ShopController } from '../screens/shop/shopController.js';
import { WorkshopController } from '../screens/workshop/workshopController.js'; // <-- NEW
import { SavesController } from '../screens/saves/savesController.js';
import { SettingsController } from '../screens/settings/settingsController.js';
import { MultiplayerController } from '../screens/multiplayer/multiplayerController.js';
import { TradeController } from '../screens/trade/tradeController.js';

// --- RENDERERS ---
import { BootRenderer } from '../screens/boot/bootRenderer.js';
import { TitleRenderer } from '../screens/title/titleRenderer.js';
import { MapRenderer } from '../screens/overworld/mapRenderer.js';
import { LightingRenderer } from '../screens/overworld/lightingRenderer.js';
import { WeatherRenderer } from '../screens/overworld/weatherRenderer.js';
import { OverworldUIRenderer } from '../screens/overworld/overworldUIRenderer.js';
import { EncounterRenderer } from '../screens/encounter/encounterRenderer.js';
import { TransitionRenderer } from './transitionRenderer.js';
import { CharacterCreatorRenderer } from '../screens/characterCreator/characterCreatorRenderer.js';
import { PartyRenderer } from '../screens/party/partyRenderer.js';
import { CharacterSummaryRenderer } from '../screens/characterSummary/characterSummaryRenderer.js';
import { BattleRenderer } from '../screens/battle/battleRenderer.js';
import { LevelUpRenderer } from '../screens/levelUp/levelUpRenderer.js';
import { JournalRenderer } from '../screens/journal/journalRenderer.js';
import { WorldMapRenderer } from '../screens/worldMap/worldMapRenderer.js';
import { ShopRenderer } from '../screens/shop/shopRenderer.js';
import { WorkshopRenderer } from '../screens/workshop/workshopRenderer.js'; // <-- NEW
import { SavesRenderer } from '../screens/saves/savesRenderer.js';
import { SettingsRenderer } from '../screens/settings/settingsRenderer.js';
import { MultiplayerRenderer } from '../screens/multiplayer/multiplayerRenderer.js';
import { TradeRenderer } from '../screens/trade/tradeRenderer.js';
import { CanvasUI } from '../ui/canvasUI.js';
import { UITheme } from '../ui/UITheme.js';
import { TutorialOverlay } from '../ui/tutorialOverlay.js';

// Screens that used to be left only by right-click / Esc get the standard Back button (UITheme.backButton). It is drawn and hit-tested here,
// after the screen has drawn, so every screen shows the same button; clicking it does exactly what right-click does on that screen.
// The value is where the button goes ({ x, y } in canvas pixels); null = the standard bottom-left corner.
const SHARED_BACK_BUTTON = {
    party: null,
    journal: null,
    world_map: null,
    shop: null,
    workshop: null,
    character_summary: null,
    'character-creator': null
};

import { PartyManager } from '../../../shared/characters/partyManager.js';
import { WorldManager } from '../../../shared/world/worldManager.js';
import { TimeSystem } from '../../../shared/world/timeSystem.js';
import { placeWaypoint, frontTile, getWaypoints, landingTile } from '../../../shared/world/waypoints.js';
import { ActSystem } from '../../../shared/story/actSystem.js';
import { gameState } from '../../../shared/core/gameState.js';
import { AbilitySystem } from '../../../shared/abilities/abilitySystem.js';
import { DIFFICULTY_MODIFIERS, DEV_CONSOLE } from '../../../shared/core/constants.js';
import { DevConsole } from '../ui/devConsole.js';
import { EntityFactory } from '../../../shared/characters/entityFactory.js';
import { CorruptionSystem } from '../../../shared/characters/corruptionSystem.js';
import { SaveManager, AUTOSAVE_SLOT } from './saveManager.js';
import { debugOverlay, DebugOverlayRenderer } from '../ui/debugOverlay.js';
import { multiplayerSession } from './multiplayerSession.js';
import { multiplayerSocial } from './multiplayerSocial.js';
import { PARTY_SCALING } from '../../../shared/battle/spawnTableFactory.js';
import { dropGrave } from '../../../shared/world/graves.js';
import { encounterDefinitions } from '../../../shared/story/encounterDefinitions.js';
import { audioManager } from './audioManager.js';
import { StatusTips } from '../ui/statusTooltip.js';

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
        window.SaveManager = SaveManager;   // console access: SaveManager.downloadCurrent(), SaveManager.loadFromSlot('previous')...
        // a save never holds half a village: the structure being planned ahead of the player is finished first (StructureSpawner.prepareAhead)
        SaveManager.beforeSnapshot = () => {
            if (this.worldManager && !gameState.world.isInterior && this.worldManager.finishPendingWork) this.worldManager.finishPendingWork();
        };

        // multiplayer: the shared world needs the current map, the player on it and the screen that is up (engine/multiplayerSession.js)
        multiplayerSession.attach({
            config: this.config,
            getWorldManager: () => this.worldManager,
            getLocalPlayer: () => (this.overworldController ? this.overworldController.player : null),
            getScene: () => this.currentScene,
            getOverworld: () => this.overworldController,   // (tests and the debug overlay)
            getBattle: () => this.battleController,
            getEncounter: () => this.encounterController,   // (tests and the debug overlay)
        });
        multiplayerSocial.wire();   // trading, parties and duels between players in a shared world

        // --- CONTROLLERS ---
        this.bootController = new BootController(this.input, this.loader);
        this.titleController = new TitleController(this.input);
        this.characterCreatorController = new CharacterCreatorController();
        this.partyController = new PartyController(this.input);
        this.levelUpController = new LevelUpController(this.input);
        this.journalController = new JournalController(this.input);
        this.worldMapController = new WorldMapController(this.input);
        this.shopController = new ShopController(this.input);
        this.workshopController = new WorkshopController(this.input); // <-- NEW
        this.savesController = new SavesController(this.input);
        this.settingsController = new SettingsController(this.input);
        this.multiplayerController = new MultiplayerController(this.input);
        this.tradeController = new TradeController(this.input);

        this.overworldController = null;
        this.encounterController = null;
        this.battleController = null;
        this.characterSummaryController = null;

        // --- RENDERERS ---
        this.bootRenderer = new BootRenderer(this.canvas, this.loader);
        this.titleRenderer = new TitleRenderer(this.canvas, this.config, this.loader);
        this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config);
        this.lightingRenderer = new LightingRenderer(this.config);
        this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader);
        this.overworldUIRenderer = new OverworldUIRenderer(this.config, this.loader);
        this.encounterRenderer = new EncounterRenderer(this.config, this.loader);
        this.transitionRenderer = new TransitionRenderer(this.config); this.transitionRenderer.loader = this.loader;   // the loading screen shows an item's icon
        this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader);
        this.partyRenderer = new PartyRenderer(this.ctx, this.loader);
        this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader);
        this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader);
        this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader);
        this.journalRenderer = new JournalRenderer(this.config, this.loader);
        this.worldMapRenderer = new WorldMapRenderer(this.config, this.loader);
        this.shopRenderer = new ShopRenderer(this.ctx, this.loader);
        this.workshopRenderer = new WorkshopRenderer(this.ctx, this.loader); // <-- NEW
        this.savesRenderer = new SavesRenderer(this.config, this.loader);
        this.settingsRenderer = new SettingsRenderer(this.config, this.loader);
        this.multiplayerRenderer = new MultiplayerRenderer(this.config, this.loader);
        this.tradeRenderer = new TradeRenderer(this.config, this.loader);

        // State
        this.currentScene = 'boot';

        // --- NEW: Audio Memory Cache ---
        this.activeBattleBGM = null;
        this.pendingAfterVictory = null;   // { encounterId, context } to play when the battle in progress is won, see the START_BATTLE handler
        this.activeEncounterBGM = null;

        // First-visit control tips (see ui/tutorialOverlay.js). Off until the player reaches the overworld after the prologue (or loads a save),
        // and off again on the title screen, so the prologue, the character creator and the title menus never show one.
        this.tutorial = new TutorialOverlay();
        // The debug overlay ("~" on any screen; main.js hands it the game loop for its frame timing)
        this.debugOverlayRenderer = new DebugOverlayRenderer();
        this._tipsReady = false;

        // The developer console ("/" in the overworld, see ui/devConsole.js). While it is open the game lets go of every key, so nothing walks while you type.
        this.devConsole = DEV_CONSOLE.ENABLED ? new DevConsole({
            host: {
                lockWorld: () => this.overworldController.devLockWorld(),
                battleSetup: () => this.overworldController.devBattleSetup(),
                teleport: (target) => this._devTeleport(target),
            },
            onOpen: () => this.input.reset(),
            onClose: () => this.input.reset(),
            // it is the chat in a multiplayer world (T); commands still need a game made with Cheats on
            allowCommands: () => gameState.cheats === true,
            chatActive: () => multiplayerSession.active,
            onChat: (text) => multiplayerSocial.sendChat(text),
        }) : null;
        events.on('MP_CHAT', ({ name, text }) => { if (this.devConsole) this.devConsole.showChat(name, text); });

        this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);
        this.setupInputRouting();
        this.setupEventListeners();
    }

    resolveTargetBGM(targetScene, sceneContext = {}) {
        // 1. Explicit scene context overrides
        if (sceneContext.bgm) return sceneContext.bgm;

        // 2. Main menu and Boot exceptions
        if (targetScene === 'boot') return null;
        if (targetScene === 'title' || targetScene === 'multiplayer') return 'shackle_breaker_theme_1';
        if (targetScene === 'character-creator') return null;

        // 3. Cached Battle/Encounter overrides
        if (targetScene === 'battle' && this.activeBattleBGM) return this.activeBattleBGM;
        if (targetScene === 'encounter' && this.activeEncounterBGM) return this.activeEncounterBGM;
        
        // --- FIX: Preserve active encounter BGM if battle specifies no custom BGM ---
        if (targetScene === 'battle' && this.currentScene === 'encounter' && gameState.world?.currentBgm) {
            return gameState.world.currentBgm;
        }

        // 4. Overworld/Battle default biome resolution
        if (!gameState.player || gameState.player.col === undefined) return null;
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
        // <-- ADDED 'workshop' to keep whatever background ambience is currently playing
        if (['party', 'character_summary', 'level_up', 'shop', 'workshop', 'saves', 'settings', 'trade'].includes(targetScene)) return null;

        if (['battle', 'encounter', 'character-creator', 'title', 'boot', 'multiplayer'].includes(targetScene)) return 'none';

        if (gameState.world && gameState.world.currentWeather) {
            return gameState.world.currentWeather.audioEffect || 'none';
        }

        return 'none';
    }

    changeScene(sceneName, sceneContext = {}) {
        if (this.currentScene === 'encounter' && sceneName !== 'encounter') audioManager.stopVoice();   // a voice never follows you out of an encounter
        console.log(`[SceneManager] Switching to: ${sceneName}`);
        this.currentScene = sceneName;

        // First-visit control tips: a card for this screen if it has not been seen (the scene beneath is paused until it is dismissed)
        this.tutorial.cancel();
        if (sceneName === 'title') this._tipsReady = false;
        if (sceneName === 'overworld') this._tipsReady = true;
        // (not over the party screen when it is only a pick: a swap in a fight, a switch in an encounter; its card is about managing the party)
        const isPick = sceneName === 'party' && this.partyController && this.partyController.mode !== 'DEFAULT';
        if (this._tipsReady && !isPick) this.tutorial.show(sceneName);

        // Every arrival on the overworld (a new game, after a battle, an encounter, a shop, the menus) is a safe moment to save.
        // Saves from inside a house or cave too (SaveManager keeps the way back out), so loading returns to the same room.
        if (sceneName === 'overworld') SaveManager.autosave();

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

        // A stage that calls for silence (bgm: 'none', see the prologue's broken chain) stops the music, so nothing is "current" any more: the next scene
        // (the overworld) must start its own track again even when it is the very track that was playing before the silence.
        events.on('STOP_MUSIC', () => {
            if (gameState && gameState.world) {
                gameState.world.currentBgm = null;
            }
        });

        // GAME_OVER: the whole party has fallen (a lost battle, a deadly encounter). Fade to black, then back to the title screen.
        // Anything that used to emit CHANGE_SCENE { scene: 'game_over' } ends up here too.
        events.on('GAME_OVER', () => {
            if (this.gameOverActive) return;
            this.gameOverActive = true;
            // In a multiplayer world the title screen would mean leaving it (and for the host, closing it for everyone). The party's bag and
            // coin stay behind in a grave where it fell (world/graves.js: only its owner can dig it up), and the party wakes at its last rest
            // point (a bonfire, a bedroll; the world's starting spot when it has never rested) with a quarter of its health.
            if (multiplayerSession.active) {
                this.transitionRenderer.start(() => {
                    this.input.reset();
                    this.activeBattleBGM = null;
                    this.activeEncounterBGM = null;
                    const p = gameState.player;
                    const me = multiplayerSocial.me;
                    const grave = this.worldManager ? dropGrave(this.worldManager, p.col, p.row, me, multiplayerSocial.nameOf(me)) : null;
                    for (const m of gameState.party.members || []) {
                        if (!m) continue;
                        if (m.clearAllStatusEffects) m.clearAllStatusEffects();
                        m.hp = Math.max(1, Math.ceil((m.maxHp || 1) / 4));
                    }
                    if (gameState.world.isInterior) this._leaveInterior();
                    const spot = p.respawn || this.worldManager.findSpawnPoint();
                    this.overworldController.warpTo(spot.col, spot.row);
                    this.overworldController.isLocked = false;
                    this._prebuildWorld(spot.col, spot.row);
                    multiplayerSession._say(grave
                        ? `Your party was beaten. Your bag${grave.currency ? ` and ${grave.currency} coin` : ''} lie in a grave where you fell.`
                        : 'Your party was beaten, but woke where it last rested.');
                    this.changeScene('overworld');
                    this.gameOverActive = false;
                }, 'fade', { speed: 0.5, color: '#000000' });
                return;
            }
            events.emit('STOP_AMBIENCE', { fadeTime: 1.5 });
            this.transitionRenderer.start(() => {
                this.input.reset();
                this.activeBattleBGM = null;
                this.activeEncounterBGM = null;
                this.titleController.refreshSaveState();   // "Load Game" picks up the last autosave
                this.changeScene('title');
                this.gameOverActive = false;
            }, 'fade', { speed: 0.5, color: '#000000' });   // about two seconds to black, two seconds back up on the title
        });

        events.on('CHANGE_SCENE', ({ scene, data }) => {
            if (scene === 'game_over') { events.emit('GAME_OVER'); return; }
            this.transitionRenderer.start(() => {
                this.input.reset();

                // Back on the overworld (after a battle, an encounter, a menu): a fallen member must never be left in the first slot
                if (scene === 'overworld') PartyManager.ensureLivingLeader();

                // A New Game replaces the autosave: keep the old one as 'previous'
                const mpJoin = !!(data && data.mpJoin);   // a multiplayer guest stepping into the host's world: not a new game of their own
                if (this.currentScene === 'character-creator' && scene === 'overworld' && !mpJoin) {
                    SaveManager.backupAutosave();
                    gameState.world.discoveredChunks = [];   // a new world has been seen by no one
                    gameState.world.waypoints = [];          // ... and holds no banners
                    this.tutorial.store.reset();   // every new game shows each screen's control card again (Settings > Replay Tips does the same by hand)
                }

                // A new game (coming from the character creator) or a loaded one (LOAD_GAME passes buildWorld) builds the world from gameState.seed
                if ((this.currentScene === 'character-creator' || (data && data.buildWorld)) && scene === 'overworld') {
                    console.log(`%c[SceneManager] Generating World with finalized seed: ${gameState.seed}`, 'color: #00ff00');
                    if (this.worldManager && this.worldManager.dropPendingWork) this.worldManager.dropPendingWork();   // the old world is gone: never finish its plans in the new one
                    this.worldManager = new WorldManager();
                    this.overworldController = new OverworldController(this.input, this.config, this.worldManager);
                    this.encounterController = new EncounterController(this.input, this.config, this.worldManager);
                    this.battleController = new BattleController(this.input, this.config, this.worldManager);
                    this._prebuildWorld(gameState.player.col, gameState.player.row);
                }

                // A NEW game opens with the prologue, an encounter that plays on the fresh world and ends on the overworld (the encounter
                // is started here, not by an object on the map, so it has no col / row to clear afterwards).
                if (scene === 'overworld' && this.currentScene === 'character-creator' && !mpJoin) {
                    this.overworldController.isLocked = true;
                    this.activeEncounterBGM = null;
                    this.encounterController.start('prologue', {});
                    this.changeScene('encounter');
                    return;
                }

                if (scene === 'overworld') {
                    this.overworldController.isLocked = false;

                    // Fast travel from the world map (WorldMapController.fastTravel): the party has paid; put it down beside the banner and move the clock by the tiles it crossed
                    if (data && data.fastTravel) {
                        const wp = getWaypoints().find((w) => w.id === data.fastTravel.id);
                        if (wp && this.worldManager) {
                            const at = landingTile(this.worldManager, wp);
                            this.overworldController.warpTo(at.col, at.row);
                            TimeSystem.advance(data.fastTravel.minutes || 0);
                            events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.6 });
                        }
                    }
                    
                    // --- FIX: Check for the map object destruction payload ---
                    if (data && data.col !== undefined && data.row !== undefined) {
                        console.log(`[SceneManager] Removing object at ${data.col}, ${data.row} after encounter.`);
                        this.worldManager.modifyWorld(data.col, data.row, null);
                    }
                }

                if (scene === 'character_summary') {
                    this.characterSummaryController = new CharacterSummaryController(this.input, data);
                }
                if (scene === 'level_up') {
                    this.levelUpController.init(data);
                }
                if (scene === 'party') {
                    this.partyController.init(data || {});
                }
                if (scene === 'title') {
                    this.titleController.refreshSaveState();   // "Load Game" is greyed out until a save exists
                }
                if (scene === 'journal') {
                    this.journalController.init();
                }
                if (scene === 'world_map') {
                    this.worldMapController.init({ ...(data || {}), worldManager: this.worldManager });
                }
                if (scene === 'shop') {
                    this.shopController.init(data || {});
                }
                if (scene === 'workshop') {                 // <-- NEW
                    this.workshopController.init(data || {});
                }
                if (scene === 'saves') {
                    this.savesController.init(data || {});   // { mode: 'game' | 'title' }
                }
                if (scene === 'settings') {
                    this.settingsController.init(data || {});   // { from: 'game' | 'title' }
                }
                if (scene === 'multiplayer') {
                    this.multiplayerController.init(data || {});
                }
                if (scene === 'trade') {
                    this.tradeController.init(data || {});
                }

                this.changeScene(scene);
            }, 'fade');
        });

        // EXPLICT OPEN_SHOP LISTENER
        events.on('OPEN_SHOP', (data) => {
            console.log("1. EVENT RECEIVED DATA:", data);
            events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.6 });
            this.transitionRenderer.start(() => {
                this.shopController.init(data || {});
                this.changeScene('shop', data);
            }, 'wipe', { speed: 3.5 });
        });

        // EXPLICT OPEN_WORKSHOP LISTENER <-- NEW
        events.on('OPEN_WORKSHOP', (data) => {
            events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.6 });
            this.transitionRenderer.start(() => {
                this.workshopController.init(data || {});
                this.changeScene('workshop', data);
            }, 'wipe', { speed: 3.5 });
        });

        // Overworld abilities that need the live scene hand it over here (AbilitySystem.worldActionHandler). An Escape Rope is the same as walking out of the interior:
        // lock the player, then run the normal exit-door warp (sound, fade, restore the saved overworld and the spot just outside the entrance).
        // The Waypoint item plants its banner on the tile in front of the player (not indoors, not where something stands); nothing is spent when it cannot
        AbilitySystem.waypointPlacer = () => {
            if (!this.worldManager || gameState.world.isInterior) return { success: false, message: 'A banner needs open ground: not in here.' };
            const p = gameState.player;
            const at = frontTile(p.col, p.row, p.direction);
            const r = placeWaypoint(this.worldManager, at.col, at.row, this.worldManager.getElevation(p.col, p.row));
            if (r.success) events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.5 });
            return r;
        };
        AbilitySystem.worldActionHandler = (action) => {
            if (action.type === 'exit_interior' && gameState.world.isInterior && gameState.world.savedOverworld) {
                this.overworldController.isLocked = true;
                events.emit('INTERACT', { type: 'WARP', id: 'exit_interior', context: { toWorld: true } });   // all the way out, from however deep
            } else if (action.type === 'start_encounter' && action.encounterId) {
                // A bedroll (or any item that opens an encounter): lock the player and open it like an object's encounter. Ending it returns to the overworld, which unlocks.
                this.overworldController.isLocked = true;
                events.emit('INTERACT', { type: 'ENCOUNTER', id: action.encounterId, context: action.context || {} });
            } else if (action.type === 'advance_time') {
                // a rest out in the open is where a beaten party wakes in a multiplayer world (GAME_OVER)
                if (!gameState.world.isInterior) gameState.player.respawn = { col: gameState.player.col, row: gameState.player.row };
                // A bedroll: fade to black, move the clock while the screen is dark (the light, the music and the buffs follow it), fade back in. The player stays
                // locked until the picture is back. Used from a menu, the fade covers the menu and the player is left as they were.
                const onOverworld = this.currentScene === 'overworld';
                if (onOverworld) this.overworldController.isLocked = true;
                events.emit('PLAY_SFX', { id: 'restSfx', volume: 0.7 });
                this.transitionRenderer.start(() => {
                    TimeSystem.advance(action.minutes);
                }, 'fade', {
                    speed: 0.9,
                    hold: 0.8,
                    onDone: () => { if (onOverworld) this.overworldController.isLocked = false; }
                });
            } else {
                console.warn('[SceneManager] Unhandled world action:', action);
            }
        };

        events.on('INTERACT', (data) => {
            if (data.type === 'ENCOUNTER') {
                // a chest, a gravestone, a stranger, a line of sight... In a party of players, the ones near me are pulled in and vote; I lead it
                // (the same shared encounter as a random one, START_ENCOUNTER below)
                // an encounter marked `personal` (the quest giver: it is about this player's own quests) is never shared
                const personal = !!(encounterDefinitions[data.id] && encounterDefinitions[data.id].personal);
                const mp = multiplayerSocial.sharesFights && !personal
                    ? multiplayerSocial.startPartyEncounter({ encounterId: data.id, context: data.context || {}, bgm: data.context?.bgm || null, quiet: true })
                    : null;
                this.transitionRenderer.start(() => {
                    this.encounterController.start(data.id, data.context, mp);
                    const customBGM = data.context?.bgm || null;
                    this.activeEncounterBGM = customBGM;
                    this.changeScene('encounter', { bgm: customBGM });
                }, 'fade');
            } else if (data.type === 'WARP') {
                events.emit('PLAY_SFX', { id: 'doorOpen', volume: 0.8 });
                this.transitionRenderer.start(() => {
                    if (data.id === 'procedural_room_trigger') {
                        // a village being planned ahead is finished now, while the overworld is still the world (inside, cells are keyed to the room)
                        if (this.worldManager && this.worldManager.finishPendingWork) this.worldManager.finishPendingWork();
                        const w = gameState.world;
                        if (w.isInterior && w.savedOverworld) {
                            // A way further down from inside an interior (the hidden staircase in a cave, down into the catacombs): the interior we are in
                            // goes on a stack, with the spot at the foot of the stairs, so climbing back up returns to it (the overworld stays saved below it).
                            // The deeper interior's id is the outer one's plus the stair's cell, so its changes are its own and it is the same on every visit.
                            if (!Array.isArray(w.interiorStack)) w.interiorStack = [];
                            w.interiorStack.push({ type: w.interiorType, id: w.interiorId, seed: gameState.seed, returnCol: gameState.player.col, returnRow: gameState.player.row + 1 });
                            gameState.seed = gameState.seed + (data.context.col * 73856) + (data.context.row * 19349) + 104729;
                            w.interiorId = `${w.interiorId}_${data.context.col}_${data.context.row}`;
                        } else {
                            // Save Overworld state
                            w.savedOverworld = {
                                seed: gameState.seed,
                                returnCol: data.context.col,
                                returnRow: data.context.row + 1
                            };
                            w.interiorStack = [];
                            // Shift into interior state
                            gameState.seed = gameState.seed + (data.context.col * 73856) + (data.context.row * 19349);
                            w.interiorId = `${data.context.col}_${data.context.row}`;
                        }
                        w.isInterior = true;
                        w.interiorType = data.roomType || 'HOUSE_INTERIOR';
                        w.interiorMapId = null;   // a map read in an earlier visit is spent

                        // Generate the interior map
                        this.worldManager = new WorldManager();

                        // --- FIX: Give the interior map to ALL controllers! ---
                        this.overworldController.worldManager = this.worldManager;
                        this.encounterController.worldManager = this.worldManager;
                        this.battleController.worldManager = this.worldManager;

                        const interiorSpawn = this.worldManager.findSpawnPoint() || { col: 3, row: 5 };
                        this.overworldController.warpTo(interiorSpawn.col, interiorSpawn.row);
                        this.overworldController.isLocked = false;
                    } else if (data.id === 'exit_interior' && !(data.context && data.context.toWorld) && (gameState.world.interiorStack || []).length) {
                        // up the stairs out of a deeper interior (the catacombs): back into the one above it, at the foot of the stairs
                        const back = this._leaveToOuterInterior();
                        this.overworldController.warpTo(back.returnCol, back.returnRow);
                        this.overworldController.isLocked = false;
                    } else if (data.id === 'exit_interior') {
                        const saved = this._leaveInterior();
                        if (saved) {
                            this.overworldController.warpTo(saved.returnCol, saved.returnRow);
                            this.overworldController.isLocked = false;
                            this._prebuildWorld(saved.returnCol, saved.returnRow);
                        }
                    }

                    this.activeEncounterBGM = null;
                    this.changeScene('overworld');
                }, 'fade', { speed: 2.0 });
            }
        });

        events.on('START_ENCOUNTER', (data) => {
            if (!data.quiet) events.emit('PLAY_SFX', { id: 'cinematicBoom', volume: 1.0 });   // quiet: an encounter the party walked up to (a chest...)
            // a party of players: an encounter I start pulls in the party near me (I lead it, everyone votes: engine/multiplayerSocial.js, EncounterController)
            const mp = data.mp || (multiplayerSocial.sharesFights ? multiplayerSocial.startPartyEncounter(data) : null);
            if (this.overworldController) this.overworldController.isLocked = true;
            this.transitionRenderer.start(() => {
                this.encounterController.start(data.encounterId, data.context || {}, mp);
                const customBGM = data.bgm || data.context?.bgm || null;
                this.activeEncounterBGM = customBGM;
                this.changeScene('encounter', { bgm: customBGM });
            }, 'fade');
        });

        events.on('START_BATTLE', (data) => {
            events.emit('PLAY_SFX', { id: 'battleStart', volume: 0.9 });
            const difficulty = gameState.difficulty || 'normal';
            const globalOffset = DIFFICULTY_MODIFIERS[difficulty]?.enemyLevelOffset || 0;
            // The act (story/actDefinitions.js) makes every enemy a little stronger: more levels, and a few extra abilities and traits for each kind
            // A party of several players meets stronger enemies (PARTY_SCALING.LEVELS_PER_PLAYER for every player beyond the first)
            const playerLevels = (multiplayerSocial.playerCount() - 1) * PARTY_SCALING.LEVELS_PER_PLAYER;
            const baseLevel = PartyManager.getHighestLevel() + globalOffset + ActSystem.getEnemyLevelOffset() + playerLevels;

            // `afterVictory: { encounterId }`: an encounter that plays when this fight is won, in place of going straight back to the overworld
            this.pendingAfterVictory = data.afterVictory && data.afterVictory.encounterId
                ? { encounterId: data.afterVictory.encounterId, context: { ...(data.context || {}) } }
                : null;

            const scaledEnemies = [];
            
            for (const enemyData of data.enemies) {
                if (enemyData.stats || enemyData.state) {   // already a built entity (a shackled companion who turned on the party)
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

                const upgrade = ActSystem.getEnemyUpgrade(enemyId);
                if (upgrade) {
                    factoryOverrides = {
                        ...factoryOverrides,
                        abilities: [...(factoryOverrides.abilities || []), ...upgrade.abilities],
                        traits: [...(factoryOverrides.traits || []), ...upgrade.traits]
                    };
                }

                const enemyEntity = EntityFactory.create(enemyId, factoryOverrides);
                scaledEnemies.push(enemyEntity);
            }
            
            // a party of players: a fight I start pulls in the party near me (a fight out of a shared encounter: that encounter's players), played on
            // every one of their screens (engine/multiplayerSocial.js)
            const encMp = this.currentScene === 'encounter' && this.encounterController && this.encounterController.mp;
            const fromEncounter = encMp && encMp.players && encMp.players.length > 1 ? encMp.players : null;
            if (fromEncounter || multiplayerSocial.sharesFights) {
                multiplayerSocial.startPartyBattle(scaledEnemies, { background: data.background, bgm: data.bgm || (data.context && data.context.bgm) || null, noEscape: !!data.noEscape, betrayal: data.betrayal || null, players: fromEncounter });
                return;
            }

            const isFromOverworld = this.currentScene === 'overworld';
            const transitionType = isFromOverworld ? 'blade' : 'ethereal';
            const transitionSpeed = isFromOverworld ? 1.5 : 2.5;

            this.transitionRenderer.start(() => {
                console.log("[SceneManager] Handing off scaled entities to BattleController:", scaledEnemies);
                const context = data.context || {};
                context.backgroundId = data.background;
                context.weather = data.weather;
                if (data.noEscape) context.noEscape = true;   // a betrayal (or a story fight that says so): no Retreat
                this.battleController.start(scaledEnemies, context);
                
                // --- FIX: Fallback to currently playing encounter music if no explicit BGM was passed ---
                const currentBGM = gameState.world?.currentBgm || null;
                const customBGM = data.bgm || context.bgm || (this.currentScene === 'encounter' ? currentBGM : null);
                this.activeBattleBGM = customBGM;

                this.changeScene('battle', { bgm: customBGM });
            }, transitionType, { speed: transitionSpeed, color: '#0a0a12' });
        });

        // LOAD_GAME { slot? }: restores a save into gameState, then enters the overworld with a freshly built world.
        events.on('LOAD_GAME', async ({ slot, fromGame } = {}) => {
            // Loading from inside a running game: first keep the current position in the autosave, so nothing played since the last
            // autosave is lost (SaveManager.loadFromSlot then copies that autosave into the 'previous' slot).
            if (fromGame && slot && slot !== AUTOSAVE_SLOT && SaveManager.canSaveNow()) await SaveManager.autosave();
            SaveManager.loadFromSlot(slot).then(result => {
                if (!result.ok) {
                    events.emit('LOAD_FAILED', { error: result.error });
                    return;
                }
                events.emit('CHANGE_SCENE', { scene: 'overworld', data: { buildWorld: true } });
            });
        });

        // Closing the tab or switching away still saves the current position (localStorage writes are synchronous, so this is in time).
        const saveOnLeave = () => {
            if (this.currentScene === 'overworld' && this.overworldController && !this.overworldController.isLocked) SaveManager.autosave(5000);
        };
        window.addEventListener('pagehide', saveOnLeave);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveOnLeave(); });

        // a shared multiplayer fight (a duel, or a party's fight) starts on this player's screen (engine/multiplayerSocial.js)
        events.on('MP_START_BATTLE', ({ enemies, context, bgm }) => {
            events.emit('PLAY_SFX', { id: 'battleStart', volume: 0.9 });
            // a shared encounter that turned into this fight is over: its players, dice and vote must not outlive it (or every later fight and
            // encounter would pull in only the players of this one: multiplayerSocial.nearbyParty)
            if (this.encounterController && this.encounterController.mp) this.encounterController._leaveShared();
            if (this.overworldController) this.overworldController.isLocked = true;
            const fromOverworld = this.currentScene === 'overworld';
            this.transitionRenderer.start(() => {
                this.battleController.start(enemies, context);
                this.activeBattleBGM = bgm || null;
                this.changeScene('battle', { bgm: bgm || null });
            }, fromOverworld ? 'blade' : 'ethereal', { speed: fromOverworld ? 1.5 : 2.5, color: '#0a0a12' });
        });

        events.on('BATTLE_ENDED', (data) => {
            this.activeBattleBGM = null;
            // a duel is for nothing: both parties are put back as they were, win or lose, and nobody falls for good
            if (data.mp && multiplayerSocial.battleEnded(data.mp)) {
                this.pendingAfterVictory = null;
                events.emit('CHANGE_SCENE', { scene: 'overworld' });
                return;
            }
            const after = this.pendingAfterVictory;
            this.pendingAfterVictory = null;
            if (data.victory && !data.fled && after) {
                // e.g. the end of Darius the Groveler: the act changes in an encounter of its own
                events.emit('START_ENCOUNTER', { encounterId: after.encounterId, context: after.context });
            } else if (data.victory) {
                events.emit('CHANGE_SCENE', { scene: 'overworld' });
            } else {
                console.log("[SceneManager] Game Over...");
                events.emit('GAME_OVER');
            }
        });

        events.on('REQUEST_PARTY_SWAP', (data) => {
            this.transitionRenderer.start(() => {
                this.partyController.init({
                    mode: data.mode || 'BATTLE_SELECT',
                    activeIndices: data.activeIndices,
                    callback: data.callback,
                    members: data.members, owners: data.owners, title: data.title
                });
                this.changeScene('party');
            }, 'wipe', { speed: 3.0 });
        });

        events.on('CHARACTER_RECRUITED', (data) => {
            // An enemy that joins the party loses the enemy-only level HP bonus, so an ally is exactly as tough as a player-built character of the same level.
            EntityFactory.removeLevelEdge(data.character);
            CorruptionSystem.cleanseNatural(data.character);   // one of the shackled who joins is no longer born cursed

            this.transitionRenderer.start(() => {
                this.characterSummaryController = new CharacterSummaryController(this.input, {
                    character: data.character
                });
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
        // "~" (Backquote) shows / hides the debug overlay on any screen, even under a tip card or a fade. Not while the developer console is being typed in.
        if (e.code === 'Backquote' && !e.repeat && !(this.devConsole && this.devConsole.isOpen)) {
            if (e.preventDefault) e.preventDefault();
            debugOverlay.toggle();
            return;
        }
        if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return;

        // A tip card is up: it takes every key. Any key but a bare modifier (or a held key repeating) eases it out once it has been up a moment.
        if (this.tutorial.blocking) {
            const modifier = /^(Shift|Control|Alt|Meta|CapsLock)/.test(e.code);
            if (e.code !== 'Backquote' && !modifier && !e.repeat && this.tutorial.canDismiss) {
                if (e.preventDefault) e.preventDefault();
                this._dismissTutorial();
            }
            return;
        }

        // "/" opens the developer console (in a game with cheats on, or as the chat in a multiplayer world) and T opens the chat, in the overworld when
        // nothing else has the screen (a scene is not loading, no menu is up)
        const consoleFree = this.devConsole && !this.devConsole.isOpen && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
            && this.currentScene === 'overworld' && !this.overworldController.isLocked && !this.transitionRenderer.isActive && !multiplayerSocial.prompt;
        if (consoleFree && (gameState.cheats === true || multiplayerSession.active) && e.code === 'Slash' && this.devConsole) {
            e.preventDefault();
            this.devConsole.open('/');
            return;
        }
        if (consoleFree && multiplayerSession.active && e.code === 'KeyT') {
            e.preventDefault();
            this.devConsole.open('');
            return;
        }

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
            case 'world_map': return this.worldMapController;
            case 'shop': return this.shopController;
            case 'workshop': return this.workshopController; // <-- NEW
            case 'saves': return this.savesController;
            case 'settings': return this.settingsController;
            case 'multiplayer': return this.multiplayerController;
            case 'trade': return this.tradeController;
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
            case 'world_map': return this.worldMapRenderer;
            case 'shop': return this.shopRenderer;
            case 'workshop': return this.workshopRenderer; // <-- NEW
            case 'saves': return this.savesRenderer;
            case 'settings': return this.settingsRenderer;
            case 'multiplayer': return this.multiplayerRenderer;
            case 'trade': return this.tradeRenderer;
            default: return null;
        }
    }

    /** Starts easing the tip card out; the clicks / keys that were held for the screen underneath are dropped so none of them acts on it. */
    _dismissTutorial() {
        this.tutorial.dismiss();
        this.input.reset();
    }

    update(dt) {
        multiplayerSession.update(dt);   // positions, the clock and saves go on under menus and tip cards too
        if (multiplayerSession.active) multiplayerSocial.update(dt);
        let click = this.input.getAndResetClick();
        let rightClick = this.input.getAndResetRightClick();
        let scroll = this.input.getAndResetScroll();

        // A tip card waits for the screen to be fully visible, then eases in. While it is up the screen underneath waits (no controller
        // update, no clock, no weather): only the fade and the card move on. When it has finished easing out, the screen takes over again.
        const cardWasUp = this.tutorial.blocking;
        this.tutorial.update(dt, { sceneBusy: this.transitionRenderer.isActive });
        if (this.tutorial.blocking) {
            if ((click || rightClick) && this.tutorial.canDismiss) this._dismissTutorial();
            this.transitionRenderer.update(dt);
            return;
        }
        if (cardWasUp) { // the card just finished leaving: nothing pressed meanwhile may act on the screen
            this.input.reset();
            click = null; rightClick = null; scroll = 0;
        }

        // While a transition is fading the old screen out, keys are ignored (see _handleGlobalKeydown); the mouse is ignored too,
        // so a double click can not fire on a screen that is already leaving.
        const inputLocked = this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT';
        if (inputLocked) {
            click = null;
            rightClick = null;
            scroll = 0;
        }
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

            // The wheel is mouse input: the mouse takes control back from the keyboard cursor.
            if (scroll !== 0 && activeController.notePointerInput) activeController.notePointerInput();

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

        // Autosave about once a minute of walking around, so a closed tab or crash never costs more than that.
        this._autosaveTimer = (this._autosaveTimer || 0) + dt;
        if (this._autosaveTimer >= 60) {
            this._autosaveTimer = 0;
            if (this.currentScene === 'overworld' && this.overworldController && !this.overworldController.isLocked) SaveManager.autosave();
        }

        if (['overworld', 'encounter', 'battle'].includes(this.currentScene)) {
            if (this.currentScene === 'overworld') {
                this.timeSystem.update(dt);
            }
            const camera = this.overworldController.getState().camera;
            if (this.weatherRenderer.update && camera) {
                this.weatherRenderer.update(dt, camera);
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
            case 'world_map':
                this.worldMapRenderer.render(this.ctx, this.worldMapController.getState());
                break;
            case 'shop':
                const shopState = this.shopController.getState();
                this.shopRenderer.render(shopState);
                break;
            case 'workshop':                                         // <-- NEW
                if (this.workshopController) {
                    const workshopState = this.workshopController.getState();
                    const hitboxes = this.workshopRenderer.render(workshopState);
                    this.workshopController.updateHitboxes(hitboxes);
                }
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
            case 'saves':
                this.savesRenderer.render(this.ctx, this.savesController.getState());
                break;
            case 'settings':
                this.settingsRenderer.render(this.ctx, this.settingsController.getState());
                break;
            case 'multiplayer':
                this.multiplayerRenderer.render(this.ctx, this.multiplayerController.getState());
                break;
            case 'trade':
                this.tradeRenderer.render(this.ctx, this.tradeController.getState());
                break;
            case 'level_up':
                const luState = this.levelUpController.getState();
                this.levelUpRenderer.render(luState);
                break;
        }

        this._drawSharedBackButton();

        this.tutorial.render(this.ctx);

        // the status effect icon under the mouse, on whatever screen drew it this frame: what it does (ui/statusTooltip.js)
        if (this.tutorial.active || this.transitionRenderer.isActive) StatusTips.clear();   // not over a tips card or a scene change
        else StatusTips.drawHovered(this.ctx, this.input.getMousePosition());

        this.transitionRenderer.render(this.ctx);

        if (debugOverlay.visible) {
            this.debugOverlayRenderer.render(this.ctx, { scene: this.currentScene, canvas: this.canvas, worldManager: this.worldManager, player: gameState.player });
        }
    }

    /** Builds the world around (col, row) while the screen is covered: a loading screen at the midpoint of the current transition (see
        WorldManager.prebuildSteps), so the first steps on a new, loaded or re-entered overworld do not stall on generating it. */

    /** Out of the house or cave the party is in, onto the overworld it came from (the door or Escape Rope, and a defeat inside in a multiplayer
     *  world): the world state and the map are put back. Returns the saved overworld ({ returnCol, returnRow }), or null when there is none. */
    /** The dev console's /tp: { col, row, world } (world: out of the interior to that spot on the overworld) or { player: name }. Lands on the
     *  nearest free tile to the one asked for. Returns { ok, message }. */
    _devTeleport(target = {}) {
        let col = target.col, row = target.row, outside = !!target.world;
        if (target.player) {
            const key = String(target.player).toLowerCase();
            const r = [...multiplayerSession.remotes.values()].find(x => x && x.placed && String(x.username || '').toLowerCase().startsWith(key));
            if (!r) return { ok: false, message: `No player "${target.player}" in this world.` };
            const here = gameState.world.isInterior ? `INT_${gameState.world.interiorId}` : 'world';
            if (r.map !== here && r.map !== 'world') return { ok: false, message: `${r.username} is inside somewhere else: go through the same door.` };
            col = r.col; row = r.row; outside = r.map === 'world';
        }
        if (!Number.isFinite(col) || !Number.isFinite(row)) return { ok: false, message: 'Usage: /tp <col> <row>  |  /tp world <col> <row>  |  /tp <player>' };
        if (outside && gameState.world.isInterior && !this._leaveInterior()) return { ok: false, message: 'There is no way back out from here.' };
        const wm = this.worldManager;
        // the land there has to be built before it can be stood on (a far tile, or the overworld just after leaving an interior)
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (wm.ensureChunkLoaded) wm.ensureChunkLoaded(col + dc * 16, row + dr * 16);
        let spot = null;
        for (let r = 0; r <= 8 && !spot; r++) {
            for (let dr = -r; dr <= r && !spot; dr++) for (let dc = -r; dc <= r && !spot; dc++) {
                if (Math.max(Math.abs(dr), Math.abs(dc)) !== r) continue;
                if (wm.isTileFree(col + dc, row + dr)) spot = { col: col + dc, row: row + dr };
            }
        }
        if (!spot) spot = { col, row };   // nothing free nearby (deep water, the void of an interior): the tile asked for, as asked
        this.overworldController.warpTo(spot.col, spot.row);
        this.overworldController.isLocked = false;
        if (!gameState.world.isInterior) this._prebuildWorld(spot.col, spot.row);
        const where = gameState.world.isInterior ? 'in this interior' : 'on the overworld';
        return { ok: true, message: `Teleported to ${spot.col}, ${spot.row} ${where}${spot.col !== col || spot.row !== row ? ` (the nearest free tile to ${col}, ${row})` : ''}.` };
    }

    /* Out of a deeper interior (the catacombs) into the one it was entered from (the cave): its seed, type and id come off the stack. Returns the stack entry. */
    _leaveToOuterInterior() {
        const back = gameState.world.interiorStack.pop();
        gameState.seed = back.seed;
        gameState.world.interiorType = back.type;
        gameState.world.interiorId = back.id;
        gameState.world.interiorMapId = null;
        this.worldManager = new WorldManager();
        this.overworldController.worldManager = this.worldManager;
        this.encounterController.worldManager = this.worldManager;
        this.battleController.worldManager = this.worldManager;
        return back;
    }

    _leaveInterior() {
        const saved = gameState.world.savedOverworld;
        if (!saved) return null;
        gameState.seed = saved.seed;
        gameState.world.interiorStack = [];   // out of every interior at once (an Escape Rope from the catacombs, a teleport)
        gameState.world.isInterior = false;
        gameState.world.interiorType = null;
        gameState.world.interiorId = null;
        gameState.world.interiorMapId = null;   // the interior map ends when you leave
        this.worldManager = new WorldManager();
        // every controller gets the overworld map back
        this.overworldController.worldManager = this.worldManager;
        this.encounterController.worldManager = this.worldManager;
        this.battleController.worldManager = this.worldManager;
        return saved;
    }

    _prebuildWorld(col, row) {
        const wm = this.worldManager;
        if (!wm || !wm.prebuildSteps || gameState.world.isInterior) return;
        this.transitionRenderer.setWork(wm.prebuildSteps(col, row), 'Building the world');
    }

    /** The Back button of the screens in SHARED_BACK_BUTTON: draws it and adds its hitbox to the screen's (see UIInteractionManager for the click). */
    _drawSharedBackButton() {
        const spot = SHARED_BACK_BUTTON[this.currentScene];
        if (spot === undefined) return;
        const controller = this._getActiveController();
        if (!controller) return;

        const box = spot ? UITheme.backButtonBox(spot.x, spot.y) : UITheme.backButtonBox();
        const list = controller.getHitboxes ? controller.getHitboxes() : null;
        if (Array.isArray(list)) {
            for (let i = list.length - 1; i >= 0; i--) if (list[i].id === 'btn_back') list.splice(i, 1);
            list.push({ id: 'btn_back', ...box, zIndex: 1000, sharedBack: true });
        }
        new CanvasUI(this.ctx).drawBackButton(controller.getFocusId ? controller.getFocusId() : null, box);
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

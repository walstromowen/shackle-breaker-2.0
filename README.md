# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

enhance battle animations / polish
particleRenderer (global)
crafting system.
Difficulty
Starting seed
procedural dungeons and hand crafted areas
structures: 
Biome dependent generation
Biome / time dependent music
mouse navigation buttons for switching party members or viewing the inventory

Bugs
Rain flash
can't use items
exile option toggling for last character


Root
├── backend/
├── frontend/                  
│   ├── src/
│   │   ├── assets/
│   │   │   ├── sprites/
│   │   │   └── tilesets/
│   │   ├── controllers/       
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryController.js 
│   │   │   │   └── characterSummaryLogic.js    
│   │   │   ├── encounter/
│   │   │   ├── core/
│   │   │   │   └── baseController.js  
│   │   │   ├── encounter/
│   │   │   │   ├── encounterController.js
│   │   │   │   └── encounterLogic.js
│   │   │   ├── battle/
│   │   │   │   ├── battleController.js
│   │   │   │   └── battleLogic.js
│   │   │   ├── characterCreator/
│   │   │   │   ├── characterCreatorController.js
│   │   │   │   └── characterCreatorLogic.js
│   │   │   ├── party/
│   │   │   │   ├── partyController.js
│   │   │   │   └── partyLogic.js
│   │   │   ├── levelUp/
│   │   │   │   ├── levelUpController.js
│   │   │   │   └── levelUpLogic.js
│   │   │   └── overworld/
│   │   │       ├── overworldController.js
│   │   │       └── overworldLogic.js
│   │   ├── core/
│   │   │   ├── assetLoader.js
│   │   │   ├── audioManager.js
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   ├── sceneManager.js
│   │   │   └── UIInteractionManager.js
│   │   ├── renderers/
│   │   │   ├── battle/
│   │   │   │   ├── battleRenderer.js
│   │   │   │   ├── battleCombatantRenderer.js
│   │   │   │   ├── battleHUDRenderer.js
│   │   │   │   └── battleVFXRenderer.js
│   │   │   ├── encounter/
│   │   │   │   └── encounterRenderer.js
│   │   │   ├── transitions/
│   │   │   │   └── transitionRenderer.js
│   │   │   ├── overworld/
│   │   │   │   ├── lightningRenderer.js
│   │   │   │   ├── mapRenderer.js
│   │   │   │   └── weatherRenderer.js
│   │   │   ├── characterCreator/        
│   │   │   │   └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryRenderer.js
│   │   │   │   └── components/
│   │   │   │       ├── abilitiesPanel.js   
│   │   │   │       ├── statsPanel.js                
│   │   │   │       ├── itemDetailPanel.js          
│   │   │   │       ├── equipmentPanel.js            
│   │   │   │       ├── inventoryPanel.js            
│   │   │   │       └── tooltipSystem.js 
│   │   │   ├── levelUp/  
│   │   │   │   └── levelUpRenderer.js   
│   │   │   └── ui/ 
│   │   │       ├── contextMenuManager.js
│   │   │       ├── dragAndDropManager.js
│   │   │       ├── scrollManager.js
│   │   │       ├── UITheme.js
│   │   │       └── canvasUI.js      
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json      
├── shared/ 
│   ├── data/  
│   │   ├── battleAnimationDefinitions.js                     
│   │   ├── traitDefinitions.js 
│   │   ├── abilityDefinitions.js   
│   │   ├── statusEffectDefinitions.js 
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjectDefinitions.js
│   │   └── weatherDefinitions.js
│   ├── models/ 
│   │   ├── abilityModel.js   
│   │   ├── combatantModel.js   
│   │   ├── battleAnimationModel.js                  
│   │   ├── entityModel.js 
│   │   ├── statusEffectModel.js 
│   │   ├── mapObjectModel.js    
│   │   ├── weatherModel.js             
│   │   └── itemModel.js                 
│   ├── state/
│   │   └── gameState.js            
│   ├── systems/
│   │   ├── factories/  
│   │   │   ├── abilityFactory.js   
│   │   │   ├── battleAnimationFactory.js             
│   │   │   ├── entityFactory.js 
│   │   │   ├── statusEffectFactory.js 
│   │   │   ├── mapObjectFactory.js 
│   │   │   ├── weatherFactory.js      
│   │   │   └── itemFactory.js
│   │   ├── abilitySystem.js
│   │   ├── turnManager.js
│   │   ├── battleRewardSystem.js
│   │   ├── targetingResolver.js
│   │   ├── itemUpgradeSystem.js  
│   │   ├── combatCalculator.js  
│   │   ├── experienceSystem.js  
│   │   ├── statCalculator.js    
│   │   ├── partyManager.js         
│   │   ├── timeSystem.js
│   │   └── worldManager.js
│   ├── utils/
│   │   ├── textEntry.js
│   │   └── formatting.js
├── .gitignore 
├── LICENSE 
├── package-lock.json 
├── package.json
└── README.md

"We are using an Input Handling Pipeline for a game engine. The architecture follows a strict flow: Input.js (raw events) → SceneManager.js (mediator/router) → UIInteractionManager.js (semantic translator) → BaseController.js (logic consumer).

Core Architectural Rules:

The Bracket Rule: Interaction logic (like drag vs. click math) must be encapsulated within the UIInteractionManager to prevent 'input bleed.' If the UI captures an interaction, it returns a handled flag, and the SceneManager must discard that input for the rest of the game world.

The Interaction Standard: Left-click is for Selecting/Advancing; Right-click is the Universal Back/Cancel button. This is routed through the UIInteractionManager and consumed globally.

Semantic Translation: Raw mouse coordinates and button states are translated into high-level events (onDragStart, onDragMove, onDrop, onHover) before reaching the controllers.

Polymorphic Routing: The SceneManager routes these events to the activeController based on the current scene state."

provide 4 main interaction files: 


//COPY AND PASTE

"We are using an Input Handling Pipeline for a game engine. The architecture follows a strict flow: Input.js (raw events) → SceneManager.js (mediator/router) → UIInteractionManager.js (semantic translator) → BaseController.js (logic consumer). Core Architectural Rules: The Bracket Rule: Interaction logic (like drag vs. click math) must be encapsulated within the UIInteractionManager to prevent 'input bleed.' If the UI captures an interaction, it returns a handled flag, and the SceneManager must discard that input for the rest of the game world. The Interaction Standard: Left-click is for Selecting/Advancing; Right-click is the Universal Back/Cancel button. This is routed through the UIInteractionManager and consumed globally. Semantic Translation: Raw mouse coordinates and button states are translated into high-level events (onDragStart, onDragMove, onDrop, onHover) before reaching the controllers. Polymorphic Routing: The SceneManager routes these events to the activeController based on the current scene state." I will now provide 4 main interaction files save this as the main goal of this session being to use these to standadrize input: /** * core/Input.js */ export class Input { /** * @param {HTMLCanvasElement} canvas */ constructor(canvas) { this.canvas = canvas; this.heldKeys = new Set(); this.lastClick = null; this.lastRightClick = null; this.isMouseDown = false; this.scrollDelta = 0; this.mousePosition = { x: 0, y: 0 }; this._onKeyDown = this._onKeyDown.bind(this); this._onKeyUp = this._onKeyUp.bind(this); this._onMouseDown = this._onMouseDown.bind(this); this._onMouseUp = this._onMouseUp.bind(this); this._onMouseMove = this._onMouseMove.bind(this); this._onWheel = this._onWheel.bind(this); this._onContextMenu = this._onContextMenu.bind(this); // --- ATTACH LISTENERS --- window.addEventListener("keydown", this._onKeyDown); window.addEventListener("keyup", this._onKeyUp); // Listen for mouseup on WINDOW so dragging doesn't get stuck // if the user releases the mouse outside the canvas. window.addEventListener("mouseup", this._onMouseUp); // Prevent default browser context menu window.addEventListener("contextmenu", this._onContextMenu); if (this.canvas) { this.canvas.addEventListener("mousedown", this._onMouseDown); this.canvas.addEventListener("mousemove", this._onMouseMove); this.canvas.addEventListener("wheel", this._onWheel, { passive: false }); } } // --- EVENT HANDLERS --- _onKeyDown(e) { this.heldKeys.add(e.code); } _onKeyUp(e) { this.heldKeys.delete(e.code); } _onContextMenu(e) { e.preventDefault(); } _getMouseCoords(e) { const rect = this.canvas.getBoundingClientRect(); const scaleX = this.canvas.width / rect.width; const scaleY = this.canvas.height / rect.height; return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }; } _onMouseDown(e) { this.isMouseDown = true; // Start Dragging // NOTE: Clicks are now strictly generated on mouseup to ensure // the interaction manager can differentiate them from drags. } _onMouseUp(e) { if (!this.isMouseDown) return; this.isMouseDown = false; // Stop Dragging // Register click only if released over the actual canvas if (e.target === this.canvas) { if (e.button === 2) { this.lastRightClick = this._getMouseCoords(e); } else { this.lastClick = this._getMouseCoords(e); } } } _onMouseMove(e) { this.mousePosition = this._getMouseCoords(e); } _onWheel(e) { e.preventDefault(); const delta = e.deltaY > 0 ? 1 : -1; this.scrollDelta += (delta * 30); this.mousePosition = this._getMouseCoords(e); } // --- CLEANUP --- destroy() { window.removeEventListener("keydown", this._onKeyDown); window.removeEventListener("keyup", this._onKeyUp); window.removeEventListener("mouseup", this._onMouseUp); window.removeEventListener("contextmenu", this._onContextMenu); if (this.canvas) { this.canvas.removeEventListener("mousedown", this._onMouseDown); this.canvas.removeEventListener("mousemove", this._onMouseMove); this.canvas.removeEventListener("wheel", this._onWheel); } } // --- PUBLIC API --- getAndResetClick() { if (!this.lastClick) return null; const click = { ...this.lastClick }; this.lastClick = null; return click; } getAndResetRightClick() { if (!this.lastRightClick) return null; const click = { ...this.lastRightClick }; this.lastRightClick = null; return click; } getAndResetScroll() { const val = this.scrollDelta; this.scrollDelta = 0; return val; } getMousePosition() { return this.mousePosition; } getIsMouseDown() { return this.isMouseDown; } reset() { this.heldKeys.clear(); this.lastClick = null; this.lastRightClick = null; this.isMouseDown = false; this.scrollDelta = 0; } get direction() { const keys = Array.from(this.heldKeys); for (let i = keys.length - 1; i >= 0; i--) { const key = keys[i]; if (key === "ArrowUp" || key === "KeyW") return "UP"; if (key === "ArrowDown" || key === "KeyS") return "DOWN"; if (key === "ArrowLeft" || key === "KeyA") return "LEFT"; if (key === "ArrowRight" || key === "KeyD") return "RIGHT"; } return null; } }import { events } from './eventBus.js'; import { Input } from './input.js'; import { UIInteractionManager } from './UIInteractionManager.js'; // --- CONTROLLERS --- import { OverworldController } from '../controllers/overworld/overworldController.js'; import { EncounterController } from '../controllers/encounter/encounterController.js'; import { CharacterCreatorController } from '../controllers/characterCreator/characterCreatorController.js'; import { PartyController } from '../controllers/party/partyController.js'; import { CharacterSummaryController } from '../controllers/characterSummary/characterSummaryController.js'; import { BattleController } from '../controllers/battle/battleController.js'; import { LevelUpController } from '../controllers/levelUp/levelUpController.js'; // --- RENDERERS --- import { MapRenderer } from '../renderers/overworld/mapRenderer.js'; import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; import { WeatherRenderer } from '../renderers/overworld/weatherRenderer.js'; import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js'; import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; import { PartyRenderer } from '../renderers/party/partyRenderer.js'; import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js'; import { BattleRenderer } from '../renderers/battle/battleRenderer.js'; import { LevelUpRenderer } from '../renderers/levelUp/levelUpRenderer.js'; import { WorldManager } from '../../../shared/systems/worldManager.js'; import { TimeSystem } from '../../../shared/systems/timeSystem.js'; import { gameState } from '../../../shared/state/gameState.js'; export class SceneManager { constructor(canvas, assetLoader, config) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.loader = assetLoader; this.config = config; // Systems this.input = new Input(this.canvas); this.worldManager = new WorldManager(); this.timeSystem = new TimeSystem(); this.uiInteractionManager = new UIInteractionManager(); console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa'); // --- CONTROLLERS --- this.overworldController = new OverworldController(this.input, this.config, this.worldManager); this.encounterController = new EncounterController(this.input, this.config, this.worldManager); this.characterCreatorController = new CharacterCreatorController(); this.partyController = new PartyController(this.input); this.characterSummaryController = null; this.levelUpController = new LevelUpController(this.input); this.battleController = new BattleController(this.input, this.config, this.worldManager); // --- RENDERERS --- this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config); this.lightingRenderer = new LightingRenderer(this.config); this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader); this.encounterRenderer = new EncounterRenderer(this.config, this.loader); this.transitionRenderer = new TransitionRenderer(this.config); this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader); this.partyRenderer = new PartyRenderer(this.ctx, this.loader); this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader); this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader); // State this.currentScene = 'character-creator'; this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this); this.setupInputRouting(); this.setupEventListeners(); } resolveTargetBGM(targetScene) { if (targetScene === 'battle') return 'plainsBattle1'; if (targetScene === 'overworld') return 'plainsOverworldDay'; return null; } resolveTargetAmbience(targetScene) { if (['party', 'character_summary', 'level_up'].includes(targetScene)) return null; if (['battle', 'encounter', 'character-creator'].includes(targetScene)) return 'none'; if (gameState.world && gameState.world.currentWeather) { return gameState.world.currentWeather.audioEffect || 'none'; } return 'none'; } changeScene(sceneName) { console.log(`[SceneManager] Switching to: ${sceneName}`); this.currentScene = sceneName; const targetBGM = this.resolveTargetBGM(sceneName); if (targetBGM !== null) { events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 }); } const targetAmbience = this.resolveTargetAmbience(sceneName); if (targetAmbience !== null) { if (targetAmbience === 'none') { events.emit('STOP_AMBIENCE', { fadeTime: 1.0 }); } else { events.emit('PLAY_AMBIENCE', { id: targetAmbience, fadeTime: 2.0 }); } } } setupEventListeners() { events.on('CHANGE_SCENE', ({ scene, data }) => { this.transitionRenderer.start(() => { this.input.reset(); if (scene === 'overworld') this.overworldController.isLocked = false; if (scene === 'character_summary') { this.characterSummaryController = new CharacterSummaryController(this.input, data); } if (scene === 'level_up') { this.levelUpController.init(data); } if (scene === 'party') { this.partyController.init(data || {}); } this.changeScene(scene); }, 'fade'); }); events.on('INTERACT', (data) => { if (data.type === 'ENCOUNTER') { this.transitionRenderer.start(() => { this.encounterController.start(data.id, data.context); this.changeScene('encounter'); }, 'fade'); } }); events.on('START_ENCOUNTER', (data) => { this.transitionRenderer.start(() => { this.encounterController.start(data.encounterId, data.context || {}); this.changeScene('encounter'); }, 'fade'); }); events.on('START_BATTLE', (data) => { this.transitionRenderer.start(() => { console.log("[SceneManager] Handing off entities to BattleController:", data.enemies); const context = data.context || {}; context.backgroundId = data.background; context.weather = data.weather; this.battleController.start(data.enemies, context); this.changeScene('battle'); }, 'flash', { speed: 4.0, color: '#ffffff' }); }); events.on('BATTLE_ENDED', (data) => { if (data.victory) { events.emit('CHANGE_SCENE', { scene: 'overworld' }); } else { console.log("[SceneManager] Game Over..."); } }); events.on('REQUEST_PARTY_SWAP', (data) => { this.transitionRenderer.start(() => { this.partyController.init({ mode: data.mode || 'BATTLE_SELECT', activeIndices: data.activeIndices, callback: data.callback }); this.changeScene('party'); }, 'wipe', { speed: 3.0 }); }); events.on('CHARACTER_RECRUITED', (data) => { this.transitionRenderer.start(() => { this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.character }); this.changeScene('character_summary'); }, 'wipe', { speed: 3.0 }); }); events.on('TOGGLE_CHARACTER_SUMMARY', (data) => { this.transitionRenderer.start(() => { this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.combatant, returnScene: 'battle', phase: data.phase, onItemSelected: data.onItemSelected }); this.changeScene('character_summary'); }, 'wipe', { speed: 4.0 }); }); } setupInputRouting() { window.addEventListener('keydown', this._handleGlobalKeydown); } _handleGlobalKeydown(e) { if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return; if (e.code === 'Backquote') this.mapRenderer.showDebug = !this.mapRenderer.showDebug; // --- POLYMORPHIC KEYDOWN ROUTING --- const activeController = this._getActiveController(); if (activeController && activeController.handleKeyDown) { // Note: Passed both e.code and e in case some older controllers still expect the raw event activeController.handleKeyDown(e.code, e); } } _getActiveController() { switch (this.currentScene) { case 'overworld': return this.overworldController; case 'encounter': return this.encounterController; case 'battle': return this.battleController; case 'character-creator': return this.characterCreatorController; case 'party': return this.partyController; case 'character_summary': return this.characterSummaryController; case 'level_up': return this.levelUpController; default: return null; } } // Helper to fetch active renderer (useful for generic mouse clicks that depend on UI layout) _getActiveRenderer() { switch (this.currentScene) { case 'overworld': return this.mapRenderer; case 'encounter': return this.encounterRenderer; case 'battle': return this.battleRenderer; case 'character-creator': return this.characterCreatorRenderer; case 'party': return this.partyRenderer; case 'character_summary': return this.characterSummaryRenderer; case 'level_up': return this.levelUpRenderer; default: return null; } } update(dt) { let click = this.input.getAndResetClick(); let rightClick = this.input.getAndResetRightClick(); const scroll = this.input.getAndResetScroll(); const mousePos = this.input.getMousePosition(); const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false; const activeController = this._getActiveController(); const activeRenderer = this._getActiveRenderer(); if (activeController) { const inputProxy = { getMousePosition: () => mousePos, getIsMouseDown: () => isMouseDown, getAndResetClick: () => click, getAndResetRightClick: () => rightClick }; // UI Interaction Manager const uiResult = this.uiInteractionManager.update(inputProxy, activeController); if (uiResult) { if (uiResult.handledClick) click = null; if (uiResult.handledRightClick) rightClick = null; } // --- POLYMORPHIC MOUSE/INPUT ROUTING --- // Relying on the new Base Controller interface to standardize inputs if (activeController.handleMouseMove) { activeController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown, activeRenderer); } if (click && activeController.handleMouseDown) { // Passed activeRenderer here to support Party/LevelUp controllers that previously required it activeController.handleMouseDown(click.x, click.y, activeRenderer); } if (rightClick && activeController.handleRightClick) { activeController.handleRightClick(rightClick.x, rightClick.y); } if (scroll !== 0 && activeController.handleScroll) { activeController.handleScroll(scroll); } // --- POLYMORPHIC CONTROLLER UPDATE --- if (activeController.update) { activeController.update(dt); } } // --- GLOBAL & ENVIRONMENTAL UPDATES --- this.transitionRenderer.update(dt); // Weather and Time updates (Only relevant in specific scenes) if (['overworld', 'encounter', 'battle'].includes(this.currentScene)) { if (this.currentScene === 'overworld') { this.timeSystem.update(dt); } if (this.weatherRenderer.update && this.overworldController.getState().camera) { this.weatherRenderer.update(dt, this.overworldController.getState().camera); } } } render(interpolation, totalTime) { if (!this.loader.isDone()) return; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); switch (this.currentScene) { case 'character-creator': const ccState = this.characterCreatorController.getState(); this.characterCreatorRenderer.render(this.ctx, ccState); break; case 'overworld': this.renderOverworld(interpolation, totalTime); break; case 'party': const pState = this.partyController.getState(); this.partyRenderer.render(pState); break; case 'encounter': this.renderOverworld(interpolation, totalTime); const encState = this.encounterController.getState(); this.encounterRenderer.render(this.ctx, encState); break; case 'battle': this.renderOverworld(interpolation, totalTime); const batState = this.battleController.getState(); this.battleRenderer.render(batState); break; case 'character_summary': if (this.characterSummaryController) { const csState = this.characterSummaryController.getState(); this.characterSummaryRenderer.render(csState); } break; case 'level_up': const luState = this.levelUpController.getState(); this.levelUpRenderer.render(luState); break; } this.transitionRenderer.render(this.ctx); } renderOverworld(interpolation, totalTime) { const state = this.overworldController.getState(); const ambientColor = this.timeSystem.getCurrentColorData(); this.mapRenderer.renderMap( this.worldManager, state.camera, state.entities, interpolation, totalTime, this.lightingRenderer, ambientColor, this.weatherRenderer ); } destroy() { this.input.destroy(); window.removeEventListener('keydown', this._handleGlobalKeydown); } }export class UIInteractionManager { constructor() { this.mouseDownPos = null; this.activeHitboxDown = null; this.isDragging = false; this.dragThreshold = 5; } /** * @returns {Object} { handledClick, handledRightClick } */ update(input, activeScreen) { const mousePos = input.getMousePosition(); const isMouseDown = input.getIsMouseDown ? input.getIsMouseDown() : false; const click = input.getAndResetClick(); const rightClick = input.getAndResetRightClick(); const hitboxes = activeScreen.getHitboxes ? activeScreen.getHitboxes() : []; hitboxes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Track what we intercept to tell SceneManager let handledClick = false; let handledRightClick = false; // 3. HOVER TRANSLATION if (mousePos && activeScreen.onHover) { const hoveredHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes); activeScreen.onHover(hoveredHitbox ? hoveredHitbox.id : null); } // 4. RIGHT CLICK TRANSLATION if (rightClick) { const hit = this._findHitbox(rightClick.x, rightClick.y, hitboxes); // ALWAYS pass the event to the screen, whether there is a hitbox or not if (activeScreen.onRightClick) { activeScreen.onRightClick(hit ? hit.id : null); } handledRightClick = true; // Consume the event globally } // 5. DRAG VS CLICK MATH if (isMouseDown) { if (!this.mouseDownPos && mousePos) { this.mouseDownPos = { x: mousePos.x, y: mousePos.y }; this.activeHitboxDown = this._findHitbox(mousePos.x, mousePos.y, hitboxes); } else if (this.mouseDownPos && mousePos && !this.isDragging) { const dx = mousePos.x - this.mouseDownPos.x; const dy = mousePos.y - this.mouseDownPos.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance > this.dragThreshold && this.activeHitboxDown) { this.isDragging = true; if (activeScreen.onDragStart) { activeScreen.onDragStart(this.activeHitboxDown.id); } } } // ---> ADD THIS BLOCK <--- else if (this.isDragging && mousePos) { if (activeScreen.onDragMove) { activeScreen.onDragMove(mousePos.x, mousePos.y); } } } else { if (this.isDragging) { const targetHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes); if (activeScreen.onDrop) { activeScreen.onDrop(this.activeHitboxDown.id, targetHitbox ? targetHitbox.id : null); } handledClick = true; // <--- ADD THIS: Consume the click so it doesn't bleed into the raw map/gameplay } else if (click) { const hit = this._findHitbox(click.x, click.y, hitboxes); // ALWAYS pass the click to the screen if (activeScreen.onClick) { activeScreen.onClick(hit ? hit.id : null); } // Consume the event so the game map doesn't process it handledClick = true; } // Reset drag state this.mouseDownPos = null; this.activeHitboxDown = null; this.isDragging = false; } // Pass consumption state back up return { handledClick, handledRightClick }; } _findHitbox(x, y, hitboxes) { return hitboxes.find(box => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h ); } }/** * frontend/src/controllers/core/baseController.js */ export class BaseController { constructor(input) { this.input = input; // --- Shared State --- this.mouse = { x: 0, y: 0 }; this.lastRenderedHitboxes = []; this.hoveredHitboxId = null; } // --- Core Architecture --- update(dt) {} getState() { return {}; } // --- Standard UI Hitbox System --- // UIInteractionManager calls this to see what is clickable getHitboxes() { return this.lastRenderedHitboxes; } // Renderers (or controllers) call this to update the cache updateHitboxes(hitboxes) { this.lastRenderedHitboxes = hitboxes; } // --- Standard UI Callbacks --- // UIInteractionManager calls these automatically! onHover(hitboxId) { // Save the currently hovered ID so child controllers know what is highlighted this.hoveredHitboxId = hitboxId; } onClick(hitboxId) {} onRightClick(hitboxId) {} onDragMove(x, y) {} // <-- Add this onDragStart(hitboxId) {} onDrop(dragId, targetId) {} // --- Raw Input Fallbacks --- // SceneManager calls these automatically for non-UI interactions handleKeyDown(keyCode, e) {} handleScroll(delta) {} handleMouseMove(x, y, isMouseDown, renderer) { // Automatically keep track of raw mouse coordinates for all controllers this.mouse.x = x; this.mouse.y = y; } handleMouseDown(x, y, renderer) {} handleRightClick(x, y) {} }
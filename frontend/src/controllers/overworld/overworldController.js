import { events } from '../../core/eventBus.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { EntityFactory } from '../../../../shared/systems/factories/entityFactory.js';
import { WeatherFactory } from '../../../../shared/systems/factories/weatherFactory.js';
import { PartyManager } from '../../../../shared/systems/partyManager.js';
import { BaseController } from '../core/baseController.js';
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';
import { QuestDefinitions } from '../../../../shared/data/questDefinitions.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

export class OverworldController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.config = config;
        this.worldManager = worldManager;
        this.player = this.createPlayerEntity();
        this.camera = { x: 0, y: 0, prevX: 0, prevY: 0 };
        this.isLocked = false;
        this.isMenuOpen = false;

        // --- RESTORED SQUARE LAYOUT ---
        const MENU_X = 48;
        const MENU_Y = 48;
        const BTN_SIZE = 104; // Square width/height
        const GAP = 8;        // Gap between stacked buttons

        this.menuToggleHitbox = {
            id: 'btn_menu_toggle',
            x: MENU_X, y: MENU_Y,
            w: BTN_SIZE, h: BTN_SIZE,
            spriteCol: 0, spriteRow: 0,
            label: 'Menu',
            shortcut: '1', 
            zIndex: 100,
            hoverSfx: 'hoverTick'
        };

        this.dropdownHitboxes = [
            { id: 'btn_party',     x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 1, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, hoverSfx: 'hoverTick', spriteCol: 1, spriteRow: 0, label: 'Party', shortcut: '2' },
            { id: 'btn_character', x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 2, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, hoverSfx: 'hoverTick', spriteCol: 2, spriteRow: 0, label: 'Character', shortcut: '3' },
            { id: 'btn_journal',   x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 3, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, hoverSfx: 'hoverTick', spriteCol: 3, spriteRow: 0, label: 'Journal', shortcut: '4' },
            { id: 'btn_crafting',  x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 4, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, hoverSfx: 'hoverTick', spriteCol: 4, spriteRow: 0, label: 'Crafting', shortcut: '5' },
            { id: 'btn_system',    x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 5, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, hoverSfx: 'hoverTick', spriteCol: 5, spriteRow: 0, label: 'System', shortcut: '6' }
        ];
    }

    getHitboxes() {
        if (this.isMenuOpen) {
            return [this.menuToggleHitbox, ...this.dropdownHitboxes];
        }
        return [this.menuToggleHitbox];
    }

    onClick(hitboxId) {
        if (this.isLocked) return;

        switch (hitboxId) {
            case 'btn_menu_toggle':
                events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 1.0 });
                this.isMenuOpen = !this.isMenuOpen;
                break;
            case 'btn_party':
                this.executeMenuAction('party');
                break;
            case 'btn_character':
                this.executeMenuAction('character_summary');
                break;
            case 'btn_journal':
                this.executeMenuAction('journal');
                break;
            case 'btn_crafting':
                events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 0.95 + Math.random() * 0.1 });
                this.isMenuOpen = false;
                this.isLocked = true;
                events.emit('OPEN_WORKSHOP', { station: 'any', title: 'Crafting Bag' });
                break;
            case 'btn_system':
                this.executeMenuAction('title');
                break;
            default:
                if (this.isMenuOpen) this.isMenuOpen = false;
                break;
        }
    }

    executeMenuAction(sceneName) {
        events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 0.95 + Math.random() * 0.1 });
        console.log(`[Overworld] Opening ${sceneName} Menu...`);
        this.isMenuOpen = false;
        this.isLocked = true;
        events.emit('CHANGE_SCENE', { scene: sceneName });
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
    }

    handleKeyDown(code, e) {
        if (this.isLocked) return;

        if (code === 'KeyI' || code === 'Enter') this.interact();

        // 1: Toggle Menu
        if (code === 'Digit1') {
            events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 1.0 });
            this.isMenuOpen = !this.isMenuOpen;
        }
        // 2: Party
        if (code === 'Digit2') this.executeMenuAction('party');
        // 3: Character
        if (code === 'Digit3') this.executeMenuAction('character_summary');
        // 4: Journal
        if (code === 'Digit4') this.executeMenuAction('journal');
        // 5: Crafting Bag
        if (code === 'Digit5') {
            this.isLocked = true;
            this.isMenuOpen = false;
            events.emit('OPEN_WORKSHOP', { station: 'any', title: 'Crafting Bag' });
        }
        // 6: System / Title
        if (code === 'Digit6') this.executeMenuAction('title');

        if (code === 'Escape' && this.isMenuOpen) {
            this.isMenuOpen = false;
        }
    }

    handleMouseDown(x, y, renderer) {
        if (this.isLocked) return;
    }

    update(dt) {
        super.update(dt);
        this.checkEnvironmentMusic();

        this.worldManager.getActiveObjects().forEach(obj => {
            if (obj.isAnimating) {
                obj.animTimer = (obj.animTimer || 0) + dt;
                if (obj.animTimer >= (obj.speed || 0.15)) {
                    obj.animTimer = 0;
                    if (obj.currentFrame < obj.frames - 1) {
                        obj.currentFrame++;
                    } else {
                        obj.isAnimating = false;
                        if (obj.interaction?.type === 'WARP') {
                            events.emit('INTERACT', { ...obj.interaction, context: { col: obj.col, row: obj.row, objectId: obj.id } });
                        } else {
                            this.isLocked = false;
                        }
                    }
                }
            }
        });

        if (this.isLocked) return;

        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
        this.camera.prevX = this.camera.x;
        this.camera.prevY = this.camera.y;

        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }

        this.updateCamera();
    }

    // --- NEW: Extracted Reusable Pickup Logic ---
    processPickup(targetObj) {
        targetObj.isFading = true;
        
        const itemId = targetObj.interaction.itemId;
        const amount = targetObj.interaction.amount || 1;
        InventorySystem.addItem(itemId, amount);
        
        events.emit('PLAY_SFX', { id: 'pickup_sound', volume: 0.8, pitch: 1.0 });

        // --- LOOK UP EXACT ITEM DEFINITION ---
        const itemDef = ItemDefinitions[itemId];
        const iconCol = itemDef?.icon?.col || 0;
        const iconRow = itemDef?.icon?.row || 0;

        // --- DETERMINE CORRECT SPRITE SHEET ---
        let sheetName = 'items';
        if (itemDef) {
            const type = (itemDef.type || '').toLowerCase();
            const slot = (itemDef.slot || '').toLowerCase();
            if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
                sheetName = 'weapons';
            } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
                sheetName = 'armor';
            } else if (type === 'consumable') {
                sheetName = 'consumables';
            } else if (type === 'material') {
                sheetName = 'materials';
            }
        }

        // --- TRIGGER TOAST ---
        if (!gameState.ui) gameState.ui = {};
        if (!gameState.ui.toasts) gameState.ui.toasts = [];
        gameState.ui.toasts.push({
            itemId: itemId,
            amount: amount,
            createdAt: performance.now(),
            duration: 2500,
            iconSheet: sheetName, 
            iconCol: iconCol,
            iconRow: iconRow
        });

        // Clean up expired toasts
        gameState.ui.toasts = gameState.ui.toasts.filter(t => performance.now() - t.createdAt < 3000);

        // --- FADE OUT MAP OBJECT ---
        targetObj.alpha = 1.0;
        const fadeSteps = 15;
        const fadeDuration = 300;
        const stepTime = fadeDuration / fadeSteps;
        const alphaDrop = 1.0 / fadeSteps;
        const fadeInterval = setInterval(() => {
            targetObj.alpha -= alphaDrop;
            if (targetObj.alpha <= 0) {
                this.worldManager.modifyWorld(targetObj.col, targetObj.row, null);
                clearInterval(fadeInterval);
            }
        }, stepTime);
    }

    interact() {
        if (this.player.isMoving || this.isLocked) return;

        const obj = this.getFacedObject();

        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.id} at ${obj.col},${obj.row}`);

            // --- NEW: Intercept item pickups so the game doesn't freeze! ---
            if (obj.interaction.type === 'PICKUP') {
                this.processPickup(obj);
                return; // Exit early to prevent input lock
            }

            this.isLocked = true;
            this.player.animFrame = 0;

            // Handle custom workbench/station interactions
            if (obj.interaction.type === 'CRAFTING_STATION' || obj.interaction.type === 'WORKSHOP') {
                events.emit('CHANGE_SCENE', { scene: 'workshop', data: { station: obj.interaction.station || 'any', title: obj.interaction.title || obj.name || 'Workshop' } });
                return;
            }

            // Default interaction dispatch
            events.emit('INTERACT', { ...obj.interaction, context: { col: obj.col, row: obj.row, objectId: obj.id } });
        }
    }

    checkForNewMove() {
        const dir = this.input.direction;
        if (!dir) return;

        const { TILE_SIZE } = this.config;
        let nextX = this.player.x;
        let nextY = this.player.y;

        this.player.direction = dir;

        if (dir === "UP")    nextY -= TILE_SIZE;
        if (dir === "DOWN")  nextY += TILE_SIZE;
        if (dir === "LEFT")  nextX -= TILE_SIZE;
        if (dir === "RIGHT") nextX += TILE_SIZE;

        if (this.isSpaceFree(nextX, nextY)) {
            this.startMove(nextX, nextY);
        }
    }

    startMove(nextX, nextY) {
        this.player.sourceX = this.player.x;
        this.player.sourceY = this.player.y;
        this.player.destX = nextX;
        this.player.destY = nextY;
        this.player.moveProgress = 0;
        this.player.isMoving = true;
    }

    continueMoving(dt) {
        const moveSpeed = this.config.WALK_DURATION;
        this.player.moveProgress += dt / moveSpeed;
        this.player.animTimer += dt;

        if (this.player.animTimer > 0.1) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }

        if (this.player.moveProgress >= 1) {
            const overshoot = this.player.moveProgress - 1;
            this.finishMove();

            if (this.player.isMoving) {
                this.player.moveProgress = overshoot;
                this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
                this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
            }
        } else {
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    finishMove() {
        this.player.x = Math.round(this.player.destX);
        this.player.y = Math.round(this.player.destY);
        this.player.isMoving = false;
        this.player.moveProgress = 0;

        gameState.player.col = Math.floor(this.player.x / this.config.TILE_SIZE);
        gameState.player.row = Math.floor(this.player.y / this.config.TILE_SIZE);
        gameState.player.direction = this.player.direction;

        const stepOnObj = this.worldManager.getObjectAt(gameState.player.col, gameState.player.row);

        // --- UPDATED: Handle Walk-Over Pickups ---
        if (stepOnObj && stepOnObj.interaction?.type === 'PICKUP' && !stepOnObj.isFading) {
            this.processPickup(stepOnObj);
        }

        // Existing Warp logic
        if (stepOnObj && stepOnObj.frames > 1 && stepOnObj.interaction?.type === 'WARP') {
            this.isLocked = true;
            stepOnObj.isAnimating = true;
            stepOnObj.currentFrame = 0;
            stepOnObj.animTimer = 0;
            events.emit('PLAY_SFX', { id: 'door_open', volume: 0.6, pitch: 1.0 });
            return;
        }

        this.checkTileEvents();
        this.validateBiomeWeather();

        if (this.isLocked) return;

        if (this.input.direction) {
            this.checkForNewMove();
        } else {
            this.player.animFrame = 0;
        }
    }

    checkTileEvents() {
        const col = Math.floor(this.player.x / this.config.TILE_SIZE);
        const row = Math.floor(this.player.y / this.config.TILE_SIZE);
        const biome = this.worldManager.getBiomeAt(col, row);
        
        const currentHour = gameState.world.time / 60;
        const encounterData = biome.getEncounter(currentHour);
        
        if (encounterData) {
            console.log(`[Overworld] Encounter triggered in ${biome.id} at hour ${Math.floor(currentHour)}: ${encounterData.id}!`);
            this.isLocked = true;
            this.player.isMoving = false;
            this.player.moveProgress = 0;
            this.player.animFrame = 0;
            events.emit('START_ENCOUNTER', { encounterId: encounterData.id });
            return;
        }

        const difficulty = gameState.difficulty || 'normal';
        const battleData = biome.getBattle(difficulty);

        if (!battleData) return;

        console.log(`[Overworld] Ambush triggered in biome: ${biome.id} on ${difficulty} difficulty!`);
        this.isLocked = true;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.player.animFrame = 0;

        const battleBgAsset = biome.getBattleBackground(currentHour);

        const battlePayload = {
            enemies: battleData.enemies,
            background: battleBgAsset,
            weather: gameState.world.currentWeather
        };
        events.emit('START_BATTLE', battlePayload);
    }

    validateBiomeWeather() {
        const col = gameState.player.col;
        const row = gameState.player.row;
        const biome = this.worldManager.getBiomeAt(col, row);
        gameState.world.currentBiome = biome.id;

        const activeWeather = gameState.world.currentWeather;
        if (!activeWeather || activeWeather.id.toUpperCase() === 'CLEAR') return;

        const allowed = (biome.allowedWeather || []).map(w => w.toUpperCase());
        if (!allowed.includes(activeWeather.id.toUpperCase())) {
            console.log(`[Weather] Clearing skies. ${activeWeather.id} invalid in ${biome.id}.`);
            gameState.world.currentWeather = WeatherFactory.createWeather('CLEAR');
        }
    }

    checkEnvironmentMusic() {
        const col = gameState.player.col;
        const row = gameState.player.row;
        const biome = this.worldManager.getBiomeAt(col, row);
        
        const currentHour = (gameState.world.time || 0) / 60;
        const targetTrack = biome.getMusic(currentHour, false);

        if (targetTrack && gameState.world.currentBgm !== targetTrack) {
            console.log(`[Overworld] Music shift to: ${targetTrack}`);
            gameState.world.currentBgm = targetTrack;
            events.emit('PLAY_MUSIC', { id: targetTrack, fadeTime: 4.0 });
        }
    }

    isSpaceFree(targetX, targetY) {
        const { TILE_SIZE } = this.config;
        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);
        const endCol = Math.floor(targetX / TILE_SIZE);
        const endRow = Math.floor(targetY / TILE_SIZE);

        return this.worldManager.canMove(startCol, startRow, endCol, endRow, this.player.direction);
    }

    updateCamera() {
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
        this.camera.prevX = this.player.prevX;
        this.camera.prevY = this.player.prevY;
    }

    getTrackedQuests() {
        if (!gameState.quests || !gameState.quests.active) return [];
        const trackedIds = gameState.quests.trackedIds || [];
        const trackedQuests = [];

        for (const id of trackedIds) {
            const questState = gameState.quests.active[id];
            const def = QuestDefinitions[id];

            if (questState && def) {
                const formattedObjectives = def.objectives.map(obj => {
                    const current = questState.progress[obj.id] || 0;
                    const required = obj.amount || 1;
                    
                    let actionText = "Objective";
                    let targetText = obj.targetId;
                    
                    if (obj.type === 'kill_enemy') actionText = "Defeat";
                    if (obj.type === 'obtain_item') actionText = "Collect";
                    if (obj.type === 'craft') actionText = "Craft"; // <--- ADD THIS LINE
                    if (obj.type === 'party_level') {
                        actionText = "Reach Level";
                        targetText = obj.targetLevel;
                    }

                    if (typeof targetText === 'string') {
                        targetText = targetText.split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                    }

                    return {
                        description: `${actionText} ${targetText}`,
                        current: current,
                        required: required
                    };
                });

                trackedQuests.push({ title: def.name, objectives: formattedObjectives });
            }
        }
        return trackedQuests;
    }

    getFacedObject() {
        if (this.player.isMoving || this.isLocked) return null;

        const { TILE_SIZE } = this.config;
        let targetX = this.player.x;
        let targetY = this.player.y;

        if (this.player.direction === "UP")    targetY -= TILE_SIZE;
        if (this.player.direction === "DOWN")  targetY += TILE_SIZE;
        if (this.player.direction === "LEFT")  targetX -= TILE_SIZE;
        if (this.player.direction === "RIGHT") targetX += TILE_SIZE;

        const lookCol = Math.floor(targetX / TILE_SIZE);
        const lookRow = Math.floor(targetY / TILE_SIZE);

        const obj = this.worldManager.getObjectAt(lookCol, lookRow);

        // Only return it if it has an interaction and isn't currently fading
        if (obj && obj.interaction && !obj.isFading) {
            return obj;
        }

        return null;
    }

    getState() {
        return {
            entities: [this.player],
            camera: this.camera,
            hoveredHitboxId: this.hoveredHitboxId,
            menuToggleHitbox: this.menuToggleHitbox,
            dropdownHitboxes: this.dropdownHitboxes,
            isMenuOpen: this.isMenuOpen,
            trackedQuests: this.getTrackedQuests(),
            toasts: (gameState.ui && gameState.ui.toasts) ? gameState.ui.toasts : [],
            facedObject: this.getFacedObject()
        };
    }

    warpTo(col, row) {
        const { TILE_SIZE } = this.config;
        gameState.player.col = col;
        gameState.player.row = row;
        
        this.player.x = col * TILE_SIZE;
        this.player.y = row * TILE_SIZE;
        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
        this.player.destX = this.player.x;
        this.player.destY = this.player.y;
        this.player.sourceX = this.player.x;
        this.player.sourceY = this.player.y;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
        this.camera.prevX = this.player.x;
        this.camera.prevY = this.player.y;
    }

    createPlayerEntity() {
        let startX, startY;
        const savedCol = gameState.player.col;
        const savedRow = gameState.player.row;

        if (savedCol !== 0 || savedRow !== 0) {
            startX = savedCol * this.config.TILE_SIZE;
            startY = savedRow * this.config.TILE_SIZE;
        } else {
            const spawn = this.worldManager.findSpawnPoint();
            startX = spawn.col * this.config.TILE_SIZE;
            startY = spawn.row * this.config.TILE_SIZE;
            gameState.player.col = spawn.col;
            gameState.player.row = spawn.row;
        }

        return {
            id: "player",
            isPlayer: true,
            x: startX,
            y: startY,
            hitbox: { y: 0.5, h: 0.5 },
            direction: gameState.player.direction || "DOWN",
            isMoving: false,
            animFrame: 0,
            animTimer: 0,
            light: {
                hasLight: true,
                radius: 4,
                color: '255, 200, 100',
                maxAlpha: 0.5,
                flickerAmp: 0.1
            }
        };
    }
}
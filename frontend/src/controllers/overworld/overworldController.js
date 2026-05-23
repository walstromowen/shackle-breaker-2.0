import { events } from '../../core/eventBus.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { EntityFactory } from '../../../../shared/systems/factories/entityFactory.js';
import { WeatherFactory } from '../../../../shared/systems/factories/weatherFactory.js';
import { PartyManager } from '../../../../shared/systems/partyManager.js';
import { BaseController } from '../core/baseController.js';
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';

export class OverworldController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.config = config;
        this.worldManager = worldManager;
        this.player = this.createPlayerEntity();
        this.camera = { x: 0, y: 0, prevX: 0, prevY: 0 };
        this.isLocked = false;

        // Added hoverSfx for automatic hover ticking
        this.uiHitboxes = [
            { id: 'btn_party', x: 48, y: 48, w: 80, h: 80, zIndex: 100, hoverSfx: 'hoverTick' }
        ];
    }

    getHitboxes() {
        return this.uiHitboxes;
    }

    onClick(hitboxId) {
        if (this.isLocked) return;

        switch (hitboxId) {
            case 'btn_party':
                events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 0.95 + Math.random() * 0.1 });
                console.log("[Overworld] Opening Party Menu (via UI click)...");
                this.isLocked = true;
                events.emit('CHANGE_SCENE', { scene: 'party' });
                break;
        }
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
    }

    handleKeyDown(code, e) {
        if (this.isLocked) return;

        if (code === 'Space' || code === 'Enter') this.interact();
        
        if (code === 'KeyP') {
            events.emit('PLAY_SFX', { id: 'click', volume: 0.6, pitch: 0.95 + Math.random() * 0.1 });
            console.log("[Overworld] Opening Party Menu (via Hotkey)...");
            this.isLocked = true;
            events.emit('CHANGE_SCENE', { scene: 'party' });
        }
    }

    handleMouseDown(x, y, renderer) {
        if (this.isLocked) return;
    }

    update(dt) {
        super.update(dt);
        this.checkEnvironmentMusic();

        // --- STEP STATEFUL OBJECT ANIMATIONS (e.g., Doors Opening) ---
        this.worldManager.getActiveObjects().forEach(obj => {
            if (obj.isAnimating) {
                obj.animTimer = (obj.animTimer || 0) + dt;
                if (obj.animTimer >= (obj.speed || 0.15)) {
                    obj.animTimer = 0;
                    if (obj.currentFrame < obj.frames - 1) {
                        obj.currentFrame++;
                    } else {
                        // Animation finished!
                        obj.isAnimating = false;

                        // If it's a warp trigger, instantly execute the room transition now
                        if (obj.interaction?.type === 'WARP') {
                            events.emit('INTERACT', { 
                                ...obj.interaction, 
                                context: { col: obj.col, row: obj.row, objectId: obj.id } 
                            });
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

    interact() {
        if (this.player.isMoving || this.isLocked) return;

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

        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.id} at ${obj.col},${obj.row}`);
            this.isLocked = true;
            this.player.animFrame = 0;
            events.emit('INTERACT', {
                ...obj.interaction,
                context: { col: obj.col, row: obj.row, objectId: obj.id }
            });
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

        // --- INTERCEPT: STEPPING INTO AN ANIMATED WARP DOOR ---
        const stepOnObj = this.worldManager.getObjectAt(gameState.player.col, gameState.player.row);
        if (stepOnObj && stepOnObj.frames > 1 && stepOnObj.interaction?.type === 'WARP') {
            this.isLocked = true; // Freeze player input
            stepOnObj.isAnimating = true;
            stepOnObj.currentFrame = 0;
            stepOnObj.animTimer = 0;
            
            events.emit('PLAY_SFX', { id: 'door_open', volume: 0.6, pitch: 1.0 });
            return; // Halt encounters/movement checks while the door transitions open
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

        // --- UPDATED: Look how clean this is now! ---
        // We just pass the raw enemy array straight from the biome definition.
        // SceneManager will catch this payload, scale them, and build the entities.
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

    getState() {
        return {
            entities: [this.player],
            camera: this.camera,
            hoveredHitboxId: this.hoveredHitboxId
        };
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
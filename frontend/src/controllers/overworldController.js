import { events } from '../core/eventBus.js';
import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';

export class OverworldController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager; 

        // 1. Setup Player State
        this.player = this.createPlayerEntity();
        
        // 2. Setup Camera
        this.camera = { x: 0, y: 0 };
        this.updateCamera();

        // 3. LOCK FLAG
        // Prevents inputs and updates during scene transitions or events
        this.isLocked = false;
    }

    // ==========================================
    // INPUT HANDLING
    // ==========================================

    handleKeyDown(code) {
        if (this.isLocked) return;

        if (code === 'Space' || code === 'Enter') {
            this.interact();
        }

        if (code === 'KeyP') {
            console.log("[Overworld] Opening Party Menu...");
            this.isLocked = true; 
            events.emit('CHANGE_SCENE', { scene: 'party' });
        }

        if (code === 'KeyI') {
            console.log("[Overworld] Opening Inventory...");
        }
    }

    // ==========================================
    // GAME LOOP
    // ==========================================

    update(dt) {
        if (this.isLocked) return;

        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }
        this.updateCamera();
    }

    // ==========================================
    // MOVEMENT & INTERACTION LOGIC
    // ==========================================

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

        // 1. Priority Check: Is there a Large Object here?
        let obj = this.worldManager.getSolidObjectAt(lookCol, lookRow);

        // 2. Fallback: Single-tile object
        if (!obj) {
            obj = this.worldManager.getObject(lookCol, lookRow);
        }
            
        // 3. Trigger Interaction
        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.type} at ${obj.col},${obj.row}`);

            this.isLocked = true;

            events.emit('INTERACT', {
                ...obj.interaction,       
                context: {                
                    col: obj.col,
                    row: obj.row,
                    objectId: obj.type
                }
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
            this.finishMove();
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

        // Sync to global Game State
        gameState.player.col = Math.floor(this.player.x / this.config.TILE_SIZE);
        gameState.player.row = Math.floor(this.player.y / this.config.TILE_SIZE);
        gameState.player.direction = this.player.direction;

        // Check for biome-specific events (e.g., ambushes)
        this.checkTileEvents();

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
        
        // Use the WorldManager to determine our current biome
        const biome = this.worldManager.getBiomeAt(col, row);

        // Ask the specific biome to roll for an encounter based on its internal logic
        const battleData = biome.getBattle();

        if (!battleData) return;

        console.log(`[Overworld] Ambush triggered in biome: ${biome.id}!`);

        // Lock the overworld while the battle takes place
        this.isLocked = true;
        this.player.isMoving = false;
        this.player.moveProgress = 0;

        // Generate the enemy party specifically catered to this biome
        const enemyParty = [];
        for (const enemyId of battleData.enemies) {
            const enemyEntity = EntityFactory.create(enemyId);
            enemyEntity.name = `${enemyEntity.name || enemyId} ${enemyParty.length + 1}`;
            enemyParty.push(enemyEntity);
        }

        events.emit('START_BATTLE', {
            enemies: enemyParty,
        });
    }

    isSpaceFree(targetX, targetY) {
        const { TILE_SIZE } = this.config;

        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);

        const endCol = Math.floor(targetX / TILE_SIZE);
        const endRow = Math.floor(targetY / TILE_SIZE);

        return this.worldManager.canMove(startCol, startRow, endCol, endRow);
    }

    // ==========================================
    // CAMERA & STATE
    // ==========================================

    updateCamera() {
        const { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_SCALE, TILE_SIZE } = this.config;
        this.camera.x = this.player.x - (CANVAS_WIDTH / GAME_SCALE / 2) + (TILE_SIZE / 2);
        this.camera.y = this.player.y - (CANVAS_HEIGHT / GAME_SCALE / 2) + (TILE_SIZE / 2);
    }

    getState() {
        return { entities: [this.player], camera: this.camera };
    }

    createPlayerEntity() {
        let startX, startY;

        const savedCol = gameState.player.col;
        const savedRow = gameState.player.row;

        if (savedCol !== 0 || savedRow !== 0) {
            startX = savedCol * this.config.TILE_SIZE;
            startY = savedRow * this.config.TILE_SIZE;
        } 
        else {
            // Utilizes the WorldManager's standardized flat-ground spawn logic
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
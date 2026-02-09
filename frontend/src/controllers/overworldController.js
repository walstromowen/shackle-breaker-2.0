import { events } from '../core/eventBus.js';
import { gameState } from '../../../shared/state/gameState.js';

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
    }

    /**
     * --- EVENT RECEIVER ---
     */
    handleKeyDown(code) {
        // Interact Actions
        if (code === 'Space' || code === 'Enter') {
            this.interact();
        }

        // Toggle Party Menu
        if (code === 'KeyP') {
            console.log("[Overworld] Opening Party Menu...");
            events.emit('CHANGE_SCENE', { scene: 'party' });
        }

        // Context Actions (Inventory)
        if (code === 'KeyI') {
            console.log("Opening Inventory...");
        }
    }

    /**
     * --- CONTINUOUS LOOP ---
     */
    update(dt) {
        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }
        this.updateCamera();
    }

    // --- LOGIC: MOVEMENT & INTERACTION ---

    interact() {
        if (this.player.isMoving) return;

        // 1. Calculate the tile we are facing
        const { TILE_SIZE } = this.config;
        let targetX = this.player.x;
        let targetY = this.player.y;

        if (this.player.direction === "UP")    targetY -= TILE_SIZE;
        if (this.player.direction === "DOWN")  targetY += TILE_SIZE;
        if (this.player.direction === "LEFT")  targetX -= TILE_SIZE;
        if (this.player.direction === "RIGHT") targetX += TILE_SIZE;

        const lookCol = Math.floor(targetX / TILE_SIZE);
        const lookRow = Math.floor(targetY / TILE_SIZE);

        // 2. Priority Check: Is there a Large Object here?
        let obj = this.worldManager.getSolidObjectAt(lookCol, lookRow);

        // 3. Fallback: Single-tile object
        if (!obj) {
            obj = this.worldManager.getObject(lookCol, lookRow);
        }
            
        // 4. Trigger Interaction
        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.type} at ${obj.col},${obj.row}`);

            // >>> THE FIX IS HERE <<<
            // We must bundle the coordinates (context) into the event payload.
            // SceneManager will extract this 'context' and pass it to EncounterController.
            events.emit('INTERACT', {
                ...obj.interaction,       // Spreads: { type: 'ENCOUNTER', id: 'oakTree' }
                context: {                // Adds:    { col: 10, row: 5 }
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

        // Update facing direction immediately
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
        // 1. Update Progress
        const moveSpeed = this.config.WALK_DURATION; 
        this.player.moveProgress += dt / moveSpeed;
        
        // 2. Animate Sprite
        this.player.animTimer += dt;
        if (this.player.animTimer > 0.1) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }

        // 3. Check Completion
        if (this.player.moveProgress >= 1) {
            this.finishMove();
        } else {
            // Lerp Position
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    finishMove() {
        this.player.x = Math.round(this.player.destX);
        this.player.y = Math.round(this.player.destY);
        this.player.isMoving = false;
        this.player.moveProgress = 0;

        // Sync to Game State
        gameState.player.col = Math.floor(this.player.x / this.config.TILE_SIZE);
        gameState.player.row = Math.floor(this.player.y / this.config.TILE_SIZE);
        gameState.player.direction = this.player.direction;

        this.checkTileEvents();

        if (this.input.direction) {
            this.checkForNewMove();
        } else {
            this.player.animFrame = 0; 
        }
    }

    // --- HELPERS ---

    checkTileEvents() {
        const col = Math.floor(this.player.x / this.config.TILE_SIZE);
        const row = Math.floor(this.player.y / this.config.TILE_SIZE);
        const tileId = this.worldManager.getTileAt(col, row);

        if (tileId === this.config.TILE_TYPES.GRASS && Math.random() < 0.10) { 
            console.log("💥 AMBUSH in the grass!");
        }
    }

    isSpaceFree(targetX, targetY) {
        const { TILE_SIZE } = this.config;

        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);

        const endCol = Math.floor(targetX / TILE_SIZE);
        const endRow = Math.floor(targetY / TILE_SIZE);

        return this.worldManager.canMove(startCol, startRow, endCol, endRow);
    }

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
            spriteKey: 'spritesheet',
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
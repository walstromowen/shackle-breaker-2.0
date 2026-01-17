import { events } from '../core/eventBus.js';
import { gameState } from '../../../shared/state/gameState.js';

export class OverworldController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager; 

        // 1. Setup Player State
        // We now check GameState first. If it's empty/default, we look for a spawn point.
        this.player = this.createPlayerEntity();
        
        // 2. Setup Camera
        this.camera = { x: 0, y: 0 };
        this.updateCamera();
    }

    /**
     * --- EVENT RECEIVER ---
     * The SceneManager calls this when a key is pressed ONCE.
     */
    handleKeyDown(code) {
        // Interact Actions
        if (code === 'Space' || code === 'Enter') {
            this.interact();
        }

        // --- NEW: TOGGLE PARTY MENU ---
        // Instead of advancing time, we switch the game mode to PARTY
        if (code === 'KeyP') {
            console.log("[Overworld] Opening Party Menu...");
            gameState.mode = "PARTY";
            events.emit('PARTY', {});
        }

        // Context Actions (Example: Open Inventory)
        if (code === 'KeyI') {
            console.log("Opening Inventory...");
            // events.emit('OPEN_MENU', 'inventory'); 
        }
        
    }

    /**
     * --- CONTINUOUS LOOP ---
     * Checks for held keys (movement) every frame.
     */
    update(dt) {
        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            // Only check for new input if we aren't currently moving
            this.checkForNewMove();
        }
        this.updateCamera();
    }

    // --- LOGIC: MOVEMENT & INTERACTION ---

    interact() {
        if (this.player.isMoving) return;

        // 1. Calculate the tile we are facing (Target Tile)
        const { TILE_SIZE } = this.config;
        let targetX = this.player.x;
        let targetY = this.player.y;

        if (this.player.direction === "UP")    targetY -= TILE_SIZE;
        if (this.player.direction === "DOWN")  targetY += TILE_SIZE;
        if (this.player.direction === "LEFT")  targetX -= TILE_SIZE;
        if (this.player.direction === "RIGHT") targetX += TILE_SIZE;

        const lookCol = Math.floor(targetX / TILE_SIZE);
        const lookRow = Math.floor(targetY / TILE_SIZE);

        // 2. Priority Check: Is there a Large Object here? (e.g. House, Big Tree)
        // Note: 'obj' will contain the object's ANCHOR coordinates (obj.col, obj.row),
        // which might be different from where we are looking (lookCol, lookRow).
        let obj = this.worldManager.getSolidObjectAt(lookCol, lookRow);

        // 3. Fallback: If no large object, check for a single-tile object (e.g. Flower, Sign)
        if (!obj) {
            obj = this.worldManager.getObject(lookCol, lookRow);
        }
         
        // 4. Trigger Interaction
        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.type} at ${obj.col},${obj.row}`);

            // A. Populate Encounter State
            gameState.encounter.activeData = obj.interaction; 
            gameState.encounter.currentStageId = "start";
            
            // B. Save Context (CRITICAL for modifying the world later)
            // We save obj.col/row (the anchor), not lookCol/lookRow (the hitbox).
            gameState.encounter.context = {
                col: obj.col,
                row: obj.row,
                objectId: obj.type
            };

            // C. Switch Engine Mode
            // The Main Loop will detect this and switch to EncounterController next frame
            gameState.mode = "ENCOUNTER";
            
            // D. (Optional) Emit event if UI needs to react immediately
            events.emit('INTERACT', obj.interaction);
        }
    }

    checkForNewMove() {
        // Polling the dumb Input class for state
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

        // --- UPDATED: SYNC TO NEW GAME STATE ---
        // We convert Pixels back to Grid Coordinates for the state
        gameState.player.col = Math.floor(this.player.x / this.config.TILE_SIZE);
        gameState.player.row = Math.floor(this.player.y / this.config.TILE_SIZE);
        gameState.player.direction = this.player.direction;

        // Trigger Step Events (Grass, Portal, etc)
        this.checkTileEvents();

        // Input Buffering: If key is still held, keep moving immediately
        if (this.input.direction) {
            this.checkForNewMove();
        } else {
            this.player.animFrame = 0; // Idle frame
        }
    }

    // --- HELPERS ---

    checkTileEvents() {
        const col = Math.floor(this.player.x / this.config.TILE_SIZE);
        const row = Math.floor(this.player.y / this.config.TILE_SIZE);
        const tileId = this.worldManager.getTileAt(col, row);

        if (tileId === this.config.TILE_TYPES.GRASS && Math.random() < 0.10) { 
            console.log("💥 AMBUSH in the grass!");
            // Future: events.emit('BATTLE_START');
        }
    }

    isSpaceFree(targetX, targetY) {
        const { TILE_SIZE } = this.config;

        // 1. Where are we NOW? (Source)
        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);

        // 2. Where do we want to GO? (Destination)
        const endCol = Math.floor(targetX / TILE_SIZE);
        const endRow = Math.floor(targetY / TILE_SIZE);

        return this.worldManager.canMove(startCol, startRow, endCol, endRow);
    }

    updateCamera() {
        const { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_SCALE, TILE_SIZE } = this.config;
        // Center player in viewport
        this.camera.x = this.player.x - (CANVAS_WIDTH / GAME_SCALE / 2) + (TILE_SIZE / 2);
        this.camera.y = this.player.y - (CANVAS_HEIGHT / GAME_SCALE / 2) + (TILE_SIZE / 2);
    }

    getState() {
        return { entities: [this.player], camera: this.camera };
    }

    createPlayerEntity() {
        // --- UPDATED: READ FROM NEW GAME STATE ---
        let startX, startY;

        // 1. Try to load from Game State (Saved Position)
        // We check if either col or row is non-zero (or specifically set)
        const savedCol = gameState.player.col;
        const savedRow = gameState.player.row;

        // If WorldManager already ran, these should be set to a valid spawn
        if (savedCol !== 0 || savedRow !== 0) {
            startX = savedCol * this.config.TILE_SIZE;
            startY = savedRow * this.config.TILE_SIZE;
        } 
        // 2. Fallback: Ask WorldManager directly (Just in case State is empty)
        else {
            const spawn = this.worldManager.findSpawnPoint();
            startX = spawn.col * this.config.TILE_SIZE;
            startY = spawn.row * this.config.TILE_SIZE;
            
            // Sync initial spawn to state immediately
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
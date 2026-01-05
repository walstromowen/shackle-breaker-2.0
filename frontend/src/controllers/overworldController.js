export class OverworldController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager; 

        // 1. Ask the WorldManager for a safe spot
        // (Note: This might now return a Wall Roof coordinate, which is valid!)
        const spawn = this.worldManager.findSpawnPoint();

        this.player = {
            id: "player",
            // 2. Convert grid coordinates to pixel coordinates
            x: spawn.col * config.TILE_SIZE,
            y: spawn.row * config.TILE_SIZE,
            isMoving: false,
            moveProgress: 0,
            direction: "DOWN",
            
            // Initialize source/dest to the spawn point
            sourceX: spawn.col * config.TILE_SIZE, 
            sourceY: spawn.row * config.TILE_SIZE,
            destX: spawn.col * config.TILE_SIZE, 
            destY: spawn.row * config.TILE_SIZE,
            
            animFrame: 0, animTimer: 0,
            spriteKey: 'spritesheet'
        };
        
        this.camera = { x: 0, y: 0 };
        
        // Immediately center camera on the new spawn
        this.updateCamera();
    }

    update(dt) {
        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }
        this.updateCamera();
    }

    updateCamera() {
        const { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_SCALE, TILE_SIZE } = this.config;
        const viewW = CANVAS_WIDTH / GAME_SCALE;
        const viewH = CANVAS_HEIGHT / GAME_SCALE;
        this.camera.x = this.player.x - (viewW / 2) + (TILE_SIZE / 2);
        this.camera.y = this.player.y - (viewH / 2) + (TILE_SIZE / 2);
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
            this.player.sourceX = this.player.x;
            this.player.sourceY = this.player.y;
            this.player.destX = nextX;
            this.player.destY = nextY;
            this.player.moveProgress = 0;
            this.player.isMoving = true;
        }
    }

    continueMoving(dt) {
        this.player.moveProgress += dt / this.config.WALK_DURATION;
        this.player.animTimer += dt;
        
        if (this.player.animTimer > 0.1) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }

        // --- MOVEMENT FINISHED ---
        if (this.player.moveProgress >= 1) {
            // 1. Snap to grid
            this.player.x = Math.round(this.player.destX);
            this.player.y = Math.round(this.player.destY);
            
            // 2. Reset State
            this.player.isMoving = false;
            this.player.moveProgress = 0;
            
            // 3. CHECK EVENTS
            this.checkTileEvents(); 

            // 4. Input Buffer / Chain Movement
            if (this.input.direction) {
                this.checkForNewMove();
            } else {
                this.player.animFrame = 0; 
            }
        } 
        // --- STILL MOVING ---
        else {
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    /**
     * UPDATED: Now checks Elevation transition instead of just "Is Solid?"
     */
    isSpaceFree(targetPixelX, targetPixelY) {
        const { TILE_SIZE } = this.config;

        // 1. Where are we NOW? (Source)
        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);

        // 2. Where do we want to GO? (Destination)
        const endCol = Math.floor(targetPixelX / TILE_SIZE);
        const endRow = Math.floor(targetPixelY / TILE_SIZE);

        // 3. Ask WorldManager if this specific move is allowed
        // This handles:
        // - Water (Always blocked)
        // - Elevation Mismatch (Blocked)
        // - Same Elevation (Allowed, even on roofs)
        return this.worldManager.canMove(startCol, startRow, endCol, endRow);
    }

    checkTileEvents() {
        const { TILE_SIZE, TILE_TYPES } = this.config;
        const col = Math.floor(this.player.x / TILE_SIZE);
        const row = Math.floor(this.player.y / TILE_SIZE);
        const tileId = this.worldManager.getTileAt(col, row);

        if (tileId === TILE_TYPES.GRASS && Math.random() < 0.10) { 
            console.log("💥 AMBUSH in the grass!");
        }
    }

    getState() {
        return {
            entities: [this.player],
            camera: this.camera
        };
    }
}
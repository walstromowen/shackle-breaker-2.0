export class OverworldController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager; 

        this.player = {
            id: "player",
            x: config.TILE_SIZE * 5,
            y: config.TILE_SIZE * 5,
            isMoving: false,
            moveProgress: 0,
            direction: "DOWN",
            sourceX: 0, sourceY: 0,
            destX: 0, destY: 0,
            animFrame: 0, animTimer: 0,
            spriteKey: 'spritesheet'
        };
        
        this.camera = { x: 0, y: 0 };
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

        if (this.player.moveProgress >= 1) {
            this.player.x = Math.round(this.player.destX);
            this.player.y = Math.round(this.player.destY);
            this.player.isMoving = false;
            this.player.moveProgress = 0;
            this.checkTileEvents();

            if (this.input.direction) {
                this.checkForNewMove();
            } else {
                this.player.animFrame = 0; 
            }
        } else {
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    isSpaceFree(pixelX, pixelY) {
        const { TILE_SIZE, TILE_TYPES } = this.config;
        const col = Math.floor(pixelX / TILE_SIZE);
        const row = Math.floor(pixelY / TILE_SIZE);
        const tileId = this.worldManager.getTileAt(col, row);
        return (tileId !== TILE_TYPES.WALL && tileId !== TILE_TYPES.WATER);
    }

    checkTileEvents() {
        const { TILE_SIZE, TILE_TYPES } = this.config;
        const col = Math.floor(this.player.x / TILE_SIZE);
        const row = Math.floor(this.player.y / TILE_SIZE);
        const tileId = this.worldManager.getTileAt(col, row);

        if (tileId === TILE_TYPES.HIGH_GRASS && Math.random() < 0.10) { 
            console.log("💥 AMBUSH in the high grass!");
        }
    }

    getState() {
        return {
            entities: [this.player],
            camera: this.camera
        };
    }
}
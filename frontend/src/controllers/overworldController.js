import { MAP } from '../../../shared/data/map.js';

export class OverworldController {
    constructor(input, config) {
        this.input = input;
        this.config = config;
        this.map = MAP;

        this.player = {
            id: "player",
            x: config.TILE_SIZE * 5,
            y: config.TILE_SIZE * 5,
            isMoving: false,
            moveProgress: 0,
            direction: "DOWN",
            sourceX: 0,
            sourceY: 0,
            destX: 0,
            destY: 0,
            // Animation State
            animFrame: 0,
            animTimer: 0,
            spriteKey: 'spritesheet'
        };
        
        this.camera = { x: 0, y: 0 };
    }

    update(dt) {
        // 1. Process Movement Logic
        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }

        // 2. Update Camera (Must happen after player moves to prevent "lag")
        this.updateCamera();
    }

    updateCamera() {
        const { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_SCALE, TILE_SIZE } = this.config;
        
        // Window size in world units
        const viewW = CANVAS_WIDTH / GAME_SCALE;
        const viewH = CANVAS_HEIGHT / GAME_SCALE;

        // Perfect center target (Decimal)
        let targetX = this.player.x - (viewW / 2) + (TILE_SIZE / 2);
        let targetY = this.player.y - (viewH / 2) + (TILE_SIZE / 2);

        // Clamp to Map Bounds
        const mapW = this.map.tiles[0].length * TILE_SIZE;
        const mapH = this.map.tiles.length * TILE_SIZE;

        this.camera.x = Math.max(0, Math.min(targetX, mapW - viewW));
        this.camera.y = Math.max(0, Math.min(targetY, mapH - viewH));
    }

    checkForNewMove() {
        const dir = this.input.direction;
        if (!dir) return;

        const { TILE_SIZE } = this.config;
        let nextX = this.player.x;
        let nextY = this.player.y;

        // Face the direction immediately even if blocked
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
        // Advance progress (Speed controlled by WALK_DURATION)
        this.player.moveProgress += dt / this.config.WALK_DURATION;

        // Animation Cycle (0.1s per frame)
        this.player.animTimer += dt;
        if (this.player.animTimer > 0.1) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }

        if (this.player.moveProgress >= 1) {
            // Snap to destination and clear decimals
            this.player.x = Math.round(this.player.destX);
            this.player.y = Math.round(this.player.destY);
            this.player.isMoving = false;
            this.player.moveProgress = 0;

            // --- IMMEDIATE HANDOFF ---
            // Fixes the jitter when holding down a key
            const dir = this.input.direction;
            if (dir) {
                this.checkForNewMove();
            } else {
                this.player.animFrame = 0; // Return to idle
            }
        } else {
            // Smooth Interpolation
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    isSpaceFree(pixelX, pixelY) {
        const { TILE_SIZE } = this.config;
        const col = Math.floor(pixelX / TILE_SIZE);
        const row = Math.floor(pixelY / TILE_SIZE);

        // Bounds Check
        if (row < 0 || row >= this.map.tiles.length || col < 0 || col >= this.map.tiles[0].length) {
            return false;
        }

        // Collision Check (Assuming WALL/WATER are blocking)
        const tileId = this.map.tiles[row][col];
        return (tileId !== this.config.TILE_TYPES.WALL && tileId !== this.config.TILE_TYPES.WATER);
    }

    getState() {
        return {
            // We return the player inside an array so the EntityRenderer 
            // can handle them alongside NPCs later
            entities: [this.player],
            map: this.map.tiles,
            camera: this.camera
        };
    }
}
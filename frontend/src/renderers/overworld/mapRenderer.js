export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config;
        this.ctx.imageSmoothingEnabled = false;

        // The flag that SceneManager toggles
        this.showDebug = false; 

        this.blobMap = new Map();
        
        this.BITS = { 
            TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
            BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
        };

        // Standard Blob 47 mapping
        const TILE_LOOKUP = {
            0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 
            65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38, 7: 21, 28: 5, 112: 7, 193: 23, 
            31: 13, 124: 6, 241: 15, 199: 22, 255: 14, 23: 25, 29: 33, 71: 18, 87: 27, 
            92: 10, 93: 19, 95: 39, 113: 34, 116: 9, 117: 20, 119: 36, 121: 46, 125: 46, 
            127: 47, 197: 17, 209: 26, 213: 28, 215: 30, 221: 35, 223: 31, 245: 37, 
            247: 29, 251: 15, 253: 45, 254: 31
        };

        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128;
            this.blobMap.set(i, TILE_LOOKUP[cleanMask] ?? 14);
        }
    }

    /**
     * Determines which face to draw based on neighbors.
     */
    getFaceIndex(mask, isFoot) {
        const hasLeft = !!(mask & this.BITS.LEFT);
        const hasRight = !!(mask & this.BITS.RIGHT);
        
        // Keeping your logic: Feet at 56, Body at 48
        const rowStart = isFoot ? 56 : 48; 

        if (hasLeft && hasRight) return rowStart + 1; // Middle
        if (!hasLeft && hasRight) return rowStart + 0; // Left Cap
        if (hasLeft && !hasRight) return rowStart + 2; // Right Cap
        return rowStart + 3; // Pillar
    }

    drawTile(typeId, index, dx, dy) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        const tileset = this.loader.get('tileset');
        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + (BLOB_OFFSETS[typeId] ?? 0)) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(tileset, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);

        if (this.showDebug) {
            this.ctx.save();
            this.ctx.font = 'bold 10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(index, dx + drawSize / 2, dy + drawSize / 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(index, dx + drawSize / 2, dy + drawSize / 2);
            this.ctx.restore();
        }
    }

    renderMap(worldManager, camera) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, WALL_HEIGHT } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const safeHeight = WALL_HEIGHT || 1;

        // --- VIEW BUFFER ---
        // Draws extra tiles off-screen to prevent "pop-in"
        const VIEW_BUFFER = 2; 

        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight;
        
        // Calculate width/height based on canvas + buffer on BOTH sides
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        // Clear the canvas before drawing
        this.ctx.fillStyle = '#000000'; // Default background color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- PASS 1: Ground Layers ---
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const targetTileId = worldManager.getTileAt(col, row);
                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // --- LAYER 1: WATER FOUNDATION ---
                // Prevents black holes. Always drawn underneath everything.
                this.drawTile(TILE_TYPES.WATER, 14, dx, dy);

                // --- LAYER 2: SAND BASE ---
                // "Smart Sand": We pretend we are Sand to get the correct connecting shape.
                // This prevents the sand from curving away from the grass (which would reveal water).
                if (targetTileId === TILE_TYPES.GRASS) {
                    const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.SAND);
                    const sandIndex = this.blobMap.get(sandMask) ?? 14;
                    this.drawTile(TILE_TYPES.SAND, sandIndex, dx, dy);
                } 
                else if (targetTileId === TILE_TYPES.WALL) {
                    // Walls sit on solid Sand & Grass
                    this.drawTile(TILE_TYPES.SAND, 14, dx, dy);
                    this.drawTile(TILE_TYPES.GRASS, 14, dx, dy);
                }

                // --- LAYER 3: THE TILE ITSELF ---
                if (targetTileId !== TILE_TYPES.WATER) {
                    const mask = worldManager.getSpecificMask(col, row, targetTileId);
                    const index = this.blobMap.get(mask) ?? 14;
                    this.drawTile(targetTileId, index, dx, dy);
                }
            }
        }

        // --- PASS 2: Walls (Bodies) ---
        // Drawn afterwards so they overlap the tiles behind them correctly (z-indexing)
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const targetTileId = worldManager.getTileAt(col, row);
                if (targetTileId !== TILE_TYPES.WALL) continue;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);
                const mask = worldManager.getSpecificMask(col, row, targetTileId);

                for (let d = 1; d <= safeHeight; d++) {
                    const tileBelow = worldManager.getTileAt(col, row + d);
                    
                    // Stop if we hit another wall (don't draw over another roof)
                    if (tileBelow === TILE_TYPES.WALL) break;

                    const isFoot = (d === safeHeight);
                    const faceIdx = this.getFaceIndex(mask, isFoot);
                    
                    this.drawTile(targetTileId, faceIdx, dx, dy + (d * drawSize));
                    if (isFoot) break;
                }
            }
        }
    }
}
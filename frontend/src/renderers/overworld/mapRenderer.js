export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config;
        this.ctx.imageSmoothingEnabled = false;

        this.blobMap = new Map();
        
        this.BITS = { 
            TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
            BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
        };

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

    getFaceIndex(mask, isFoot) {
        const hasLeft = !!(mask & this.BITS.LEFT);
        const hasRight = !!(mask & this.BITS.RIGHT);
        
        // 56 is the "Foot" Row, 48 is the "Body" Row
        const rowStart = isFoot ? 56 : 48; 

        if (hasLeft && hasRight) return rowStart + 1; 
        if (!hasLeft && hasRight) return rowStart + 0; 
        if (hasLeft && !hasRight) return rowStart + 2; 
        return rowStart + 3; 
    }

    drawTile(typeId, index, dx, dy) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        const tileset = this.loader.get('tileset');
        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        const startRow = BLOB_OFFSETS[typeId] !== undefined ? BLOB_OFFSETS[typeId] : 0;
        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(tileset, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    renderMap(worldManager, camera) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH, WALL_HEIGHT } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const safeHeight = WALL_HEIGHT || 1; 
        const VIEW_BUFFER = 2; 

        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight;
        
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        this.ctx.fillStyle = '#000000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // --- PASS 1: Ground Layers & Roofs ---
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const targetId = tileData.id;
                const depth = TILE_DEPTH[targetId] || 0;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // 1. Water Base
                this.drawTile(TILE_TYPES.WATER, 14, dx, dy);

                // 2. Sand / Grass Stacking
                if (depth >= TILE_DEPTH[TILE_TYPES.GRASS]) {
                    if (targetId === TILE_TYPES.GRASS) {
                        const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.SAND);
                        const sandIndex = this.blobMap.get(sandMask) ?? 14;
                        this.drawTile(TILE_TYPES.SAND, sandIndex, dx, dy);
                    } else {
                        // Under walls/grass, sand is solid
                        this.drawTile(TILE_TYPES.SAND, 14, dx, dy);
                    }
                }

                // 3. Wall Stacking (Underlay)
                // Draw layers beneath high walls to avoid holes
                if (depth >= TILE_DEPTH[TILE_TYPES.WALL]) {
                    this.drawTile(TILE_TYPES.GRASS, 14, dx, dy);
                }
                if (depth >= TILE_DEPTH[TILE_TYPES.WALL_MID]) {
                    this.drawTile(TILE_TYPES.WALL, 14, dx, dy);
                }
                if (depth >= TILE_DEPTH[TILE_TYPES.WALL_HIGH]) {
                    this.drawTile(TILE_TYPES.WALL_MID, 14, dx, dy);
                }

                // 4. Actual Top Tile (Roof)
                if (targetId !== TILE_TYPES.WATER) {
                    const index = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(targetId, index, dx, dy);
                }
            }
        }

        // --- PASS 2: Vertical Wall Faces ---
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                if (!tileData.isWall) continue;

                const myDepth = TILE_DEPTH[tileData.id];
                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);
                
                for (let d = 1; d <= safeHeight; d++) {
                    const tileBelowId = worldManager.getTileAt(col, row + d);
                    const belowDepth = TILE_DEPTH[tileBelowId] || 0;

                    // 1. HIDDEN CHECK: If tile below is TALLER or SAME, we are hidden behind it.
                    if (belowDepth >= myDepth) break;

                    // 2. FLOOR CHECK: If tile below is ANY Wall type, treat it as solid ground.
                    const isHittingWallFloor = (belowDepth >= TILE_DEPTH[TILE_TYPES.WALL]);
                    
                    const isFoot = (d === safeHeight) || isHittingWallFloor;

                    const faceIdx = this.getFaceIndex(tileData.mask, isFoot);
                    this.drawTile(tileData.id, faceIdx, dx, dy + (d * drawSize));
                    
                    // If we hit a floor/wall, stop drawing this column.
                    if (isFoot) break;
                }
            }
        }
    }
}
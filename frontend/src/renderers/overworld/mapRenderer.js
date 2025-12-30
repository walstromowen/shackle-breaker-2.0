export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config;
        this.ctx.imageSmoothingEnabled = false;

        // 1. YOUR FULLY VERIFIED 47-TILE BASE SET
       const TILE_LOOKUP = {
    // --- 16 Cardinals ---
    0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 
    17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 
    65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38,

    // --- 9 Solids ---
    7: 21, 28: 5, 112: 7, 193: 23, 31: 13, 
    124: 6, 241: 15, 199: 22, 255: 14,

    // --- 22 Complex / Inner-Corner Junctions ---
    23: 25, 29: 33, 
    71: 18, 
    87: 27, 92: 10, 
    93: 19, 95: 39, 113: 34, 116: 9, 
    117: 20, 119: 36, 121: 46, 125: 46, 
    127: 47, 
    197: 17, 209: 26, 213: 28, 
    215: 30, // <--- FIXED: Now mapping to Index 30
    221: 35, 
    223: 31, 
    245: 37, 
    247: 29, 
    251: 15, 
    253: 45, 
    254: 31
};
        this.blobMap = new Map();
        
        // 2. THE MATHEMATICAL CLEANER
        // This ensures all 256 combinations map to your 47 base cases
        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            // Strip diagonals that don't have cardinal legs
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;   // Top-Right
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;   // Bottom-Right
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;  // Bottom-Left
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128; // Top-Left

            // Map to your specific index, default to solid center (14)
            const finalIndex = TILE_LOOKUP[cleanMask] ?? 14;
            this.blobMap.set(i, finalIndex);
        }
    }

    /**
     * Helper to draw a specific tile type and mask to the screen.
     */
    drawTile(tileId, mask, dx, dy) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        const tileset = this.loader.get('tileset');
        
        // Use the pre-calculated map. 
        // It already handles cleaning and diagonal slashes!
        const index = this.blobMap.get(mask) ?? 0; 

        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);
        const localCol = index % 8;
        const localRow = Math.floor(index / 8);
        const blockStartRow = BLOB_OFFSETS[tileId] ?? 0;

        const sx = (localCol * SLOT_SIZE) + TILE_PADDING;
        const sy = ((blockStartRow + localRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(
            tileset,
            sx, sy, TILE_SIZE, TILE_SIZE,
            dx, dy, TILE_SIZE * GAME_SCALE, TILE_SIZE * GAME_SCALE
        );
    }

    /**
     * The Layered Render Engine.
     */
    renderMap(worldManager, camera) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;

        if (!worldManager) return;

        const renderOrder = Object.values(TILE_TYPES).sort((a, b) => TILE_DEPTH[a] - TILE_DEPTH[b]);

        const startCol = Math.floor(camera.x / TILE_SIZE);
        const startRow = Math.floor(camera.y / TILE_SIZE);
        const tilesVisibleX = Math.ceil(this.canvas.width / drawSize);
        const tilesVisibleY = Math.ceil(this.canvas.height / drawSize);

        for (let row = startRow; row < startRow + tilesVisibleY + 1; row++) {
            for (let col = startCol; col < startCol + tilesVisibleX + 1; col++) {
                
                const dx = Math.round((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.round((row * TILE_SIZE - camera.y) * GAME_SCALE);

                const currentTileId = worldManager.getTileAt(col, row);
                const currentDepth = TILE_DEPTH[currentTileId] ?? 0;

                for (const typeId of renderOrder) {
                    const layerDepth = TILE_DEPTH[typeId];

                    if (currentDepth >= layerDepth) {
                        const mask = worldManager.getSpecificMask(col, row, typeId);
                        this.drawTile(typeId, mask, dx, dy);
                    }
                }

                if (this.showDebug) {
                    this.renderDebugInfo(worldManager, currentTileId, col, row, dx, dy, drawSize);
                }
            }
        }
    }

    renderDebugInfo(worldManager, tileId, col, row, dx, dy, drawSize) {
        // 1. Get the raw mask calculated from neighbors
        const mask = worldManager.getSpecificMask(col, row, tileId);
        
        // 2. Look up which 47-tile index that mask maps to
        const index = this.blobMap.get(mask) ?? "??";

        // Draw the background box (slightly taller to fit the 3rd line)
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(dx + 2, dy + 2, drawSize - 4, 32);

        this.ctx.font = "bold 8px monospace";
        this.ctx.textAlign = "center";
        
        // ID: The tile type (grass, water, etc)
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(`ID:${tileId}`, dx + drawSize/2, dy + 10);

        // M: The calculated bitmask (0-255)
        this.ctx.fillStyle = "#00ffff"; // Cyan
        this.ctx.fillText(`M:${mask}`, dx + drawSize/2, dy + 20);

        // IDX: The final spritesheet index (0-47)
        this.ctx.fillStyle = "#ffff00"; // Yellow for clarity
        this.ctx.fillText(`IDX:${index}`, dx + drawSize/2, dy + 30);
    }
}
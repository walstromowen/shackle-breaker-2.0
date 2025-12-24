export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config;
        
        this.showDebug = false;
        this.ctx.imageSmoothingEnabled = false;

        // Standard 47-tile blob lookup for autotiling
        this.blobMap = new Map([
            [0, 0], [255, 1], [1, 2], [4, 3], [16, 4], [64, 5], [17, 6], [68, 7],
            [5, 8], [20, 9], [80, 10], [65, 11], [21, 12], [84, 13], [81, 14], [69, 15],
            [85, 16], [27, 17], [253, 18], [247, 19], [223, 20], [127, 21], [251, 22], [239, 23],
            [125, 24], [215, 25], [95, 26], [123, 27], [222, 28], [191, 29], [7, 30], [28, 31],
            [112, 32], [193, 33], [119, 34], [213, 35], [31, 36], [124, 37], [241, 38], [199, 39],
            [23, 40], [92, 41], [113, 42], [197, 43], [71, 44], [29, 45], [254, 46], [47, 47]
        ]);
    }

    /**
     * Helper to draw a specific tile type and mask to the screen.
     * Uses BLOB_OFFSETS from config to find the correct biome row.
     */
    drawTile(tileId, mask, dx, dy) {
        const tileset = this.loader.get('tileset');
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);
        const drawSize = TILE_SIZE * GAME_SCALE;

        // 1. Get the local index (0-47) within the biome block
        const index = this.blobMap.get(mask) ?? 0;
        const localCol = index % 8;
        const localRow = Math.floor(index / 8);

        // 2. Dynamic Row Offset Lookup
        // This maps the ID (e.g., 2 for Grass) to the start row (e.g., 25)
        const blockStartRow = BLOB_OFFSETS[tileId] ?? 0;

        const sx = (localCol * SLOT_SIZE) + TILE_PADDING;
        const sy = ((blockStartRow + localRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(
            tileset,
            sx, sy, TILE_SIZE, TILE_SIZE,
            dx, dy, drawSize, drawSize
        );
    }

    /**
     * The Layered Render Engine.
     * Stacks tiles mathematically based on depth.
     */
    renderMap(worldManager, camera) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;

        if (!worldManager) return;

        // 1. Calculate render order: Lowest depth (Water) to Highest (Wall)
        const renderOrder = Object.values(TILE_TYPES).sort((a, b) => TILE_DEPTH[a] - TILE_DEPTH[b]);

        // 2. Visible grid calculation
        const startCol = Math.floor(camera.x / TILE_SIZE);
        const startRow = Math.floor(camera.y / TILE_SIZE);
        const tilesVisibleX = Math.ceil(this.canvas.width / drawSize);
        const tilesVisibleY = Math.ceil(this.canvas.height / drawSize);

        for (let row = startRow; row < startRow + tilesVisibleY + 1; row++) {
            for (let col = startCol; col < startCol + tilesVisibleX + 1; col++) {
                
                const dx = Math.round((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.round((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // Identify what the "top" tile is at this position
                const currentTileId = worldManager.getTileAt(col, row);
                const currentDepth = TILE_DEPTH[currentTileId] ?? 0;

                // 3. Stacking Pass
                // We draw every layer that is equal to or below the current depth
                for (const typeId of renderOrder) {
                    const layerDepth = TILE_DEPTH[typeId];

                    if (currentDepth >= layerDepth) {
                        // Calculate mask for this specific layer
                        const mask = worldManager.getSpecificMask(col, row, typeId);
                        this.drawTile(typeId, mask, dx, dy);
                    }
                }

                // 4. Corrected Debug Pass
                if (this.showDebug) {
                    this.renderDebugInfo(worldManager, currentTileId, col, row, dx, dy, drawSize);
                }
            }
        }
    }

    /**
     * Fixed Debug Info: Now correctly recalculates mask for dominant tile.
     */
    renderDebugInfo(worldManager, tileId, col, row, dx, dy, drawSize) {
        const mask = worldManager.getSpecificMask(col, row, tileId);

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        this.ctx.fillRect(dx + 2, dy + 2, drawSize - 4, 24);

        this.ctx.font = "bold 8px monospace";
        this.ctx.fillStyle = "#00ffff"; // Cyan for visibility
        this.ctx.textAlign = "center";
        
        this.ctx.fillText(`ID:${tileId}`, dx + drawSize/2, dy + 10);
        this.ctx.fillText(`M:${mask}`, dx + drawSize/2, dy + 20);
    }
}
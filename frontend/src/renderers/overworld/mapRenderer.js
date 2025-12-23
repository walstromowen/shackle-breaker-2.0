export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config;
        
        // Ensure pixel art stays crisp when scaling
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Renders the tile map based on the current camera position.
     * @param {Array} mapTiles - 2D array of tile IDs
     * @param {Object} camera - Current camera x and y
     */
    renderMap(mapTiles, camera) {
        const tileset = this.loader.get('tileset');
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;

        if (!tileset || !mapTiles) return;

        // --- 1. DYNAMIC CULLING ---
        // Calculate the range of tiles currently visible in the viewport
        const startCol = Math.floor(camera.x / TILE_SIZE);
        const startRow = Math.floor(camera.y / TILE_SIZE);
        
        // Calculate how many tiles fit on the screen
        const tilesVisibleX = Math.ceil(this.canvas.width / drawSize);
        const tilesVisibleY = Math.ceil(this.canvas.height / drawSize);

        // Add a +1 buffer to prevent tiles "popping" in at the edges
        const endRow = Math.min(startRow + tilesVisibleY + 1, mapTiles.length);
        const endCol = Math.min(startCol + tilesVisibleX + 1, mapTiles[0].length);

        // --- 2. RENDER LOOP ---
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tileId = mapTiles[row][col];
                
                // Calculate source position in the tileset (accounting for padding)
                const sx = TILE_PADDING + (tileId * (TILE_SIZE + (TILE_PADDING * 2)));
                const sy = TILE_PADDING;

                // Calculate screen destination
                // We ROUND the final result to ensure the map moves in perfect 
                // sync with the entities, preventing the "sturry" jitter.
                const dx = Math.round((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.round((row * TILE_SIZE - camera.y) * GAME_SCALE);

                this.ctx.drawImage(
                    tileset,
                    sx, sy, TILE_SIZE, TILE_SIZE, // Source
                    dx, dy, drawSize, drawSize    // Destination
                );
            }
        }
    }
}
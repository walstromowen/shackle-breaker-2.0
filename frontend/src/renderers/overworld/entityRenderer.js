export class EntityRenderer {
    constructor(loader, config) {
        this.loader = loader;
        this.config = config;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Array} entities - Array of entity objects from the controller
     * @param {Object} camera - The current camera coordinates
     */
    render(ctx, entities, camera) {
        if (!entities || entities.length === 0) return;

        const { TILE_SIZE, GAME_SCALE } = this.config;

        // --- Y-SORTING ---
        // We sort entities by their Y position so that characters 
        // standing "further south" are drawn on top of those "further north."
        const sortedEntities = [...entities].sort((a, b) => a.y - b.y);

        sortedEntities.forEach(entity => {
            const sprite = this.loader.get(entity.spriteKey);
            if (!sprite) return;

            // 1. Calculate Screen Position
            // We use Math.round to keep entities in sync with the map tiles
            const dx = Math.round((entity.x - camera.x) * GAME_SCALE);
            const dy = Math.round((entity.y - camera.y) * GAME_SCALE);
            const drawSize = TILE_SIZE * GAME_SCALE;

            // 2. Calculate Source Coordinates (Spritesheet Slicing)
            // Map the entity's direction string to the correct row in your file
            const rowMap = { 
                "UP": 0, 
                "DOWN": 1, 
                "LEFT": 2, 
                "RIGHT": 3 
            };

            const sx = (entity.animFrame || 0) * TILE_SIZE;
            const sy = (rowMap[entity.direction] ?? 0) * TILE_SIZE;

            // 3. Draw to Canvas
            ctx.drawImage(
                sprite,
                sx, sy, TILE_SIZE, TILE_SIZE, // Source (The cut)
                dx, dy, drawSize, drawSize    // Destination (The paste)
            );
        });
    }
}
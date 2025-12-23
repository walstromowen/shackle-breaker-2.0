/**
 * Global Game Configuration
 */
export const CONFIG = {
    // --- Visuals & Display ---
    TILE_SIZE: 32,          
    TILE_PADDING: 2,        // <--- Added this for the tileset spacing
    GAME_SCALE: 1,          
    CANVAS_WIDTH: 800, 
    CANVAS_HEIGHT: 450,     

    // --- Movement & Physics ---
    WALK_DURATION: 0.4,     
    
    // --- Animation ---
    ANIMATION_FRAMES: 4,    
    FRAME_TIME: 0.15,       

    // --- Asset Keys ---
    TILE_TYPES: {
        GRASS: 0,
        WALL: 1,
        HIGH_GRASS: 2,
        WATER: 3
    }
};
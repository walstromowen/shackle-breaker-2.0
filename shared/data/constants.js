/**
 * Global Game Configuration
 */
export const CONFIG = {
    // --- Visuals & Display ---
    TILE_SIZE: 32,          
    TILE_PADDING: 1,        // Standardized padding (1px border = 2px total between tiles)
    GAME_SCALE: 1,          
    CANVAS_WIDTH: 800, 
    CANVAS_HEIGHT: 450, 
    WALL_HEIGHT: 2,    

    // --- Movement & Physics ---
    WALK_DURATION: 0.4,     
    
    // --- Animation ---
    ANIMATION_FRAMES: 4,    
    FRAME_TIME: 0.15,       
    
    SHEET_WIDTH: 512, 
    SHEET_HEIGHT: 512,

    // --- Asset Keys ---
    TILE_TYPES: {
    WATER: 0,
    SAND: 1,
    GRASS: 2,
    WALL: 3
    },

    TILE_DEPTH: {
        0: 0, // Water (Bottom)
        1: 1, // Sand
        2: 2, // Grass
        3: 3  // Wall (Top)
    },

    BLOB_OFFSETS: {
        0: 25,  // WATER: Starts at Row 0 (Only 1 row used)
        3: 1,  // WALL:  Starts at Row 1 (Rows 1-7)
        2: 9,  // GRASS: Starts at Row 8 (Rows 8-14)
        1: 17  // SAND:  Starts at Row 15 (Wait! We hit the 512px limit here)
    },

    BLOB_TILES: [1, 2, 3],
};

export const BITMASK = {
    TOP: 1,
    TOP_RIGHT: 2,
    RIGHT: 4,
    BOTTOM_RIGHT: 8,
    BOTTOM: 16,
    BOTTOM_LEFT: 32,
    LEFT: 64,
    TOP_LEFT: 128
};
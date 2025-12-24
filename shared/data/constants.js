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
    HIGH_GRASS: 3,
    WALL: 4
    },

    TILE_DEPTH: {
        0: 0, // Water (Bottom)
        1: 1, // Sand
        2: 2, // Grass
        3: 3, // High Grass
        4: 4  // Wall (Top)
    },

    BLOB_OFFSETS: {
        0: 7,  // WATER starts Row 7
        1: 13, // SAND starts Row 13
        2: 25, // GRASS starts Row 25
        3: 19, // HIGH_GRASS starts Row 19
        4: 1   // WALL starts Row 1
    },

    BLOB_TILES: [0, 1, 2, 3, 4],
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
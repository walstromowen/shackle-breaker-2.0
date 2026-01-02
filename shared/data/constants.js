/**
 * Global Game Configuration
 */
export const CONFIG = {
    // --- Visuals & Display ---
    TILE_SIZE: 32,          
    TILE_PADDING: 1,        
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
    SHEET_HEIGHT: 2048,

    // --- Asset Keys ---
    TILE_TYPES: {
        WALL_HIGH: 5,  // Level 3 Wall (Added)
        WALL_MID: 4,  // Level 2 Wall (Added)
        WALL_LOW: 3,      // Level 1 Wall
        GRASS: 2,
        DIRT: 1,
        WATER: 0,
    },

    // Defines the physical stacking order (Visual Height)
    TILE_DEPTH: {
        5: 5, // Wall High
        4: 4, // Wall Mid
        3: 3, // Wall Low
        2: 2, // Grass
        1: 1, // dirt
        0: 0, // Water
    },

    // Texture Y-Offsets (Row numbers in the sprite sheet)
    BLOB_OFFSETS: {
        5: 1,
        4: 9,
        3: 17,
        2: 25,
        1: 33,
        0: 41,
    },

    // Ensure our new walls are treated as blobs
    BLOB_TILES: [1, 2, 3, 4, 5],
};

export const BITMASK = {
    TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
    BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
};
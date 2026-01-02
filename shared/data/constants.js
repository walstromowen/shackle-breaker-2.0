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
    SHEET_HEIGHT: 512,

    // --- Asset Keys ---
    TILE_TYPES: {
        WATER: 0,
        SAND: 1,
        GRASS: 2,
        WALL: 3,      // Level 1 Wall
        WALL_MID: 4,  // Level 2 Wall (Added)
        WALL_HIGH: 5  // Level 3 Wall (Added)
    },

    // Defines the physical stacking order (Visual Height)
    TILE_DEPTH: {
        0: 0, // Water
        1: 1, // Sand
        2: 2, // Grass
        3: 3, // Wall
        4: 4, // Wall Mid
        5: 5  // Wall High
    },

    // Texture Y-Offsets (Row numbers in the sprite sheet)
    BLOB_OFFSETS: {
        0: 25,  // WATER
        3: 1,   // WALL (Low)
        4: 1,   // WALL (Mid)  -> Reusing Wall texture
        5: 1,   // WALL (High) -> Reusing Wall texture
        2: 9,   // GRASS
        1: 17   // SAND
    },

    // Ensure our new walls are treated as blobs
    BLOB_TILES: [1, 2, 3, 4, 5],
};

export const BITMASK = {
    TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
    BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
};
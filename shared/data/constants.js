/**
 * Global Game Configuration
 */
export const CONFIG = {
    // --- Visuals & Display ---
    TILE_SIZE: 32,
    OBJECT_SIZE: 32,         
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
        LAYER_5: 5,  // Highest Wall (Old WALL_HIGH)
        LAYER_4: 4,  // Mid Wall    (Old WALL_MID)
        LAYER_3: 3,  // Low Wall    (Old WALL_LOW)
        LAYER_2: 2,  // Grass
        LAYER_1: 1,  // Dirt
        LAYER_0: 0,  // Water
    },

    


    // Defines the physical stacking order (Visual Height)
    // Higher numbers = visually "deeper" or "behind" lower numbers in a stack
    TILE_DEPTH: {
        5: 5, // Wall High (Highest Rank)
        4: 4, // Wall Mid
        3: 3, // Wall Low
        2: 2, // Grass
        1: 1, // Dirt
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

    ASSETS: {
        // Standard 1x1 Object
        PINE_TREE_SMALL: { x: 0, y: 0, w: 1, h: 2 }, 

        // Big 2x2 Tree (Example)
        // This means it grabs a 64x64 area from the sheet (32 * 2)
        BIG_TREE:   { x: 1, y: 0, w: 2, h: 2 }  
    }
};
export const BITMASK = {
    TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
    BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
};
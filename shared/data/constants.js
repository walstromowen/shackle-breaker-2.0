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

    // --- Water Animation ---
    WATER_ANIMATION: {
        SPEED: 0.8,           // Seconds per frame
        FRAMES: [0, 1, 2, 3, 4, 5, 6, 7]  // The first 4 tiles on the Water Row (Row 41)
    },

    // --- Asset Keys ---
    TILE_TYPES: {
        LAYER_5: 5,  // Highest Wall
        LAYER_4: 4,  // Mid Wall
        LAYER_3: 3,  // Low Wall
        LAYER_2: 2,  // Grass
        LAYER_1: 1,  // Dirt
        LAYER_0: 0,  // Water
    },

    // Defines the physical stacking order (Visual Height)
    TILE_DEPTH: {
        5: 5, // Wall High 
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
        0: 41, // Water is on Row 41
    },

    // Ensure our new walls are treated as blobs
    BLOB_TILES: [1, 2, 3, 4, 5],

    ASSETS: {
        // Standard 1x1 Object
        PINE_TREE_SMALL: { x: 0, y: 0, w: 1, h: 2 }, 

        // Big 2x2 Tree 
        BIG_TREE:   { x: 1, y: 0, w: 2, h: 2 }  
    }
};

export const BITMASK = {
    TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
    BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
};

// ===============================================
// ✅ NEW: COMBAT & STATS CONSTANTS
// ===============================================

// 1. The Source of Truth for Logic (StatCalculator uses this)
export const DAMAGE_TYPES = [ 
    "blunt", "slash", "pierce", 
    "fire", "ice", "lightning", "water", "earth", "wind", 
    "light", "dark", "arcane" 
];

// 2. The Source of Truth for UI (Renderers use this)
export const DAMAGE_TYPE_LABELS = {
    blunt: "BNT",
    slash: "SLS",
    pierce: "PRC",
    fire: "FIR",
    ice: "ICE",
    lightning: "LIG",
    water: "WAT",
    earth: "ERT",
    wind: "WND",
    light: "LGT", 
    dark: "DRK",
    arcane: "ARC",
};
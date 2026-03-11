// ===============================================
// TILE REGISTRY
// ===============================================
const TILE_DEFINITIONS = {
    // ID remains the same everywhere. Depth remains the same everywhere.
    // The offset is the default row on the sprite sheet.
    LAYER_5: { id: 5, depth: 5, defaultOffset: 1,  isBlob: true },  // High Wall
    LAYER_4: { id: 4, depth: 4, defaultOffset: 9,  isBlob: true },  // Mid Wall
    LAYER_3: { id: 3, depth: 3, defaultOffset: 17, isBlob: true },  // Low Wall
    LAYER_2: { id: 2, depth: 2, defaultOffset: 25, isBlob: true },  // Ground 2 (Grass/Sand)
    LAYER_1: { id: 1, depth: 1, defaultOffset: 33, isBlob: true },  // Ground 1 (Dirt/Wet Sand)
    LAYER_0: { id: 0, depth: 0, defaultOffset: 41, isBlob: false }, // Water
};

// --- Auto-generate the configuration objects from the registry ---
const buildTileConfig = () => {
    const types = {};
    const depth = {};
    const defaultOffsets = {};
    const blobs = [];

    for (const [key, config] of Object.entries(TILE_DEFINITIONS)) {
        types[key] = config.id;
        depth[config.id] = config.depth;
        defaultOffsets[config.id] = config.defaultOffset;
        if (config.isBlob) blobs.push(config.id);
    }

    return { types, depth, defaultOffsets, blobs };
};

const processedTiles = buildTileConfig();


// ===============================================
// GLOBAL CONFIGURATION
// ===============================================
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

    // --- Asset Keys & Mechanics (Auto-populated from TILE_REGISTRY) ---
    TILE_TYPES: processedTiles.types,
    TILE_DEPTH: processedTiles.depth,
    // FIX: Updated to use processedTiles.defaultOffsets
    BLOB_OFFSETS: processedTiles.defaultOffsets, 
    BLOB_TILES: processedTiles.blobs,
};


// ===============================================
// MASKS & LOGIC CONSTANTS
// ===============================================
export const BITMASK = {
    TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
    BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
};


// ===============================================
// COMBAT & STATS CONSTANTS
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
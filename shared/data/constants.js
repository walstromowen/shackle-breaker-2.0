// shared/data/constants.js

// ===============================================
// TILE LEVELS
// ===============================================
// LAYER_0 water, LAYER_1 dirt, LAYER_2 ground, LAYER_3..LAYER_7 the cliff levels (see biomeDefinitions.js).
// A level's id and depth are the same number (the stair / slope code relies on LAYER_n = LAYER_0 + n). Everything except water is a blob tile.
// What each level looks like is set per biome (blobTileset in biomeDefinitions.js), not here.
const TOP_LEVEL = 7;
const TILE_TYPES = {}, TILE_DEPTH = {}, BLOB_TILES = [];
for (let i = 0; i <= TOP_LEVEL; i++) {
    TILE_TYPES['LAYER_' + i] = i;
    TILE_DEPTH[i] = i;
    if (i > 0) BLOB_TILES.push(i);
}

// ===============================================
// GLOBAL CONFIGURATION
// ===============================================
export const CONFIG = {
    TILE_SIZE: 32,
    OBJECT_SIZE: 32,
    GAME_SCALE: 1,
    WALL_HEIGHT: 2,
    WALK_DURATION: 0.4, // seconds per tile on foot
    RUN_DURATION: 0.22, // seconds per tile while shift is held
    TILE_TYPES, TILE_DEPTH, BLOB_TILES,

        // Character sprite sheet (see MapRenderer.drawEntity): one frame is w x h pixels, drawn with the frame's centre on the centre of the character's
    // 32 px tile (a 64 x 64 frame covers the tile and 16 px beyond it on every side). The sheet is 8 frames wide and 12 rows tall (idle, walk, run;
    // each South, East, North, West), so 512 x 768 px for 64 x 64 frames.
    // feetPad = how far the frame sits below the tile's bottom edge: (h - 32) / 2 = 16 is exactly centred; 0 would put the frame's bottom on the
    // tile's bottom edge (frame rising above the tile). shiftX = pixels to nudge a figure that is not centred in its frame (positive = right).
   CHARACTER_FRAME: { w: 64, h: 64, feetPad: 'auto', shiftX: 0 },

    // --- Not read by any file I have seen (the renderers, world manager, terrain generator, biome definitions). Probably the canvas setup and the
    //     animation code use them: delete each one that a project-wide search for its name finds only here. ---
    CANVAS_WIDTH: 1920,
    CANVAS_HEIGHT: 1080,
    SHEET_WIDTH: 512,
    SHEET_HEIGHT: 2048,

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
// One list: the keys are the damage types (StatCalculator), the values are the 3-letter UI labels (renderers).
export const DAMAGE_TYPE_LABELS = {
    blunt: "BNT", slash: "SLS", pierce: "PRC",
    fire: "FIR", ice: "ICE", lightning: "LIG",
    water: "WAT", earth: "ERT", wind: "WND",
    light: "LGT", dark: "DRK", arcane: "ARC",
};
export const DAMAGE_TYPES = Object.keys(DAMAGE_TYPE_LABELS);

// ===============================================
// DIFFICULTY
// ===============================================
export const DIFFICULTY_LEVELS = {
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard',
    NIGHTMARE: 'nightmare'
};

export const DIFFICULTY_MODIFIERS = {
    [DIFFICULTY_LEVELS.EASY]: { rollBonus: 2, enemyLevelOffset: -1 },
    [DIFFICULTY_LEVELS.NORMAL]: { rollBonus: 0, enemyLevelOffset: 0 },
    [DIFFICULTY_LEVELS.HARD]: { rollBonus: -2, enemyLevelOffset: 1 },
    [DIFFICULTY_LEVELS.NIGHTMARE]: { rollBonus: -3, enemyLevelOffset: 3 }
};
export const SPRITES = {
    // FORMAT GUIDANCE:
    // x, y: Top-left coordinate on the grid (0,0 is top-left tile)
    // w, h: Size in grid units (1 = 32px). 
    //       - w=1, h=1 is a standard 32x32 tile.
    //       - w=2, h=3 is a 64x96 object.
    
    // --- GROUND DECORATION ---
    "GRASS_COVERAGE_1": { x: 6, y: 0, w: 1, h: 1 },
    "GRASS_COVERAGE_2": { x: 7, y: 0, w: 1, h: 1 },
    "GRASS_COVERAGE_3": { x: 8, y: 0, w: 1, h: 1 },
    
    "BOULDER_1":          { x: 0, y: 0, w: 1, h: 1 },
    "SMALL_ROCKS_1":      { x: 4, y: 0, w: 1, h: 1 },
    "SMALL_ROCKS_2":      { x: 5, y: 0, w: 1, h: 1 },
    
    // --- FLOWERS (Added sway: true) ---
    "TULIPS_ORANGE":    { x: 1, y: 0, w: 1, h: 1},
    "TULIPS_WHITE":     { x: 2, y: 0, w: 1, h: 1},
    "TULIPS_RED":       { x: 3, y: 0, w: 1, h: 1},

    // --- INTERACTABLES ---
    "WOODEN_CHEST":     { x: 0, y: 5, w: 1, h: 1 },

    // --- TREES (Added sway: true) ---
    // Note: These are taller than 1 tile (h > 1).
    // The renderer automatically shifts them UP so their feet sit on the tile.
    "PINE_TREE_SMALL":  { x: 3, y: 1, w: 2, h: 2},
    "OAK_TREE_1":       { x: 0, y: 1, w: 3, h: 3},

    // --- BUILDINGS ---
    // Drawn from the bottom-left anchor point.
    "SMALL_HOUSE_1": { 
        x: 0, y: 7, 
        w: 4, h: 3,
        // OPTIONAL: If the house sprite feels slightly off-center in the tile,
        // you can nudge it here. (Negative moves Left, Positive moves Right)
        // offsetX: 0 
    },

    // --- ANIMATED OBJECTS ---
    // The renderer will look at x=12, x=13, x=14, x=15 automatically
    "CAMPFIRE": { 
        x: 0, y: 6, 
        w: 1, h: 1, 
        frames: 4,   // How many frames in the strip?
        speed: 0.2,   // How fast (seconds per frame)?
        lightRadius: 100
    }, 
};
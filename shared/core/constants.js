// shared/core/constants.js

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
    START_TIME_MINUTES: 10 * 60, // a new game begins at 10:00 in the morning
    WALK_DURATION: 0.4, // seconds per tile on foot
    RUN_DURATION: 0.22, // seconds per tile while shift is held
    TILE_TYPES, TILE_DEPTH, BLOB_TILES,

    // Character sprite sheet (see MapRenderer.drawEntity): one frame is w x h pixels, centred on the character's 32 px tile sideways, with the
    // lowest drawn pixel of the sprite on the bottom edge of the tile, the same line the bottom of a map object sits on (a 64 x 64 frame with the
    // feet on its last row rises 32 px above the tile and goes 0 px below it). The sheet is 8 frames wide and 12 rows tall (idle, walk, run; each
    // South, East, North, West), so 512 x 768 px for 64 x 64 frames.
    // feetPad = 'auto': the empty rows under the feet are read from the sheet's pixels, so any amount of empty space below the feet is fine.
    //           A number overrides that (empty rows between the feet and the bottom of the frame; 0 = feet on the last row).
    // shiftX = pixels to nudge a figure that is not centred in its frame (positive = right).
    // Every character sheet has the same shadow, ending on row 56 of its 64-row frame, so feetPad is 7 for all of them: the same standing line, the same shadow, whoever it is
    // (backend/test/charactersheets.test.js). 'auto' still works for a sheet that is different, but one stray pixel under the shadow then lifts that character off the ground.
    CHARACTER_FRAME: { w: 64, h: 64, feetPad: 7, shiftX: 0 },

    // Lighting (see LightingRenderer): every light floods over the tile grid and loses a fixed amount of strength per tile.
    // LIGHT_DIAGONAL_COST = distance of a diagonal step: 1 = square pools of light, 1.41 = round (smooth, the default), 2 = diamond-shaped. 1.25 gives the
    //                       old octagon-shaped pools with visible creases along the diagonals.
    // LIGHT_WALL_ABSORB = extra tiles of distance a wall (a cliff higher than the light, or an object with blocksLight: true) costs the light that
    //                     enters it. Higher = walls block more; 0 = walls do not dim light at all. A map object can set its own number with blocksLight: <number>.
    // LIGHT_SMOOTHING = passes of a small blur over the finished light map: 0 = none, 1 = soft (default), 2 = very soft (also blurs the edges of walls).
    // LIGHT_EDGE_EASE = 0..1: 0 = the light fades in a straight line from the light to its radius, 1 = fully eased (a soft centre and a soft rim). Default 0.5.
    LIGHT_DIAGONAL_COST: 1.41,
    LIGHT_WALL_ABSORB: 3,
    LIGHT_SMOOTHING: 1,
    LIGHT_EDGE_EASE: 0.5,
    // LIGHT_COLOR_TINT = how much of a light's own colour shows (the `color` of a light definition, e.g. '255, 120, 50'): 1 = the pure colour (a campfire
    //                    paints everything orange), 0 = every light is white. In between, the colour is mixed with white.
    LIGHT_COLOR_TINT: 0.6,
    // DAY_GLOOM = the overworld is never fully bright: even at midday there is a slight natural darkness, the way a cave or the night has, with a much
    //             bigger pool of light around the player. At dusk and night the darkness takes over and the pool closes in to the player's own light.
    //   alpha    = how dark the gloom is at its darkest, away from the player (0 = none, 1 = pitch black). The night is 1.
    //   color    = the colour of the gloom ('r, g, b'); a cold near-black blue by default.
    //   radius   = tiles of the daylight pool around the player (the player's own torch light is 4); 0 turns the pool off.
    //   strength = how clear the pool is at its centre, 0..1.
    // Leave DAY_GLOOM out (or set alpha: 0) for the old bright days. Weather that darkens the day (rain, a blizzard) shrinks the pool by itself.
    DAY_GLOOM: { alpha: 0.45, color: '8, 10, 24', radius: 9, strength: 1 },

    // Minimap in the bottom-left corner of the overworld (see MinimapRenderer). Every entry is optional; the values below are the defaults.
    // radius = tiles shown to each side of the player, zoom = screen pixels per tile (keep it a whole number), so the map is 2 x radius x zoom pixels square.
    // markers = interaction type -> dot colour (doors are WARP). Buildings (solid objects of 6+ tiles with no interaction) show as brown blocks.
    // The land colours are in biomeDefinitions.js (the `minimap` block of each biome: grass, dirt, water, rock, stair); `colors` here is the fallback for a biome without one.
    // outline = width in pixels of the line, in the colour of the cliff face, along the north, east and west edge of every cliff level (0 = no line; keep it smaller than zoom).
    // shape = 'circle' (default) or 'square'. frame = colour of the ring round a circular map. The map is 2 x radius + 1 tiles across and moves a whole tile at a time.
    // budgetMs = time per frame spent painting new land.
    MINIMAP: {
        enabled: true,
        radius: 32,
        zoom: 3,
        outline: 1,
        shape: 'circle',
        margin: 24,
        showView: true,
        budgetMs: 2,
        markers: { WARP: '#ffd24a', CRAFTING_STATION: '#e8873a' },
    },

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
export const PHYSICAL_DAMAGE_TYPES = ['blunt', 'slash', 'pierce'];
export const MAGIC_DAMAGE_TYPES = DAMAGE_TYPES.filter(t => !PHYSICAL_DAMAGE_TYPES.includes(t));   // the elements, light, dark and arcane

// BALANCE KNOB: which attributes raise the attack AND the defense of each damage type, and by how much per point.
//   Strength       blunt, slash
//   Dexterity      slash, pierce
//   Attunement     fire, ice, lightning, water, earth, wind (the six elements)
//   Intelligence   light, dark, arcane (the three arcane types)
// Slash is listed under both Strength and Dexterity but is in BEST_OF_SCALING: it takes the HIGHER of the two, never the sum.
// A weight of 1 is one attack per point; defense gets weight x DEFENSE_PER_SCALING_POINT per point (StatCalculator).
// Vigor raises no attack (it feeds max HP and a little defense against everything). backend/test/scaling.test.js keeps this table honest.
export const DAMAGE_SCALING = {
    blunt:     { strength: 1 },
    slash:     { strength: 1, dexterity: 1 },
    pierce:    { dexterity: 1 },
    fire:      { attunement: 1 },
    ice:       { attunement: 1 },
    lightning: { attunement: 1 },
    water:     { attunement: 1 },
    earth:     { attunement: 1 },
    wind:      { attunement: 1 },
    light:     { intelligence: 1 },
    dark:      { intelligence: 1 },
    arcane:    { intelligence: 1 },
};

// Damage types that scale with the best ONE of their attributes (the highest attribute x weight) instead of adding them all up.
export const BEST_OF_SCALING = ['slash'];

// BALANCE KNOB: defense per point of a damage type's scaling attribute (times its weight). 0.5 = +1 defense per 2 points, the same rate Vigor gives.
export const DEFENSE_PER_SCALING_POINT = 0.5;

/**
 * How much a set of attributes adds to one damage type, per DAMAGE_SCALING (before the defense multiplier).
 * @returns {{ value: number, attr: string|null }} the amount, and the attribute that supplies the most of it
 */
export function scalingFor(type, attributes = {}) {
    const weights = DAMAGE_SCALING[type] || {};
    const bestOf = BEST_OF_SCALING.includes(type);
    let value = 0, attr = null, top = -Infinity;
    for (const [a, w] of Object.entries(weights)) {
        const part = (attributes[a] || 0) * w;
        if (part > top) { top = part; attr = a; }
        if (!bestOf) value += part;
    }
    if (bestOf) value = attr ? Math.max(0, top) : 0;
    return { value, attr };
}

// ===============================================
// CORRUPTION
// ===============================================
// Each character carries a corruption from 0 to 100 (shown as a percent). Magic raises it, and so do cruel choices; kind ones lower it (CorruptionSystem).
// BALANCE KNOBS, all in one place:
//   PER_MAGIC_USE   corruption gained each time a party member uses a magical ability (a tag of 'magical'; an ability can set its own with `corruption: n`)
//   TIERS           what a corruption of at least `at` does while it lasts. They stop the moment it drops below again (StatCalculator reads them every time).
//                   maxHpMultiplier scales max health, magicDamageBonus adds to every magical damage type (0.25 = +25%).
//   SHACKLE_AT      at this much the character is shackled: down like a fainted one, and it cannot be undone without the item named by UNSHACKLE_ITEM
//   UNSHACKLE_TO    the corruption a freed character is left with (below the first tier, so they come back whole)
//   REVEAL_ACT      the act in which the stat is revealed (the story tells the player what it is, at the end of act 1). Until then every screen hides it, and it
//                   cannot climb to the first tier (a quiet build-up the player has not been told about), so nothing it does is felt before the reveal.
//   BETRAYAL_WEIGHT how likely the Shackling encounter is whenever an encounter happens (BiomeModel.getEncounter) while a member is shackled: its weight in the pool,
//                   next to the biome's own (a plains encounter is 10 to 20, a lone cave or mountain one is 100, so 80 is about half of everything met). Without a shackled member it is not in the pool at all.
export const CORRUPTION = {
    MAX: 100,
    PER_MAGIC_USE: 1,
    TIERS: [
        { at: 50, id: 'corrupted', name: 'Corrupted', maxHpMultiplier: 0.5, magicDamageBonus: 0.25,
          message: "{name}'s body withers as the darkness spreads, and the magic answers with a hungry surge." },
    ],
    SHACKLE_AT: 100,
    UNSHACKLE_ITEM: 'meteorite',
    UNSHACKLE_TO: 40,
    REVEAL_ACT: 2,
    BETRAYAL_WEIGHT: 80,
};

// ===============================================
// DIFFICULTY
// ===============================================
export const DIFFICULTY_LEVELS = {
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard',
    NIGHTMARE: 'nightmare'
};

// DEV_CONSOLE: the developer console, a command line that opens with "/" in the overworld (frontend/src/ui/devConsole.js; the commands are in
// core/devCommands.js). It can hand out items, XP, party members and story milestones. A game can only use it if its player turned Cheats on when creating it
// (the character creator's Cheats row, saved with the game); ENABLED is the master switch: set it to false and there is no console and no Cheats row.
export const DEV_CONSOLE = {
    ENABLED: true,
};

export const DIFFICULTY_MODIFIERS = {
    [DIFFICULTY_LEVELS.EASY]: { rollBonus: 2, enemyLevelOffset: -1 },
    [DIFFICULTY_LEVELS.NORMAL]: { rollBonus: 0, enemyLevelOffset: 0 },
    [DIFFICULTY_LEVELS.HARD]: { rollBonus: -2, enemyLevelOffset: 1 },
    [DIFFICULTY_LEVELS.NIGHTMARE]: { rollBonus: -3, enemyLevelOffset: 3 }
};

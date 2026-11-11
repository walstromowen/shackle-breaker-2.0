export const gameState = {
    seed: null,
    mode: "overworld",
    difficulty: "normal",
    cheats: false,        // chosen when the game is created: may the developer console be used in this game (see engine/sceneManager.js)
    
    // Milestones the player has reached ('act2', ...). The current act comes from them: see story/actSystem.js and story/actDefinitions.js
    milestones: [],

    // <-- NEW: Quest Tracker
    quests: {
        active: {},       // Keyed by questId, stores current progress
        completed: [],    // Array of completed questIds
        trackedIds: []    // Array of questIds currently tracked on the HUD
    },
    
    player: {
        col: 0,
        row: 0,
        direction: 'down'
    },
    
    world: {
        currentBiomeId: null,
        isInterior: false,
        interiorType: null,
        time: 0,
        day: 1,
        changes: {},
        terrainOverrides: {},
        villageStairs: [],   // stairs cut by villages (terrainGenerator.addVillageStair)
        levelPaths: {},      // cells of village streets on a cliff level, drawn as dirt (visual only; see blobTerrainRenderer)
        discoveredChunks: [],
        waypoints: [],       // the banners the party has planted: { id, col, row, biome } (shared/world/waypoints.js)
        structureChunks: {}, // chunks ('cx,cy') whose village / graveyard has been generated, so a reload never builds them again (structureSpawner.js)
        currentWeather: null,
        biomeWeather: {},      // the weather each biome was left with (TimeSystem.syncBiomeWeather)
        weatherBiome: null     // the biome the current weather belongs to
    },
    
    party: {
        inventory: [],
        currency: 0,
        unlockedCraftingRecipes: [],
        members: []
    },
    
    encounter: {
        activeData: null,
        currentStageId: null,
        history: [],
        context: {
            col: null,
            row: null,
            objectId: null
        }
    },
    
    battle: {
        isActive: false,
        enemies: [],
        turnQueue: [],
        roundNumber: 1
    },
    
    ui: {
        selectedDecisionIndex: 0,
        isMenuOpen: false
    }
};

/**
 * Clears everything a world has written into gameState.world, for a New Game. The world is stored as changes on top of the seed (objects,
 * roads, stairs, level paths, keyed by cell), so anything left over from the last game in this session would be laid over the new world's terrain:
 * graves in its rivers, roads up its cliffs, plains trees in its deserts.
 */
export function resetWorldForNewGame() {
    const w = gameState.world;
    w.isInterior = false;
    w.interiorType = null;
    w.interiorId = null;
    w.interiorMapId = null;
    w.savedOverworld = null;
    w.interiorStack = [];   // interiors entered from inside another (the catacombs under a cave): what to climb back into (SceneManager)
    w.currentBiomeId = null;
    w.currentBiome = null;
    w.day = 1;
    w.changes = {};
    w.terrainOverrides = {};
    w.villageStairs = [];
    w.levelPaths = {};
    w.discoveredChunks = [];
    w.waypoints = [];
    w.strangerHome = null;   // a new world: the Hooded Stranger has not chosen his workshop yet
    w.strangerDesertHome = null;   // nor where he goes in act 2
    w.nikoliCampfire = null;       // and Nikoli has not made camp
    w.structureChunks = {};
    w.currentWeather = null;
    w.biomeWeather = {};
    w.weatherBiome = null;
    gameState.quests = { active: {}, completed: [], trackedIds: [] };
    gameState.multiplayer = { guests: {} };   // a new world has had no visitors
    // the spot the last game ended on means nothing in the new world (0, 0 = "find a spawn point", see OverworldController.createPlayerEntity)
    gameState.player.col = 0;
    gameState.player.row = 0;
    gameState.player.direction = 'down';
}

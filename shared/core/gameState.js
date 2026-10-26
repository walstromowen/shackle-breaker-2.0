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
        currentWeather: null
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

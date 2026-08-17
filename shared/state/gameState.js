export const gameState = {
    seed: null,
    mode: "overworld",
    difficulty: "normal",
    
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
        discoveredChunks: [],
        currentWeather: null
    },
    
    party: {
        inventory: [],
        currency: 0,
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
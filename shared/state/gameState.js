export const gameState = {
    seed: null, 
    mode: "overworld", 
    
    // Player Position in the World
    player: {
        col: 0, 
        row: 0,
        direction: 'down' 
    },

    world: {
        currentBiomeId: null, 
        time: 0, 
        day: 1,
        changes: {}, 
        discoveredChunks: [],
        
        // --- NEW: Weather State ---
        currentWeather: null 
    },

    party: {
        inventory: [], 
        currency: 0,
        members: []
    },

    // NON-COMBAT ENCOUNTERS
    encounter: {
        activeData: null,    
        currentStageId: null, 
        history: [],
        context: { col: null, row: null, objectId: null } 
    },

    // COMBAT STATE
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
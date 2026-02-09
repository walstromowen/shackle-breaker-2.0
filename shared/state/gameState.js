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
        mapId: "procedural_forest",
        time: 0, 
        day: 1,
        changes: {}, 
        discoveredChunks: [] 
    },

    party: {
        // Shared Inventory (Backpack)
        inventory: [], 
        gold: 0,
        
        // The Characters
        members: []
    },

    encounter: {
        activeData: null,    
        currentStageId: null, 
        history: [],
        context: { col: null, row: null, objectId: null } 
    },

    ui: {
        selectedDecisionIndex: 0, 
        isMenuOpen: false
    }
};
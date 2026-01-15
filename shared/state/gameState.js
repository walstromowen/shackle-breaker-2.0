export const gameState = {
    // 0. WORLD GENERATION
    // Set by WorldManager on first load
    seed: null, 

    // 1. ENGINE STATE
    // Options: "OVERWORLD" | "ENCOUNTER" | "BATTLE" | "MENU"
    mode: "OVERWORLD", 

    // 2. PLAYER POSITION
    player: {
        col: 0, 
        row: 0,
        direction: 'down' 
    },

    // 3. WORLD STATE
    world: {
        mapId: "procedural_forest",
        time: 0, 
        day: 1,
        
        // --- THE DIFF LAYER ---
        // Stores permanent changes to the map.
        // Key: "col,row" (string)
        // Value: null (if deleted) OR "OBJECT_ID" (if added)
        changes: {}, 
        // ---------------------

        discoveredChunks: [] 
    },

    // 4. PARTY & PLAYER DATA
    party: {
        inventory: [], 
        gold: 0,
        members: [
            {
                id: "hero",
                name: "Wanderer",
                isLeader: true, 
                stats: {
                    hp: { current: 100, max: 100 },
                    stamina: { current: 50, max: 50 },
                    insight: { current: 10, max: 20 },
                    strength: { current: 5, max: 10 },
                    survival: { current: 4, max: 10 }
                }
            }
        ]
    },

    // 5. ENCOUNTER STATE
    encounter: {
        activeData: null,    
        currentStageId: null, 
        history: [],
        
        // --- ADDED: CONTEXT ---
        // Stores "Where" and "What" triggered the encounter.
        // The OverworldController fills this when you press interact.
        // The EncounterController uses this to update the Diff Layer (gameState.world.changes) on success.
        context: { 
            col: null, 
            row: null, 
            objectId: null 
        } 
    },

    // 6. UI STATE
    ui: {
        selectedDecisionIndex: 0, 
        isMenuOpen: false
    }
};
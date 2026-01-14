export const gameState = {
    // 0. WORLD GENERATION (New)
    // Set by WorldManager on first load
    seed: null, 

    // 1. ENGINE STATE
    // Options: "OVERWORLD" | "ENCOUNTER" | "BATTLE" | "MENU"
    mode: "OVERWORLD", 

    // 2. PLAYER POSITION (Updated)
    // We moved this out of 'world' to make it easier for WorldManager to access
    player: {
        col: 0, 
        row: 0,
        direction: 'down' // Optional: useful for save loading facing the right way
    },

    // 3. WORLD STATE
    world: {
        mapId: "procedural_forest",
        time: 0, // In-game minutes passed
        day: 1,
        discoveredChunks: [] // Future-proofing for fog of war
    },

    // 4. PARTY & PLAYER DATA
    party: {
        inventory: [], // Simple array for now
        gold: 0,
        
        // The list of characters in your group
        members: [
            {
                id: "hero",
                name: "Wanderer",
                isLeader: true, // This is the character you control
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
    // Only populated when mode === "ENCOUNTER"
    encounter: {
        activeData: null,     // The loaded JSON object (e.g., oakTree)
        currentStageId: null, // e.g., "start"
        history: []           // Tracks path for back-navigation
    },

    // 6. UI STATE
    ui: {
        selectedDecisionIndex: 0, // 0 = Top Button, 1 = Bottom Button
        isMenuOpen: false
    }
};
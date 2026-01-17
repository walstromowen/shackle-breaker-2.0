export const gameState = {
    seed: null, 
    mode: "OVERWORLD", 
    
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
        inventory: ["POTION_HP", "MAP_FRAGMENT"], 
        gold: 0,
        
        // The Characters
        members: [
            {
                // --- IDENTITY ---
                instanceId: "hero_placeholder",
                entityId: "PLAYER", // Refers to the Blueprint
                type: "PLAYER",
                name: "Wanderer",
                class: "Novice",    // Job/Class (if you use a Job system)
                origin: "Wanderer", // NEW: Added
                traits: [],         // NEW: Added
                isLeader: true, 
                
                // --- VISUALS (Matches EntityDefinitions) ---
                sprite: "hero_map_walk",      
                battleSprite: "hero_combat_idle", 
                portrait: "hero_face_large", 

                // --- PROGRESSION ---
                level: 1,
                xp: 0,
                skillPoints: 0,

                // --- ATTRIBUTES ---
                attributes: {
                    vigor: 10,       
                    attunement: 5,   
                    strength: 5,     
                    dexterity: 5,    
                    intelligence: 5  
                },

                // --- LIVE STATS (Flattened - No 'vitals' object) ---
                // We store CURRENT values. MAX values are calculated dynamically by the Class.
                currentHp: 100,
                currentStamina: 50,
                currentInsight: 50,
                corruption: 0,
                isDead: false,
                statusEffects: [],

                // --- EQUIPMENT ---
                // Matches the structure in EntityDefinitions
                equipment: {
                    head: null, 
                    body: "RAGS", 
                    arms: null, 
                    legs: null, 
                    feet: null,
                    mainHand: null, 
                    offHand: null, 
                    accessory: null
                }
            }
        ]
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
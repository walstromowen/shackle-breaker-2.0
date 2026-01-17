export const ENTITY_DEFINITIONS = {
    "PLAYER": {
        name: "Tarnished",
        type: "PLAYER",
        
        // --- VISUALS ---
        sprite: "hero_base",
        battleSprite: "hero_combat_idle", 
        portrait: "hero_face",           

        // --- IDENTITY ---
        origin: "Wanderer",
        traits: [],

        // --- STATS ---
        attributes: {
            vigor: 10,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            attunement: 10
        },
        
        baseStats: {
            speed: 5
        },

        // --- EQUIPMENT & INVENTORY ---
        equipment: {
            mainHand: null, 
            offHand: null,  
            head: null,
            body: "RAGS",   
            accessory: null
        },
        
        // Items used for testing and starting progression
        inventory: [
            "POTION_HP", 
            "MAP_FRAGMENT"
        ],

        tags: ["PLAYER"]
    },
};
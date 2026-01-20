export const ENTITY_DEFINITIONS = {
    "HUMANOID": {
        name: "Humanoid",
        // 'uuid' is not here; the Factory generates it.
        // 'type' is not here; the Controller assigns it (PLAYER/ENEMY).

        // --- VISUALS ---
        sprite: "hero_base",
        portrait: "hero_face",
        traits: [],
        statusEffects: [],
        // --- STATS ---
        attributes: {
            vigor: 10,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            attunement: 10
        },
        
        baseStats: {
            speed: 5,
            critical: 5,
            corruption: 0,
        },

        // --- EQUIPMENT & INVENTORY ---
        equipment: {
            mainHand: null, 
            offHand: null,  
            head: null,
            torso:  null, // Default starting gear
            arms: null,
            legs: null,
            feet: null,  
            accessory: null
        },

        abilities: [],
        tags: ["BIOLOGICAL", "HUMANOID"]
    },

    // --- 2. THE GENERIC BEAST (Basis for Dogs, Wolves, Bears) ---
    "BEAST": {
        name: "Beast",
        sprite: "dog_idle",
        portrait: "dog_face",
        traits: [],
        statusEffects: [],
        attributes: {
            vigor: 12,
            strength: 8,
            dexterity: 14,
            intelligence: 3,
            attunement: 5
        },
        
        baseStats: {
            speed: 7,
            critical: 10,
            corruption: 0,
        },

        equipment: {
            torso: null,
            accessory: null,
        },

        abilities: [],
        tags: ["BIOLOGICAL", "BEAST"]
    },

    "AVIAN": {
        name: "Avian",
        sprite: "bird_idle",
        portrait: "bird_face",
        traits: [],
        statusEffects: [],
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        
        baseStats: {
            speed: 10, critical: 15, corruption: 0
        },

        equipment: {
            accessory: null,
        },

        abilities: [],
        tags: ["BIOLOGICAL", "AVIAN"]
    },

};
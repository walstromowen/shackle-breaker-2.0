export const ENTITY_DEFINITIONS = {
    "HUMANOID": {
        name: "Humanoid",
        level: 1, 
        xp: 0,            // [NEW] Current Experience
        maxXp: 100,       // [NEW] Experience to next level
        skillPoints: 0,   // [NEW] Unspent points

        // --- VISUALS ---
        sprite: "humanoid_base",
        portrait: "humanoid_face",
        traits: [],
        statusEffects: [],
        
        // --- ATTRIBUTES ---
        attributes: {
            vigor: 10,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            attunement: 10
        },
        
        // --- BASE STATS (The "Naked" Values) ---
        baseStats: {
            speed: 5,
            critical: 5,
            corruption: 0,

            // RENAMED: baseDefense (Flat Armor)
            baseDefense: {
                blunt: 0, slash: 0, pierce: 0,
                fire: 0, water: 0, lightning: 0, earth: 0, wind: 0, poison: 0,
                light: 0, shadow: 0, arcane: 0,  
            },

            // RENAMED: baseResistance (% Reduction)
            baseResistance: {
                // Humans are neutral (0% resistance to everything)
            },

            // RENAMED: baseAttack (Natural/Unarmed Damage)
            baseAttack: {
                blunt: 1, // A simple punch
                slash: 0,
                pierce: 0
            }
        },

        // --- RESOURCES (The Tanks) ---
        stats: {
            hp: 0,          
            maxHp: 20,      
            stamina: 0,
            maxStamina: 10, 
            insight: 0,
            maxInsight: 10
        },

        // --- EQUIPMENT & DROPS ---
        equipment: {
            mainHand: null, 
            offHand: null,  
            head: null,
            torso: null,
            arms: null,
            legs: null,
            feet: null,  
            accessory: null
        },

        lootTable: [], 

        abilities: [],
        tags: ["BIOLOGICAL", "HUMANOID"]
    },

    // --- 2. THE GENERIC BEAST ---
    "BEAST": {
        name: "Beast",
        level: 1,
        xp: 0,            // [NEW]
        maxXp: 100,       // [NEW]
        skillPoints: 0,   // [NEW]
        
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

            // Beast Hide provides natural protection
            baseDefense: {
                blunt: 4, 
                slash: 2, 
                pierce: 1,
                water: 2 // Resistance to cold/water
            },

            baseResistance: {
                fire: -0.2, // 20% WEAK to fire (fur burns)
                poison: 0.1 // Slight resistance to natural toxins
            },

            // Natural Weapons (Claws/Bite)
            baseAttack: {
                blunt: 6,
                slash: 8, // Claws
                pierce: 4 // Bite
            }
        },

        // Beast Resources: High HP, Low Stamina, No Magic
        stats: {
            hp: 0, maxHp: 30,
            stamina: 0, maxStamina: 8,
            insight: 0, maxInsight: 0
        },

        equipment: {
            torso: null,
            accessory: null,
        },

        lootTable: [], 

        abilities: [],
        tags: ["BIOLOGICAL", "BEAST"]
    },

    "AVIAN": {
        name: "Avian",
        level: 1,
        xp: 0,            // [NEW]
        maxXp: 100,       // [NEW]
        skillPoints: 0,   // [NEW]
        
        sprite: "bird_idle",
        portrait: "bird_face",
        traits: [],
        statusEffects: [],
        
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        
        baseStats: {
            speed: 10, critical: 15, corruption: 0,

            baseDefense: {
                blunt: 0, slash: 0, pierce: 0,
                earth: 5 // Hard to hit with ground attacks?
            },

            baseResistance: {
                wind: 0.5,  // 50% Resistant to Wind
                earth: 0.2
            },

            baseAttack: {
                slash: 4,  // Talons
                pierce: 4  // Beak
            }
        },

        // Avian Resources: Low HP, High Stamina
        stats: {
            hp: 0, maxHp: 12,
            stamina: 0, maxStamina: 15,
            insight: 0, maxInsight: 5
        },

        equipment: {
            accessory: null,
        },

        lootTable: [],

        abilities: [],
        tags: ["BIOLOGICAL", "AVIAN"]
    },
};
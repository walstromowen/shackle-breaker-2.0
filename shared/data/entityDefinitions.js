/**
 * shared/data/entityDefinitions.js
 */
export const ENTITY_DEFINITIONS = {
    "HUMANOID": {
        name: "Humanoid",
        level: 1, 
        xp: 0,            
        maxXp: 100,       
        skillPoints: 0,   

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
        
        // --- BASE STATS ---
        baseStats: {
            speed: 5,
            critical: 5,
            corruption: 0,
            baseDefense: {
                blunt: 0, slash: 0, pierce: 0,
                fire: 0, ice: 0, lightning: 0, earth: 0, wind: 0, water: 0,
                light: 0, dark: 0, arcane: 0,  
            },
            baseResistance: {},
            baseAttack: {
                blunt: 1, 
                slash: 0,
                pierce: 0
            }
        },

        // --- RESOURCES ---
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

        // [UPDATED] Innate Abilities (Always available)
        abilities: ["rest", "punch"],
        tags: ["BIOLOGICAL", "HUMANOID"]
    },

    // --- 2. THE GENERIC BEAST ---
    "BEAST": {
        name: "Beast",
        level: 1,
        xp: 0,            
        maxXp: 100,       
        skillPoints: 0,   
        
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
            baseDefense: {
                blunt: 4, 
                slash: 2, 
                pierce: 1,
                water: 2 
            },
            baseResistance: {
                fire: -0.2, 
                
            },
            baseAttack: {
                blunt: 6,
                slash: 8, 
                pierce: 4 
            }
        },

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

        // [UPDATED] Beast Innate Abilities
        abilities: ["bite", "howl"],
        tags: ["BIOLOGICAL", "BEAST"]
    },

    "AVIAN": {
        name: "Avian",
        level: 1,
        xp: 0,            
        maxXp: 100,       
        skillPoints: 0,   
        
        sprite: "bird_idle",
        portrait: "bird_face",
        traits: [],
        statusEffects: [],
        
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        
        baseStats: {
            speed: 10, critical: 15, corruption: 0,
            baseDefense: {
                blunt: 0, slash: 0, pierce: 0,
                earth: 5 
            },
            baseResistance: {
                wind: 0.5,  
                earth: 0.2
            },
            baseAttack: {
                slash: 4,  
                pierce: 4  
            }
        },

        stats: {
            hp: 0, maxHp: 12,
            stamina: 0, maxStamina: 15,
            insight: 0, maxInsight: 5
        },

        equipment: {
            accessory: null,
        },

        lootTable: [],

        // [UPDATED] Avian Innate Abilities
        abilities: ["peck", "screech"],
        tags: ["BIOLOGICAL", "AVIAN"]
    },
};
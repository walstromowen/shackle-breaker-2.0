// 1. THE MASTER TEMPLATE
// Every entity in the game starts with these defaults.
const BASE_ENTITY = {
    name: "Unknown Entity",
    level: 1, 
    xp: 0,            
    maxXp: 100,       
    skillPoints: 0,   

    // --- VISUALS ---
    spriteOverworld: "missing_texture",  // Map walking & Combat sprite
    spritePortrait: "missing_face",      // Dialogue & Menu face
    
    traits: [],
    statusEffects: [],
    
    // --- ATTRIBUTES (Safe Defaults) ---
    attributes: {
        vigor: 1, strength: 1, dexterity: 1, intelligence: 1, attunement: 1
    },
    
    // --- BASE STATS ---
    baseStats: {
        maxHp: 1, maxStamina: 1, maxInsight: 0,
        speed: 1, critical: 0, corruption: 0,
        baseDefense: {
            blunt: 0, slash: 0, pierce: 0,
            fire: 0, ice: 0, lightning: 0, earth: 0, wind: 0, water: 0,
            light: 0, dark: 0, arcane: 0,  
        },
        baseResistance: {},
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },

    // --- EQUIPMENT & DROPS ---
    equipment: {
        mainHand: null, offHand: null,  
        head: null, torso: null, arms: null, legs: null, feet: null,  
        accessory: null
    },

    lootTable: [], 
    abilities: ["rest"],
    tags: ["ENTITY"]
};

// 2. THE HUMANOID TEMPLATE (Extends Base)
const HUMANOID_TEMPLATE = {
    ...BASE_ENTITY, // Inherit defaults
    
    name: "Humanoid",
    
    // Visuals
    spriteOverworld: "spritesheet",
    spritePortrait: "legionaryPortrait",

    attributes: {
        vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10
    },
    
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 20, maxStamina: 10, maxInsight: 10,
        speed: 5, critical: 5,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },

    abilities: ["rest", "punch"],
    tags: ["BIOLOGICAL", "HUMANOID"]
};

// 3. THE BEAST TEMPLATE (Extends Base)
const BEAST_TEMPLATE = {
    ...BASE_ENTITY,

    name: "Beast",
    
    // Visuals
    spriteOverworld: "spritesheet",
    spritePortrait: "legionaryPortrait", // Placeholder
    
    attributes: {
        vigor: 12, strength: 8, dexterity: 14, intelligence: 3, attunement: 5
    },
    
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 30, maxStamina: 8, maxInsight: 0,
        speed: 7, critical: 10,
        baseDefense: { blunt: 4, slash: 2, pierce: 1, water: 2 },
        baseResistance: { fire: -0.2 },
        baseAttack: { blunt: 6, slash: 8, pierce: 4 }
    },

    abilities: ["bite", "howl"],
    tags: ["BIOLOGICAL", "BEAST"]
};

// 4. EXPORTED DEFINITIONS
export const ENTITY_DEFINITIONS = {
    
    // --- HUMANOIDS ---
    
    "HUMANOID": HUMANOID_TEMPLATE,

    "LEGIONARY": {
        ...HUMANOID_TEMPLATE, 
        
        name: "Legionary",
        level: 2,
        
        // Visuals
        spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",

        // Soldier Stats
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 14, strength: 14, intelligence: 6
        },

        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 40,
            maxStamina: 20,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 2, pierce: 2, blunt: 1
            }
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "iron_sword",
            torso: "iron_breastplate",
            head: "iron_helmet"
        },

        lootTable: ["gold_coin", "rations"],
        abilities: ["slash", "shield_bash"],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER"]
    },

    // --- CREATURES ---

    "BEAST": BEAST_TEMPLATE,

    "WOLF": {
        ...BEAST_TEMPLATE, 

        name: "Grey Wolf",
        level: 3,

        // Visuals
              spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",

        // OVERRIDES: Wolves are faster and have higher crit than generic beasts
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            dexterity: 16, 
            strength: 10
        },

        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 28, 
            maxStamina: 18, 
            speed: 9,       // Faster than generic beast (7)
            critical: 15,   // Higher crit than generic beast (10)
            
            baseDefense: { 
                ...BEAST_TEMPLATE.baseStats.baseDefense,
                ice: 4 // Natural fur coat
            },
            
            baseResistance: { 
                ...BEAST_TEMPLATE.baseStats.baseResistance,
                fire: -0.25, // Flammable
                ice: 0.25    // Warm
            },

            baseAttack: { 
                blunt: 0, slash: 5, pierce: 7 
            }
        },

        lootTable: ["wolf_pelt", "beast_fang"],
        abilities: ["bite", "howl", "lunge"],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "AVIAN": {
        ...BASE_ENTITY,

        name: "Avian",
        
        // Visuals
        spriteOverworld: "bird_idle",
        spritePortrait: "bird_face",
        
        attributes: { 
            vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 
        },
        
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 12, maxStamina: 15, maxInsight: 5,
            speed: 10, critical: 15,
            baseDefense: { earth: 5 }, 
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },

        abilities: ["peck", "screech"],
        tags: ["BIOLOGICAL", "AVIAN"]
    }
};
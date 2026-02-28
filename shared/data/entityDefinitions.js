// 1. THE MASTER TEMPLATE
const BASE_ENTITY = {
    name: "Unknown Entity",
    level: 1, 
    xp: 0,            
    maxXp: 100,       
    skillPoints: 0,   

    // --- VISUALS ---
    spriteOverworld: "missing_texture",  
    spritePortrait: "missing_face",      
    
    traits: [],
    statusEffects: [],
    
    // --- ATTRIBUTES ---
    attributes: {
        vigor: 1, strength: 1, dexterity: 1, intelligence: 1, attunement: 1
    },
    
    // --- BASE STATS ---
    baseStats: {
        maxHp: 1, maxStamina: 1, maxInsight: 0,
        hpRecovery: 0, staminaRecovery: 0, insightRecovery: 0, // NEW
        speed: 1, critical: 0, corruption: 0,
        baseDefense: {
            blunt: 0, slash: 0, pierce: 0,
            fire: 0, ice: 0, lightning: 0, earth: 0, wind: 0, water: 0,
            light: 0, dark: 0, arcane: 0,  
        },
        baseResistance: {},
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },

    equipment: {
        mainHand: null, offHand: null,  
        head: null, torso: null, arms: null, legs: null, feet: null,  
        accessory: null
    },

    // --- NEW: WEIGHTED LOOT & CURRENCY ---
    currencyReward: { min: 0, max: 0 }, 
    lootTable: [], // Format: { id: "item_id", dropRate: 0.0 to 1.0 }
    
    abilities: ["rest"], 
    tags: ["ENTITY"]
};

// 2. THE HUMANOID TEMPLATE
const HUMANOID_TEMPLATE = {
    ...BASE_ENTITY,
    name: "Humanoid",
    spriteOverworld: "spritesheet",
    spritePortrait: "legionaryPortrait",

    attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
    
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 20, maxStamina: 10, maxInsight: 10,
        staminaRecovery: 1, // Let humanoids naturally regen a bit of stamina
        speed: 5, critical: 5,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },

    // Humanoids usually carry some pocket change
    currencyReward: { min: 1, max: 10 },

    abilities: [...BASE_ENTITY.abilities, "punch"],
    tags: ["BIOLOGICAL", "HUMANOID"]
};

// 3. THE BEAST TEMPLATE
const BEAST_TEMPLATE = {
    ...BASE_ENTITY,
    name: "Beast",
    spriteOverworld: "germanSheepherdSprite",
    spritePortrait: "germanSheepherdPortrait",
    
    attributes: { vigor: 12, strength: 8, dexterity: 14, intelligence: 3, attunement: 5 },
    
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 30, maxStamina: 8, maxInsight: 0,
        staminaRecovery: 10, // Beasts recover stamina slightly faster
        speed: 7, critical: 10,
        baseDefense: { blunt: 4, slash: 2, pierce: 1, water: 2 },
        baseResistance: { fire: -0.2 },
        baseAttack: { blunt: 6, slash: 8, pierce: 4 }
    },

    // Beasts rarely carry money
    currencyReward: { min: 0, max: 0 },

    abilities: [...BASE_ENTITY.abilities, "bite"],
    tags: ["BIOLOGICAL", "BEAST"]
};

// 4. EXPORTED DEFINITIONS
export const ENTITY_DEFINITIONS = {
    "HUMANOID": HUMANOID_TEMPLATE,

    "LEGIONARY": {
        ...HUMANOID_TEMPLATE, 
        name: "Legionary",
        level: 1,
        
        spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",

        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 14, strength: 14, intelligence: 6
        },

        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 40, maxStamina: 20,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 2, pierce: 2, blunt: 1
            }
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "shortsword",
        },

        // Better currency, rare chance to drop their sword or a ration
        currencyReward: { min: 5, max: 15 },
        lootTable: [
            { id: "healing_herb", dropRate: 1 }, // 15% chance
            { id: "shortsword", dropRate: 0.05 }    // 5% chance
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER"]
    },

    "BEAST": BEAST_TEMPLATE,

    "WOLF": {
        ...BEAST_TEMPLATE, 
        name: "Grey Wolf",
        level: 1,

        spriteOverworld: "legionarySprite",
        spritePortrait: "wolfPortrait",

        attributes: {
            ...BEAST_TEMPLATE.attributes,
            dexterity: 16, strength: 10
        },

        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 28, maxStamina: 18, 
            speed: 9, critical: 15, 
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 0, slash: 5, pierce: 7 }
        },

        // No money, but moderate chance for crafting/vendor trash
        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.15 } // 15% chance
        ],
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "AVIAN": {
        ...BASE_ENTITY,
        name: "Avian",
        spriteOverworld: "spritesheet",
        spritePortrait: "hawkPortrait",
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 12, maxStamina: 15, maxInsight: 5,
            staminaRecovery: 3, // Birds recover fast!
            speed: 10, critical: 15,
            baseDefense: { earth: 5 }, 
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },
        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "feather", dropRate: 0.40 } // 40% chance
        ],
        abilities: [...BASE_ENTITY.abilities, "peck", "screech"],
        tags: ["BIOLOGICAL", "AVIAN"]
    }
};
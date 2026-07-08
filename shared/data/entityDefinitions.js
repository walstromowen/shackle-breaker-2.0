// 1. THE MASTER TEMPLATE
const BASE_ENTITY = {
    name: "Unknown Entity",
    level: 1, 
    xp: 0,            
    maxXp: 100,       
    skillPoints: 1,   

    // --- VISUALS ---
    spriteOverworld: "spritesheet",  
    spritePortrait: "spritesheet",  
    battlePortraitFramesFront: 32, // Defaults for enemy view
    battlePortraitFramesBack: 31,  // Defaults for player view    
    crySound: "unsheathSwordSfx",       // <-- NEW: Plays on battle start
    deathSound: "unsheathSwordSfx",
    traits: [],
    statusEffects: [],
    
    // --- NEW: STAT MULTIPLIERS (Growth Rates) ---
    statMultipliers: {
        hpPerVigor: 3,
        staminaPerDex: 2,
        insightPerAtt: 2
    },

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

    equipment: {},

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
    spritePortrait: "spritesheet",
   
    attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
    
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 20, maxStamina: 10, maxInsight: 10,
        staminaRecovery: 1, // Let humanoids naturally regen a bit of stamina
        speed: 5, critical: 0.05,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },
    equipment: {
        mainHand: null, offHand: null,  
        head: null, torso: null, arms: null, legs: null, feet: null,  
        accessory: null
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
    spriteOverworld: "spritesheet",
    spritePortrait: "spritesheet",
    battlePortraitFramesFront: 32, // Defaults for enemy view
    battlePortraitFramesBack: 32,  // Defaults for player view    
    crySound: "dogCry",       // <-- NEW: Plays on battle start
    deathSound: "dogDeath",
    
    // Beasts get massive HP/Stam from stats, but very little insight
    statMultipliers: {
        hpPerVigor: 5,
        staminaPerDex: 3,
        insightPerAtt: 0.5
    },

    attributes: { vigor: 8, strength: 8, dexterity: 14, intelligence: 3, attunement: 5 },
    traits: [],
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 15, maxStamina: 8, maxInsight: 0,
        staminaRecovery: 10, // Beasts recover stamina slightly faster
        speed: 7, critical: 0.1,
        baseDefense: { blunt: 4, slash: 2, pierce: 1, water: 2 },
        baseResistance: { fire: -0.2 },
        baseAttack: { blunt: 6, slash: 8, pierce: 4 }
    },
    equipment: {
        accessory: null 
    },
    // Beasts rarely carry money
    currencyReward: { min: 0, max: 0 },

    abilities: [...BASE_ENTITY.abilities, "bite"],
    tags: ["BIOLOGICAL", "BEAST"]
};

// 4. EXPORTED DEFINITIONS (Organized Logically)
export const ENTITY_DEFINITIONS = {
    // =========================================================================
    // HUMANOID LINEAGE
    // =========================================================================
    "HUMANOID": HUMANOID_TEMPLATE,

    "MAD_MAN": {
        ...HUMANOID_TEMPLATE,
        name: "Madman",
        level: 1,

        spriteOverworld: "spritesheet",
        spritePortrait: "madmanPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "madmanCry",
        deathSound: "madmanCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 10,
            strength: 10,
            dexterity: 10
        },

        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 20,
            maxStamina: 10,
            speed: 5
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "dagger"
        },

        currencyReward: { min: 2, max: 8 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.15 },
            { id: "dagger", dropRate: 0.05 }
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    
    "MAD_MAGE": {
        ...HUMANOID_TEMPLATE, 
        name: "Mad Mage",
        level: 1,
        
        spriteOverworld: "madMageSprite",
        spritePortrait: "madMagePortrait",
        battlePortraitFramesFront: 32, // Defaults for enemy view
        battlePortraitFramesBack: 32,  // Defaults for player view    
        crySound: "madMageCry",       // <-- NEW: Plays on battle start
        deathSound: "madMageCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 6, intelligence: 14, attunement: 12
        },
        traits: [],
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 20, maxStamina: 20, maxInsight: 20,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 2, pierce: 2, blunt: 1
            }
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "insight_of_arcane",
        },

        currencyReward: { min: 5, max: 15 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.25 }, 
            { id: "dagger", dropRate: 0.05 },    
            { id: "insight_of_arcane", dropRate: 0.15 }
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "ROTTING_MAN": {
        ...HUMANOID_TEMPLATE,
        name: "Rotting Man",
        level: 1,

        spriteOverworld: "spritesheet",
        spritePortrait: "rottingManPortrait",
        battlePortraitFramesFront: 29,
        battlePortraitFramesBack: 32,
        crySound: "madmanCry",
        deathSound: "madmanCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 11,
            strength: 11,
            dexterity: 8
        },
        traits: ['acidic'],
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 30,
            maxStamina: 10,
            speed: 5
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
        },

        currencyReward: { min: 2, max: 8 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.15 },
            { id: "dagger", dropRate: 0.05 }
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "LEGIONARY": {
        ...HUMANOID_TEMPLATE, 
        name: "Legionary",
        level: 1,
        
        spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",
        battlePortraitFramesFront: 32, // Defaults for enemy view
        battlePortraitFramesBack: 32,  // Defaults for player view    
        crySound: "legionaryCry",       // <-- NEW: Plays on battle start
        deathSound: "legionaryCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 14, strength: 14, intelligence: 6
        },
        traits: [],
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "shortsword",
        },

        currencyReward: { min: 5, max: 15 },
        lootTable: [
            { id: "healing_herb", dropRate: 1 }, 
            { id: "shortsword", dropRate: 0.05 }    
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER"]
    },

    "SAND_STALKER": {
        ...HUMANOID_TEMPLATE,
        name: "Sand Stalker",
        level: 1,

        spriteOverworld: "spritesheet",
        spritePortrait: "sandStalkerPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "sandStalkerCry",
        deathSound: "sandStalkerCry",
        attributes: { vigor: 8, strength: 8, dexterity: 12, intelligence: 10, attunement: 12 },
    

        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 15,
            maxStamina: 15,
            speed: 25
        },

        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "shortsword"
        },

        currencyReward: { min: 2, max: 8 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.15 },
            { id: "shortsword", dropRate: 0.05 }
        ],
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags, ]
    },


    // =========================================================================
    // BEAST LINEAGE
    // =========================================================================
    "BEAST": BEAST_TEMPLATE,

    "DOG": {
        ...BEAST_TEMPLATE,
        name: "Dog",
        level: 1,

        spriteOverworld: "germanSheepherdSprite",
        spritePortrait: "germanSheepherdPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "dogCry",
        deathSound: "dogDeath",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 6,
            dexterity: 12,
            strength: 6
        },

        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 12,
            maxStamina: 8,
            speed: 7,
            critical: 0.08,
            baseAttack: { blunt: 2, slash: 4, pierce: 2 }
        },

        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "leather", dropRate: 0.20 }
        ],
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "WOLF": {
        ...BEAST_TEMPLATE, 
        name: "Grey Wolf",
        level: 1,

        spriteOverworld: "legionarySprite",
        spritePortrait: "wolfPortrait",
        battlePortraitFramesFront: 32, // Defaults for enemy view
        battlePortraitFramesBack: 32,  // Defaults for player view    
        crySound: "wolfCry",       // <-- NEW: Plays on battle start
        deathSound: "wolfCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            dexterity: 16, strength: 10
        },

        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 28, maxStamina: 18, 
            speed: 9, critical: 0.15, 
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 0, slash: 5, pierce: 7 }
        },

        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "healing_herb", dropRate: 0.15 } 
        ],
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "SHACKLED_STEED": {
        ...BEAST_TEMPLATE, 
        name: "Shackled Steed",
        level: 1,

        spriteOverworld: "shackledSteedSprite",
        spritePortrait: "shackledSteedPortrait",
        battlePortraitFramesFront: 25, // Defaults for enemy view
        battlePortraitFramesBack: 8,  // Defaults for player view    
        crySound: "shackledSteedCry",       // <-- NEW: Plays on battle start
        deathSound: "shackledSteedCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 14, dexterity: 10, strength: 10
        },

        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 40, maxStamina: 18, 
            speed: 9, critical: 0.15, 
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 8, slash: 2, pierce: 2 }
        },

        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "leather", dropRate: 0.50 }
        ],
        abilities: [...BEAST_TEMPLATE.abilities, "strike"],
        tags: [...BEAST_TEMPLATE.tags]
    },

    "AVIAN": {
        ...BASE_ENTITY,
        name: "Avian",
        spriteOverworld: "spritesheet",
        spritePortrait: "hawkPortrait",
        
        statMultipliers: {
            hpPerVigor: 2,
            staminaPerDex: 4,
            insightPerAtt: 1
        },

        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 12, maxStamina: 15, maxInsight: 5,
            staminaRecovery: 3, 
            speed: 10, critical: 0.15,
            baseDefense: { earth: 5 }, 
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },
        currencyReward: { min: 0, max: 0 },
        lootTable: [
            { id: "feather", dropRate: 0.40 } 
        ],
        abilities: [...BASE_ENTITY.abilities, "peck", "screech"],
        tags: ["BIOLOGICAL", "AVIAN"]
    }
};
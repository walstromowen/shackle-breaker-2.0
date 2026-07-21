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
    battlePortraitFramesFront: 32,
    battlePortraitFramesBack: 31,
    crySound: "unsheathSwordSfx",
    deathSound: "unsheathSwordSfx",

    traits: [],
    statusEffects: [],

    // --- STAT MULTIPLIERS (Growth Rates) ---
    statMultipliers: {
        hpPerVigor: 3,
        staminaPerDex: 2,
        insightPerAtt: 2
    },

    // --- ATTRIBUTES ---
    attributes: {
        vigor: 1,
        strength: 1,
        dexterity: 1,
        intelligence: 1,
        attunement: 1
    },

    // --- BASE STATS ---
    baseStats: {
        maxHp: 1,
        maxStamina: 1,
        maxInsight: 0,
        hpRecovery: 0,
        staminaRecovery: 0,
        insightRecovery: 0,
        speed: 1,
        critical: 0,
        corruption: 0,
        baseDefense: {
            blunt: 0, slash: 0, pierce: 0, fire: 0,
            ice: 0, lightning: 0, earth: 0, wind: 0,
            water: 0, light: 0, dark: 0, arcane: 0
        },
        baseResistance: {},
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },

    equipment: {},

    // --- LOOT & CURRENCY ---
    currencyReward: { min: 0, max: 0 },
    lootTableId: null, 
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
        staminaRecovery: 1, speed: 5, critical: 0.05,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },
    equipment: {
        mainHand: null, offHand: null, head: null, torso: null,
        arms: null, legs: null, feet: null, accessory: null
    },
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
    battlePortraitFramesFront: 32,
    battlePortraitFramesBack: 32,
    crySound: "dogCry",
    deathSound: "dogDeath",
    statMultipliers: { hpPerVigor: 5, staminaPerDex: 3, insightPerAtt: 0.5 },
    attributes: { vigor: 8, strength: 8, dexterity: 14, intelligence: 3, attunement: 5 },
    traits: [],
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 15, maxStamina: 8, maxInsight: 0,
        staminaRecovery: 10, speed: 7, critical: 0.1,
        baseDefense: { blunt: 4, slash: 2, pierce: 1, water: 2 },
        baseResistance: { fire: -0.2 },
        baseAttack: { blunt: 6, slash: 8, pierce: 4 }
    },
    equipment: { accessory: null },
    currencyReward: { min: 0, max: 0 },
    abilities: [...BASE_ENTITY.abilities, "bite"],
    tags: ["BIOLOGICAL", "BEAST"]
};

// 4. EXPORTED DEFINITIONS
export const ENTITY_DEFINITIONS = {
    // =========================================================================
    // HUMANOID LINEAGE
    // =========================================================================
    "HUMANOID": HUMANOID_TEMPLATE,

    "MAD_MAN": {
        ...HUMANOID_TEMPLATE,
        name: "Madman",
        level: 1,
        spritePortrait: "madmanPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 1,
        crySound: "madmanCry",
        deathSound: "madmanCry",
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 20, maxStamina: 10, speed: 5
        },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops", 
        abilities: [...HUMANOID_TEMPLATE.abilities, "bite", "punch"],
        tags: [...HUMANOID_TEMPLATE.tags],
        traitRewards: [
            { id: "tough", chance: 0.5, condition: "kill" },
            { id: "quick", chance: 1.0, condition: "killed_by" } // Note: make sure 'killed_by' is added to your reward logic if it wasn't already!
        ]
    },

    "MAD_MAGE": {
        ...HUMANOID_TEMPLATE,
        name: "Mad Mage",
        level: 1,
        spriteOverworld: "madMageSprite",
        spritePortrait: "madMagePortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "madMageCry",
        deathSound: "madMageCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 6, intelligence: 14, attunement: 12
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 20, maxStamina: 20, maxInsight: 20,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 2, pierce: 2, blunt: 1
            }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_arcane" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "mad_mage_drops", 
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "ROTTING_MAN": {
        ...HUMANOID_TEMPLATE,
        name: "Rotting Man",
        level: 1,
        spritePortrait: "rottingManPortrait",
        battlePortraitFramesFront: 29,
        battlePortraitFramesBack: 32,
        crySound: "madmanCry",
        deathSound: "madmanCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 11, strength: 11, dexterity: 8 },
        traits: ['acidic'],
        baseStats: { ...HUMANOID_TEMPLATE.baseStats, maxHp: 30, maxStamina: 10, speed: 5 },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops", 
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "LEGIONARY": {
        ...HUMANOID_TEMPLATE,
        name: "Legionary",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "legionaryCry",
        deathSound: "legionaryCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 14, strength: 14, intelligence: 6 },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "mad_man_drops", 
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER"]
    },
    "HOLLOW_HARVESTER": {
        ...HUMANOID_TEMPLATE,
        name: "Hollow Harvester",
        level: 1,
        spriteOverworld: "hollowHarvesterSprite",
        spritePortrait: "hollowHarvesterPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "hollowHarvesterCry",
        deathSound: "hollowHarvesterCry",
        attributes: {
            vigor: 12,
            strength: 8,
            dexterity: 14,
            intelligence: 14,
            attunement: 10
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 32,
            maxStamina: 15,
            maxInsight: 15,
            speed: 6,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 4,
                dark: 6,
                arcane: 4,
                light: -3 // Weak against holy/light magic
            },
            baseAttack: { 
                blunt: 0, 
                slash: 7, 
                arcane: 5 // Magic / Slashing hybrid breakdown
            }
        },
        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "scythe"
        },
        currencyReward: { min: 6, max: 14 },
        lootTableId: "hollow_harvester_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "spirit_reap"],
        // Replaced BIOLOGICAL with MAGICAL and UNDEAD to reflect its ethereal nature
        tags: ["HUMANOID", "MAGICAL", "UNDEAD"] 
    },

    "SAND_STALKER": {
        ...HUMANOID_TEMPLATE,
        name: "Sand Stalker",
        level: 1,
        spritePortrait: "sandStalkerPortrait",
        battlePortraitFramesFront: 32,
        battlePortraitFramesBack: 32,
        crySound: "sandStalkerCry",
        deathSound: "sandStalkerCry",
        attributes: { vigor: 8, strength: 8, dexterity: 12, intelligence: 10, attunement: 12 },
        baseStats: { ...HUMANOID_TEMPLATE.baseStats, maxHp: 15, maxStamina: 15, speed: 25 },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops", 
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
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
        battlePortraitFramesFront: 1,
        battlePortraitFramesBack: 31,
        crySound: "dogCry",
        deathSound: "dogDeath",
        attributes: { ...BEAST_TEMPLATE.attributes, vigor: 6, dexterity: 12, strength: 6 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 12, maxStamina: 8, speed: 7, critical: 0.08,
            baseAttack: { blunt: 2, slash: 4, pierce: 2 }
        },
        lootTableId: "canine_drops",
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "WOLF": {
        ...BEAST_TEMPLATE,
        name: "Grey Wolf",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "wolfPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 32,
        crySound: "wolfCry",
        deathSound: "wolfCry",
        attributes: { ...BEAST_TEMPLATE.attributes, dexterity: 16, strength: 10 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 28, maxStamina: 18, speed: 9, critical: 0.15,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 0, slash: 5, pierce: 7 }
        },
        lootTableId: "canine_drops", 
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "SHACKLED_STEED": {
        ...BEAST_TEMPLATE,
        name: "Shackled Steed",
        level: 1,
        spriteOverworld: "shackledSteedSprite",
        spritePortrait: "shackledSteedPortrait",
        battlePortraitFramesFront: 25,
        battlePortraitFramesBack: 8,
        crySound: "shackledSteedCry",
        deathSound: "shackledSteedCry",
        attributes: { ...BEAST_TEMPLATE.attributes, vigor: 14, dexterity: 10, strength: 10 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 40, maxStamina: 18, speed: 9, critical: 0.15,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 8, slash: 2, pierce: 2 }
        },
        lootTableId: "mad_man_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "strike"],
        tags: [...BEAST_TEMPLATE.tags]
    },

    "AVIAN": {
        ...BASE_ENTITY,
        name: "Avian",
        spritePortrait: "hawkPortrait",
        statMultipliers: { hpPerVigor: 2, staminaPerDex: 4, insightPerAtt: 1 },
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 12, maxStamina: 15, maxInsight: 5,
            staminaRecovery: 3, speed: 10, critical: 0.15,
            baseDefense: { earth: 5 },
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },
        lootTableId: "mad_man_drops", 
        abilities: [...BASE_ENTITY.abilities, "peck", "screech"],
        tags: ["BIOLOGICAL", "AVIAN"]
    },

    "GRIM_STAG": { 
  ...BEAST_TEMPLATE, 
  name: "Grim Stag", 
  level: 1, 
  spriteOverworld: "grimStagSprite", 
  spritePortrait: "grimStagPortrait", 
  battlePortraitFramesFront: 31, 
  battlePortraitFramesBack: 31, 
  crySound: "grimStagCry", 
  deathSound: "grimStagCry", 
  attributes: { 
    ...BEAST_TEMPLATE.attributes, 
    vigor: 14,       // Down from 22 (Reduces massive HP scaling)
    strength: 13,    // Down from 18 (Still hard-hitting for a common enemy)
    dexterity: 11,   // Down from 16
    intelligence: 5, // Down from 10
    attunement: 4    // Down from 8 
  }, 
  baseStats: { 
    ...BEAST_TEMPLATE.baseStats, 
    maxHp: 90,       // Down from 150 (Tougher than a Madman, but not a slog)
    maxStamina: 25,  // Down from 35
    maxInsight: 10,  
    speed: 11,       // Down from 12
    critical: 0.08,  // Down from 0.15 (0.15 is incredibly high for a common foe)
    baseDefense: { 
      ...BEAST_TEMPLATE.baseStats.baseDefense, 
      blunt: 6,      // Toned down across the board so players can actually dent it
      slash: 4, 
      pierce: 3, 
      earth: 6, 
      dark: 2 
    }, 
    baseResistance: { 
      ...BEAST_TEMPLATE.baseStats.baseResistance, 
      earth: 0.25,   // Softened elemental immunities
      dark: 0.1, 
      wind: -0.15 
    }, 
    baseAttack: { blunt: 7, slash: 2, pierce: 9, earth: 0 } // Adjusted to favor antler thrusts (pierce) over magic
  }, 
  currencyReward: { min: 24, max: 48 }, // Normalized down from the 75-200 miniboss payout
  lootTableId: "grim_stag_drops", 
  abilities: [...BEAST_TEMPLATE.abilities, "strike", "reckless_charge"], // Replaced Earthquake/Eviscerate with realistic beast mechanics
  tags: [...BEAST_TEMPLATE.tags] // Stripped "MINIBOSS" and "ELITE" tags so it spawns in normal pools
},

    // =========================================================================
    // BOSS LINEAGE
    // =========================================================================
    "POACHERS_NIGHTMARE": {
        ...BEAST_TEMPLATE,
        name: "Poacher's Nightmare",
        level: 10, 
        frameSize: 192, // <--- Here is the massive custom frame size!
        spriteOverworld: "poachersNightmareSprite",
        spritePortrait: "poachersNightmarePortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "poachersNightmareCry", // Swap this out for a terrifying custom roar if you have one
        deathSound: "poachersNightmareCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 45, 
            strength: 35, 
            dexterity: 25, 
            intelligence: 8, 
            attunement: 12
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 650, 
            maxStamina: 60, 
            maxInsight: 20, 
            speed: 16, 
            critical: 0.25,
            baseDefense: {
                ...BEAST_TEMPLATE.baseStats.baseDefense,
                blunt: 20, 
                slash: 15, 
                pierce: 18, 
                earth: 25, 
                dark: 20
            },
            baseResistance: {
                ...BEAST_TEMPLATE.baseStats.baseResistance,
                earth: 0.5, 
                dark: 0.4, 
                fire: -0.3 // Weak to fire
            },
            baseAttack: { 
                blunt: 25, 
                slash: 30, 
                pierce: 20, 
                dark: 15 
            }
        },
        currencyReward: { min: 350, max: 800 },
        lootTableId: "boss_poachers_nightmare_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "eviscerate", "earthquake", "strike"], // Add deadly boss moves here
        tags: [...BEAST_TEMPLATE.tags, "BOSS", "ELITE"]
    }
};
// =========================================================================
// 1. TEMPLATES
// =========================================================================

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
    statMultipliers: { hpPerVigor: 3, staminaPerDex: 2, insightPerAtt: 2 },
    // --- ATTRIBUTES ---
    attributes: { vigor: 1, strength: 1, dexterity: 1, intelligence: 1, attunement: 1 },
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
        baseDefense: { blunt: 0, slash: 0, pierce: 0, fire: 0, ice: 0, lightning: 0, earth: 0, wind: 0, water: 0, light: 0, dark: 0, arcane: 0 },
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

const HUMANOID_TEMPLATE = {
    ...BASE_ENTITY,
    name: "Humanoid",
    spriteOverworld: "spritesheet",
    spritePortrait: "spritesheet",
    attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 20,
        maxStamina: 10,
        maxInsight: 10,
        staminaRecovery: 1,
        speed: 5,
        critical: 0.05,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },
    equipment: { mainHand: null, offHand: null, head: null, torso: null, arms: null, legs: null, feet: null, accessory: null },
    currencyReward: { min: 1, max: 10 },
    abilities: [...BASE_ENTITY.abilities, "punch"],
    tags: ["BIOLOGICAL", "HUMANOID"]
};

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
        maxHp: 15,
        maxStamina: 8,
        maxInsight: 0,
        staminaRecovery: 10,
        speed: 7,
        critical: 0.1,
        baseDefense: { blunt: 4, slash: 2, pierce: 1, water: 2 },
        baseResistance: { fire: -0.2 },
        baseAttack: { blunt: 6, slash: 8, pierce: 4 }
    },
    equipment: { accessory: null },
    currencyReward: { min: 0, max: 0 },
    abilities: [...BASE_ENTITY.abilities, "bite"],
    tags: ["BIOLOGICAL", "BEAST"]
};

// =========================================================================
// 2. EXPORTED DEFINITIONS
// =========================================================================

export const ENTITY_DEFINITIONS = {

    // -------------------------------------------------------------------------
    // HUMANOID LINEAGE
    // -------------------------------------------------------------------------
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
        baseStats: { ...HUMANOID_TEMPLATE.baseStats, maxHp: 20, maxStamina: 10, speed: 5 },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "bite", "claw"],
        tags: [...HUMANOID_TEMPLATE.tags],
        traitRewards: []
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
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 6, intelligence: 14, attunement: 12 },
        baseStats: { 
            ...HUMANOID_TEMPLATE.baseStats, 
            maxHp: 20, maxStamina: 20, maxInsight: 20, 
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 2, pierce: 2, blunt: 1 } 
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_arcane" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "mad_mage_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags]
    },
    
    "ROTTER": {
        ...HUMANOID_TEMPLATE,
        name: "Rotter",
        level: 1,
        spritePortrait: "rotterPortrait",
        battlePortraitFramesFront: 29,
        battlePortraitFramesBack: 32,
        crySound: "rotterCry",
        deathSound: "rotterCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 11, strength: 11, dexterity: 8 },
        traits: ['acidic'],
        baseStats: { ...HUMANOID_TEMPLATE.baseStats, maxHp: 30, maxStamina: 10, speed: 5 },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "claw", "bite"],
        tags: [...HUMANOID_TEMPLATE.tags]
    },
    "SHADY_MERCHANT": {
        ...HUMANOID_TEMPLATE,
        name: "Shady Merchant",
        level: 1,
        spriteOverworld: "shadyMerchantSprite", 
        spritePortrait: "shadyMerchantPortrait", // Reusing the encounter sheet!
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "shadyMerchantCry", // Can share the shady merchant's distinctive cry
        deathSound: "shadyMerchantCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 12,      // Slightly beefier than the base 10
            dexterity: 14,  // Nimble enough to pickpocket
            strength: 9     // Relies more on speed than raw power
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 25,      // Madman has 20
            maxStamina: 15, // Madman has 10
            speed: 7,       // Faster than the Madman's 5
            critical: 0.10, // 10% crit chance for backstab flavor
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                slash: 2,
                pierce: 2
            }
        },
        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "dagger", // Matches the encounter text!
            offHand: "dagger" // Matches the encounter text!
        },
        currencyReward: { min: 15, max: 40 }, // He's a merchant, so he drops a good purse!
        lootTableId: "mad_man_drops", // You can change this if you make a specific merchant loot table
        abilities: [...HUMANOID_TEMPLATE.abilities, "eviscerate"], // Backstab flavor
        tags: [...HUMANOID_TEMPLATE.tags, "MERCHANT", "ROGUE"]
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
        attributes: { vigor: 12, strength: 8, dexterity: 14, intelligence: 14, attunement: 10 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 32, maxStamina: 15, maxInsight: 15, speed: 6,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 4, dark: 6, arcane: 4, light: -3 },
            baseAttack: { blunt: 0, slash: 7, arcane: 5 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "scythe" },
        currencyReward: { min: 6, max: 14 },
        lootTableId: "hollow_harvester_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "spirit_reap"],
        tags: ["HUMANOID", "MAGICAL", "UNDEAD"]
    },

    "SCORCHED_VAGRANT": {
        ...HUMANOID_TEMPLATE,
        name: "Scorched Vagrant",
        level: 1,
        spriteOverworld: "scorchedVagrantSprite",
        spritePortrait: "scorchedVagrantPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "scorchedVagrantCry",
        deathSound: "scorchedVagrantCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 9, strength: 7, dexterity: 10, intelligence: 16, attunement: 14 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 24, maxStamina: 12, maxInsight: 25, speed: 7,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, fire: 8, light: 6, arcane: 5, water: -5, ice: -3 },
            baseResistance: { fire: 0.4, light: 0.2 },
            baseAttack: { blunt: 2, fire: 7, arcane: 4, light: 3 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_fire" },
        currencyReward: { min: 6, max: 16 },
        lootTableId: "scorched_vagrant_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "flamethrower",],
        tags: [...HUMANOID_TEMPLATE.tags, "MAGICAL", "DESERT"]
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
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 8, strength: 10, dexterity: 16, intelligence: 8, attunement: 10 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 18, maxStamina: 20, speed: 25, critical: 0.15,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, earth: 5, wind: 6, slash: 4 },
            baseResistance: { wind: 0.25, earth: 0.15 },
            baseAttack: { slash: 8, earth: 2, wind: 4 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 4, max: 12 },
        lootTableId: "sand_stalker_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities],
        tags: [...HUMANOID_TEMPLATE.tags, "DESERT", "ASSASSIN"]
    },
    
    "MIRAGEWRIGHT": {
        ...HUMANOID_TEMPLATE,
        name: "Miragewright",
        level: 1,
        spriteOverworld: "miragewrightSprite",
        spritePortrait: "miragewrightPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "miragewrightCry",
        deathSound: "miragewrightCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 10, strength: 6, dexterity: 12, intelligence: 18, attunement: 16 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 28, maxStamina: 15, maxInsight: 35, speed: 9,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, ice: 6, water: 5, earth: 5, dark: 7, wind: 6 },
            baseResistance: { ice: 0.2, water: 0.2, dark: 0.3, wind: 0.2 },
            baseAttack: { blunt: 2, ice: 4, dark: 6, wind: 3 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_darkness" },
        currencyReward: { min: 10, max: 25 },
        lootTableId: "miragewright_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "flamethrower", "fireball"],
        tags: ["HUMANOID", "MAGICAL", "DESERT", "ELITE"]
    },
    "CALCIFIED_CRUSADER": {
        ...HUMANOID_TEMPLATE,
        name: "Calcified Crusader",
        level: 1,
        spriteOverworld: "calcifiedCrusaderSprite",
        spritePortrait: "calcifiedCrusaderPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "calcifiedCrusaderCry",
        deathSound: "calcifiedCrusaderCry",
        attributes: { ...HUMANOID_TEMPLATE.attributes, vigor: 18, strength: 16, dexterity: 4, intelligence: 4, attunement: 10 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 60, maxStamina: 16, speed: 3, critical: 0.05,
            baseDefense: { 
                ...HUMANOID_TEMPLATE.baseStats.baseDefense, 
                slash: 14, 
                pierce: 12, 
                blunt: 4, 


                earth: 12, 
                wind: -6, 
                water: -10 
            },
            baseResistance: { 
                slash: 0.4, 
                pierce: 0.3, 
                earth: 0.3, 
                water: -0.6 
            },
            baseAttack: { slash: 10, earth: 4 }
        },
        equipment: { 
            ...HUMANOID_TEMPLATE.equipment, 
            mainHand: "glaive"
         
        },
        currencyReward: { min: 10, max: 22 },
        lootTableId: "calcified_crusader_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, ],
        tags: ["HUMANOID", "CONSTRUCT", "DESERT", "SHIFTING_SANDS", "ELITE"]
    },

    // -------------------------------------------------------------------------
    // BEAST LINEAGE
    // -------------------------------------------------------------------------
    "BEAST": BEAST_TEMPLATE,
    
    "DOG": {
        ...BEAST_TEMPLATE,
        name: "Dog",
        level: 1,
        spriteOverworld: "germanSheepherdSprite",
        spritePortrait: "germanSheepherdPortrait",
        battlePortraitFramesFront: 31,
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
        abilities: [...BEAST_TEMPLATE.abilities, 'howl'],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },
    
    "WOLF": {
        ...BEAST_TEMPLATE,
        name: "Wolf",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "wolfPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
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
        abilities: [...BEAST_TEMPLATE.abilities, 'howl'],
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
        abilities: [...BEAST_TEMPLATE.abilities, "strike", "reckless_charge"],
        tags: [...BEAST_TEMPLATE.tags]
    },
    
    "AVIAN": {
        ...BASE_ENTITY, // Note: Intentionally left inheriting from BASE_ENTITY as authored
        name: "Avian",
        spritePortrait: "hawkPortrait",
        statMultipliers: { hpPerVigor: 2, staminaPerDex: 4, insightPerAtt: 1 },
        attributes: { vigor: 6, strength: 4, dexterity: 16, intelligence: 6, attunement: 8 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 12, maxStamina: 15, maxInsight: 5, staminaRecovery: 3, speed: 10, critical: 0.15,
            baseDefense: { earth: 5 },
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },
        lootTableId: "mad_man_drops",
        abilities: [...BASE_ENTITY.abilities, ],
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
        attributes: { ...BEAST_TEMPLATE.attributes, vigor: 14, strength: 13, dexterity: 11, intelligence: 5, attunement: 4 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 90, maxStamina: 25, maxInsight: 10, speed: 11, critical: 0.08,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 6, slash: 4, pierce: 3, earth: 6, dark: 2 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.25, dark: 0.1, wind: -0.15 },
            baseAttack: { blunt: 7, slash: 2, pierce: 9, earth: 0 }
        },
        currencyReward: { min: 24, max: 48 },
        lootTableId: "grim_stag_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "claw", "reckless_charge", "eviscerate"],
        tags: [...BEAST_TEMPLATE.tags]
    },

    "DUNE_MAW": {
        ...BEAST_TEMPLATE,
        name: "Dune Maw",
        level: 1,
        spriteOverworld: "duneMawSprite",
        spritePortrait: "duneMawPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "duneMawCry",
        deathSound: "duneMawCry",
        attributes: { ...BEAST_TEMPLATE.attributes, vigor: 15, strength: 16, dexterity: 6, intelligence: 2, attunement: 4 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 45, maxStamina: 12, speed: 5,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 8, pierce: 6, earth: 7, water: 5, lightning: -4 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.25, water: 0.15 },
            baseAttack: { blunt: 8, pierce: 6, slash: 0 }
        },
        currencyReward: { min: 8, max: 18 },
        lootTableId: "dune_maw_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "bite"],
        tags: [...BEAST_TEMPLATE.tags, "DESERT"]
    },
    "THUNDER_LOCUST": {
        ...BEAST_TEMPLATE,
        name: "Thunder Locust Swarm",
        level: 1,
        spriteOverworld: "thunderLocustSprite",
        spritePortrait: "thunderLocustPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "thunderLocustCry",
        deathSound: "thunderLocustCry",
        // Swarms are fragile but incredibly fast and magically attuned
        attributes: { 
            ...BEAST_TEMPLATE.attributes, 
            vigor: 5, 
            strength: 4, 
            dexterity: 18, 
            intelligence: 4, 
            attunement: 16 
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 22, 
            maxStamina: 25, 
            speed: 20, 
            critical: 0.15,
            baseDefense: { 
                ...BEAST_TEMPLATE.baseStats.baseDefense, 
                lightning: 15, 
                wind: 8, 
                blunt: 2, 
                earth: -6, 
                water: -6 
            },
            baseResistance: { 
                ...BEAST_TEMPLATE.baseStats.baseResistance, 
                lightning: 0.75, 
                wind: 0.25,
                water: -0.5 
            },
            baseAttack: { pierce: 3, lightning: 9, wind: 3 }
        },
        currencyReward: { min: 3, max: 12 },
        lootTableId: "thunder_locust_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "spark_swarm", "piercing_bite", "galvanize"],
        tags: ["BIOLOGICAL", "INSECT", "SWARM", "DESERT", "MAGICAL"]
    },

    // -------------------------------------------------------------------------
    // BOSS LINEAGE
    // -------------------------------------------------------------------------
    "POACHERS_NIGHTMARE": {
        ...BEAST_TEMPLATE,
        name: "Poacher's Nightmare",
        level: 10,
        frameSize: 192,
        spriteOverworld: "poachersNightmareSprite",
        spritePortrait: "poachersNightmarePortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "poachersNightmareCry",
        deathSound: "poachersNightmareCry",
        attributes: { ...BEAST_TEMPLATE.attributes, vigor: 45, strength: 35, dexterity: 25, intelligence: 8, attunement: 12 },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 650, maxStamina: 60, maxInsight: 20, speed: 16, critical: 0.25,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 20, slash: 15, pierce: 18, earth: 25, dark: 20 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.5, dark: 0.4, fire: -0.3 },
            baseAttack: { blunt: 25, slash: 30, pierce: 20, dark: 15 }
        },
        currencyReward: { min: 350, max: 800 },
        lootTableId: "boss_poachers_nightmare_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "eviscerate", "earthquake", "claw", "vine_lash"],
        tags: [...BEAST_TEMPLATE.tags, "BOSS", "ELITE"]
    },
    "DARIUS_THE_GROVELER": {
        ...HUMANOID_TEMPLATE,
        name: "Darius the Groveler",
        level: 1,
        spriteOverworld: "dariusSprite",
        spritePortrait: "dariusPortrait",
        battlePortraitFramesFront: 31,
        battlePortraitFramesBack: 31,
        crySound: "madMageCry", // He is the apex of the Mad Mages
        deathSound: "madMageCry",
        
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 30,
            strength: 15,
            dexterity: 15,
            intelligence: 35, // Highly warped by the meteorite
            attunement: 30
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 420,
            maxStamina: 30,
            maxInsight: 100,
            speed: 12,
            critical: 0.1,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                blunt: 10,
                slash: 8,
                pierce: 8,
                arcane: 25,
                light: -10, // Weak to light, representing his dark cosmic corruption
                fire: -5
            },
            baseResistance: {
                arcane: 0.6,
                dark: 0.3,
                light: -0.4
            },
            baseAttack: {
                blunt: 5,
                arcane: 25
            }
        },
        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "insight_of_arcane",
            head: "tattered_hood" // Keeps the "groveler/vagabond" aesthetic
        },
        currencyReward: { min: 200, max: 500 },
        lootTableId: "boss_darius_drops",
        abilities: [...HUMANOID_TEMPLATE.abilities, "arcane_dart", "magic_missile", "meteor_shower"], 
        tags: [...HUMANOID_TEMPLATE.tags, "BOSS", "ELITE", "MAGICAL"]
    }
};
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
    battlePortraitFramesBack: 32,
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
        maxHp: 1, maxStamina: 1, maxInsight: 0, hpRecovery: 0, staminaRecovery: 0, insightRecovery: 0, 
        speed: 1, critical: 0, corruption: 0, 
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
        maxHp: 20, maxStamina: 10, maxInsight: 10, staminaRecovery: 1, speed: 5, critical: 0.05,
        baseAttack: { blunt: 1, slash: 0, pierce: 0 }
    },
    equipment: { mainHand: null, offHand: null, head: null, torso: null, arms: null, legs: null, feet: null, accessory: null },
    currencyReward: { min: 1, max: 10 },
    abilities: [...BASE_ENTITY.abilities, "punch"],
    tags: ["BIOLOGICAL", "HUMANOID"]
};

/* Everything that is not the player gets the humanoid abilities WITHOUT Punch (the player is built from HUMANOID_TEMPLATE itself, so keeps it).
   An enemy fights with what its weapon grants and what is listed on it; it never falls back to punching. */
const REGULAR_HUMANOID_ABILITIES = HUMANOID_TEMPLATE.abilities.filter(id => id !== "punch");

const BEAST_TEMPLATE = {
    ...BASE_ENTITY,
    name: "Beast",
    spriteOverworld: "spritesheet",
    spritePortrait: "spritesheet",
    crySound: "dogCry",
    deathSound: "dogDeath",
    statMultipliers: { hpPerVigor: 5, staminaPerDex: 3, insightPerAtt: 0.5 },
    attributes: { vigor: 8, strength: 8, dexterity: 14, intelligence: 3, attunement: 5 },
    traits: [],
    baseStats: {
        ...BASE_ENTITY.baseStats,
        maxHp: 15, maxStamina: 8, maxInsight: 0, staminaRecovery: 10, speed: 7, critical: 0.1,
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
        crySound: "madmanCry",
        deathSound: "madmanCry",
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 9, maxStamina: 10, speed: 5
        },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "bite", "claw"],
        tags: [...HUMANOID_TEMPLATE.tags],
        traitRewards: []
    },

    // Frozen trapper: a snowbound hunter, half-lost to the cold and the madness. Fights with a spear
    // (thrust comes from the item) and has frost magic of his own (ice_shard / frigid_gale).
    "FROZEN_TRAPPER": {
        ...HUMANOID_TEMPLATE,
        name: "Frozen Trapper",
        level: 1,
        spriteOverworld: "frozenTrapperSprite",
        spritePortrait: "frozenTrapperPortrait",
        crySound: "frozenTrapperCry",
        deathSound: "frozenTrapperCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 10, strength: 11, dexterity: 12, intelligence: 8, attunement: 12
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 12, maxStamina: 14, maxInsight: 28, speed: 6, critical: 0.08,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 1, pierce: 1, ice: 3, water: 1, fire: -2 },
            baseResistance: { ice: 0.3, fire: -0.2 },
            baseAttack: { blunt: 1, slash: 0, pierce: 2, ice: 2 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "spear", head: "tattered_hood" },
        currencyReward: { min: 4, max: 12 },
        lootTableId: "frozen_trapper_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "ice_shard", "frigid_gale"],
        tags: [...HUMANOID_TEMPLATE.tags, "TRAPPER", "SNOW", "MAGICAL"]
    },

    "MAGIC_ADDICT": {
        ...HUMANOID_TEMPLATE,
        name: "Magic Addict",
        level: 1,
        spriteOverworld: "magicAddictSprite",
        spritePortrait: "magicAddictPortrait",
        crySound: "magicAddictCry",
        deathSound: "magicAddictCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 6, intelligence: 14, attunement: 12
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 11, maxStamina: 20, maxInsight: 20,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 2, pierce: 2, blunt: 1 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_arcane" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "magic_addict_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "ROTTER": {
        ...HUMANOID_TEMPLATE,
        name: "Rotter",
        level: 1,
        spritePortrait: "rotterPortrait",
        crySound: "rotterCry",
        deathSound: "rotterCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 11, strength: 11, dexterity: 8
        },
        traits: ['acidic'],
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 16, maxStamina: 10, speed: 5
        },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "mad_man_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "claw", "bite"],
        tags: [...HUMANOID_TEMPLATE.tags]
    },

    "SHADY_MERCHANT": {
        ...HUMANOID_TEMPLATE,
        name: "Shady Merchant",
        level: 1,
        spriteOverworld: "shadyMerchantSprite",
        spritePortrait: "shadyMerchantPortrait",
        crySound: "shadyMerchantCry",
        deathSound: "shadyMerchantCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 12,
            dexterity: 14,
            strength: 9
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 11,
            maxStamina: 15,
            speed: 7,
            critical: 0.10,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 2, pierce: 2 }
        },
        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "dagger",
            offHand: "dagger"
        },
        currencyReward: { min: 15, max: 40 },
        lootTableId: "mad_man_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "eviscerate"],
        tags: [...HUMANOID_TEMPLATE.tags, "MERCHANT", "ROGUE"]
    },

    "LEGIONARY": {
        ...HUMANOID_TEMPLATE,
        name: "Legionary",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "legionaryPortrait",
        crySound: "legionaryCry",
        deathSound: "legionaryCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 14, strength: 14, intelligence: 6
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 7,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: -2 },
            baseResistance: { slash: 0.25 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "mad_man_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER"]
    },

    // Recruitable companion: a free, uncursed soldier of the Altus legion (recruited in the aftermath encounter).
    // Deliberately NOT the hostile "LEGIONARY": no resistances or negative defense tricks, normal HUMANOID HP, player-like growth.
    "LEGIONARY_COMPANION": {
        ...HUMANOID_TEMPLATE,
        name: "Legionary Companion",
        level: 1,
        spriteOverworld: "legionaryCompanionSprite",
        spritePortrait: "legionaryCompanionPortrait",
         crySound: "unsheathSwordSfx",
        deathSound: "unsheathSwordSfx",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 13, strength: 13, dexterity: 9, intelligence: 6, attunement: 8
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxStamina: 12, speed: 5, critical: 0.05,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, blunt: 1, slash: 1, pierce: 1 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 0, max: 0 },
        lootTableId: null,
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: ["BIOLOGICAL", "HUMANOID", "SOLDIER", "ALTUS"]
    },

    // Cursed Alterian soldier armed with a crossbow.
    "WATCHMAN": {
        ...HUMANOID_TEMPLATE,
        name: "Watchman",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "watchmanPortrait",
        crySound: "watchmanCry",
        deathSound: "watchmanCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 10, strength: 9, dexterity: 15, intelligence: 8, attunement: 10
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 12, maxStamina: 16, speed: 7, critical: 0.12, corruption: 10,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 1, pierce: 1, dark: 2, light: -2 },
            baseResistance: { dark: 0.15, light: -0.15 },
            baseAttack: { blunt: 1, pierce: 4, dark: 1 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "crossbow" },
        currencyReward: { min: 5, max: 15 },
        lootTableId: "watchman_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: [...HUMANOID_TEMPLATE.tags, "SOLDIER", "CURSED", "ALTERIAN"]
    },

    "HOLLOW_HARVESTER": {
        ...HUMANOID_TEMPLATE,
        name: "Hollow Harvester",
        level: 1,
        spriteOverworld: "hollowHarvesterSprite",
        spritePortrait: "hollowHarvesterPortrait",
        crySound: "hollowHarvesterCry",
        deathSound: "hollowHarvesterCry",
        attributes: { vigor: 12, strength: 8, dexterity: 14, intelligence: 14, attunement: 10 },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 16, maxStamina: 15, maxInsight: 15, speed: 6,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: 3, dark: 4, arcane: 3, light: -2 },
            baseAttack: { blunt: 0, slash: 5, arcane: 3 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "scythe" },
        currencyReward: { min: 6, max: 14 },
        lootTableId: "hollow_harvester_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "spirit_reap"],
        tags: ["HUMANOID", "MAGICAL", "UNDEAD"]
    },

    "SCORCHED_VAGRANT": {
        ...HUMANOID_TEMPLATE,
        name: "Scorched Vagrant",
        level: 1,
        spriteOverworld: "scorchedVagrantSprite",
        spritePortrait: "scorchedVagrantPortrait",
        crySound: "scorchedVagrantCry",
        deathSound: "scorchedVagrantCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 9, strength: 7, dexterity: 10, intelligence: 16, attunement: 14
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 12, maxStamina: 12, maxInsight: 25, speed: 7,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, fire: 4, light: 3, arcane: 3, water: -3, ice: -2 },
            baseResistance: { fire: 0.4, light: 0.2, earth: 0.5, lightning: 0.5 },
            baseAttack: { blunt: 1, fire: 4, arcane: 2, light: 1 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_fire" },
        currencyReward: { min: 6, max: 16 },
        lootTableId: "scorched_vagrant_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "flamethrower"],
        tags: [...HUMANOID_TEMPLATE.tags, "MAGICAL", "DESERT"]
    },

    "SAND_STALKER": {
        ...HUMANOID_TEMPLATE,
        name: "Sand Stalker",
        level: 1,
        spritePortrait: "sandStalkerPortrait",
        crySound: "sandStalkerCry",
        deathSound: "sandStalkerCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 8, strength: 10, dexterity: 16, intelligence: 8, attunement: 10
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 9, maxStamina: 20, speed: 10, critical: 0.15,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, earth: 2, wind: 3, slash: 2 },
            baseResistance: { wind: 0.25, earth: 0.5, lightning: 0.5 },
            baseAttack: { slash: 4, earth: 1, wind: 2 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 4, max: 12 },
        lootTableId: "sand_stalker_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: [...HUMANOID_TEMPLATE.tags, "DESERT", "ASSASSIN"]
    },

    "MIRAGEWRIGHT": {
        ...HUMANOID_TEMPLATE,
        name: "Miragewright",
        level: 1,
        spriteOverworld: "miragewrightSprite",
        spritePortrait: "miragewrightPortrait",
        crySound: "miragewrightCry",
        deathSound: "miragewrightCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 10, strength: 6, dexterity: 12, intelligence: 18, attunement: 16
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 14, maxStamina: 15, maxInsight: 35, speed: 9,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, ice: 3, water: 2, earth: 2, dark: 4, wind: 3 },
            baseResistance: { ice: 0.2, water: 0.2, dark: 0.3, wind: 0.2, earth: 0.5, lightning: 0.5 },
            baseAttack: { blunt: 1, ice: 3, dark: 4, wind: 2 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_darkness" },
        currencyReward: { min: 10, max: 25 },
        lootTableId: "miragewright_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "flamethrower", "fireball"],
        tags: ["HUMANOID", "MAGICAL", "DESERT", "ELITE"]
    },

    "CALCIFIED_CRUSADER": {
        ...HUMANOID_TEMPLATE,
        name: "Calcified Crusader",
        level: 1,
        spriteOverworld: "calcifiedCrusaderSprite",
        spritePortrait: "calcifiedCrusaderPortrait",
        crySound: "calcifiedCrusaderCry",
        deathSound: "calcifiedCrusaderCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 18, strength: 16, dexterity: 4, intelligence: 4, attunement: 10
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 10, maxStamina: 16, speed: 3, critical: 0.05,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, slash: -2, pierce: 5, blunt: 2, earth: 5, wind: -3, water: -4 },
            baseResistance: { pierce: 0.4, earth: 0.5, lightning: 0.5, water: -0.6 },
            baseAttack: { slash: 7, earth: 3 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "glaive" },
        currencyReward: { min: 10, max: 22 },
        lootTableId: "calcified_crusader_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES],
        tags: ["HUMANOID", "CONSTRUCT", "DESERT", "SHIFTING_SANDS", "ELITE"]
    },

    // -------------------------------------------------------------------------
    // UNDEAD LINEAGE (no BIOLOGICAL tag: they are not alive)
    // -------------------------------------------------------------------------

    // Risen bones of a fallen soldier, still gripping a blade. Bone turns away stabs and cuts but shatters under blunt force;
    // holy light burns it, the dark and the cold feed it. Slow, sturdy, hits steadily.
    "SKELETAL_WARRIOR": {
        ...HUMANOID_TEMPLATE,
        name: "Skeletal Warrior",
        level: 1,
        spriteOverworld: "skeletalWarriorSprite",
        spritePortrait: "skeletalWarriorPortrait",
        crySound: "skeletalWarriorCry",
        deathSound: "skeletalWarriorCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 11, strength: 12, dexterity: 8, intelligence: 3, attunement: 4
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 13, maxStamina: 12, maxInsight: 4, speed: 4, critical: 0.05,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, blunt: -3, slash: 2, pierce: 4, ice: 2, dark: 3, light: -3, fire: -1 },
            baseResistance: { pierce: 0.3, ice: 0.2, dark: 0.4, light: -0.4, fire: -0.15 },
            baseAttack: { blunt: 1, slash: 4, dark: 1 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "shortsword" },
        currencyReward: { min: 3, max: 10 },
        lootTableId: "skeletal_warrior_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "strike"],
        tags: ["HUMANOID", "UNDEAD", "SKELETON", "SOLDIER"]
    },

    // A skull that drifts on its own, trailing cold fire. Fragile and quick; it bites and throws bolts of raw magic.
    // Nothing on the ground can reach it (earth), but light shatters it and a solid blow breaks it.
    "FLOATING_SKULL": {
        ...BASE_ENTITY,
        name: "Floating Skull",
        level: 1,
        spriteOverworld: "floatingSkullSprite",
        spritePortrait: "floatingSkullPortrait",
        crySound: "floatingSkullCry",
        deathSound: "floatingSkullCry",
        statMultipliers: { hpPerVigor: 2, staminaPerDex: 2, insightPerAtt: 2 },
        attributes: { vigor: 4, strength: 3, dexterity: 12, intelligence: 10, attunement: 12 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 7, maxStamina: 12, maxInsight: 22, staminaRecovery: 2, insightRecovery: 1, speed: 11, critical: 0.1,
            baseDefense: { blunt: -2, slash: 1, pierce: 3, earth: 4, wind: 2, dark: 4, arcane: 2, light: -4 },
            baseResistance: { earth: 0.5, dark: 0.5, arcane: 0.2, light: -0.5, wind: 0.1 },
            baseAttack: { pierce: 2, dark: 3, arcane: 2 }
        },
        currencyReward: { min: 2, max: 9 },
        lootTableId: "floating_skull_drops",
        abilities: [...BASE_ENTITY.abilities, "arcane_dart"],
        tags: ["UNDEAD", "MAGICAL", "SKULL", "FLOATING"]
    },

    // A shadowy ghost bound in broken shackles, still dragging the chains it died in. Formless: blades and blows pass
    // through it (strong physical resistance), and the dark is its element. Light burns it and raw arcane unravels it.
    // Fragile and quick, it hits with dark magic rather than a weapon.
    "SHACKLED_SPIRIT": {
        ...BASE_ENTITY,
        name: "Shackled Spirit",
        level: 1,
        spriteOverworld: "shackledSpiritSprite",
        spritePortrait: "shackledSpiritPortrait",
        crySound: "floatingSkullCry",   // placeholder: reuses the Floating Skull cry until a spirit cry exists
        deathSound: "floatingSkullCry",
        statMultipliers: { hpPerVigor: 2, staminaPerDex: 2, insightPerAtt: 2 },
        attributes: { vigor: 5, strength: 3, dexterity: 11, intelligence: 12, attunement: 14 },
        baseStats: {
            ...BASE_ENTITY.baseStats,
            maxHp: 10, maxStamina: 10, maxInsight: 24, staminaRecovery: 2, insightRecovery: 1, speed: 8, critical: 0.08,
            baseDefense: { blunt: 1, slash: 1, pierce: 1, ice: 2, earth: 3, dark: 5, arcane: -1, light: -4 },
            baseResistance: { blunt: 0.4, slash: 0.4, pierce: 0.4, ice: 0.2, earth: 0.5, dark: 0.6, arcane: -0.2, light: -0.5 },
            baseAttack: { dark: 4, arcane: 1 }
        },
        currencyReward: { min: 3, max: 10 },
        lootTableId: "floating_skull_drops",   // placeholder: reuses the Floating Skull drops until "shackled_spirit_drops" exists
        abilities: [...BASE_ENTITY.abilities, "arcane_dart", "spirit_reap"],
        tags: ["UNDEAD", "MAGICAL", "SPIRIT", "GHOST", "SHADOW", "FLOATING"]
    },

    // Skeleton mage of a forgotten order: wields both halves of the old rites. Dark: Spirit Reap (from the staff) and Raise Dead.
    // Light: Spite and Solar Beam (a two-turn charge). Brittle and slow on its feet, so it wants to be killed before the second cast;
    // light and blunt hurt it, the dark barely scratches it.
    "ANCIENT_CULTIST": {
        ...HUMANOID_TEMPLATE,
        name: "Ancient Cultist",
        level: 1,
        spriteOverworld: "ancientCultistSprite",
        spritePortrait: "ancientCultistPortrait",
        crySound: "hollowHarvesterCry",   // placeholder: reuses the Hollow Harvester cry until a cultist cry exists
        deathSound: "hollowHarvesterCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 8, strength: 4, dexterity: 9, intelligence: 16, attunement: 16
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 11, maxStamina: 10, maxInsight: 30, insightRecovery: 2, speed: 6, critical: 0.06,
            baseDefense: { ...HUMANOID_TEMPLATE.baseStats.baseDefense, blunt: -2, slash: 1, pierce: 3, ice: 2, dark: 5, arcane: 3, light: -3, fire: -1 },
            baseResistance: { pierce: 0.2, ice: 0.15, dark: 0.5, arcane: 0.15, light: -0.3, fire: -0.15 },
            baseAttack: { blunt: 1, dark: 4, light: 3 }
        },
        equipment: { ...HUMANOID_TEMPLATE.equipment, mainHand: "insight_of_darkness", head: "tattered_hood" },
        currencyReward: { min: 8, max: 20 },
        lootTableId: "ancient_cultist_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "spite", "healing_rain"],
        tags: ["HUMANOID", "UNDEAD", "SKELETON", "MAGICAL", "CULTIST"]
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
        crySound: "dogCry",
        deathSound: "dogDeath",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 6, dexterity: 12, strength: 6
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 4, maxStamina: 8, speed: 7, critical: 0.08,
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
        crySound: "wolfCry",
        deathSound: "wolfCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            dexterity: 16, strength: 10
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 13, maxStamina: 18, speed: 9, critical: 0.15,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 2 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 0, slash: 5, pierce: 7 }
        },
        lootTableId: "canine_drops",
        abilities: [...BEAST_TEMPLATE.abilities, 'howl'],
        tags: [...BEAST_TEMPLATE.tags, "CANINE"]
    },

    "SNOW_LEOPARD": {
        ...BEAST_TEMPLATE,
        name: "Snow Leopard",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "snowLeopardPortrait",
        crySound: "snowLeopardCry",
        deathSound: "snowLeopardCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 10,
            strength: 12,
            dexterity: 16,
            intelligence: 3,
            attunement: 6
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 16,
            maxStamina: 20,
            speed: 12,
            critical: 0.18,
            baseDefense: {
                ...BEAST_TEMPLATE.baseStats.baseDefense,
                ice: 5,
                water: 3,
                slash: 3,
                fire: -3
            },
            baseResistance: {
                ...BEAST_TEMPLATE.baseStats.baseResistance,
                ice: 0.40,
                fire: -0.30,
                wind: 0.20
            },
            baseAttack: {
                blunt: 2,
                slash: 7,
                pierce: 5,
                ice: 2
            }
        },
        currencyReward: { min: 4, max: 14 },
        lootTableId: "snow_leopard_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "claw","eviscerate"],
        tags: [...BEAST_TEMPLATE.tags, "FELINE"]
    },

    "CAVE_SPIDER": {
        ...BEAST_TEMPLATE,
        name: "Cave Spider",
        level: 1,
        spriteOverworld: "legionarySprite",
        spritePortrait: "caveSpiderPortrait",
        crySound: "caveSpiderCry",
        deathSound: "caveSpiderDeath",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 7,
            strength: 7,
            dexterity: 15,
            intelligence: 2,
            attunement: 4
        },
        traits: ['acidic'],
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 10,
            maxStamina: 14,
            speed: 11,
            critical: 0.12,
            baseDefense: {
                ...BEAST_TEMPLATE.baseStats.baseDefense,
                pierce: 3,
                blunt: -2,
                dark: 3,
                fire: -3
            },
            baseResistance: {
                ...BEAST_TEMPLATE.baseStats.baseResistance,
                dark: 0.25,
                fire: -0.25
            },
            baseAttack: {
                blunt: 0,
                slash: 4,
                pierce: 5
            }
        },
        currencyReward: { min: 2, max: 8 },
        lootTableId: "arachnid_drops",
        abilities: [...BEAST_TEMPLATE.abilities],
        tags: [...BEAST_TEMPLATE.tags, "ARACHNID", "INSECT", "UNDERGROUND"]
    },

    "SHACKLED_STEED": {
        ...BEAST_TEMPLATE,
        name: "Shackled Steed",
        level: 1,
        spriteOverworld: "shackledSteedSprite",
        spritePortrait: "shackledSteedPortrait",
        crySound: "shackledSteedCry",
        deathSound: "shackledSteedCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 14, dexterity: 10, strength: 10
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 16, maxStamina: 18, speed: 9, critical: 0.15,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, ice: 2 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, fire: -0.25, ice: 0.25 },
            baseAttack: { blunt: 6, slash: 2, pierce: 2 }
        },
        lootTableId: "mad_man_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "strike", "reckless_charge"],
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
            maxHp: 6, maxStamina: 15, maxInsight: 5, staminaRecovery: 3, speed: 10, critical: 0.15,
            baseDefense: { earth: 3 },
            baseResistance: { wind: 0.5, earth: 0.2 },
            baseAttack: { slash: 4, pierce: 4 }
        },
        lootTableId: "mad_man_drops",
        abilities: [...BASE_ENTITY.abilities],
        tags: ["BIOLOGICAL", "AVIAN"]
    },

    "GRIM_STAG": {
        ...BEAST_TEMPLATE,
        name: "Grim Stag",
        level: 1,
        spriteOverworld: "grimStagSprite",
        spritePortrait: "grimStagPortrait",
        crySound: "grimStagCry",
        deathSound: "grimStagCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 14, strength: 13, dexterity: 11, intelligence: 5, attunement: 4
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 20, maxStamina: 25, maxInsight: 10, speed: 11, critical: 0.08,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 4, slash: 3, pierce: 2, earth: 4, dark: 2 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.25, dark: 0.1, wind: -0.15 },
            baseAttack: { blunt: 4, slash: 2, pierce: 5, earth: 0 }
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
        crySound: "duneMawCry",
        deathSound: "duneMawCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 15, strength: 16, dexterity: 6, intelligence: 2, attunement: 4
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 19, maxStamina: 12, speed: 5,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 5, pierce: 4, earth: 4, water: 3, lightning: -3 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.5, lightning: 0.5, water: 0.15 },
            baseAttack: { blunt: 6, pierce: 4, slash: 0 }
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
        crySound: "thunderLocustCry",
        deathSound: "thunderLocustCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 5, strength: 4, dexterity: 18, intelligence: 4, attunement: 16
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 11, maxStamina: 25, speed: 20, critical: 0.15,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, lightning: 6, wind: 4, blunt: 1, earth: -3, water: -3 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, lightning: 1.0, earth: 0.5, wind: 0.25, water: -0.5 },
            baseAttack: { pierce: 2, lightning: 5, wind: 2 }
        },
        currencyReward: { min: 3, max: 12 },
        lootTableId: "thunder_locust_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "shock", "overload"],
        tags: ["BIOLOGICAL", "INSECT", "SWARM", "DESERT", "MAGICAL"]
    },

    // -------------------------------------------------------------------------
    // BOSS LINEAGE
    // -------------------------------------------------------------------------
    "POACHERS_NIGHTMARE": {
        ...BEAST_TEMPLATE,
        name: "Poacher's Nightmare",
        level: 1,
        frameSize: 192,
        spriteOverworld: "poachersNightmareSprite",
        spritePortrait: "poachersNightmarePortrait",
        crySound: "poachersNightmareCry",
        deathSound: "poachersNightmareCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 22, strength: 18, dexterity: 14, intelligence: 6, attunement: 8
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 35, maxStamina: 30, maxInsight: 10, speed: 10, critical: 0.20,
            baseDefense: { ...BEAST_TEMPLATE.baseStats.baseDefense, blunt: 1, slash: -1, pierce: -1, earth: 6, dark: 5 },
            baseResistance: { ...BEAST_TEMPLATE.baseStats.baseResistance, earth: 0.5, dark: 0.4, fire: -0.3 },
            baseAttack: { blunt: 6, slash: 7, pierce: 5, dark: 4 }
        },
        currencyReward: { min: 350, max: 800 },
        lootTableId: "boss_poachers_nightmare_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "eviscerate", "earthquake", "claw", "vine_lash"],
        tags: [...BEAST_TEMPLATE.tags, "BOSS", "ELITE"]
    },

    // War beast of the Panzerians: a huge snow tiger driven mad, bound in plate.
    // Plate makes it very hard to cut or pierce, but it is weak to blunt force and
    // lightning (metal), and it is slow for its size.
    "PANZERKAMFER": {
        ...BEAST_TEMPLATE,
        name: "Panzerkamfer",
        level: 1,
        frameSize: 192,
        spriteOverworld: "panzerkamferSprite",
        spritePortrait: "panzerkamferPortrait",
        crySound: "panzerkamferCry",
        deathSound: "panzerkamferCry",
        attributes: {
            ...BEAST_TEMPLATE.attributes,
            vigor: 20, strength: 20, dexterity: 10, intelligence: 3, attunement: 6
        },
        baseStats: {
            ...BEAST_TEMPLATE.baseStats,
            maxHp: 40, maxStamina: 28, maxInsight: 0, speed: 8, critical: 0.12,
            baseDefense: {
                ...BEAST_TEMPLATE.baseStats.baseDefense,
                blunt: 2, slash: 7, pierce: 6, ice: 6, water: 3, lightning: -3, fire: -2
            },
            baseResistance: {
                ...BEAST_TEMPLATE.baseStats.baseResistance,
                ice: 0.5, slash: 0.15, lightning: -0.3, fire: -0.25
            },
            baseAttack: { blunt: 6, slash: 9, pierce: 4, ice: 3 }
        },
        currencyReward: { min: 250, max: 600 },
        lootTableId: "boss_panzerkamfer_drops",
        abilities: [...BEAST_TEMPLATE.abilities, "claw", "eviscerate", "reckless_charge"],
        tags: [...BEAST_TEMPLATE.tags, "FELINE", "BOSS", "ELITE", "ARMORED", "PANZERIAN"]
    },

    "DARIUS_THE_GROVELER": {
        ...HUMANOID_TEMPLATE,
        name: "Darius the Groveler",
        level: 1,
        frameSize: 192,
        spriteOverworld: "dariusSprite",
        spritePortrait: "dariusTheGrovelerPortrait",
        crySound: "magicAddictCry", // He is the apex of the Magic Addicts
        deathSound: "magicAddictCry",
        attributes: {
            ...HUMANOID_TEMPLATE.attributes,
            vigor: 18, strength: 10, dexterity: 11,
            intelligence: 22,
            attunement: 18
        },
        baseStats: {
            ...HUMANOID_TEMPLATE.baseStats,
            maxHp: 62, maxStamina: 20, maxInsight: 40, speed: 8, critical: 0.1,
            baseDefense: {
                ...HUMANOID_TEMPLATE.baseStats.baseDefense,
                blunt: 1, slash: 1, pierce: 1, arcane: 6,
                light: -4,
                fire: -2
            },
            baseResistance: { arcane: 0.6, dark: 0.3, light: -0.4 },
            baseAttack: { blunt: 3, arcane: 6 }
        },
        equipment: {
            ...HUMANOID_TEMPLATE.equipment,
            mainHand: "insight_of_arcane",
            head: "tattered_hood"
        },
        currencyReward: { min: 200, max: 500 },
        lootTableId: "boss_darius_drops",
        abilities: [...REGULAR_HUMANOID_ABILITIES, "arcane_dart", "magic_missile", "meteor_shower"],
        tags: [...HUMANOID_TEMPLATE.tags, "BOSS", "ELITE", "MAGICAL"]
    }
};
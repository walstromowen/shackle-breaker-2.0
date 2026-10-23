export const TRAIT_DEFINITIONS = {
    // ==========================================
    // --- POSITIVE TRAITS ---
    // ==========================================
    'quick': {
        name: "Quick",
        description: "Naturally fleet of foot.",
        stats: { combat: { speed: 5 } }
    },
    'inquisitive': {
        name: "Inquisitive",
        description: "A keen mind that grasps the arcane quickly.",
        attributes: { intelligence: 2, attunement: 1 },
        stats: { attack: { arcane: 3 } }
    },
    'brawler': {
        name: "Brawler",
        description: "Prefers brute force over finesse.",
        stats: { attack: { blunt: 3 }, defense: { slash: -2 } }
    },
    'tough': {
        name: "Tough",
        description: "Hardy and resilient.",
        stats: { resources: { maxHp: 20 } }
    },
    'nimble': {
        name: "Nimble",
        description: "Hard to hit and quick to act.",
        stats: { combat: { evasion: 10, speed: 3 } }
    },
    'deadeye': {
        name: "Deadeye",
        description: "Strikes with lethal precision.",
        stats: { combat: { accuracy: 15, critChance: 0.10, critMultiplier: 0.5 } }
    },
    'pyromaniac': {
        name: "Pyromaniac",
        description: "Has a deep affinity for flames.",
        attributes: { attunement: 1 },
        stats: { attack: { fire: 5 }, resistance: { fire: 0.15, water: -0.10 } }
    },
    'lumbering': {
        name: "Lumbering",
        description: "Massive and slow-moving.",
        attributes: { vigor: 4, strength: 2 },
        stats: { resources: { maxHp: 30 }, combat: { speed: -5, evasion: -10 } }
    },
    'academic': {
        name: "Academic",
        description: "Well-read and highly observant.",
        attributes: { intelligence: 3, attunement: 2 },
        stats: { resources: { maxInsight: 15, insightRecovery: 2 } }
    },
    'athletic': {
        name: "Athletic",
        description: "Possesses incredible cardiovascular endurance.",
        stats: { resources: { maxStamina: 10, staminaRecovery: 5 } }
    },
    'nocturnal': {
        name: "Nocturnal",
        description: "Thrives in the darkness.",
        stats: { resistance: { dark: 0.25, light: -0.25 } }
    },
    'ironhide': {
        name: "Ironhide",
        description: "Thick, leathery skin that naturally deflects blows.",
        stats: { defense: { blunt: 2, slash: 4, pierce: 3 }, combat: { speed: -2 } }
    },

    // ==========================================
    // --- NEGATIVE TRAITS ---
    // ==========================================
    'clumsy': {
        name: "Clumsy",
        description: "Prone to stumbling.",
        stats: { combat: { critChance: -0.05, speed: -3 } }
    },
    'frail': {
        name: "Frail",
        description: "Easily broken.",
        attributes: { vigor: -2 },
        stats: { resources: { maxHp: -15 }, defense: { blunt: -2, slash: -2, pierce: -2 } }
    },
    'myopic': {
        name: "Myopic",
        description: "Struggles to see targets at a distance.",
        stats: { combat: { accuracy: -15 } }
    },
    'superstitious': {
        name: "Superstitious",
        description: "Easily frightened by the arcane.",
        stats: { resistance: { dark: -0.25, arcane: -0.25, light: -0.10 }, combat: { corruption: 5 } }
    },
    'lazy': {
        name: "Lazy",
        description: "Prefers to avoid physical exertion.",
        attributes: { dexterity: -1 },
        stats: { resources: { maxStamina: -5, staminaRecovery: -3 } }
    },
    'dull': {
        name: "Dull",
        description: "Slow-witted and completely uncreative.",
        attributes: { intelligence: -2, attunement: -2 },
        stats: { resources: { maxInsight: -10, insightRecovery: -1 } }
    },
    'sluggish': {
        name: "Sluggish",
        description: "Slow to react to incoming threats.",
        stats: { combat: { speed: -5, evasion: -8 } }
    },

    // ==========================================
    // --- CONDITIONAL TRAITS ---
    // ==========================================
    'berserker': {
        name: "Berserker",
        description: "Goes into a frenzy when wounded.",
        conditionalStats: {
            condition: "hp_below_50_percent",
            stats: { attack: { blunt: 10, slash: 10 }, combat: { critChance: 0.15 }, defense: { blunt: -5, slash: -5 } }
        }
    },
    'claustrophobic': {
        name: "Claustrophobic",
        description: "Fights desperately when cornered.",
        conditionalStats: {
            condition: "hp_below_30_percent",
            stats: { combat: { evasion: 25, speed: 10 } }
        }
    },
    'perfectionist': {
        name: "Perfectionist",
        description: "Performs flawlessly while uninjured.",
        conditionalStats: {
            condition: "hp_full",
            stats: { combat: { accuracy: 20, speed: 5, critChance: 0.10 } }
        }
    },
    'enduring': {
        name: "Enduring",
        description: "Body enters a state of absolute defense when near death.",
        conditionalStats: {
            condition: "hp_below_30_percent",
            stats: { defense: { blunt: 15, slash: 15, pierce: 15 }, resistance: { fire: 0.50, ice: 0.50, lightning: 0.50 } }
        }
    },
    'overconfident': {
        name: "Overconfident",
        description: "Hits incredibly hard right until they take their first hit.",
        conditionalStats: {
            condition: "hp_full",
            stats: { attack: { blunt: 8, slash: 8, pierce: 8 }, combat: { critChance: 0.15 } }
        }
    },

    // ==========================================
    // --- TRIGGER TRAITS ---
    // ==========================================
    'martyr': {
        name: "Martyr",
        description: "Heals allies upon death.",
        triggers: {
            onDeath: { ability: "healing_rain", battleMessage: "In death, {actor} bestows a final blessing!", animationId: "trait_activate" }
        }
    },
    'acidic': {
        name: "Acidic",
        description: "Leaves behind a dangerous pool of acid upon death.",
        triggers: {
            onDeath: { ability: "acid_pool", battleMessage: "{actor}'s remains dissolve into a highly corrosive pool of acid!", animationId: "trait_activate" }
        }
    },
    'iron_willed': {
        name: "Iron Willed",
        description: "Automatically casts Bolster at the start of battle.",
        triggers: {
            onBattleStart: { ability: "bolster", battleMessage: "{actor}'s Iron Will hardens their resolve!", animationId: "trait_activate" }
        }
    },
    'intimidating': {
        name: "Intimidating",
        description: "Automatically casts Intimidate on a random enemy at the start of combat.",
        triggers: {
            onBattleStart: { ability: "intimidate", target: "random_enemy", battleMessage: "{actor} asserts a terrifying presence!", animationId: "trait_activate" }
        }
    },
    'stealthy': {
        name: "Stealthy",
        description: "Automatically shrinks away and casts Hide at the start of combat.",
        triggers: {
            onBattleStart: { ability: "hide", battleMessage: "{actor} quickly ducks into the shadows!", animationId: "trait_activate" }
        }
    },
    'airborne': {
        name: "Airborn",
        description: "Takes to the skies at the start of battle.",
        triggers: {
            onBattleStart: { ability: "take_flight", battleMessage: "{actor} takes to the air!", animationId: "trait_activate" }
        }
    },
    'ghostly': {
        name: "Ghostly",
        description: "Exists partially out of phase with reality.",
        triggers: {
            onBattleStart: { ability: "become_ethereal", battleMessage: "{actor}'s physical form fades...", animationId: "trait_activate" }
        }
    }
};
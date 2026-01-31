export const TRAIT_DEFINITIONS = {
    // --- POSITIVE TRAITS ---
    'quick': {
        name: "Quick",
        description: "Naturally fleet of foot.",
        stats: {
            combat: { 
                speed: 5 
            }
        }
    },
    'inquisitive': {
        name: "Inquisitive",
        description: "A keen mind that grasps the arcane quickly.",
        // [FIX] Moved 'attributes' to the root level. 
        // Attributes are inputs, whereas 'stats' are usually derived outputs.
        attributes: { 
            intelligence: 2 ,
            attunement: 1 
        }
    },
    'brawler': {
        name: "Brawler",
        description: "Prefers brute force over finesse.",
        stats: {
            attack: { blunt: 3 },
            defense: { slash: -2 } 
        }
    },
    'tough': { 
        name: "Tough",
        description: "Hardy and resilient.",
        stats: {
            resources: { 
                maxHp: 20 
            }
        }
    },

    // --- NEGATIVE TRAITS ---
    'clumsy': {
        name: "Clumsy",
        description: "Prone to stumbling.",
        stats: {
            combat: {
                critChance: -0.05,
                speed: -3
            }
        }
    },

    // --- TRIGGER TRAITS ---
    'ambush_predator': {
        name: "Ambush Predator",
        description: "Starts battles with increased initiative.",
        triggers: {
            onBattleStart: { effect: "buff_speed", duration: 1 }
        }
    },
    'martyr': {
        name: "Martyr",
        description: "Heals allies upon death.",
        triggers: {
            onDeath: { effect: "heal_party_all", value: 20 }
        }
    },

    // --- REACTIVE TRAITS ---
    'vampiric': {
        name: "Vampiric",
        description: "Feeds on the life force of enemies.",
        triggers: {
            onHit: { 
                effect: "heal_self_flat", 
                value: 5 
            }
        }
    },
    'spiked_shell': {
        name: "Spiked Shell",
        description: "Hurts those who touch it.",
        triggers: {
            onDamaged: {
                effect: "damage_attacker_physical",
                value: 3
            }
        }
    },

    // --- CONDITIONAL TRAITS ---
    'berserker': {
        name: "Berserker",
        description: "Gains massive strength when near death.",
        conditionalStats: {
            condition: "hp_below_50_percent",
            stats: {
                attack: { slash: 10, blunt: 10 },
                combat: { speed: 4 },
                defense: { slash: -5 }
            }
        }
    },
    'turtle': {
        name: "Turtle",
        description: "Hunkers down when threatened.",
        conditionalStats: {
            condition: "hp_below_30_percent",
            stats: {
                defense: { slash: 10, blunt: 10, pierce: 10 },
                combat: { speed: -5 }
            }
        }
    }
};
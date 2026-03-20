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
        attributes: { 
            intelligence: 2 ,
            attunement: 1 
        },
        stats: {
            attack: { arcane: 3 }
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
    'martyr': {
        name: "Martyr",
        description: "Heals allies upon death.",
        triggers: {
            onDeath: { effect: "heal_party_all", value: 20 }
        }
    },
    'acidic': {
        name: "Acidic",
        description: "Leaves behind a dangerous pool of acid upon death.",
        triggers: {
            // Passes an ability ID directly to the battle engine!
            onDeath: { ability: "acid_pool" }
        }
    },
    'iron_willed': {
        name: "Iron Willed",
        description: "Automatically casts Bolster at the start of battle.",
        triggers: {
            onBattleStart: { ability: "bolster" } 
        }
    },

};
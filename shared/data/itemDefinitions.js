export const ItemDefinitions = {
    // --- WEAPONS ---
    "wooden_stick": {
        id: "wooden_stick",
        name: "Wooden Stick",
        slot: "mainHand",
        type: "weapon",
        description: "A sturdy branch found on the forest floor.",
        value: 5,
        icon: { col: 11, row: 0 },
        attack: { blunt: 3 }, 
        grantedAbilities: ["strike"] 
        // No upgrade data: cannot be upgraded.
    },

    "dagger": {
        id: "dagger", // Fixed from "shortsword"
        name: "Dagger",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard dagger, perfect for quick strikes.',
        value: 20,
        icon: { col: 0, row: 0 },
        attack: { pierce: 3, slash: 2 },
        grantedAbilities: ["slash"], 
        maxLevel: 3,
        statGrowth: {
            attack: { pierce: 1, slash: 1 }
        },
        abilityUnlocks: {
            2: ["quick_stab"]
        },
        upgradeCosts: {
            2: { currency: 30, materials: { "stone": 2, "leather": 1 } },
            3: { currency: 80, materials: { "iron_ingot": 1, "leather": 2 } }
        }
    },

    "shortsword": {
        id: "shortsword",
        name: "Shortsword",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard shortsword. Gets deadlier as you forge it.',
        value: 20,
        icon: { col: 1, row: 0 },
        attack: { pierce: 300, slash: 300 },
        grantedAbilities: ["slash", "thrust"],
        maxLevel: 3,
        statGrowth: {
            attack: { pierce: 2, slash: 2 }
        },
        abilityUnlocks: {
            2: ["flurry"],
            3: ["bolster"]
        },
        upgradeCosts: {
            2: { currency: 50 },
            3: { currency: 100}
        }
    },

    "handaxe": {
        id: "handaxe",
        name: "Handaxe",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard handaxe. Brutal and effective.',
        value: 20,
        icon: { col: 2, row: 0 },
        attack: { blunt: 3, slash: 3 },
        grantedAbilities: ["slash", "strike"], 
        maxLevel: 3,
        statGrowth: {
            attack: { blunt: 2, slash: 2 }
        },
        abilityUnlocks: {
            2: ["cleave"]
        },
        upgradeCosts: {
            2: { currency: 50, materials: { "stone": 3, "soft_wood": 2 } },
            3: { currency: 150, materials: { "iron_ingot": 2, "leather": 2 } }
        }
    },

    "warhammer": {
        id: "warhammer",
        name: "Warhammer",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard warhammer. Heavy and crushing.',
        value: 20,
        icon: { col: 3, row: 0 },
        attack: { blunt: 5},
        grantedAbilities: ["strike"], 
        maxLevel: 3,
        statGrowth: {
            attack: { blunt: 3 }
        },
        abilityUnlocks: {
            2: ["wild_swing"]
        },
        upgradeCosts: {
            2: { currency: 60, materials: { "iron_ingot": 2, "soft_wood": 2 } },
            3: { currency: 180, materials: { "iron_ingot": 4, "leather": 1 } }
        }
    },

    "spear": {
        id: "spear",
        name: "Spear",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard spear. Excellent reach.',
        value: 20,
        icon: { col: 3, row: 0 },
        attack: { pierce: 5},
        grantedAbilities: ["thrust"], 
        maxLevel: 3,
        statGrowth: {
            attack: { pierce: 2 }
        },
        abilityUnlocks: {
            2: ["quick_stab"]
        },
        upgradeCosts: {
            2: { currency: 40, materials: { "stone": 2, "soft_wood": 3 } },
            3: { currency: 120, materials: { "iron_ingot": 1, "soft_wood": 5 } }
        }
    },

    // --- INSIGHT WEAPONS ---
    // (Consolidating the upgrade logic for these magical items to require exotic materials or just lots of currency/stone for now)
    "insight_of_fire": {
        id: "insight_of_fire",
        name: "Insight of Fire",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a firey truth.",
        value: 20,
        icon: { col: 0, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { fire: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_water": {
        id: "insight_of_water",
        name: "Insight of Water",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a watery truth.",
        value: 20,
        icon: { col: 1, row: 1 },
        attack: { water: 5},
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { water: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_earth": {
        id: "insight_of_earth",
        name: "Insight of Earth",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into an earthy truth.",
        value: 20,
        icon: { col: 2, row: 1 },
        attack: { earth: 5},
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { earth: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_lightning": {
        id: "insight_of_lightning",
        name: "Insight of Lightning",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into an electrifying truth.",
        value: 20,
        icon: { col: 3, row: 1 },
        attack: { lightning: 5},
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { lightning: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_ice": {
        id: "insight_of_ice",
        name: "Insight of Ice",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a frozen truth.",
        value: 20,
        icon: { col: 4, row: 1 },
        attack: { ice: 5}, // Fixed from "fire"
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { ice: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_wind": {
        id: "insight_of_wind",
        name: "Insight of Wind",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a booming truth.",
        value: 20,
        icon: { col: 5, row: 1 },
        attack: { wind: 5}, // Fixed from "fire"
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { wind: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_arcane": {
        id: "insight_of_arcane",
        name: "Insight of Arcane",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into an arcane truth.",
        value: 20,
        icon: { col: 6, row: 1 },
        attack: { arcane: 5},
        grantedAbilities: ["arcane_bolt"], // Moved magic_missile to unlock
        maxLevel: 3,
        statGrowth: { attack: { arcane: 3 } },
        abilityUnlocks: { 2: ["magic_missile"] },
        upgradeCosts: {
            2: { currency: 150, materials: { "stone": 5 } },
            3: { currency: 400, materials: { "iron_ingot": 3, "stone": 10 } }
        }
    },

    "insight_of_light": {
        id: "insight_of_light",
        name: "Insight of Light",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a luminous truth.",
        value: 20,
        icon: { col: 7, row: 1 },
        attack: { light: 5}, // Fixed from "fire"
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { light: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    "insight_of_darkness": {
        id: "insight_of_darkness",
        name: "Insight of Darkness",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a shadowy truth.",
        value: 20,
        icon: { col: 8, row: 1 },
        attack: { dark: 5}, // Fixed from "fire"
        grantedAbilities: ["quick_stab"],
        maxLevel: 3,
        statGrowth: { attack: { dark: 3 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "stone": 5 } },
            3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
        }
    },

    // --- TATTERED ARMOR SET (Non-Upgradeable Starter Gear) ---
    "tattered_hood": {
        id: "tattered_hood",
        name: "Tattered Hood",
        slot: "head",
        type: "armor",
        description: "A tattered hood that barely keeps the rain off.",
        value: 8,
        icon: { col: 0, row: 0 },
        defense: { slash: 1 },
        resistance: { lightning: 0.01, ice: 0.01, wind: 0.01, light: 0.01 }
    },
    "tattered_shirt": {
        id: "tattered_shirt",
        name: "Tattered Shirt",
        slot: "torso",
        type: "armor",
        description: "A tattered shirt that offers little physical protection but breathes well.",
        value: 15,
        icon: { col: 0, row: 1 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        resistance: { pierce: 0.01 }
    },
    "tattered_gloves": {
        id: "tattered_gloves",
        name: "Tattered Gloves",
        slot: "arms",
        type: "armor",
        description: "Tattered gloves. Better than bare hands.",
        value: 5,
        icon: { col: 1, row: 2 },
        defense: { fire: 1 },
        resistance: { earth: 0.02 }
    },
    "tattered_pants": {
        id: "tattered_pants",
        name: "Tattered Pants",
        slot: "legs",
        type: "armor",
        description: "Tattered trousers.",
        value: 10,
        icon: { col: 0, row: 3 },
        defense: { blunt: 1, slash: 1 },
        resistance: { slash: 0.01 }
    },
    "tattered_boots": {
        id: "tattered_boots",
        name: "Tattered Boots",
        slot: "feet",
        type: "armor",
        description: "Tattered boots.",
        value: 6,
        icon: { col: 0, row: 4 },
        defense: { blunt: 1 },
        resistance: { fire: 0.01, earth: 0.01 }
    },

    // --- CLOTH ARMOR SET ---
    "cloth_hood": {
        id: "cloth_hood",
        name: "Cloth Hood",
        slot: "head",
        type: "armor",
        description: "A simple hood that keeps the rain off.",
        value: 8,
        icon: { col: 1, row: 0 },
        defense: { slash: 1 },
        resistance: { arcane: 0.01, light: 0.01, dark: 0.01 },
        maxLevel: 3,
        statGrowth: { defense: { slash: 1, blunt: 1 } },
        upgradeCosts: {
            2: { currency: 20, materials: { "soft_wood": 2 } },
            3: { currency: 60, materials: { "leather": 1 } }
        }
    },
    "cloth_robe": {
        id: "cloth_robe",
        name: "Cloth Robe",
        slot: "torso",
        type: "armor",
        description: "A simple woven robe.",
        value: 15,
        icon: { col: 1, row: 1 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        resistance: { fire: 0.01, ice: 0.01, arcane: 0.02 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 40, materials: { "soft_wood": 3 } },
            3: { currency: 100, materials: { "leather": 2 } }
        }
    },
    "cloth_gloves": {
        id: "cloth_gloves",
        name: "Cloth Gloves",
        slot: "arms",
        type: "armor",
        description: "Thin gloves. Better than bare hands.",
        value: 5,
        icon: { col: 1, row: 2 },
        defense: { blunt: 1 },
        resistance: { ice: 0.01 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1 } },
        upgradeCosts: {
            2: { currency: 15, materials: { "soft_wood": 1 } },
            3: { currency: 45, materials: { "leather": 1 } }
        }
    },
    "cloth_pants": {
        id: "cloth_pants",
        name: "Cloth Pants",
        slot: "legs",
        type: "armor",
        description: "Standard woven trousers.",
        value: 10,
        icon: { col: 1, row: 3 },
        defense: { blunt: 1, slash: 1 },
        resistance: { arcane: 0.01 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1 } },
        upgradeCosts: {
            2: { currency: 25, materials: { "soft_wood": 2 } },
            3: { currency: 75, materials: { "leather": 1 } }
        }
    },
    "cloth_shoes": {
        id: "cloth_shoes",
        name: "Cloth Shoes",
        slot: "feet",
        type: "armor",
        description: "Soft-soled shoes.",
        value: 6,
        icon: { col: 1, row: 4 },
        defense: { blunt: 1 },
        resistance: { fire: 0.01 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1 } },
        upgradeCosts: {
            2: { currency: 15, materials: { "soft_wood": 1 } },
            3: { currency: 45, materials: { "leather": 1 } }
        }
    },

    // --- LEATHER ARMOR SET ---
    "leather_helmet": {
        id: "leather_helmet",
        name: "Leather Helmet",
        slot: "head",
        type: "armor",
        description: "A boiled leather cap.",
        value: 15,
        icon: { col: 2, row: 0 },
        defense: { blunt: 1, slash: 2, pierce: 1 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1 } },
        upgradeCosts: {
            2: { currency: 30, materials: { "leather": 2 } },
            3: { currency: 90, materials: { "leather": 4, "iron_ingot": 1 } }
        }
    },
    "leather_armor": {
        id: "leather_armor",
        name: "Leather Armor",
        slot: "torso",
        type: "armor",
        description: "Toughened leather that provides decent protection.",
        value: 40,
        icon: { col: 2, row: 1 },
        defense: { blunt: 3, slash: 4, pierce: 2 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 2, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 80, materials: { "leather": 4 } },
            3: { currency: 200, materials: { "leather": 6, "iron_ingot": 2 } }
        }
    },
    "leather_bracers": {
        id: "leather_bracers",
        name: "Leather Bracers",
        slot: "arms",
        type: "armor",
        description: "Stiff leather arm guards.",
        value: 12,
        icon: { col: 2, row: 2 },
        defense: { blunt: 1, slash: 2, pierce: 1 },
        maxLevel: 3,
        statGrowth: { defense: { slash: 1 } },
        upgradeCosts: {
            2: { currency: 25, materials: { "leather": 2 } },
            3: { currency: 70, materials: { "leather": 3, "iron_ingot": 1 } }
        }
    },
    "leather_leggings": {
        id: "leather_leggings",
        name: "Leather Leggings",
        slot: "legs",
        type: "armor",
        description: "Thick leather chaps.",
        value: 25,
        icon: { col: 2, row: 3 },
        defense: { blunt: 2, slash: 2, pierce: 1 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1 } },
        upgradeCosts: {
            2: { currency: 50, materials: { "leather": 3 } },
            3: { currency: 130, materials: { "leather": 5, "iron_ingot": 1 } }
        }
    },
    "leather_boots": {
        id: "leather_boots",
        name: "Leather Boots",
        slot: "feet",
        type: "armor",
        description: "Sturdy leather boots with good grip.",
        value: 18,
        icon: { col: 2, row: 4 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        combat: { speed: 1 },
        maxLevel: 3,
        statGrowth: { defense: { pierce: 1 } },
        upgradeCosts: {
            2: { currency: 35, materials: { "leather": 2 } },
            3: { currency: 100, materials: { "leather": 3, "iron_ingot": 1 } }
        }
    },

    // --- IRON ARMOR SET ---
    "iron_helmet": {
        id: "iron_helmet",
        name: "Iron Helmet",
        slot: "head",
        type: "armor",
        description: "A heavy iron helm that protects the skull.",
        value: 45,
        icon: { col: 3, row: 0 },
        defense: { blunt: 2, slash: 3, pierce: 2 },
        combat: { speed: -1 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 2, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 100, materials: { "iron_ingot": 2, "leather": 1 } },
            3: { currency: 250, materials: { "iron_ingot": 4, "leather": 2 } }
        }
    },
    "iron_armor": {
        id: "iron_armor",
        name: "Iron Armor",
        slot: "torso",
        type: "armor",
        description: "Heavy iron plates that offer excellent defense.",
        value: 120,
        icon: { col: 3, row: 1 },
        defense: { blunt: 5, slash: 6, pierce: 5 },
        combat: { speed: -2 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 2, slash: 2, pierce: 2 } },
        upgradeCosts: {
            2: { currency: 200, materials: { "iron_ingot": 4, "leather": 2 } },
            3: { currency: 500, materials: { "iron_ingot": 8, "leather": 4 } }
        }
    },
    "iron_gauntlets": {
        id: "iron_gauntlets",
        name: "Iron Gauntlets",
        slot: "arms",
        type: "armor",
        description: "Plated gloves. Heavy but highly protective.",
        value: 35,
        icon: { col: 3, row: 2 },
        defense: { blunt: 2, slash: 2, pierce: 2 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 80, materials: { "iron_ingot": 2, "leather": 1 } },
            3: { currency: 200, materials: { "iron_ingot": 3, "leather": 2 } }
        }
    },
    "iron_greaves": {
        id: "iron_greaves",
        name: "Iron Greaves",
        slot: "legs",
        type: "armor",
        description: "Solid iron leg guards.",
        value: 70,
        icon: { col: 3, row: 3 },
        defense: { blunt: 3, slash: 4, pierce: 3 },
        combat: { speed: -1 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 2, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 150, materials: { "iron_ingot": 3, "leather": 2 } },
            3: { currency: 350, materials: { "iron_ingot": 6, "leather": 3 } }
        }
    },
    "iron_boots": {
        id: "iron_boots",
        name: "Iron Boots",
        slot: "feet",
        type: "armor",
        description: "Heavy iron-shod boots.",
        value: 40,
        icon: { col: 3, row: 4 },
        defense: { blunt: 2, slash: 2, pierce: 2 },
        combat: { speed: -1 },
        maxLevel: 3,
        statGrowth: { defense: { blunt: 1, slash: 1, pierce: 1 } },
        upgradeCosts: {
            2: { currency: 90, materials: { "iron_ingot": 2, "leather": 1 } },
            3: { currency: 220, materials: { "iron_ingot": 4, "leather": 2 } }
        }
    },

    // --- MATERIALS ---
    "soft_wood": {
        id: "soft_wood",
        name: "Soft Wood",
        type: "material", 
        description: "A piece of soft wood.",
        value: 5,
        icon: { col: 0, row: 0 },
        stackable: true,
        maxStack: 99
    },
     "stone": {
        id: "stone",
        name: "Stone",
        type: "material",
        description: "A rough stone.",
        value: 2,
        icon: { col: 1, row: 0 },
        stackable: true,
        maxStack: 99
    },
     "leather": {
        id: "leather",
        name: "Leather",
        type: "material",
        description: "Hide treated with tannin.",
        value: 10,
        icon: { col: 3, row: 0 },
        stackable: true,
        maxStack: 99
    },
     "iron_ingot": {
        id: "iron_ingot",
        name: "Iron Ingot",
        type: "material",
        description: "A solid ingot of iron.",
        value: 15,
        icon: { col: 5, row: 1 },
        stackable: true,
        maxStack: 99
    },

    // --- CONSUMABLES ---
    "healing_herb": {
        id: "healing_herb",
        name: "Healing Herb",
        type: "consumable", 
        description: "A simple herb that can be used to treat minor wounds.",
        value: 10,
        icon: { col: 0, row: 0 },
        useAbility: "minor_heal",
        usability: ['overworld', 'battle'], 
        stackable: true,
        maxStack: 20
    },
    "invigorating_herb": {
        id: "invigorating_herb",
        name: "Invigorating Herb",
        type: "consumable",
        description: "A refreshing herb that can be used to restore stamina.",
        value: 15,
        icon: { col: 1, row: 0 },
        useAbility: "minor_recover",
        usability: ['overworld', 'battle'],
        stackable: true,
        maxStack: 20
    },
     "illuminating_herb": {
        id: "illuminating_herb",
        name: "Illuminating Herb",
        type: "consumable",
        description: "A refreshing herb that can be used to restore insight.",
        value: 15,
        icon: { col: 2, row: 0 },
        useAbility: "minor_channel",
        usability: ['overworld', 'battle'],
        stackable: true,
        maxStack: 20
    },
    "kurtus_brew": {
        name: "Kurtus's Brew of Madness",
        type: "consumable",
        useAbility: "brew_of_madness",
        description: "Smells like ozone and bad decisions. Sets HP to 1, fills Insight.",
        icon: { col: 1, row: 1 },
        stackable: true
    },

    // --- ACCESSORIES ---
    "artifact_of_the_dev": {
        id: "artifact_of_the_dev",
        name: "Artifact of the Developer", 
        slot: "accessory",
        type: "accessory",
        description: "A testing artifact that buffs EVERYTHING.",
        value: 9999,
        icon: { col: 0, row: 5 },
        attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
        resources: { maxHp: 100, maxStamina: 50, maxInsight: 50 },
        attack: { blunt: 5, slash: 5, pierce: 5, fire: 5, ice: 5, lightning: 5, arcane: 5 },
        defense: { blunt: 5, slash: 5, pierce: 5 },
        resistance: { fire: 1.0, ice: 1.0, lightning: 1.0, arcane: 1.0 },
        critChance: 0.10, 
        critMultiplier: 0.50, 
        evasion: 0.01,
        corruption: 0.02,
        speed: 5 ,
        hpRecovery: 10,
        staminaRecovery: 20,
        insightRecovery: 5
    }
};
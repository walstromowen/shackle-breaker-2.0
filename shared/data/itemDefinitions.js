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
    },

    "dagger": {
            id: "shortsword",
            name: "Shortsword",
            slot: "mainHand",
            type: "weapon",
            description: 'A standard shortsword.',
            value: 20,
            icon: { col: 0, row: 0 },
            attack: { pierce: 3, slash: 2 },
            grantedAbilities: ["slash", "quick_stab"] 
        },

    "shortsword": {
        id: "shortsword",
        name: "Shortsword",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard shortsword.',
        value: 20,
        icon: { col: 1, row: 0 },
        attack: { pierce: 3, slash: 3 },
        grantedAbilities: ["slash", "thrust", "flurry", "bolster"] 
    },

    "handaxe": {
        id: "handaxe",
        name: "Handaxe",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard handaxe.',
        value: 20,
        icon: { col: 2, row: 0 },
        attack: { blunt: 3, slash: 3 },
        grantedAbilities: ["slash", "strike", "cleave"] 
    },

    "warhammer": {
        id: "warhammer",
        name: "Warhammer",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard warhammer.',
        value: 20,
        icon: { col: 3, row: 0 },
        attack: { blunt: 5},
        grantedAbilities: ["strike", "wild_swing"] 
    },

    "spear": {
        id: "spear",
        name: "Spear",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard spear.',
        value: 20,
        icon: { col: 3, row: 0 },
        attack: { pierce: 5},
        grantedAbilities: ["thrust", "quick_stab"] 
    },

    "insight_of_fire": {
        id: "insight_of_fire",
        name: "Insight of Fire",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a firey truth.",
        value: 20,
        icon: { col: 0, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"] 
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
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_earth": {
        id: "insight_of_earth",
        name: "Insight of Earth",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a earthy truth.",
        value: 20,
        icon: { col: 2, row: 1 },
        attack: { earth: 5},
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_lightning": {
        id: "insight_of_lightning",
        name: "Insight of Lightning",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a electrifying truth.",
        value: 20,
        icon: { col: 3, row: 1 },
        attack: {lightning: 5},
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_ice": {
        id: "insight_of_ice",
        name: "Insight of Ice",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a frozen truth.",
        value: 20,
        icon: { col: 4, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_wind": {
        id: "insight_of_wind",
        name: "Insight of Wind",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a booming truth.",
        value: 20,
        icon: { col: 5, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_arcane": {
        id: "insight_of_arcane",
        name: "Insight of Arcane",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a arcane truth.",
        value: 20,
        icon: { col: 6, row: 1 },
        attack: { arcane: 5},
        grantedAbilities: ["arcane_bolt", "magic_missile"] 
    },

    "insight_of_light": {
        id: "insight_of_light",
        name: "Insight of Light",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a luminous truth.",
        value: 20,
        icon: { col: 7, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_darkness": {
        id: "insight_of_darkness",
        name: "Insight of Darkness",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a shadowy truth.",
        value: 20,
        icon: { col: 8, row: 1 },
        attack: { fire: 5},
        grantedAbilities: ["quick_stab"] 
    },

    // --- TATTERED ARMOR SET ---
    "tattered_hood": {
        id: "tattered_hood",
        name: "Tattered Hood",
        slot: "head",
        type: "armor",
        level: 1,
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
        level: 1,
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
        level: 1,
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
        level: 1,
        description: "Tattered trousers.",
        value: 10,
        icon: { col: 0, row: 3 },
        defense: { blunt: 1, slash: 1 },
        resistance: { slash: 0.01 }
    },
    "tattered_boots": {
        id: "tattered_boots",
        name: "Tattered Boots",
        slot: "boots",
        type: "armor",
        level: 1,
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
        level: 1,
        description: "A simple hood that keeps the rain off.",
        value: 8,
        icon: { col: 1, row: 0 },
        defense: { slash: 1 },
        resistance: { arcane: 0.01, light: 0.01, dark: 0.01 }
    },
    "cloth_robe": {
        id: "cloth_robe",
        name: "Cloth Robe",
        slot: "torso",
        type: "armor",
        level: 1,
        description: "A simple woven robe. Offers little physical protection but breathes well.",
        value: 15,
        icon: { col: 1, row: 1 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        resistance: { fire: 0.01, ice: 0.01, arcane: 0.02 }
    },
    "cloth_gloves": {
        id: "cloth_gloves",
        name: "Cloth Gloves",
        slot: "arms",
        type: "armor",
        level: 1,
        description: "Thin gloves. Better than bare hands.",
        value: 5,
        icon: { col: 1, row: 2 },
        defense: { blunt: 1 },
        resistance: { ice: 0.01 }
    },
    "cloth_pants": {
        id: "cloth_pants",
        name: "Cloth Pants",
        slot: "legs",
        type: "armor",
        level: 1,
        description: "Standard woven trousers.",
        value: 10,
        icon: { col: 1, row: 3 },
        defense: { blunt: 1, slash: 1 },
        resistance: { arcane: 0.01 }
    },
    "cloth_shoes": {
        id: "cloth_shoes",
        name: "Cloth Shoes",
        slot: "boots",
        type: "armor",
        level: 1,
        description: "Soft-soled shoes.",
        value: 6,
        icon: { col: 1, row: 4 },
        defense: { blunt: 1 },
        resistance: { fire: 0.01 }
    },

    // --- LEATHER ARMOR SET ---
    "leather_helmet": {
        id: "leather_helmet",
        name: "Leather Helmet",
        slot: "head",
        type: "armor",
        level: 1,
        description: "A boiled leather cap.",
        value: 15,
        icon: { col: 2, row: 0 },
        defense: { blunt: 1, slash: 2, pierce: 1 }
    },
    "leather_armor": {
        id: "leather_armor",
        name: "Leather Armor",
        slot: "torso",
        type: "armor",
        level: 1,
        description: "Toughened leather that provides decent protection without restricting movement.",
        value: 40,
        icon: { col: 2, row: 1 },
        defense: { blunt: 3, slash: 4, pierce: 2 } 
    },
    "leather_bracers": {
        id: "leather_bracers",
        name: "Leather Bracers",
        slot: "arms",
        type: "armor",
        level: 1,
        description: "Stiff leather arm guards.",
        value: 12,
        icon: { col: 2, row: 2 },
        defense: { blunt: 1, slash: 2, pierce: 1 }
    },
    "leather_leggings": {
        id: "leather_leggings",
        name: "Leather Leggings",
        slot: "legs",
        type: "armor",
        level: 1,
        description: "Thick leather chaps.",
        value: 25,
        icon: { col: 2, row: 3 },
        defense: { blunt: 2, slash: 2, pierce: 1 }
    },
    "leather_boots": {
        id: "leather_boots",
        name: "Leather Boots",
        slot: "boots",
        type: "armor",
        level: 1,
        description: "Sturdy leather boots with good grip.",
        value: 18,
        icon: { col: 2, row: 4 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        combat: { speed: 1 }
    },

    // --- IRON ARMOR SET ---
    "iron_helmet": {
        id: "iron_helmet",
        name: "Iron Helmet",
        slot: "head",
        type: "armor",
        level: 1,
        description: "A heavy iron helm that protects the skull.",
        value: 45,
        icon: { col: 3, row: 0 },
        defense: { blunt: 2, slash: 3, pierce: 2 },
        combat: { speed: -1 } 
    },
    "iron_armor": {
        id: "iron_armor",
        name: "Iron Armor",
        slot: "torso",
        type: "armor",
        level: 1,
        description: "Heavy iron plates that offer excellent defense against physical attacks.",
        value: 120,
        icon: { col: 3, row: 1 },
        defense: { blunt: 5, slash: 6, pierce: 5 },
        combat: { speed: -2 } 
    },
    "iron_gauntlets": {
        id: "iron_gauntlets",
        name: "Iron Gauntlets",
        slot: "arms",
        type: "armor",
        level: 1,
        description: "Plated gloves. Heavy but highly protective.",
        value: 35,
        icon: { col: 3, row: 2 },
        defense: { blunt: 2, slash: 2, pierce: 2 }
    },
    "iron_greaves": {
        id: "iron_greaves",
        name: "Iron Greaves",
        slot: "legs",
        type: "armor",
        level: 1,
        description: "Solid iron leg guards.",
        value: 70,
        icon: { col: 3, row: 3 },
        defense: { blunt: 3, slash: 4, pierce: 3 },
        combat: { speed: -1 }
    },
    "iron_boots": {
        id: "iron_boots",
        name: "Iron Boots",
        slot: "boots",
        type: "armor",
        level: 1,
        description: "Heavy iron-shod boots.",
        value: 40,
        icon: { col: 3, row: 4 },
        defense: { blunt: 2, slash: 2, pierce: 2 },
        combat: { speed: -1 }
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
        useAbility: "restore_health_minor",
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
        useAbility: "restore_stamina_minor",
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
        useAbility: "restore_insight_minor",
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
        speed: 5 ,
        hpRecovery: 10,
        staminaRecovery: 20,
        insightRecovery: 5
    },
};
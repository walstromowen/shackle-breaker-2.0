export const ItemDefinitions = {
    // --- WEAPONS (No changes needed) ---
    "wooden_stick": {
        id: "wooden_stick",
        name: "Wooden Stick",
        slot: "mainHand",
        type: "weapon",
        description: "A sturdy branch found on the forest floor.",
        value: 5,
        icon: { col: 0, row: 0 },
        attack: { blunt: 3 }, 
        grantedAbilities: ["strike", "magic_missile", "earthquake", "flurry", "cleave"] 
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
        grantedAbilities: ["quick_stab"] 
    },

    "insight_of_fire": {
        id: "insight_of_fire",
        name: "Insight of Fire", // Removed accidental trailing space
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a firey truth.",
        value: 20,
        icon: { col: 0, row: 1 },
        attack: { fire: 5,  arcane: 2},
        grantedAbilities: ["quick_stab"] 
    },

    // --- ARMOR ---
    "tattered_shirt": {
        id: "tattered_shirt",
        name: "Tattered Shirt",
        slot: "torso",
        type: "armor",
        description: "It has more holes than fabric.",
        value: 2,
        icon: { col: 0, row: 2 },
        defense: { blunt: 1, slash: 1 } 
    },
    // ==========================================
    // --- CLOTH ARMOR SET (Level 1) ---
    // ==========================================
    "cloth_hood": {
        id: "cloth_hood",
        name: "Cloth Hood",
        slot: "head",
        type: "armor",
        level: 1,
        description: "A simple hood that keeps the rain off.",
        value: 8,
        icon: { col: 1, row: 1 },
        defense: { slash: 1 },
        resistance: { fire: 1, ice: 1 }
    },
    "cloth_robe": {
        id: "cloth_robe",
        name: "Cloth Robe",
        slot: "torso",
        type: "armor",
        level: 1,
        description: "A simple woven robe. Offers little physical protection but breathes well.",
        value: 15,
        icon: { col: 1, row: 2 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        resistance: { fire: 1, ice: 1, arcane: 2 }
    },
    "cloth_gloves": {
        id: "cloth_gloves",
        name: "Cloth Gloves",
        slot: "arms",
        type: "armor",
        level: 1,
        description: "Thin gloves. Better than bare hands.",
        value: 5,
        icon: { col: 1, row: 3 },
        defense: { blunt: 1 },
        resistance: { ice: 1 }
    },
    "cloth_pants": {
        id: "cloth_pants",
        name: "Cloth Pants",
        slot: "legs",
        type: "armor",
        level: 1,
        description: "Standard woven trousers.",
        value: 10,
        icon: { col: 1, row: 4 },
        defense: { blunt: 1, slash: 1 },
        resistance: { arcane: 1 }
    },
    "cloth_shoes": {
        id: "cloth_shoes",
        name: "Cloth Shoes",
        slot: "boots",
        type: "armor",
        level: 1,
        description: "Soft-soled shoes.",
        value: 6,
        icon: { col: 1, row: 5 },
        defense: { blunt: 1 },
        resistance: { fire: 1 }
    },

    // ==========================================
    // --- LEATHER ARMOR SET (Level 1) ---
    // ==========================================
    "leather_helmet": {
        id: "leather_helmet",
        name: "Leather Helmet",
        slot: "head",
        type: "armor",
        level: 1,
        description: "A boiled leather cap.",
        value: 15,
        icon: { col: 2, row: 1 },
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
        icon: { col: 2, row: 2 },
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
        icon: { col: 2, row: 3 },
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
        icon: { col: 2, row: 4 },
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
        icon: { col: 2, row: 5 },
        defense: { blunt: 1, slash: 1, pierce: 1 },
        combat: { speed: 1 } // Lightweight boots give a tiny speed boost
    },

    // ==========================================
    // --- IRON ARMOR SET (Level 1) ---
    // ==========================================
    "iron_helmet": {
        id: "iron_helmet",
        name: "Iron Helmet",
        slot: "head",
        type: "armor",
        level: 1,
        description: "A heavy iron helm that protects the skull.",
        value: 45,
        icon: { col: 3, row: 1 },
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
        icon: { col: 3, row: 2 },
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
        icon: { col: 3, row: 3 },
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
        icon: { col: 3, row: 4 },
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
        icon: { col: 3, row: 5 },
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
        icon: { col: 0, row: 3 },
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
        icon: { col: 2, row: 0 },
        useAbility: "heal_minor",
        
        // UPDATED: Now uses 'overworld' instead of 'menu' to match gameState.mode
        usability: ['overworld', 'battle'], 
        
        stackable: true,
        maxStack: 20
    },

    "kurtus_brew": {
        name: "Kurtus's Brew of Madness",
        type: "consumable", // It's an item
        useAbility: "brew_of_madness", // Links to the logic below
        description: "Smells like ozone and bad decisions. Sets HP to 1, fills Insight.",
        icon: { col: 0, row: 1 },
        stackable: true
    },

    // --- ACCESSORIES ---
    "amulet_of_the_dev": {
        id: "amulet_of_the_dev",
        name: "Amulet of the Developer", 
        slot: "accessory",
        type: "accessory",
        description: "A testing artifact that buffs EVERYTHING.",
        value: 9999,
        icon: { col: 0, row: 0 },
        attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
        resources: { maxHp: 100, maxStamina: 50, maxInsight: 50 },
        attack: { blunt: 5, slash: 5, pierce: 5, fire: 5, ice: 5, lightning: 5, arcane: 5 },
        defense: { blunt: 5, slash: 5, pierce: 5 },
        resistance: { fire: 5, ice: 5, lightning: 5, arcane: 5 },
        critChance: 0.10, 
        critMultiplier: 0.50, 
        speed: 5 ,

        hpRecovery: 10,
        staminaRecovery: 20,
        insightRecovery: 5
    },
};
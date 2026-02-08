export const ItemDefinitions = {
    // --- WEAPONS (No changes needed, defaults to unstackable) ---
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
        grantedAbilities: ["strike", "quick_stab"] 
    },

    "insight_of_fire": {
        id: "insight_of_fire",
        name: "Insight of Fire ",
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

    // --- MATERIALS (Add Stackable) ---
    "soft_wood": {
        id: "soft_wood",
        name: "Soft Wood",
        type: "material", 
        description: "A piece of soft wood.",
        value: 5,
        icon: { col: 0, row: 3 },
        
        // NEW PROPERTIES
        stackable: true,
        maxStack: 99
    },

    // --- CONSUMABLES (Add Stackable) ---
    "healing_herb": {
        id: "healing_herb",
        name: "Healing Herb",
        type: "consumable", 
        description: "A simple herb that can be used to treat minor wounds.",
        value: 10,
        icon: { col: 2, row: 0 },
        useAbility: "heal_minor",

        // NEW PROPERTIES
        stackable: true,
        maxStack: 20
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
        critMultiplier: 0.50, //Is this even applying?????
        speed: 5 
    },
};
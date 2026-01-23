/**
 * shared/data/itemDefinitions.js
 */
export const ItemDefinitions = {
    // --- WEAPONS ---
    "wooden_stick": {
        id: "wooden_stick",
        name: "Wooden Stick",
        slot: "mainHand",
        type: "weapon",
        description: "A sturdy branch found on the forest floor.",
        value: 5,
        icon: { col: 0, row: 0 },
        
        // Adds to raw damage
        attack: { blunt: 3 }, 
        
        // [CHANGED] "smash" sounds more impactful than "bonk"
        grantedAbilities: ["smash"] 
    },

    "rusty_dagger": {
        id: "rusty_dagger",
        name: "Rusty Dagger",
        slot: "mainHand",
        type: "weapon",
        description: "Sharp enough to cut, dirty enough to infect.",
        value: 15,
        icon: { col: 2, row: 0 },

        attack: { pierce: 4, slash: 2 },
        
        // A fast, piercing move
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
        icon: { col: 1, row: 0 },

        defense: { blunt: 1, slash: 1 } 
    },

    // --- ACCESSORIES ---
    "iron_ring": {
        id: "iron_ring",
        name: "Iron Ring",
        slot: "accessory",
        type: "accessory",
        description: "A crude iron loop.",
        value: 50,
        icon: { col: 3, row: 0 },

        // Test item for stat boosting
        attributes: { 
            strength: 2,
            vigor: 1
        }
    },

    // --- CONSUMABLES ---
    "healing_herb": {
        id: "healing_herb",
        name: "Healing Herb",
        type: "consumable", 
        description: "Chew on this to close wounds.",
        value: 10,
        icon: { col: 4, row: 0 },

        // Links to the healing spell logic
        useAbility: "heal_minor" 
    }
};
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
        
        // Matches Standard
        attack: { blunt: 3 }, 
        
        // Fixed typo: removed leading comma in "flurry"
        grantedAbilities: ["smash", "magic_missile", "earthquake", "flurry", "cleave"] 
    },

    "shortsword": {
        id: "shortsword",
        name: "Shortsword",
        slot: "mainHand",
        type: "weapon",
        description: "A short blade.",
        value: 20,
        icon: { col: 1, row: 0 },

        // Matches Standard
        attack: { pierce: 3, slash: 3 },
        
        grantedAbilities: ["quick_stab"] 
    },
      "insight_of_fire": {
        id: "insight_of_fire",
        name: "Insight of Fire ",
        slot: "mainHand",
        type: "weapon",
        description: "An insight into a firey truth.",
        value: 20,
        icon: { col: 0, row: 1 },

        // Matches Standard
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

    // --- ACCESSORIES ---
    "iron_ring": {
        id: "iron_ring",
        name: "Iron Ring",
        slot: "accessory",
        type: "accessory",
        description: "A crude iron loop.",
        value: 50,
        icon: { col: 3, row: 0 },

        attributes: { 
            strength: 2,
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

        useAbility: "heal_minor" 
    },

    "amulet_of_wisdom": {
        id: "amulet_of_wisdom",
        name: "Amulet of Wisdom",
        slot: "accessory",
        type: "accessory",
        description: "Tests Vigor and Attunement scaling.",
        value: 100,
        icon: { col: 3, row: 1 }, // Ensure this icon exists or pick another

        attributes: { 
            vigor: 2,       // Should add +10 Max HP
            attunement: 5,  // Should add +10 Max Insight (Mana)
            intelligence: 3 // Should add +3 Magic Attack / +1 Magic Res
        },
        
        // Test flat resource bonuses too
        resources: {
            maxStamina: 10 // Should add +10 Max Stamina directly
        }
    },
};
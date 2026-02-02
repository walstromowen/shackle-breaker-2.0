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
        grantedAbilities: ["strike", "magic_missile", "earthquake", "flurry", "cleave"] 
    },

    "shortsword": {
        id: "shortsword",
        name: "Shortsword",
        slot: "mainHand",
        type: "weapon",
        description: 'A standard shortsword. Standard issue shortsword of the Altus legion. "A shortsword is a faster longsword" - Commander Mentoras.',
        value: 20,
        icon: { col: 1, row: 0 },

        // Matches Standard
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
        name: "Amulet of the Developer", // Renamed to suit its power
        slot: "accessory",
        type: "accessory",
        description: "A testing artifact that buffs EVERYTHING.",
        value: 9999,
        icon: { col: 0, row: 0 },

        // 1. ATTRIBUTES (Tests Scaling)
        attributes: { 
            vigor: 10,          // +HP
            strength: 10,       // +Phys Dmg
            dexterity: 10,      // +Crit / Speed
            intelligence: 10,   // +Magic Dmg
            attunement: 10      // +Mana
        },
        
        // 2. FLAT RESOURCES (Tests Direct Adds)
        resources: {
            maxHp: 100,         // Should add on top of Vigor
            maxStamina: 50,     // Should add on top of base
            maxInsight: 50      // Should add on top of Attunement
        },

        // 3. ATTACK (Tests Damage Aggregation)
        // Even though it's an accessory, these should add to your total power
        attack: {
            blunt: 5, slash: 5, pierce: 5,       // Physical
            fire: 5, ice: 5, lightning: 5,       // Elemental
            arcane: 5,                  // Exotic
        },

        // 4. DEFENSE (Tests Armor Aggregation)
        defense: {
            blunt: 5, slash: 5, pierce: 5
        },

        // 5. RESISTANCE (Tests Magic Defense)
        resistance: {
            fire: 5, ice: 5, lightning: 5,
            arcane: 5,
        },

        // 6. SECONDARY (Tests misc stats if calculator supports them)
        critChance: 0.10,       // +10% Crit
        critMultiplier: 0.50,   // +50% Crit Dmg
        speed: 5                // +5 Flat Speed
    },
};
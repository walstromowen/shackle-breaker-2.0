export const ItemDefinitions = {
    "wooden_stick": {
        id: "wooden_stick",
        name: "Wooden Stick",
        slot: "mainHand",
        type: "weapon",
        damage: { blunt: 3 },
        value: 5,
        description: "A sturdy branch found on the forest floor.",
        // [NEW] Visual Data: Column 0, Row 0 on the items.png
        icon: { col: 0, row: 0 } 
    },
    "tattered_shirt": {
        id: "tattered_shirt",
        name: "Tattered Shirt",
        slot: "torso",
        type: "armor",
        defense: { blunt: 1 },
        value: 2,
        description: "It has more holes than fabric.",
        // [NEW] Visual Data: Column 1, Row 0
        icon: { col: 1, row: 0 } 
    }
};
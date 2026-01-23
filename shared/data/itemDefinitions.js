export const ItemDefinitions = {
    "wooden_stick": {
        id: "wooden_stick",
        name: "Wooden Stick",
        slot: "mainHand",
        type: "weapon",
        // [CHANGED] Renamed from 'damage' to 'attack'
        attack: { blunt: 3 }, 
        value: 5,
        description: "A sturdy branch found on the forest floor.",
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
        icon: { col: 1, row: 0 } 
    }
};
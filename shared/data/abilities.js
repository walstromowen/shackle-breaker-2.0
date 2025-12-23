export const ABILITIES = {
    'slash': {
        name: 'Slash',
        mpCost: 0,
        power: 1.2, // 120% of base attack
        element: 'physical',
        animation: 'swipe_red'
    },
    'fire_slash': {
        name: 'Fire Slash',
        mpCost: 8,
        power: 1.8,
        element: 'fire',
        statusEffect: { type: 'BURN', chance: 0.3 }
    }
};
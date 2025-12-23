export const ITEMS = {
    'iron_sword': {
        name: 'Iron Sword',
        description: 'A reliable blade of forged iron.',
        type: 'WEAPON',
        baseAtk: 10,
        rarity: 'common',
        price: 100,
        abilityIds: ['slash'] // Links to the abilities blueprint
    },
    'lava_sword': {
        name: 'Lava Sword',
        description: 'A glowing blade that pulses with heat.',
        type: 'WEAPON',
        baseAtk: 25,
        rarity: 'rare',
        price: 1500,
        abilityIds: ['fire_slash', 'burn_touch']
    }
};
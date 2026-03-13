export const StatusEffectDefinitions = {
    poison: {
        id: 'poison',
        name: 'Poison',
        animationId: "poison",
        icon: { col: 0, row: 0 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', value: -5, damageType: 'dark' } 
        ]
    },
    bleed: {
        id: 'bleed',
        name: 'Bleed',
        icon: { col: 1, row: 0 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'stamina', value: -5, damageType: 'slash' } 
        ]
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
        icon: { col: 2, row: 0 },
        defaultCharges: 1,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction' } 
        ]
    },
    thorns: {
        id: 'thorns',
        name: 'Thorns',
        icon: { col: 3, row: 0 },
        defaultCharges: 5, 
        maxStacks: 1,
        effects: [
            // Uses 'percent' instead of 'value' to calculate off incoming damage
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', percent: 0.5, damageType: 'pierce', consumeCharge: true }
        ]
    },
    living_bomb: {
        id: 'living_bomb',
        name: 'Living Bomb',
        icon: { col: 2, row: 4 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        effects: [
            // Does three completely different things at different times!
            { trigger: 'ON_TURN_START', modify: 'hp', value: -5, damageType: 'fire' },
            { trigger: 'ON_TURN_START', modify: 'stamina', value: -2 },
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', value: -50, damageType: 'fire', consumeCharge: true }
        ]
    }
};
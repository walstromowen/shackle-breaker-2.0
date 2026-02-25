export const StatusEffectDefinitions = {
    poison: {
        id: 'poison',
        name: 'Poison',
        icon: { col: 2, row: 4 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', value: -5, element: 'dark' } 
        ]
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
        icon: { col: 4, row: 2 },
        defaultCharges: 1,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction' } 
        ]
    },
    thorns: {
        id: 'thorns',
        name: 'Thorns',
        icon: { col: 1, row: 5 },
        defaultCharges: 5, 
        maxStacks: 1,
        effects: [
            // Uses 'percent' instead of 'value' to calculate off incoming damage
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', percent: 0.5, element: 'pierce', consumeCharge: true }
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
            { trigger: 'ON_TURN_START', modify: 'hp', value: -5, element: 'fire' },
            { trigger: 'ON_TURN_START', modify: 'stamina', value: -2 },
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', value: -50, element: 'fire', consumeCharge: true }
        ]
    }
};
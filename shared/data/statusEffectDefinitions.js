export const StatusEffectDefinitions = {
    poison: {
        id: 'poison',
        name: 'Poison',
        animationId: "poison",
        icon: { col: 0, row: 0 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        persistAfterCombat: true, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', value: -5, damageType: 'dark', battleMessage: "{target} suffers {amount} poison damage!" } 
        ],
    },
    bleed: {
        id: 'bleed',
        name: 'Bleed',
         animationId: "bleed",
        icon: { col: 1, row: 0 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        persistAfterCombat: true, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'stamina', value: -5, damageType: 'slash', battleMessage: "{target} loses {amount} stamina from bleeding!" } 
        ],
          traitRewards: [
            { id: 'acidic', chance: 1.0, condition: 'apply_status' },   // Gained when inflicting on an enemy
            { id: 'acidic', chance: 1.0, condition: 'receive_status' }  // Gained when an enemy inflicts it on you
        ],
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
         animationId: "frozen",
        icon: { col: 2, row: 0 },
        defaultCharges: 1,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is frozen solid and cannot move!" } 
        ]
    },
    thorns: {
        id: 'thorns',
        name: 'Thorns',
        icon: { col: 3, row: 0 },
        defaultCharges: 5, 
        maxStacks: 1,
        effects: [
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', percent: 0.5, damageType: 'pierce', consumeCharge: true, battleMessage: "Thorns reflect {amount} damage back at {target}!" }
        ]
    },
    living_bomb: {
        id: 'living_bomb',
        name: 'Living Bomb',
        icon: { col: 2, row: 4 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        effects: [
            { trigger: 'ON_TURN_START', modify: 'hp', value: -5, damageType: 'fire', battleMessage: "The bomb burns {target} for {amount} damage!" },
            { trigger: 'ON_TURN_START', modify: 'stamina', value: -2, battleMessage: "The heat drains {amount} stamina from {target}!" },
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', value: -50, damageType: 'fire', consumeCharge: true, battleMessage: "BOOM! The bomb explodes in {target}'s face for {amount} damage!" }
        ]
    },
    wet: {
        id: 'wet',
        name: 'Wet',
        icon: { col: 5, row: 0 }, 
        defaultCharges: 99, 
        maxStacks: 1, 
        modifiers: [
            { type: 'flat', target: 'resistance.lightning', value: -0.5 },
            { type: 'flat', target: 'resistance.fire', value: 0.5 } 
        ]
    },
    fortified: {
        id: 'fortified',
        name: 'Fortified',
        icon: { col: 0, row: 1 }, 
        defaultCharges: 3, 
        maxStacks: 3, 
        persistAfterCombat: false, 
        modifiers: [
            { type: 'flat', target: 'resistance.slash', value: 2.0 },
            { type: 'flat', target: 'resistance.blunt', value: 2.0 },
            { type: 'flat', target: 'resistance.pierce', value: 2.0 }
        ]
    },
    burn: {
        id: 'burn',
        name: 'Burn',
        animationId: "burn",
        icon: { col: 3, row: 0 },
        defaultCharges: 3,
        maxStacks: 1,
        persistAfterCombat: true,
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', value: -8, damageType: 'fire', battleMessage: "{target} suffers {amount} burn damage!" }
        ]
    },
    knocked_down: {
        id: 'knocked_down',
        name: 'Knocked Down',
        icon: { col: 5, row: 1 },
        defaultCharges: 1,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is knocked down and misses their turn!" }
        ]
    },
    recharging: {
        id: 'recharging',
        name: 'Recharging',
        icon: { col: 6, row: 1 },
        defaultCharges: 1,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} must recharge and cannot act!" }
        ]
    },
    bound: {
        id: 'bound',
        name: 'Bound',
         animationId: "bound",
        icon: { col: 7, row: 0 },
        defaultCharges: 2,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is bound and cannot move!" }
        ],
        modifiers: [
            { type: 'percent', target: 'evasion', value: -1.0 } // Can't dodge while tied up
        ]
    },
    paralyzed: {
        id: 'paralyzed',
        name: 'Paralyzed',
        animationId: "paralyzed",
        icon: { col: 8, row: 0 },
        defaultCharges: 2,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is fully paralyzed and cannot move!" }
        ]
    }
};
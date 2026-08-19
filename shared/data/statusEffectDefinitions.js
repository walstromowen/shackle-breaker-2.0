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
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
        animationId: "frozen",
        icon: { col: 2, row: 0 },
        defaultCharges: 3,
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
            { type: 'flat', target: 'resistance.slash', value: 1.5 },
            { type: 'flat', target: 'resistance.blunt', value: 1.5 },
            { type: 'flat', target: 'resistance.pierce', value: 1.5 }
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
            { type: 'percent', target: 'evasion', value: -1.0 }
        ]
    },
    paralyzed: {
        id: 'paralyzed',
        name: 'Paralyzed',
        animationId: "paralyzed",
        icon: { col: 6, row: 0 },
        defaultCharges: 2,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is fully paralyzed and cannot move!" }
        ]
    },

    // ==========================================
    // NEW STATUS EFFECTS
    // ==========================================
    
    enlightened: {
        id: 'enlightened',
        name: 'Enlightened',
        animationId: "enlightened",
        icon: { col: 0, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.dark', value: 1.5 },
            { type: 'percent', target: 'attack.light', value: 1.5 },
            { type: 'percent', target: 'attack.arcane', value: 1.5 }
        ]
    },
    dimmed: {
        id: 'dimmed',
        name: 'Dimmed',
        icon: { col: 1, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.dark', value: 0.5 },
            { type: 'percent', target: 'attack.light', value: 0.5 },
            { type: 'percent', target: 'attack.arcane', value: 0.5 }
        ]
    },
    blessed: {
        id: 'blessed',
        name: 'Blessed',
        animationId: "blessed",
        icon: { col: 2, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', percent: 0.05, battleMessage: "{target} is blessed and recovers {amount} HP!" }
        ]
    },
    empowered: {
        id: 'empowered',
        name: 'Empowered',
        icon: { col: 4, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.slash', value: 0.5 },
            { type: 'percent', target: 'attack.blunt', value: 0.5 },
            { type: 'percent', target: 'attack.pierce', value: 0.5 }
        ]
    },
    weakened: {
        id: 'weakened',
        name: 'Weakened',
        icon: { col: 5, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.slash', value: -0.5 },
            { type: 'percent', target: 'attack.blunt', value: -0.5 },
            { type: 'percent', target: 'attack.pierce', value: -0.5 }
        ]
    },
    attuned: {
        id: 'attuned',
        name: 'Attuned',
        icon: { col: 6, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.fire', value: 1.5 },
            { type: 'percent', target: 'attack.ice', value: 1.5 },
            { type: 'percent', target: 'attack.lightning', value: 1.5 },
            { type: 'percent', target: 'attack.earth', value: 1.5 },
            { type: 'percent', target: 'attack.water', value: 1.5 },
            { type: 'percent', target: 'attack.wind', value: 1.5 }
        ]
    },
    suppressed: {
        id: 'suppressed',
        name: 'Suppressed',
        icon: { col: 7, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.fire', value: 0.5 },
            { type: 'percent', target: 'attack.ice', value: 0.5 },
            { type: 'percent', target: 'attack.lightning', value: 0.5 },
            { type: 'percent', target: 'attack.earth', value: 0.5 },
            { type: 'percent', target: 'attack.water', value: 0.5 },
            { type: 'percent', target: 'attack.wind', value: 0.5 }
        ]
    }
};
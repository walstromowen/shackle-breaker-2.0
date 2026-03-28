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
            // Changed to battleMessage
            { trigger: 'ON_TURN_END', modify: 'hp', value: -5, damageType: 'dark', battleMessage: "{target} suffers sss{amount} poison damage!" } 
        ]
    },
    bleed: {
        id: 'bleed',
        name: 'Bleed',
        icon: { col: 1, row: 0 }, 
        defaultCharges: 3,
        maxStacks: 1, 
        persistAfterCombat: true, 
        effects: [
            { trigger: 'ON_TURN_END', modify: 'stamina', value: -5, damageType: 'slash', battleMessage: "{target} loses {amount} stamina from bleeding!" } 
        ]
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
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
        icon: { col: 5, row: 0 }, // Pick a valid sprite coordinate for a water drop!
        defaultCharges: 99,       // Effectively infinite until the weather changes
        maxStacks: 1, 
       
        // StatCalculator will automatically read these!
        modifiers: [
            // -0.5 resistance = 1.5x damage taken
            { type: 'flat', target: 'resistance.lightning', value: -0.5 },
            // +0.5 resistance = 0.5x damage taken
            { type: 'flat', target: 'resistance.fire', value: 0.5 } 
        ]
    },
    iron_skin: {
        id: 'iron_skin',
        name: 'Iron Skin',
        icon: { col: 0, row: 1 }, // Adjust this to match your sprite sheet
        defaultCharges: 3,        // Lasts for 3 turns (or until consumed/expired)
        maxStacks: 3,             // ✅ Allows stacking up to 3 times!
        persistAfterCombat: false, // Usually buffs clear after combat, but you can change this
        modifiers: [
            // Assuming +value means higher resistance (less damage taken)
            // You can adjust these values based on how your math works.
            // Example: +0.2 resistance per stack.
            { type: 'flat', target: 'resistance.slash', value: 2.0 },
            { type: 'flat', target: 'resistance.blunt', value: 2 },
            { type: 'flat', target: 'resistance.pierce', value: 2 }
        ]
    },
};
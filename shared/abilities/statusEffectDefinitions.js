export const StatusEffectDefinitions = {
    poison: {
        id: 'poison',
        name: 'Poison',
        description: "Loses 10% of max HP at the end of each turn. It stays after the fight until it wears off or is cured.",
        animationId: "poison",
        icon: { col: 0, row: 0 },
        defaultCharges: 3,
        maxStacks: 1,
        persistAfterCombat: true,
        effects: [
            // 10% of max HP every turn (at least 1), whoever it is on
            { trigger: 'ON_TURN_END', modify: 'hp', percentMax: 0.10, damageType: 'dark', battleMessage: "{target} suffers {amount} poison damage!" }
        ],
    },
    bleed: {
        id: 'bleed',
        name: 'Bleed',
        description: "Loses stamina at the end of each turn, more every turn; with no stamina left it bleeds HP instead. Recovers a third less HP and stamina, and takes 20% more slash damage. A new cut makes it worse (up to 2). It stays after the fight until it stops or is bandaged.",
        animationId: "bleed",
        icon: { col: 1, row: 0 },
        defaultCharges: 4,
        maxStacks: 2,            // every new cut makes it worse (value, drain and the penalties below all scale with the stacks)
        persistAfterCombat: true,
        /* Bleeding gets worse the longer it is left: it drains stamina, 6% of max stamina per stack on the first turn and half as much again every turn after
           (6%, 9%, 12%, 15%), and once there is no stamina left to drain it bleeds HP instead (the same share of max HP as the stamina it could not take).
           It also keeps the body from recovering between rounds, and a body that is already cut is easier to cut again. A bandage stops it. */
        effects: [
            { trigger: 'ON_TURN_END', modify: 'stamina', percentMax: 0.06, growth: 0.5, damageType: 'slash', battleMessage: "{target} loses {amount} stamina from bleeding!",
              overflow: { modify: 'hp', battleMessage: "{target} has no strength left and bleeds for {amount} damage!" } }
        ],
        modifiers: [
            { type: 'percent', target: 'hpRecovery', value: -0.33 },
            { type: 'percent', target: 'staminaRecovery', value: -0.33 },
            { type: 'flat', target: 'resistance.slash', value: -0.2 }
        ],
    },
    frozen: {
        id: 'frozen',
        name: 'Frozen',
        description: "Frozen solid: misses its turns.",
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
        description: "Hitting it hurts: half of the damage it takes is sent back at the attacker. Each time uses up one.",
        icon: { col: 3, row: 0 },
        defaultCharges: 5,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_DAMAGE_RECEIVED', target: 'attacker', modify: 'hp', percent: 0.5, damageType: 'pierce', consumeCharge: true, battleMessage: "Thorns reflect {amount} damage back at {target}!" }
        ]
    },
    /* The bear trap (abilityDefinitions.js item_bear_trap). Set it once and it waits, with no turn limit, and a trap set before a fight is still there when it starts.
       The next enemy to hit its holder in melee takes 20% of its max HP and is bound; the trap then springs and is gone. */
    trap_set: {
        id: 'trap_set',
        name: 'Trap Set',
        description: "A trap lies waiting. The next enemy to strike in melee is caught: it takes 20% of its max HP and is Bound, and the trap is spent. It waits as long as it takes, even into the next fight.",
        icon: { col: 9, row: 0 },
        defaultCharges: -1,           // until it springs
        maxStacks: 1,
        persistAfterCombat: true,
        effects: [
            {
                trigger: 'ON_DAMAGE_RECEIVED', range: 'melee', target: 'attacker',
                modify: 'hp', percentMaxHp: 0.2, damageType: 'pierce',
                applyStatus: { id: 'bound', message: "{target} is held fast by the trap!" },
                expire: true,
                battleMessage: "The trap snaps shut on {target} for {amount} damage!"
            }
        ]
    },
    living_bomb: {
        id: 'living_bomb',
        name: 'Living Bomb',
        description: "Burns for fire damage and drains stamina at the start of each turn. Whoever strikes it sets it off and takes a heavy fire blast.",
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
        description: "Soaked: takes 50% more lightning damage and 50% less fire damage.",
        icon: { col: 5, row: 0 },
        defaultCharges: 99,
        maxStacks: 1,
        modifiers: [
            { type: 'flat', target: 'resistance.lightning', value: -0.5 },
            { type: 'flat', target: 'resistance.fire', value: 0.5 }
        ]
    },
    /* The blizzard's status (weatherDefinitions.js BLIZZARD.appliedStatusId): put on everyone when a fight starts in one, like wet for rain. It does one thing:
       30% less speed (a percent modifier adds value * the stat, so -0.3 is 30% off). No effect on the turn, no message. Icon (3, 1) of the status sheet. */
    slowed: {
        id: 'slowed',
        name: 'Slowed',
        description: "30% less speed, so its turns come later.",
        icon: { col: 3, row: 2 },
        defaultCharges: 99,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'speed', value: -0.3 }
        ]
    },
    fortified: {
        id: 'fortified',
        name: 'Fortified',
        description: "Braced behind armor: slash, blunt and pierce hits barely hurt it. Up to 3 stacks.",
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
        description: "Takes fire damage at the end of each turn. It stays after the fight until it wears off or is cured.",
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
        description: "Knocked off its feet: misses its next turn. Brings a flier down.",
        icon: { col: 8, row: 0 },
        defaultCharges: 1,
        maxStacks: 1,
        cancels: ['flying'], // NEW: Instantly strips the flying status
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is knocked down and misses their turn!" }
        ]
    },
    recharging: {
        id: 'recharging',
        name: 'Recharging',
        description: "Spent by a mighty attack: misses its next turn.",
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
        description: "Held fast: misses its turns and cannot dodge. Pulls a flier down and ends Evasive.",
        animationId: "bound",
        icon: { col: 7, row: 0 },
        defaultCharges: 2,
        maxStacks: 1,
        cancels: ['flying', 'evasive'], // NEW: Nets/Binds pull flying targets down
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
        description: "Cannot move a muscle: misses its turns.",
        animationId: "paralyzed",
        icon: { col: 6, row: 0 },
        defaultCharges: 2,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_START', flag: 'skipAction', battleMessage: "{target} is fully paralyzed and cannot move!" }
        ]
    },
    enlightened: {
        id: 'enlightened',
        name: 'Enlightened',
        description: "Dark, light and arcane attacks are 150% stronger.",
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
        description: "Dark, light and arcane attacks are 50% weaker.",
        icon: { col: 1, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.dark', value: -0.5 },
            { type: 'percent', target: 'attack.light', value: -0.5 },
            { type: 'percent', target: 'attack.arcane', value: -0.5 }
        ]
    },
    /* Blessed (the Bless ability): heals 6% of max HP at the end of each of the holder's turns, for 5 turns. */
    blessed: {
        id: 'blessed',
        name: 'Blessed',
        description: "Heals 6% of max HP at the end of each turn.",
        animationId: "bless",
        icon: { col: 10, row: 0 },   // a golden heart under a halo
        defaultCharges: 5,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_END', modify: 'hp', healPercentMax: 0.06, battleMessage: "{target} is blessed and recovers {amount} HP!" }
        ]
    },
    enraged: {
        id: 'enraged',
        name: 'Enraged',
        description: "Slash, blunt and pierce attacks are 50% stronger.",
        icon: { col: 1, row: 1 },
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
        description: "Slash, blunt and pierce attacks are 50% weaker.",
        icon: { col: 1, row: 2 },
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
        description: "Fire, ice, lightning, earth, water and wind attacks are 150% stronger.",
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
        description: "Fire, ice, lightning, earth, water and wind attacks are 50% weaker.",
        icon: { col: 7, row: 2 },
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'attack.fire', value: -0.5 },
            { type: 'percent', target: 'attack.ice', value: -0.5 },
            { type: 'percent', target: 'attack.lightning', value: -0.5 },
            { type: 'percent', target: 'attack.earth', value: -0.5 },
            { type: 'percent', target: 'attack.water', value: -0.5 },
            { type: 'percent', target: 'attack.wind', value: -0.5 }
        ]
    },
    // Given by Recuperate (leather armor): 5 turns of recovery, at the end of each of the holder's turns they regain stamina equal to their stamina recovery (on top of the usual end-of-round recovery).
    second_wind: {
        id: 'second_wind',
        name: 'Second Wind',
        description: "At the end of each turn, regains stamina equal to its stamina recovery, on top of the usual recovery every round.",
        icon: { col: 7, row: 1 },     // PLACEHOLDER: shares the runner icon with Flying; draw its own
        defaultCharges: 5,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_END', modify: 'stamina', recovery: true, battleMessage: "{target} draws a second wind and regains {amount} stamina!" }
        ]
    },
    // Given by Draw Insight (cloth armor): 5 turns of calm focus, at the end of each of the holder's turns they regain insight equal to their insight recovery (on top of the usual end-of-round recovery).
    drawing_insight: {
        id: 'drawing_insight',
        name: 'Drawing Insight',
        description: "At the end of each turn, regains insight equal to its insight recovery, on top of the usual recovery every round.",
        icon: { col: 6, row: 1 },     // PLACEHOLDER: an unused arrow-up icon; draw its own
        defaultCharges: 5,
        maxStacks: 1,
        effects: [
            { trigger: 'ON_TURN_END', modify: 'insight', recovery: true, battleMessage: "{target} draws insight and regains {amount} insight!" }
        ]
    },
    evasive: {
        id: 'evasive',
        name: 'Evasive',
        description: "50% more evasion: much harder to hit.",
        animationId: "evasive",
        icon: { col: 2, row: 1 }, 
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'evasion', value: 0.5 }
        ]
    },
    // Left open after an all-out attack (Leaping Slash): physical defense is halved for a short while.
    vulnerable: {
        id: 'vulnerable',
        name: 'Vulnerable',
        description: "Left open: its slash, blunt and pierce defense is halved.",
        animationId: "vulnerable",
        icon: { col: 8, row: 2 },
        defaultCharges: 2,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'defense.slash', value: -0.5 },
            { type: 'percent', target: 'defense.blunt', value: -0.5 },
            { type: 'percent', target: 'defense.pierce', value: -0.5 }
        ]
    },
    // The Dry Kraken's head, a tentacle cut away (battleQueue.queueDeath, a dying enemy's `weakens`): 8% off every resistance it has, for each
    // tentacle lost (up to eight). It lasts the whole fight.
    severed: {
        id: 'severed',
        name: 'Severed',
        description: "A tentacle cut away: 8% less resistance to every kind of harm, for each one lost. Lasts the whole fight.",
        icon: { col: 2, row: 2 },
        defaultCharges: -1,
        maxStacks: 8,
        persistAfterCombat: false,
        modifiers: ['blunt', 'slash', 'pierce', 'fire', 'ice', 'lightning', 'earth', 'water', 'wind', 'arcane', 'dark', 'light']
            .map(type => ({ type: 'flat', target: `resistance.${type}`, value: -0.08 }))
    },
    exposed: {
        id: 'exposed',
        name: 'Exposed',
        description: "50% less evasion: easier to hit.",
        animationId: "exposed",
        icon: { col: 2, row: 2 }, 
        defaultCharges: 3,
        maxStacks: 1,
        modifiers: [
            { type: 'percent', target: 'evasion', value: -0.5 } 
        ]
    },
    
    // ==========================================
    // NEW INNATE IMMUNITY STATUS EFFECTS
    // ==========================================
    flying: {
        id: 'flying',
        name: 'Flying',
        description: "In the air: slash, blunt and pierce attacks cannot reach it. Knock it down or bind it to bring it to the ground.",
        icon: { col: 3, row: 1 },
        defaultCharges: 3, // -1 for Infinite duration
        maxStacks: 1,
        immunities: {
            
            tags: ['physical']
        }
    },
    incorporeal: {
        id: 'incorporeal',
        name: 'Incorporeal',
        description: "Without a body: slash, blunt and pierce attacks pass straight through. Only magic can hurt it.",
        icon: { col: 4, row: 1 },
        defaultCharges: 3, // Infinite duration
        maxStacks: 1,
        immunities: {
            tags: ['physical'] 
        }
    }
};

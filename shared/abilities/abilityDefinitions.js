/**
 * shared/abilities/abilityDefinitions.js
 * CENTRAL REGISTRY FOR BATTLE ABILITIES
 * Organized by Damage Type and Utility Function
 */

export const AbilityDefinitions = {
    // =========================================================================
    // 1. PHYSICAL - BLUNT
    // =========================================================================
    "punch": {
        id: "punch",
        name: "Punch",
        description: "A simple unarmed strike.",
        range: "melee",
        tags: ["physical", "contact", "blunt"],
        battleMessage: "{user} throws a heavy {ability} at {target}!",
        icon: { col: 0, row: 12 },
        speedModifier: 1.2,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 1.0,
        animationId: "punch",
        effects: [{ type: "damage", damageType: "blunt", power: 0.75 }]
    },
    "strike": {
        id: "strike",
        name: "Strike",
        description: "Strike a target with the blunt edge of one's weapon.",
        range: "melee",
        tags: ["physical", "contact", "blunt", "weapon"],
        battleMessage: "{user} lands a solid {ability} on {target}!",
        icon: { col: 0, row: 1 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 8 },
        accuracy: 1.0,
        animationId: "strike",
        effects: [{ type: "damage", damageType: "blunt", power: 1.25 }],
    },
    "shield_bash": {
        id: "shield_bash",
        name: "Shield Bash",
        description: "Slam with shield. Damage scales with your Defense.",
        range: "melee",
        tags: ["physical", "contact", "blunt", "shield"],
        battleMessage: "{user} slams into {target} with a {ability}!",
        icon: { col: 2, row: 1 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 0.90,
        animationId: "shield_bash",
        effects: [{ type: "damage", damageType: "blunt", power: 1.0, statScaling: { attacker: "defense", target: "defense" } }]
    },
    "reckless_charge": {
        id: "reckless_charge",
        name: "Reckless Charge",
        description: "A massive slam that hurts the user due to impact.",
        range: "melee",
        tags: ["physical", "contact", "blunt", "heavy"],
        battleMessage: "{user} launches into a {ability} at {target}!",
        icon: { col: 2, row: 1 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 15 },
        accuracy: 0.80,
        animationId: "reckless_charge",
        effects: [{ type: "damage", damageType: "blunt", power: 2.5, recoil: 0.25 }]
    },
    "wild_swing": {
        id: "wild_swing",
        name: "Wild Swing",
        description: "Swing blindly, hitting a random enemy.",
        range: "melee",
        tags: ["physical", "contact", "blunt", "chaotic"],
        battleMessage: "{user} unleashes a {ability}!",
        icon: { col: 1, row: 1 },
        targeting: { scope: "random_enemy", select: "random", count: 1 },
        cost: { stamina: 15 },
        accuracy: 0.70,
        animationId: "wild_swing",
        effects: [{ type: "damage", damageType: "blunt", power: 2 }]
    },
    "fire_punch": {
        id: "fire_punch",
        name: "Fire Punch",
        description: "A heavy physical strike cloaked in flames. Has a chance to burn the target.",
        range: "melee",
        tags: ["physical", "magical", "contact", "blunt", "fire"],
        battleMessage: "{user} delivers a blazing {ability} to {target}!",
        icon: { col: 0, row: 9 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 12, insight: 8 },
        accuracy: 0.90,
        animationId: "fire_punch",
        effects: [
            { type: "damage", damageType: "blunt", power: 0.8 },
            { type: "damage", damageType: "fire", power: 0.8 }
        ],
        statusEffects: [{ id: "burn", chance: 0.25, duration: 3 }]
    },

    // =========================================================================
    // 2. PHYSICAL - SLASH
    // =========================================================================
    "slash": {
        id: "slash",
        name: "Slash",
        description: "A horizontal strike with a sharp blade. Has a chance to cause bleeding.",
        range: "melee",
        tags: ["physical", "contact", "blade", "slash"],
        battleMessage: "{user} steps forward to {ability} {target}!",
        icon: { col: 0, row: 0 },
        speedModifier: 1,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "slash",
        effects: [{ type: "damage", damageType: "slash", power: 1.25 }],
        statusEffects: [{ id: "bleed", chance: 0.1, duration: 3 }],
        traitRewards: []
    },
    "uppercut": {
        id: "uppercut",
        name: "Uppercut",
        description: "A heavy strike that can knock opponents down.",
        range: "melee",
        tags: ["physical", "contact", "slash", "heavy"],
        battleMessage: "{user} delivers a brutal {ability} to {target}!",
        icon: { col: 4, row: 0 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.85,
        animationId: "uppercut",
        effects: [{ type: "damage", damageType: "slash", power: 1.5 }],
        statusEffects: [{ id: "knocked_down", chance: 0.20 }]
    },
    "execute": {
        id: "execute",
        name: "Execute",
        description: "Deals massive damage to enemies below 30% HP.",
        range: "melee",
        tags: ["physical", "contact", "blade", "slash", "lethal"],
        battleMessage: "{user} attempts to {ability} {target}!",
        icon: { col: 3, row: 0 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.95,
        animationId: "execute",
        effects: [{ type: "damage", damageType: "slash", power: 1.0, condition: { target_hp_below: 0.30, multiplier: 3 } }]
    },
    "hit_and_run": {
        id: "hit_and_run",
        name: "Hit & Run",
        description: "Strike the enemy, then switch with a reserve ally.",
        range: "melee",
        tags: ["physical", "contact", "slash", "tactical"],
        battleMessage: "{user} performs a {ability} on {target} and falls back!",
        icon: { col: 0, row: 2 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        speedModifier: 1.2,
        accuracy: 0.95,
        animationId: "hit_and_run",
        effects: [
            { type: "damage", damageType: "slash", power: 0.8 },
            { type: "switch_self", method: "menu" }
        ]
    },
    "cleave": {
        id: "cleave",
        name: "Cleave",
        description: "Swing wide to strike two enemies at once.",
        range: "melee",
        tags: ["physical", "contact", "blade", "slash", "aoe"],
        battleMessage: "{user} swings wide to {ability} the enemies!",
        icon: { col: 1, row: 0 },
        animationId: "cleave",
        targeting: { scope: "enemy", select: "multiple", count: 2 },
        cost: { stamina: 15 },
        accuracy: 0.85,
        effects: [{ type: "damage", damageType: "slash", power: 1.0 }]
    },
    "flurry": {
        id: "flurry",
        name: "Flurry",
        description: "Slash a target with a series of quick strikes.",
        range: "melee",
        tags: ["physical", "contact", "blade", "slash", "multihit"],
        battleMessage: "{user} unleashes a {ability} of strikes on {target}!",
        icon: { col: 2, row: 0 },
        animationId: "flurry",
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 25 },
        accuracy: 0.75,
        multihit: { min: 3, max: 3, distinctChecks: true },
        effects: [{ type: "damage", damageType: "slash", power: 0.75 }],
        statusEffects: [{ id: "bleed", chance: 0.10 }]
    },
    "claw": {
        id: "claw",
        name: "Claw",
        description: "Rake the target with sharp claws. May cause bleeding.",
        range: "melee",
        tags: ["physical", "contact", "slash", "beast"],
        battleMessage: "{user} slashes at {target} with a vicious {ability}!",
        icon: { col: 5, row: 0 },
        speedModifier: 1.1,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 8 },
        accuracy: 0.95,
        animationId: "claw",
        effects: [{ type: "damage", damageType: "slash", power: 1.0 }],
        statusEffects: [{ id: "bleed", chance: 0.2, duration: 3 }]
    },
    "eviscerate": {
        id: "eviscerate",
        name: "Eviscerate",
        description: "A devastating strike that deals critical damage to bleeding targets.",
        range: "melee",
        tags: ["physical", "contact", "blade", "slash", "lethal"],
        battleMessage: "{user} moves to {ability} {target} mercilessly!",
        icon: { col: 1, row: 2 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 25 },
        accuracy: 0.85,
        animationId: "eviscerate",
        effects: [{ type: "damage", damageType: "slash", power: 1.25, condition: { target_has_status: "bleed", multiplier: 2.0 } }]
    },
    "rally": {
        id: "rally",
        name: "Rally",
        description: "A rousing battle cry that raises the physical attack power of all allies.",
        range: "self",
        tags: ["support", "sound", "buff"],
        battleMessage: "{user} lets out a fierce {ability}, boosting the party's strength!",
        icon: { col: 6, row: 0 },
        targeting: { scope: "all_allies", select: "auto" },
        cost: { stamina: 15 },
        accuracy: 1.0,
        animationId: "rally",
        effects: [],
        statusEffects: [{ id: "enraged", chance: 1.0, duration: 3 }]
    },
    "intimidate": {
        id: "intimidate",
        name: "Intimidate",
        description: "A terrifying display that lowers a single target's attack power by 20% for 3 turns. Stacks up to 3 times, and using it again resets the turns.",
        range: "ranged",
        tags: ["support", "sound", "debuff", "fear"],
        battleMessage: "{user} glares intensely to {ability} {target}!",
        icon: { col: 4, row: 11 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "intimidate",
        effects: [],
        statusEffects: [{ id: "weakened", chance: 1.0, duration: 3 }]
    },
    "howl": {
        id: "howl",
        name: "Howl",
        description: "A primal howl that awakens a target's fighting spirit, raising their attack power by 20% for 3 turns. Stacks up to 3 times, and using it again resets the turns.",
        range: "ranged",
        tags: ["support", "sound", "buff", "beast"],
        battleMessage: "{user} lets out a ferocious {ability}, boosting {target}'s strength!",
        icon: { col: 3, row: 2 },
        targeting: { scope: "ally", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "howl",
        effects: [],
        statusEffects: [{ id: "enraged", chance: 1.0, duration: 3 }]
    },
    "hide": {
        id: "hide",
        name: "Hide",
        description: "The user melts into the shadows, raising their evasion by 20% for 3 turns. Stacks up to 3 times, and using it again resets the turns.",
        range: "self",
        tags: ["utility", "stealth", "buff"],
        battleMessage: "{user} uses a smoke trick to {ability} in the shadows!",
        icon: { col: 5, row: 2 },
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "hide",
        effects: [],
        statusEffects: [{ id: "evasive", chance: 1.0, duration: 3 }]
    },

    // =========================================================================
    // 3. PHYSICAL - PIERCE
    // =========================================================================
    "thrust": {
        id: "thrust",
        name: "Thrust",
        description: "A forward thrust. Has a chance to bleed the target.",
        range: "melee",
        tags: ["physical", "contact", "weapon", "pierce"],
        battleMessage: "{user} performs a piercing {ability} against {target}!",
        icon: { col: 0, row: 2 },
        speedModifier: 1,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "thrust",
        effects: [{ type: "damage", damageType: "pierce", power: 1.25 }],
        statusEffects: [{ id: "bleed", chance: 0.1, duration: 3 }]
    },
    "bite": {
        id: "bite",
        name: "Bite",
        description: "Tear at the target with sharp fangs.",
        range: "melee",
        tags: ["physical", "contact", "beast", "pierce"],
        battleMessage: "{user} sinks their teeth into {target} with a vicious {ability}!",
        icon: { col: 4, row: 2 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        animationId: "bite",
        effects: [{ type: "damage", damageType: "pierce", power: 1.0 }],
        statusEffects: [{ id: "bleed", chance: 0.15, duration: 3 }]
    },
    "quick_stab": {
        id: "quick_stab",
        name: "Quick Stab",
        description: "A fast, weak strike that often hits first.",
        range: "melee",
        tags: ["physical", "contact", "weapon", "pierce", "fast"],
        battleMessage: "{user} lunges with a {ability} at {target}!",
        icon: { col: 2, row: 2 },
        speedModifier: 1.5,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.8,
        animationId: "quick_stab",
        effects: [{ type: "damage", damageType: "pierce", power: 1.0 }]
    },
    // Thrown by the "throwing_knife" item. Plain damage, no status: the poison version below trades damage for poison.
    "item_throwing_knife": {
        id: "item_throwing_knife",
        name: "Throwing Knife",
        description: "Hurl a balanced blade at the target.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "item"],
        battleMessage: "{user} hurls a {ability} at {target}!",
        icon: { col: 10, row: 2 },            // PLACEHOLDER: shares a cell with another ability icon; point it at a free one
        animationId: "throw_dagger",
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "pierce", power: 1.25 }]
    },
    "item_poison_knife": {
        id: "item_poison_knife",
        name: "Poison Knife",
        description: "Throw a coated blade. Causes poison.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "item"],
        battleMessage: "{user} throws a {ability} at {target}!",
        icon: { col: 11, row: 2 },
        animationId: "throw_poison_dagger",
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "pierce", power: 0.5 }],
        statusEffects: [{ id: "poison", chance: 1.0, duration: 3 }]
    },
    // The Poison Knife item's throw as a dagger skill (taught by the dagger at level 3): same hit, same poison, but it costs stamina instead of using up an item.
    "throw_poison_dagger": {
        id: "throw_poison_dagger",
        name: "Throw Poison Dagger",
        description: "Throw a poison-coated dagger. Causes poison.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "dagger"],
        battleMessage: "{user} throws a poisoned dagger at {target}!",
        icon: { col: 11, row: 2 },           // shares the Poison Knife item's icon
        animationId: "throw_poison_dagger",
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        speedModifier: 1.25,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "pierce", power: 0.5 }],
        statusEffects: [{ id: "poison", chance: 1.0, duration: 3 }]
    },

    // =========================================================================
    // 4. PHYSICAL - RANGED
    // =========================================================================
    "item_throw_net": {
        id: "item_throw_net",
        name: "Throw Net",
        description: "Entangle the target, preventing movement.",
        range: "ranged",
        tags: ["physical", "projectile", "utility", "item"],
        battleMessage: "{user} tosses a {ability} at {target}!",
        icon: { col: 3, row: 8 },
        animationId: "item_throw_net",
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "ranged", power: 0.1 }],
        statusEffects: [{ id: "bound", chance: 1.0, duration: 2 }]
    },
    "loose_arrow": {
        id: "loose_arrow",
        name: "Loose Arrow",
        description: "Fire a standard arrow at the target. A reliable ranged attack.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "bow"],
        battleMessage: "{user} looses and arrow at {target}!",
        icon: { col: 6, row: 2 }, 
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 8 },
        accuracy: 0.95,
        animationId: "loose_arrow",
        effects: [{ type: "damage", damageType: "pierce", power: 1.25 }]
    },

    "quick_draw": {
        id: "quick_draw",
        name: "Quick Draw",
        description: "A rapid snapshot that often strikes before the enemy can react.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "bow", "fast"],
        battleMessage: "{user} quickly shoots {target}!",
        icon: { col: 9, row: 2 },
        speedModifier: 1.5,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.90,
        animationId: "quick_draw",
        effects: [{ type: "damage", damageType: "pierce", power: 1.0 }]
    },

    "poisoned_arrow": {
        id: "poisoned_arrow",
        name: "Poisoned Arrow",
        description: "Fire an arrow tipped in toxic venom. High chance to poison the target.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "bow", "poison"],
        battleMessage: "{user} hits {target} with a poisoned arrow!",
        icon: { col: 7, row: 2 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 12 },
        accuracy: 0.95,
        animationId: "poisoned_arrow",
        effects: [{ type: "damage", damageType: "pierce", power: 1.0 }],
        statusEffects: [{ id: "poison", chance: 0.50, duration: 3 }]
    },

    "triple_shot": {
        id: "triple_shot",
        name: "Triple Shot",
        description: "Nock and loose three arrows at once, each at a different enemy.",
        range: "ranged",
        tags: ["physical", "projectile", "weapon", "pierce", "bow", "multihit"],
        battleMessage: "{user} unleashes {ability} on {target}!",
        icon: { col: 8, row: 2 },
        speedModifier: 0.9, 
        targeting: { scope: "enemy", select: "multiple", count: 3 },
        cost: { stamina: 20 },
        accuracy: 0.85,
        animationId: "loose_arrow",
        effects: [{ type: "damage", damageType: "pierce", power: 1.0 }]
    },

    // =========================================================================
    // 5. MAGICAL - ARCANE
    // =========================================================================
    "arcane_dart": {
        id: "arcane_dart",
        name: "Arcane Dart",
        description: "Condense raw insight into a projectile. A reliable source of magical damage.",
        range: "ranged",
        tags: ["magical", "projectile", "arcane"],
        battleMessage: "{user} fires an {ability} toward {target}!",
        icon: { col: 0, row: 9 },
        animationId: "arcane_dart",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 8 },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "damage", damageType: "arcane", power: 1.25 }]
    },
    "magic_missile": {
        id: "magic_missile",
        name: "Magic Missile",
        description: "Fire three bolts. Can hit the same target multiple times.",
        range: "ranged",
        tags: ["magical", "projectile", "arcane", "multihit"],
        battleMessage: "{user} unleashes a {ability} barrage!",
        icon: { col: 1, row: 9 },
        animationId: "arcane_dart",
        targeting: { scope: "enemy", select: "multiple", count: 3, allowRepeats: true },
        cost: { insight: 12 },
        accuracy: 1.0,
        effects: [{ type: "damage", damageType: "arcane", power: 0.75 }]
    },
    // The heaviest arcane attack: a slow, roaring beam that hits enormously hard, but the user must recharge on their next turn (the 'recharging' status skips it).
    "arcane_blast": {
        id: "arcane_blast",
        name: "Arcane Blast",
        description: "Pour raw insight into a roaring beam of arcane force. Slow to gather and devastating, but the user must recharge next turn.",
        range: "ranged",
        tags: ["magical", "projectile", "arcane", "heavy"],
        battleMessage: "{user} unleashes an {ability} at {target}!",
        icon: { col: 4, row: 9 },
        animationId: "arcane_blast",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 16 },
        speedModifier: 0.85,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "arcane", power: 2.5 }],
        selfStatusEffects: [{ id: "recharging", chance: 1.0, duration: 1 }]
    },

    // =========================================================================
    // 6. MAGICAL - FIRE
    // =========================================================================
    "fireball": {
        id: "fireball",
        name: "Fireball",
        description: "Hurl a glob of volatile flame. Deals high damage with a chance to burn.",
        range: "ranged",
        tags: ["magical", "projectile", "fire"],
        battleMessage: "{user} hurls a blazing {ability} at {target}!",
        icon: { col: 0, row: 3 },
        animationId: "fireball",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 },
        speedModifier: 0.9,
        accuracy: 0.9,
        effects: [{ type: "damage", damageType: "fire", power: 1.25 }],
        statusEffects: [{ id: "burn", chance: 0.3, duration: 3 }]
    },
    "meteor_shower": {
        id: "meteor_shower",
        name: "Meteor Shower",
        description: "Calls down fiery meteors from the sky, striking random enemies 3 to 5 times.",
        range: "ranged",
        tags: ["magical", "aoe", "fire", "multihit"],
        battleMessage: "{user} calls down a devastating {ability}!",
        icon: { col: 3, row: 3 },
        speedModifier: 0.85,
        targeting: { scope: "random_enemy", select: "random", allowRepeats: true },
        cost: { insight: 5 },
        accuracy: 0.85,
        animationId: "meteor_shower",
        multihit: { min: 3, max: 5, distinctChecks: true },
        effects: [{ type: "damage", damageType: "fire", power: 1.2 }],
        statusEffects: [{ id: "burn", chance: 0.25, duration: 3 }]
    },
    "inferno": {
        id: "inferno",
        name: "Inferno",
        description: "Unleashes a devastating firestorm on all active targets. The intense heat damages the caster as well.",
        range: "ranged",
        tags: ["magical", "aoe", "fire", "heavy"],
        battleMessage: "{user} unleashes a blazing {ability}!",
        icon: { col: 2, row: 3 },
        animationId: "inferno",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { insight: 30 },
        speedModifier: 0.8,
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "fire", power: 2.5, recoil: 0.30 }]
    },
    "flamethrower": {
        id: "flamethrower",
        name: "Flamethrower",
        description: "Spews a continuous stream of fire at two enemies.",
        range: "ranged",
        tags: ["magical", "aoe", "fire"],
        battleMessage: "{user} unleashes a {ability}!",
        icon: { col: 5, row: 3 },
        animationId: "flamethrower",
        targeting: { scope: "enemy", select: "multiple", count: 2 },
        cost: { insight: 20 },
        speedModifier: 0.95,
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "fire", power: 1.0 }],
        statusEffects: [{ id: "burn", chance: 0.35, duration: 3 }]
    },

    // =========================================================================
    // 7. MAGICAL - WATER
    // =========================================================================
    "water_blast": {
        id: "water_blast",
        name: "Water Blast",
        description: "Unleash a high-pressure torrent of water. Has a 50% chance to leave the target soaked.",
        range: "ranged",
        tags: ["magical", "projectile", "water"],
        battleMessage: "{user} unleashes a {ability} at {target}!",
        icon: { col: 0, row: 8 },
        animationId: "water_blast",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 12 },
        speedModifier: 0.95,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "water", power: 1.25 }],
        statusEffects: [{ id: "wet", chance: 0.50, duration: 3 }]
    },
    "waterfall": {
        id: "waterfall",
        name: "Waterfall",
        description: "A crashing wave of water that splashes across two targets.",
        range: "ranged",
        tags: ["magical", "aoe", "water"],
        battleMessage: "{user} summons a crashing {ability}!",
        icon: { col: 1, row: 8 },
        animationId: "waterfall",
        targeting: { scope: "enemy", select: "multiple", count: 2 },
        cost: { insight: 18 },
        speedModifier: 1.0,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "water", power: 1.0 }]
    },

    // =========================================================================
    // 8. MAGICAL - ICE
    // =========================================================================
    "ice_shard": {
        id: "ice_shard",
        name: "Ice Shard",
        description: "Hurls a jagged shard of ice. Deals damage and has a chance to freeze the target.",
        range: "ranged",
        tags: ["magical", "projectile", "ice"],
        battleMessage: "{user} launches a freezing {ability} at {target}!",
        icon: { col: 0, row: 4 },
        animationId: "ice_shard",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 12 },
        speedModifier: 0.95,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "ice", power: 1.25 }],
        statusEffects: [{ id: "frozen", chance: 0.25, duration: 2 }]
    },
    "frigid_gale": {
        id: "frigid_gale",
        name: "Frigid Gale",
        description: "A blast of freezing wind that strikes up to two enemies.",
        range: "ranged",
        tags: ["magical", "aoe", "ice", "wind"],
        battleMessage: "{user} conjures a {ability}!",
        icon: { col: 1, row: 4 },
        animationId: "frigid_gale",
        targeting: { scope: "enemy", select: "multiple", count: 2 },
        cost: { insight: 16 },
        speedModifier: 1.0,
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "ice", power: 1.0 }],
        statusEffects: [{ id: "frozen", chance: 0.15, duration: 2 }]
    },

    // =========================================================================
    // 9. MAGICAL - LIGHTNING
    // =========================================================================
    "shock": {
        id: "shock",
        name: "Shock",
        description: "Shoot a a chain of electricity from one's hand. Has a chance to paralyze the target.",
        range: "ranged",
        tags: ["magical", "projectile", "lightning"],
        battleMessage: "{user} shocks {target}!",
        icon: { col: 0, row: 5 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 18 },
        accuracy: 0.95,
        animationId: "shock",
        effects: [{ type: "damage", damageType: "lightning", power: 1.25 }],
        statusEffects: [{ id: "paralyzed", chance: 0.10, duration: 2 }]
    },
    "overload": {
        id: "overload",
        name: "Overload",
        description: "Releases pent-up electricity, violently shocking all enemies.",
        range: "ranged",
        tags: ["magical", "aoe", "lightning"],
        battleMessage: "{user} lets loose a massive {ability}!",
        icon: { col: 1, row: 5 },
        animationId: "overload",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { insight: 25 },
        speedModifier: 0.90,
        accuracy: 0.95,
        effects: [{ type: "damage", damageType: "lightning", power: 1.0 }],
        statusEffects: [{ id: "paralyzed", chance: 0.20, duration: 2 }]
    },

    // =========================================================================
    // 10. MAGICAL - EARTH
    // =========================================================================
    "earthquake": {
        id: "earthquake",
        name: "Earthquake",
        description: "Shake the ground to damage the entire enemy party.",
        range: "ranged",
        tags: ["magical", "aoe", "earth", "ground"],
        battleMessage: "{user} slams the ground, triggering an {ability}!",
        icon: { col: 0, row: 6 },
        animationId: "earthquake",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 30 },
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "earth", power: 1.0 }]
    },
    "acid_pool": {
        id: "acid_pool",
        name: "Acid Pool",
        description: "Create a pool of acid that damages all enemies in the area. High chance to poison.",
        range: "ranged",
        tags: ["magical", "aoe", "earth", "poison"],
        battleMessage: "{user} conjures an {ability} beneath the enemies!",
        icon: { col: 1, row: 6 },
        animationId: "acid_pool",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 20, insight: 20 },
        accuracy: 0.90,
        effects: [{ type: "damage", damageType: "earth", power: 0.5 }],
        statusEffects: [{ id: "poison", chance: 0.5 }]
    },
    "vine_lash": {
        id: "vine_lash",
        name: "Vine Lash",
        description: "Whip the target with thorny vines. Can restrict movement.",
        range: "melee",
        tags: ["magical", "contact", "earth", "plant"],
        battleMessage: "{user} strikes {target} with a {ability}!",
        icon: { col: 3, row: 6 },
        speedModifier: 1.0,
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 8, stamina: 5 },
        accuracy: 0.95,
        animationId: "vine_lash",
        effects: [{ type: "damage", damageType: "earth", power: 1.25 }],
        statusEffects: [{ id: "bound", chance: 0.15, duration: 2 }]
    },
    "boulder_throw": {
        id: "boulder_throw",
        name: "Boulder Throw",
        description: "Hurls a massive rock at the target. Medium accuracy, but has a high chance to knock the target over.",
        range: "ranged",
        tags: ["physical", "projectile", "earth", "heavy"],
        battleMessage: "{user} hurls a {ability} at {target}!",
        icon: { col: 4, row: 6 },
        animationId: "boulder_throw",
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 18 },
        speedModifier: 0.85,
        accuracy: 0.70,
        effects: [{ type: "damage", damageType: "blunt", power: 1.00 }, { type: "damage", damageType: "earth", power: 0.5 }],
        statusEffects: [{ id: "knocked_down", chance: 0.40 }]
    },

    // =========================================================================
    // 11. MAGICAL - LIGHT
    // =========================================================================
    "solar_beam": {
        id: "solar_beam",
        name: "Solar Beam",
        description: "Gather light on turn 1, fire on turn 2.",
        range: "ranged",
        tags: ["magical", "projectile", "light", "heavy"],
        battleMessage: "{user} unleashes the stored light in a {ability} at {target}!",
        icon: { col: 3, row: 4 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 },
        accuracy: 1.0,
        behavior: "charge_attack",
        animationId: "solar_beam",
        chargeConfig: {
            statusId: "charging_solar",
            damageEffect: { type: "damage", damageType: "light", power: 2.0 }
        }
    },
    "spite": {
        id: "spite",
        name: "Spite",
        description: "A malicious light attack that deals devastating extra damage to undead targets.",
        range: "ranged",
        tags: ["magical", "projectile", "light"],
        battleMessage: "{user} strikes {target} with {ability}!",
        icon: { col: 1, row: 10 },
        animationId: "spite",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 10 },
        speedModifier: 1.1,
        accuracy: 1.0,
        effects: [{ type: "damage", damageType: "light", power: 1.0, condition: { target_has_tag: "undead", multiplier: 3.0 } }]
    },

    // =========================================================================
    // 12. MAGICAL - DARK
    // =========================================================================
    "gravity": {
        id: "gravity",
        name: "Gravity",
        description: "Crushes the target, halving their current HP.",
        range: "ranged",
        tags: ["magical", "dark", "gravity"],
        battleMessage: "{user} attempts to crush {target} with intense {ability}!",
        icon: { col: 1, row: 4 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 25 },
        accuracy: 0.90,
        animationId: "gravity",
        effects: [{ type: "damage", damageType: "dark", calculation: "percent_current", power: 0.5 }]
    },
    "spirit_reap": {
        id: "spirit_reap",
        name: "Spirit Reap",
        description: "A spectral reaping that graps at physical flesh and psychic energy. Deals dark damage to health and siphons the target's stamina to replenish your own.",
        range: "ranged",
        tags: ["magical", "dark", "leech"],
        battleMessage: "{user} reaps {target}'s spirit!",
        icon: { col: 3, row: 11 },
        animationId: "spirit_reap",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 20 },
        effects: [
            { type: "damage", damageType: "dark", power: 1.0 },
            { type: "damage", resource: "stamina", power: 0.6, drain: 1.0 }
        ]
    },
    "drain_life": {
        id: "drain_life",
        name: "Drain Life",
        description: "Absorb health from the target.",
        range: "ranged",
        tags: ["magical", "dark", "leech"],
        battleMessage: "{user} attempts to {ability} from {target}!",
        icon: { col: 0, row: 5 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 },
        accuracy: 1.0,
        animationId: "drain_life",
        effects: [{ type: "damage", damageType: "dark", power: 1.0, drain: 0.5 }]
    },

    // =========================================================================
    // 13. RESTORATION & HEALING
    // =========================================================================
    "healing_rain": {
        id: "healing_rain",
        name: "Healing Rain",
        description: "Restore health to all allies, including those in reserve.",
        range: "self",
        tags: ["magical", "support", "healing", "water", "aoe"],
        battleMessage: "{user} calls down a {ability} to restore the party!",
        icon: { col: 2, row: 5 },
        targeting: { scope: "full_ally_party", select: "auto" },
        cost: { insight: 25 },
        accuracy: 1.0,
        animationId: "healing_rain",
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.3 }]
    },
    "purify": {
        id: "purify",
        name: "Purify",
        description: "Cleanse a negative status effect from a target.",
        range: "ranged",
        tags: ["magical", "support", "healing", "light"],
        battleMessage: "{user} casts {ability} on {target}!",
        icon: { col: 0, row: 10 },
        targeting: { scope: "ally", select: "single" },
        cost: { insight: 10 },
        accuracy: 1.0,
        animationId: "purify",
        effects: [
            { type: "dispel", tags: ["poison", "bleed", "burn", "frozen", "bound", "paralyzed", "knocked_down", "wet"] },
            { type: "recover", resource: "hp", calculation: "percent", power: 0.1 }
        ]
    },
    "item_bandage": {
        id: "item_bandage",
        name: "Bandage",
        description: "Bind a wound, stop it bleeding and restore a little health.",
        range: "ranged",
        tags: ["support", "healing", "item"],
        battleMessage: "{user} binds the wound of {target} with a bandage.",
        icon: { col: 0, row: 10 },
        animationId: "purify",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.15 }, { type: "dispel", tags: ["bleed"] }]   // heals half of what a healing herb does (minor_heal 0.3)
    },
    "item_antidote": {
        id: "item_antidote",
        name: "Antidote",
        description: "Drink an antidote to cure poison and restore a little health.",
        range: "ranged",
        tags: ["support", "healing", "item"],
        battleMessage: "{user} gives {target} an antidote.",
        icon: { col: 0, row: 10 },
        animationId: "purify",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.15 }, { type: "dispel", tags: ["poison"] }]
    },
    "item_aloe": {
        id: "item_aloe",
        name: "Aloe",
        description: "Spread cooling aloe gel over a burn and restore a little health.",
        range: "ranged",
        tags: ["support", "healing", "item"],
        battleMessage: "{user} soothes the burns of {target} with aloe.",
        icon: { col: 0, row: 10 },
        animationId: "purify",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.15 }, { type: "dispel", tags: ["burn"] }]
    },
    "rest": {
        id: "rest",
        name: "Rest",
        description: "Catch your breath and steady your mind. Recovers stamina and insight.",
        range: "self",
        tags: ["physical", "support", "healing"],
        battleMessage: "{user} takes a moment to {ability} and recover.",
        icon: { col: 3, row: 12 },
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        animationId: "rest",
        effects: [
            { type: "recover", resource: "stamina", calculation: "percent", power: 0.25 },
            { type: "recover", resource: "insight", calculation: "percent", power: 0.25 }
        ]
    },
    "brew_of_madness": {
        id: "brew_of_madness",
        name: "Madness Brew",
        range: "self",
        tags: ["utility", "item", "buff"],
        battleMessage: "{user} chugs a {ability}!",
        targeting: { scope: "self" },
        animationId: "brew_of_madness",
        effects: [
            { type: "set", resource: "hp", value: 1 },
            { type: "recover", resource: "insight", calculation: "max" }
        ]
    },
    "minor_heal": {
        id: "minor_heal",
        name: "Minor Heal",
        description: "Restores a small amount of health.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 5, row: 8 },
        animationId: "minor_heal",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.3 }]
    },
    "minor_recover": {
        id: "minor_recover",
        name: "Minor Recover",
        description: "Restores a small amount of stamina.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 6, row: 8 },
        animationId: "minor_recover",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "stamina", calculation: "percent", power: 0.3 }]
    },
    "minor_channel": {
        id: "minor_channel",
        name: "Minor Channel",
        description: "Restores a small amount of insight.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 7, row: 8 },
        animationId: "minor_channel",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "insight", calculation: "percent", power: 0.3 }]
    },
    "moderate_heal": {
        id: "moderate_heal",
        name: "Moderate Heal",
        description: "Restores a moderate amount of health.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 5, row: 8 },
        animationId: "moderate_heal",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "hp", calculation: "percent", power: 0.5 }]
    },
    "moderate_recover": {
        id: "moderate_recover",
        name: "Moderate Recover",
        description: "Restores a moderate amount of stamina.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 6, row: 8 },
        animationId: "moderate_recover",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "stamina", calculation: "percent", power: 0.5 }]
    },
    "moderate_channel": {
        id: "moderate_channel",
        name: "Moderate Channel",
        description: "Restores a moderate amount of insight.",
        range: "ranged",
        tags: ["magical", "support", "healing"],
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 7, row: 8 },
        animationId: "moderate_channel",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [{ type: "recover", resource: "insight", calculation: "percent", power: 0.5 }]
    },

    // =========================================================================
    // 14. RESOURCE DRAIN & SUMMONS
    // =========================================================================
    "osmose": {
        id: "osmose",
        name: "Osmose",
        description: "Drain insight from the target.",
        range: "ranged",
        tags: ["magical", "leech", "arcane"],
        battleMessage: "{user} uses {ability} to drain insight from {target}!",
        icon: { col: 1, row: 5 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 1.0,
        animationId: "osmose",
        effects: [{ type: "damage", resource: "insight", power: 0.5, drain: 1.0 }]
    },
    "raise_skeleton": {
        id: "raise_skeleton",
        name: "Raise Dead",
        description: "Summon a skeleton warrior to fight for you.",
        range: "self",
        tags: ["magical", "summon", "dark"],
        battleMessage: "{user} uses {ability} to summon an undead ally!",
        icon: { col: 0, row: 6 },
        targeting: { scope: "space", select: "auto" },
        cost: { insight: 30 },
        accuracy: 1.0,
        animationId: "raise_skeleton",
        effects: [{ type: "summon", entityId: "skeleton_warrior", levelScale: 1.0, maxActive: 2 }]
    },
    "bear_form": {
        id: "bear_form",
        name: "Bear Form",
        description: "Transform into a bear.",
        range: "self",
        tags: ["magical", "summon", "shapeshift"],
        battleMessage: "{user} shifts into a fierce {ability}!",
        icon: { col: 1, row: 6 },
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 20 },
        accuracy: 1.0,
        animationId: "bear_form",
        effects: [{ type: "summon", entityId: "dire_bear", replaceUser: true, revertOnDeath: true }]
    },

    // =========================================================================
    // 15. UTILITY, TACTICS & TRAPS
    // =========================================================================
    "recuperate": {
        id: "recuperate",
        name: "Recuperate",
        description: "Steady your breathing and let the body recover, regaining stamina equal to your stamina recovery at the end of each of your turns for 5 turns.",
        range: "self",
        tags: ["utility", "support", "buff"],
        battleMessage: "{user} recuperates.",
        icon: { col: 5, row: 1 },
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 5 },
        speedModifier: 1.0,
        accuracy: 1.0,
        animationId: "recuperate",
        effects: [],
        statusEffects: [{ id: "second_wind", chance: 1.0, duration: 5 }]
    },
    "draw_insight": {
        id: "draw_insight",
        name: "Draw Insight",
        description: "Quiet your thoughts and gather your focus, regaining insight equal to your insight recovery at the end of each of your turns for 5 turns.",
        range: "self",
        tags: ["utility", "support", "buff", "magical"],
        battleMessage: "{user} draws insight.",
        icon: { col: 5, row: 9 },
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 5 },
        speedModifier: 1.0,
        accuracy: 1.0,
        animationId: "draw_insight",
        effects: [],
        statusEffects: [{ id: "drawing_insight", chance: 1.0, duration: 5 }]
    },
    "bolster": {
        id: "bolster",
        name: "Bolster",
        description: "Hardens your defenses, raising resistance to physical attacks by 20%. Stacks up to 3 times, and using it again resets the turns.",
        range: "self",
        tags: ["physical", "support", "buff", "tactical"],
        battleMessage: "{user} bolsters their physical defenses!",
        icon: { col: 3, row: 1 },
        targeting: { scope: "self", select: "single" },
        cost: { stamina: 15 },
        speedModifier: 1.2,
        accuracy: 1.0,
        animationId: "bolster",
        effects: [],
        statusEffects: [{ id: "fortified", chance: 1.0 }]
    },
    "baton_pass": {
        id: "baton_pass",
        name: "Baton Pass",
        description: "Switch with an ally, passing your current buffs to them.",
        range: "self",
        tags: ["utility", "tactical"],
        battleMessage: "{user} uses {ability} to switch out and pass effects!",
        icon: { col: 1, row: 2 },
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 15 },
        speedModifier: 1.0,
        accuracy: 1.0,
        animationId: "baton_pass",
        effects: [{ type: "switch_self", method: "menu", keepBuffs: true }]
    },
    "counter_stance": {
        id: "counter_stance",
        name: "Counter Stance",
        description: "Prepare to strike back against physical attacks.",
        range: "self",
        tags: ["physical", "tactical", "buff"],
        battleMessage: "{user} drops into a defensive {ability}!",
        icon: { col: 0, row: 7 },
        speedModifier: 2.0,
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 15 },
        accuracy: 1.0,
        animationId: "counter_stance",
        statusEffects: [{ id: "counter_ready", chance: 1.0, duration: 1 }]
    },
    "retreat": {
        id: "retreat",
        name: "Retreat",
        description: "The entire party attempts to escape the battle.",
        range: "self",
        tags: ["utility", "tactical", "escape"],
        battleMessage: "{user} signals the party to {ability}!",
        icon: { col: 2, row: 12 },
        targeting: { scope: "all_allies", select: "auto" },
        behavior: "flee_battle",
        animationId: "flee",
        accuracy: 1.0
    },
    "switch_combatant": {
        id: "switch_combatant",
        name: "Switch",
        description: "Swap with a reserve party member.",
        range: "self",
        tags: ["utility", "tactical"],
        battleMessage: "{user} decides to {ability} places!",
        icon: { col: 5, row: 7 },
        targeting: { scope: "ally", select: "menu" },
        behavior: "switch_party",
        animationId: "switch_combatant",
        accuracy: 1.0
    },
    // =========================================================================
    // 16. TRAIT TRIGGERS & PASSIVES
    // =========================================================================
    "take_flight": {
      id: "take_flight",
      name: "Take Flight",
      description: "The user launches into the sky, gaining an aerial advantage.",
      range: "self",
      tags: ["utility", "buff", "movement", "trait_trigger"],
      // Note: The trait's onBattleStart logic will likely override this message, 
      // but it's good practice to have a fallback here.
      battleMessage: "{user} launches into the air!", 
      icon: { col: 4, row: 2 }, 
      targeting: { scope: "self", select: "auto" },
      cost: {}, // Kept empty so it doesn't drain stamina/insight when auto-triggered
      accuracy: 1.0,
      animationId: "trait_activate",
      effects: [],
      // This applies the mechanical buff. You'll need a corresponding "flying" 
      // or "airborne" status in your StatusDefinitions to handle the actual 
      // stat changes (like evasion up or ground immunity).
      statusEffects: [{ id: "flying", chance: 1.0, duration: -1 }] 
    },
    "item_bear_trap": {
        id: "item_bear_trap",
        name: "Bear Trap",
        description: "Set a trap that snaps shut on the next enemy to strike you in melee, hurting and binding it. Usable in battle or out of it: a trap set before a fight is still there when it starts.",
        range: "self",
        tags: ["physical", "tactical", "trap", "item"],
        battleMessage: "{user} hurriedly sets a {ability}!",
        icon: { col: 2, row: 8 },
        animationId: "item_bear_trap",
        targeting: { scope: "self", select: "auto" },
        speedModifier: 1.25,
        accuracy: 1.0,
        // no duration: "trap_set" lasts until it springs. skipIfActive: setting a second one does nothing and keeps the item.
        statusEffects: [{
            id: "trap_set", chance: 1.0, skipIfActive: true,
            applyMessage: "The trap will snap shut on the next enemy to strike {user} in melee.",
            activeMessage: "A trap is already set."
        }]
    },
    "item_smoke_bomb": {
        id: "item_smoke_bomb",
        name: "Smoke Bomb",
        description: "Throw down a smoke bomb. In a fight the smoke hides one ally, raising their evasion for 3 turns. On the overworld it hides the whole party for 4 hours: no random battles.",
        context: "both",                              // in a fight, or on the overworld (the world_buff below only runs there; the evasion only in a fight)
        range: "self",
        tags: ["utility", "tactical", "item"],
        battleMessage: "{user} drops a {ability} at their feet!",
        icon: { col: 4, row: 8 },
        animationId: "item_smoke_bomb",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.25,
        accuracy: 1.0,
        // was "evasion_up", which is not a status in statusEffectDefinitions.js (the bomb did nothing); "evasive" is the +20% (per stack) evasion status.
        // skipIfActive: an ally who is already hidden is not stacked or refreshed, and the bomb is kept.
        statusEffects: [{
            id: "evasive", chance: 1.0, duration: 3, skipIfActive: true, battleOnly: true,   // battleOnly: not applied when thrown on the overworld (it would linger into the next fight)
            applyMessage: "{target} is hidden in the smoke!",
            activeMessage: "{target} is already hidden by smoke."
        }],
        // On the overworld: a world buff with no light. While it runs, the 'no_ambush' grant keeps random battles from starting (OverworldController.checkTileEvents asks
        // AbilitySystem.hasWorldGrant). Story encounters are not random battles and still happen. A second bomb does nothing (and is kept) while more than half is left.
        effects: [{
            type: "world_buff", id: "smoke_cover", name: "Smoke Cover", hours: 4,   // in-game hours (2 game minutes per real second, so 4 h = 2 real minutes)
            refreshBelow: 0.5, stillActive: "The smoke still hides you.",
            grants: ["no_ambush"],
            message: "You set off a smoke bomb and let the smoke drift over the party. Nothing will pick you out for the next {hours} hours."
        }]
    },
    // Paste into AbilityDefinitions (shared/abilities/abilityDefinitions.js), e.g. at the end of section 15 (UTILITY, TACTICS & TRAPS).
    "torchlight": {
        id: "torchlight",
        name: "Torchlight",
        description: "Light a torch. It throws a wide, warm orange light around you for 8 hours.",
        context: "overworld",                       // never offered in a battle
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "world_buff", id: "torchlight", hours: 8,   // in-game hours (2 game minutes per real second, so 8 h = 4 real minutes)
            refreshBelow: 0.5, stillActive: "Your torch is still burning well.",   // lighting another while this one has more than half left does nothing (and keeps the torch)
            light: { radius: 7, color: '255, 130, 40', maxAlpha: 0.8, flickerAmp: 0.5, flickerSpeed: 0.12 },   // the player's normal light is radius 4, '255, 200, 100', 0.5
            message: "You light a torch. It will burn for {hours} hours."
        }]
    },
    // Carried by the "meteorite" item. Frees the character it is used on from the shackles (CorruptionSystem.unshackle); anyone else is not touched and the meteorite is kept.
    "meteorite_unshackle": {
        id: "meteorite_unshackle",
        name: "Break the Shackles",
        description: "Press the meteorite to a shackled companion. Its glow burns the iron away.",
        context: "overworld",                       // never offered in a battle
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "unshackle",                       // AbilitySystem._world_unshackle
            message: "The meteorite flares and the iron falls away. {target} gasps and wakes.",
            notShackled: "{target} is not shackled."
        }]
    },
    // Paste into AbilityDefinitions next to "torchlight". Carried by the "escape_rope" item.
    "escape_rope": {
        id: "escape_rope",
        name: "Escape Rope",
        description: "Haul yourself out of a cave or other interior, back to its entrance.",
        context: "overworld",                       // never offered in a battle
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "exit_interior",                   // AbilitySystem._world_exit_interior: only works while inside (nothing is spent otherwise)
            message: "The rope pulls taut and hauls you back out to the entrance.",
            notInside: "There is nothing to escape from out here."
        }]
    },
    // Paste next to "escape_rope". Carried by the "interior_map" item.
    "read_interior_map": {
        id: "read_interior_map",
        name: "Read Map",
        description: "Unfold a map of the cave or building you are in. Its layout shows on the minimap until you leave.",
        context: "overworld",                       // never offered in a battle
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "show_interior_map",               // AbilitySystem._world_show_interior_map: only works inside (nothing is spent otherwise)
            message: "You unfold the map. The layout of this place appears on your minimap.",
            notInside: "There is nothing here to map.",
            alreadyOpen: "You already have this place mapped."
        }]
    },
    // Carried by the "waypoint" item. Plants a waypoint banner on the tile in front of the player (shared/world/waypoints.js); nothing is spent when it cannot stand there.
    "place_waypoint": {
        id: "place_waypoint",
        name: "Plant Waypoint",
        description: "Plant a banner on the ground in front of you. Open the world map to return to it later, for a price.",
        context: "overworld",
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "place_waypoint",                  // AbilitySystem._world_place_waypoint: asks the scene for the tile in front of the player
            notHere: "A banner cannot be planted here."
        }]
    },
    // Paste next to "escape_rope". Carried by the "bedroll" item.
    "use_bedroll": {
        id: "use_bedroll",
        name: "Make Camp",
        description: "Spread out the bedroll and sleep for twelve hours. The day turns to night, or the night to day.",
        context: "overworld",
        range: "self",
        tags: ["utility", "item"],
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [{
            type: "advance_time",                    // AbilitySystem._world_advance_time: fade out, move the clock while the screen is dark, fade in (no encounter)
            hours: 12,                               // the same twelve hours as resting at a bonfire
            message: "You spread out the bedroll and sleep."
        }]
    },
};

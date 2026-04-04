/**
 * shared/data/abilityDefinitions.js
 * CENTRAL REGISTRY FOR BATTLE ABILITIES
 */

export const AbilityDefinitions = {

    // =========================================================================
    // 0. BASIC / INNATE
    // =========================================================================

    "punch": {
        id: "punch",
        name: "Punch",
        description: "A simple unarmed strike.",
        battleMessage: "{user} throws a heavy {ability} at {target}!",
        icon: { col: 0, row: 12 },
        speedModifier: 1.2,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 1.0, 
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "blunt", power: 0.5 } 
        ]
    },

    "slash": {
        id: "slash",
        name: "Slash",
        description: "A horizontal strike with a sharp blade. Has a chance to cause bleeding.",
        battleMessage: "{user} steps forward to {ability} {target}!",
        icon: { col: 0, row: 0 },
        speedModifier: 1, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0, 
        animationId: "slash",
        effects: [
            { type: "damage", damageType: "pierce", power: 1.0 } 
        ],
        statusEffects: [
            { id: "bleed", chance: 0.1, duration: 3 } 
        ]
    },

    "strike": {
        id: "strike",
        name: "Strike",
        description: "Strike a target with the blunt edge of one's weapon.",
        battleMessage: "{user} lands a solid {ability} on {target}!",
        icon: { col: 0, row: 1 },
        speedModifier: 1.0, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 8 },
        accuracy: 1.0, 
        animationId: "strike",
        effects: [
            { type: "damage", damageType: "blunt", power: 1.0 } 
        ],
        
    },

    "thrust": {
        id: "thrust",
        name: "Thrust",
        description: "A forward thrust. Has a chance to bleed the target.",
        battleMessage: "{user} performs a piercing {ability} against {target}!",
        icon: { col: 0, row: 2 },
        speedModifier: 1, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0, 
        animationId: "stab",
        effects: [
            { type: "damage", damageType: "pierce", power: 1.0 } 
        ],
        statusEffects: [
            { id: "bleed", chance: 0.1, duration: 3 } 
        ]
    },

    "bite": {
        id: "bite",
        name: "Bite",
        description: "Tear at the target with sharp fangs.",
        battleMessage: "{user} sinks their teeth into {target} with a vicious {ability}!",
        icon: { col: 1, row: 12 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 1.0, 
        animationId: "bite",
        effects: [
            { type: "damage", damageType: "pierce", power: 0.85 }
        ],
        statusEffects: [
            { id: "bleed", chance: 0.15, duration: 3 } 
        ]
    },
    "arcane_bolt": {
        id: "arcane_bolt",
        name: "Arcane Bolt",
        description: "Condense raw insight into a projectile. A reliable source of magical damage.",
        battleMessage: "{user} fires an {ability} toward {target}!",
        icon: { col: 1, row: 9 }, 
        animationId: "magic_missile",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 8 }, 
        speedModifier: 1.0, 
        accuracy: 1.0, 
        effects: [
            { 
                type: "damage", 
                damageType: "arcane", 
                power: 1.2 
            }
        ]
    },
    "fireball": {
        id: "fireball",
        name: "Fireball",
        description: "Hurl a glob of volatile flame. Deals high damage with a chance to burn.",
        battleMessage: "{user} hurls a blazing {ability} at {target}!",
        icon: { col: 0, row: 9 }, 
        animationId: "fireball_cast",
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 }, 
        speedModifier: 0.9, 
        accuracy: 0.9,      
        effects: [
            { 
                type: "damage", 
                damageType: "fire", 
                power: 1.8 
            }
        ],
        statusEffects: [
            { id: "burn", chance: 0.3, duration: 3 } 
        ]
    },

    "bolster": {
        id: "bolster",
        name: "Bolster",
        description: "Hardens your defenses to increase resistance against physical attacks. Can be stacked up to 3 times.",
        battleMessage: "{user} uses {ability} to harden their defenses!",
        icon: { col: 2, row: 2 }, 
        targeting: { scope: "self", select: "single" },
        cost: { stamina: 15 },
        speedModifier: 1.2, 
        accuracy: 1.0, 
        animationId: "strike", 
        effects: [], 
        statusEffects: [
            { id: "iron_skin", chance: 1.0 } 
        ]
    },
    // =========================================================================
    // 1. PHYSICAL AGGRESSION
    // =========================================================================
    
    "quick_stab": {
        id: "quick_stab",
        name: "Quick Stab",
        description: "A fast, weak strike that often hits first.",
        battleMessage: "{user} lunges with a {ability} at {target}!",
        icon: { col: 1, row: 2 },
        speedModifier: 1.5,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.8, 
        animationId: "stab",
        effects: [
            { type: "damage", damageType: "pierce", power: 0.75 }
        ]
    },

    "uppercut": {
        id: "uppercut",
        name: "Uppercut",
        description: "A heavy strike that can knock opponents down.",
        battleMessage: "{user} delivers a brutal {ability} to {target}!",
        icon: { col: 1, row: 1 },
        speedModifier: 1.0, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.85, 
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "slash", power: 1.25 }
        ],
        statusEffects: [
            { id: "knocked_down", chance: 0.20 } 
        ]
    },

    "shield_bash": {
        id: "shield_bash",
        name: "Shield Bash",
        description: "Slam with shield. Damage scales with your Defense.",
        battleMessage: "{user} slams into {target} with a {ability}!",
        icon: { col: 2, row: 1 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 0.90,
        animationId: "melee_lunge",
        effects: [
            { 
                type: "damage", 
                damageType: "blunt",
                power: 1.0,
                statScaling: { attacker: "defense", target: "defense" }
            }
        ]
    },

    "execute": {
        id: "execute",
        name: "Execute",
        description: "Deals massive damage to enemies below 30% HP.",
        battleMessage: "{user} attempts to {ability} {target}!",
        icon: { col: 3, row: 1 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.95, 
        animationId: "melee_lunge",
        effects: [
            { 
                type: "damage", 
                damageType: "slash", 
                power: 1.0, 
                condition: { target_hp_below: 0.30, multiplier: 2.5 }
            }
        ]
    },

    "reckless_charge": {
        id: "reckless_charge",
        name: "Reckless Charge",
        description: "A massive slam that hurts the user due to impact.",
        battleMessage: "{user} launches into a {ability} at {target}!",
        icon: { col: 4, row: 1 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 15 },
        accuracy: 0.80, 
        animationId: "melee_lunge",
        effects: [
            { 
                type: "damage", 
                damageType: "blunt", 
                power: 2.5, 
                recoil: 0.25 
            }
        ]
    },

    "wild_swing": {
        id: "wild_swing",
        name: "Wild Swing",
        description: "Swing blindly, hitting a random enemy.",
        battleMessage: "{user} unleashes a {ability}!",
        icon: { col: 2, row: 1 },
        targeting: { scope: "random_enemy", select: "random", count: 1 },
        cost: { stamina: 5 },
        accuracy: 0.70, 
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "blunt", power: 1.5 }
        ]
    },

    // =========================================================================
    // 2. TACTICAL SWITCHING
    // =========================================================================

    "hit_and_run": {
        id: "hit_and_run",
        name: "Hit & Run",
        description: "Strike the enemy, then switch with a reserve ally.",
        battleMessage: "{user} performs a {ability} on {target} and falls back!",
        icon: { col: 0, row: 2 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        speedModifier: 1.2,
        accuracy: 0.95,
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "slash", power: 0.8 },
            { type: "switch_self", method: "menu" }
        ]
    },

    "baton_pass": {
        id: "baton_pass",
        name: "Baton Pass",
        description: "Switch with an ally, passing your current buffs to them.",
        battleMessage: "{user} uses {ability} to switch out and pass effects!",
        icon: { col: 1, row: 2 },
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 15 },
        speedModifier: 1.0,
        accuracy: 1.0, 
        animationId: "melee_lunge",
        effects: [
            { type: "switch_self", method: "menu", keepBuffs: true }
        ]
    },

    // =========================================================================
    // 3. MULTI-TARGET & MULTI-HIT
    // =========================================================================

    "cleave": {
        id: "cleave",
        name: "Cleave",
        description: "Strike a target and one adjacent enemy.",
        battleMessage: "{user} swings wide to {ability} the enemies!",
        icon: { col: 1, row: 0 },
        animationId: "melee_lunge",
        targeting: { scope: "all_enemies", select: "auto" }, 
        cost: { stamina: 15 },
        accuracy: 0.85,
        effects: [
            { type: "damage", damageType: "slash", power: 0.85 }
        ]
    },

    "flurry": {
        id: "flurry",
        name: "Flurry",
        description: "Slash a target with a series of quick strikes.",
        battleMessage: "{user} unleashes a {ability} of strikes on {target}!",
        icon: { col: 2, row: 0 },
        animationId: "melee_lunge",
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 25 },
        accuracy: 0.75, 
        multihit: { min: 3, max: 3, distinctChecks: true },
        effects: [
            { type: "damage", damageType: "slash", power: 0.75 }
        ],
        statusEffects: [
            { id: "bleed", chance: 0.10 }
        ]
    },

    "earthquake": {
        id: "earthquake",
        name: "Earthquake",
        description: "Shake the ground to damage the entire enemy party.",
        battleMessage: "{user} slams the ground, triggering an {ability}!",
        icon: { col: 0, row: 6 },
        animationId: "earthquake",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 30 },
        accuracy: 0.90,
        effects: [
            { type: "damage", damageType: "earth", power: 1.0 }
        ]
    },

    "acid_pool": {
        id: "acid_pool",
        name: "Acid Pool",
        description: "Create a pool of acid that damages all enemies in the area. High chance to poison.",
        battleMessage: "{user} conjures an {ability} beneath the enemies!",
        icon: { col: 1, row: 6 },
        animationId: "earthquake",
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 20, insight: 20 },
        accuracy: 0.90,
        effects: [
            { type: "damage", damageType: "earth", power: 0.5 }
        ],
        statusEffects: [
            { id: "poison", chance: 0.5 }
        ]
    },

    // =========================================================================
    // 4. INSIGHT ARCANUM (Spells)
    // =========================================================================

    "magic_missile": { 
        id: "magic_missile",
        name: "Magic Missile",
        description: "Fire three bolts. Can hit the same target multiple times.",
        battleMessage: "{user} unleashes a {ability} barrage!",
        icon: { col: 1, row: 9 },
        animationId: "magic_missile",
        targeting: { scope: "enemy", select: "multiple", count: 3, allowRepeats: true },
        cost: { insight: 12 }, 
        accuracy: 1.0, 
        effects: [
            { type: "damage", damageType: "arcane", power: 0.75 }
        ]
    },
    "ice_bolt": {
            id: "ice_bolt",
            name: "Ice Bolt",
            description: "Hurls a jagged shard of ice. Deals damage and has a chance to freeze the target.",
            battleMessage: "{user} launches a freezing {ability} at {target}!",
            icon: { col: 2, row: 9 }, // Adjust col/row to match wherever your ice icon is on your spritesheet
            animationId: "magic_missile", // Or "ice_bolt_cast" if you have a specific animation for it
            targeting: { scope: "enemy", select: "single" },
            cost: { insight: 12 }, 
            speedModifier: 0.95, 
            accuracy: 0.95,      
            effects: [
                { 
                    type: "damage", 
                    damageType: "ice", // Make sure your damage/resistance calculators support "ice"
                    power: 1.5 
                }
            ],
            statusEffects: [
                { id: "frozen", chance: 0.25, duration: 2 } 
            ]
        },
    "gravity": {
        id: "gravity",
        name: "Gravity",
        description: "Crushes the target, halving their current HP.",
        battleMessage: "{user} attempts to crush {target} with intense {ability}!",
        icon: { col: 1, row: 4 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 25 },
        accuracy: 0.90,
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "dark", calculation: "percent_current", power: 0.5 }
        ]
    },

    "hyper_beam": {
        id: "hyper_beam",
        name: "Hyper Beam",
        description: "A massive beam. User must recharge next turn.",
        battleMessage: "{user} fires a devastating {ability} at {target}!",
        icon: { col: 2, row: 4 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 20 }, 
        accuracy: 0.95,
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "arcane", power: 2.5 }
        ],
        selfStatusEffects: [
            { id: "recharging", chance: 1.0, duration: 1 }
        ]
    },

    "solar_beam": {
        id: "solar_beam",
        name: "Solar Beam",
        description: "Gather light on turn 1, fire on turn 2.",
        battleMessage: "{user} unleashes the stored light in a {ability} at {target}!",
        icon: { col: 3, row: 4 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 }, 
        accuracy: 1.0, 
        behavior: "charge_attack", 
        animationId: "melee_lunge",
        chargeConfig: {
            statusId: "charging_solar",
            damageEffect: { type: "damage", damageType: "light", power: 2.0 }
        }
    },

    // =========================================================================
    // 5. RESOURCE MANIPULATION
    // =========================================================================

    "drain_life": {
        id: "drain_life",
        name: "Drain Life",
        description: "Absorb health from the target.",
        battleMessage: "{user} attempts to {ability} from {target}!",
        icon: { col: 0, row: 5 },
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 },
        accuracy: 1.0, 
        animationId: "melee_lunge",
        effects: [
            { type: "damage", damageType: "dark", power: 1.0, drain: 0.5 }
        ]
    },

    "osmose": {
        id: "osmose",
        name: "Osmose",
        description: "Drain insight from the target.",
        battleMessage: "{user} uses {ability} to drain insight from {target}!",
        icon: { col: 1, row: 5 },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "damage", resource: "insight", power: 0.5, drain: 1.0 }
        ]
    },

    "healing_rain": {
        id: "healing_rain",
        name: "Healing Rain",
        description: "Restore health to the entire party.",
        battleMessage: "{user} calls down a {ability} to restore the party!",
        icon: { col: 2, row: 5 },
        targeting: { scope: "all_allies", select: "auto" },
        cost: { insight: 25 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "recover", resource: "hp", calculation: "percent", power: 0.3 }
        ]
    },

    "purify": {
        id: "purify",
        name: "Purify",
        description: "Cleanse poison and bleeding from an ally.",
        battleMessage: "{user} casts {ability} on {target}!",
        icon: { col: 4, row: 5 },
        targeting: { scope: "ally", select: "single" },
        cost: { insight: 10 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "dispel", tags: ["poison", "bleed", "burn"] },
            { type: "recover", resource: "hp", calculation: "percent", power: 0.1 }
        ]
    },

    // =========================================================================
    // 6. SUMMONS & TRANSFORMATION
    // =========================================================================

    "raise_skeleton": {
        id: "raise_skeleton",
        name: "Raise Dead",
        description: "Summon a skeleton warrior to fight for you.",
        battleMessage: "{user} uses {ability} to summon an undead ally!",
        icon: { col: 0, row: 6 },
        targeting: { scope: "space", select: "auto" },
        cost: { insight: 30 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "summon", entityId: "skeleton_warrior", levelScale: 1.0, maxActive: 2 }
        ]
    },

    "bear_form": {
        id: "bear_form",
        name: "Bear Form",
        description: "Transform into a bear.",
        battleMessage: "{user} shifts into a fierce {ability}!",
        icon: { col: 1, row: 6 },
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 20 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "summon", entityId: "dire_bear", replaceUser: true, revertOnDeath: true }
        ]
    },

    // =========================================================================
    // 7. UTILITY & BEHAVIORS
    // =========================================================================

    "counter_stance": {
        id: "counter_stance",
        name: "Counter Stance",
        description: "Prepare to strike back against physical attacks.",
        battleMessage: "{user} drops into a defensive {ability}!",
        icon: { col: 0, row: 7 },
        speedModifier: 2.0, 
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 15 },
        accuracy: 1.0,
        animationId: "melee_lunge",
        statusEffects: [
            { id: "counter_ready", chance: 1.0, duration: 1 }
        ]
    },

    "intimidate": {
        id: "intimidate",
        name: "Intimidate",
        description: "Shout to lower the attack power of all enemies.",
        battleMessage: "{user} shouts to {ability} the enemy!",
        icon: { col: 1, row: 7 },
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 10 },
        accuracy: 1.0, 
        animationId: "melee_lunge",
        effects: [], 
        statusEffects: [
            { id: "attack_down", chance: 1.0, duration: 3 }
        ]
    },

    "hide": {
        id: "hide",
        name: "Hide",
        description: "Attempt to hide. Raises evasion.",
        battleMessage: "{user} attempts to {ability} in the shadows!",
        icon: { col: 2, row: 7 },
        animationId: "melee_lunge",
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 10 },
        accuracy: 1.0,
        statusEffects: [
            { id: "evasion_up", chance: 1.0, duration: 3 }
        ]
    },

    "rest": {
        id: "rest",
        name: "Rest",
        description: "Recover health, stamina, and insight.",
        battleMessage: "{user} takes a moment to {ability} and recover.",
        icon: { col: 3, row: 12 },
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        animationId: "melee_lunge",
        effects: [
            { type: "recover", resource: "stamina", calculation: "percent", power: 0.25 },
            { type: "recover", resource: "insight", calculation: "percent", power: 0.25 }
        ]
    },

    "retreat": {
        id: "retreat",
        name: "Retreat",
        description: "Escape the battle.",
        battleMessage: "{user} attempts to {ability} from the battle!",
        icon: { col: 2, row: 12 },
        targeting: { scope: "self", select: "auto" },
        behavior: "flee_battle",
        animationId: "flee",
        accuracy: 1.0
    },

    "switch_combatant": {
        id: "switch_combatant",
        name: "Switch",
        description: "Swap with a reserve party member.",
        battleMessage: "{user} decides to {ability} places!",
        icon: { col: 5, row: 7 },
        targeting: { scope: "ally", select: "menu" },
        behavior: "switch_party",
        animationId: "melee_lunge",
        accuracy: 1.0
    },

    // =========================================================================
    // 8. CONSUMABLES (Items)
    // =========================================================================
    
    "brew_of_madness": {
        id: "brew_of_madness",
        name: "Madness Brew",
        battleMessage: "{user} chugs a {ability}!",
        targeting: { scope: "self" },
        animationId: "melee_lunge",
        effects: [
            { type: "set", resource: "hp", value: 1 },
            { type: "recover", resource: "insight", calculation: "max" }
        ]
    },

    "item_poison_knife": {
        id: "item_poison_knife",
        name: "Poison Knife",
        description: "Throw a coated blade. Causes poison.",
        battleMessage: "{user} throws a {ability} at {target}!",
        icon: { col: 1, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.95, 
        effects: [
            { type: "damage", damageType: "pierce", power: 0.25 }
        ],
        statusEffects: [
            { id: "poison", chance: 1.0, duration: 3 }
        ]
    },

    "item_bear_trap": {
        id: "item_bear_trap",
        name: "Bear Trap",
        description: "Set a trap that snaps on the next attacker.",
        battleMessage: "{user} hurriedly sets a {ability}!",
        icon: { col: 2, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "self", select: "auto" }, 
        speedModifier: 1.25,
        accuracy: 1.0, 
        statusEffects: [
            { id: "trap_set", chance: 1.0, duration: 3 }
        ]
    },

    "item_throw_net": {
        id: "item_throw_net",
        name: "Throw Net",
        description: "Entangle the target, preventing movement.",
        battleMessage: "{user} tosses a {ability} at {target}!",
        icon: { col: 3, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.90, 
        effects: [
            { type: "damage", damageType: "ranged", power: 0.1 } 
        ],
        statusEffects: [
            { id: "bound", chance: 1.0, duration: 2 } 
        ]
    },

    "item_smoke_bomb": {
        id: "item_smoke_bomb",
        name: "Smoke Bomb",
        description: "Create a smoke screen to increase evasion.",
        battleMessage: "{user} drops a {ability} at their feet!",
        icon: { col: 4, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "ally", select: "single" }, 
        speedModifier: 1.25,
        accuracy: 1.0,
        statusEffects: [
            { id: "evasion_up", chance: 1.0, duration: 3 }
        ]
    },

    "minor_heal": {
        id: "minor_heal",
        name: "Minor Heal",
        description: "Restores a small amount of health.",
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 5, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "ally", select: "single" }, 
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", calculation: "percent", power: 0.3 }
        ]
    },

    "minor_recover": {
        id: "minor_recover",
        name: "Minor Recover",
        description: "Restores a small amount of stamina.",
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 6, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "stamina", calculation: "percent", power: 0.3 }
        ]
    },

    "minor_channel": {
        id: "minor_channel",
        name: "Minor Channel",
        description: "Restores a small amount of insight.",
        battleMessage: "{user} uses a {ability}!",
        icon: { col: 7, row: 8 },
        animationId: "melee_lunge",
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "insight", calculation: "percent", power: 0.3 }
        ]
    }
};
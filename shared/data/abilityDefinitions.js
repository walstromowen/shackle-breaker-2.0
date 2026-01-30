/**
 * shared/data/abilityDefinitions.js
 * CENTRAL REGISTRY FOR BATTLE ABILITIES
 * -------------------------------------
 * Defines targeting, costs, animations, and effects for every action.
 * Icons are now standardized to { col, row } to match item definitions.
 */

export const AbilityDefinitions = {

    // =========================================================================
    // 0. BASIC / INNATE (Required for Level 1 Entities & Items)
    // =========================================================================

    "punch": {
        id: "punch",
        name: "Punch",
        description: "A simple unarmed strike.",
        icon: { col: 0, row: 0 }, // Fist icon
        speedModifier: 1.2,
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.95, 
        effects: [
            { type: "damage", element: "blunt", power: 0.5 } 
        ]
    },

    "bite": {
        id: "bite",
        name: "Bite",
        description: "Tear at the target with sharp fangs.",
        icon: { col: 1, row: 0 }, // Fangs
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 0.90, 
        effects: [
            { type: "damage", element: "pierce", power: 1.0 }
        ],
        statusEffects: [
            { id: "bleed", chance: 0.20, duration: 2 } 
        ]
    },

    "smash": {
        id: "smash",
        name: "Smash",
        description: "A heavy, unrefined blow.",
        icon: { col: 0, row: 0 }, // Club/Hammer
        speedModifier: 1.0, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 8 },
        accuracy: 0.85, 
        effects: [
            { type: "damage", element: "blunt", power: 1.2 } 
        ]
    },

    "quick_stab": {
        id: "quick_stab",
        name: "Quick Stab",
        description: "A fast thrust. Hard to dodge.",
        icon: { col: 3, row: 0 }, // Dagger thrust
        speedModifier: 1.5, 
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.98, 
        effects: [
            { type: "damage", element: "pierce", power: 0.85 } 
        ]
    },

    // =========================================================================
    // 1. PHYSICAL AGGRESSION (Advanced Skills)
    // =========================================================================
    
    "quick_jab": {
        id: "quick_jab",
        name: "Quick Jab",
        description: "A fast, weak strike that often hits first.",
        icon: { col: 0, row: 1 }, // Speed fist
        speedModifier: 1.5,
        animation: { attacker: "ally-attack", effect: "bump", audio: "punch-light" },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 0.95, 
        effects: [
            { type: "damage", element: "blunt", power: 0.75 }
        ]
    },

    "uppercut": {
        id: "uppercut",
        name: "Uppercut",
        description: "A heavy strike that can knock opponents down.",
        icon: { col: 1, row: 1 }, // Rising fist
        speedModifier: 1.0, 
        animation: { attacker: "ally-attack", effect: "swipe-up", audio: "punch-heavy" },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.85, 
        effects: [
            { type: "damage", element: "blunt", power: 1.5 }
        ],
        statusEffects: [
            { id: "knocked_down", chance: 0.20 } 
        ]
    },

    "shield_bash": {
        id: "shield_bash",
        name: "Shield Bash",
        description: "Slam with shield. Damage scales with your Defense.",
        icon: { col: 2, row: 1 }, // Shield impact
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 10 },
        accuracy: 0.90,
        effects: [
            { 
                type: "damage", 
                element: "blunt",
                power: 1.0,
                statScaling: { attacker: "defense", target: "defense" }
            }
        ]
    },

    "execute": {
        id: "execute",
        name: "Execute",
        description: "Deals massive damage to enemies below 30% HP.",
        icon: { col: 3, row: 1 }, // Guillotine/Axe
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        accuracy: 0.95, 
        effects: [
            { 
                type: "damage", 
                element: "slash", 
                power: 1.0, 
                condition: { target_hp_below: 0.30, multiplier: 2.5 }
            }
        ]
    },

    "reckless_charge": {
        id: "reckless_charge",
        name: "Reckless Charge",
        description: "A massive slam that hurts the user due to impact.",
        icon: { col: 4, row: 1 }, // Cracked shield
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 15 },
        accuracy: 0.80, 
        effects: [
            { 
                type: "damage", 
                element: "blunt", 
                power: 2.5, 
                recoil: 0.25 
            }
        ]
    },

    "wild_swing": {
        id: "wild_swing",
        name: "Wild Swing",
        description: "Swing blindly, hitting a random enemy.",
        icon: { col: 5, row: 1 }, // Dizzy spiral
        targeting: { scope: "enemy", select: "random", count: 1 },
        cost: { stamina: 5 },
        accuracy: 0.70, 
        effects: [
            { type: "damage", element: "blunt", power: 1.5 }
        ]
    },

    // =========================================================================
    // 2. TACTICAL SWITCHING
    // =========================================================================

    "hit_and_run": {
        id: "hit_and_run",
        name: "Hit & Run",
        description: "Strike the enemy, then switch with a reserve ally.",
        icon: { col: 0, row: 2 }, // U-turn arrow
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 20 },
        speedModifier: 1.2,
        accuracy: 0.95,
        effects: [
            { type: "damage", element: "slash", power: 0.8 },
            { type: "switch_self", method: "menu" }
        ]
    },

    "baton_pass": {
        id: "baton_pass",
        name: "Baton Pass",
        description: "Switch with an ally, passing your current buffs to them.",
        icon: { col: 1, row: 2 }, // Baton
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 15 },
        speedModifier: 1.0,
        accuracy: 1.0, 
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
        icon: { col: 0, row: 3 }, // Wide slash
        animation: { attacker: "ally-attack", effect: "swipe-right", audio: "blade-swipe" },
        targeting: { scope: "enemy", select: "single", area: "splash", count: 2 },
        cost: { stamina: 15 },
        accuracy: 0.85,
        effects: [
            { type: "damage", element: "slash", power: 0.85 }
        ]
    },

    "flurry": {
        id: "flurry",
        name: "Flurry",
        description: "Slash a target with a series of quick strikes.",
        icon: { col: 1, row: 3 }, // Multiple slashes
        animation: { attacker: "ally-attack", effect: "quick-slash", audio: "woosh-fast" },
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 25 },
        accuracy: 0.75, 
        multihit: { min: 3, max: 3, distinctChecks: true },
        effects: [
            { type: "damage", element: "slash", power: 0.5 }
        ],
        statusEffects: [
            { id: "bleed", chance: 0.10 }
        ]
    },

    "earthquake": {
        id: "earthquake",
        name: "Earthquake",
        description: "Shake the ground to damage the entire enemy party.",
        icon: { col: 2, row: 3 }, // Cracked earth
        animation: { attacker: "stomp", effect: "screen_shake", audio: "rumble" },
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 30 },
        accuracy: 0.90,
        effects: [
            { type: "damage", element: "earth", power: 1.0 }
        ]
    },

    // =========================================================================
    // 4. INSIGHT ARCANUM (Spells)
    // =========================================================================

    "magic_missile": {
        id: "magic_missile",
        name: "Magic Missile",
        description: "Fire three bolts. Can hit the same target multiple times.",
        icon: { col: 0, row: 4 }, // Magic spark
        animation: { attacker: "cast-fast", effect: "sparkle-hit", audio: "magic-blip" },
        targeting: { scope: "enemy", select: "multiple", count: 3, allowRepeats: true },
        cost: { insight: 12 }, 
        accuracy: 1.0, 
        effects: [
            { type: "damage", element: "arcane", power: 0.6 }
        ]
    },

    "gravity": {
        id: "gravity",
        name: "Gravity",
        description: "Crushes the target, halving their current HP.",
        icon: { col: 1, row: 4 }, // Black hole
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 25 },
        accuracy: 0.90,
        effects: [
            { type: "damage", element: "dark", calculation: "percent_current", power: 0.5 }
        ]
    },

    "hyper_beam": {
        id: "hyper_beam",
        name: "Hyper Beam",
        description: "A massive beam. User must recharge next turn.",
        icon: { col: 2, row: 4 }, // Laser beam
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 20 }, 
        accuracy: 0.95,
        effects: [
            { type: "damage", element: "arcane", power: 2.5 }
        ],
        selfStatusEffects: [
            { id: "recharging", chance: 1.0, duration: 1 }
        ]
    },

    "solar_beam": {
        id: "solar_beam",
        name: "Solar Beam",
        description: "Gather light on turn 1, fire on turn 2.",
        icon: { col: 3, row: 4 }, // Sun
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 }, 
        accuracy: 1.0, 
        behavior: "charge_attack", 
        chargeConfig: {
            statusId: "charging_solar",
            damageEffect: { type: "damage", element: "light", power: 2.0 }
        }
    },

    // =========================================================================
    // 5. RESOURCE MANIPULATION
    // =========================================================================

    "drain_life": {
        id: "drain_life",
        name: "Drain Life",
        description: "Absorb health from the target.",
        icon: { col: 0, row: 5 }, // Heart with fang
        targeting: { scope: "enemy", select: "single" },
        cost: { insight: 15 },
        accuracy: 1.0, 
        effects: [
            { type: "damage", element: "dark", power: 1.0, drain: 0.5 }
        ]
    },

    "osmose": {
        id: "osmose",
        name: "Osmose",
        description: "Drain insight from the target.",
        icon: { col: 1, row: 5 }, // Blue vortex
        targeting: { scope: "enemy", select: "single" },
        cost: { stamina: 5 },
        accuracy: 1.0,
        effects: [
            { type: "damage", resource: "insight", power: 0.5, drain: 1.0 }
        ]
    },

    "healing_rain": {
        id: "healing_rain",
        name: "Healing Rain",
        description: "Restore health to the entire party.",
        icon: { col: 2, row: 5 }, // Rain cloud
        targeting: { scope: "all_allies", select: "auto" },
        cost: { insight: 25 },
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", power: 0.3 }
        ]
    },

    "resurrect": {
        id: "resurrect",
        name: "Resurrect",
        description: "Revive a fallen ally.",
        icon: { col: 3, row: 5 }, // Angel wing
        targeting: { scope: "dead_ally", select: "single" },
        cost: { insight: 50 },
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", power: 0.5, revive: true }
        ]
    },

    "purify": {
        id: "purify",
        name: "Purify",
        description: "Cleanse poison and bleeding from an ally.",
        icon: { col: 4, row: 5 }, // Holy water
        targeting: { scope: "ally", select: "single" },
        cost: { insight: 10 },
        accuracy: 1.0,
        effects: [
            { type: "dispel", tags: ["poison", "bleed", "burn"] },
            { type: "recover", resource: "hp", power: 0.1 }
        ]
    },

    // =========================================================================
    // 6. SUMMONS & TRANSFORMATION
    // =========================================================================

    "raise_skeleton": {
        id: "raise_skeleton",
        name: "Raise Dead",
        description: "Summon a skeleton warrior to fight for you.",
        icon: { col: 0, row: 6 }, // Skull staff
        targeting: { scope: "space", select: "auto" },
        cost: { insight: 30 },
        accuracy: 1.0,
        effects: [
            { type: "summon", entityId: "skeleton_warrior", levelScale: 1.0, maxActive: 2 }
        ]
    },

    "bear_form": {
        id: "bear_form",
        name: "Bear Form",
        description: "Transform into a bear.",
        icon: { col: 1, row: 6 }, // Bear face
        targeting: { scope: "self", select: "auto" },
        cost: { insight: 20 },
        accuracy: 1.0,
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
        icon: { col: 0, row: 7 }, // Crossed shields
        speedModifier: 2.0, 
        targeting: { scope: "self", select: "auto" },
        cost: { stamina: 15 },
        accuracy: 1.0,
        statusEffects: [
            { id: "counter_ready", chance: 1.0, duration: 1 }
        ]
    },

    "intimidate": {
        id: "intimidate",
        name: "Intimidate",
        description: "Shout to lower the attack power of all enemies.",
        icon: { col: 1, row: 7 }, // Shout
        targeting: { scope: "all_enemies", select: "auto" },
        cost: { stamina: 10 },
        accuracy: 1.0, 
        effects: [], 
        statusEffects: [
            { id: "attack_down", chance: 1.0, duration: 3 }
        ]
    },

    "hide": {
        id: "hide",
        name: "Hide",
        description: "Attempt to hide. Raises evasion.",
        icon: { col: 2, row: 7 }, // Mask
        animation: { attacker: "crouch", effect: "smoke", audio: "poof" },
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
        icon: { col: 3, row: 7 }, // Zzz / bed
        targeting: { scope: "self", select: "auto" },
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", power: 0.25 },
            { type: "recover", resource: "stamina", power: 0.50 },
            { type: "recover", resource: "insight", power: 0.25 }
        ]
    },

    "retreat": {
        id: "retreat",
        name: "Retreat",
        description: "Escape the battle.",
        icon: { col: 4, row: 7 }, // Run shoe
        targeting: { scope: "self", select: "auto" },
        behavior: "flee_battle",
        accuracy: 1.0
    },

    "switch_combatant": {
        id: "switch_combatant",
        name: "Switch",
        description: "Swap with a reserve party member.",
        icon: { col: 5, row: 7 }, // Swap arrows
        targeting: { scope: "ally", select: "menu" },
        behavior: "switch_party",
        accuracy: 1.0
    },

    // =========================================================================
    // 8. CONSUMABLES (Items)
    // =========================================================================

    "heal_minor": {
        id: "heal_minor",
        name: "Apply Herb",
        description: "Apply herbs to close small wounds.",
        icon: { col: 0, row: 8 }, // Leaf
        cost: { ap: 1 }, 
        targeting: { scope: "ally", select: "single" }, 
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", power: 10, calculation: "flat" }
        ]
    },

    "item_poison_knife": {
        id: "item_poison_knife",
        name: "Poison Knife",
        description: "Throw a coated blade. Causes poison.",
        icon: { col: 1, row: 8 }, // Green dagger
        cost: { item: "poison_knife_qty", amount: 1 }, 
        animation: { attacker: "ally-attack", effect: "swipe-right", audio: "arrow-hit" },
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.95, 
        effects: [
            { type: "damage", element: "pierce", power: 0.25 }
        ],
        statusEffects: [
            { id: "poison", chance: 1.0, duration: 3 }
        ]
    },

    "item_bear_trap": {
        id: "item_bear_trap",
        name: "Bear Trap",
        description: "Set a trap that snaps on the next attacker.",
        icon: { col: 2, row: 8 }, // Trap
        cost: { item: "bear_trap_qty", amount: 1 },
        animation: { attacker: "crouch", effect: "implode", audio: "metal-clank" },
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
        icon: { col: 3, row: 8 }, // Net
        cost: { item: "net_qty", amount: 1 },
        animation: { attacker: "ally-attack", effect: "stick-right", audio: "arrow-hit" },
        targeting: { scope: "enemy", select: "single" },
        speedModifier: 1.25,
        accuracy: 0.90, 
        effects: [
            { type: "damage", element: "ranged", power: 0.1 } 
        ],
        statusEffects: [
            { id: "bound", chance: 1.0, duration: 2 } 
        ]
    },

    "item_smoke_bomb": {
        id: "item_smoke_bomb",
        name: "Smoke Bomb",
        description: "Create a smoke screen to increase evasion.",
        icon: { col: 4, row: 8 }, // Smoke bomb
        cost: { item: "smoke_bomb_qty", amount: 1 },
        animation: { attacker: "throw", effect: "explode", audio: "explosion-small" },
        targeting: { scope: "ally", select: "single" }, 
        speedModifier: 1.25,
        accuracy: 1.0,
        statusEffects: [
            { id: "evasion_up", chance: 1.0, duration: 3 }
        ]
    },

    "item_health_potion": {
        id: "item_health_potion",
        name: "Health Potion",
        description: "Restores 50% of Health.",
        icon: { col: 5, row: 8 }, // Red potion
        cost: { item: "potion_hp_qty", amount: 1 },
        animation: { attacker: "drink", effect: "sparkle-up", audio: "drink-gulp" },
        targeting: { scope: "ally", select: "single" }, 
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "hp", calculation: "percent_max", power: 0.5 }
        ]
    },

    "item_stamina_potion": {
        id: "item_stamina_potion",
        name: "Stamina Potion",
        description: "Restores 50% of Stamina.",
        icon: { col: 6, row: 8 }, // Green potion
        cost: { item: "potion_stamina_qty", amount: 1 },
        animation: { attacker: "drink", effect: "energy-up", audio: "energy-sound" },
        targeting: { scope: "ally", select: "single" },
        speedModifier: 1.0,
        accuracy: 1.0,
        effects: [
            { type: "recover", resource: "stamina", calculation: "percent_max", power: 0.5 }
        ]
    }
};
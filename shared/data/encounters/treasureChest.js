export const treasureChest = {
    id: "treasure_chest",
    title: "Treasure Chest",
    imageSheet: "encounter_treasure_chest",
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "A Locked Chest",
            image: { col: 0, row: 0 },
            text: "{name}'s party spots a locked chest ahead. It looks sturdy, but might contain valuable loot inside.",
            decisions: [
                {
                    text: "[Small Key] Use the small key.",
                    conditions: [{ type: "has_item", itemId: "small_key", qty: 1 }],
                    customActionText: "{name} inserts the small key into the lock and turns it with a satisfying click...",
                    outcomes: [{
                        weight: 100, results: [
                            { type: "REMOVE_ITEM", payload: { itemId: "small_key", qty: 1 } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                        ]
                    }]
                },
                {
                    text: "[STR] Pry the chest open by force.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_str" }],
                    customActionText: "{name} attempts to pry the sturdy chest open with brute strength...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }] }],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { 
                            weight: 1, 
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_str" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "wont_budge" } }
                            ] 
                        },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[DEX] Pick the lock.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_dex" }],
                    customActionText: "{name} focuses closely, attempting to pick the lock mechanism...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }] }],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { 
                            weight: 1, 
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_dex" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "jammed_lock" } }
                            ] 
                        },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[INT] Unlock with a spell.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_int" }],
                    customActionText: "{name} channels their magical energy toward the locking mechanism...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }] }],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { 
                            weight: 1, 
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_int" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "spell_fail" } }
                            ] 
                        },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "summon_evil" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[ATN] Search the area for a hidden key.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_atn" }],
                    customActionText: "{name} sweeps the area, searching high and low for the missing key...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_key" } }] }],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { 
                            weight: 1, 
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_atn" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "no_key" } }
                            ] 
                        },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the chest behind.",
                    customActionText: "{name} decides to leave the chest alone and continues the journey.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        "found_key": {
            displayText: "A Lucky Find",
            image: { col: 1, row: 1 },
            text: "{name} spots a glint of metal partially buried in the dirt nearby. It's a small key!",
            decisions: [
                {
                    text: "Take the key and return.",
                    outcomes: [{
                        weight: 100, results: [
                            { type: "GIVE_ITEM", payload: { items: [{ id: "small_key", qty: 1 }] } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }
                        ]
                    }]
                }
            ]
        },
        "opened_chest": {
            displayText: "Treasure Secured",
            image: { col: 1, row: 0 },
            text: "With a satisfying click, the lid of the chest pops open, revealing the treasures hidden within!",
            decisions: [
                {
                    text: "Loot the chest.",
                    customActionText: "{name} gathers the items from the chest.",
                    outcomes: [{
                        weight: 100, results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2 } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },
        "wont_budge": {
            displayText: "A Stubborn Chest",
            image: { col: 0, row: 0 },
            text: "{name} pulls and pries with all their might, but the chest won't budge an inch.",
            decisions: [
                {
                    text: "Reassess the situation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },
        "jammed_lock": {
            displayText: "Jammed Mechanism",
            image: { col: 0, row: 0 },
            text: "{name} twists the tool slightly too hard, jamming the lock temporarily.",
            decisions: [
                {
                    text: "Rethink the approach.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },
        "spell_fail": {
            displayText: "Fizzled Magic",
            image: { col: 0, row: 0 },
            text: "{name}'s spell sparks against the metal bindings and quietly fizzles out into nothingness.",
            decisions: [
                {
                    text: "Consider another option.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },
        "no_key": {
            displayText: "Fruitless Search",
            image: { col: 0, row: 0 },
            text: "{name} searches every nook and cranny nearby, but the key is nowhere to be found.",
            decisions: [
                {
                    text: "Give up the search.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },
        "chest_explosion": {
            displayText: "A Trap Triggered!",
            image: { col: 3, row: 0 },
            text: "A hidden mechanism clicks menacingly. Suddenly, the chest emits a high-pitched whine and violently explodes, destroying the loot and engulfing {name} in searing flames!",
            decisions: [
                {
                    text: "Pat out the flames.",
                    customActionText: "{name} is thrown back by the blast!",
                    outcomes: [{ 
                        weight: 100, results: [
                            { type: "MODIFY_VITALS", payload: { hp: -25, damageType: "fire", target: "active_character" } },
                            { type: "APPLY_STATUS_EFFECT", payload: { effectId: "burn", charges: 3, target: "active_character" } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ] 
                    }]
                }
            ]
        },
        "poison_mist": {
            displayText: "A Toxic Trap",
            image: { col: 3, row: 1 },
            text: "With a grinding creak, the chest pops open—but immediately releases a dense cloud of noxious, green mist! {name} inhales the toxic fumes as they reach for the loot.",
            decisions: [
                {
                    text: "Gather the treasure and escape.",
                    customActionText: "{name} chokes on the poisonous mist while hastily grabbing the loot.",
                    outcomes: [{
                        weight: 100, results: [
                            { type: "APPLY_STATUS_EFFECT", payload: { effectId: "poison", charges: 3, target: "active_character" } },
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2 } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },
        "ambush": {
            displayText: "Ambush!",
            image: { col: 2, row: 0 },
            bgm: "battleBgm",
            text: "All the commotion attracts unwanted attention. Something approaches {name}'s position rapidly from the shadows!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["BIOME_DEFAULT", "BIOME_DEFAULT"] } }] }]
                }
            ]
        },
        "summon_evil": {
            displayText: "A Dark Presence",
            image: { col: 2, row: 1 },
            bgm: "battleBgm",
            text: "The unstable magic backfires terribly! The chest remains locked, but a dark, swirling mass of energy materializes into an evil entity right before {name}'s eyes!",
            decisions: [
                {
                    text: "Prepare for combat!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["DARK_SPIRIT"] } }] }]
                }
            ]
        }
    }
};
/* The iron chest at the bottom of a cave (object IRON_CHEST, between two STANDING_TORCHes).
   Same shape as the wooden treasure chest, but harder (every check is 15), with a bigger hoard (4 rolls) and a nastier explosion. The small iron key opens it too. */
export const ironChest = {
    id: "iron_chest",
    title: "Iron Chest",
    imageSheet: "encounter_treasure_chest",   // reuses the wooden chest art; give it its own sheet (encounter_iron_chest) when you have one
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Heavy Iron Chest",
            image: { col: 0, row: 0 },
            text: "Between two guttering torches, at the lowest point of the cave, stands a heavy iron chest, bound in riveted bands and shut with a lock the size of a fist. Somebody wanted whatever is inside to stay there.",
            decisions: [
                {
                    text: "[Small Iron Key] Unlock the chest with the small iron key.",
                    conditions: [
                        { type: "has_item", itemId: "small_iron_key", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} inserts the small iron key into the lock and turns it with a satisfying click...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "small_iron_key", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[STR] Wrench the lid against its lock.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_str" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} grips the iron lid and heaves against the lock with everything they have...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_str" } }, { type: "ADVANCE_STAGE", payload: { stageId: "wont_budge" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[DEX] Pick the lock.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_dex" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} focuses closely, attempting to pick the lock mechanism...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "jammed_lock" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[INT] Unlock with a spell.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_int" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} channels their magical energy toward the locking mechanism...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_int" } }, { type: "ADVANCE_STAGE", payload: { stageId: "spell_fail" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "summon_evil" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[ATN] Search the area for a hidden key.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_atn" },
                        { type: "context_flag_not_set", flagId: "found_key" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} sweeps the area, searching high and low for the missing key...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "found_key" } }, { type: "ADVANCE_STAGE", payload: { stageId: "found_key" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_atn" } }, { type: "ADVANCE_STAGE", payload: { stageId: "no_key" } }] },
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
                    text: "Leave the chest where it is.",
                    customActionText: "{name} decides some things are hidden for a reason, and turns back up the cave.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        found_key: {
            displayText: "A Lucky Find",
            image: { col: 1, row: 1 },
            text: "{name} spots a glint of metal partially buried in the dirt nearby. It's a small iron key!",
            decisions: [
                {
                    text: "Take the key and return.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { items: [{ id: "small_iron_key", qty: 1 }] } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }
                            ]
                        }
                    ]
                }
            ]
        },
        opened_chest: {
            displayText: "The Hoard",
            image: { col: 1, row: 0 },
            text: "The lock gives with a heavy clunk and the iron lid swings up on its hinges. Inside, packed tight in rotted cloth, lies the kind of hoard people hide at the bottom of a cave.",
            decisions: [
                {
                    text: "Gather the loot and depart.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 4 } },
                                { type: "AWARD_XP", payload: { amount: 15, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        wont_budge: {
            displayText: "A Stubborn Chest",
            image: { col: 0, row: 0 },
            text: "{name} pulls and pries with all their might, but the chest won't budge an inch.",
            decisions: [{ text: "Reassess the situation.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        jammed_lock: {
            displayText: "Jammed Mechanism",
            image: { col: 0, row: 0 },
            text: "{name} twists the tool slightly too hard, jamming the lock temporarily.",
            decisions: [{ text: "Rethink the approach.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        spell_fail: {
            displayText: "Fizzled Magic",
            image: { col: 0, row: 0 },
            text: "{name}'s spell sparks against the metal bindings and quietly fizzles out into nothingness.",
            decisions: [{ text: "Consider another option.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        no_key: {
            displayText: "Fruitless Search",
            image: { col: 0, row: 0 },
            text: "{name} searches every nook and cranny nearby, but the key is nowhere to be found.",
            decisions: [{ text: "Give up the search.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        chest_explosion: {
            displayText: "A Trap Triggered!",
            image: { col: 3, row: 0 },
            text: "A hidden mechanism clicks. The chest whines like a kettle, and the iron bursts outward in a blast of fire that swallows the hoard and {name} with it!",
            decisions: [
                {
                    text: "Brace for impact!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { hp: -35, damageType: "fire", target: "active_character" } },
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "burn", charges: 3, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        poison_mist: {
            displayText: "A Toxic Trap",
            image: { col: 2, row: 0 },
            text: "With a grinding creak the chest pops open and a dense cloud of green mist rolls out of it. {name} breathes it in before they can turn away.",
            decisions: [
                {
                    text: "Cough and grab the loot anyway.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "poison", charges: 3, target: "active_character" } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 3 } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        ambush: {
            displayText: "Ambush!",
            image: { col: 0, row: 1 },
            bgm: "plainsBattleBgm",
            text: "All the commotion attracts unwanted attention. Something approaches {name}'s position rapidly from the shadows!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack" } }] }]
                }
            ]
        },
        summon_evil: {
            displayText: "A Dark Presence",
            image: { col: 2, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The unstable magic backfires terribly! The chest remains locked, but a dark, swirling mass of energy materializes into an evil entity right before {name}'s eyes!",
            decisions: [
                {
                    text: "Prepare for combat!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "dark_spirit" } },{ type: "DESTROY_OBJECT" }, // And added here for the other 50% roll
                ] }]
                }
            ]
        }
    }
};
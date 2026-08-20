export const aftermathEncounter = {
    id: "aftermath_encounter",
    title: "The Aftermath",
    imageSheet: "encounter_aftermath",
    initialStage: "aftermath",
    stages: {
        // ==========================================
        // 1. AFTERMATH STAGE
        // ==========================================
        aftermath: {
            displayText: "The Aftermath",
            image: { col: 0, row: 0 },
            text: "{name}'s party stumbles upon an old battlefield. The battle looks to have occurred some time ago.",
            decisions: [
                {
                    text: "[ATN] Loot the battlefield.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "looted_battlefield" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} searches the battlefield for anything of value...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "looted_battlefield" } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "loot_success" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "looted_battlefield" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "loot_fail" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "madman_ambush" } }
                            ]
                        },
                        {
                            weight: 2,
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "alterian_ambush" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[INT] Search for survivors.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 14,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "searched_survivors" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} carefully searches among the fallen for signs of life...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "wounded_warrior" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "searched_survivors" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "search_fail" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "madman_ambush" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the battlefield.",
                    customActionText: "{name} leaves the battlefield behind.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        // --- Intermediate Feedback Stages for Aftermath ---
        loot_success: {
            displayText: "A Lucky Find",
            image: { col: 1, row: 0 },
            text: "{name} finds something useful on one of the fallen warriors.",
            decisions: [
                {
                    text: "Reassess the area.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }] }]
                }
            ]
        },
        loot_fail: {
            displayText: "Nothing of Value",
            image: { col: 0, row: 0 },
            text: "{name} thoroughly searches the area, but sees nothing worth taking.",
            decisions: [
                {
                    text: "Reassess the area.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }] }]
                }
            ]
        },
        search_fail: {
            displayText: "No Life Signs",
            image: { col: 0, row: 0 },
            text: "{name} searches high and low, but doesn't find any survivors.",
            decisions: [
                {
                    text: "Reassess the area.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }] }]
                }
            ]
        },

        // ==========================================
        // 2. WOUNDED WARRIOR STAGE
        // ==========================================
        wounded_warrior: {
            displayText: "Wounded Warrior",
            image: { col: 0, row: 1 },
            text: "{name} approaches a wounded warrior still breathing, but bleeding badly.",
            decisions: [
                {
                    text: "[Bandage] Bandage the warrior.",
                    type: "skill_check",
                    attribute: "none",
                    threshold: 8,
                    conditions: [
                        { type: "has_item", itemId: "bandage", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} attempts to bandage the warrior's deep wounds...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: -5, target: "active_character" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 2,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "warrior_betrayal_ambush" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[STR] Rob the warrior.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 5,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "tried_robbing" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} moves in to strip the wounded warrior of their valuables...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "tried_robbing" } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: 5, target: "active_character" } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "robbed_warrior" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "MODIFY_CORRUPTION", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "alterian_ambush" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the warrior to his fate.",
                    customActionText: "{name} turns away, leaving the warrior to his fate.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        robbed_warrior: {
            displayText: "Cold-Hearted",
            image: { col: 0, row: 1 },
            text: "{name} finds something on the wounded warrior. Meanwhile, the warrior breathes his last breath.",
            decisions: [
                {
                    text: "Reassess the situation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "wounded_warrior" } }] }]
                }
            ]
        },

        // ==========================================
        // 3. BATTLE SURVIVOR STAGE
        // ==========================================
        battle_survivor: {
            displayText: "Battle Survivor",
            image: { col: 1, row: 1 },
            text: "The warrior stands up from the ground and looks at {name}. \"What do you want?\"",
            decisions: [
                {
                    text: "\"What happened?\"",
                    conditions: [{ type: "context_flag_not_set", flagId: "asked_what_happened" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "asked_what_happened" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_story" } }
                            ]
                        }
                    ]
                },
                {
                    text: "\"Who are you?\"",
                    conditions: [{ type: "context_flag_not_set", flagId: "asked_identity" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "asked_identity" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_identity" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[Alterian] \"You should come with me, we are safer together.\"",
                    type: "skill_check",
                    attribute: "alterian",
                    threshold: 10,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_recruit" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} tries to convince the survivor to join forces...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "RECRUIT_ENTITY", payload: { entityId: "ALTERIAN_WARRIOR" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 2,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_recruit" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_refusal" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_recruit" } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_bribe_demand" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Part ways.",
                    customActionText: "{name} and the warrior part ways.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        // --- Dialogue Branching Stages ---
        survivor_story: {
            displayText: "A Narrow Escape",
            image: { col: 1, row: 1 },
            text: "\"A group of madmen chased me straight into this mess. It's a miracle you showed up, but don't expect any more thanks than that.\"",
            decisions: [
                {
                    text: "\"Why were they chasing you?\"",
                    conditions: [{ type: "context_flag_not_set", flagId: "asked_chased" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "asked_chased" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_chased_reply" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Return to conversation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }] }]
                }
            ]
        },

        survivor_chased_reply: {
            displayText: "No Answers",
            image: { col: 1, row: 1 },
            text: "\"How should I know? Those madmen will chase anything that moves. Speaking of which, you should get a move on if you know what is good for you.\"",
            decisions: [
                {
                    text: "Return to conversation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }] }]
                }
            ]
        },

        survivor_identity: {
            displayText: "A Royal Past",
            image: { col: 1, row: 1 },
            text: "\"Let's just say I used to be in the Alterian Royal Guard. Catch my meaning?\"",
            decisions: [
                {
                    text: "Return to conversation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }] }]
                }
            ]
        },

        survivor_refusal: {
            displayText: "Safe? Hah!",
            image: { col: 1, row: 1 },
            text: "\"Safe! Hah! You won't last long out here. I can't remember the last time I felt safe, much less so traveling with others.\"",
            decisions: [
                {
                    text: "Return to conversation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }] }]
                }
            ]
        },

        survivor_bribe_demand: {
            displayText: "Incentive",
            image: { col: 1, row: 1 },
            text: "\"Hmm... I am not convinced...\"",
            decisions: [
                {
                    text: "[50g] \"Perhaps some incentive?\"",
                    conditions: [{ type: "has_currency", amount: 50 }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_CURRENCY", payload: { amount: -50 } },
                                { type: "RECRUIT_ENTITY", payload: { entityId: "ALTERIAN_WARRIOR" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Return to conversation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }] }]
                }
            ]
        },

        // ==========================================
        // COMBAT ENCOUNTERS
        // ==========================================
        madman_ambush: {
            displayText: "Madmen Approach!",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "As {name} searches the battlefield, a group of madmen appear on the horizon!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack" } }] }]
                }
            ]
        },

        alterian_ambush: {
            displayText: "The Dead Stir!",
            image: { col: 2, row: 1 },
            bgm: "plainsBattleBgm",
            text: "While examining the bodies, one of them stirs and glares at {name}! As if on command, others do the same!",
            decisions: [
                {
                    text: "Prepare for battle!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "alterian_warriors" } }] }]
                }
            ]
        },

        warrior_betrayal_ambush: {
            displayText: "Betrayal!",
            image: { col: 2, row: 1 },
            bgm: "plainsBattleBgm",
            text: "As {name} bandages the warrior, he violently grabs {name} and draws his weapon! Soon, other fallen warriors rise around you!",
            decisions: [
                {
                    text: "Defend yourself!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "alterian_warriors" } }] }]
                }
            ]
        }
    }
};
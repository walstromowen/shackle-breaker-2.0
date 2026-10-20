export const aftermath = {
    id: "aftermath",
    title: "Aftermath",
    imageSheet: "encounter_aftermath",
    initialStage: "aftermath",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see encounters/prologue.js)
    ambience: "battlefieldWind",
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
                                // The find message (loot_success) comes first; the loot itself is handed out when the player takes it there
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "looted_battlefield" } },
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
                            // Most likely result: a wounded warrior
                            weight: 2,
                            results: [
                                // FIX: success now sets the flag too, so the XP can't be farmed by repeating the search
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "searched_survivors" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "wounded_warrior" } }
                            ]
                        },
                        {
                            // Rarer result: a fallen officer. No flag and no XP here (the officer stage pays out), so the player can
                            // leave the body and search again for the wounded warrior.
                            weight: 1,
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "fallen_officer" } }
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
            tone: "gold",
            sfx: "pickupSound",
            image: { col: 1, row: 0 },
            text: "{name} finds something useful on one of the fallen warriors.",
            decisions: [
                {
                    text: "Take what you found.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "battlefield_loot", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                // Removes the map object so re-entering can't farm the same loot
                                { type: "DESTROY_OBJECT" },
                                { type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }
                            ]
                        }
                    ]
                }
            ]
        },
        loot_fail: {
            displayText: "Nothing of Value",
            image: { col: 2, row: 0 },
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
            image: { col: 2, row: 0 },
            text: "{name} searches high and low, but doesn't find any survivors.",
            decisions: [
                {
                    text: "Reassess the area.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }] }]
                }
            ]
        },

        // ==========================================
        // FALLEN OFFICER STAGE
        // ==========================================
        // NOTE: the quest ID below ("alterian_sealed_orders") is a placeholder.
        // Swap it for a real quest ID once the quest is defined.
        fallen_officer: {
            displayText: "A Fallen Officer",
            image: { col: 3, row: 0 },
            text: "{name} spots a figure in finer armor lying apart from the rest, a Royal Guard insignia still pinned to the chest. A leather satchel is strapped across the body.",
            decisions: [
                {
                    text: "Search the officer's satchel.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "{name} carefully unbuckles the satchel and sorts through what's inside...",
                    outcomes: [
                        {
                            // Outcome A: sealed orders -> find message first, the quest is received on the next stage
                            weight: 1,
                            results: [{ type: "ADVANCE_STAGE", payload: { stageId: "officer_orders_found" } }]
                        },
                        {
                            // Outcome B: the officer's personal gear -> find message first, the item is received on the next stage
                            weight: 1,
                            results: [{ type: "ADVANCE_STAGE", payload: { stageId: "officer_gear_found" } }]
                        }
                    ]
                },
                {
                    text: "Leave the body.",
                    customActionText: "{name} steps away from the officer's body.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }] }]
                }
            ]
        },

        // The find messages for the officer's satchel. The reward is only handed out when the player takes it here.
        officer_orders_found: {
            displayText: "Sealed Orders",
            tone: "gold",
            sfx: "pickupSound",
            image: { col: 3, row: 1 },
            text: "Tucked beneath the officer's rations, {name} finds a wax-sealed letter still bearing the Royal Guard crest.",
            decisions: [
                {
                    text: "Take the orders.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "START_QUEST", payload: { questId: "alterian_sealed_orders", questName: "Sealed Orders" } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        officer_gear_found: {
            displayText: "The Officer's Gear",
            tone: "gold",
            sfx: "pickupSound",
            image: { col: 0, row: 2 },
            text: "Wrapped in the officer's cloak, {name} finds personal gear that survived the battle.",
            decisions: [
                {
                    text: "Take the gear.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "alterian_officer_loot", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
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
                    text: "[Healing Herb] Treat the warrior.",
                    type: "skill_check",
                    attribute: "none",
                    threshold: 8,
                    conditions: [
                        { type: "has_item", itemId: "healing_herb", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} crushes a healing herb and presses it into the warrior's deep wounds...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: -5, target: "active_character" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "battle_survivor" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } },
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
                                { type: "ADVANCE_STAGE", payload: { stageId: "robbed_warrior" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 100,
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

        // FIX: the warrior dies here, so this no longer loops back to wounded_warrior
        // (which let the player treat a corpse). It returns to the battlefield hub instead;
        // searched_survivors is already set, so no second survivor can be found.
        robbed_warrior: {
            displayText: "Cold-Hearted",
            tone: "blood",
            sfx: "pickupSound",
            sfxVolume: 0.6,
            image: { col: 2, row: 1 },
            text: "{name} finds something on the wounded warrior. Meanwhile, the warrior breathes his last breath.",
            decisions: [
                {
                    text: "Take what he carried.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "battlefield_loot", rolls: 1 } },
                                { type: "DESTROY_OBJECT" },
                                { type: "ADVANCE_STAGE", payload: { stageId: "aftermath" } }
                            ]
                        }
                    ]
                }
            ]
        },

        // ==========================================
        // 3. BATTLE SURVIVOR STAGE
        // ==========================================
        battle_survivor: {
            displayText: "Battle Survivor",
            sfx: "legionaryCry",
            sfxVolume: 0.6,
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
                    text: "[ALT] \"You should come with me, we are safer together.\"",
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
                                // FIX: RECRUIT_ENTITY -> RECRUIT_CHARACTER (the event the other encounters use)
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "LEGIONARY_COMPANION" } },
                                { type: "DESTROY_OBJECT" },
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
            displayText: "Standard Issue",
            image: { col: 1, row: 1 },
            text: "\"Legionary, third cohort, Altus legion. Or I was, before all this. Catch my meaning?\"",
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
                    // Needs the has_currency condition added to EncounterLogic.checkConditions
                    text: "[50g] \"Perhaps some incentive?\"",
                    conditions: [{ type: "has_currency", amount: 50 }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // The payment is announced here ("Lost 50 currency!"), then the conversation moves on to survivor_bribed
                                { type: "MODIFY_CURRENCY", payload: { amount: -50 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "survivor_bribed" } }
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

        // A bribe always works. The recruit is the last thing that happens, with no payment or XP message riding on the same result
        // (the same shape the other recruit stages use), so nothing can cut the recruit short.
        survivor_bribed: {
            displayText: "Coin Talks",
            tone: "gold",
            sfx: "coinsJingle",
            image: { col: 1, row: 1 },
            text: "The warrior weighs the coins in his palm and sighs. \"Fine. Put like that, I suppose I can find the time. Lead on.\"",
            decisions: [
                {
                    text: "Welcome him to the party.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "LEGIONARY_COMPANION" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        // ==========================================
        // COMBAT ENCOUNTERS
        // (forced-fight stages have no has_tag gate: with a gate, a non-humanoid
        //  active character would see zero buttons and be soft-locked)
        // ==========================================
        madman_ambush: {
            displayText: "Madmen Approach!",
            tone: "blood",
            effect: "jolt",
            sfx: "madmanCry",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 3, row: 2 },
            bgm: "plainsBattleBgm",
            text: "As {name} searches the battlefield, a group of madmen appear on the horizon!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack" } }] }]
                }
            ]
        },

        alterian_ambush: {
            displayText: "The Dead Stir!",
            tone: "blood",
            effect: "jolt",
            sfx: "ambushColdBreath",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 0, row: 3 },
            bgm: "plainsBattleBgm",
            text: "While examining the bodies, one of them stirs and glares at {name}! As if on command, others do the same!",
            decisions: [
                {
                    text: "Prepare for battle!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "alterian_warriors" } }] }]
                }
            ]
        },

        warrior_betrayal_ambush: {
            displayText: "Betrayal!",
            tone: "blood",
            effect: "blood",
            sfx: "unsheathSwordSfx",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 1, row: 3 },
            bgm: "plainsBattleBgm",
            text: "As {name} tends to the warrior's wounds, he violently grabs {name} and draws his weapon! Soon, other fallen warriors rise around you!",
            decisions: [
                {
                    text: "Defend yourself!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "alterian_warriors" } }] }]
                }
            ]
        }
    }
};

export const aDisturbingSight = {
    id: "a_disturbing_sight",
    title: "A Disturbing Sight",
    imageSheet: "encounter_a_disturbing_sight",
    initialStage: "discovery",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see story/encounters/story/prologue.js)
    ambience: "forestNight",
    stages: {
        discovery: {
            displayText: "A Disturbing Sight",
            sfx: "rotterCry",
            sfxVolume: 0.5,
            image: { col: 2, row: 1 },
            bgm: "aDisturbingSightBgm",
            text: "You see someone digging on the ground ahead. Getting closer, you realize the figure is digging at something unsettling...",
            decisions: [
                {
                    text: "Charge directly at the Madman.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "You draw your weapon and charge the Madman!",
                    image: { col: 1, row: 0 }, 
                    bgm: "plainsBattleBgm",    
                    outcomes: [
                        { weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }
                    ]
                },
                {
                    text: "[DEX] Eliminate the Madman quietly.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_dex" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You sneak behind the Madman, dagger drawn...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_quiet_end" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_dex" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "startled_prey" } }
                        ] },
                        { weight: 1, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_dex" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "a_howl_in_the_dark" } }
                        ] }
                    ]
                },
                {
                    text: "[STR] Throw a heavy rock at his head.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_str" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You pick up a heavy rock and hurl it at the Madman.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_lucky_strike" } }] },
                        { weight: 3, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "enraged_lunatic" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 2, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "spotted" } }
                        ] },
                        { weight: 2, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "unnoticed_blunder" } }
                        ] },
                        { weight: 1, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "unintended_targets" } }
                        ] }
                    ]
                },
                {
                    text: "[ALT] Speak calmly to the Madman.",
                    type: "skill_check",
                    attribute: "alterian",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_alt" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You step out and try to speak calmly to the Madman.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_moment_of_clarity" } }] },
                        { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "speaking_to_the_voices" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_alt" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "descent_into_madness" } }
                        ] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Quietly back away.",
                    customActionText: "You quietly back away from the Madman and take a different path.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        a_quiet_end: {
            displayText: "A Quiet End",
            tone: "blood",
            effect: "blood",
            sfx: "quickStabSfx",
            image: { col: 2, row: 2 },
            text: "You sneak up behind the Madman and plunge a dagger into his side, leaving him lifeless on the ground. If he even was alive...",
            decisions: [
                {
                    text: "Search the body for valuables.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // ADDED: Report the out-of-combat kill to the quest system!
                                { type: "RECORD_KILL", payload: { enemyId: "MAD_MAN", amount: 1 } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        startled_prey: {
            displayText: "Ambushed!",
            tone: "blood",
            effect: "jolt",
            sfx: "madmanCry",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The Madman is startled by your clumsy approach. He shrieks and draws his weapon!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        a_howl_in_the_dark: {
            displayText: "Ambushed!",
            tone: "blood",
            effect: "blood",
            sfx: "quickStabSfx",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "You plunge a dagger into the side of the Madman, leaving him bleeding profusely! He survives the blow and sends a howl into the air, alerting others nearby!",
            decisions: [
                {
                    text: "Brace for the ambush!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                {
                                    type: "START_BATTLE", payload: {
                                        tableId: "madman_pack", enemies: [
                                            { id: "MAD_MAN", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] },
                                            "MAD_MAN"
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        a_lucky_strike: {
            displayText: "The Aftermath",
            effect: "jolt",
            sfx: "rockThud",
            image: { col: 1, row: 2 },
            text: "The rock hits the Madman right in the head, dropping him lifeless to the ground.",
            decisions: [
                {
                    text: "Check his pockets.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // ADDED: Report the out-of-combat kill to the quest system!
                                { type: "RECORD_KILL", payload: { enemyId: "MAD_MAN", amount: 1 } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        enraged_lunatic: {
            displayText: "Combat",
            tone: "blood",
            effect: "jolt",
            sfx: "rockThud",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The rock hits the Madman's body, injuring him. After wincing from the wound, the Madman looks up and runs screaming at you!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: [{ id: "MAD_MAN", startingHpPercent: 0.5 }] } }] }]
                }
            ]
        },
        spotted: {
            displayText: "Combat",
            tone: "blood",
            effect: "jolt",
            sfx: "madmanCry",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The rock goes far over the Madman's head. He snaps his head around, draws his weapon, and rushes at you!",
            decisions: [
                {
                    text: "Fight for your life!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        unnoticed_blunder: {
            displayText: "A Disturbing Sight",
            sfx: "rockThud",
            sfxVolume: 0.6,
            image: { col: 0, row: 1 },
            text: "The rock completely misses the Madman and lands softly in the grass. He doesn't seem to have noticed. You will have to rethink this approach...",
            decisions: [
                {
                    text: "Reassess the situation.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },
        unintended_targets: {
            displayText: "Combat",
            tone: "blood",
            effect: "jolt",
            sfx: "twigSnap",
            image: { col: 3, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The rock goes nowhere near the Madman. Instead, it lands right in the middle of the bushes, startling a pack of wildlife! They turn and glare fiercely at you!",
            decisions: [
                {
                    text: "Prepare for a fierce fight!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "plains_battles_day", difficulty: "hard" } }] }]
                }
            ]
        },
        a_moment_of_clarity: {
            displayText: "A Fleeting Peace",
            tone: "gold",
            sfx: "purifySfx",
            sfxVolume: 0.5,
            image: { col: 3, row: 0 },
            text: "You talk with the Madman about the delusional rants one might expect from a man who has lost his mind. Finally, the Madman smiles, and with tears in his eyes, hands you his knapsack. \n\nJust before darting off, he mutters, \"It's really you... Shackle Breaker...\"",
            decisions: [
                {
                    text: "Accept the knapsack.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { items: [{ id: "wooden_stick", qty: 2 }, { id: "dagger", qty: 1 }] } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        descent_into_madness: {
            displayText: "Combat",
            tone: "blood",
            effect: "blood",
            sfx: "madmanCry",
            image: { col: 1, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The Madman stops, looks you dead in the eyes, and bursts into maniacal laughter. He draws a rusted blade!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        speaking_to_the_voices: {
            displayText: "A Fragile Mind",
            tone: "arcane",
            sfx: "whispers",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "You manage to get the Madman's attention. He tilts his head.\n\n\"Magic tell me things! Hee Hee! Tell me what magic say!\"",
            decisions: [
                {
                    text: "[STR] Shout at the Madman to run away.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 5,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_shout" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You puff out your chest and shout at the Madman.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "fleeing_shadows" } }] }],
                    failureOutcomes: [
                        {
                            weight: 100, results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_shout" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "a_new_friend" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[ATN] Manipulate him into giving items.",
                    corruption: 3,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 10,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_manip" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You try to manipulate the man's delusions.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "pleased_the_magic" } }] }],
                    failureOutcomes: [
                        {
                            weight: 100, results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_manip" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "rejected_by_the_magic" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[STR] Command him to bow.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_disturbing_bow" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You speak with booming, terrifying authority.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_new_servant" } }] }],
                    failureOutcomes: [
                        {
                            weight: 100, results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_bow" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "shattered_illusions" } }
                            ]
                        }
                    ]
                }
            ]
        },
        fleeing_shadows: {
            displayText: "The Aftermath",
            sfx: "madmanCry",
            sfxVolume: 0.5,
            image: { col: 1, row: 0 },
            text: "Upon hearing you, the Madman falls back and hisses. He scrambles to his feet and runs away, leaving his knapsack behind in his panic.",
            decisions: [
                {
                    text: "Take the abandoned knapsack.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { items: [{ id: "wooden_stick", qty: 2 }, { id: "dagger", qty: 1 }] } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        a_new_friend: {
            displayText: "Combat",
            tone: "blood",
            effect: "jolt",
            sfx: "madmanCry",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Freak? .. Friend! Magic know many freak friend! You be freak friend too!\" he screams, lunging forward.",
            decisions: [
                {
                    text: "Draw your weapons!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        pleased_the_magic: {
            displayText: "The Aftermath",
            tone: "arcane",
            sfx: "madmanCry",
            sfxVolume: 0.6,
            image: { col: 1, row: 1 },
            text: "\"Magic like you! So me like you! Hahahaha! Me give these now!\"",
            decisions: [
                {
                    text: "Accept the bizarre offerings.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        rejected_by_the_magic: {
            displayText: "Combat",
            tone: "blood",
            effect: "blood",
            sfx: "madmanCry",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Hahaha! Magic no like you! So me no like neither!\"",
            decisions: [
                {
                    text: "Prepare for battle!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        a_new_servant: {
            displayText: "The Aftermath",
            tone: "gold",
            sfx: "madmanCry",
            sfxVolume: 0.5,
            image: { col: 0, row: 2 },
            text: "The man falls to his knees, weeping. \"No no! No hurt! Me help magic! Me help!\"",
            decisions: [
                {
                    text: "Command the weeping man to follow.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { insight: 5 } },
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "MAD_MAN" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        shattered_illusions: {
            displayText: "Combat",
            tone: "blood",
            effect: "blood",
            sfx: "madmanCry",
            image: { col: 0, row: 2 },
            bgm: "plainsBattleBgm",
            text: "He glares at you with sudden, horrifying clarity. \"No hear magic! Me hurt you now!\"",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { insight: 5 } },
                                { type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};
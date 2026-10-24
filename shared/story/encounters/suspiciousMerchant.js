export const suspiciousMerchant = {
    id: "suspicious_merchant",
    title: "The Suspicious Merchant",
    imageSheet: "encounter_suspicious_merchant",
    initialStage: "discovery",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see story/encounters/story/prologue.js)
    ambience: "forestNight",
    stages: {
        discovery: {
            displayText: "A Twitching Figure",
            sfx: "shadyMerchantCry",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "You spot a robed figure violently scratching his own neck in the shadows. He snaps his head around and hisses, \"Psst!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery_2" } }] }]
                }
            ]
        },

        discovery_2: {
            displayText: "A Twitching Figure",
            image: { col: 0, row: 0 },
            text: "\"You! Yes, you with the eyes!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery_3" } }] }]
                }
            ]
        },

        discovery_3: {
            displayText: "A Twitching Figure",
            image: { col: 0, row: 0 },
            text: "\"The shiny things whisper to me! They say you need them... yes, yes, they want you to have them!\"",
            decisions: [
                {
                    text: "Ask to see his wares.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "You nod cautiously and ask to see what the madman has for sale.",
                    outcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "browse_wares" } }] }
                    ]
                },
                {
                    text: "[INT] Inspect his goods for fakes.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 13,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_merchant_int" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You squint at the junk peeking out of the twitching man's coat...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "call_out_fakes" } }] }
                    ],
                    failureOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_merchant_int" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "distracted_buyer" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[STR] Intimidate him into handing over his stash.",
                    corruption: 3,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_merchant_str" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You grab the twitching man by the collar and demand the goods for free.",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_flees" } }] }
                    ],
                    failureOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_merchant_str" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "merchant_attacks" } }
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
                    text: "Walk away.",
                    customActionText: "Deciding to leave the raving lunatic alone, you walk away.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        browse_wares: {
            displayText: "The Mad Market",
            tone: "arcane",
            sfx: "gemChime",
            image: { col: 2, row: 1 },
            text: "He rips his cloak open, giggling wildly! \"Look!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "browse_wares_2" } }] }]
                }
            ]
        },

        browse_wares_2: {
            displayText: "The Mad Market",
            tone: "arcane",
            image: { col: 2, row: 1 },
            text: "\"Look! The pretties!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "browse_wares_3" } }] }]
                }
            ]
        },

        browse_wares_3: {
            displayText: "The Mad Market",
            tone: "arcane",
            image: { col: 2, row: 1 },
            text: "\"They sing in the dark! Buy them before they bite me again!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "browse_wares_4" } }] }]
                }
            ]
        },

        browse_wares_4: {
            displayText: "The Mad Market",
            tone: "arcane",
            image: { col: 2, row: 1 },
            text: "\"Hee hee!\"",
            decisions: [
                {
                    text: "Trade with the merchant.",
                    type: "open_shop",
                    shopId: "black_market_shop",
                    lootTableId: "plains",
                    rolls: 3,
                    wares: [
                        { id: "healing_herb", price: 150 }
                    ]
                },
                {
                    text: "Step back.",
                    customActionText: "You take a step back to reconsider.",
                    outcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery_3" } }] }
                    ]
                },
                {
                    text: "Leave.",
                    customActionText: "You decide not to buy anything and back away slowly.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        call_out_fakes: {
            displayText: "Caught Red-Handed",
            tone: "gold",
            sfx: "coinsJingle",
            sfxVolume: 0.6,
            image: { col: 0, row: 1 },
            text: "You quickly realize that half of the 'magical' gems are just painted glass. Confronted, the merchant violently pulls at his hair.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "call_out_fakes_2" } }] }]
                }
            ]
        },

        call_out_fakes_2: {
            displayText: "Caught Red-Handed",
            tone: "gold",
            image: { col: 0, row: 1 },
            text: "\"Lies! The stones are just sleeping!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "call_out_fakes_3" } }] }]
                }
            ]
        },

        call_out_fakes_3: {
            displayText: "Caught Red-Handed",
            tone: "gold",
            image: { col: 0, row: 1 },
            text: "\"Hush! Take the loud coins and leave us be!\"",
            decisions: [
                {
                    text: "Take the bribe.",
                    corruption: 3,   // magic used or a cruel act: corruption goes up
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_CURRENCY", payload: { amount: 50 } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    // --- NEW: Refusing the bribe triggers the ambush! ---
                    text: "Refuse the bribe.",
                    corruption: -2,   // a kind act: corruption goes down
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "You slap the coins away and draw your weapon.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // We can route them right to the merchant_attacks stage 
                                // so they get the cool flavor text of him calling his friends!
                                { type: "ADVANCE_STAGE", payload: { stageId: "merchant_attacks" } }
                            ]
                        }
                    ]
                }
            ]
        },

        distracted_buyer: {
            displayText: "Sleight of Hand",
            sfx: "coinsJingle",
            image: { col: 1, row: 1 },
            text: "You lean in close to inspect a shiny bauble. The merchant spouts frantic gibberish about sky-demons and shadow-teeth.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "distracted_buyer_2" } }] }]
                }
            ]
        },

        distracted_buyer_2: {
            displayText: "Sleight of Hand",
            image: { col: 1, row: 1 },
            text: "Suddenly, you notice your pack feels much lighter...",
            decisions: [
                {
                    text: "Check your pockets!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_CURRENCY", payload: { amount: -25, stealItemOnShortfall: true } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "merchant_escaped" } }
                            ]
                        }
                    ]
                }
            ]
        },

        merchant_escaped: {
            displayText: "He's Gone!",
            sfx: "smokeSfx",
            image: { col: 3, row: 1 },
            text: "By the time you realize you've been robbed, the mad merchant has vanished into the shadows, leaving nothing behind but manic, echoing giggles.",
            decisions: [
                {
                    text: "Curse your luck.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        merchant_flees: {
            displayText: "Cowardly Retreat",
            effect: "jolt",
            sfx: "shadyMerchantCry",
            image: { col: 2, row: 0 },
            text: "The merchant's eyes bug out with terror. \"The big ones!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_flees_2" } }] }]
                }
            ]
        },

        merchant_flees_2: {
            displayText: "Cowardly Retreat",
            image: { col: 2, row: 0 },
            text: "\"The scary ones! They eat the magic!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_flees_3" } }] }]
                }
            ]
        },

        merchant_flees_3: {
            displayText: "Cowardly Retreat",
            image: { col: 2, row: 0 },
            text: "He shrieks, dropping his heavy sack and scuttling away on all fours.",
            decisions: [
                {
                    text: "Loot the abandoned sack.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2 } },
                                { type: "AWARD_XP", payload: { amount: 15, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        merchant_attacks: {
            displayText: "A Deadly Mistake",
            tone: "blood",
            effect: "blood",
            sfx: "unsheathSwordSfx",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The merchant stops twitching. His eyes go completely dead.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_attacks_2" } }] }]
                }
            ]
        },

        merchant_attacks_2: {
            displayText: "A Deadly Mistake",
            tone: "blood",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "He draws a wickedly curved, poisoned dagger, giggling softly. \"The voices say you have too much blood...\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_attacks_3" } }] }]
                }
            ]
        },

        merchant_attacks_3: {
            displayText: "A Deadly Mistake",
            tone: "blood",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Come out, friends! Let's let it out!\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "merchant_attacks_4" } }] }]
                }
            ]
        },

        merchant_attacks_4: {
            displayText: "A Deadly Mistake",
            tone: "blood",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Hee hee!\" From the shadows, manic giggling echoes as deranged figures step into the light!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { 
                                    type: "START_BATTLE", 
                                    payload: { 
                                        // The spawn table handles the random reinforcements
                                        tableId: "madman_pack", 
                                        // The hardcoded array guarantees the merchant is leading them
                                        enemies: ["SHADY_MERCHANT"] 
                                    } 
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};
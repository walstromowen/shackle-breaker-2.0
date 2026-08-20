export const suspiciousMerchant = {
    id: "suspicious_merchant",
    title: "The Suspicious Merchant",
    imageSheet: "encounter_suspicious_merchant",
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Twitching Figure",
            image: { col: 0, row: 0 },
            text: "{name} spots a robed figure violently scratching his own neck in the shadows. He snaps his head around and hisses, \"Psst! You! Yes, you with the eyes! The shiny things whisper to me! They say you need them... yes, yes, they want you to have them!\"",
            decisions: [
                {
                    text: "Ask to see his wares.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "{name} nods cautiously and asks to see what the madman has for sale.",
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
                    customActionText: "{name} squints at the junk peeking out of the twitching man's coat...",
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
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 15,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_merchant_str" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} grabs the twitching man by the collar and demands the goods for free.",
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
                    customActionText: "Deciding to leave the raving lunatic alone, {name} walks away.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        browse_wares: {
            displayText: "The Mad Market",
            image: { col: 2, row: 1 },
            text: "He rips his cloak open, giggling wildly! \"Look! Look! The pretties! They sing in the dark! Buy them before they bite me again! Hee hee!\"",
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
                    customActionText: "{name} takes a step back to reconsider.",
                    outcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }
                    ]
                },
                {
                    text: "Leave.",
                    customActionText: "{name} decides not to buy anything and backs away slowly.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },

        call_out_fakes: {
            displayText: "Caught Red-Handed",
            image: { col: 0, row: 1 },
            text: "{name} quickly realizes that half of the 'magical' gems are just painted glass. Confronted, the merchant violently pulls at his hair. \"Lies! The stones are just sleeping! Hush! Take the loud coins and leave us be!\"",
            decisions: [
                {
                    text: "Take the bribe.",
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
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    customActionText: "{name} slaps the coins away and draws their weapon.",
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
            image: { col: 1, row: 1 },
            text: "{name} leans in close to inspect a shiny bauble. The merchant spouts frantic gibberish about sky-demons and shadow-teeth. Suddenly, {name} notices their coin purse feels much lighter...",
            decisions: [
                {
                    text: "Check your pockets!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_CURRENCY", payload: { amount: -25 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "merchant_escaped" } }
                            ]
                        }
                    ]
                }
            ]
        },

        merchant_escaped: {
            displayText: "He's Gone!",
            image: { col: 3, row: 1 },
            text: "By the time {name} realizes they've been robbed, the mad merchant has vanished into the shadows, leaving nothing behind but manic, echoing giggles.",
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
            image: { col: 2, row: 0 },
            text: "The merchant's eyes bug out with terror. \"The big ones! The scary ones! They eat the magic!\" He shrieks, dropping his heavy sack and scuttling away on all fours.",
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
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The merchant stops twitching. His eyes go completely dead. He draws a wickedly curved, poisoned dagger, giggling softly. \"The voices say you have too much blood... Come out, friends! Let's let it out! Hee hee!\" \n\nFrom the shadows, manic giggling echoes as deranged figures step into the light!",
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
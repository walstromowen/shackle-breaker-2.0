export const midnightHarvest = {
    id: "midnight_harvest",
    title: "The Midnight Harvest",
    imageSheet: "encounter_midnight_harvest",
    initialStage: "discovery",
    stages: {
        // ==========================================
        // 1. THE FIELD
        // ==========================================
        discovery: {
            displayText: "A Field at Midnight",
            image: { col: 0, row: 0 },
            bgm: "plainsOverworldNight",
            text: "Moonlight silvers a wheat field that should have been cut weeks ago. No wind moves, yet every stalk leans toward a single scarecrow standing in the middle. No crows perch on it. No crows are anywhere.",
            decisions: [
                {
                    text: "Approach the scarecrow.",
                    customActionText: "You part the stalks and walk toward the figure in the middle of the field...",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scarecrow" } }] }]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the field alone.",
                    customActionText: "You decide some fields are better left unharvested and turn back to the road.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        // ==========================================
        // 2. THE SCARECROW (hub)
        // ==========================================
        scarecrow: {
            displayText: "The Scarecrow",
            image: { col: 1, row: 0 },
            text: "Up close, the scarecrow is taller than it looked. Its tattered coat sways though there is no wind, and its straw fingers are wrapped around a scythe with a bright, unrusted blade. Its sackcloth face has no features, but you can't shake the feeling that it is facing you.",
            decisions: [
                {
                    text: "Examine the scarecrow.",
                    customActionText: "You step close and study the scarecrow, careful not to touch it yet...",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "examine_scarecrow" } }] }]
                },
                {
                    text: "[ATN] Sense the field.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 11,
                    conditions: [{ type: "context_flag_not_set", flagId: "sensed_field" }, { type: "context_flag_not_set", flagId: "failed_harvest_sense" }],
                    customActionText: "You close your eyes and let your senses loosen over the silent field...",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "sensed_field" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "spirit_field" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 2,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_harvest_sense" } },
                                { type: "MODIFY_VITALS", payload: { insight: -10 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "whispers_overwhelm" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_harvest_sense" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "scarecrow_stirs" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[DEX] Pry the scythe from its hands.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 13,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_harvest_scythe" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You reach out and work the scythe's haft free, one straw finger at a time...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scythe_taken" } }] }],
                    failureOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_harvest_scythe" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "scarecrow_stirs" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[Illuminating Herb] Burn it in pale light.",
                    conditions: [
                        { type: "has_item", itemId: "illuminating_herb", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You crush the illuminating herb between your palms. Pale light blooms, and you press it into the scarecrow's chest...",
                    outcomes: [
                        {
                            weight: 2,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "illuminating_herb", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "scarecrow_burns" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "illuminating_herb", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "scarecrow_burns_awake" } }
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
                    text: "Back away slowly.",
                    customActionText: "You back away without turning around, and do not look back until the field is out of sight.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        // ==========================================
        // 3. EXAMINATION (hub + three inspections)
        // ==========================================
        examine_scarecrow: {
            displayText: "A Closer Look",
            image: { col: 1, row: 0 },
            text: "Three things about the scarecrow don't sit right: the stuffing in its chest, the coat it wears, and the blade in its hands.",
            decisions: [
                {
                    text: "Inspect the stuffing.",
                    conditions: [{ type: "context_flag_not_set", flagId: "examined_straw" }],
                    customActionText: "You part the coat at the scarecrow's chest and look inside...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "examined_straw" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "inspect_straw" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Inspect the stitched coat.",
                    conditions: [{ type: "context_flag_not_set", flagId: "examined_clothes" }],
                    customActionText: "You turn back the collar of the scarecrow's coat...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "examined_clothes" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "inspect_clothes" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Study the scythe.",
                    conditions: [{ type: "context_flag_not_set", flagId: "examined_scythe" }],
                    customActionText: "You lean in to study the scarecrow's scythe, close enough to see your own face in the blade...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "examined_scythe" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "inspect_scythe" } }
                            ]
                        }
                    ]
                },
                {
                    // Only appears once all three inspections are done
                    text: "[INT] Put the pieces together and lay it to rest.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_set", flagId: "examined_straw" },
                        { type: "context_flag_set", flagId: "examined_clothes" },
                        { type: "context_flag_set", flagId: "examined_scythe" },
                        { type: "context_flag_not_set", flagId: "failed_harvest_rest" }
                    ],
                    customActionText: "You lay the clues out in your mind and begin to read the stitched names aloud, one by one...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "lay_to_rest" } }] }],
                    failureOutcomes: [
                        {
                            weight: 2,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_harvest_rest" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "words_falter" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_harvest_rest" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "scarecrow_stirs" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Step back.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scarecrow" } }] }]
                }
            ]
        },

        inspect_straw: {
            displayText: "Not Straw",
            image: { col: 2, row: 0 },
            text: "It isn't straw. The stuffing is grey, fine and faintly warm, like hair, or like something that used to be alive. It clings to your fingers and hums. Beneath the hum are voices, many of them, too faint to understand, and then gone.",
            decisions: [
                {
                    text: "Return to the scarecrow.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "examine_scarecrow" } }] }]
                }
            ]
        },

        inspect_clothes: {
            displayText: "Stitched Names",
            image: { col: 3, row: 0 },
            text: "The coat is patched a hundred times over. Along the inside of the lining, names are stitched in different hands: farmers, soldiers, children, and a handful in the old Alterian script. The newest stitching is still bright, the thread not yet dulled.",
            decisions: [
                {
                    text: "Return to the scarecrow.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "examine_scarecrow" } }] }]
                }
            ]
        },

        inspect_scythe: {
            displayText: "A Strange Blade",
            image: { col: 0, row: 1 },
            text: "The blade is unrusted, bright as the moon. The haft is worn smooth in two places, as if by countless gripping hands. Not one stalk of wheat beneath it has ever been cut. This was never a tool for crops.",
            decisions: [
                {
                    text: "Return to the scarecrow.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "examine_scarecrow" } }] }]
                }
            ]
        },

        // ==========================================
        // 4. SPIRIT SIGHT
        // ==========================================
        spirit_field: {
            displayText: "The True Harvest",
            image: { col: 1, row: 1 },
            text: "The wheat is not wheat. Every stalk is a thin, wavering figure with its face turned toward the scarecrow, mouths moving without sound. Threads of pale light run from each one to the scarecrow's chest, and every so often a stalk goes dark and is gone. The scarecrow isn't guarding this field. It is harvesting it.",
            decisions: [
                {
                    text: "Gather the spirits' fading warmth.",
                    customActionText: "You hold out a hand. The dimmest of the lights settles into your palm, grateful, and then it is gone.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { insight: 15, stamina: 10 } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Return to the scarecrow.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scarecrow" } }] }]
                }
            ]
        },

        whispers_overwhelm: {
            displayText: "Too Many Voices",
            image: { col: 1, row: 1 },
            text: "The whispers rush in all at once: hundreds of voices begging, naming, counting. You stagger back with ringing ears and a mind stretched thin.",
            decisions: [
                {
                    text: "Steady yourself.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scarecrow" } }] }]
                }
            ]
        },

        // ==========================================
        // 5. PEACEFUL RESOLUTION
        // ==========================================
        lay_to_rest: {
            displayText: "Laid to Rest",
            image: { col: 2, row: 1 },
            text: "As you read the last name, the thread unravels on its own. Pale wisps lift from the straw, the wheat and the coat's lining, dozens and then hundreds, thinning into the moonlight. The scarecrow slumps into a pile of old clothes and nothing else. Something small and bright lies in the dirt at its feet.",
            decisions: [
                {
                    text: "Pick up the bright object.",
                    customActionText: "You kneel and close a hand around the faintly glowing object.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { itemId: "insight_of_light", qty: 1 } },
                                { type: "MODIFY_VITALS", payload: { insight: 10 } },
                                { type: "AWARD_XP", payload: { amount: 25, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        words_falter: {
            displayText: "Silence",
            image: { col: 1, row: 0 },
            text: "The names tangle on your tongue. The threads tighten instead of loosening, and the scarecrow's head tilts a fraction, as if listening. Nothing else happens. Yet.",
            decisions: [
                {
                    text: "Step back from the scarecrow.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "scarecrow" } }] }]
                }
            ]
        },

        // ==========================================
        // 6. THE SCYTHE
        // ==========================================
        scythe_taken: {
            displayText: "A Borrowed Blade",
            image: { col: 3, row: 1 },
            text: "The scythe comes free with a soft sigh, like a breath let out. The scarecrow doesn't move. Its straw fingers stay curled around nothing, and its blank sackcloth face follows you as you step back.",
            decisions: [
                {
                    text: "Slip away with the scythe.",
                    customActionText: "You back out of the field with the scythe held low, and do not hear a single rustle behind you.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { itemId: "scythe", qty: 1 } },
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
        // 7. THE HERB
        // ==========================================
        scarecrow_burns: {
            displayText: "Burned Away",
            image: { col: 0, row: 2 },
            text: "The pale light catches. The straw shrieks, high and many-voiced, and the scarecrow crumbles in on itself. A cloud of faint wisps lifts from the ash and scatters across the field. When the light dies, only a heap of ash and cinders is left.",
            decisions: [
                {
                    text: "Sift through the ashes.",
                    customActionText: "You crouch and sift the warm ash through your fingers.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 2 } },
                                { type: "AWARD_XP", payload: { amount: 15, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        // ==========================================
        // COMBAT
        // (no has_tag gate: a non-humanoid lead would otherwise see no buttons)
        // ==========================================
        scarecrow_burns_awake: {
            displayText: "Burning Alive!",
            image: { col: 1, row: 2 },
            bgm: "plainsBattleBgm",
            text: "The straw catches, but the scarecrow doesn't die. It tears free of its post, burning and screeching, and swings its bright scythe at you!",
            decisions: [
                {
                    text: "Finish it!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [{ id: "HOLLOW_HARVESTER", startingHpPercent: 0.5 }] } }] }]
                }
            ]
        },

        scarecrow_stirs: {
            displayText: "It Stirs!",
            image: { col: 2, row: 2 },
            bgm: "plainsBattleBgm",
            text: "The scarecrow's head snaps toward you. Its straw fingers tighten on the scythe, its coat splits open at the seams, and a hollow shape unfolds from the wreckage with wheat and moonlight clinging to its blade.",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [{ id: "HOLLOW_HARVESTER", levelOffset: 1 }] } }] }]
                }
            ]
        }
    }
};
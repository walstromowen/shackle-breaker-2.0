export const tracksInTheSnow = {
    id: "tracks_in_the_snow",
    title: "Tracks In The Snow",
    imageSheet: "encounter_tracks_in_the_snow",
    initialStage: "discovery",
    stages: {
        // ==========================================
        // 1. TRACKS IN THE SNOW (first set of tracks)
        // ==========================================
        discovery: {
            displayText: "Tracks In The Snow",
            image: { col: 0, row: 0 },
            text: "{name} notices tracks in the snow.",
            decisions: [
                {
                    text: "[ATN] Follow the tracks.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    customActionText: "{name} follows the tracks.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "tracks_continue" } }] },
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "crimson_snow" } }] },
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "deer_on_the_road" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "something_approaches" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "tracks_lost" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave.",
                    customActionText: "{name}'s party moves on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        // Retry stage: the old "retry" result. No flag is set, so the player may keep searching
        // (each failure still risks the ambush above).
        tracks_lost: {
            displayText: "Lost The Trail",
            image: { col: 0, row: 0 },
            text: "{name} wanders in the snow looking for more tracks.",
            decisions: [
                {
                    text: "Look again.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
                }
            ]
        },

        // Shared by all three tracking stages. NOTE: START_BATTLE has no "stage after the battle"
        // option, so the old "fight, then continue to the next stage" flow ends the encounter here.
        // The tracks object stays on the map, so the player can pick the trail up again afterwards.
        something_approaches: {
            displayText: "Ambush!",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "Something approaches {name}'s position!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "snowy_mountains_battles_day" } }] }]
                }
            ]
        },

        // ==========================================
        // 2. MORE TRACKS
        // ==========================================
        tracks_continue: {
            displayText: "Tracks In The Snow",
            image: { col: 0, row: 0 },
            text: "{name} sees more tracks ahead.",
            decisions: [
                {
                    text: "[ATN] Follow the tracks.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    customActionText: "{name} follows the tracks.",
                    successOutcomes: [
                        { weight: 2, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "crimson_snow" } }] },
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "deer_on_the_road" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "something_approaches" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "tracks_lost_again" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave.",
                    customActionText: "{name}'s party moves on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        tracks_lost_again: {
            displayText: "Lost The Trail",
            image: { col: 0, row: 0 },
            text: "{name} wanders in the snow looking for more tracks.",
            decisions: [
                {
                    text: "Look again.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "tracks_continue" } }] }]
                }
            ]
        },

        // ==========================================
        // 2b. DEER ALONG THE ROAD (alternate result of following the tracks)
        // ==========================================
        deer_on_the_road: {
            displayText: "A Deer Along The Road",
            image: { col: 1, row: 1 },
            text: "The tracks lead {name} off the road to a lone deer grazing in the snow. It hasn't noticed the party yet.",
            decisions: [
                {
                    text: "[DEX] Stalk and hunt the deer.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_deer_hunt" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} crouches low and creeps toward the deer...",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deer_hunted" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_deer_hunt" } }, { type: "ADVANCE_STAGE", payload: { stageId: "deer_escapes" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the deer in peace.",
                    customActionText: "{name} lets the deer graze and returns to the road.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        deer_hunted: {
            displayText: "A Clean Kill",
            image: { col: 2, row: 1 },
            text: "{name} closes the distance unseen and brings the deer down in a single, clean strike.",
            decisions: [
                {
                    text: "Take the hide and bones.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // No raw meat / venison item exists yet; swap in one here when it does.
                                { type: "GIVE_ITEM", payload: { items: [{ id: "fur", qty: 2 }, { id: "bone", qty: 2 }] } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        deer_escapes: {
            displayText: "It Bolts!",
            image: { col: 1, row: 1 },
            text: "A branch cracks under {name}'s foot. The deer's head snaps up and it bounds off through the snow, gone in a heartbeat.",
            decisions: [
                {
                    text: "Return to the road.",
                    outcomes: [{ weight: 100, results: [{ type: "DESTROY_OBJECT" }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        // ==========================================
        // 3. CRIMSON SNOW
        // ==========================================
        crimson_snow: {
            displayText: "Crimson Snow",
            image: { col: 1, row: 0 },
            text: "{name} sees crimson red snow ahead.",
            decisions: [
                {
                    // The old check listed ["attunement", "panzerian"]; the new system takes a single attribute.
                    text: "[ATN] Investigate.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    customActionText: "{name} investigates the red snow.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "wounded_leopard" } }] },
                        { weight: 1, results: [{ type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "ADVANCE_STAGE", payload: { stageId: "apex_predator" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "something_approaches" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "nothing_noteworthy" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave.",
                    customActionText: "{name}'s party moves on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        nothing_noteworthy: {
            displayText: "Nothing Found",
            image: { col: 1, row: 0 },
            text: "{name} doesn't see anything noteworthy.",
            decisions: [
                {
                    text: "Look again.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "crimson_snow" } }] }]
                }
            ]
        },

        // ==========================================
        // 4. WOUNDED SNOW LEOPARD
        // ==========================================
        wounded_leopard: {
            displayText: "Wounded Snow Leopard",
            image: { col: 2, row: 0 },
            text: "{name} sees a snow leopard laying in the snow ahead. It appears to be injured.",
            decisions: [
                {
                    text: "[Bandage] Bandage the Snow Leopard.",
                    type: "skill_check",
                    attribute: "none",
                    threshold: 5,
                    conditions: [
                        { type: "has_item", itemId: "bandage", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "{name} attempts to bandage the Snow Leopard.",
                    successOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: -5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "leopard_nuzzle" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: -5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "leopard_trappers" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "MODIFY_CORRUPTION", payload: { amount: -2, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "leopard_wild" } }
                            ]
                        },
                        {
                            weight: 1,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "leopard_pack_ambush" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Put the wounded animal to rest.",
                    type: "skill_check",
                    attribute: "none",
                    threshold: 12,
                    customActionText: "{name} approaches the Snow Leopard.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "leopard_put_to_rest" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "leopard_trappers" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "leopard_wild" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "leopard_pack_ambush" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave.",
                    customActionText: "{name}'s party moves on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        leopard_nuzzle: {
            displayText: "A New Friend",
            image: { col: 2, row: 0 },
            text: "The Snow Leopard nuzzles {name}.",
            decisions: [
                {
                    text: "Signal the Snow Leopard to follow.",
                    customActionText: "{name} gives the Snow Leopard a gentle pat, signaling it to follow.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "SNOW_LEOPARD" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        leopard_put_to_rest: {
            displayText: "A Merciful End",
            image: { col: 2, row: 1 },
            text: "{name} ends the Snow Leopard's suffering quickly. Its pelt is still in good condition.",
            decisions: [
                {
                    text: "Take the pelts.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                // The old reward was 3 Pelts; the item list has "fur" instead (used by the leather recipe).
                                { type: "GIVE_ITEM", payload: { items: [{ id: "fur", qty: 3 }] } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },

        // --- Shared failure stages for the bandage and put-to-rest checks ---
        // (forced fights: no has_tag gate, so a non-humanoid active character can never be soft-locked)
        leopard_trappers: {
            displayText: "Trappers Attack!",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "An arrow flies out of nowhere and hits the Snow Leopard. The Snow Leopard breathes its last breath, leaving {name}'s party alone with a pack of frozen trappers!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    // The old ambush rolled 1-4 hostiles; kept as four equally weighted outcomes.
                    outcomes: [
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: ["FROZEN_TRAPPER"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: ["FROZEN_TRAPPER", "FROZEN_TRAPPER"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: ["FROZEN_TRAPPER", "FROZEN_TRAPPER", "FROZEN_TRAPPER"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: ["FROZEN_TRAPPER", "FROZEN_TRAPPER", "FROZEN_TRAPPER", "FROZEN_TRAPPER"] } }] }
                    ]
                }
            ]
        },

        leopard_wild: {
            displayText: "The Snow Leopard Rises",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The Snow Leopard stands to its feet and growls at {name}!",
            decisions: [
                {
                    text: "Defend yourself!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "DESTROY_OBJECT" },
                                { type: "START_BATTLE", payload: { enemies: [{ id: "SNOW_LEOPARD", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }] } }
                            ]
                        }
                    ]
                }
            ]
        },

        // The old ambush rolled 1-4 extra Snow Leopards; that is kept as four equally weighted outcomes.
        leopard_pack_ambush: {
            displayText: "Ambush!",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "An ambush of Snow Leopards surrounds {name}!",
            decisions: [
                {
                    text: "Fight for your life!",
                    outcomes: [
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: [{ id: "SNOW_LEOPARD", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "SNOW_LEOPARD"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: [{ id: "SNOW_LEOPARD", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "SNOW_LEOPARD", "SNOW_LEOPARD"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: [{ id: "SNOW_LEOPARD", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "SNOW_LEOPARD", "SNOW_LEOPARD", "SNOW_LEOPARD"] } }] },
                        { weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { enemies: [{ id: "SNOW_LEOPARD", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "SNOW_LEOPARD", "SNOW_LEOPARD", "SNOW_LEOPARD", "SNOW_LEOPARD"] } }] }
                    ]
                }
            ]
        },

        // ==========================================
        // 5. APEX PREDATOR
        // ==========================================
        apex_predator: {
            displayText: "Apex Predator",
            image: { col: 0, row: 1 },
            bgm: "apexPredatorBgm", // old track: "Escape Route"; register this key in main.js
            text: "(An unnatural beast growls...)",
            decisions: [
                {
                    text: "Attack!",
                    customActionText: "{name} attacks!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["PANZERKAMFER"], bgm: "apexPredatorBgm" } }] }]
                },
                {
                    // The old check listed ["strength", "dexterity"]; the new system takes a single attribute.
                    text: "[DEX] Run!",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 15,
                    customActionText: "{name} attempts to flee!",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "predator_escape" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "predator_cut_off" } }] }
                    ]
                }
            ]
        },

        predator_escape: {
            displayText: "A Narrow Escape",
            image: { col: 0, row: 1 },
            text: "{name} escapes the predator!",
            decisions: [
                {
                    text: "Keep moving.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        predator_cut_off: {
            displayText: "Cut Off!",
            image: { col: 0, row: 1 },
            bgm: "apexPredatorBgm",
            text: "The predator cuts off {name}'s escape!",
            decisions: [
                {
                    text: "Fight for your life!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["PANZERKAMFER"], bgm: "apexPredatorBgm" } }] }]
                }
            ]
        }
    }
};
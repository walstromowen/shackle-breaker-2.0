export const encounterDefinitions = {
    // ==========================================
    // 1. MAP OBJECT ENCOUNTER: OAK TREE
    // ==========================================
    "oak_tree": {
        id: "oak_tree",
        title: "A Sturdy Oak", // <-- Used directly by the UI now
        initialStage: "approach",
        stages: {
            "approach": {
                imageId: "encounters",
                bgm: "plainsOverworldNight", // <-- BGM added
                text: "An oak tree towers over you. Its thick trunk looks like it has stood here for many years.",
                decisions: [
                    {
                        text: "[STR] Chop down the tree for wood.",
                        type: "skill_check",
                        attribute: "strength",
                        threshold: 8,
                        successOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_success" } }] }
                        ],
                        failureOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_fail" } }] }
                        ]
                    },
                    {
                        text: "Leave.",
                        outcomes: [
                            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                        ]
                    },
                    {
                        text: "Switch character.",
                        type: "switch_character",
                        conditions: [
                            { type: "has_other_party_members" }
                        ]
                    },
                ]
            },
            "chopped_success": {
                imageId: "encounters",
                bgm: "plainsOverworldNight", // <-- BGM shifts on success
                text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\nWith a flawless strike, the ancient tree groans and crashes to the earth.",
                decisions: [
                    {
                        text: "Collect the wood.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "GIVE_ITEM", payload: { itemId: "soft_wood", qty: 3 } },
                                    { type: "DESTROY_OBJECT" }, 
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            },
            "chopped_fail": {
                imageId: "encounters",
                text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\nYour axe glances off the thick bark. You jar your arms terribly but fail to bring it down.",
                decisions: [
                    {
                        text: "Leave.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "TAKE_DAMAGE", payload: { amount: 2, target: "active_character" } },
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    },

    // ==========================================
    // 2. RANDOM ENCOUNTER: WOUNDED MUTT
    // ==========================================
    "wounded_mutt": {
        id: "wounded_mutt",
        title: "The Wounded Mutt",
        initialStage: "discovery",
        stages: {
            "discovery": {
                imageId: "encounters",
                bgm: "tense_strings",
                text: "You hear a faint whimper. You find a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.",
                decisions: [
                    {
                        text: "Offer it some food to calm it down.",
                        outcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_food" } }] }
                        ]
                    },
                    {
                        text: "Reach out and try to bandage the wound directly.",
                        outcomes: [
                            { weight: 40, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] },
                            { weight: 60, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rushed_bandage" } }] }
                        ]
                    },
                    {
                        text: "Leave the poor creature to its fate.",
                        outcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }
                        ]
                    }
                ]
            },
            "offer_food": {
                imageId: "encounters",
                text: "You toss a piece of dried meat toward the dog. It sniffs cautiously before gobbling it up. It seems to trust you now.",
                decisions: [
                    {
                        text: "Carefully bandage its leg.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                    { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }
                                ]
                            }
                        ]
                    }
                ]
            },
            "rushed_bandage": {
                imageId: "encounters",
                bgm: "battle_prelude",
                text: "Startled and in pain, the wild mutt snaps fiercely at your hand!",
                decisions: [
                    {
                        text: "Take the bite and force the bandages on.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { 
                                        type: "MODIFY_VITALS", 
                                        payload: { hp: -50, stamina: -10, insight: 0, damageType: "pierce", isPercentage: true, bypassDefense: false }
                                    },
                                    // ---> NEW STATUS EFFECT PAYLOAD <---
                                    {
                                        type: "APPLY_STATUS_EFFECT",
                                        payload: { effectId: "bleed", charges: 3, target: "active_character" }
                                    },
                                    // -----------------------------------
                                    { type: "ADVANCE_STAGE", payload: { stageId: "success_tame_hurt" } }
                                ]
                            }
                        ]
                    },
                    {
                        text: "Back off and draw your weapon!",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "START_BATTLE", payload: { enemies: ["WOLF"] } }
                                ]
                            }
                        ]
                    }
                ]
            },
            "success_tame": {
                imageId: "bg_forest_dog_happy",
                bgm: "happy_theme",
                text: "You skillfully wrap the wound. The dog licks your hand in gratitude. You have a new friend.",
                decisions: [
                    {
                        text: "Let's go, boy.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "RECRUIT_CHARACTER", payload: { entityId: "BEAST" } },
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            },
            "success_tame_hurt": {
                imageId: "bg_forest_dog_happy",
                bgm: "happy_theme",
                text: "The dog's teeth sink into your hand, but you endure the pain to wrap the wound. The dog whines apologetically.",
                decisions: [
                    {
                        text: "Ouch... Good boy.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "RECRUIT_CHARACTER", payload: { entityId: "BEAST" } },
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            },
            "walk_away": {
                imageId: "bg_forest_path",
                bgm: "forest_ambient",
                text: "You turn your back on the whimpering animal. The wilds are unforgiving, and you must look out for yourself.",
                decisions: [
                    {
                        text: "Continue your journey.",
                        outcomes: [
                            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                        ]
                    }
                ]
            }
        }
    }
};
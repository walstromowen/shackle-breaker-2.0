export const encounterDefinitions = {
    // ==========================================
    // 1. MAP OBJECT ENCOUNTER: OAK TREE
    // ==========================================
    "oak_tree": {
        id: "oak_tree",
        title: "A Sturdy Oak",
        initialStage: "approach",
        stages: {
            "approach": {
                image: { sheet: "encounters", col: 0, row: 0 },
                bgm: "plainsOverworldNight",
                text: "An oak tree towers over {name}. Its thick trunk looks like it has stood here for many years.",
                decisions: [
                    {
                        text: "[STR] Chop down the tree for wood.",
                        type: "skill_check",
                        attribute: "strength",
                        threshold: 8,
                        customActionText: "{name} grips their weapon tightly and takes a massive swing at the sturdy trunk...",
                        successOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_success" } }] }
                        ],
                        failureOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_fail" } }] }
                        ]
                    },
                    {
                        text: "Leave.",
                        customActionText: "{name} decides it's not worth the effort and walks away.",
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
                image: { sheet: "encounters", col: 1, row: 0 },
                bgm: "plainsOverworldNight",
                text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\nWith a flawless strike, the ancient tree groans and crashes to the earth. {name} spots a small coin pouch tangled in its roots!",
                decisions: [
                    {
                        text: "Collect the wood and the pouch.",
                        customActionText: "{name} gathers up the heavy wood and pockets the loose coins.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "GIVE_ITEM", payload: { itemId: "soft_wood", qty: 3 } },
                                { type: "AWARD_XP", payload: { amount: 25, target: "active_character" } },
                                { type: "MODIFY_CURRENCY", payload: { amount: 15 } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]}
                        ]
                    }
                ]
            },
            "chopped_fail": {
                image: { sheet: "encounters", col: 2, row: 0 },
                text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\n{name}'s axe glances off the thick bark. {name} jars their arms terribly but fails to bring it down.",
                decisions: [
                    {
                        text: "Leave.",
                        customActionText: "{name} rubs their sore arms, cursing the old tree before walking away.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "TAKE_DAMAGE", payload: { amount: 2, target: "active_character" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]}
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
                image: { sheet: "encounters", col: 0, row: 1 },
                bgm: "tense_strings",
                text: "{name} hears a faint whimper and finds a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.",
                decisions: [
                    {
                        text: "Offer it some food to calm it down.",
                        customActionText: "{name} slowly reaches into their pack, tossing a scrap of food toward the anxious animal...",
                        outcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_food" } }] }
                        ]
                    },
                    {
                        text: "[ATT] Attempt to calm the beast and bandage its wound.",
                        type: "skill_check",
                        attribute: "attunement",
                        threshold: 12,
                        customActionText: "{name} relies on a calming presence, reaching out to soothe and bandage the wound before the mutt can react...",
                        successOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] }
                        ],
                        failureOutcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rushed_bandage" } }] }
                        ]
                    },
                    {
                        text: "Leave the poor creature to its fate.",
                        customActionText: "{name} hardens their heart and steps away, leaving the wilds to claim it.",
                        outcomes: [
                            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }
                        ]
                    }
                ]
            },
            "offer_food": {
                image: { sheet: "encounters", col: 1, row: 1 },
                text: "{name} tosses a piece of dried meat toward the dog. It sniffs cautiously before gobbling it up. It seems to trust {name} now.",
                decisions: [
                    {
                        text: "Carefully bandage its leg.",
                        customActionText: "With the dog distracted by the food, {name} gently wraps the wounded leg.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "bandage", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }
                            ]}
                        ]
                    }
                ]
            },
            "rushed_bandage": {
                image: { sheet: "encounters", col: 2, row: 1 },
                bgm: "battle_prelude",
                text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\nStartled and in pain, the wild mutt snaps fiercely at {name}'s hand!",
                decisions: [
                    {
                        text: "Take the bite and force the bandages on.",
                        customActionText: "{name} grits their teeth, ignoring the fangs sinking into their flesh to finish the job.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "MODIFY_VITALS", payload: { hp: -50, stamina: -10, insight: 0, damageType: "pierce", isPercentage: true, bypassDefense: false } },
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "bleed", charges: 3, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "success_tame_hurt" } }
                            ]}
                        ]
                    },
                    {
                        text: "Back off and draw a weapon!",
                        customActionText: "{name} jumps backward with a curse, drawing their weapon as the beast lunges!",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "START_BATTLE", payload: { enemies: ["WOLF"] } }
                            ]}
                        ]
                    }
                ]
            },
            "success_tame": {
                image: { sheet: "encounters", col: 3, row: 1 },
                bgm: "happy_theme",
                text: "{name} skillfully wraps the wound. The dog licks {name}'s hand in gratitude. {name} has a new friend.",
                decisions: [
                    {
                        text: "Let's go, boy.",
                        customActionText: "{name} gives the dog an affectionate pat, signaling it to follow.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "BEAST" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]}
                        ]
                    }
                ]
            },
            "success_tame_hurt": {
                image: { sheet: "encounters", col: 3, row: 1 },
                bgm: "happy_theme",
                text: "The dog's teeth sink into {name}'s hand, but {name} endures the pain to wrap the wound. Realizing {name} helped it, the dog whines apologetically.",
                decisions: [
                    {
                        text: "Ouch... Good boy.",
                        customActionText: "{name} winces while bandaging their own hand, then pats the dog on the head.",
                        outcomes: [
                            { weight: 100, results: [
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "BEAST" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]}
                        ]
                    }
                ]
            },
            "walk_away": {
                image: { sheet: "encounters", col: 4, row: 1 },
                bgm: "forest_ambient",
                text: "{name} turns their back on the whimpering animal. The wilds are unforgiving, and one must look out for themselves.",
                decisions: [
                    {
                        text: "Continue your journey.",
                        customActionText: "{name} presses onward, trying to ignore the fading whimpers.",
                        outcomes: [
                            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                        ]
                    }
                ]
            }
        }
    }
};
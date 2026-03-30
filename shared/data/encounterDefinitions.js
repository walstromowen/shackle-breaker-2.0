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
                imageId: "bg_forest_oak",
                text: "A massive oak tree towers over you. Its thick trunk looks like it has stood here for centuries.",
                decisions: [
                    {
                        text: "Chop it down.",
                        outcomes: [
                            {
                                weight: 100, // 100% chance
                                results: [
                                    { type: "ADVANCE_STAGE", payload: { stageId: "chopped_down" } }
                                ]
                            }
                        ]
                    },
                    {
                        text: "Leave the tree in peace.",
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
            "chopped_down": {
                imageId: "bg_forest_stump",
                text: "With a few mighty swings, the ancient tree groans and crashes to the earth, yielding sturdy wood.",
                decisions: [
                    {
                        text: "Collect the wood.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
        { type: "GIVE_ITEM", payload: { itemId: "soft_wood", qty: 3 } },
        { type: "DESTROY_OBJECT" }, // <-- Use the one you already built!
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
                imageId: "bg_forest_bushes",
                text: "You hear a faint whimper. You find a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.",
                decisions: [
                    {
                        text: "Offer it some food to calm it down.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_food" } }]
                            }
                        ]
                    },
                    {
                        text: "Reach out and try to bandage the wound directly.",
                        outcomes: [
                            {
                                weight: 40, // 40% chance you succeed without getting bitten
                                results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }]
                            },
                            {
                                weight: 60, // 60% chance the dog panics
                                results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rushed_bandage" } }]
                            }
                        ]
                    },
                    {
                        text: "Leave the poor creature to its fate.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }]
                            }
                        ]
                    }
                ]
            },
            "offer_food": {
                imageId: "bg_forest_dog_calm",
                text: "You toss a piece of dried meat toward the dog. It sniffs cautiously before gobbling it up. It seems to trust you now.",
                decisions: [
                    {
                        text: "Carefully bandage its leg.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "REMOVE_ITEM", payload: { itemId: "rations", qty: 1 } },
                                    { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }
                                ]
                            }
                        ]
                    }
                ]
            },
            "rushed_bandage": {
                imageId: "bg_forest_dog_angry",
                text: "Startled and in pain, the wild mutt snaps fiercely at your hand!",
                decisions: [
                    {
                        text: "Take the bite and force the bandages on.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "TAKE_DAMAGE", payload: { amount: 5, target: "active_character" } },
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
                                    { type: "START_BATTLE", payload: { enemies: ["wild_dog"], background: "bg_forest" } }
                                ]
                            }
                        ]
                    }
                ]
            },
            "success_tame": {
                imageId: "bg_forest_dog_happy",
                text: "You skillfully wrap the wound. The dog licks your hand in gratitude. You have a new friend.",
                decisions: [
                    {
                        text: "Let's go, boy.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "RECRUIT_PARTY_MEMBER", payload: { entityId: "mutt_companion" } },
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            },
            "success_tame_hurt": {
                imageId: "bg_forest_dog_happy",
                text: "The dog's teeth sink into your hand, but you endure the pain to wrap the wound. The dog whines apologetically.",
                decisions: [
                    {
                        text: "Ouch... Good boy.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [
                                    { type: "RECRUIT_PARTY_MEMBER", payload: { entityId: "mutt_companion" } },
                                    { type: "END_ENCOUNTER", payload: null }
                                ]
                            }
                        ]
                    }
                ]
            },
            "walk_away": {
                imageId: "bg_forest_path",
                text: "You turn your back on the whimpering animal. The wilds are unforgiving, and you must look out for yourself.",
                decisions: [
                    {
                        text: "Continue your journey.",
                        outcomes: [
                            {
                                weight: 100,
                                results: [{ type: "END_ENCOUNTER", payload: null }]
                            }
                        ]
                    }
                ]
            }
        }
    }
};
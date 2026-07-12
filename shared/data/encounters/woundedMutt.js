export const woundedMutt = { 
    id: "wounded_mutt", 
    title: "The Wounded Mutt", 
    imageSheet: "encounter_wounded_mutt", 
    initialStage: "discovery", 
    stages: { 
        "discovery": { 
            image: { col: 0, row: 0 }, 
            text: "{name} hears a faint whimper and finds a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.", 
            decisions: [ 
                { 
                    text: "Approach calmly to offer help.", 
                    customActionText: "{name} slowly steps forward, speaking in a low, soothing voice to comfort the anxious animal...", 
                    outcomes: [ 
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_help" } }] } 
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
        "offer_help": { 
            image: { col: 1, row: 0 }, 
            text: "Hearing {name}'s gentle tone, the dog stands up.", 
            decisions: [ 
                { 
                    // 🎲 CHOICE A: Safer bet, consumes item, lower attribute threshold
                    text: "[Healing Herb] [ATT] Attempt to treat the wound using a healing herb.", 
                    type: "skill_check", 
                    attribute: "attunement", 
                    threshold: 12, 
                    customActionText: "{name} crushes the healing herb and carefully reaches toward the raw, bleeding leg...", 
                    conditions: [ 
                        { type: "has_item", itemId: "healing_herb", qty: 1 } 
                    ], 
                    successOutcomes: [ 
                        { 
                            weight: 100, 
                            results: [ 
                                { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, 
                                { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } } 
                            ] 
                        } 
                    ],
                    failureOutcomes: [ 
                        { 
                            weight: 100, 
                            results: [ 
                                { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, 
                                { type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } } 
                            ] 
                        } 
                    ] 
                },
                { 
                    // 🎲 CHOICE B: High risk, saves item, high precision dexterity threshold
                    text: "[DEX] Carefully dress and clean the raw wound with your bare hands.", 
                    type: "skill_check", 
                    attribute: "dexterity", 
                    threshold: 15, 
                    customActionText: "{name} attempts to rapidly and precisely clean the dirt away from the jagged slash with empty hands...", 
                    successOutcomes: [ 
                        { 
                            weight: 100, 
                            results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] 
                        } 
                    ],
                    failureOutcomes: [ 
                        { 
                            weight: 100, 
                            results: [{ type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } }] 
                        } 
                    ] 
                },
                { 
                    text: "Back away slowly.", 
                    customActionText: "{name} decides not to push their luck any further and slips away.", 
                    outcomes: [ 
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] } 
                    ] 
                } 
            ] 
        }, 
        "startled_mutt": { 
            image: { col: 3, row: 0 }, 
          bgm: "plainsBattleBgm",
            text: "The wild mutt panics! It yelps in sudden terror and snaps fiercely, sinking its teeth deep into {name}'s arm before lunging outright!", 
            decisions: [ 
                { 
                    text: "Defend yourself!", 
                    customActionText: "{name} grits their teeth against the tearing flesh, kicking the beast away and drawing a weapon!", 
                    outcomes: [ 
                        { 
                            weight: 100, 
                            results: [ 
                                { type: "MODIFY_VITALS", payload: { hp: -35, stamina: -15, insight: 0, damageType: "pierce", isPercentage: false, bypassDefense: false } }, 
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "bleed", charges: 3, target: "active_character" } }, 
                                { type: "START_BATTLE", payload: { enemies: ["DOG"] } } 
                            ] 
                        } 
                    ] 
                } 
            ] 
        }, 
        "success_tame": { 
            image: { col: 2, row: 0 }, 
            bgm: "happy_theme", 
            text: "{name} successfully stabilizes the dog's leg. The intense pain eases, and the dog licks {name}'s hand in absolute gratitude. {name} has earned a new friend.", 
            decisions: [ 
                { 
                    text: "Let's go, boy.", 
                    customActionText: "{name} gives the dog an affectionate pat, signaling it to follow.", 
                    outcomes: [ 
                        { 
                            weight: 100, 
                            results: [ 
                                { type: "RECRUIT_CHARACTER", payload: { entityId: "DOG" } }, 
                                { type: "END_ENCOUNTER", payload: null } 
                            ] 
                        } 
                    ] 
                } 
            ] 
        }, 
        "walk_away": { 
            image: { col: 0, row: 0 }, 
            text: "{name} turns their back on the whimpering animal. The wilds are unforgiving, and one must look out for themselves.", 
            decisions: [ 
                { 
                    text: "Continue the journey.", 
                    customActionText: "{name} presses onward, trying to ignore the fading whimpers.", 
                    outcomes: [ 
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] } 
                    ] 
                } 
            ] 
        } 
    } 
};
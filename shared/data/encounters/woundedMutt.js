export const woundedMutt = {
    id: "wounded_mutt",
    title: "The Wounded Mutt",
    imageSheet: "encounter_wounded_mutt",
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "A Whimper in the Brush",
            image: { col: 0, row: 0 },
            text: "{name} hears a faint whimper and finds a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.",
            decisions: [
                {
                    text: "Approach calmly to offer help.",
                    customActionText: "{name} slowly steps forward, speaking in a low, soothing voice to comfort the anxious animal...",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_help" } }] }]
                },
                {
                    text: "Leave the creature to its fate.",
                    customActionText: "{name} hardens their heart and steps away, leaving the wilds to claim it.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }]
                }
            ]
        },
        "offer_help": {
            displayText: "Offering Help",
            image: { col: 1, row: 0 },
            text: "Hearing {name}'s gentle tone, the dog stands up.",
            decisions: [
                {
                    text: "[Healing Herb] [ATT] Treat the wound.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    conditions: [{ type: "has_item", itemId: "healing_herb", qty: 1 }, { type: "context_flag_not_set", flagId: "failed_mutt_herb" }],
                    customActionText: "{name} crushes the healing herb and carefully reaches toward the raw, bleeding leg...",
                    successOutcomes: [{ weight: 100, results: [{ type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_mutt_herb" } }, { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } }] }]
                },
                {
                    text: "[DEX] Clean the wound barehanded.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 15,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_mutt_dex" }],
                    customActionText: "{name} attempts to rapidly and precisely clean the dirt away from the jagged slash with empty hands...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_mutt_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } }] }]
                },
                {
                    text: "Back away slowly.",
                    customActionText: "{name} decides not to push their luck any further and slips away.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }]
                }
            ]
        },
        "startled_mutt": {
            displayText: "Combat",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The wild mutt panics! It yelps in sudden terror and snaps fiercely, sinking its teeth deep into {name}'s arm before lunging outright!",
            decisions: [
                {
                    text: "Defend against the rabid mutt!",
                    customActionText: "{name} grits their teeth against the tearing flesh, kicking the beast away and drawing a weapon!",
                    outcomes: [{ weight: 100, results: [
                        { type: "MODIFY_VITALS", payload: { hp: -35, stamina: -15, insight: 0, damageType: "pierce", isPercentage: false, bypassDefense: false } },
                        { type: "APPLY_STATUS_EFFECT", payload: { effectId: "bleed", charges: 3, target: "active_character" } },
                        { type: "START_BATTLE", payload: { enemies: ["DOG"] } }
                    ] }]
                }
            ]
        },
        "success_tame": {
            displayText: "A New Friend",
            image: { col: 2, row: 0 },
            bgm: "happy_theme",
            text: "{name} successfully stabilizes the dog's leg. The intense pain eases, and the dog licks {name}'s hand in absolute gratitude. {name} has earned a new friend.",
            decisions: [
                {
                    text: "Signal the dog to follow.",
                    customActionText: "{name} gives the dog an affectionate pat, signaling it to follow.",
                    outcomes: [{ weight: 100, results: [{ type: "RECRUIT_CHARACTER", payload: { entityId: "DOG" } }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        "walk_away": {
            displayText: "Left to the Wilds",
            image: { col: 0, row: 0 },
            text: "{name} turns their back on the whimpering animal. The wilds are unforgiving, and one must look out for themselves.",
            decisions: [
                {
                    text: "Continue your journey.",
                    customActionText: "{name} presses onward, trying to ignore the fading whimpers.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};
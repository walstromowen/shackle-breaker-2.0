export const woundedMutt = {
    id: "wounded_mutt",
    title: "The Wounded Mutt",
    imageSheet: "encounter_wounded_mutt",
    initialStage: "discovery",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see story/encounters/prologue.js)
    ambience: "forestNight",
    stages: {
        "discovery": {
            displayText: "A Whimper in the Brush",
            sfx: "dogCry",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "You hear a faint whimper and find a scruffy dog with a nasty gash on its hind leg. It growls softly, baring its teeth.",
            decisions: [
                {
                    text: "Approach calmly to offer help.",
                    customActionText: "You step forward slowly, speaking in a low, soothing voice to calm the anxious animal...",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "offer_help" } }] }]
                },
                {
                    text: "Leave the creature to its fate.",
                    customActionText: "You harden your heart and step away, leaving the wilds to claim it.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }]
                }
            ]
        },
        "offer_help": {
            displayText: "Offering Help",
            image: { col: 1, row: 0 },
            text: "Hearing your gentle tone, the dog stands up.",
            decisions: [
                {
                    text: "[Healing Herb] [ATT] Treat the wound.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    conditions: [{ type: "has_item", itemId: "healing_herb", qty: 1 }, { type: "context_flag_not_set", flagId: "failed_mutt_herb" }],
                    customActionText: "You crush the healing herb and carefully reach toward the raw, bleeding leg...",
                    successOutcomes: [{ weight: 100, results: [{ type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_mutt_herb" } }, { type: "REMOVE_ITEM", payload: { itemId: "healing_herb", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } }] }]
                },
                {
                    text: "[DEX] Clean the wound barehanded.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 15,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_mutt_dex" }],
                    customActionText: "You try to clean the dirt away from the jagged slash with your bare hands, quick and precise...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "success_tame" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_mutt_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_mutt" } }] }]
                },
                {
                    text: "Back away slowly.",
                    customActionText: "You decide not to push your luck any further and slip away.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "walk_away" } }] }]
                }
            ]
        },
        "startled_mutt": {
            displayText: "Combat",
            tone: "blood",
            effect: "blood",
            sfx: "dogCry",
            image: { col: 3, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The wild mutt panics! It yelps in sudden terror and snaps fiercely, sinking its teeth deep into {name}'s arm before lunging outright!",
            decisions: [
                {
                    text: "Defend against the rabid mutt!",
                    outcomes: [{
                        weight: 100, results: [
                            { type: "MODIFY_VITALS", payload: { hp: -35, stamina: -15, insight: 0, damageType: "pierce", isPercentage: false, bypassDefense: false } },
                            { type: "APPLY_STATUS_EFFECT", payload: { effectId: "bleed", charges: 3, target: "active_character" } },
                            { type: "START_BATTLE", payload: { tableId: "rabid_dog" } }
                        ]
                    }]
                }
            ]
        },
        "success_tame": {
            displayText: "A New Friend",
            tone: "gold",
            sfx: "dogCry",
            sfxVolume: 0.6,
            image: { col: 2, row: 0 },
            bgm: "happy_theme",
            text: "You stabilize the dog's leg. The intense pain eases, and the dog licks your hand in absolute gratitude. You have earned a new friend.",
            decisions: [
                {
                    text: "Signal the dog to follow.",
                    customActionText: "You give the dog an affectionate pat, signaling it to follow.",
                    outcomes: [{ weight: 100, results: [{ type: "RECRUIT_CHARACTER", payload: { entityId: "DOG" } }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        "walk_away": {
            displayText: "Left to the Wilds",
            image: { col: 0, row: 0 },
            text: "You turn your back on the whimpering animal. The wilds are unforgiving, and one must look out for oneself.",
            decisions: [
                {
                    text: "Continue your journey.",
                    customActionText: "You press onward, trying to ignore the fading whimpers.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};
export const bonfire = {
    id: "bonfire",
    title: "Bonfire",
    imageSheet: "encounter_bonfire",
    initialStage: "discovery",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see encounters/prologue.js)
    ambience: "fireCrackle",
    stages: {
        discovery: {
            displayText: "Bonfire",
            image: { col: 0, row: 0 },
            text: "Your party comes upon a bonfire. Its embers appear to still be burning.",
            decisions: [
                {
                    text: "Set up camp and rest.",
                    type: "skill_check",
                    attribute: null,
                    threshold: 10,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_bonfire_rest" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You set up camp and rest by the dwindling flames.",
                    successOutcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "MODIFY_VITALS", payload: { hp: 50, target: "entire_party", isPercentageOfMax: true } },   // half of everyone's max HP
                                { type: "MODIFY_VITALS", payload: { stamina: 50, insight: 50, target: "entire_party", isPercentageOfCurrent: true } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "entire_party" } },
                                { type: "ADVANCE_TIME", payload: { hours: 12 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "rest_success_loot" } }
                            ]
                        },
                        {
                            weight: 2,
                            results: [
                                { type: "MODIFY_VITALS", payload: { hp: 50, target: "entire_party", isPercentageOfMax: true } },   // half of everyone's max HP
                                { type: "MODIFY_VITALS", payload: { stamina: 50, insight: 50, target: "entire_party", isPercentageOfCurrent: true } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "entire_party" } },
                                { type: "ADVANCE_TIME", payload: { hours: 12 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "rest_success_normal" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_bonfire_rest" } }, { type: "ADVANCE_STAGE", payload: { stageId: "ambush_madman" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_bonfire_rest" } }, { type: "MODIFY_VITALS", payload: { hp: -40, isPercentage: true } }, { type: "ADVANCE_STAGE", payload: { stageId: "ambush_unseen" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_bonfire_rest" } }, { type: "ADVANCE_STAGE", payload: { stageId: "ambush_wolves" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Keep moving.",
                    customActionText: "You decide it's best to move along.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        rest_success_loot: {
            displayText: "Rest",
            tone: "gold",
            sfx: "pickupSound",
            image: { col: 0, row: 2 },
            text: "Upon waking from your rest, you find something half-buried in the dirt beside the burned-out fire.",
            decisions: [
                {
                    text: "Dig up the half-buried object.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [


                        {
                            weight: 1,
                            results: [
                                { type: "DESTROY_OBJECT" },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } },
                                // Added custom text for the dynamically generated rewards screen
                                { type: "END_ENCOUNTER", payload: { 
                                    titleText: "Unearthed Loot", 
                                    buttonText: "Leave the camp behind." 
                                } }
                            ]
                        }
                    ]
                }
            ]
        },
        rest_success_normal: {
            displayText: "Rest",
            sfx: "restSfx",
            image: { col: 1, row: 0 },
            text: "Your party rests peacefully, recovering its strength. The embers have long since burned out as much time has passed.",
            decisions: [
                {
                    text: "Pack up camp and continue.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 1, results: [{ type: "DESTROY_OBJECT" }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        ambush_madman: {
            displayText: "Ambush!",
            tone: "blood",
            effect: "jolt",
            sfx: "madmanCry",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 0, row: 1 },
            text: "The rest is violently interrupted! You are ambushed by madmen emerging from the shadows!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        ambush_unseen: {
            displayText: "Ambush!",
            tone: "blood",
            effect: "blood",
            sfx: "rockThud",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 0, row: 1 },
            text: "A heavy rock flies out of the darkness and strikes {name}! Soon, your party is surrounded by raving madmen!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack", enemies: ["MAD_MAN"] } }] }]
                }
            ]
        },
        ambush_wolves: {
            displayText: "Ambush!",
            tone: "blood",
            effect: "jolt",
            sfx: "wolfCry",
            ambience: "none",
            ambienceFade: 0.4,
            image: { col: 1, row: 1 },
            text: "A low growl echoes in the dark. Your party is surrounded by a pack of starving wolves!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { tableId: "wolf_pack", enemies: ["WOLF"] } }] }]
                }
            ]
        }
    }
};
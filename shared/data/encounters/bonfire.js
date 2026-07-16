export const bonfire = {
    id: "bonfire",
    title: "Bonfire",
    imageSheet: "encounter_bonfire",
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "Bonfire",
            image: { col: 0, row: 0 },
            text: "{name}'s party encounters a bonfire. Its embers appear to still be burning.",
            decisions: [
                {
                    text: "Set up camp and rest.",
                    type: "skill_check",
                    attribute: null,
                    threshold: 10,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_bonfire_rest" }],
                    customActionText: "{name} sets up camp and rests by the dwindling flames for 12 hours...",
                    successOutcomes: [
                        { weight: 1, results: [
                            { type: "MODIFY_VITALS", payload: { hp: 50, stamina: 50, insight: 50, target: "entire_party", isPercentageOfCurrent: true } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "entire_party" } },
                            { type: "ADVANCE_TIME", payload: { hours: 12 } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "rest_success_loot" } }
                        ]},
                        { weight: 2, results: [
                            { type: "MODIFY_VITALS", payload: { hp: 50, stamina: 50, insight: 50, target: "entire_party", isPercentageOfCurrent: true } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "entire_party" } },
                            { type: "ADVANCE_TIME", payload: { hours: 12 } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "rest_success_normal" } }
                        ]}
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
                    customActionText: "{name}'s party decides it's best to move along.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        "rest_success_loot": {
            displayText: "Rest",
            image: { col: 2, row: 0 },
            text: "Upon waking from a rest, {name} finds something half-buried in the dirt beside the burned-out fire.",
            decisions: [
                {
                    text: "Dig up the half-buried object.",
                    outcomes: [{ weight: 1, results: [
                        { type: "DESTROY_OBJECT" },
                        { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } },
                        { type: "END_ENCOUNTER", payload: null }
                    ]}]
                }
            ]
        },
        "rest_success_normal": {
            displayText: "Rest",
            image: { col: 1, row: 0 },
            text: "{name}'s party rests peacefully, recovering their strength. The embers have long since burned out as much time has passed.",
            decisions: [
                {
                    text: "Pack up camp and continue.",
                    outcomes: [{ weight: 1, results: [
                        { type: "DESTROY_OBJECT" },
                        { type: "END_ENCOUNTER", payload: null }
                    ]}]
                }
            ]
        },
        "ambush_madman": {
            displayText: "Ambush!",
            image: { col: 0, row: 1 },
            text: "The rest is violently interrupted! {name} is ambushed by madmen emerging from the shadows!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN", "MAD_MAN", "MAD_MAN"] } }] }]
                }
            ]
        },
        "ambush_unseen": {
            displayText: "Ambush!",
            image: { col: 1, row: 1 },
            text: "A heavy rock flies out of the darkness and strikes {name}! Soon, the party is surrounded by raving madmen!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN", "MAD_MAN"] } }] }]
                }
            ]
        },
        "ambush_wolves": {
            displayText: "Ambush!",
            image: { col: 1, row: 1 },
            text: "A low growl echoes in the dark. {name}'s party is surrounded by a pack of starving wolves!",
            bgm: "plainsBattleBgm",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { enemies: ["WOLF", "WOLF", "WOLF"] } }] }]
                }
            ]
        }
    }
};
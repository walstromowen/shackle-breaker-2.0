export const oakTree = {
    id: "oak_tree",
    title: "A Sturdy Oak",
    imageSheet: "encounter_oaktree",
    initialStage: "approach",
    stages: {
        "approach": {
            displayText: "A Towering Oak",
            image: { col: 0, row: 0 },
            bgm: "plainsOverworldNight",
            text: "An oak tree towers over {name}. Its thick trunk looks like it has stood here for many years.",
            decisions: [
                {
                    text: "[STR] Chop down the tree.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 8,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_oaktree_chop" }],
                    customActionText: "{name} grips their weapon tightly and takes a massive swing at the sturdy trunk...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_success" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_oaktree_chop" } }, { type: "ADVANCE_STAGE", payload: { stageId: "chopped_fail" } }] }]
                },
                {
                    text: "Walk away.",
                    customActionText: "{name} decides it is not worth the effort and walks away.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                }
            ]
        },
        "chopped_success": {
            displayText: "Timber!",
            image: { col: 1, row: 0 },
            bgm: "plainsOverworldNight",
            text: "With a flawless strike, the ancient tree groans and crashes to the earth. {name} spots a small coin pouch tangled in its roots!",
            decisions: [
                {
                    text: "Gather the wood and coins.",
                    customActionText: "{name} gathers up the heavy wood and pockets the loose coins.",
                    outcomes: [{ weight: 100, results: [
                        { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "oak_tree_drops", rolls: 1 } },
                        { type: "AWARD_XP", payload: { amount: 25, target: "active_character" } },
                        { type: "MODIFY_CURRENCY", payload: { amount: 15 } },
                        { type: "DESTROY_OBJECT" },
                        { type: "END_ENCOUNTER", payload: null }
                    ]}]
                }
            ]
        },
        "chopped_fail": {
            displayText: "A Stubborn Trunk",
            image: { col: 2, row: 0 },
            text: "{name}'s weapon glances off the thick bark. {name} jars their arms terribly but fails to bring it down.",
            decisions: [
                {
                    text: "Walk away from the stubborn tree.",
                    customActionText: "{name} rubs their sore arms, cursing the old tree before walking away.",
                    outcomes: [{ weight: 100, results: [{ type: "TAKE_DAMAGE", payload: { amount: 2, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};
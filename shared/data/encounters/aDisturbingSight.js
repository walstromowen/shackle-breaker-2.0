export const aDisturbingSight = {
    id: "a_disturbing_sight",
    title: "A Disturbing Sight",
    imageSheet: "encounter_a_disturbing_sight",
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "A Disturbing Sight",
            image: { col: 2, row: 1 },
            bgm: "aDisturbingSightBgm",
            text: "{name} sees digging on the ground ahead. Upon getting closer, {name} realizes that he appears to be digging at something unsettling...",
            decisions: [
                {
                    text: "Charge directly at the Madman.",
                    customActionText: "{name} draws their weapon and charges the Madman!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN", "MAD_MAN"] } }] }]
                },
                {
                    text: "[DEX] Eliminate the Madman quietly.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_dex" }],
                    customActionText: "{name} sneaks behind the Madman, dagger drawn...",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_quiet_end" } }] }],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_prey" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "a_howl_in_the_dark" } }] }
                    ]
                },
                {
                    text: "[STR] Throw a heavy rock at his head.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_str" }],
                    customActionText: "{name} picks up a heavy rock and hurls it at the Madman.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_lucky_strike" } }] },
                        { weight: 3, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "enraged_lunatic" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 2, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } }, { type: "ADVANCE_STAGE", payload: { stageId: "spotted" } }] },
                        { weight: 2, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } }, { type: "ADVANCE_STAGE", payload: { stageId: "unnoticed_blunder" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_str" } }, { type: "ADVANCE_STAGE", payload: { stageId: "unintended_targets" } }] }
                    ]
                },
                {
                    text: "[ALT] Speak calmly to the Madman.",
                    type: "skill_check",
                    attribute: "alterian",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_alt" }],
                    customActionText: "{name} steps out and attempts to speak calmly to the Madman.",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_moment_of_clarity" } }] },
                        { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "speaking_to_the_voices" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_alt" } }, { type: "ADVANCE_STAGE", payload: { stageId: "descent_into_madness" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Quietly back away.",
                    customActionText: "{name} quietly backs away from the Madman and takes a different path.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        "a_quiet_end": {
            displayText: "A Quiet End",
            image: { col: 2, row: 2 },
            text: "{name} sneaks up behind the Madman and plunges a dagger into his side, leaving him lifeless on the ground. If he even was alive...",
            decisions: [{
                text: "Search the body for valuables.",
                outcomes: [{ weight: 100, results: [{ type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } }, { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "startled_prey": {
            displayText: "Ambushed!",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The Madman is startled by {name}'s clumsy approach. He shrieks and draws his weapon!",
            decisions: [{
                text: "Draw your weapon!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        },
        "a_howl_in_the_dark": {
            displayText: "Ambushed!",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "{name} plunges a dagger into the side of the Madman, leaving him bleeding profusely! He survives the blow and sends a howl into the air, alerting nearby villagers!",
            decisions: [{
                text: "Brace for the ambush!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [{ id: "MAD_MAN", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "MADMAN"] } }] }]
            }]
        },
        "a_lucky_strike": {
            displayText: "The Aftermath",
            image: { col: 1, row: 2 },
            text: "The rock hits the Madman right in the head, dropping him lifeless to the ground.",
            decisions: [{
                text: "Check his pockets.",
                outcomes: [{ weight: 100, results: [{ type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } }, { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "enraged_lunatic": {
            displayText: "Combat",
            image: { col: 2, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The rock hits the Madman's body, injuring him. After wincing from the wound, the Madman looks up and runs screaming at {name}!",
            decisions: [{
                text: "Draw your weapon!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [{ id: "MAD_MAN", startingHpPercent: 0.5 }] } }] }]
            }]
        },
        "spotted": {
            displayText: "Combat",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "The rock goes far over the Madman's head. He snaps his head around, draws his weapon, and rushes at {name}!",
            decisions: [{
                text: "Fight for your life!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        },
        "unnoticed_blunder": {
            displayText: "A Disturbing Sight",
            image: { col: 0, row: 1 },
            text: "The rock completely misses the madman and lands softly in the grass. He doesn't seem to have noticed. You'll have to rethink this approach...",
            decisions: [{
                text: "Reassess the situation.",
                outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
            }]
        },
        "unintended_targets": {
            displayText: "Combat",
            image: { col: 3, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The rock goes nowhere near the Madman. Instead, it lands right in the middle of the bushes, startling a pack of wolves! They turn and glare fiercely at {name}!",
            decisions: [{
                text: "Prepare for a fierce fight!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["WOLF", "WOLF", "WOLF"] } }] }]
            }]
        },
        "a_moment_of_clarity": {
            displayText: "A Fleeting Peace",
            image: { col: 3, row: 0 },
            text: "{name} converses with the Madman about the delusional rants one might expect from a man who has lost his mind. Finally, the Madman smiles, and with tears in his eyes, hands {name} his knapsack. \n\nJust before darting off, he mutters, \"It's really you... Shackle Breaker...\"",
            decisions: [{
                text: "Accept the knapsack.",
                outcomes: [{ weight: 100, results: [{ type: "GIVE_ITEM", payload: { items: [{ id: "wooden_stick", qty: 2 }, { id: "dagger", qty: 1 }] } }, { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "descent_into_madness": {
            displayText: "Combat",
            image: { col: 1, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The Madman stops, looks {name} dead in the eyes, and bursts into maniacal laughter. He draws a rusted blade!",
            decisions: [{
                text: "Draw your weapon!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        },
        "speaking_to_the_voices": {
            displayText: "A Fragile Mind",
            image: { col: 0, row: 0 },
            text: "{name} manages to get his attention. The Madman tilts his head.\n\n\"Magic tell me things! Hee Hee! Tell me what magic say!\"",
            decisions: [
                {
                    text: "[STR] Shout at the Madman to run away.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 5,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_shout" }],
                    customActionText: "{name} puffs out their chest and shouts at the Madman.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "fleeing_shadows" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_shout" } }, { type: "ADVANCE_STAGE", payload: { stageId: "a_new_friend" } }] }]
                },
                {
                    text: "[ATN] Manipulate him into giving items.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 10,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_manip" }],
                    customActionText: "{name} attempts to manipulate the man's delusions.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "pleased_the_magic" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_manip" } }, { type: "ADVANCE_STAGE", payload: { stageId: "rejected_by_the_magic" } }] }]
                },
                {
                    text: "[STR] Command him to bow.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 15,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_disturbing_bow" }],
                    customActionText: "{name} speaks with booming, terrifying authority.",
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "a_new_servant" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_disturbing_bow" } }, { type: "ADVANCE_STAGE", payload: { stageId: "shattered_illusions" } }] }]
                }
            ]
        },
        "fleeing_shadows": {
            displayText: "The Aftermath",
            image: { col: 1, row: 0 },
            text: "Upon hearing {name}, the Madman falls back and hisses. He scrambles to his feet and runs away, leaving his knapsack behind in his panic.",
            decisions: [{
                text: "Take the abandoned knapsack.",
                outcomes: [{ weight: 100, results: [{ type: "GIVE_ITEM", payload: { items: [{ id: "wooden_stick", qty: 2 }, { id: "dagger", qty: 1 }] } }, { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "a_new_friend": {
            displayText: "Combat",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Freak? .. Friend! Magic know many freak friend! You be freak friend too!\" he screams, lunging forward.",
            decisions: [{
                text: "Defend against the madman!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        },
        "pleased_the_magic": {
            displayText: "The Aftermath",
            image: { col: 1, row: 1 },
            text: "\"Magic like you! So me like you! Hahahaha! Me give these now!\"",
            decisions: [{
                text: "Accept the bizarre offerings.",
                outcomes: [{ weight: 100, results: [{ type: "ROLL_LOOT_TABLE", payload: { lootTableId: "plains", rolls: 1 } }, { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "rejected_by_the_magic": {
            displayText: "Combat",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "\"Hahaha! Magic no like you! So me no like neither!\"",
            decisions: [{
                text: "Prepare for battle!",
                outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        },
        "a_new_servant": {
            displayText: "The Aftermath",
            image: { col: 0, row: 2 },
            text: "The man falls to his knees, weeping. \"No no! No hurt! Me help magic! Me help!\"",
            decisions: [{
                text: "Command the weeping man to follow.",
                outcomes: [{ weight: 100, results: [{ type: "MODIFY_VITALS", payload: { insight: 5 } }, { type: "RECRUIT_CHARACTER", payload: { entityId: "MAD_MAN" } }, { type: "END_ENCOUNTER", payload: null }] }]
            }]
        },
        "shattered_illusions": {
            displayText: "Combat",
            image: { col: 2, row: 2 },
            bgm: "plainsBattleBgm",
            text: "He glares at {name} with sudden, horrifying clarity. \"No hear magic! Me hurt now!\"",
            decisions: [{
                text: "Defend against the shattered illusion!",
                outcomes: [{ weight: 100, results: [{ type: "MODIFY_VITALS", payload: { insight: 5 } }, { type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
            }]
        }
    }
};
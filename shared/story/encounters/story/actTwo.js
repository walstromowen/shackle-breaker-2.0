/* The Red Moon: the turning point of the game. It plays straight after Darius the Groveler is defeated (the START_BATTLE of the altar's last Darius stage carries
 * `afterVictory: { encounterId: "act_two" }`, see SceneManager), and its last choice grants the milestone 'act2'.
 *
 * Short and unexplained, on purpose: four stages that show and do not tell. A glimpse of what the light did to Darius is the only hint of what magic costs;
 * what the iron means, and the gauge that appears from now on, the player finds out for themselves.
 * From then on the world is in act 2 (story/actDefinitions.js): every night is a blood moon, the spawn tables hold their act 2 entries and enemies are stronger.
 * Pictures are borrowed from the altar's sheet; the stage fields are explained at the top of story/encounters/story/prologue.js.
 */
const toStage = (stageId) => [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];

export const actTwo = {
    id: "act_two",
    title: "The Red Moon",
    initialStage: "silence",
    tone: "blood",
    stages: {
        silence: {
            displayText: "Silence",
            image: { sheet: "encounter_darius_defeated", col: 0, row: 0, size: 193 },   // Darius slumped over the altar
            bgm: "none",
            ambience: "none",
            sfx: "heartbeat",
            text: "Darius the Groveler lies still. The hum in the stone has stopped. For the first time in this place, there is silence.",
            decisions: [{ text: "Continue.", outcomes: toStage("glimpse") }]
        },
        glimpse: {
            displayText: "The Last Light",
            image: { sheet: "encounter_mysterious_altar", col: 0, row: 1 },
            sfx: "whispers",
            sfxVolume: 0.5,
            text: "The altar's last light shows a man in a clean robe, kneeling where Darius knelt. He is smiling. Each time the light answers him, a little of him goes out with it.",
            decisions: [{ text: "Continue.", outcomes: toStage("iron") }]
        },
        iron: {
            displayText: "Warm Iron",
            effect: "shake",
            sfx: "whispers",
            text: "Your shackles are warm. They have never been warm. Far above, through a mile of stone, many voices begin to laugh at once.",
            decisions: [{ text: "Continue.", outcomes: toStage("moon") }]
        },
        moon: {
            displayText: "The Red Moon",
            image: { sheet: "encounter_mysterious_altar", col: 2, row: 1 },
            effect: "glow_red",
            sfx: "cinematicBoom",
            text: "The ground shudders once. Somewhere above, where you cannot see it, the moon turns red.",
            decisions: [
                {
                    text: "Climb toward the light.",
                    customActionText: "Behind the broken altar, worn steps lead down into a deeper dark. You climb the other way.",
                    outcomes: [{
                        weight: 1,
                        results: [
                            { type: "REPLACE_OBJECT", payload: { objectId: "CATACOMBS_STAIRS" } },   // the altar gives way to the hidden staircase into the catacombs
                            { type: "GRANT_MILESTONE", payload: { id: "act2" } },
                            { type: "START_QUEST", payload: { questId: "act2_red_moon", questName: "The Red Moon" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        }
    }
};

/* The Red Moon: the turning point of the game. It plays straight after Darius the Groveler is defeated (the START_BATTLE result of the altar's
 * `darius_rises` stage carries `afterVictory: { encounterId: "act_two" }`, see SceneManager), and its last choice grants the milestone 'act2'.
 *
 * From then on the world is in act 2 (data/actDefinitions.js): every night is a blood moon, the days are darker, the spawn tables and encounters hold
 * their act 2 entries and every enemy is a little stronger. Written like the prologue: short, plain sentences in the second person, a little ominous.
 *
 * The altar is underground, so nothing here shows the sky: the change is felt in the iron first, and seen when the player climbs out.
 * Pictures are borrowed from the altar's sheet (a stage may name any sheet); the stage fields are explained at the top of encounters/prologue.js.
 */
const toStage = (stageId) => [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];

export const actTwo = {
    id: "act_two",
    title: "The Red Moon",
    initialStage: "silence",
    tone: "blood",
    stages: {
        silence: {
            displayText: "The Groveler Falls",
            image: { sheet: "encounter_mysterious_altar", col: 3, row: 1 },
            bgm: "none",
            ambience: "none",
            sfx: "heartbeat",
            text: "Darius the Groveler lies still. The skull on the altar has gone dark, and the hum in the stone has stopped. For the first time in this place, there is silence.",
            decisions: [
                {
                    text: "Breathe.",
                    customActionText: "You listen. Somewhere deep in the stone, something answers.",
                    outcomes: toStage("hollow")
                }
            ]
        },

        hollow: {
            displayText: "The Hollow",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 0 },
            ambience: "altarDrone",
            text: "The meteorite lies in the hollow of the altar, black and cold. Its glow is gone. Whatever it fed is not here anymore.",
            decisions: [
                {
                    text: "Touch the meteorite.",
                    customActionText: "It is warm now, like something that was alive.",
                    outcomes: toStage("iron")
                },
                {
                    text: "Step back.",
                    customActionText: "You step back from the altar, and the dark follows you.",
                    outcomes: toStage("iron")
                }
            ]
        },

        iron: {
            displayText: "Warm Iron",
            sfx: "whispers",
            effect: "shake",
            text: "Your shackles are warm. They have never been warm. Far above, through a mile of stone, many voices begin to laugh at once.",
            decisions: [
                {
                    text: "Listen.",
                    customActionText: "The laughter has a rhythm now. It sounds like a march.",
                    outcomes: toStage("moon")
                },
                {
                    text: "Hold your wrists.",
                    customActionText: "{name} grips the iron. It hums against your fingers.",
                    outcomes: toStage("moon")
                }
            ]
        },

        moon: {
            displayText: "The Red Moon",
            image: { sheet: "encounter_mysterious_altar", col: 2, row: 1 },
            effect: "glow_red",
            sfx: "cinematicBoom",
            ambience: "none",
            text: "The ground shudders once. Far above, where you cannot see it, the moon turns red. Every cursed thing in the world raises its head at the same moment. They know who you are.",
            decisions: [
                {
                    text: "Climb toward the light.",
                    customActionText: "You climb. The air gets colder, and the dark gets no lighter.",
                    outcomes: [{
                        weight: 1,
                        results: [
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

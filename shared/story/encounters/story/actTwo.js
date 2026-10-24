/* The Red Moon: the turning point of the game. It plays straight after Darius the Groveler is defeated (the START_BATTLE result of the altar's
 * `darius_rises` stage carries `afterVictory: { encounterId: "act_two" }`, see SceneManager), and its last choice grants the milestone 'act2'.
 *
 * From then on the world is in act 2 (story/actDefinitions.js): every night is a blood moon, the days are darker, the spawn tables and encounters hold
 * their act 2 entries and every enemy is a little stronger. Written like the prologue: short, plain sentences in the second person, a little ominous.
 *
 * The altar is underground, so nothing here shows the sky: the change is felt in the iron first, and seen when the player climbs out.
 *
 * It is also where the questline ends and the player learns what happened (the goal of the Shackled quests): magic itself is the curse. It slowly
 * corrupts everyone who uses it, the player included. The stone only sped it up. Nothing before this says so outright; the other quests and encounters
 * only hint at it (madmen who babble about the magic, scholars and nobles who lost their minds to it).
 * Pictures are borrowed from the altar's sheet (a stage may name any sheet); the stage fields are explained at the top of story/encounters/story/prologue.js.
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
            text: "Darius the Groveler lies still. The skull on the altar has gone dark, and the hum in the stone has stopped.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "silence_2" } }] }]
                }
            ]
        },

        silence_2: {
            displayText: "The Groveler Falls",
            image: { sheet: "encounter_mysterious_altar", col: 3, row: 1 },
            bgm: "none",
            text: "For the first time in this place, there is silence.",
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
            text: "The meteorite lies in the hollow of the altar, black and cold. Its glow is gone.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "hollow_2" } }] }]
                }
            ]
        },

        hollow_2: {
            displayText: "The Hollow",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 0 },
            text: "Whatever it fed is not here anymore.",
            decisions: [
                {
                    text: "Touch the meteorite.",
                    customActionText: "It is warm now, like something that was alive.",
                    outcomes: toStage("vision")
                },
                {
                    text: "Step back.",
                    customActionText: "You step back from the altar, and the dark follows you. The stone speaks anyway.",
                    outcomes: toStage("vision")
                }
            ]
        },

        vision: {
            displayText: "What Darius Knew",
            image: { sheet: "encounter_mysterious_altar", col: 0, row: 1 },
            sfx: "whispers",
            text: "The stone's last light shows you a man in a clean robe, kneeling at this altar. It is Darius, before the hood and the crawling.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "vision_2" } }] }]
                }
            ]
        },

        vision_2: {
            displayText: "What Darius Knew",
            image: { sheet: "encounter_mysterious_altar", col: 0, row: 1 },
            text: "He is smiling, and he is whole. Each time the light answers him, a small piece of him goes out with it, and he does not feel it go.",
            decisions: [
                {
                    text: "Watch.",
                    customActionText: "Years pass in a breath. He kneels lower each time. He laughs when there is nothing to laugh at.",
                    outcomes: toStage("truth")
                },
                {
                    text: "Look away.",
                    customActionText: "It does not matter. The vision plays on behind your eyes.",
                    outcomes: toStage("truth")
                }
            ]
        },

        truth: {
            displayText: "The Curse",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            text: "The metorite's glow grows dim and a dark truth emerges, The magic this land wields is not free. It has a cost.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "truth_2" } }] }]
                }
            ]
        },

        truth_2: {
            displayText: "The Curse",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            text: "It has been taking a little from everyone who used it, for as long as there has been magic to use, and the whole kingdom used it every day.",
            decisions: [
                {
                    text: "Think of the madmen.",
                    customActionText: "Every one of them was a healer, a scholar, a guard with an enchanted blade. They did not go mad overnight. They were being spent.",
                    outcomes: toStage("you")
                },
                {
                    text: "Think of the road.",
                    customActionText: "The prisoners laughed like the madmen did. You did not understand why. Now you do.",
                    outcomes: toStage("you")
                }
            ]
        },

        you: {
            displayText: "What You Carry",
            text: "You have used it too, {name}. Every time you were hurt and reached for something to mend you.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "you_2" } }] }]
                }
            ]
        },

        you_2: {
            displayText: "What You Carry",
            text: "Every spark, every ward, every ember at your fingertips. It has taken a little each time, the same as it takes from everyone.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "you_3" } }] }]
                }
            ]
        },

        you_3: {
            displayText: "What You Carry",
            text: "You cannot tell how much.",
            decisions: [
                {
                    text: "Ask how much is left.",
                    customActionText: "The stone is silent. Then the dark behind your eyes begins to show you a number.",
                    outcomes: toStage("gauge")
                },
                {
                    text: "Close your hands.",
                    customActionText: "You close your fists around nothing, and wonder what you will do without it. The dark behind your eyes begins to show you a number.",
                    outcomes: toStage("gauge")
                }
            ]
        },

        gauge: {
            displayText: "Corruption",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            effect: "glow_red",
            sfx: "whispers",
            text: "It has a name, and now you can read it. Corruption.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "gauge_2" } }] }]
                }
            ]
        },

        gauge_2: {
            displayText: "Corruption",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            text: "It gathers in everyone who reaches for magic, and faster in those who do cruel things. Kindness slows it.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "gauge_3" } }] }]
                }
            ]
        },

        gauge_3: {
            displayText: "Corruption",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            text: "At half, the body begins to wither, though the magic answers with a hungry surge. At the whole, the iron closes for good and the one who wears it is no longer yours.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "gauge_4" } }] }]
                }
            ]
        },

        gauge_4: {
            displayText: "Corruption",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },
            text: "Only a stone fallen from the sky can open it again. From now on you will see how much each of you carries.",
            decisions: [
                {
                    text: "Look.",
                    customActionText: "A number settles behind your eyes, and under it a bar, and it does not go away.",
                    outcomes: toStage("iron")
                },
                {
                    text: "Refuse to look.",
                    customActionText: "It does not matter. The number is there anyway, patient as the iron.",
                    outcomes: toStage("iron")
                }
            ]
        },

        iron: {
            displayText: "Warm Iron",
            sfx: "whispers",
            effect: "shake",
            text: "Your shackles are warm. They have never been warm.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "iron_2" } }] }]
                }
            ]
        },

        iron_2: {
            displayText: "Warm Iron",
            text: "Far above, through a mile of stone, many voices begin to laugh at once.",
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
            text: "The ground shudders once. Far above, where you cannot see it, the moon turns red.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "moon_2" } }] }]
                }
            ]
        },

        moon_2: {
            displayText: "The Red Moon",
            image: { sheet: "encounter_mysterious_altar", col: 2, row: 1 },
            text: "Every cursed thing in the world raises its head at the same moment. They know what you carry.",
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

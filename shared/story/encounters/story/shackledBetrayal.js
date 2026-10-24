/* The Shackling: what happens to a party that carries a shackled member (a character whose corruption reached 100, see characters/corruptionSystem.js).
   It is an ordinary encounter in every biome's pool, at any hour of the day (BiomeModel.getEncounter), and only while somebody is shackled and somebody else is still
   standing. Its weight is CORRUPTION.BETRAYAL_WEIGHT in core/constants.js. The shackled member is named in the encounter's context ({betrayer} in the text below).

   shackled_betrayal      the party sees something is wrong with the shackled member, and they turn. Every road leads to the fight: START_BATTLE with `betrayer: true` takes them out of the
                          party for good and puts them on the enemy side at full health, in whatever they still wear (strip a shackled friend before the night
                          comes, or leave them armed). Winning plays shackled_betrayal_end; losing is the usual game over.
   shackled_betrayal_end  the quiet after.

   Art is borrowed from the Mysterious Altar sheet until the betrayal has pictures of its own (cells (1,1) the dark, (0,0) the altar).
*/
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];

export const shackledBetrayal = {
    id: "shackled_betrayal",
    title: "Shackling",
    imageSheet: "encounter_mysterious_altar",
    initialStage: "awake",
    stages: {
        awake: {
            displayText: "Something Is Wrong",
            tone: "crimson",
            sfx: "whispers",
            image: { col: 1, row: 1 },
            text: "{betrayer} has not been right since the iron closed on their wrists.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake_2" } }] }]
                }
            ]
        },

        awake_2: {
            displayText: "Something Is Wrong",
            tone: "crimson",
            image: { col: 1, row: 1 },
            text: "You have seen them twitching where they lie, lips moving around words no one taught them, fingers clawing at the dirt. Now the muttering has stopped.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake_3" } }] }]
                }
            ]
        },

        awake_3: {
            displayText: "Something Is Wrong",
            tone: "crimson",
            image: { col: 1, row: 1 },
            text: "They are looking at you, and the chains have begun to hum.",
            decisions: [
                {
                    text: "Kneel beside {betrayer}.",
                    customActionText: "You reach out. {betrayer}'s head turns toward you, too slowly and too smoothly. A voice that is not theirs answers with their mouth.",
                    outcomes: toStage("rises")
                },
                {
                    text: "Back away and reach for your weapon.",
                    customActionText: "Your hand finds the grip. {betrayer} watches it, and smiles with a face that has forgotten how.",
                    outcomes: toStage("rises")
                }
            ]
        },

        rises: {
            displayText: "No Mending This",
            tone: "crimson",
            bgm: "plainsBattleBgm",   // the biome's battle music begins as they turn on you, and carries into the fight
            image: { col: 1, row: 1 },
            text: "The humming climbs to a whine. {betrayer} lurches upright, the chains dragging, and the dark pours off them like heat from a forge.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rises_2" } }] }]
                }
            ]
        },

        rises_2: {
            displayText: "No Mending This",
            tone: "crimson",
            image: { col: 1, row: 1 },
            bgm: "plainsBattleBgm",
            text: "Whatever you shared on the road is gone. They are coming for you now.",
            decisions: [
                {
                    text: "Fight.",
                    customActionText: "You raise your guard against someone who was your friend.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "START_BATTLE", payload: { betrayer: true, afterVictory: { encounterId: "shackled_betrayal_end" } } }
                        ]
                    }]
                }
            ]
        }
    }
};

export const shackledBetrayalEnd = {
    id: "shackled_betrayal_end",
    title: "The Quiet After",
    imageSheet: "encounter_mysterious_altar",
    initialStage: "after",
    stages: {
        after: {
            displayText: "The Quiet After",
            image: { col: 0, row: 0 },
            text: "{betrayer} falls, and the dark that wore them goes out like a blown flame. The chains lie in the dirt.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "after_2" } }] }]
                }
            ]
        },

        after_2: {
            displayText: "The Quiet After",
            image: { col: 0, row: 0 },
            text: "You do not know whether the one who knelt beneath that dark ever heard you call. They are gone, and they do not come back.",
            decisions: [
                {
                    text: "Bury what is left and move on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

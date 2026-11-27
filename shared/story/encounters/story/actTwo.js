/* A Dark Truth: the turning point of the game. It plays straight after Darius the Groveler is defeated (the START_BATTLE of the altar's last Darius stage carries
 * `afterVictory: { encounterId: "act_two" }`, see SceneManager), and its last choice grants the milestone 'darius_slain': act III, the blood moon.
 *
 * Where the curse is hinted at, never explained. The altar's last light shows Darius's life: the king's young adviser kneeling at the fallen stone
 * night after night, losing small things he does not notice, until only the kneeling was left. His last words (truth) are all the telling there is:
 * it was never the stone, it was what he gave it, and it counts. Then the player's shackles are warm. What that means is left to the player and to the
 * screens (corruption, shown from act 3 on: characters/corruptionSystem.js). The moon turns red, and the quest that follows is "A Dark Truth"
 * (questDefinitions.js, act2_red_moon).
 * From then on the world is in act 3 (story/actDefinitions.js): every night is a blood moon, the spawn tables hold their act 3 entries and enemies are stronger.
 *
 * Voiced (shared/story/voiceLines.js): the narrator, and Darius's own words (long_dark in the vision, truth as he dies).
 * Pictures are borrowed from the altar's sheet; the stage fields are explained at the top of story/encounters/story/prologue.js.
 */
import { toStage, next } from '../stageKit.js';

export const actTwo = {
    id: "act_two",
    title: "A Dark Truth",
    // the party that beat Darius sees it together, led by the fight's leader (SceneManager BATTLE_ENDED, multiplayerSocial.awaitAfterFight); every
    // player in it is granted their act 3 and quest. One who missed it (an old save) sees it alone later, on the map (ActSystem.owesDarkTruth).
    personal: false,
    initialStage: "silence",
    tone: "blood",
    stages: {
        silence: {
            displayText: "Silence",
            image: { sheet: "encounter_darius_defeated", col: 0, row: 0 },   // Darius slumped over the altar
            bgm: "none",
            ambience: "none",
            sfx: "heartbeat",
            text: "Darius the Groveler lies still. The hum in the stone has stopped. For the first time in this place, there is silence.",
            decisions: next("last_light")
        },
        last_light: {
            displayText: "The Last Light",
            image: { sheet: "encounter_mysterious_altar", col: 0, row: 1 },   // the altar's blue glow
            sfx: "whispers",
            sfxVolume: 0.5,
            text: "Then the altar flickers. One last time its light rises and fills the cave, and in it you see this place as it was, long ago.",
            decisions: next("the_mage")
        },
        // ---- the vision: Darius's life, one spell at a time ----
        the_mage: {
            displayText: "The King's Mage",
            image: { sheet: "encounter_mysterious_altar", col: 0, row: 1 },
            text: "A young man in a clean blue robe kneels before the fallen stone, steady hands and a quick smile. Darius. The king rests a hand on his shoulder. Keep it safe until I return.",
            decisions: next("first_winter")
        },
        first_winter: {
            displayText: "The First Winter",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },   // the altar's green glow
            text: "Every night he kneels, and every night the light answers him. It is beautiful. A name he once knew slips away. Then the taste of bread. Then his mother's voice. He does not notice.",
            decisions: next("long_dark")
        },
        long_dark: {
            displayText: "The Long Dark",
            image: { sheet: "encounter_mysterious_altar", col: 2, row: 1 },   // the altar's red glow
            sfx: "whispers",
            sfxVolume: 0.6,
            text: "Years pass. The king does not come back. One night the stone is gone, and still he kneels before the empty hollow. \"Not yet, my king, not yet. I am still here. Heh... heh.\"",
            decisions: next("groveler")
        },
        groveler: {
            displayText: "The Groveler",
            image: { sheet: "encounter_mysterious_altar", col: 3, row: 1 },   // Darius risen at the altar
            effect: "jolt",
            text: "The robe rots. His back bends until it will not straighten. The quick smile becomes a grin he cannot stop, until all that is left is the kneeling, and the waiting.",
            decisions: next("truth")
        },
        // ---- what it means: only what Darius says, and the iron ----
        truth: {
            displayText: "A Dark Truth",
            image: { sheet: "encounter_darius_defeated", col: 0, row: 0 },
            bgm: "none",
            sfx: "heartbeat",
            text: "The light gutters out. Behind you, Darius draws one more breath. \"It was never the stone. It was what I gave it, a little every night. Mind what you give, chained one. It always counts.\"",
            decisions: next("iron")
        },
        iron: {
            displayText: "Warm Iron",
            effect: "shake",
            sfx: "whispers",
            text: "Your shackles are warm. They have never been warm before. Far above, through a mile of stone, many voices begin to laugh at once.",
            decisions: next("moon")
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
                            { type: "GRANT_MILESTONE", payload: { id: "darius_slain" } },   // act III: the blood moon (story/actDefinitions.js)
                            { type: "START_QUEST", payload: { questId: "act2_red_moon", questName: "A Dark Truth" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        }
    }
};

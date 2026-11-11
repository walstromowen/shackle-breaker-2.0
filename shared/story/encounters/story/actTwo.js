/* A Dark Truth: the turning point of the game. It plays straight after Darius the Groveler is defeated (the START_BATTLE of the altar's last Darius stage carries
 * `afterVictory: { encounterId: "act_two" }`, see SceneManager), and its last choice grants the milestone 'act2'.
 *
 * Where the game says what the curse is. The altar's last light shows Darius's life: the king's young mage, set to keep the fallen stone's light
 * burning with his spells, paying for every one with a piece of himself, until only the kneeling was left. Then the player feels the same price in
 * their own iron: magic is the curse, and every spell drains the one who casts it (corruption, which the screens show from act 2 on:
 * characters/corruptionSystem.js). The moon turns red, and the quest that follows is "A Dark Truth" (questDefinitions.js, act2_red_moon).
 * From then on the world is in act 2 (story/actDefinitions.js): every night is a blood moon, the spawn tables hold their act 2 entries and enemies are stronger.
 *
 * Voiced (shared/story/voiceLines.js): the narrator, and Darius's own words in the vision (long_dark).
 * Pictures are borrowed from the altar's sheet; the stage fields are explained at the top of story/encounters/story/prologue.js.
 */
const toStage = (stageId) => [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];

export const actTwo = {
    id: "act_two",
    title: "A Dark Truth",
    // every player who beat Darius plays it for themselves: it grants their own act 2 and quest (in a party of players each sees it on their own screen)
    personal: true,
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
            text: "A young man in a clean blue robe kneels before the fallen stone. A governor, one of the king's advisers, with steady hands and a quick smile. His name is Darius. The king rests a hand on his shoulder and gives him one task: keep this stone safe until I return.",
            decisions: next("first_winter")
        },
        first_winter: {
            displayText: "The First Winter",
            image: { sheet: "encounter_mysterious_altar", col: 1, row: 1 },   // the altar's green glow
            text: "Every night Darius pours a spell into the stone, and every night the light answers him. It is beautiful. He does not notice what it takes. A name he once knew. The taste of bread. The sound of his mother's voice.",
            decisions: next("long_dark")
        },
        long_dark: {
            displayText: "The Long Dark",
            image: { sheet: "encounter_mysterious_altar", col: 2, row: 1 },   // the altar's red glow
            sfx: "whispers",
            sfxVolume: 0.6,
            text: "Years pass. The king does not come back. Then one night the stone is gone. Darius sends every soldier he has to find it, and kneels, and casts into the empty hollow. \"Not yet, my king, not yet. I am still here. Heh... heh.\"",
            decisions: next("groveler")
        },
        groveler: {
            displayText: "The Groveler",
            image: { sheet: "encounter_mysterious_altar", col: 3, row: 1 },   // Darius risen at the altar
            effect: "jolt",
            text: "The robe rots. His back bends until it will not straighten. The quick smile becomes a grin he cannot stop. Spell by spell the man runs out, until all that is left is the kneeling, and the light, and the waiting.",
            decisions: next("truth")
        },
        // ---- what it means ----
        truth: {
            displayText: "A Dark Truth",
            image: { sheet: "encounter_darius_defeated", col: 0, row: 0 },
            bgm: "none",
            sfx: "heartbeat",
            text: "The light gutters out, and you understand. The stone did not curse him. Neither did the war, or the king. His own magic did. Every spell is paid for with a piece of the one who casts it, and the price is never named. The ones who could work a spell went mad first because they cast the most.",
            decisions: next("iron")
        },
        iron: {
            displayText: "Warm Iron",
            effect: "shake",
            sfx: "whispers",
            text: "Your shackles are warm. They have never been warm. You think of every spell you have cast, and you feel what each one cost you, counted in the iron. Cast enough, and there will be nothing left of you either. Far above, through a mile of stone, many voices begin to laugh at once.",
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
                            { type: "GRANT_MILESTONE", payload: { id: "act2" } },
                            { type: "START_QUEST", payload: { questId: "act2_red_moon", questName: "A Dark Truth" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        }
    }
};

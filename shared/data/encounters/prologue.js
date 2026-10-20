/* The Prologue: the first thing a new game plays, straight after the character is made (see SceneManager: CHANGE_SCENE from the creator).
 *
 * It tells the player nothing of the story. It only puts them in the moment: shackled in a line of cursed prisoners, led somewhere unknown,
 * until the chain breaks, the convoy walks on without them, and they come to their senses. Written like any other encounter: short,
 * plain sentences in the second person, a little ominous, with a couple of small choices.
 *
 * The music is the Shackled March, started by the first stage and cut to silence when the chain breaks.
 *
 * Besides the usual stage fields this encounter uses a few that only the encounter scene reads (all optional on any stage):
 *   tone:     'cold'  words glow pale green and the embers turn cold (the cursed road); the default is warm ember
 *   effect:   'snap'  a white flash and a jolt when the stage opens
 *   sfx:      a sound played once when the stage opens          (asset key)
 *   ambience: a looping bed that starts when the stage opens    (asset key, or 'none' to stop the current one)
 *   bgm:      a track to switch to, or 'none' to stop the music (silence is part of the scene)
 * Two of the pictures are borrowed from another encounter (a stage may name any sheet); the others are left black on purpose.
 */
export const prologue = {
    id: "prologue",
    title: "Shackled",
    initialStage: "iron",
    stages: {
        iron: {
            displayText: "Shackled",
            tone: "cold",
            bgm: "shackledMarchBgm",
            ambience: "prologueMarch",
            text: "Iron on your wrists. A chain pulls, and you follow. The sky is ash, and the dark ahead looks the same as the dark behind.",
            decisions: [
                {
                    text: "Walk.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_others" } }] }]
                }
            ]
        },
        the_others: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 2 },
            text: "The other prisoners laugh and mutter to themselves, the way a wound weeps. Their eyes are hollow. They look cursed.",
            decisions: [
                {
                    text: "Listen to them.",
                    customActionText: "The laughter has no joy in it, and it never stops.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                },
                {
                    text: "Ignore them.",
                    customActionText: "You stare at the ground and keep walking.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        the_guards: {
            displayText: "The Guards",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 3 },
            text: "Guards in dark armor walk beside the line, carrying green torches. They do not speak, and they do not tire.",
            decisions: [
                {
                    text: "Look at their faces.",
                    customActionText: "Something is wrong with them. They look just like the prisoners.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                },
                {
                    text: "Keep your eyes on the ground.",
                    customActionText: "You count your steps and do not look up.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                }
            ]
        },
        the_road: {
            displayText: "The Road",
            tone: "cold",
            text: "Where this road ends, and why you walk it, no one will say.",
            decisions: [
                {
                    text: "Walk.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                },
                {
                    text: "Ask where you are going.",
                    customActionText: "No one answers. Somewhere ahead, someone laughs.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                }
            ]
        },
        slack: {
            displayText: "The Chain",
            tone: "cold",
            effect: "snap",
            sfx: "chainSnap",
            bgm: "none",
            ambience: "prologueWind",
            text: "A sound like a bell struck underwater. The chain at your wrists goes slack.",
            decisions: [
                {
                    text: "Look down.",
                    customActionText: "The chain lies broken in the dust. The cuffs are still locked around your wrists.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "still" } }] }]
                }
            ]
        },
        still: {
            displayText: "Left Behind",
            tone: "cold",
            text: "The convoy walks on. No one turns. No one counts. Neither the guards nor the prisoners look back.",
            decisions: [
                {
                    text: "Watch them go.",
                    customActionText: "The line fades into the dark.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                }
            ]
        },
        awake: {
            displayText: "Awake",
            sfx: "heartbeat",
            ambience: "none",
            text: "And then, all at once, you are awake. The fog in your mind is gone, {name}, and your story begins.",
            decisions: [
                {
                    text: "Draw a breath.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

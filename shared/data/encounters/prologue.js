/* The Prologue: the first thing a new game plays, straight after the character is made (see SceneManager: CHANGE_SCENE from the creator).
 *
 * It tells the player nothing of the story. It only puts them in the moment: shackled in a line of cursed prisoners, led somewhere unknown,
 * until the chain that binds them to the line breaks (the shackles stay locked on their wrists, but they are free of the line), the convoy walks on
 * without them, and they come to their senses with one thing to find out: what happened. Written like any other encounter: short,
 * plain sentences in the second person, a little ominous, with a couple of small choices.
 *
 * The music is the plains daytime overworld track, started by the first stage and cut to silence when the chain breaks.
 *
 * Besides the usual stage fields this encounter uses a few that only the encounter scene reads (all optional on any stage):
 *   tone:     'cold'  words glow pale green and the embers turn cold (the cursed road); the default is warm ember
 *   effect:   'snap'  a white flash and a jolt when the stage opens
 *   sfx:      a sound played once when the stage opens          (asset key)
 *   ambience: a looping bed that starts when the stage opens    (asset key, or 'none' to stop the current one)
 *   bgm:      a track to switch to, or 'none' to stop the music (silence is part of the scene)
 * Art: assets/icons/encounters/prologue.png registered as `encounter_prologue`, a 4 x 4 grid of 128 px cells (see encounter_prologue_template.png):
 *     (0,0) iron        (1,0) the_others   (2,0) the_guards   (3,0) the_road
 *     (0,1) slack       (1,1) still        (2,1) awake
 *   The prisoners and the guards are painted (copied from the aftermath sheet); the other five cells are placeholder sketches to be painted over.
 */
export const prologue = {
    id: "prologue",
    title: "Shackled",
    initialStage: "iron",
    stages: {
        iron: {
            displayText: "Shackled",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 0, row: 0 },
            bgm: "plainsBgmDay",
            ambience: "prologueMarch",
            text: "Iron on your wrists. A chain runs from the shackles to the prisoner ahead of you, and it pulls, and you follow. The sky is ash, and the dark ahead looks the same as the dark behind.",
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
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "The other prisoners laugh and mutter to themselves, the way a wound weeps. Their eyes are hollow as they babble about things that make no sense.",
            decisions: [
                {
                    text: "Listen to them.",
                    customActionText: "The prisoners' words make no sense, yet they laugh as if remenicing over a shared memory. Still, their laughter has no joy in it, and it never stops. ",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                },
                {
                    text: "Ignore them.",
                    customActionText: "You stare at the ground and keep walking, hoping to drown out their endless laughter.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        the_guards: {
            displayText: "The Guards",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 2, row: 0 },
            text: "Guards in dark armor walk beside the line, their faces hidden beneath visors. They do not speak, and they do not tire.",
            decisions: [
                {
                    text: "Look at their faces.",
                    customActionText: "The guards' faces are hidden, but there is a familiarity to them. Some chuckle to themselves while most look straight ahead without expression.",
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
            image: { sheet: "encounter_prologue", col: 3, row: 0 },
            text: "The road stretches endlessly ahead. Where this road ends, and why you walk it, you do not know.",
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
            image: { sheet: "encounter_prologue", col: 0, row: 1 },
            effect: "snap",
            sfx: "chainSnap",
            bgm: "none",
            ambience: "prologueWind",
            text: "A sound like a bell struck underwater. The chain that binds you to the line breaks, and goes slack.",
            decisions: [
                {
                    text: "Look down.",
                    customActionText: "The chain lies broken in the dust, a few links still hanging from your wrists. The shackles are still locked on, but you are free of the line.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "still" } }] }]
                }
            ]
        },
        still: {
            displayText: "Left Behind",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 1 },
            text: "The convoy walks on, and the gap where you were closes behind them. No one turns. No one counts. Neither the guards nor the prisoners look back.",
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
            image: { sheet: "encounter_prologue", col: 2, row: 1 },
            sfx: "heartbeat",
            ambience: "none",
            text: "And then, all at once, you are awake. The fog in your mind is gone, {name}. The shackles are still locked on your wrists, but the chain is broken, and the line is far behind you. Somewhere out here is the reason for all of it, and your story begins.",
            decisions: [
                {
                    text: "Draw a breath.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

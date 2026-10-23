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
 *     (0,1) slack       (1,1) still        (2,1) awake        (3,1) no_key (not painted yet: until it is, no_key shows the slack cell)
 *   The prisoners and the guards are painted (copied from the aftermath sheet); the other cells are placeholder sketches to be painted over.
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
            text: "You look down at your wrists. Metal shackles bind you to the prisoner ahead of you. It pulls, and you follow. You don't remember how you got here, or how long you have been walking.",
            decisions: [
                {
                    text: "Walk.",
                    customActionText: "You walk forward, as you have done for so long.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_others" } }] }]
                }
            ]
        },
        the_others: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "The prisoners ahead laugh and mutter to themselves, their laughter has no joy in it, and it never stops..",
            decisions: [
                {
                    text: "Listen to them.",
                    customActionText: "The prisoners' words make no sense, yet they laugh as if remenicing over a shared memory.  ",
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
            text: "A guard in dark armor walks beside you, his faces hidden beneath his helmet. You try to catch a glimpse of his expression, but it remains obscured.",
            decisions: [
                {
                    text: "Look closer.",
                    customActionText: "The guard's expression is neutral, revealing nothing of his thoughts.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                },
                {
                    text: "Keep your eyes on the ground.",
                    customActionText: "You count your steps and do not look up. hoping the guard did not notice your gaze.",
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
                    customActionText: "You continue walking, your labored steps sinking into the mud.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                },
                {
                    text: "Ask where you are going.",
                    customActionText: "You sheepishly ask where you are going to anyone who is listing. After a short pause, the prisoners around you burst out in a chorus of laughter.",
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
            text: "In an instant, a sound like a bell struck underwater fills your ears. The chain that binds you to the line breaks, and goes slack.",
            decisions: [
                {
                    text: "Look down.",
                    customActionText: "The chain lies broken in the dust, a few links still hanging from your wrists. You are free of the line.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "still" } }] }]
                }
            ]
        },
        no_key: {
            displayText: "No Key",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 0, row: 1 }, // shares the chain's picture until its own cell (3,1) is painted
            text: "The shackles are still locked around your wrists. You turn them over, searching for a keyhole, and find none. The metal is smooth and seamless, as though it was never forged, only grown around you.",
            decisions: [
                {
                    text: "Search for a lock.",
                    customActionText: "No keyhole, no hinge, no seam. Whatever holds these shackles shut, no key was ever made to open them.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                },
                {
                    text: "Pull at the shackles.",
                    customActionText: "It does not give, no matter how hard you pull.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                }
            ]
        },
        still: {
            displayText: "Left Behind",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 1 },
            text: "You stand still bewildered, unsure of what just happened. Meanwhile, the convoy walks on, walking past you as if you weren't there.",
            decisions: [
                {
                    text: "Watch them go.",
                    customActionText: "Neither the guards nor the prisoners seem to take any notice or your absence as the line of prisoners fades into the darkness, out of sight.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "no_key" } }] }]
                }
            ]
        },
        awake: {
            displayText: "Awake",
            image: { sheet: "encounter_prologue", col: 2, row: 1 },
            sfx: "heartbeat",
            ambience: "none",
            text: "You draw a steadying breath as reality grounds you. Before you stretches a silent, hollow wasteland. Memories flick in and out of focus making it difficult to discern what is real and what is illusion. But looking down at your wrists one thing is for certain: something is terribly wrong...",
            decisions: [
                {
                    text: "Draw a breath.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

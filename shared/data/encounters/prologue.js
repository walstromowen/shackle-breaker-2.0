/* The Prologue: the first thing a new game plays, straight after the character is made (see SceneManager: CHANGE_SCENE from the creator).
 *
 * It tells the player nothing of the story. It only puts them in the moment: shackled in a line of cursed prisoners, led somewhere unknown,
 * until the chain breaks, the convoy walks on without them, and they come to their senses. Written like any other encounter: short,
 * plain sentences about {name}, with a couple of small choices.
 *
 * The music is the title theme, still playing from the title screen and the character creator (no stage names a track, so it carries on).
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
            ambience: "prologueMarch",
            text: "{name} is led down a dark road in shackles, chained to a line of other prisoners.",
            decisions: [
                {
                    text: "Keep walking.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_others" } }] }]
                }
            ]
        },
        the_others: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 2 },
            text: "The other prisoners laugh and mutter to themselves. Their eyes are hollow and dazed. They look cursed.",
            decisions: [
                {
                    text: "Listen to them.",
                    customActionText: "The laughter has no joy in it, and it never stops.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                },
                {
                    text: "Ignore them.",
                    customActionText: "{name} stares at the ground and keeps moving.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        the_guards: {
            displayText: "The Guards",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 3 },
            text: "Guards in dark armor walk beside the line. They do not speak, and they do not tire.",
            decisions: [
                {
                    text: "Look at the guards.",
                    customActionText: "Something is wrong with them. They look like the prisoners do.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                },
                {
                    text: "Look away.",
                    customActionText: "{name} keeps their eyes down and counts their steps.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                }
            ]
        },
        the_road: {
            displayText: "The Road",
            tone: "cold",
            text: "No one says where the road leads, or why {name} was taken.",
            decisions: [
                {
                    text: "Keep walking.",
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
            text: "Suddenly, the chain snaps. The shackles stay locked around {name}'s wrists, but the chain is broken.",
            decisions: [
                {
                    text: "Stop walking.",
                    customActionText: "{name} stands still on the road.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "still" } }] }]
                }
            ]
        },
        still: {
            displayText: "Left Behind",
            tone: "cold",
            text: "The convoy keeps marching as if nothing happened. Neither the guards nor the prisoners look back.",
            decisions: [
                {
                    text: "Watch them go.",
                    customActionText: "The line disappears into the dark.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                }
            ]
        },
        awake: {
            displayText: "Awake",
            sfx: "heartbeat",
            ambience: "none",
            text: "{name} comes to their senses. The fog in their mind has cleared, and their story begins.",
            decisions: [
                {
                    text: "Move on.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

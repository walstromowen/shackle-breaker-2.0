/* The Prologue: the first thing a new game plays, straight after the character is made (see SceneManager: CHANGE_SCENE from the creator).
 *
 * It tells the player nothing of the story. It only puts them in the moment: shackled, led down a road they cannot name, among people who
 * laugh at nothing, until the chain breaks and the road carries on without them. Everything is in the present tense and in the second person.
 *
 * Besides the usual stage fields this encounter uses a few that only the encounter scene reads (all optional on any stage):
 *   tone:     'cold'  words glow pale green and the embers turn cold (the cursed road); the default is warm ember
 *   effect:   'snap'  a white flash and a jolt when the stage opens
 *   sfx:      a sound played once when the stage opens          (asset key)
 *   ambience: a looping bed that starts when the stage opens    (asset key, or 'none' to stop the current one)
 *   bgm:      'none' stops the music (silence is part of the scene)
 * The three images are borrowed from other encounters (a stage may name any sheet); the others are left black on purpose.
 */
export const prologue = {
    id: "prologue",
    title: "Shackled",
    initialStage: "iron",
    stages: {
        iron: {
            displayText: "Iron",
            tone: "cold",
            bgm: "shackledMarchBgm",
            ambience: "prologueMarch",
            text: "Iron on your wrists.\n\nA chain pulls, and you follow. The road is old and the sky is ash, and the dark ahead looks exactly like the dark behind.",
            decisions: [
                {
                    text: "Walk.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_others" } }] }]
                }
            ]
        },
        the_others: {
            displayText: "The Others",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 2 },
            text: "Around you, the others are laughing.\n\nNot at anything. A line of them, shackled wrist to wrist, laughing the way a wound weeps. Their eyes are open. Nothing looks out.",
            decisions: [
                {
                    text: "Laugh with them.",
                    customActionText: "Something climbs your throat and tears out of you. It is not quite your voice.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                },
                {
                    text: "Clench your jaw.",
                    customActionText: "Your teeth ache. The laughter around you does not stop.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        the_guards: {
            displayText: "The Guards",
            tone: "cold",
            image: { sheet: "encounter_aftermath", col: 3, row: 3 },
            text: "The guards do not speak, and do not tire. Green flame gutters in their torches and gives no warmth.\n\nWhatever holds the prisoners holds them too.",
            decisions: [
                {
                    text: "Look at their faces.",
                    customActionText: "There is a helm, and a dark slit, and in the slit, something that is looking at nothing.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                },
                {
                    text: "Keep your eyes on the ground.",
                    customActionText: "Dirt. Ash. The shuffle of bare feet. You have lost count of the steps.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                }
            ]
        },
        the_road: {
            displayText: "The Road",
            tone: "cold",
            text: "Where this road ends, and why you walk it, no one will say.\n\nYou have stopped asking. You are no longer sure you ever did.",
            decisions: [
                {
                    text: "Walk.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                },
                {
                    text: "Ask where you are going.",
                    customActionText: "No one answers. Somewhere ahead, someone laughs, and the others take it up.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                }
            ]
        },
        slack: {
            displayText: "Slack",
            tone: "cold",
            effect: "snap",
            sfx: "chainSnap",
            bgm: "none",
            ambience: "prologueWind",
            text: "A sound like a bell struck underwater.\n\nThe chain at your wrists goes slack.",
            decisions: [
                {
                    text: "Look down.",
                    customActionText: "Links lie in the dirt, bright where they broke. The cuffs are still locked around your wrists.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "still" } }] }]
                }
            ]
        },
        still: {
            displayText: "Still",
            tone: "cold",
            text: "You do not move.\n\nThe convoy walks on. The laughter, the green torches, the iron song of a hundred bare feet: all of it drifting down the road without you. No one turns. No one counts. It is as though you were never among them.",
            decisions: [
                {
                    text: "Watch them go.",
                    customActionText: "The fog takes the last of the torches. The laughter lasts a little longer.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                }
            ]
        },
        awake: {
            displayText: "Awake",
            sfx: "heartbeat",
            ambience: "none",
            text: "And then, all at once, you are awake.\n\nThe iron stays. The ash falls. Somewhere behind your eyes, a name begins to return to you.",
            decisions: [
                {
                    text: "Draw a breath.",
                    customActionText: "The air is cold, and it is yours.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

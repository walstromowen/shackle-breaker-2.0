/* The Prologue: the first thing a new game plays, straight after the character is made (see SceneManager: CHANGE_SCENE from the creator).
 *
 * It tells the player nothing of the story. It only puts them in the moment: shackled in a line of cursed prisoners, led somewhere unknown,
 * until the chain that binds them to the line breaks (the shackles stay locked on their wrists, but they are free of the line), the convoy walks on
 * without them, and they come to their senses with one thing to find out: what happened. Written like any other encounter: short,
 * plain sentences in the second person, a little ominous, with a couple of small choices.
 *
 * The music is the plains daytime overworld track, started by the first stage and cut to silence when the chain breaks.
 *
 * The madmen: the prisoner chained ahead of the player speaks to them (stages mad_*, and road_ask when the player asks where the line is going):
 * the cursed madmen of the world, in their voice (voiceLines.js: their quoted words are the MADMAN's), frantic, laughing, a little beast.
 *
 * Besides the usual stage fields this encounter uses a few that only the encounter scene reads (all optional on any stage):
 *   tone:     'cold'  words glow pale green and the embers turn cold (the cursed road); the default is warm ember
 *   effect:   'snap'  a white flash and a jolt when the stage opens
 *   sfx:      a sound played once when the stage opens          (asset key)
 *   ambience: a looping bed that starts when the stage opens    (asset key, or 'none' to stop the current one)
 *   bgm:      a track to switch to, or 'none' to stop the music (silence is part of the scene)
 * Art: assets/icons/encounters/story/prologue.png registered as `encounter_prologue`, a 4 x 4 grid of 128 px cells (see encounter_prologue_template.png):
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
            ambience: "prologueMarchWind",   // the march, with the wind under it: the wind carries through the whole prologue
            text: "Iron shackles bind your wrists, chained to the prisoner ahead of you.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "iron_2" } }] }]
                }
            ]
        },

        iron_2: {
            displayText: "Shackled",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 0, row: 0 },
            bgm: "plainsBgmDay",
            text: "It pulls, and you follow. You don't remember how you got here, or how long you have been walking.",
            decisions: [
                {
                    text: "Walk.",
                    customActionText: "Forward, as you have walked for so long.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_others" } }] }]
                }
            ]
        },
        the_others: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            sfx: "magicAddictCry",   // one of the prisoners ahead: the magic addicts' cry
            sfxVolume: 0.55,
            text: "The prisoners ahead laugh and mutter to themselves. Their laughter has no joy in it, and it never stops.",
            decisions: [
                {
                    text: "Listen to them.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "mad_turn" } }] }]
                },
                {
                    text: "Ignore them.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "mad_ignore" } }] }]
                }
            ]
        },
        // the prisoner chained ahead of you: one of the cursed madmen
        mad_turn: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "The one chained ahead of you twists around, grinning, his eyes wet and far too wide. \"New one! Hee hee! New one hears it too, yes? The whispers?\"",
            decisions: [
                {
                    text: "\"Hears what?\"",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "mad_whispers" } }] }]
                },
                {
                    text: "\"Leave me alone.\"",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "mad_alone" } }] }]
                }
            ]
        },
        mad_whispers: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "\"Shhh! Magic tell me where we go!\" He leans in, close enough that you smell the rot on his breath. \"Nowhere! We go nowhere! Hahaha!\"",
            decisions: [
                {
                    text: "Pull away.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        mad_alone: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "\"Alone? Hahaha! Never alone! Magic always listening!\" He snaps his teeth at you like a dog, then turns back to the road, giggling.",
            decisions: [
                {
                    text: "Walk on.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        mad_ignore: {
            displayText: "The Prisoners",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 0 },
            text: "You keep your eyes on the ground. Still, the one chained ahead of you giggles without turning. \"Eyes down, eyes down! Hee hee! No help. Magic see you anyway.\"",
            decisions: [
                {
                    text: "Walk on.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_guards" } }] }]
                }
            ]
        },
        the_guards: {
            displayText: "The Guards",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 2, row: 0 },
            text: "A guard in dark armor walks beside you, his face hidden beneath his helmet. You try to catch a glimpse of his expression, but it remains obscured.",
            decisions: [
                {
                    text: "Look closer.",
                    customActionText: "The guard's expression is neutral, revealing nothing of his thoughts.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_road" } }] }]
                },
                {
                    text: "Keep your eyes on the ground.",
                    customActionText: "Head down, you count your steps, hoping the guard did not notice your gaze.",
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
                    customActionText: "On you walk, your labored steps sinking into the mud.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slack" } }] }]
                },
                {
                    text: "Ask where you are going.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "road_ask" } }] }]
                }
            ]
        },
        road_ask: {
            displayText: "The Road",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 3, row: 0 },
            text: "You ask where you are going. A pause, then the whole line bursts out laughing, the one ahead of you loudest of all. \"Where?! Hahaha! Where iron go! Where iron always go!\"",
            decisions: [
                {
                    text: "Walk.",
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
            text: "The shackles are still locked around your wrists. You turn them over, searching for a keyhole, and find none.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake" } }] }]
                }
            ]
        },

        still: {
            displayText: "Left Behind",
            tone: "cold",
            image: { sheet: "encounter_prologue", col: 1, row: 1 },
            text: "Bewildered, you stand still as the convoy walks on past you as if you weren't there. Neither the guards nor the prisoners take any notice of your absence, and the line fades into the darkness, out of sight.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "no_key" } }] }]
                }
            ]
        },
        awake: {
            displayText: "Awake",
            image: { sheet: "encounter_prologue", col: 2, row: 1 },
            sfx: "heartbeat",   // (the wind goes on: it lasts the whole prologue)
            text: "A steadying breath, and reality grounds you. Before you stretches a silent, hollow wasteland.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake_2" } }] }]
                }
            ]
        },

        awake_2: {
            displayText: "Awake",
            image: { sheet: "encounter_prologue", col: 2, row: 1 },
            text: "Memories flicker in and out of focus making it difficult to discern what is real and what is illusion.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "awake_3" } }] }]
                }
            ]
        },

        awake_3: {
            displayText: "Awake",
            image: { sheet: "encounter_prologue", col: 2, row: 1 },
            text: "But looking down at your wrists one thing is for certain: something is terribly wrong...",
            decisions: [
                {
                    text: "Draw a breath.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

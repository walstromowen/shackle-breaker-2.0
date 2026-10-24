/* The Mysterious Altar (object MYSTERIOUS_ALTAR, interaction { type: 'ENCOUNTER', id: 'mysterious_altar' }).

   Art: assets/icons/encounters/story/mysterious_altar.png registered as `encounter_mysterious_altar`, a 4 x 4 grid of 128 px cells (see encounter_mysterious_altar_template.png):
     (0,0) approach       (1,0) at_the_altar   (2,0) bones_stir     (3,0) smoke_cloud
     (0,1) blue_glow      (1,1) green_glow     (2,1) red_glow       (3,1) darius_rises

   Flow:  approach     -> [VIG] walk up to the altar (a miss: the bones stir, or a cloud of smoke drains stamina and insight)
          at_the_altar -> [INT] examine the skull: blue glow (full restore) / green glow (loot) on a success, red glow (skeleton fight) on a failure
                          [Fallen Meteorite] set it on the altar: Darius the Groveler crawls out of the dark. Only offered while the party carries one.
                          darius_rises .. darius_wrath: a conversation (he weeps for the king who never came, sees the meteorite, and turns on you in envy), then the boss fight.
   Every find or ambush is announced on its own stage first and the effect is handed out on the button after it. A fight that starts from the
   approach leaves the altar standing (it can be tried again); anything that spends the skull or the meteorite destroys the altar. */

const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const fight = (tableId, spend, afterVictory, bgm) => [{
    weight: 100,
    results: [
        { type: "START_BATTLE", payload: { tableId, ...(afterVictory ? { afterVictory } : {}), ...(bgm ? { bgm } : {}) } },
        ...(spend ? [{ type: "DESTROY_OBJECT" }] : [])
    ]
}];

export const mysteriousAltar = {
    id: "mysterious_altar",
    title: "Mysterious Altar",
    imageSheet: "encounter_mysterious_altar",
    initialStage: "approach",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see story/encounters/story/prologue.js)
    tone: "arcane",
    ambience: "altarDrone",
    stages: {
        approach: {
            displayText: "A Mysterious Altar",
            image: { col: 0, row: 0 },
            text: "Your party comes upon a mysterious altar of dark stone. Bones lie scattered across the ground around it, and an ominous chill fills the air.",
            decisions: [
                {
                    text: "[VIG] Approach the altar.",
                    type: "skill_check",
                    attribute: "vigor",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "altar_approached" },
                        HUMANOID
                    ],
                    customActionText: "You approach the altar.",
                    successOutcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "altar_approached" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "at_the_altar" } }
                            ]
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_stir" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "smoke_cloud" } }] }
                    ]
                },
                {
                    text: "[Fallen Meteorite] Approach with the meteorite.",
                    conditions: [
                        { type: "context_flag_not_set", flagId: "altar_approached" },
                        { type: "has_item", itemId: "meteorite", qty: 1 },
                        HUMANOID
                    ],
                    // The meteorite is not spent here (it is set on the altar at_the_altar); the bones and the smoke leave whoever carries it alone
                    customActionText: "You hold the fallen meteorite out in front of you. The bones lie still, the air stays clear, and you walk up to the altar unchallenged.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "altar_approached" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "at_the_altar" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Step up to the altar again.",
                    conditions: [
                        { type: "context_flag_set", flagId: "altar_approached" },
                        HUMANOID
                    ],
                    customActionText: "You step up to the altar once more.",
                    outcomes: toStage("at_the_altar")
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the altar alone.",
                    customActionText: "You continue along the path, leaving the altar alone.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        bones_stir: {
            displayText: "The Bones Stir",
            tone: "blood",
            effect: "shake",
            sfx: "bonesRattle",
            ambience: "none",
            ambienceFade: 0.4,
            bgm: "plainsBattleBgm",   // danger: the biome's battle music (the cave's in a cave) starts here and carries on into the fight
            image: { col: 2, row: 0 },
            text: "As you approach the altar, the skeletons along the ground slowly begin to move. Before you realize what is happening, the skeletons are on top of you!",
            decisions: [
                {
                    text: "Draw your weapons!",
                    conditions: [HUMANOID],
                    outcomes: fight("altar_skeletons", false)
                }
            ]
        },
        smoke_cloud: {
            displayText: "A Choking Cloud",
            tone: "cold",
            effect: "poison",
            sfx: "smokeSfx",
            image: { col: 3, row: 0 },
            text: "As you approach the altar, it releases a cloud of pale smoke. It sinks into your lungs and limbs, and {name} feels fatigued.",
            decisions: [
                {
                    text: "Stagger the rest of the way to the altar.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { stamina: -25, insight: -25, isPercentageOfCurrent: true, damageType: "true" } },
                                { type: "SET_CONTEXT_FLAG", payload: { flagId: "altar_approached" } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "at_the_altar" } }
                            ]
                        }
                    ]
                }
            ]
        },

        at_the_altar: {
            displayText: "At the Altar",
            sfx: "whispers",
            sfxVolume: 0.6,
            image: { col: 1, row: 0 },
            text: "You walk up to the altar and see a skull resting high above the bones on the ground. The skull almost feels as if it were placed there on purpose.",
            decisions: [
                {
                    text: "[INT] Examine the skull.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 15,
                    conditions: [HUMANOID],
                    customActionText: "You reach out to examine the skull...",
                    successOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "blue_glow" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "green_glow" } }] }
                    ],
                    failureOutcomes: toStage("red_glow")
                },
                {
                    text: "[Fallen Meteorite] Set the meteorite on the altar.",
                    conditions: [
                        { type: "has_item", itemId: "meteorite", qty: 1 },
                        HUMANOID
                    ],
                    customActionText: "You lift the fallen meteorite and set it on the altar beside the skull...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "meteorite", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "darius_rises" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Back up.",
                    customActionText: "You back away from the altar.",
                    outcomes: toStage("approach")
                }
            ]
        },

        blue_glow: {
            displayText: "A Blue Light",
            tone: "frost",
            effect: "glow_blue",
            sfx: "glowSwell",
            image: { col: 0, row: 1 },
            text: "As you reach to examine the skull, its eyes begin to glow blue, filling the whole area with a blinding light! When you can see again, the skull has disappeared, and a sense of newfound strength fills you.",
            decisions: [
                {
                    text: "Feel the strength return.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { hp: 9999, stamina: 9999, insight: 9999, damageType: "true" } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        green_glow: {
            displayText: "A Green Light",
            tone: "cold",
            effect: "glow_green",
            sfx: "glowSwell",
            image: { col: 1, row: 1 },
            text: "As you reach to examine the skull, its eyes begin to glow green. Suddenly, mysterious objects materialize on the altar, just waiting to be taken.",
            decisions: [
                {
                    text: "Gather what the altar offers.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2 } },
                                { type: "AWARD_XP", payload: { amount: 10, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        red_glow: {
            displayText: "A Red Light",
            tone: "blood",
            effect: "glow_red",
            sfx: "glowSwell",
            ambience: "none",
            ambienceFade: 1.0,
            bgm: "plainsBattleBgm",   // as in bones_stir: the battle music begins as the skeletons rise
            image: { col: 2, row: 1 },
            text: "As you reach to examine the skull, its eyes begin to glow red, filling the whole area with a blinding light! When you can see again, the skull has disappeared and a group of skeletons is quickly approaching!",
            decisions: [
                {
                    text: "Ready your weapons!",
                    conditions: [HUMANOID],
                    outcomes: fight("altar_skeletons", true)
                }
            ]
        },

        // ---- Darius the Groveler: a conversation, then the fight. Each line of his is a stage, and each reply of yours is the text of the button you press. ----
        // Written quietly: a man who has waited a very long time for a king who never came, who sees the meteorite in the stranger's hands and takes it for the king's
        // favour. Nothing in it is shown, only said. The altar's drone fades out for the talking and comes back when he turns on you.
        darius_rises: {
            displayText: "The Kneeling Man",
            tone: "arcane",
            effect: "glow_blue",
            sfx: "glowSwell",
            ambience: "none",
            ambienceFade: 2.0,
            bgm: "dariusEncounterBgm",   // assets/audio/music/Darius_battle_bgm.mp3
            image: { col: 3, row: 1 },
            text: "The moment the meteorite touches the stone, the altar drinks its glow, and the hum that has filled this place thins to a single held note. Behind the altar, in the dark, someone is weeping.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_rises_3" } }] }]
                }
            ]
        },

        darius_rises_3: {
            displayText: "The Kneeling Man",
            tone: "arcane",
            image: { col: 3, row: 1 },
            bgm: "dariusEncounterBgm",
            text: "A hunched figure in a tattered hood kneels with his brow against the floor, shoulders shaking, the way a man weeps when he has done it for so long that it is the only sound he has left.",
            decisions: [
                {
                    text: "Step closer.",
                    customActionText: "You take a step toward him. The weeping does not stop, and it does not hurry.",
                    outcomes: toStage("darius_weeps")
                }
            ]
        },
        darius_weeps: {
            displayText: "A Promise",
            sfx: "whispers",
            sfxVolume: 0.5,
            image: { col: 3, row: 1 },
            text: "\"He said he would come,\" the figure whispers, to the stone and not to you. \"Keep the light, Darius, he said.\" \"Keep it burning and I shall return for it. So I kept it.\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_weeps_3" } }] }]
                }
            ]
        },

        darius_weeps_3: {
            displayText: "A Promise",
            image: { col: 3, row: 1 },
            text: "\"Through every winter. Through the long dark, when the torches burned to nothing and I kept it still.\" \"My king. My king.\"",
            decisions: [
                {
                    text: "\"Darius?\"",
                    customActionText: "\"Darius,\" you say, gently. \"Is that your name?\"",
                    outcomes: toStage("darius_king")
                },
                {
                    text: "Say nothing.",
                    customActionText: "You say nothing. His grief is too old to be interrupted.",
                    outcomes: toStage("darius_king")
                }
            ]
        },
        darius_king: {
            displayText: "The Groveler",
            image: { col: 3, row: 1 },
            text: "The hood lifts, only a little. Beneath it is a face that was kind once. \"They called me the Groveler,\" he says, almost fondly. \"For the kneeling.\" \"As if there were shame in it. I knelt because no one else was worthy of my knees.\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_king_4" } }] }]
                }
            ]
        },

        darius_king_4: {
            displayText: "The Groveler",
            image: { col: 3, row: 1 },
            text: "He looks past you, down the dark way you came. \"Did you pass him on the road?\" \"He would be tall. He would wear the old colors, and he would be smiling.\" \"He promised.\"",
            decisions: [
                {
                    text: "\"No one is coming.\"",
                    customActionText: "\"No one is coming, Darius,\" you say. \"It has been a very long time.\"",
                    outcomes: toStage("darius_late")
                },
                {
                    text: "\"I saw no one.\"",
                    customActionText: "\"I am sorry,\" you say. \"There was no one on the road but the dead.\"",
                    outcomes: toStage("darius_late")
                }
            ]
        },
        darius_late: {
            displayText: "Late",
            image: { col: 3, row: 1 },
            text: "For a moment the weeping stops, and the silence is worse. \"No,\" Darius says softly, the way one refuses a child who has said something cruel. \"He is only late. Kings are never early.\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_late_3" } }] }]
                }
            ]
        },

        darius_late_3: {
            displayText: "Late",
            image: { col: 3, row: 1 },
            text: "\"A king comes when the hour is ready for him, and I am ready. I have been ready for so long.\" His pale hands press flat against the stone, as if it were a door he could wear open. \"He told me he would send a sign.\"",
            decisions: [
                {
                    text: "Wait.",
                    customActionText: "You wait. Behind you the meteorite hums, and Darius lifts his head toward the sound.",
                    outcomes: toStage("darius_sees")
                }
            ]
        },
        darius_sees: {
            displayText: "The Star",
            effect: "jolt",
            sfx: "heartbeat",
            image: { col: 0, row: 1 },
            text: "He sees it then: the fallen star in the hollow of the altar, black and humming, beside the skull. His eyes go from it to your hands, which carried it here, and to the iron on your wrists. \"That is the king's,\" he breathes.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_sees_3" } }] }]
                }
            ]
        },

        darius_sees_3: {
            displayText: "The Star",
            image: { col: 0, row: 1 },
            text: "\"A star, from the sky, to the altar. He sent a sign, and it has come to me.\" His mouth trembles into a smile. It does not last. \"No. Not to me.\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_sees_6" } }] }]
                }
            ]
        },

        darius_sees_6: {
            displayText: "The Star",
            image: { col: 0, row: 1 },
            text: "\"You carried it. You carried it all this way.\"",
            decisions: [
                {
                    text: "\"I only found it.\"",
                    customActionText: "\"I found it, Darius. That is all. I did not know it was meant for anyone.\"",
                    outcomes: toStage("darius_envy")
                },
                {
                    text: "Step back from the altar.",
                    customActionText: "You step back. The hum in the stone climbs with every step you take.",
                    outcomes: toStage("darius_envy")
                }
            ]
        },
        darius_envy: {
            displayText: "Chosen",
            tone: "gold",
            image: { col: 3, row: 1 },
            text: "\"He gave it to you.\" It is hardly a voice at all. \"Winter after winter I knelt. I said his name until it wore smooth in my mouth.\" \"And he did not come for me. He did not so much as look.\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_envy_4" } }] }]
                }
            ]
        },

        darius_envy_4: {
            displayText: "Chosen",
            tone: "gold",
            image: { col: 3, row: 1 },
            text: "\"He sent the star to a stranger in chains.\" Darius rises, unfolding slowly, far taller than he looked. The pale light in his hands is the same as the light in the stone. \"What did you do to be loved like that?\"",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_envy_6" } }] }]
                }
            ]
        },

        darius_envy_6: {
            displayText: "Chosen",
            tone: "gold",
            image: { col: 3, row: 1 },
            text: "\"What does a stranger have that I did not?\"",
            decisions: [
                {
                    text: "\"He did not send it to me.\"",
                    customActionText: "\"He did not send it to me, Darius,\" you say. \"No one did.\"",
                    outcomes: toStage("darius_wrath")
                },
                {
                    text: "Reach for your weapon.",
                    customActionText: "Your hand finds your weapon. He watches it, and does not seem to see it.",
                    outcomes: toStage("darius_wrath")
                }
            ]
        },
        darius_wrath: {
            displayText: "His Love",
            tone: "blood",
            effect: "shake",
            sfx: "cinematicBoom",
            ambience: "altarDrone",
            ambienceFade: 0.6,
            image: { col: 2, row: 1 },
            text: "\"Then give it back.\" The hum in the stone climbs into a cry, and the dark behind the altar leans toward him like a congregation.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "darius_wrath_2" } }] }]
                }
            ]
        },

        darius_wrath_2: {
            displayText: "His Love",
            tone: "blood",
            image: { col: 2, row: 1 },
            text: "\"Give it back. Give me his love.\" \"It was mine. It was always going to be mine.\" The weeping has become something else. The light in his hands is no longer gentle, and it is turned on you.",
            decisions: [
                {
                    text: "Face Darius the Groveler!",
                    customActionText: "You set your feet. There is nothing left to say to him.",
                    conditions: [HUMANOID],
                    // Winning plays the encounter that starts act 2 (story/encounters/story/actTwo.js) before the party is back on the map
                    outcomes: fight("darius_boss", true, { encounterId: "act_two" }, "bossBattleBgm")   // the boss track: assets/audio/music/bossbattle.mp3
                }
            ]
        },
    }
};
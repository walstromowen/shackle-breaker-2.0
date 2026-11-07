/* The Mysterious Altar (object MYSTERIOUS_ALTAR, interaction { type: 'ENCOUNTER', id: 'mysterious_altar' }).

   Art: assets/icons/encounters/story/mysterious_altar.png registered as `encounter_mysterious_altar`, a 4 x 4 grid of 128 px cells (see encounter_mysterious_altar_template.png):
     (0,0) approach       (1,0) at_the_altar   (2,0) bones_stir     (3,0) smoke_cloud
     (0,1) blue_glow      (1,1) green_glow     (2,1) red_glow       (3,1) darius_rises

   Flow:  approach     -> [VIG] walk up to the altar (a miss: the bones stir, or a cloud of smoke drains stamina and insight)
          at_the_altar -> [INT] examine the skull: blue glow (full restore) / green glow (loot) on a success, red glow (skeleton fight) on a failure
                          [Fallen Meteorite] set it on the altar: Darius the Groveler crawls out of the dark. Only offered while the party carries one.
                          darius_rises .. darius_wrath: five short stages of Darius speaking to you (the king who never came, the light he kept, the star you carry,
                          and envy), then the boss fight. No music while he talks, only the altar's drone kept low; his music starts when he turns and carries on into the fight.
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
                    // once Darius the Groveler is beaten (act 2), every altar hides the same thing: a stair down into the catacombs
                    text: "[The Groveler is dead] Search behind the altar.",
                    conditions: [{ type: "has_milestone", id: "act2" }, HUMANOID],
                    customActionText: "You put your shoulder to the altar. Stone grinds on stone, and it slides aside.",
                    outcomes: toStage("hidden_stair")
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

        hidden_stair: {
            displayText: "A Hidden Stair",
            tone: "cold",
            sfx: "whispers",
            sfxVolume: 0.5,
            image: { col: 1, row: 0 },
            text: "Under the altar, worn steps lead down into the dark. Cold air rises from below, and it smells of old bones.",
            decisions: [
                {
                    text: "Leave the way open.",
                    customActionText: "You leave the stair uncovered. Whatever lies below can wait for you.",
                    outcomes: [{ weight: 100, results: [{ type: "REPLACE_OBJECT", payload: { objectId: "CATACOMBS_STAIRS" } }, { type: "END_ENCOUNTER", payload: null }] }]
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
                                { type: "MODIFY_VITALS", payload: { stamina: -25, insight: -25, isPercentageOfCurrent: true, damageType: "true", party: "all" } },   // the smoke reaches the whole party
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
                                { type: "MODIFY_VITALS", payload: { hp: 9999, stamina: 9999, insight: 9999, damageType: "true", party: "all" } },   // the light fills the whole area
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
        // Darius the Groveler: he speaks to you, the way a boss speaks to the player in a dark fantasy game. He talks with his back to you, kneeling at the
        // altar, and only turns around on the last stage, right before the fight. No narration but that turn: every stage is his own words, and
        // the screen effects carry what he does. The player never answers ("Continue."). While he talks there is no music at all, only the altar's drone,
        // kept low; his track starts the moment he turns on you, and the fight plays the same track, so it carries on unbroken into the battle.
        darius_rises: {
            displayText: "A Voice in the Dark",
            tone: "arcane",
            effect: "glow_blue",
            sfx: "glowSwell",
            bgm: "none",
            ambience: "altarDrone",
            ambienceVolume: 0.35,
            ambienceFade: 1.5,
            image: { sheet: "encounter_darius_approach", col: 0, row: 0 },   // Darius bowed over the altar, as you find him
            text: "\"Footsteps... after so long. Is it you, my king? Have you come back for the light?\" \"No. No, you are not him. Forgive an old man his hope.\"",
            decisions: [{ text: "Continue.", outcomes: toStage("darius_speaks") }]
        },
        darius_speaks: {
            displayText: "Darius the Groveler",
            bgm: "none",
            image: { sheet: "encounter_darius_kneeling", col: 0, row: 0 },   // Darius kneeling at the altar
            text: "\"He told me, keep the light burning, Darius, and I shall return for it. So I kept it, every winter, every long dark.\" \"They call me the Groveler, for the kneeling. Let them. I knelt for a king.\"",
            decisions: [{ text: "Continue.", outcomes: toStage("darius_late") }]
        },
        darius_late: {
            displayText: "Darius the Groveler",
            bgm: "none",
            image: { sheet: "encounter_darius_kneeling", col: 0, row: 0 },   // Darius kneeling at the altar
            text: "\"You think he is not coming. I can hear it in your silence.\" \"He is only late, friend. Kings are never early.\"",
            decisions: [{ text: "Continue.", outcomes: toStage("darius_sees") }]
        },
        darius_sees: {
            displayText: "Darius the Groveler",
            effect: "jolt",
            sfx: "heartbeat",
            bgm: "none",
            image: { sheet: "encounter_darius_kneeling", col: 0, row: 0 },   // Darius kneeling at the altar
            text: "\"That light at my back... I can feel it. His sign, at last.\" \"But he gave it to you. A stranger in chains.\" \"What did you do to be loved like that?\"",
            decisions: [{ text: "Continue.", outcomes: toStage("darius_wrath") }]
        },
        darius_wrath: {
            displayText: "Darius the Groveler",
            tone: "blood",
            effect: "shake",
            sfx: "cinematicBoom",
            ambience: "none",
            ambienceFade: 0.6,
            bgm: "dariusEncounterBgm",   // his track: from the moment he turns, on into the fight
            image: { col: 2, row: 1 },
            text: "Darius turns around. \"Give it to me.\" \"Give it back! His love was mine. It was always meant to be mine!\"",
            decisions: [
                {
                    text: "Draw your weapon.",
                    customActionText: "You draw your weapon.",
                    conditions: [HUMANOID],
                    // Winning plays the encounter that starts act 2 (story/encounters/story/actTwo.js) before the party is back on the map
                    outcomes: fight("darius_boss", true, { encounterId: "act_two" }, "dariusEncounterBgm")
                }
            ]
        },
    }
};
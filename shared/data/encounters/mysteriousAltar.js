/* The Mysterious Altar (object MYSTERIOUS_ALTAR, interaction { type: 'ENCOUNTER', id: 'mysterious_altar' }).

   Art: assets/icons/encounters/mysterious_altar.png registered as `encounter_mysterious_altar`, a 4 x 4 grid of 128 px cells (see encounter_mysterious_altar_template.png):
     (0,0) approach       (1,0) at_the_altar   (2,0) bones_stir     (3,0) smoke_cloud
     (0,1) blue_glow      (1,1) green_glow     (2,1) red_glow       (3,1) darius_rises

   Flow:  approach     -> [VIG] walk up to the altar (a miss: the bones stir, or a cloud of smoke drains stamina and insight)
          at_the_altar -> [INT] examine the skull: blue glow (full restore) / green glow (loot) on a success, red glow (skeleton fight) on a failure
                          [Fallen Meteorite] set it on the altar: Darius the Groveler comes for it (boss fight). Only offered while the party carries one.
   Every find or ambush is announced on its own stage first and the effect is handed out on the button after it. A fight that starts from the
   approach leaves the altar standing (it can be tried again); anything that spends the skull or the meteorite destroys the altar. */

const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const fight = (tableId, spend) => [{
    weight: 100,
    results: [
        { type: "START_BATTLE", payload: { tableId } },
        ...(spend ? [{ type: "DESTROY_OBJECT" }] : [])
    ]
}];

export const mysteriousAltar = {
    id: "mysterious_altar",
    title: "Mysterious Altar",
    imageSheet: "encounter_mysterious_altar",
    initialStage: "approach",
    // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see encounters/prologue.js)
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

        darius_rises: {
            displayText: "Darius the Groveler",
            tone: "blood",
            effect: "shake",
            sfx: "cinematicBoom",
            ambience: "none",
            ambienceFade: 0.6,
            image: { col: 3, row: 1 },
            text: "The moment the meteorite touches the stone, the altar drinks its glow. The thoughts in your head turn loud and strange, the skull's eyes flare, and from the dark behind the altar a hunched figure in a tattered hood crawls into view, hands reaching for the light. Darius the Groveler has come for what was brought to the altar.",
            decisions: [
                {
                    text: "Face Darius the Groveler!",
                    conditions: [HUMANOID],
                    outcomes: fight("darius_boss", true)
                }
            ]
        }
    }
};
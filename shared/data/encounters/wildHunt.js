export const wildHunt = {
    id: "wild_hunt",
    title: "Wild Hunt",
    imageSheet: "encounter_wild_hunt",
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "The Woods",
            image: { col: 0, row: 0 },
            text: "{name} spots a lone deer grazing peacefully at the edge of the woods. It hasn't noticed them yet.",
            decisions: [
                {
                    text: "[DEX] Track the deer quietly.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 0,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_track1" }],
                    customActionText: "{name} crouches low, following the deer deeper into the trees...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deep_woods" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 60, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_track1" } }, { type: "ADVANCE_STAGE", payload: { stageId: "lost_trail" } }] },
                        { weight: 40, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_track1" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_stag" } }] }
                    ]
                },
                {
                    text: "[DEX] Shoot the deer immediately.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 2,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_shoot1" }],
                    customActionText: "{name} lines up a careful shot from a distance...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "successful_hunt" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_shoot1" } }, { type: "ADVANCE_STAGE", payload: { stageId: "missed_shot" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Ignore the deer and move on.",
                    customActionText: "{name} decides they have more pressing matters and leaves the game in peace.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },
        "deep_woods": {
            displayText: "The Deep Woods",
            image: { col: 0, row: 1 },
            text: "The canopy thickens, casting long shadows. {name} maintains pursuit, but the deer is behaving slightly erratically, pausing often to nervously check its surroundings.",
            decisions: [
                {
                    text: "[ATT] Keep tracking the nervous deer.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 2,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_track2" }],
                    customActionText: "{name} focuses on the faint sounds of hooves and snapped twigs to keep pace...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ominous_woods" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 60, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_track2" } }, { type: "ADVANCE_STAGE", payload: { stageId: "lost_trail" } }] },
                        { weight: 40, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_track2" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_stag" } }] }
                    ]
                },
                {
                    text: "[DEX] Take aim and shoot here.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 13,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_shoot2" }],
                    customActionText: "{name} decides not to push their luck and takes aim...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "successful_hunt" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_shoot2" } }, { type: "ADVANCE_STAGE", payload: { stageId: "missed_shot" } }] }
                    ]
                }
            ]
        },
        "ominous_woods": {
            displayText: "The Ominous Woods",
            image: { col: 0, row: 2 },
            text: "The environment abruptly shifts. The woods here are dead silent—no birds, no insects. The deer finally stops in a fog-choked clearing, completely motionless.",
            decisions: [
                {
                    text: "[DEX] Creep silently into the clearing.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 4,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_creep" }],
                    customActionText: "{name} slips into the edge of the clearing to get a better look at their quarry...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "the_anomaly" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 60, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_creep" } }, { type: "ADVANCE_STAGE", payload: { stageId: "lost_trail" } }] },
                        { weight: 40, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_creep" } }, { type: "ADVANCE_STAGE", payload: { stageId: "startled_stag" } }] }
                    ]
                },
                {
                    text: "[DEX] Ignore the dread and take the shot.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 14,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_shoot3" }],
                    customActionText: "{name} raises their weapon, ignoring the sudden chill in the air...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "successful_hunt" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_shoot3" } }, { type: "ADVANCE_STAGE", payload: { stageId: "missed_shot" } }] }
                    ]
                }
            ]
        },
        "the_anomaly": {
            displayText: "An Unnatural Stillness",
            image: { col: 0, row: 3 },
            text: "{name} successfully tracks the deer to the center of the clearing. However, something is deeply wrong. The deer is frozen in place, trembling violently. It isn't grazing; it's staring wide-eyed into the pitch-black tree line, paralyzed by fear.",
            decisions: [
                {
                    text: "[ATT] Hold perfectly still in the shadows.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 14,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_hide" }],
                    customActionText: "{name} holds their breath, sensing a malicious aura radiating from the darkness...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "boss_revealed" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_hide" } }, { type: "ADVANCE_STAGE", payload: { stageId: "boss_surprised" } }] }
                    ]
                },
                {
                    text: "[DEX] Shoot the deer and run.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "failed_wildhunt_shootrun" }],
                    customActionText: "{name} feels panic set in and fires desperately!",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "successful_hunt" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_wildhunt_shootrun" } }, { type: "ADVANCE_STAGE", payload: { stageId: "missed_shot" } }] }
                    ]
                }
            ]
        },
        "boss_revealed": {
            displayText: "The True Predator",
            image: { col: 2, row: 0 },
            bgm: "poachersNightmareBgm",
            text: "Because {name} stayed perfectly hidden, they bear witness to the horror. A hulking monstrosity drops from the canopy, crushing the deer into the earth with a sickening snap. The creature tosses the ruined carcass aside and begins to sniff the air. It then turns its gazing fizing right at {name}!",
            decisions: [
                {
                    text: "Charge the monstrosity!",
                    customActionText: "{name}'s party rush out to attack the monstrosity!",
                    outcomes: [
                        { weight: 100, results: [
                            { type: "START_BATTLE", payload: { enemies: ["POACHERS_NIGHTMARE"], bgm: "poachersNightmareBgm", background: "poachersNightmareBg" } }
                        ]}
                    ]
                }
            ]
        },
        "boss_surprised": {
            displayText: "The Trap is Sprung",
            image: { col: 2, row: 0 },
            text: "*CRACK.* {name} shifts their weight, snapping a buried root. The deer bolts in terror, but a horrifying monstrosity erupts from the brush, snatching the animal mid-leap and violently snapping its neck. The creature drops the carcass and locks its malevolent gaze onto {name} with a deafening roar!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    outcomes: [
                        { weight: 100, results: [
                            { type: "START_BATTLE", payload: { enemies: ["POACHERS_NIGHTMARE"], bgm: "poachersNightmareBgm", background: "poachersNightmareBg" } }
                        ]}
                    ]
                }
            ]
        },
        "successful_hunt": {
            displayText: "A Clean Kill",
            image: { col: 2, row: 3 },
            text: "A perfect shot. The deer falls instantly. {name} quickly gets to work, harvesting the creature for valuable leather before making their way back to safety.",
            decisions: [
                {
                    text: "Collect the valuable materials.",
                    outcomes: [
                        { weight: 100, results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "deer_drops", rolls: 1 } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]}
                    ]
                }
            ]
        },
        "missed_shot": {
            displayText: "A Wide Miss",
            image: { col: 1, row: 3 },
            text: "The shot goes wide, striking a nearby tree! The deer immediately bolts into the dense underbrush. In seconds, it is completely gone.",
            decisions: [
                {
                    text: "Curse your luck and move on.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        },
        "startled_stag": {
            displayText: "The Wrong Prey",
            image: { col: 2, row: 1 },
            bgm: "plainsBattleBgm",
            text: "*SNAP*. While blindly searching for the lost trail, {name} steps on a dry branch. Suddenly, an enormous beast erupts from the brush! It isn't the deer—it's a massive Grim Stag, and it lowers its antlers to charge the trespasser!",
            decisions: [
                {
                    text: "Brace for the sudden fight!",
                    outcomes: [
                        { weight: 100, results: [
                            { type: "START_BATTLE", payload: { enemies: ["GRIM_STAG"] } }
                        ]}
                    ]
                }
            ]
        },
        "lost_trail": {
            displayText: "Trail Goes Cold",
            image: { col: 1, row: 3 },
            text: "{name} searches the ground intently, but the tracks eventually vanish near a rocky outcrop. The hunt is over.",
            decisions: [
                {
                    text: "Return to the path.",
                    outcomes: [
                        { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
                    ]
                }
            ]
        }
    }
};
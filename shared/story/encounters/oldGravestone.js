/* The Old Gravestone (object OLD_GRAVESTONE, interaction { type: 'ENCOUNTER', id: 'old_gravestone' }).

   OLD_GRAVESTONE is the rare twin of TOMBSTONE: the two share one sprite (mapObjectDefinitions.js), so the player can not tell them apart by looking.
   The plain tombstone is scenery; this one can be dug up.

   Art: assets/icons/encounters/old_gravestone.png registered as `encounter_old_gravestone`, a 4 x 4 grid of 128 px cells (the cells are placeholder sketches to be painted over):
     (0,0) approach       (1,0) dig            (2,0) buried_things   (3,0) bones_rise
     (0,1) spirit_rises

   Flow:  approach      -> dig it up, or leave it be
          dig           -> keep digging: what lies below is one roll
                             40%  buried_things (loot: two rolls of the old_grave_loot table, a little experience)
                                                 -> or dig deeper still: 45% a second bundle (four rolls in all), 35% only clay (the first bundle's two rolls), 20% a spirit
                             20%  bones_rise    (a fight with skeletons, spawn table grave_skeletons)
                             20%  spirit_rises  (a fight with a shackled spirit, spawn table shackled_spirit)
                             10%  empty_grave   (only soil and coffin splinters, a crumb of experience)
                             10%  sealed_coffin ([STR 10] pry the lid: success three rolls of loot; failure 60% skeletons, 40% a spirit)
   Whatever comes out of the ground, the grave is open: the object is destroyed on the button that hands out the loot or starts the fight. Leaving it be
   (or backing out before the first spade) keeps the stone standing for another try. */

const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const fight = (tableId) => [{
    weight: 100,
    results: [
        { type: "START_BATTLE", payload: { tableId } },
        { type: "DESTROY_OBJECT" }
    ]
}];

export const oldGravestone = {
    id: "old_gravestone",
    title: "Old Gravestone",
    imageSheet: "encounter_old_gravestone",
    initialStage: "approach",
    stages: {
        approach: {
            displayText: "An Old Gravestone",
            image: { col: 0, row: 0 },
            text: "A gravestone leans in the long grass, its name worn smooth by the weather. Few graves are tended any more.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "approach_2" } }] }]
                }
            ]
        },

        approach_2: {
            displayText: "An Old Gravestone",
            image: { col: 0, row: 0 },
            text: "The earth in front of it has sunk, as though something beneath had settled, or shifted.",
            decisions: [
                {
                    text: "Dig it up.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    conditions: [HUMANOID],
                    customActionText: "You kneel at the foot of the stone and push your hands into the cold earth.",
                    outcomes: toStage("dig")
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the dead in peace.",
                    customActionText: "You rest a hand on the cold stone for a moment, then walk on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        dig: {
            displayText: "The Soil Gives",
            image: { col: 1, row: 0 },
            text: "The soil is loose, as if it has been turned before. Something shifts beneath your hands, and the air around the stone grows quiet.",
            decisions: [
                {
                    text: "Keep digging.",
                    conditions: [HUMANOID],
                    customActionText: "You dig deeper, until the earth gives way.",
                    outcomes: [
                        { weight: 40, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "buried_things" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_rise" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] },
                        { weight: 10, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "empty_grave" } }] },
                        { weight: 10, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "sealed_coffin" } }] }
                    ]
                },
                {
                    text: "Stop. Fill it in.",
                    corruption: -1,   // a kind act: corruption goes down
                    customActionText: "You press the earth back down with your palms and step away from the stone.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        buried_things: {
            displayText: "Buried With The Dead",
            image: { col: 2, row: 0 },
            text: "Beneath the stone lies a bundle wrapped in rotted oilcloth, left with the dead for reasons no one remembers. Whatever bound it here has loosened its grip.",
            decisions: [
                {
                    text: "Take what was buried.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 2 } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Dig deeper still.",
                    corruption: 1,
                    conditions: [HUMANOID],
                    customActionText: "You leave the bundle where it lies and dig on, down into the clay.",
                    outcomes: [
                        { weight: 45, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deeper_find" } }] },
                        { weight: 35, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deeper_nothing" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] }
                    ]
                }
            ]
        },

        deeper_find: {
            displayText: "A Second Bundle",
            image: { col: 2, row: 0 },
            text: "Under the first bundle lies another, wrapped in older cloth and left by a deeper hand.",
            decisions: [
                {
                    text: "Take both bundles.",
                    corruption: 2,
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 4 } },
                            { type: "AWARD_XP", payload: { amount: 8, target: "active_character" } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        deeper_nothing: {
            displayText: "Only Clay",
            image: { col: 1, row: 0 },
            text: "There is nothing below but wet clay and pale roots. You take the bundle you found first.",
            decisions: [
                {
                    text: "Take what was buried.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 2 } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        empty_grave: {
            displayText: "Empty Earth",
            image: { col: 1, row: 0 },
            text: "There is only dark soil and a few splinters of coffin wood. Whatever lay here is long gone.",
            decisions: [
                {
                    text: "Fill it in and move on.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "AWARD_XP", payload: { amount: 2, target: "active_character" } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        sealed_coffin: {
            displayText: "A Sealed Coffin",
            image: { col: 1, row: 0 },
            text: "Your hands strike wood: a coffin lid, nailed shut. It creaks as you press on it.",
            decisions: [
                {
                    text: "[STR] Pry the lid open.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 10,
                    conditions: [HUMANOID],
                    customActionText: "You work your fingers under the lid and heave.",
                    successOutcomes: toStage("coffin_opened"),
                    failureOutcomes: [
                        { weight: 60, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_rise" } }] },
                        { weight: 40, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] }
                    ]
                },
                {
                    text: "Leave it sealed.",
                    customActionText: "You push the earth back over the lid and step away from the stone.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        coffin_opened: {
            displayText: "The Lid Gives",
            image: { col: 2, row: 0 },
            text: "The nails shriek and the lid comes away. The dead were buried with more than their shrouds.",
            decisions: [
                {
                    text: "Take what lies inside.",
                    corruption: 2,
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 3 } },
                            { type: "AWARD_XP", payload: { amount: 7, target: "active_character" } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        bones_rise: {
            displayText: "The Dead Rise",
            tone: "blood",
            effect: "shake",
            sfx: "bonesRattle",
            bgm: "plainsBattleBgm",   // danger: the biome's battle music starts as the dead rise and carries into the fight
            image: { col: 3, row: 0 },
            text: "The soil heaves. Fingers of bone claw out of the grave, and what was buried here pulls itself free, and it is not alone.",
            decisions: [
                {
                    text: "Draw your weapons!",
                    conditions: [HUMANOID],
                    outcomes: fight("grave_skeletons")
                }
            ]
        },

        spirit_rises: {
            displayText: "A Cold Breath",
            tone: "cold",
            sfx: "whispers",
            bgm: "plainsBattleBgm",
            image: { col: 0, row: 1 },
            text: "A cold breath rolls out of the hole, and something pale rises with it, still dragging the broken chains it died in. It turns toward you, and it has noticed you.",
            decisions: [
                {
                    text: "Stand your ground!",
                    conditions: [HUMANOID],
                    outcomes: fight("shackled_spirit")
                }
            ]
        }
    }
};

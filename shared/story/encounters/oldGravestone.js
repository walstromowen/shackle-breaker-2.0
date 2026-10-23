/* The Old Gravestone (object OLD_GRAVESTONE, interaction { type: 'ENCOUNTER', id: 'old_gravestone' }).

   OLD_GRAVESTONE is the rare twin of TOMBSTONE: the two share one sprite (mapObjectDefinitions.js), so the player can not tell them apart by looking.
   The plain tombstone is scenery; this one can be dug up.

   Art: assets/icons/encounters/old_gravestone.png registered as `encounter_old_gravestone`, a 4 x 4 grid of 128 px cells (the cells are placeholder sketches to be painted over):
     (0,0) approach       (1,0) dig            (2,0) buried_things   (3,0) bones_rise
     (0,1) spirit_rises

   Flow:  approach      -> dig it up, or leave it be
          dig           -> keep digging: what lies below is one roll
                             50%  buried_things (loot: two rolls of the old_grave_loot table, a little experience)
                             25%  bones_rise    (a fight with skeletons, spawn table grave_skeletons)
                             25%  spirit_rises  (a fight with a shackled spirit, spawn table shackled_spirit)
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
            text: "A gravestone leans in the long grass, its name worn smooth by the weather. Few graves are tended any more. The earth in front of it has sunk, as though something beneath had settled, or shifted.",
            decisions: [
                {
                    text: "Dig it up.",
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
                        { weight: 50, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "buried_things" } }] },
                        { weight: 25, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_rise" } }] },
                        { weight: 25, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] }
                    ]
                },
                {
                    text: "Stop. Fill it in.",
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
                }
            ]
        },

        bones_rise: {
            displayText: "The Dead Rise",
            tone: "blood",
            effect: "shake",
            sfx: "bonesRattle",
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

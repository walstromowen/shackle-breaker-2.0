/* The Old Gravestone (object OLD_GRAVESTONE, interaction { type: 'ENCOUNTER', id: 'old_gravestone' }).

   OLD_GRAVESTONE is the rare twin of TOMBSTONE: the two share one sprite (mapObjectDefinitions.js), so the player can not tell them apart by looking.
   The plain tombstone is scenery; this one can be dug up.

   Art: assets/icons/encounters/old_gravestone.png registered as `encounter_old_gravestone`, a 4 x 4 grid of 128 px cells (the cells are placeholder sketches to be painted over):
     (0,0) approach       (1,0) dig            (2,0) buried_things   (3,0) bones_rise
     (0,1) spirit_rises

   Nothing in the ground is certain, and nothing comes out of it without a roll (every roll is d20 + (attribute - 10) / 3, like every skill check).
   Only leaving is free.
   Flow:  approach      -> [STR 12] dig it up: a success mostly finds the grave goods before anything wakes, but the grave can be empty, and
                           what sleeps in it can still stir (DIG_SUCCESS); a failure makes noise and mostly wakes the dead (DIG_FAILURE).
                           [ATT 13] feel for what lies beneath and dig only where it is quiet: a success never wakes the dead, though it can still
                           find nothing (CAREFUL_DIG); a failure fills your head with noise (a quarter of your insight) and you learn nothing, or
                           the thing below notices you first (the spirit).
                           Or leave the dead in peace.
          buried_things -> take the bundle (two rolls of old_grave_loot)
          sealed_coffin -> [STR 11] pry the lid: success three rolls of loot; failure 60% skeletons, 40% a spirit. Or leave it sealed.
          bones_rise    -> fight the skeletons (spawn table grave_skeletons), or [DEX 13] scramble out: a success escapes with nothing,
                           a failure and they drag you back into the fight
          spirit_rises  -> [ATT 14] speak to it: a success lets it rest (one roll of the grave goods, less corruption); a failure, the fight.
                           Or fight it at once.
   Whatever comes out of the ground, the grave is open: the object is destroyed on the button that hands out the loot or starts the fight. Leaving it be,
   leaving the coffin sealed, or a careful dig that only filled your head with noise keeps the stone standing for another try. */
import { toStage } from './stageKit.js';

const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const fight = (tableId) => [{
    weight: 100,
    results: [
        { type: "START_BATTLE", payload: { tableId } },
        { type: "DESTROY_OBJECT" }
    ]
}];

/* What lies under the stone. A dig that succeeds finds the goods before it wakes anything (mostly); one that fails makes noise. A careful dig
   (attunement) never wakes the dead, but the grave can still be empty. */
export const DIG_SUCCESS = { buried_things: 50, sealed_coffin: 20, empty_grave: 15, bones_rise: 10, spirit_rises: 5 };
export const DIG_FAILURE = { buried_things: 10, empty_grave: 20, bones_rise: 40, spirit_rises: 30 };
export const CAREFUL_DIG = { buried_things: 55, sealed_coffin: 25, empty_grave: 20 };
const digOutcomes = (table) => Object.entries(table).map(([stageId, weight]) => ({ weight, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }));
const END_IT = [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }];

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
                    text: "[STR] Dig it up.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    corruption: 2,   // a grave robbed: corruption goes up
                    conditions: [HUMANOID],
                    successOutcomes: digOutcomes(DIG_SUCCESS),
                    failureOutcomes: digOutcomes(DIG_FAILURE)
                },
                {
                    text: "[ATT] Feel for what lies beneath, and dig only where it is quiet.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 13,
                    corruption: 2,
                    conditions: [HUMANOID],
                    successOutcomes: digOutcomes(CAREFUL_DIG),
                    failureOutcomes: [
                        { weight: 50, results: [{ type: "MODIFY_VITALS", payload: { insight: -25, isPercentageOfCurrent: true, damageType: "true" } }, { type: "ADVANCE_STAGE", payload: { stageId: "listen_failed" } }] },
                        { weight: 50, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the dead in peace.",
                    customActionText: "You rest a hand on the cold stone for a moment, then walk on.",
                    outcomes: END_IT
                }
            ]
        },

        listen_failed: {
            displayText: "Only Noise",
            image: { col: 0, row: 0 },
            text: "A rushing fills your head like surf, and the quiet will not come. You learn nothing, and the effort leaves you drained. The grave keeps its secret, for now.",
            decisions: [
                {
                    text: "Walk on.",
                    customActionText: "You rub your temples, give the stone a last look, and walk on.",
                    outcomes: END_IT
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
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
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
                    threshold: 11,
                    conditions: [HUMANOID],
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
                },
                {
                    text: "[DEX] Scramble out of the grave.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 13,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("escaped_the_grave"),
                    failureOutcomes: toStage("dragged_back")
                }
            ]
        },

        escaped_the_grave: {
            displayText: "Out Of The Hole",
            image: { col: 3, row: 0 },
            text: "You roll out onto the grass and run. Behind you the bones rattle at the lip of the grave, then sink back into the dark, and whatever was buried with them goes down too.",
            decisions: [
                {
                    text: "Keep running.",
                    outcomes: [{ weight: 100, results: [{ type: "DESTROY_OBJECT" }, { type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        dragged_back: {
            displayText: "The Dead Rise",
            tone: "blood",
            effect: "shake",
            sfx: "bonesRattle",
            bgm: "plainsBattleBgm",
            image: { col: 3, row: 0 },
            text: "A hand of bone closes on your ankle and drags you back down into the grave. There is no way out but through them.",
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
                    text: "[ATT] Speak to the spirit.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 14,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("spirit_at_rest"),
                    failureOutcomes: toStage("spirit_unmoved")
                },
                {
                    text: "Stand your ground!",
                    conditions: [HUMANOID],
                    outcomes: fight("shackled_spirit")
                }
            ]
        },

        spirit_at_rest: {
            displayText: "Laid To Rest",
            tone: "cold",
            image: { col: 0, row: 1 },
            text: "The chains stop dragging, and the pale shape bows its head and lets go of whatever it was holding. Then it is gone.",
            decisions: [
                {
                    text: "Take the grave goods and fill it in.",
                    corruption: -1,   // a kind act: corruption goes down
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 1 } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        spirit_unmoved: {
            displayText: "A Cold Breath",
            tone: "cold",
            sfx: "whispers",
            bgm: "plainsBattleBgm",
            image: { col: 0, row: 1 },
            text: "It does not hear you, or it hears and does not care. The chains lift, and the cold comes at you.",
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

/* The Crimson Vigil: an act 2 encounter (the biomes list it with `minAct: 2`, at dusk and night only, see world/biomeDefinitions.js).
 * Candles nobody lit burn red along the road, around a ring of bones whose skulls all face the blood moon. It has no map object, so it is found by
 * walking, like the other roaming encounters. Written like the prologue: short, plain sentences in the second person. Fields: see story/encounters/prologue.js.
 *
 * Flow:  discovery -> [INT] read the ring            -> read_success (loot, XP)  / the dead rise (a fight)
 *                  -> [VIG] snuff a candle            -> snuff_success (loot, XP) / the dead rise (a fight)
 *                  -> leave the ring
 * A failed attempt wakes the dead, and the ring can only be tried once.
 */
const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const wakeTheDead = [{
    weight: 1,
    results: [
        { type: "SET_CONTEXT_FLAG", payload: { flagId: "vigil_tried" } },
        { type: "ADVANCE_STAGE", payload: { stageId: "risen" } }
    ]
}];
const reward = (xp, rolls, stageId) => [{
    weight: 1,
    results: [
        { type: "AWARD_XP", payload: { amount: xp, target: "entire_party" } },
        { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls } },
        { type: "ADVANCE_STAGE", payload: { stageId } }
    ]
}];

export const crimsonVigil = {
    id: "crimson_vigil",
    title: "The Crimson Vigil",
    tone: "blood",
    ambience: "altarDrone",
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Red Vigil",
            sfx: "whispers",
            text: "Red candles burn along the road, though nobody lit them. Bones lie in a ring between the flames, and every skull faces the moon.",
            decisions: [
                {
                    text: "[INT] Read the ring.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 13,
                    conditions: [{ type: "context_flag_not_set", flagId: "vigil_tried" }, HUMANOID],
                    customActionText: "You crouch beside the ring and follow the pattern of the bones...",
                    successOutcomes: toStage("read_success"),
                    failureOutcomes: wakeTheDead
                },
                {
                    text: "[VIG] Snuff a candle.",
                    type: "skill_check",
                    attribute: "vigor",
                    threshold: 12,
                    conditions: [{ type: "context_flag_not_set", flagId: "vigil_tried" }, HUMANOID],
                    customActionText: "You close your hand around a red flame...",
                    successOutcomes: toStage("snuff_success"),
                    failureOutcomes: wakeTheDead
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the ring.",
                    customActionText: "You keep to the middle of the road and do not look back at the candles.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        read_success: {
            displayText: "The Meaning of Bones",
            sfx: "glowSwell",
            effect: "glow_red",
            text: "The bones are a count: one for every night the moon has been red. The ring ends with an empty place, and a small offering left in it.",
            decisions: [
                {
                    text: "Take the offering.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    outcomes: reward(25, 2, "quiet")
                }
            ]
        },

        snuff_success: {
            displayText: "A Candle Out",
            sfx: "bonesRattle",
            text: "The flame dies against your palm. The nearest skull blinks once, then is only bone. Beneath the candle, something was buried for the dead.",
            decisions: [
                {
                    text: "Dig it up.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    outcomes: reward(15, 3, "quiet")
                }
            ]
        },

        risen: {
            displayText: "The Dead Stand",
            effect: "shake",
            sfx: "bonesRattle",
            text: "Every candle flares at once. The skulls turn from the moon to you, and the bones in the ring climb to their feet.",
            decisions: [
                {
                    text: "Ready your weapons!",
                    conditions: [HUMANOID],
                    outcomes: [{ weight: 1, results: [{ type: "START_BATTLE", payload: { tableId: "risen_pack" } }] }]
                }
            ]
        },

        quiet: {
            displayText: "The Candles Gutter",
            text: "The red flames shrink and go out, one by one. The road is dark again, and the moon is still watching.",
            decisions: [
                {
                    text: "Move on.",
                    outcomes: [{ weight: 1, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        }
    }
};

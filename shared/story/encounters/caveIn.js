/* Cave In: a random encounter inside caves (CAVE_INTERIOR lists it in its encounter pool, see world/biomeDefinitions.js). Rebuilt from the old stage-class version.

   A pile of rubble blocks the way and the only thing to do is dig. One Strength check against 12 decides how it goes:
     success -> one time in three you find something in the rubble (one roll of the biome's loot table, 5 XP); otherwise the party simply digs through (5 XP)
                 (weights 1 : 2)
     failure -> weights 1 : 2 : 1
                 exhausted:   the party digs for hours and clears a path, but loses a quarter of its stamina and insight
                 rocks_fall:  rocks drop on the digger (a quarter of their max HP) and the dig can be tried again
                 spider_nest: the dig breaks into a nest; the spiders (the `spider_nest` table, three to five on Normal) attack, and when the fight is won the rubble
                              is still there (afterVictory plays this encounter again)
   Every find or ambush is announced on its own stage first and the effect is handed out on the button after it.

   Art: assets/icons/encounters/cave_in.png registered as `encounter_cave_in`, a 4 x 4 grid of 128 px cells (placeholder sketches to be painted over):
     (0,0) the rubble       (1,0) found something  (2,0) path cleared     (3,0) exhausted
     (0,1) rocks fall       (1,1) spider nest
*/
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const weighted = (...entries) => entries.map(([weight, stageId]) => ({ weight, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }));

export const caveIn = {
    id: "cave_in",
    title: "Cave In",
    imageSheet: "encounter_cave_in",
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "Cave In",
            image: { col: 0, row: 0 },
            text: "{name}'s party encounters a pile of rubble blocking the path.",
            decisions: [
                {
                    text: "[STR] Dig through the rubble.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    customActionText: "{name} attempts to dig a path through the rubble.",
                    successOutcomes: weighted([1, "found_something"], [2, "path_cleared"]),
                    failureOutcomes: weighted([1, "exhausted"], [2, "rocks_fall"], [1, "spider_nest"])
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                }
            ]
        },

        found_something: {
            displayText: "Something in the Rubble",
            tone: "gold",
            image: { col: 1, row: 0 },
            text: "While digging, {name} finds something in the rubble.",
            decisions: [
                {
                    text: "Take it and move on.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 1 } },
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        path_cleared: {
            displayText: "A Clear Path",
            image: { col: 2, row: 0 },
            text: "{name}'s party digs through the rubble!",
            decisions: [
                {
                    text: "Move on.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        exhausted: {
            displayText: "Hours of Digging",
            image: { col: 3, row: 0 },
            text: "{name}'s party digs through the rubble for what feels like hours. Eventually the exhausted party clears a path through.",
            decisions: [
                {
                    text: "Press on.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            // A quarter of what each of them has left, not of their maximum (the old version kept three quarters of current stamina and insight)
                            { type: "MODIFY_VITALS", payload: { hp: 0, stamina: -25, insight: -25, isPercentageOfCurrent: true, target: "entire_party" } },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        rocks_fall: {
            displayText: "Falling Rocks",
            effect: "jolt",
            sfx: "rockThud",
            image: { col: 0, row: 1 },
            text: "As {name} works to clear the path, heavy rocks fall on {name}!",
            decisions: [
                {
                    text: "Shake it off and keep digging.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "MODIFY_VITALS", payload: { hp: -25, stamina: 0, insight: 0, isPercentageOfMax: true, bypassDefense: true } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }
                        ]
                    }]
                }
            ]
        },

        spider_nest: {
            displayText: "A Spider's Nest",
            tone: "blood",
            effect: "jolt",
            sfx: "caveSpiderCry",
            image: { col: 1, row: 1 },
            bgm: "caveBattleBgm",
            text: "While digging, {name} breaks into a spider's nest!",
            decisions: [
                {
                    text: "Defend yourselves!",
                    outcomes: [{
                        weight: 100,
                        results: [
                            // The rubble is still there once the spiders are dead: the same encounter plays again
                            { type: "START_BATTLE", payload: { tableId: "spider_nest", afterVictory: { encounterId: "cave_in" } } }
                        ]
                    }]
                }
            ]
        }
    }
};

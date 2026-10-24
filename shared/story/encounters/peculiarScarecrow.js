/* The Peculiar Scarecrow (map object PECULIAR_SCARECROW, interaction { type: 'ENCOUNTER', id: 'peculiar_scarecrow', triggerRadius: 5 }).
   It used to be the long "Midnight Harvest" draft; it is now one short roll.

   The object is two tiles tall and only stands in abandoned villages, on the verge north of an east-west road, looking south. Stepping onto any of the 5 tiles
   straight beneath its base (its line of sight) starts this encounter (see OverworldController.checkEncounterZones), once per visit: it fires when you step into
   the line and again only after you have left it.

   Art: assets/icons/encounters/peculiar_scarecrow.png registered as `encounter_peculiar_scarecrow`, a 4 x 4 grid of 128 px cells (see encounter_peculiar_scarecrow_template.png):
     (0,0) the scarecrow         (1,0) the scarecrow stirs (its eyes blaze)

   Flow:  discovery -> [DEX 12] walk past it
                         success -> pass_by: you walk on, nothing happens
                         failure -> it_stirs: one to three Hollow Harvesters (the `scarecrow_harvesters` table) climb off the post and attack
   Walking past leaves the scarecrow where it stands (it fires again when you leave its line of sight and come back). Once it has stirred and started a fight,
   it is gone: the stage that starts the battle removes the object (DESTROY_OBJECT) first, so it is not standing there when you win. */
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];

export const peculiarScarecrow = {
    id: "peculiar_scarecrow",
    title: "Peculiar Scarecrow",
    imageSheet: "encounter_peculiar_scarecrow",
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Peculiar Scarecrow",
            image: { col: 0, row: 0 },
            text: "A scarecrow stands on a post beside the path, its hat pulled low over a sackcloth face. No crows perch on it.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery_2" } }] }]
                }
            ]
        },

        discovery_2: {
            displayText: "A Peculiar Scarecrow",
            image: { col: 0, row: 0 },
            text: "The crows keep well away from it, and its coat stirs now and then, though you feel no wind. The only way on leads right past it.",
            decisions: [
                {
                    text: "[DEX] Walk past the scarecrow.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    customActionText: "You keep your eyes ahead and walk past the post, quietly, for no reason you could name...",
                    successOutcomes: toStage("pass_by"),
                    failureOutcomes: toStage("it_stirs")
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                }
            ]
        },

        pass_by: {
            displayText: "Past the Scarecrow",
            image: { col: 0, row: 0 },
            text: "You pass the scarecrow without a sound. It is only a scarecrow, after all.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "pass_by_2" } }] }]
                }
            ]
        },

        pass_by_2: {
            displayText: "Past the Scarecrow",
            image: { col: 0, row: 0 },
            text: "Some way on, you hear straw rustle behind you. You do not look back.",
            decisions: [
                {
                    text: "Walk on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        it_stirs: {
            displayText: "It Stirs",
            tone: "blood",
            effect: "jolt",
            sfx: "hollowHarvesterCry",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "A dry branch snaps under your foot. The scarecrow's head turns, slowly, and two red eyes open in the sackcloth.",
            decisions: [
                {
                    text: "Continue.",
                    outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "it_stirs_2" } }] }]
                }
            ]
        },

        it_stirs_2: {
            displayText: "It Stirs",
            tone: "blood",
            image: { col: 1, row: 0 },
            bgm: "plainsBattleBgm",
            text: "It steps down off the post, and straw-stuffed things climb out of the grass beside it.",
            decisions: [
                {
                    text: "Ready your weapons!",
                    outcomes: [{ weight: 100, results: [{ type: "DESTROY_OBJECT" }, { type: "START_BATTLE", payload: { tableId: "scarecrow_harvesters" } }] }]
                }
            ]
        }
    }
};

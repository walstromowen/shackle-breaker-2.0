/* The catacombs' traps (map objects TRAP_ARROW, TRAP_PIT, TRAP_AXES, placed in the halls by the CatacombGenerator). All three look the same: a raised stone
   pressure plate with a few slight cracks, so which one it is is only found out by stepping on it. Each is a walk-in encounter: stepping onto it springs it. One Vigor saving throw decides how it goes; on a failure the one who rolled takes damage (a share of their max HP, of a real
   damage type, so armour takes the edge off it). Either way the trap is spent afterwards (REPLACE_OBJECT with its sprung look) and never fires again.
   A trap springs on whoever stepped on it: there is no time to send someone else (no "Switch party member").

     arrow_trap      [VIG 12]  a pressure plate; arrows from the walls          fail: 40% of max HP, pierce
     pit_trap        [VIG 13]  the floor drops into a pit of stakes            fail: 50% of max HP, pierce, and half an hour to climb out
     swinging_axes   [VIG 14]  blades swing down from the ceiling              fail: 60% of max HP, slash

   Art: assets/icons/encounters/catacomb_traps.png registered as `encounter_catacomb_traps`, a 4 x 4 grid of 128 px cells:
     (0,0) (1,0) (2,0) the arrow trap: the stone wall with its arrow slits loosing arrows (the same picture for the click, the dodge and the hit)
     (3,0) (0,1) (1,1) the pit trap: the open pit in the floor, its stakes at the bottom (the same picture for the drop, the catch and the fall)
     (2,1) the blades drop  (3,1) dashed through
     (0,2) the blade strikes */

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const spend = (objectId, extra = []) => [{ weight: 100, results: [...extra, { type: "REPLACE_OBJECT", payload: { objectId } }, { type: "END_ENCOUNTER", payload: null }] }];

export const arrowTrap = {
    id: "arrow_trap",
    title: "Arrow Trap",
    imageSheet: "encounter_catacomb_traps",
    initialStage: "click",
    tone: "cold",
    stages: {
        click: {
            displayText: "A Pressure Plate",
            image: { col: 0, row: 0 },
            sfx: "rockThud",
            text: "A stone plate sinks under your foot with a dry click. Dark holes stare out of the walls on either side.",
            decisions: [
                {
                    text: "[VIG] Throw yourself flat!",
                    type: "skill_check",
                    attribute: "vigor",
                    threshold: 12,
                    successOutcomes: toStage("dodged"),
                    failureOutcomes: toStage("struck")
                }
            ]
        },
        dodged: {
            displayText: "Arrows Overhead",
            image: { col: 1, row: 0 },
            text: "A volley of arrows hisses over your back and shatters against the far wall.",
            decisions: [{ text: "Get up and move on.", outcomes: spend("TRAP_ARROW_SPRUNG") }]
        },
        struck: {
            displayText: "Struck",
            tone: "blood",
            effect: "jolt",
            image: { col: 2, row: 0 },
            text: "The arrows are faster. You are hit before you can drop.",
            decisions: [{
                text: "Pull the arrows out and press on.",
                outcomes: spend("TRAP_ARROW_SPRUNG", [{ type: "MODIFY_VITALS", payload: { hp: -40, isPercentageOfMax: true, damageType: "pierce" } }])
            }]
        }
    }
};

export const pitTrap = {
    id: "pit_trap",
    title: "Pit Trap",
    imageSheet: "encounter_catacomb_traps",
    initialStage: "give_way",
    tone: "cold",
    stages: {
        give_way: {
            displayText: "The Floor Gives Way",
            image: { col: 3, row: 0 },
            effect: "shake",
            sfx: "rockThud",
            text: "A stone plate sinks under your foot, and the floor around it tilts and drops away. Below, sharpened stakes wait in the dark.",
            decisions: [
                {
                    text: "[VIG] Catch the edge!",
                    type: "skill_check",
                    attribute: "vigor",
                    threshold: 13,
                    successOutcomes: toStage("caught"),
                    failureOutcomes: toStage("fell")
                }
            ]
        },
        caught: {
            displayText: "Hanging On",
            image: { col: 0, row: 1 },
            text: "Your fingers find the lip of the pit. You haul yourself up as the last loose stones rattle down onto the stakes.",
            decisions: [{ text: "Climb out and step around it.", outcomes: spend("TRAP_PIT_SPRUNG") }]
        },
        fell: {
            displayText: "Onto the Stakes",
            tone: "blood",
            effect: "jolt",
            image: { col: 1, row: 1 },
            text: "You drop onto the stakes. Climbing back out of the pit takes a long, painful while.",
            decisions: [{
                text: "Drag yourself out.",
                outcomes: spend("TRAP_PIT_SPRUNG", [
                    { type: "MODIFY_VITALS", payload: { hp: -50, isPercentageOfMax: true, damageType: "pierce" } },
                    { type: "ADVANCE_TIME", payload: { minutes: 30 } }
                ])
            }]
        }
    }
};

export const swingingAxes = {
    id: "swinging_axes",
    title: "Swinging Axes",
    imageSheet: "encounter_catacomb_traps",
    initialStage: "blades",
    tone: "cold",
    stages: {
        blades: {
            displayText: "Swinging Blades",
            image: { col: 2, row: 1 },
            effect: "shake",
            text: "A stone plate sinks under your foot. Chains grind overhead, and great blades drop from slots in the ceiling to swing across the hall, one after another.",
            decisions: [
                {
                    text: "[VIG] Dash between the blades!",
                    type: "skill_check",
                    attribute: "vigor",
                    threshold: 14,
                    successOutcomes: toStage("through"),
                    failureOutcomes: toStage("cut")
                }
            ]
        },
        through: {
            displayText: "Through",
            image: { col: 3, row: 1 },
            text: "You slip between the blades, close enough to feel the wind of them. Behind you one bites deep into the floor and jams the rest.",
            decisions: [{ text: "Move on.", outcomes: spend("TRAP_AXES_SPRUNG") }]
        },
        cut: {
            displayText: "Cut",
            tone: "blood",
            effect: "jolt",
            image: { col: 0, row: 2 },
            text: "A blade catches you across the side and throws you to the floor. It bites into the stone and jams the rest.",
            decisions: [{
                text: "Get up, holding the wound.",
                outcomes: spend("TRAP_AXES_SPRUNG", [{ type: "MODIFY_VITALS", payload: { hp: -60, isPercentageOfMax: true, damageType: "slash" } }])
            }]
        }
    }
};

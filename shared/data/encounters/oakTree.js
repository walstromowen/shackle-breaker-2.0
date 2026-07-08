export const oakTree = {
  id: "oak_tree",
  title: "A Sturdy Oak",
  initialStage: "approach",
  stages: {
    "approach": {
      image: { sheet: "encounters", col: 0, row: 0 },
      bgm: "plainsOverworldNight",
      text: "An oak tree towers over {name}. Its thick trunk looks like it has stood here for many years.",
      decisions: [
        {
          text: "[STR] Chop down the tree for wood.",
          type: "skill_check",
          attribute: "strength",
          threshold: 8,
          customActionText: "{name} grips their weapon tightly and takes a massive swing at the sturdy trunk...",
          successOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_success" } }] }
          ],
          failureOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chopped_fail" } }] }
          ]
        },
        {
          text: "Leave.",
          customActionText: "{name} decides it's not worth the effort and walks away.",
          outcomes: [
            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
          ]
        },
        {
          text: "Switch character.",
          type: "switch_character",
          conditions: [ { type: "has_other_party_members" } ]
        }
      ]
    },
    "chopped_success": {
      image: { sheet: "encounters", col: 1, row: 0 },
      bgm: "plainsOverworldNight",
      text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\nWith a flawless strike, the ancient tree groans and crashes to the earth. {name} spots a small coin pouch tangled in its roots!",
      decisions: [
        {
          text: "Collect the wood and the pouch.",
          customActionText: "{name} gathers up the heavy wood and pockets the loose coins.",
          outcomes: [
            { weight: 100, results: [
              { type: "GIVE_ITEM", payload: { itemId: "soft_wood", qty: 3 } },
              { type: "AWARD_XP", payload: { amount: 25, target: "active_character" } },
              { type: "MODIFY_CURRENCY", payload: { amount: 15 } },
              { type: "DESTROY_OBJECT" },
              { type: "END_ENCOUNTER", payload: null }
            ]}
          ]
        }
      ]
    },
    "chopped_fail": {
      image: { sheet: "encounters", col: 2, row: 0 },
      text: "[${context.roll_stat} Check: ${context.roll_total} vs DC ${context.roll_dc} - ${context.roll_result}]\n\n{name}'s axe glances off the thick bark. {name} jars their arms terribly but fails to bring it down.",
      decisions: [
        {
          text: "Leave.",
          customActionText: "{name} rubs their sore arms, cursing the old tree before walking away.",
          outcomes: [
            { weight: 100, results: [
              { type: "TAKE_DAMAGE", payload: { amount: 2, target: "active_character" } },
              { type: "END_ENCOUNTER", payload: null }
            ]}
          ]
        }
      ]
    }
  }
};
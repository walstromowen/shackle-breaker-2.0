export const wildHerbs = {
  id: "wild_herbs",
  title: "A Patch of Wild Herbs",
  imageSheet: "encounter_nature", 
  initialStage: "discovery",
  stages: {
    discovery: {
      displayText: "Overgrown Foliage",
      image: { col: 0, row: 0 },
      text: "{name} spots a lush patch of vibrant vegetation growing near the path. The leaves emit a strange but pleasant aroma. Some of these wild herbs might be useful, but foraging in unfamiliar territory always carries a slight risk.",
      decisions: [
        {
          text: "Forage through the patch.",
          customActionText: "{name} kneels down and begins sifting through the dense foliage...",
          outcomes: [
            { 
              weight: 30, 
              results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_healing" } }] 
            },
            { 
              weight: 30, 
              results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_invigorating" } }] 
            },
            { 
              weight: 30, 
              results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_illuminating" } }] 
            },
            { 
              weight: 10, 
              results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poisoned_prick" } }] 
            }
          ]
        },
        {
          text: "Switch party member.",
          type: "switch_character",
          conditions: [{ type: "has_other_party_members" }]
        },
        {
          text: "Leave the plants alone.",
          customActionText: "Not wanting to risk a rash or worse, {name} decides to keep walking.",
          outcomes: [
            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
          ]
        }
      ]
    },
    found_healing: {
      displayText: "A Soothing Discovery",
      image: { col: 1, row: 0 },
      text: "{name} carefully plucks a broad, green leaf with a gentle, minty scent. It looks perfect for treating minor wounds.",
      decisions: [
        {
          text: "Stow the herb.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { items: [{ id: "healing_herb", qty: 1 }] } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    found_invigorating: {
      displayText: "A Refreshing Discovery",
      image: { col: 2, row: 0 },
      text: "{name} unearths a bright, crimson stalk that smells like fresh citrus. Just holding it makes them feel a bit more energetic.",
      decisions: [
        {
          text: "Stow the herb.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { items: [{ id: "invigorating_herb", qty: 1 }] } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    found_illuminating: {
      displayText: "A Mindful Discovery",
      image: { col: 3, row: 0 },
      text: "{name} uncovers a delicate, silvery fern that faintly shimmers in the light. Its aroma immediately clears their mind of any fog.",
      decisions: [
        {
          text: "Stow the herb.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { items: [{ id: "illuminating_herb", qty: 1 }] } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    poisoned_prick: {
      displayText: "Toxic Spores!",
      image: { col: 0, row: 1 },
      text: "Ouch! As {name} reaches into the thicket, a hidden, jagged thorn pierces their skin. A cloud of purple spores erupts from the disturbed plant, making them feel instantly nauseous.",
      decisions: [
        {
          text: "Stumble away.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "APPLY_STATUS_EFFECT", payload: { statusId: "poison", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    }
  }
};
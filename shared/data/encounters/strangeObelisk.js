export const strangeObelisk = {
  id: "strange_obelisk",
  title: "The Strange Obelisk",
  imageSheet: "encounter_obelisk", 
  initialStage: "discovery",
  stages: {
    discovery: {
      displayText: "A Monolith in the Mist",
      image: { col: 0, row: 0 },
      text: "{name}'s party discovers a towering obelisk of smooth, black stone. It hums with an alien frequency, and the glowing geometries carved into its surface seem to shift when not directly observed.",
      decisions: [
        {
          text: "[INT] Attempt to decipher the shifting glyphs.",
          type: "skill_check",
          attribute: "intelligence",
          threshold: 14,
          conditions: [
            { type: "context_flag_not_set", flagId: "failed_obelisk_int" },
            { type: "has_tag", tag: "HUMANOID" }
          ],
          customActionText: "{name} steps closer, tracing the impossible geometry with their eyes...",
          successOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "decipher_success" } }] }
          ],
          failureOutcomes: [
            { 
              weight: 100, 
              results: [
                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_obelisk_int" } },
                { type: "ADVANCE_STAGE", payload: { stageId: "decipher_fail" } }
              ] 
            }
          ]
        },
        {
          text: "[STR] Touch the stone and channel its raw energy.",
          type: "skill_check",
          attribute: "strength",
          threshold: 14,
          conditions: [
            { type: "context_flag_not_set", flagId: "failed_obelisk_str" },
            { type: "has_tag", tag: "HUMANOID" }
          ],
          customActionText: "{name} braces themselves and places a bare hand against the humming stone...",
          successOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "channel_success" } }] }
          ],
          failureOutcomes: [
            { 
              weight: 100, 
              results: [
                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_obelisk_str" } },
                { type: "ADVANCE_STAGE", payload: { stageId: "channel_fail" } }
              ] 
            }
          ]
        },
        {
          text: "[ATN] Meditate before the obelisk.",
          type: "skill_check",
          attribute: "attunement",
          threshold: 14,
          conditions: [
            { type: "context_flag_not_set", flagId: "failed_obelisk_atn" },
            { type: "has_tag", tag: "HUMANOID" }
          ],
          customActionText: "{name} sits cross-legged before the monolith, opening their mind to its frequency...",
          successOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "meditate_success" } }] }
          ],
          failureOutcomes: [
            { 
              weight: 100, 
              results: [
                { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_obelisk_atn" } },
                { type: "ADVANCE_STAGE", payload: { stageId: "meditate_fail" } }
              ] 
            }
          ]
        },
        {
          text: "Switch party member.",
          type: "switch_character",
          conditions: [{ type: "has_other_party_members" }]
        },
        {
          text: "Leave the obelisk alone.",
          customActionText: "Sensing danger, {name} decides it is best to leave this ancient magic undisturbed.",
          outcomes: [
            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
          ]
        }
      ]
    },
    decipher_success: {
      displayText: "Cosmic Truths",
      image: { col: 1, row: 0 },
      text: "The shifting lines suddenly make perfect sense. They recount the early days of the Altus Kingdom. A rush of ancient Alterian knowledge floods {name}'s mind, expanding their understanding of the world.",
      decisions: [
        {
          text: "Absorb the knowledge.",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "inquisitive", target: "active_character" } },
                { type: "AWARD_XP", payload: { amount: 25, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    decipher_fail: {
      displayText: "A Fractured Mind",
      image: { col: 1, row: 1 },
      text: "The geometries twist in impossible ways. It hurts to look at. A sharp pain shoots behind {name}'s eyes, disrupting their coordination and balance.",
      decisions: [
        {
          text: "Stumble away from the stone.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "clumsy", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    channel_success: {
      displayText: "Surging Power",
      image: { col: 2, row: 0 },
      text: "Searing energy courses through {name}'s veins! The raw, unbridled magic of the first Alterians hardens their flesh and quickens their reflexes without destroying them.",
      decisions: [
        {
          text: "Embrace the physical mutation.",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: [
            {
              weight: 50,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "tough", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            },
            {
              weight: 50,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "quick", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    channel_fail: {
      displayText: "Sapped Strength",
      image: { col: 2, row: 1 },
      text: "The obelisk acts as a parasite! As soon as {name} touches it, their vitality is forcefully drained, leaving them feeling hollow, weak, and overly cautious.",
      decisions: [
        {
          text: "Tear your hand away and flee.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "timid", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    meditate_success: {
      displayText: "Alterian Echoes",
      image: { col: 3, row: 0 },
      text: "{name}'s mind synchronizes with the obelisk's frequency. Visions of the ancient Altus Kingdom flood their thoughts, revealing that this stone was crafted by the early Alterians—the very first to discover magic. As they study the ancient architecture, a sudden, powerful surge of raw magical energy erupts from the stone!",
      decisions: [
        {
          text: "Absorb the magical surge!",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "AWARD_XP", payload: { amount: 150, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    meditate_fail: {
      displayText: "The Abyss Gazes Back",
      image: { col: 3, row: 1 },
      text: "{name} opens their mind to the monolith, but something horrifying is waiting inside its frequency. A massive, cold presence peers into their soul, instilling a deep, shaking terror.",
      decisions: [
        {
          text: "Break the connection in a panic!",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "ADD_TRAIT", payload: { traitId: "cowardly", target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    }
  }
};
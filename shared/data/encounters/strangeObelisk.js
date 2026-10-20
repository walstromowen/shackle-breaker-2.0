/* A STRANGE OBELISK
   Three ways to study it (decipher the glyphs, dig round its base, examine its surface), each ending in a success or a failure stage. Whatever the
   approach, the party member comes away changed: the success stages hand out a trait (mostly good ones), the failure stages a trait (mostly bad ones),
   and every implemented trait has a chance to turn up in both. The weights are in one place (GOOD_TRAITS / BAD_TRAITS and the two weights below).

   A fourth option, offered only to a party member who has at least one trait, strips every trait (good and bad) and spends the obelisk. It needs the
   has_any_trait condition and REMOVE_TRAIT { all: true } in encounterLogic.js.

   Images (encounter_obelisk sheet, 128 x 128 cells): (0,0) the obelisk, (1,0) any success, (2,0) any failure. */

/* every trait in traitDefinitions.js that is fully implemented. 'ghostly' is left out until its ability (become_ethereal) exists in abilityDefinitions.js:
   add it to GOOD_TRAITS then. */
const GOOD_TRAITS = [
  // positive
  "quick", "inquisitive", "brawler", "tough", "nimble", "deadeye", "pyromaniac", "lumbering", "academic", "athletic", "nocturnal", "ironhide",
  // conditional
  "berserker", "claustrophobic", "perfectionist", "enduring", "overconfident",
  // trigger
  "martyr", "acidic", "iron_willed", "intimidating", "stealthy", "airborne"
];
const BAD_TRAITS = ["clumsy", "frail", "myopic", "superstitious", "lazy", "dull", "sluggish"];

const COMMON = 10;       // weight of each trait the stage favours (good traits after a success, bad traits after a failure)
const RARE = 1;          // weight of each of the others: a small chance of the unexpected
const SUCCESS_XP = 40;

/* one outcome: the party member gains `traitId` and the obelisk is spent */
const gain = (traitId, weight, xp) => ({
  weight,
  results: [
    { type: "ADD_TRAIT", payload: { traitId, target: "active_character" } },
    ...(xp ? [{ type: "AWARD_XP", payload: { amount: xp, target: "active_character" } }] : []),
    { type: "DESTROY_OBJECT" },
    { type: "END_ENCOUNTER", payload: null }
  ]
});
const successTraits = () => [...GOOD_TRAITS.map((t) => gain(t, COMMON, SUCCESS_XP)), ...BAD_TRAITS.map((t) => gain(t, RARE, SUCCESS_XP))];
const failureTraits = () => [...BAD_TRAITS.map((t) => gain(t, COMMON, 0)), ...GOOD_TRAITS.map((t) => gain(t, RARE, 0))];

/* a skill-check approach: on a failure the flag stops that approach from being tried again at this obelisk */
const approach = ({ text, attribute, flag, action, success, failure }) => ({
  text,
  type: "skill_check",
  attribute,
  threshold: 14,
  conditions: [
    { type: "context_flag_not_set", flagId: flag },
    { type: "has_tag", tag: "HUMANOID" }
  ],
  customActionText: action,
  successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: success } }] }],
  failureOutcomes: [{
    weight: 100,
    results: [
      { type: "SET_CONTEXT_FLAG", payload: { flagId: flag } },
      { type: "ADVANCE_STAGE", payload: { stageId: failure } }
    ]
  }]
});

export const strangeObelisk = {
  id: "strange_obelisk",
  title: "A Strange Obelisk",
  imageSheet: "encounter_obelisk",
  initialStage: "discovery",
  // Cues: tone / ambience here apply to every stage; a stage sets its own tone, effect, sfx and ambience (see encounters/prologue.js)
  tone: "arcane",
  ambience: "obeliskHum",
  stages: {
    discovery: {
      displayText: "A Monolith in the Mist",
      sfx: "glyphChime",
      sfxVolume: 0.5,
      image: { col: 0, row: 0 },
      text: "Your party discovers a towering obelisk of smooth, black stone. Strange geometries are carved into its surface, and they seem to shift when not directly observed. Its base is half buried, and fine seams run across the stone.",
      decisions: [
        approach({
          text: "[INT] Decipher the shifting glyphs.",
          attribute: "intelligence",
          flag: "failed_obelisk_int",
          action: "You step closer, tracing the impossible geometry with your eyes...",
          success: "decipher_success",
          failure: "decipher_fail"
        }),
        approach({
          text: "[STR] Excavate the earth around its base.",
          attribute: "strength",
          flag: "failed_obelisk_str",
          action: "You kneel and dig at the packed soil around the base of the stone...",
          success: "excavate_success",
          failure: "excavate_fail"
        }),
        approach({
          text: "[DEX] Examine its surface and seams.",
          attribute: "dexterity",
          flag: "failed_obelisk_dex",
          action: "You run careful fingers along the seams, searching for a way in...",
          success: "examine_success",
          failure: "examine_fail"
        }),
        {
          text: "Lay a hand on the stone and let it unwrite you.",
          customActionText: "You lay a palm flat against the cold stone...",
          conditions: [{ type: "has_any_trait" }],
          outcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "unmaking" } }] }
          ]
        },
        {
          text: "Switch party member.",
          type: "switch_character",
          conditions: [{ type: "has_other_party_members" }]
        },
        {
          text: "Leave the obelisk alone.",
          customActionText: "Sensing danger, you decide it is best to leave this ancient stone undisturbed.",
          outcomes: [
            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
          ]
        }
      ]
    },

    // ---------- unmaking: removes every trait ----------
    unmaking: {
      displayText: "The Unwriting",
      tone: "blood",
      effect: "glow_red",
      sfx: "glowSwell",
      image: { col: 0, row: 0 },
      text: "The glyphs crawl toward your hand and the stone grows warm. Whatever you have become, for better or worse, it will be unwritten. Every trait, the good with the bad. The stone will not be used twice.",
      decisions: [
        {
          text: "Let it take everything.",
          customActionText: "You do not pull away. The glyphs sink into your skin and are gone...",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "REMOVE_TRAIT", payload: { all: true, target: "active_character" } },
                { type: "DESTROY_OBJECT" },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        },
        {
          text: "Pull your hand away.",
          outcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }
          ]
        }
      ]
    },

    // ---------- decipher ----------
    decipher_success: {
      displayText: "Cosmic Truths",
      effect: "glow_blue",
      sfx: "glyphChime",
      image: { col: 1, row: 0 },
      text: "The shifting lines suddenly make perfect sense. They recount the early days of the Altus Kingdom, and the knowledge settles into your mind and changes who you are.",
      decisions: [
        {
          text: "Take what the stone has taught you.",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: successTraits()
        }
      ]
    },
    decipher_fail: {
      displayText: "A Fractured Mind",
      tone: "blood",
      effect: "jolt",
      sfx: "shockSfx",
      sfxVolume: 0.6,
      image: { col: 2, row: 0 },
      text: "The geometries twist in impossible ways. It hurts to look at. A sharp pain shoots behind your eyes, and something in you is left altered.",
      decisions: [
        {
          text: "Stumble away from the stone.",
          outcomes: failureTraits()
        }
      ]
    },

    // ---------- excavate ----------
    excavate_success: {
      displayText: "Buried Foundations",
      tone: "gold",
      sfx: "stoneGrind",
      sfxVolume: 0.8,
      image: { col: 1, row: 0 },
      text: "Beneath the soil, the obelisk's foundation is carved with row upon row of tools, scenes and figures. Working them free, you learn more about the first Alterians than any book could say, and you take it to heart.",
      decisions: [
        {
          text: "Take what the stone has taught you.",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: successTraits()
        }
      ]
    },
    excavate_fail: {
      displayText: "A Costly Dig",
      tone: "blood",
      effect: "shake",
      sfx: "stoneGrind",
      image: { col: 2, row: 0 },
      text: "The earth round the base is packed hard as iron. The stone shifts, grinds, and bites, and by the time you pull free you are bruised, winded, and not quite the same.",
      decisions: [
        {
          text: "Give up the dig.",
          outcomes: failureTraits()
        }
      ]
    },

    // ---------- examine ----------
    examine_success: {
      displayText: "A Hidden Seam",
      effect: "glow_blue",
      sfx: "glyphChime",
      image: { col: 1, row: 0 },
      text: "One seam is not a seam at all: a panel slides aside under your fingers and, inside, a pattern of carvings that teaches the hand something the mind cannot name.",
      decisions: [
        {
          text: "Take what the stone has taught you.",
          conditions: [{ type: "has_tag", tag: "HUMANOID" }],
          outcomes: successTraits()
        }
      ]
    },
    examine_fail: {
      displayText: "The Stone Bites Back",
      tone: "blood",
      effect: "jolt",
      sfx: "lockClick",
      image: { col: 2, row: 0 },
      text: "A seam snaps shut on your hand and a dull ache runs up the arm. Something about the stone has left a mark that will not fade.",
      decisions: [
        {
          text: "Pull away from the stone.",
          outcomes: failureTraits()
        }
      ]
    }
  }
};
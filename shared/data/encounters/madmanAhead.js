export const madmanAhead = {
  id: "madman_ahead",
  title: "Madman Ahead",
  initialStage: "discovery",
  stages: {
    // ==========================================
    // INITIAL DISCOVERY
    // ==========================================
    "discovery": {
      image: { sheet: "encounters", col: 0, row: 2 },
      bgm: "tense_ambient",
      text: "{name} sees a man walking ahead. The man appears to be walking aimlessly and laughing. Upon getting closer, {name} realizes this is one of the many souls to have succumbed to madness.",
      decisions: [
        {
          text: "Charge the Madman.",
          customActionText: "{name} draws their weapon and charges the Madman!",
          outcomes: [
            {
              weight: 100,
              bgm: "plainsBgmNight", 
              results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN", "MAD_MAN"], bgm: "plainsBgmNight" } }]
            }
          ]
        },
        {
          text: "[DEX] Eliminate the Madman quietly.",
          type: "skill_check",
          attribute: "dexterity",
          threshold: 12,
          customActionText: "{name} sneaks behind the Madman, dagger drawn...",
          successOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "sneak_success" } }] }
          ],
          failureOutcomes: [
            { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "sneak_fail_startle" } }] },
            { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "sneak_fail_bleed" } }] }
          ]
        },
        {
          text: "[STR] Throw a rock at him.",
          type: "skill_check",
          attribute: "strength",
          threshold: 12,
          customActionText: "{name} picks up a heavy rock and hurls it at the Madman.",
          successOutcomes: [
            { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rock_kill" } }] },
            { weight: 3, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rock_injure" } }] }
          ],
          failureOutcomes: [
            { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rock_miss_startle" } }] },
            { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rock_miss_retry" } }] },
            { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "rock_miss_wolves" } }] }
          ]
        },
        {
          text: "[ALT] Attempt to communicate.",
          type: "skill_check",
          attribute: "alterian",
          threshold: 12,
          customActionText: "{name} steps out and attempts to speak calmly to the Madman.",
          successOutcomes: [
            { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "communicate_success_gift" } }] },
            { weight: 2, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "conversation" } }] }
          ],
          failureOutcomes: [
            { weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "communicate_fail" } }] }
          ]
        },
        {
          text: "Switch character.",
          type: "switch_character",
          conditions: [{ type: "has_other_party_members" }]
        },
        {
          text: "Leave.",
          customActionText: "{name} quietly backs away from the Madman and takes a different path.",
          outcomes: [
            { weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }
          ]
        }
      ]
    },

    // ==========================================
    // SNEAK OUTCOMES
    // ==========================================
    "sneak_success": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "{name} sneaks up behind the Madman and plunges a dagger into his side, leaving him lifeless on the ground. If he even was alive...",
      decisions: [
        {
          text: "Loot the body and leave.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { itemId: "random_loot", qty: 1 } },
                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "sneak_fail_startle": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "The Madman is startled by {name}'s clumsy approach. He shrieks and draws his weapon!",
      decisions: [
        {
          text: "Defend!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
        }
      ]
    },
    "sneak_fail_bleed": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "{name} plunges a dagger into the side of the Madman, leaving him bleeding profusely! He survives the blow and sends a howl into the air, alerting nearby villagers!",
      decisions: [
        {
          text: "Brace for the ambush!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [ { id: "MAD_MAN", startingHpPercent: 0.5, statusEffects: [{ id: "bleed", duration: 3, power: 5 }] }, "MADMAN_BANDIT" ] } }] }]
        }
      ]
    },

    // ==========================================
    // ROCK OUTCOMES
    // ==========================================
    "rock_kill": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "The rock hits the Madman right in the head, dropping him lifeless to the ground.",
      decisions: [
        {
          text: "Check his pockets.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { itemId: "random_loot", qty: 1 } },
                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "rock_injure": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "The rock hits the Madman's body, injuring him. After wincing from the wound, the Madman looks up and runs screaming at {name}!",
      decisions: [
        {
          text: "Draw weapons!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: [ { id: "MAD_MAN", startingHpPercent: 0.5 } ] } }] }]
        }
      ]
    },
    "rock_miss_startle": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "The rock goes far over the Madman's head. He snaps his head around, draws his weapon, and rushes at {name}!",
      decisions: [
        {
          text: "Fight!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
        }
      ]
    },
    "rock_miss_retry": {
      image: { sheet: "encounters", col: 0, row: 2 },
      text: "The rock completely misses the madman and lands softly in the grass. He doesn't seem to have noticed. Surely he will notice another...",
      decisions: [
        {
          text: "Try again.",
          outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }]
        }
      ]
    },
    "rock_miss_wolves": {
      image: { sheet: "encounters", col: 3, row: 2 },
      bgm: "plainsBattleBgm",
      text: "The rock goes nowhere near the Madman. Instead, it lands right in the middle of the bushes, startling a pack of wolves! They turn and glare fiercely at {name}!",
      decisions: [
        {
          text: "Uh oh...",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["WOLF", "WOLF", "WOLF"] } }] }]
        }
      ]
    },

    // ==========================================
    // COMMUNICATE OUTCOMES
    // ==========================================
    "communicate_success_gift": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "{name} converses with the Madman about the delusional rants one might expect from a man who has lost his mind. Finally, the Madman smiles, and with tears in his eyes, hands {name} his knapsack. \n\nJust before darting off, he mutters, \"It's really you... Shackle Breaker...\"",
      decisions: [
        {
          text: "Take the knapsack.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { itemId: "random_loot", qty: 1 } },
                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "communicate_fail": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "The Madman stops, looks {name} dead in the eyes, and bursts into maniacal laughter. He draws a rusted blade!",
      decisions: [
        {
          text: "Fight!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
        }
      ]
    },

    // ==========================================
    // THE CONVERSATION STAGE
    // ==========================================
    "conversation": {
      image: { sheet: "encounters", col: 0, row: 2 },
      text: "{name} manages to get his attention. The Madman tilts his head.\n\n\"Magic tell me things! Hee Hee! Tell me what magic say!\"",
      decisions: [
        {
          text: "\"Magic says run away freak!\"",
          type: "skill_check",
          attribute: "strength",
          threshold: 5,
          customActionText: "{name} puffs out their chest and shouts at the Madman.",
          successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_run_success" } }] }],
          failureOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_run_fail" } }] }]
        },
        {
          text: "[ATN] \"Magic tells to give me things!\"",
          type: "skill_check",
          attribute: "attunement",
          threshold: 10,
          customActionText: "{name} attempts to manipulate the man's delusions.",
          successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_give_success" } }] }],
          failureOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_give_fail" } }] }]
        },
        {
          text: "[STR] \"Magic tells to bow!\"",
          type: "skill_check",
          attribute: "strength",
          threshold: 15,
          customActionText: "{name} speaks with booming, terrifying authority.",
          successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_bow_success" } }] }],
          failureOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "convo_bow_fail" } }] }]
        }
      ]
    },

    // Conversation Resolutions
    "convo_run_success": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "Upon hearing {name}, the Madman falls back and hisses. He scrambles to his feet and runs away, leaving his knapsack behind in his panic.",
      decisions: [
        {
          text: "Take the knapsack.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { itemId: "random_loot", qty: 1 } },
                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "convo_run_fail": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "\"Freak? .. Friend! Magic know many freak friend! You be freak friend too!\" he screams, lunging forward.",
      decisions: [
        {
          text: "Fight!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
        }
      ]
    },
    "convo_give_success": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "\"Magic like you! So me like you! Hahahaha! Me give these now!\"",
      decisions: [
        {
          text: "Take his offerings.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "GIVE_ITEM", payload: { itemId: "random_loot", qty: 1 } },
                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "convo_give_fail": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "\"Hahaha! Magic no like you! So me no like neither!\"",
      decisions: [
        {
          text: "Fight!",
          outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }] }]
        }
      ]
    },
    "convo_bow_success": {
      image: { sheet: "encounters", col: 1, row: 2 },
      text: "The man falls to his knees, weeping. \"No no! No hurt! Me help magic! Me help!\"",
      decisions: [
        {
          text: "Command him to follow.",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "MODIFY_VITALS", payload: { insight: 5 } },
                { type: "RECRUIT_CHARACTER", payload: { entityId: "MAD_MAN" } },
                { type: "END_ENCOUNTER", payload: null }
              ]
            }
          ]
        }
      ]
    },
    "convo_bow_fail": {
      image: { sheet: "encounters", col: 2, row: 2 },
      bgm: "plainsBattleBgm",
      text: "He glares at {name} with sudden, horrifying clarity. \"No hear magic! Me hurt now!\"",
      decisions: [
        {
          text: "Defend!",
          outcomes: [
            {
              weight: 100,
              results: [
                { type: "MODIFY_VITALS", payload: { insight: 5 } },
                { type: "START_BATTLE", payload: { enemies: ["MAD_MAN"] } }
              ]
            }
          ]
        }
      ]
    }
  }
};
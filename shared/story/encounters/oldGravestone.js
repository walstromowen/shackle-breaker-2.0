/* The Old Gravestone (object OLD_GRAVESTONE, interaction { type: 'ENCOUNTER', id: 'old_gravestone' }).

   OLD_GRAVESTONE is the rare twin of TOMBSTONE: the two share one sprite (mapObjectDefinitions.js), so the player can not tell them apart by looking.
   The plain tombstone is scenery; this one can be dug up.

   Art: assets/icons/encounters/old_gravestone.png registered as `encounter_old_gravestone`, a 4 x 4 grid of 128 px cells (the cells are placeholder sketches to be painted over):
     (0,0) approach       (1,0) dig            (2,0) buried_things   (3,0) bones_rise
     (0,1) spirit_rises

   Nothing in the ground is certain, and the party's attributes decide how it goes (every roll is d20 + (attribute - 10) / 3, like every skill check):
   Flow:  approach      -> dig it up, or leave it be
          dig           -> [STR 12] heave the earth out, or [DEX 12] dig slowly by hand. A success finds the grave goods before it wakes anything
                           (DIG_SUCCESS: 60% bundle, 15% coffin, 10% empty, 10% bones, 5% spirit); a failure makes noise and wakes the dead
                           (DIG_FAILURE: 20% bundle, 5% coffin, 10% empty, 30% bones, 35% spirit). Half and half, that is DIG_ODDS (40 / 10 / 10 / 20 / 20).
          buried_things -> take the bundle (two rolls of old_grave_loot), or [STR 13] dig deeper still: a success 75% a second bundle (four rolls in all),
                           25% only clay (the first bundle's two rolls); a failure 40% only clay, 60% the spirit below wakes
          sealed_coffin -> [STR 10] pry the lid: success three rolls of loot; failure 60% skeletons, 40% a spirit
          bones_rise    -> fight the skeletons (spawn table grave_skeletons), or [DEX 13] scramble out of the grave: a success escapes with nothing,
                           a failure and they drag you back into the fight
   Attunement (the sense for what is under the surface):
          approach      -> [ATT 11] listen to the ground before the first spade. A success reads the grave for you: it names what lies below (DIG_ODDS)
                           and you choose with that knowledge, so you can leave a fight in the ground. Digging down to what you heard is still a
                           [DEX 10] roll: a clumsy spade over a bundle or a coffin can wake bones beside it (half the time).
                           A failure teaches nothing, costs a quarter of your insight, and cannot be tried again at this stone.
          spirit_rises  -> [ATT 14] speak to the spirit instead of fighting it. A success lets it rest (the grave goods, less corruption);
                           a failure and it comes at you as before.
   Whatever comes out of the ground, the grave is open: the object is destroyed on the button that hands out the loot or starts the fight. Leaving it be
   (or backing out before the first spade) keeps the stone standing for another try. */

const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const fight = (tableId) => [{
    weight: 100,
    results: [
        { type: "START_BATTLE", payload: { tableId } },
        { type: "DESTROY_OBJECT" }
    ]
}];

/* What lies under the stone: a dig that succeeds finds the goods before it wakes anything, one that fails makes noise. DIG_ODDS is the two half and half. */
const DIG_SUCCESS = { buried_things: 60, sealed_coffin: 15, empty_grave: 10, bones_rise: 10, spirit_rises: 5 };
const DIG_FAILURE = { buried_things: 20, sealed_coffin: 5, empty_grave: 10, bones_rise: 30, spirit_rises: 35 };
export const DIG_ODDS = Object.fromEntries(Object.keys(DIG_SUCCESS).map(k => [k, (DIG_SUCCESS[k] + DIG_FAILURE[k]) / 2]));
const digOutcomes = (table) => Object.entries(table).map(([stageId, weight]) => ({ weight, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }));

/* What a successful listen tells you, and where each answer leads. The shares are DIG_ODDS, so listening never changes the odds, it only shows them. */
const LISTEN = [
    { weight: DIG_ODDS.buried_things, stage: "listen_bundle", then: "buried_things", dig: "[DEX] Dig carefully down to the bundle.", fragile: true },
    { weight: DIG_ODDS.bones_rise, stage: "listen_bones", then: "bones_rise", dig: "[DEX] Dig anyway." },
    { weight: DIG_ODDS.spirit_rises, stage: "listen_spirit", then: "spirit_rises", dig: "[DEX] Dig anyway." },
    { weight: DIG_ODDS.empty_grave, stage: "listen_hollow", then: "empty_grave", dig: "[DEX] Dig anyway." },
    { weight: DIG_ODDS.sealed_coffin, stage: "listen_coffin", then: "sealed_coffin", dig: "[DEX] Dig carefully down to the coffin.", fragile: true }
];
const listenStage = (stage, text) => {
    const l = LISTEN.find(x => x.stage === stage);
    return {
        displayText: "Listening",
        image: { col: 1, row: 0 },
        text,
        decisions: [
            {
                text: l.dig,
                type: "skill_check",
                attribute: "dexterity",
                threshold: 10,
                corruption: 2,   // a grave robbed: corruption goes up
                conditions: [HUMANOID],
                successOutcomes: toStage(l.then),
                // a clumsy spade over goods worth keeping can strike the bones buried beside them
                failureOutcomes: l.fragile
                    ? [{ weight: 50, results: [{ type: "ADVANCE_STAGE", payload: { stageId: l.then } }] }, { weight: 50, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_rise" } }] }]
                    : toStage(l.then)
            },
            {
                text: "Leave the dead in peace.",
                corruption: -1,   // a kind act: corruption goes down
                customActionText: "You thank the stone with a nod, and walk on.",
                outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
            }
        ]
    };
};

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
                    text: "Dig it up.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    conditions: [HUMANOID],
                    customActionText: "You kneel at the foot of the stone and push your hands into the cold earth.",
                    outcomes: toStage("dig")
                },
                {
                    text: "[ATT] Listen to what lies beneath.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 11,
                    conditions: [HUMANOID, { type: "context_flag_not_set", flagId: "failed_gravestone_listen" }],
                    successOutcomes: LISTEN.map(l => ({ weight: l.weight, results: [{ type: "ADVANCE_STAGE", payload: { stageId: l.stage } }] })),
                    failureOutcomes: [{
                        weight: 100,
                        results: [
                            { type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_gravestone_listen" } },
                            { type: "MODIFY_VITALS", payload: { insight: -25, isPercentageOfCurrent: true, damageType: "true" } },
                            { type: "ADVANCE_STAGE", payload: { stageId: "listen_failed" } }
                        ]
                    }]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the dead in peace.",
                    customActionText: "You rest a hand on the cold stone for a moment, then walk on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        listen_failed: {
            displayText: "Only Noise",
            image: { col: 0, row: 0 },
            text: "A rushing fills your head like surf, and the quiet will not come. You learn nothing, and the effort leaves you drained.",
            decisions: [
                {
                    text: "Dig it up anyway.",
                    corruption: 2,
                    conditions: [HUMANOID],
                    customActionText: "You shake the noise out of your head and push your hands into the earth.",
                    outcomes: toStage("dig")
                },
                {
                    text: "Leave the dead in peace.",
                    customActionText: "You rub your temples, give the stone a last look, and walk on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },

        listen_bundle: listenStage("listen_bundle", "The ground is still, and close under the sod something small and soft lies wrapped and waiting, left here on purpose. Nothing else stirs."),
        listen_bones: listenStage("listen_bones", "A dry shifting runs through the earth, many small things settling against each other. The grave is crowded, and what is in it is light-sleeping."),
        listen_spirit: listenStage("listen_spirit", "The quiet has a cold edge. Below you, something is awake, and it is turned toward you, and it is waiting."),
        listen_hollow: listenStage("listen_hollow", "There is nothing to hear but soil, a few roots and the slow tick of settling wood. Whatever lay here has long gone."),
        listen_coffin: listenStage("listen_coffin", "A hollow, wooden knock answers your palm: a lid, sealed tight, a hand's breadth down."),

        dig: {
            displayText: "The Soil Gives",
            image: { col: 1, row: 0 },
            text: "The soil is loose, as if it has been turned before. Something shifts beneath your hands, and the air around the stone grows quiet.",
            decisions: [
                {
                    text: "[STR] Heave the earth out.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    conditions: [HUMANOID],
                    successOutcomes: digOutcomes(DIG_SUCCESS),
                    failureOutcomes: digOutcomes(DIG_FAILURE)
                },
                {
                    text: "[DEX] Dig slowly, by hand.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [HUMANOID],
                    successOutcomes: digOutcomes(DIG_SUCCESS),
                    failureOutcomes: digOutcomes(DIG_FAILURE)
                },
                {
                    text: "Stop. Fill it in.",
                    corruption: -1,   // a kind act: corruption goes down
                    customActionText: "You press the earth back down with your palms and step away from the stone.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
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
                },
                {
                    text: "[STR] Dig deeper still.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 13,
                    corruption: 1,
                    conditions: [HUMANOID],
                    successOutcomes: digOutcomes({ deeper_find: 75, deeper_nothing: 25 }),
                    failureOutcomes: digOutcomes({ deeper_nothing: 40, spirit_rises: 60 })
                }
            ]
        },

        deeper_find: {
            displayText: "A Second Bundle",
            image: { col: 2, row: 0 },
            text: "Under the first bundle lies another, wrapped in older cloth and left by a deeper hand.",
            decisions: [
                {
                    text: "Take both bundles.",
                    corruption: 2,
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 4 } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        },

        deeper_nothing: {
            displayText: "Only Clay",
            image: { col: 1, row: 0 },
            text: "There is nothing below but wet clay and pale roots. You take the bundle you found first.",
            decisions: [
                {
                    text: "Take what was buried.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "old_grave_loot", rolls: 2 } },
                            { type: "DESTROY_OBJECT" },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
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
                    threshold: 10,
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

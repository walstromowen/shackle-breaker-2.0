/* The Old Gravestone (object OLD_GRAVESTONE, interaction { type: 'ENCOUNTER', id: 'old_gravestone' }).

   OLD_GRAVESTONE is the rare twin of TOMBSTONE: the two share one sprite (mapObjectDefinitions.js), so the player can not tell them apart by looking.
   The plain tombstone is scenery; this one can be dug up.

   Art: assets/icons/encounters/old_gravestone.png registered as `encounter_old_gravestone`, a 4 x 4 grid of 128 px cells (the cells are placeholder sketches to be painted over):
     (0,0) approach       (1,0) dig            (2,0) buried_things   (3,0) bones_rise
     (0,1) spirit_rises

   Flow:  approach      -> dig it up, or leave it be
          dig           -> keep digging: what lies below is one roll
                             40%  buried_things (loot: two rolls of the old_grave_loot table, a little experience)
                                                 -> or dig deeper still: 45% a second bundle (four rolls in all), 35% only clay (the first bundle's two rolls), 20% a spirit
                             20%  bones_rise    (a fight with skeletons, spawn table grave_skeletons)
                             20%  spirit_rises  (a fight with a shackled spirit, spawn table shackled_spirit)
                             10%  empty_grave   (only soil and coffin splinters, a crumb of experience)
                             10%  sealed_coffin ([STR 10] pry the lid: success three rolls of loot; failure 60% skeletons, 40% a spirit)
   Attunement (the sense for what is under the surface; the roll is d20 + (ATT - 10) / 3, like every skill check):
          approach      -> [ATT 11] listen to the ground before the first spade. A success reads the grave for you: it names what lies below (the same shares as the dig:
                           40% a bundle, 20% bones, 20% a spirit, 10% nothing, 10% a coffin) and you choose with that knowledge, so you can leave a fight in the ground.
                           A failure teaches nothing, costs a quarter of your insight, and cannot be tried again at this stone.
          spirit_rises  -> [ATT 14] speak to the spirit instead of fighting it. A success lets it rest (a little experience, the grave goods, less corruption);
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

/* What a successful listen tells you, and where each answer leads. The shares are the shares of the dig below, so listening never changes the odds, it only shows them. */
const LISTEN = [
    { weight: 40, stage: "listen_bundle", then: "buried_things", dig: "Dig down to the bundle." },
    { weight: 20, stage: "listen_bones", then: "bones_rise", dig: "Dig anyway." },
    { weight: 20, stage: "listen_spirit", then: "spirit_rises", dig: "Dig anyway." },
    { weight: 10, stage: "listen_hollow", then: "empty_grave", dig: "Dig anyway." },
    { weight: 10, stage: "listen_coffin", then: "sealed_coffin", dig: "Dig down to the coffin." }
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
                corruption: 2,   // a grave robbed: corruption goes up
                conditions: [HUMANOID],
                customActionText: "You dig where the quiet led you.",
                outcomes: toStage(l.then)
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
                    customActionText: "You kneel, lay a palm flat on the cold ground, and let the quiet settle in.",
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
                    text: "Keep digging.",
                    conditions: [HUMANOID],
                    customActionText: "You dig deeper, until the earth gives way.",
                    outcomes: [
                        { weight: 40, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "buried_things" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bones_rise" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] },
                        { weight: 10, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "empty_grave" } }] },
                        { weight: 10, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "sealed_coffin" } }] }
                    ]
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
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Dig deeper still.",
                    corruption: 1,
                    conditions: [HUMANOID],
                    customActionText: "You leave the bundle where it lies and dig on, down into the clay.",
                    outcomes: [
                        { weight: 45, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deeper_find" } }] },
                        { weight: 35, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "deeper_nothing" } }] },
                        { weight: 20, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "spirit_rises" } }] }
                    ]
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
                            { type: "AWARD_XP", payload: { amount: 8, target: "active_character" } },
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
                            { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
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
                            { type: "AWARD_XP", payload: { amount: 2, target: "active_character" } },
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
                    customActionText: "You work your fingers under the lid and heave.",
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
                            { type: "AWARD_XP", payload: { amount: 7, target: "active_character" } },
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
                    customActionText: "You lower your weapon, open your empty hand, and speak to what is left of the one who lies here.",
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
                            { type: "AWARD_XP", payload: { amount: 8, target: "active_character" } },
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

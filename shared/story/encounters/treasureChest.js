export const treasureChest = {
    id: "treasure_chest",
    title: "Treasure Chest",
    imageSheet: "encounter_treasure_chest",
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Locked Chest",
            image: { col: 0, row: 0 },
            text: "Your party spots a locked chest ahead. It looks sturdy, but might contain valuable loot inside.",
            decisions: [
                {
                    text: "[Small Iron Key] Unlock the chest with the small iron key.",
                    conditions: [
                        { type: "has_item", itemId: "small_iron_key", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You insert the small iron key into the lock and turn it with a satisfying click...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "small_iron_key", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ]
                        }
                    ]
                },
                {
                    text: "[STR] Pry the chest open by force.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_str" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You try to pry the sturdy chest open with brute strength...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_str" } }, { type: "ADVANCE_STAGE", payload: { stageId: "wont_budge" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[DEX] Pick the lock.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_dex" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You focus closely, trying to pick the lock mechanism...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_dex" } }, { type: "ADVANCE_STAGE", payload: { stageId: "jammed_lock" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[INT] Unlock with a spell.",
                    corruption: 2,   // magic used or a cruel act: corruption goes up
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_int" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You channel your magical energy toward the locking mechanism...",
                    successOutcomes: [
                        { 
                            weight: 100, 
                            results: [
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ] 
                        }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_int" } }, { type: "ADVANCE_STAGE", payload: { stageId: "spell_fail" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "summon_evil" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "[ATN] Search the area for a hidden key.",
                    type: "skill_check",
                    attribute: "attunement",
                    threshold: 12,
                    conditions: [
                        { type: "context_flag_not_set", flagId: "failed_atn" },
                        { type: "context_flag_not_set", flagId: "found_key" },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You sweep the area, searching high and low for the missing key...",
                    successOutcomes: [
                        { weight: 100, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "found_key" } }, { type: "ADVANCE_STAGE", payload: { stageId: "found_key" } }] }
                    ],
                    failureOutcomes: [
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ambush" } }] },
                        { weight: 1, results: [{ type: "SET_CONTEXT_FLAG", payload: { flagId: "failed_atn" } }, { type: "ADVANCE_STAGE", payload: { stageId: "no_key" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "chest_explosion" } }] },
                        { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "poison_mist" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the chest behind.",
                    customActionText: "You decide to leave the chest alone and continue the journey.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        found_key: {
            displayText: "A Lucky Find",
            tone: "gold",
            sfx: "pickupSound",
            image: { col: 0, row: 1 },
            text: "You spot a glint of metal partially buried in the dirt nearby. It's a small iron key!",
            decisions: [
                {
                    text: "Take the key and return.",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "GIVE_ITEM", payload: { items: [{ id: "small_iron_key", qty: 1 }] } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }
                            ]
                        }
                    ]
                }
            ]
        },
        opened_chest: {
            displayText: "Treasure Secured",
            tone: "gold",
            effect: "flash",
            sfx: "chestOpen",
            image: { col: 1, row: 0 },
            text: "With a satisfying click, the lid of the chest pops open, revealing the treasures hidden within!",
            decisions: [
                {
                    text: "Gather the loot and depart.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2, exclude: "low_tier" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        wont_budge: {
            displayText: "A Stubborn Chest",
            sfx: "chestCreak",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "You pull and pry with all your might, but the chest won't budge an inch.",
            decisions: [{ text: "Reassess the situation.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        jammed_lock: {
            displayText: "Jammed Mechanism",
            effect: "jolt",
            sfx: "lockClick",
            image: { col: 0, row: 0 },
            text: "You twist the tool slightly too hard, jamming the lock temporarily.",
            decisions: [{ text: "Rethink the approach.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        spell_fail: {
            displayText: "Fizzled Magic",
            tone: "arcane",
            sfx: "shockSfx",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "Your spell sparks against the metal bindings and quietly fizzles out into nothingness.",
            decisions: [{ text: "Consider another option.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        no_key: {
            displayText: "Fruitless Search",
            image: { col: 0, row: 0 },
            text: "You search every nook and cranny nearby, but the key is nowhere to be found.",
            decisions: [{ text: "Give up the search.", outcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "discovery" } }] }] }]
        },
        chest_explosion: {
            displayText: "A Trap Triggered!",
            tone: "blood",
            effect: "blast",
            sfx: "chestBlast",
            image: { col: 3, row: 0 },
            text: "A hidden mechanism clicks menacingly. Suddenly, the chest emits a high-pitched whine and violently explodes, destroying the loot and engulfing you in searing flames!",
            decisions: [
                {
                    text: "Brace for impact!",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "MODIFY_VITALS", payload: { hp: -25, damageType: "fire", target: "active_character" } },
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "burn", charges: 3, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        poison_mist: {
            displayText: "A Toxic Trap",
            tone: "cold",
            effect: "poison",
            sfx: "poisonSfx",
            image: { col: 2, row: 0 },
            text: "With a grinding creak, the chest pops open—but immediately releases a dense cloud of noxious, green mist! You inhale the toxic fumes as you reach for the loot.",
            decisions: [
                {
                    text: "Cough and grab the loot anyway.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "APPLY_STATUS_EFFECT", payload: { effectId: "poison", charges: 3, target: "active_character" } },
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "biome_default", rolls: 2, exclude: "low_tier" } },
                                { type: "AWARD_XP", payload: { amount: 5, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        },
        ambush: {
            displayText: "Ambush!",
            tone: "blood",
            effect: "jolt",
            sfx: "ambushColdBreath",
            image: { col: 3, row: 1 },
            bgm: "plainsBattleBgm",
            text: "All the commotion attracts unwanted attention. Something approaches your position rapidly from the shadows!",
            decisions: [
                {
                    text: "Draw your weapon!",
                    conditions: [{ type: "has_tag", tag: "HUMANOID" }],
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "madman_pack" } }] }]
                }
            ]
        },
        summon_evil: {
            displayText: "A Dark Presence",
            tone: "blood",
            effect: "glow_red",
            sfx: "spiteCastSfx",
            image: { col: 2, row: 1 },
            bgm: "plainsBattleBgm",
            text: "The unstable magic backfires terribly! The chest remains locked, but a dark, swirling mass of energy coalesces into a shadowy spirit, dragging broken shackles, right before your eyes!",
            decisions: [
                {
                    text: "Prepare for combat!",
                    outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { tableId: "shackled_spirit" } },{ type: "DESTROY_OBJECT" }, // And added here for the other 50% roll
                ] }]
                }
            ]
        }
    }
};
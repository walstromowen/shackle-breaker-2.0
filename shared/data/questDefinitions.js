export const QuestDefinitions = {
    // ========================================================
    // MAIN QUESTLINE (SHACKLED)
    // ========================================================
    "shackled1": {
    id: "shackled1",
    name: "Shackled",
    description: "The chain that bound you to the line has broken, and the convoy marched on into the dark without you. The shackles are still locked around your wrists, and the fog in your mind has lifted. You remember the road, and nothing before it. Find out what happened, and grow strong enough to survive the answer.",
    objectives: [
        { id: "obj_reach_level_2", type: "party_level", targetLevel: 2, amount: 1 },
    ],
    rewards: { exp: 50, currency: 50, quests: ["shackled2"] }
},
    "shackled2": {
        id: "shackled2",
        name: "Shackled",
        description: "The prisoners on the road were not the only ones. Others wear the same iron here, and they laugh in the streets, as though sharing a single dream. Whatever took them has not stopped at the road.",
        objectives: [
            { id: "obj_kill_madmen_part_2", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 },
            { id: "obj_reach_level_3", type: "party_level", targetLevel: 3, amount: 1 }
        ],
        rewards: { exp: 100, currency: 100, quests: ["shackled3"] }
    },
    "shackled3": {
        id: "shackled3",
        name: "Shackled",
        description: "The shackles have no keyhole, and the weight on your spirit is as heavy as the iron. The ravings of the mad are not all nonsense: they speak of a stone fallen from the sky, and of the sand-skinned ones who carried it away. Many of them still conjure sparks and cannot stop. Listen closely, then put them down.",
        objectives: [
            { id: "obj_reach_level_5", type: "party_level", targetLevel: 5, amount: 1 },
            { id: "obj_kill_magic_addicts", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 3 }
        ],
        rewards: {
            exp: 150,
            currency: 150,
            items: [
                { id: "healing_tonic", amount: 1 }
            ],
            quests: ["shackled4"]
        }
    },
    "shackled4": {
        id: "shackled4",
        name: "Shackled",
        description: "Past the plains lie the dunes, and those who walk them unseen. The stone was last seen with them, but what was taken is no longer in their hands.",
        objectives: [
            { id: "obj_reach_level_6", type: "party_level", targetLevel: 6, amount: 1 },
            { id: "obj_kill_sand_stalkers", type: "kill_enemy", targetId: "SAND_STALKER", amount: 3 }
        ],
        rewards: {
            exp: 200,
            currency: 200,
            items: [
                { id: "healing_tonic", amount: 1 },
                { id: "bedroll", amount: 1 }
            ],
            quests: ["shackled5"]
        }
    },
    "shackled5": {
        id: "shackled5",
        name: "Shackled",
        description: "The dunes keep a second face after dark. A weaver of mirages guards what the sand has swallowed, and the trail of the stone with it.",
        objectives: [
            { id: "obj_reach_level_7", type: "party_level", targetLevel: 7, amount: 1 },
            { id: "obj_kill_miragewright", type: "kill_enemy", targetId: "MIRAGEWRIGHT", amount: 1 }
        ],
        rewards: {
            exp: 250,
            currency: 250,
            items: [
                { id: "smoke_bomb", amount: 2 },
                { id: "healing_tonic", amount: 1 }
            ],
            quests: ["shackled6"]
        }
    },
    "shackled6": {
        id: "shackled6",
        name: "Shackled",
        description: "The stone passed from the dunes into foreign hands. The Panzerian trappers of the frozen peaks do not speak of where it went, or of what they saw.",
        objectives: [
            { id: "obj_reach_level_8", type: "party_level", targetLevel: 8, amount: 1 },
            { id: "obj_kill_frozen_trappers", type: "kill_enemy", targetId: "FROZEN_TRAPPER", amount: 3 }
        ],
        rewards: {
            exp: 300,
            currency: 300,
            items: [
                { id: "healing_tonic", amount: 2 },
                { id: "healing_herb", amount: 3 }
            ],
            quests: ["shackled7"]
        }
    },
    "shackled7": {
        id: "shackled7",
        name: "Shackled",
        description: "What went to the peaks came back down to the plains, carried by those who still wear the old colors. They do not rest. The dead stir where battles were fought. Whoever carried the stone home has the answer, if any of them can still be reasoned with.",
        objectives: [
            { id: "obj_reach_level_9", type: "party_level", targetLevel: 9, amount: 1 },
            { id: "obj_kill_legionaries", type: "kill_enemy", targetId: "LEGIONARY", amount: 4 },
            { id: "obj_kill_watchmen", type: "kill_enemy", targetId: "WATCHMAN", amount: 2 }
        ],
        rewards: {
            exp: 350,
            currency: 350,
            items: [
                { id: "meteorite", amount: 1 },
                { id: "torch", amount: 3 },
                { id: "interior_map", amount: 1 }
            ],
            quests: ["shackled8"]
        }
    },
    "shackled8": {
        id: "shackled8",
        name: "Shackled",
        description: "A stone altar waits in the dark below, though not every depth holds one. A skull rests above a hollow the size of a fallen star. The answer to what happened waits down there. Descend when you are strong.",
        objectives: [
            { id: "obj_reach_level_10", type: "party_level", targetLevel: 10, amount: 1 },
            { id: "obj_kill_darius", type: "kill_enemy", targetId: "DARIUS_THE_GROVELER", amount: 1 }
        ],
        rewards: {
            exp: 400,
            currency: 400,
            items: [
                { id: "healing_tonic", amount: 3 },
                { id: "invigorating_tonic", amount: 2 }
            ]
        }
    },

    // ========================================================
    // ACT 2 (started by the encounter that follows Darius the Groveler, encounters/actTwo.js)
    // ========================================================
    "act2_red_moon": {
        id: "act2_red_moon",
        name: "The Red Moon",
        description: "The moon rises red every night now, and the days are dim. The dead walk the roads, the cursed come in greater numbers, and every enemy is a little stronger than before. Darius did not curse the world, and neither did the stone. Magic itself is the curse, and every spell cast feeds it. You have cast many. Grow strong, and keep your torch lit.",
        objectives: [
            { id: "obj_reach_level_12", type: "party_level", targetLevel: 12, amount: 1 },
            { id: "obj_kill_risen", type: "kill_enemy", targetId: "SKELETAL_WARRIOR", amount: 5 }
        ],
        rewards: {
            exp: 600,
            currency: 500,
            items: [
                { id: "healing_tonic", amount: 3 },
                { id: "invigorating_tonic", amount: 2 }
            ]
        }
    },

    // ========================================================
    // THE ROYAL GUARD (started from the officer in the Aftermath encounter)
    // The big iron key opens the iron chests at the bottom of the caves.
    // ========================================================
    "alterian_sealed_orders": {
        id: "alterian_sealed_orders",
        name: "Sealed Orders",
        description: "Sealed orders bearing the Royal Guard crest. The cursed soldiers who stalk the roads are to be put down. The orders end with a promise: an iron key, for those who see it done.",
        objectives: [
            { id: "obj_orders_legionaries", type: "kill_enemy", targetId: "LEGIONARY", amount: 4 },
            { id: "obj_orders_watchmen", type: "kill_enemy", targetId: "WATCHMAN", amount: 2 }
        ],
        rewards: {
            exp: 250,
            currency: 150,
            items: [
                { id: "large_iron_key", amount: 1 },
                { id: "healing_tonic", amount: 2 }
            ]
        }
    },

    // ========================================================
    // GENERAL SIDE QUESTS
    // ========================================================
    "cursed_populace": {
        id: "cursed_populace",
        name: "Cursed Populace",
        description: "The entire town seems to be afflicted with a strange madness. The people here are not themselves, are they even still human?",
        objectives: [
            { id: "obj_kill_madmen", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 }
        ],
        rewards: { exp: 50, currency: 100 }
    },
    "unnatural_flora": {
        id: "unnatural_flora",
        name: "Unnatural Flora",
        description: "Once ordinary flora seems to pulse with an otherworldly energy.",
        objectives: [
            { id: "obj_get_healing_herbs", type: "obtain_item", targetId: "healing_herb", amount: 2 },
            { id: "obj_get_invigorating_herbs", type: "obtain_item", targetId: "invigorating_herb", amount: 2 }
        ],
        rewards: { exp: 50, items: [{ id: "insight_of_earth", amount: 1 }], currency: 50, quests: ["cure_the_afflicted"] }
    },
    "men_no_less": {
        id: "men_no_less",
        name: "Men No Less",
        description: "Some of the afflicted bear their madness more lightly than the rest. One of them may yet be reached.",
        objectives: [
            { id: "obj_cure_madmen", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 },
            { id: "obj_cure_madmage", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 2 },
            { id: "obj_cure_madmen_rotter", type: "kill_enemy", targetId: "ROTTER", amount: 2 }
        ],
        rewards: { 
            exp: 75, 
            currency: 150, 
            companions: [{ id: "MAD_MAN", overrides: { name: "survivor" } }] 
        }
    },
    'blacksmith_apprentice': {
    id: 'blacksmith_apprentice',
    title: 'The Blacksmith\'s Test',
    description: 'Prove your worth by forging a Short Sword.',
    objectives: [
        { 
            type: 'craft',
            targetId: 'shortsword', 
            amount: 1 // <-- Replaced requiredQty: 1
            // Removed currentQty: 0
        }
    ]
},



    // ========================================================
    // TRAVELER QUESTLINE
    // ========================================================
    "bg_traveler_1": {
        id: "bg_traveler_1",
        name: "The Late Arrival",
        description: "You came to Altus for its wonders, and arrived too late. Outside the gates, men laugh with a gleam that is not their own.",
        objectives: [
            { id: "obj_trav1", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_traveler_2"] }
    },
    "bg_traveler_2": {
        id: "bg_traveler_2",
        name: "Stark Contrast",
        description: "The towers of the capital stand in the distance. The villages beneath them lie in ruin, and the air is foul. The country road may offer more.",
        objectives: [
            { id: "obj_trav2", type: "obtain_item", targetId: "healing_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_traveler_3"] }
    },
    "bg_traveler_3": {
        id: "bg_traveler_3",
        name: "The Horrifying Truth",
        description: "Men toss a ball of fire and laugh. An armored guard takes the flame from them, and joins the laughter.",
        objectives: [
            { id: "obj_trav3", type: "kill_enemy", targetId: "LEGIONARY", amount: 2 },
            { id: "obj_trav3b", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "cloth_shoes", amount: 1 },
                { id: "shortbow", amount: 1 },
                { id: "escape_rope", amount: 1 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // BLACKSMITH QUESTLINE
    // ========================================================
    "bg_blacksmith_1": {
        id: "bg_blacksmith_1",
        name: "A Desperate Order",
        description: "No customers since the artifact was found. Then a desperate man wants a sword, and wants it now. Iron is needed.",
        objectives: [
            { id: "obj_bs1", type: "obtain_item", targetId: "iron_ingot", amount: 1 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_blacksmith_2"] }
    },
    "bg_blacksmith_2": {
        id: "bg_blacksmith_2",
        name: "Hard Work",
        description: "The forge asks much of a body. Herbs grow nearby that restore strength.",
        objectives: [
            { id: "obj_bs2", type: "obtain_item", targetId: "invigorating_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_blacksmith_3"] }
    },
    "bg_blacksmith_3": {
        id: "bg_blacksmith_3",
        name: "The Cost of Enabling",
        description: "The sword was meant for a man who now howls at the sky. He is not the last.",
        objectives: [
            { id: "obj_bs3", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 },
            { id: "obj_bs3b", type: "kill_enemy", targetId: "LEGIONARY", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "shortsword", amount: 1 },
                { id: "iron_gauntlets", amount: 1 },
                { id: "warhammer", amount: 1 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // RANGER QUESTLINE
    // ========================================================
    "bg_ranger_1": {
        id: "bg_ranger_1",
        name: "The Shifting Hunt",
        description: "The beasts of the woods are changing. Strange growths, a rabid hunger. The wolves must be culled before it spreads.",
        objectives: [
            { id: "obj_ran1", type: "kill_enemy", targetId: "WOLF", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_ranger_2"] }
    },
    "bg_ranger_2": {
        id: "bg_ranger_2",
        name: "The Bleeding Earth",
        description: "A stream runs glowing from the capital. Cleaner herbs grow deeper in the woods.",
        objectives: [
            { id: "obj_ran2", type: "obtain_item", targetId: "healing_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_ranger_3"] }
    },
    "bg_ranger_3": {
        id: "bg_ranger_3",
        name: "Unnatural Prey",
        description: "Rangers drank the tainted water and became the very things they hunted. The curse seeps into the soil of Altus, and into the beasts of the cold peaks.",
        objectives: [
            { id: "obj_ran3", type: "kill_enemy", targetId: "ROTTER", amount: 2 },
            { id: "obj_ran3b", type: "kill_enemy", targetId: "SNOW_LEOPARD", amount: 2 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "dagger", amount: 1 },
                { id: "leather_armor", amount: 1 },
                { id: "shortbow", amount: 1 },
                { id: "bear_trap", amount: 2 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // SCHOLAR QUESTLINE
    // ========================================================
    "bg_scholar_1": {
        id: "bg_scholar_1",
        name: "A Dangerous Hypothesis",
        description: "Magic is life itself, a colleague claimed. He proved it, and turned rabid.",
        objectives: [
            { id: "obj_sch1", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 1 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_scholar_2"] }
    },
    "bg_scholar_2": {
        id: "bg_scholar_2",
        name: "Erratic Variables",
        description: "The residue of magic is erratic, and its nearness brings headaches. Herbs may clear the mind.",
        objectives: [
            { id: "obj_sch2", type: "obtain_item", targetId: "illuminating_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_scholar_3"] }
    },
    "bg_scholar_3": {
        id: "bg_scholar_3",
        name: "A Flawed Science",
        description: "The energy of the artifact is corrosive to the mind, yet the first to fall were the ones who worked with it longest. Perhaps the fault was never the artifact alone.",
        objectives: [
            { id: "obj_sch3", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 3 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "insight_of_arcane", amount: 1 },
                { id: "cloth_robe", amount: 1 },
                { id: "illuminating_tonic", amount: 2 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // WARRIOR QUESTLINE
    // ========================================================
    "bg_warrior_1": {
        id: "bg_warrior_1",
        name: "A New Fear",
        description: "The warriors of Altus were once respected. Now the guard stands like statues, and falls upon any who approach.",
        objectives: [
            { id: "obj_war1", type: "kill_enemy", targetId: "LEGIONARY", amount: 2 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_warrior_2"] }
    },
    "bg_warrior_2": {
        id: "bg_warrior_2",
        name: "The Cursed Orders",
        description: "The guard was ordered to take the artifact's power into themselves. Stone, at least, is untainted by it.",
        objectives: [
            { id: "obj_war2", type: "obtain_item", targetId: "stone", amount: 2 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_warrior_3"] }
    },
    "bg_warrior_3": {
        id: "bg_warrior_3",
        name: "Monsters in Armor",
        description: "A guard's mind snaps, and he becomes a raving brute. Not elite soldiers, but cursed monsters in armor.",
        objectives: [
            { id: "obj_war3", type: "kill_enemy", targetId: "LEGIONARY", amount: 4 },
            { id: "obj_war3b", type: "kill_enemy", targetId: "SHACKLED_STEED", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "handaxe", amount: 1 },
                { id: "iron_armor", amount: 1 },
                { id: "glaive", amount: 1 },
                { id: "healing_tonic", amount: 2 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // THIEF QUESTLINE
    // ========================================================
    "bg_thief_1": {
        id: "bg_thief_1",
        name: "Easy Pickings",
        description: "The nobles are consumed by their new magic, and it has turned them violent. Their servants have turned as well.",
        objectives: [
            { id: "obj_thf1", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 }
        ],
        rewards: { exp: 50, currency: 30, quests: ["bg_thief_2"] }
    },
    "bg_thief_2": {
        id: "bg_thief_2",
        name: "The Glowing Stash",
        description: "Gold was traded for glowing things that sicken all who hold them. What honest valuables remain are few.",
        objectives: [
            { id: "obj_thf2", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 60, quests: ["bg_thief_3"] }
    },
    "bg_thief_3": {
        id: "bg_thief_3",
        name: "Poverty's Blessing",
        description: "The nobles hoarded the glowing things, and their minds went with them. Poverty was a mercy.",
        objectives: [
            { id: "obj_thf3", type: "kill_enemy", targetId: "ROTTER", amount: 2 },
            { id: "obj_thf3b", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 150,
            items: [
                { id: "leather_boots", amount: 1 },
                { id: "throwing_knife", amount: 5 },
                { id: "poison_throwing_knife", amount: 3 },
                { id: "smoke_bomb", amount: 2 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // HERMIT QUESTLINE
    // ========================================================
    "bg_hermit_1": {
        id: "bg_hermit_1",
        name: "Solitary Studies",
        description: "Far from the artifact, travelers still claw at their ears. A maddening static fills the air. Herbs may ward it.",
        objectives: [
            { id: "obj_her1", type: "obtain_item", targetId: "illuminating_herb", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_hermit_2"] }
    },
    "bg_hermit_2": {
        id: "bg_hermit_2",
        name: "The Fringe Effects",
        description: "A clear mind draws the maddened like a beacon. They gather.",
        objectives: [
            { id: "obj_her2", type: "kill_enemy", targetId: "MAD_MAN", amount: 4 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_hermit_3"] }
    },
    "bg_hermit_3": {
        id: "bg_hermit_3",
        name: "A Cursed Proximity",
        description: "The static persists, even here. The artifact sings a corrupting frequency, and all who draw near lose their minds.",
        objectives: [
            { id: "obj_her3", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 2 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "insight_of_fire", amount: 1 },
                { id: "cloth_hood", amount: 1 },
                { id: "bedroll", amount: 1 },
                { id: "torch", amount: 3 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // FARMER QUESTLINE
    // ========================================================
    "bg_farmer_1": {
        id: "bg_farmer_1",
        name: "Unchanging Fields",
        description: "The cities went mad, but the fields did not change. Then city folk came on all fours, tearing at the roots.",
        objectives: [
            { id: "obj_far1", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_farmer_2"] }
    },
    "bg_farmer_2": {
        id: "bg_farmer_2",
        name: "Holding the Line",
        description: "More are coming, less like starving men than rabid beasts. Stone can hold a fence.",
        objectives: [
            { id: "obj_far2", type: "obtain_item", targetId: "stone", amount: 4 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_farmer_3"] }
    },
    "bg_farmer_3": {
        id: "bg_farmer_3",
        name: "The Prepared Suffer",
        description: "They break through the fences. They hunger for nothing the earth gives. The kingdom fell while the fields were tended.",
        objectives: [
            { id: "obj_far3", type: "kill_enemy", targetId: "ROTTER", amount: 2 },
            { id: "obj_far3b", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "healing_herb", amount: 3 },
                { id: "leather_leggings", amount: 1 },
                { id: "scythe", amount: 1 },
                { id: "healing_herb", amount: 3 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // BOUNTY HUNTER QUESTLINE
    // ========================================================
    "bg_bounty_hunter_1": {
        id: "bg_bounty_hunter_1",
        name: "The Irony of the Hunt",
        description: "Demand for hunters of the mad is high. The latest mark is a hunter himself, gone mad.",
        objectives: [
            { id: "obj_bh1", type: "kill_enemy", targetId: "SHADY_MERCHANT", amount: 1 }
        ],
        rewards: { exp: 50, currency: 50, quests: ["bg_bounty_hunter_2"] }
    },
    "bg_bounty_hunter_2": {
        id: "bg_bounty_hunter_2",
        name: "Lethal Madness",
        description: "His Alterian blade is warped by foul magic. Untainted supplies are scarce.",
        objectives: [
            { id: "obj_bh2", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 60, quests: ["bg_bounty_hunter_3"] }
    },
    "bg_bounty_hunter_3": {
        id: "bg_bounty_hunter_3",
        name: "No One is Immune",
        description: "The kingdom's magical trinkets melted his mind. The best hunters become the worst monsters.",
        objectives: [
            { id: "obj_bh3", type: "kill_enemy", targetId: "LEGIONARY", amount: 2 },
            { id: "obj_bh3b", type: "kill_enemy", targetId: "SHACKLED_STEED", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 80,
            items: [
                { id: "shortsword", amount: 1 },
                { id: "leather_helmet", amount: 1 },
                { id: "crossbow", amount: 1 },
                { id: "bear_trap", amount: 2 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    },

    // ========================================================
    // DISEASED QUESTLINE
    // ========================================================
    "bg_diseased_1": {
        id: "bg_diseased_1",
        name: "The 'Cure'",
        description: "They called it treatment. The artifact's influence only deepened the delirium. A natural concoction may clear the head.",
        objectives: [
            { id: "obj_dis1", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 50, currency: 10, quests: ["bg_diseased_2"] }
    },
    "bg_diseased_2": {
        id: "bg_diseased_2",
        name: "Failing Treatments",
        description: "The concoction fades. The scholar who gave the treatment thrashes in the dirt, madder than any patient.",
        objectives: [
            { id: "obj_dis2", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 1 }
        ],
        rewards: { exp: 100, currency: 30, quests: ["bg_diseased_3"] }
    },
    "bg_diseased_3": {
        id: "bg_diseased_3",
        name: "A Toxic Remedy",
        description: "The artifact's light does not cure madness. It deepens it, and the patients who were treated most often fell furthest. Something in the treatment itself is rotten.",
        objectives: [
            { id: "obj_dis3", type: "kill_enemy", targetId: "ROTTER", amount: 2 },
            { id: "obj_dis3b", type: "kill_enemy", targetId: "MAGIC_ADDICT", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 50,
            items: [
                { id: "cloth_gloves", amount: 1 },
                { id: "healing_tonic", amount: 2 },
                { id: "healing_herb", amount: 3 },
                { id: "large_iron_key", amount: 1 }
            ]
        }
    }
};
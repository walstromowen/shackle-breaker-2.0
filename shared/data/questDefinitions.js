export const QuestDefinitions = {
    // ========================================================
    // MAIN QUESTLINE (SHACKLED)
    // ========================================================
    "shackled1": {
    id: "shackled1",
    name: "Shackled",
    description: "You wake up with shackles around your wrists. Though the chain connecting them is broken, the shackles remain locked.",
    objectives: [
        { id: "obj_reach_level_2", type: "party_level", targetLevel: 2, amount: 1 },
        { id: "obj_craft_artifact", type: "craft", targetId: "artifact_of_the_dev", amount: 1 }
    ],
    rewards: { exp: 50, currency: 50, quests: ["shackled2"] }
},
    "shackled2": {
        id: "shackled2",
        name: "Shackled",
        description: "You notice that many of the people here also have shackles on their wrists. They laugh wildly in the streets as if sharing the same hallucination, what happened here?",
        objectives: [
            { id: "obj_kill_madmen_part_2", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 },
            { id: "obj_reach_level_3", type: "party_level", targetLevel: 3, amount: 1 }
        ],
        rewards: { exp: 100, currency: 100, quests: ["shackled3"] }
    },
    "shackled3": {
        id: "shackled3",
        name: "Shackled",
        description: "On examination of your shackles, you notice there is no keyhole. Your spirit weighs as heavy on you as the shackles themselves. Perhaps one of the scholars can help you, if there are any left.",
        objectives: [
            { id: "obj_reach_level_5", type: "party_level", targetLevel: 5, amount: 1 },
            { id: "obj_kill_mad_mages", type: "kill_enemy", targetId: "MAD_MAGE", amount: 3 }
        ],
        rewards: { exp: 150, currency: 150, quests: ["shackled4"] }
    },
    "shackled4": {
        id: "shackled4",
        name: "Shackled",
        description: "You overhear one of the scholars babbling about power coming from the heavens while fixating on a strange rock. He speaks to it as if it were his own child.",
        objectives: [
            { id: "obj_reach_level_8", type: "party_level", targetLevel: 8, amount: 1 },
            { id: "obj_get_meteorite", type: "obtain_item", targetId: "meteorite", amount: 1 }
        ],
        rewards: { exp: 200, currency: 200, quests: ["shackled5"] }
    },
    "shackled5": {
        id: "shackled5",
        name: "Shackled",
        description: "You notice the madmen seem to be drawn to the meteorite. They seem to coordinate their efforts in retrieving it and bringing it to someone named Darius.",
        objectives: [
            { id: "obj_kill_darius", type: "kill_enemy", targetId: "DARIUS_THE_GROVELER", amount: 1 }
        ],
        rewards: { exp: 300, currency: 300 }
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
        description: "You notice some of the afflicted appear to exhibit less madness than others, perhaps you can help one of them.",
        objectives: [
            { id: "obj_cure_madmen", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 },
            { id: "obj_cure_madmage", type: "kill_enemy", targetId: "MAD_MAGE", amount: 2 },
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
    description: 'Prove your worth by forging an Iron Sword.',
    objectives: [
        { 
            type: 'craft',
            targetId: 'iron_sword', 
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
        description: "You traveled far to see the incredible magical discoveries of Altus. However your skip was delayed, and you arrived weeks late. After finally arriving, outside the gates, you notice a group of men behaving eratically. They laugh manically as their eyes are filled with an equally manic gleam. Though you have never used a sword, your hand insinctvly reachers for the hilt of your blade.",
        objectives: [
            { id: "obj_trav1", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_traveler_2"] }
    },
    "bg_traveler_2": {
        id: "bg_traveler_2",
        name: "Stark Contrast",
        description: "You can see the impressive architecture of the captial in the distance as you recount the stories of the wonders of the Altus Kingdom. However you notice the surrounding villages seemd to lie in ruins and the air is foul. Perhaps traveling by the country side would be more fruitful?  ",
        objectives: [
            { id: "obj_trav2", type: "obtain_item", targetId: "healing_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_traveler_3"] }
    },
    "bg_traveler_3": {
        id: "bg_traveler_3",
        name: "The Horrifying Truth",
        description: 'You came seeking "magic," only to find men maniacally tossing a ball of fire. An armored guard forcefully scatters them and snatches the flame—only to instantly succumb to the same crazed laughter.',
        objectives: [
            { id: "obj_trav3", type: "kill_enemy", targetId: "LEGIONARY", amount: 1 }
        ],
        rewards: { 
            exp: 150, 
            items: [{ id: "cloth_shoes", amount: 1 }], 
            currency: 50 
        }
    },

    // ========================================================
    // BLACKSMITH QUESTLINE
    // ========================================================
    "bg_blacksmith_1": {
        id: "bg_blacksmith_1",
        name: "A Desperate Order",
        description: "Business has been slow since the discovery of the artifact. You haven't had a customer in days. But today, a man stumble upon a man on the road, desperate for a sword. Under normal circumstances you'd question the man, but your instincts tell you this is urgent. Obtain the materials to make a sword.",
        objectives: [
            { id: "obj_bs1", type: "obtain_item", targetId: "iron_ingot", amount: 1 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_blacksmith_2"] }
    },
    "bg_blacksmith_2": {
        id: "bg_blacksmith_2",
        name: "Hard Work",
        description: 'Forging a sword is hard work. You recall a patch of your favorite herbs grows nearby, a perfect snack to recover your strength.',
        objectives: [
            { id: "obj_bs2", type: "obtain_item", targetId: "invigorating_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_blacksmith_3"] }
    },
    "bg_blacksmith_3": {
        id: "bg_blacksmith_3",
        name: "The Cost of Enabling",
        description: "On your way to deliver the man's sword, You see a man howling at the sky. Your stomache churns as you realize that its your customer.",
        objectives: [
            { id: "obj_bs3", type: "kill_enemy", targetId: "MAD_MAN", amount: 1 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "shortsword", amount: 1 },
                { id: "iron_gauntlets", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // RANGER QUESTLINE
    // ========================================================
    "bg_ranger_1": {
        id: "bg_ranger_1",
        name: "The Shifting Hunt",
        description: "You retreated to the woods to escape the city's obsession with magic. But the wildlife is changing, growing strange cysts and acting rabid. Cull the mutating beasts before they spread.",
        objectives: [
            { id: "obj_ran1", type: "kill_enemy", targetId: "DOG", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_ranger_2"] }
    },
    "bg_ranger_2": {
        id: "bg_ranger_2",
        name: "The Bleeding Earth",
        description: "You track the mutations to a stream flowing from the capital. The water itself is glowing with arcane runoff. Gather uncontaminated herbs from deeper in the forest.",
        objectives: [
            { id: "obj_ran2", type: "obtain_item", targetId: "healing_herb", amount: 3 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_ranger_3"] }
    },
    "bg_ranger_3": {
        id: "bg_ranger_3",
        name: "Unnatural Prey",
        description: "Fellow rangers have gone mad after drinking the tainted water, turning into the very unnatural things you now hunt. The artifact is bleeding a curse into the soil of Altus.",
        objectives: [
            { id: "obj_ran3", type: "kill_enemy", targetId: "ROTTER", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "dagger", amount: 1 },
                { id: "leather_armor", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // SCHOLAR QUESTLINE
    // ========================================================
    "bg_scholar_1": {
        id: "bg_scholar_1",
        name: "A Dangerous Hypothesis",
        description: "You and your colleagues abandoned traditional studies for magic. One colleague hypothesized that magic was life itself. Today, he proved it by going rabid and attacking you. Subdue him.",
        objectives: [
            { id: "obj_sch1", type: "kill_enemy", targetId: "MAD_MAGE", amount: 1 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_scholar_2"] }
    },
    "bg_scholar_2": {
        id: "bg_scholar_2",
        name: "Erratic Variables",
        description: "You attempt to analyze the magical residue on your colleague's notes. The energy is wildly erratic, causing intense migraines just by proximity. Gather herbs to focus your mind.",
        objectives: [
            { id: "obj_sch2", type: "obtain_item", targetId: "illuminating_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_scholar_3"] }
    },
    "bg_scholar_3": {
        id: "bg_scholar_3",
        name: "A Flawed Science",
        description: "The horrifying truth reveals itself. The energy from the artifact is inherently corrosive to the human mind. Magic isn't a new science; it is a sickness driving the scholars mad.",
        objectives: [
            { id: "obj_sch3", type: "kill_enemy", targetId: "MAD_MAGE", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "insight_of_arcane", amount: 1 },
                { id: "cloth_robe", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // WARRIOR QUESTLINE
    // ========================================================
    "bg_warrior_1": {
        id: "bg_warrior_1",
        name: "A New Fear",
        description: "Warriors of Altus used to be respected. Now, they are feared. Your fellow guardsmen stand like statues, attacking with mindless, terrifying brutality when approached. Defend yourself.",
        objectives: [
            { id: "obj_war1", type: "kill_enemy", targetId: "LEGIONARY", amount: 2 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_warrior_2"] }
    },
    "bg_warrior_2": {
        id: "bg_warrior_2",
        name: "The Cursed Orders",
        description: "You find standing orders commanding the guards to accept the artifact's power to enhance their strength. Search the barracks for gear untainted by this magic.",
        objectives: [
            { id: "obj_war2", type: "obtain_item", targetId: "stone", amount: 2 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_warrior_3"] }
    },
    "bg_warrior_3": {
        id: "bg_warrior_3",
        name: "Monsters in Armor",
        description: "You watch a guard's mind snap completely, reducing him to a raving brute. The artifact hasn't made them elite soldiers; it has cursed them into mindless, terrifying monsters.",
        objectives: [
            { id: "obj_war3", type: "kill_enemy", targetId: "LEGIONARY", amount: 3 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "handaxe", amount: 1 },
                { id: "iron_armor", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // THIEF QUESTLINE
    // ========================================================
    "bg_thief_1": {
        id: "bg_thief_1",
        name: "Easy Pickings",
        description: "The wealthy nobles are so obsessed with their new magic they don't even notice you picking their pockets. However, their obsession has turned violent. Knock out the crazed servants.",
        objectives: [
            { id: "obj_thf1", type: "kill_enemy", targetId: "MAD_MAN", amount: 2 }
        ],
        rewards: { exp: 50, currency: 30, quests: ["bg_thief_2"] }
    },
    "bg_thief_2": {
        id: "bg_thief_2",
        name: "The Glowing Stash",
        description: "You break into a vault, only to find the nobles traded their gold for glowing artifacts that make you dizzy and nauseous. Gather what little normal valuables remain.",
        objectives: [
            { id: "obj_thf2", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 60, quests: ["bg_thief_3"] }
    },
    "bg_thief_3": {
        id: "bg_thief_3",
        name: "Poverty's Blessing",
        description: "The nobles hoarded the magic for themselves, and it ate their sanity from the inside out. Your poverty saved you from the kingdom's curse.",
        objectives: [
            { id: "obj_thf3", type: "kill_enemy", targetId: "ROTTER", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [{ id: "leather_boots", amount: 1 }], 
            currency: 150 
        }
    },

    // ========================================================
    // HERMIT QUESTLINE
    // ========================================================
    "bg_hermit_1": {
        id: "bg_hermit_1",
        name: "Solitary Studies",
        description: "Studying far away from the artifact has kept you safe, but travelers passing your camp are clawing at their ears. Now, you hear a maddening static. Gather herbs for a warding ritual.",
        objectives: [
            { id: "obj_her1", type: "obtain_item", targetId: "illuminating_herb", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_hermit_2"] }
    },
    "bg_hermit_2": {
        id: "bg_hermit_2",
        name: "The Fringe Effects",
        description: "Your warding ritual clears your head, but your sanity acts as a beacon. Maddened citizens are swarming your solitary camp, enraged by your clear mind.",
        objectives: [
            { id: "obj_her2", type: "kill_enemy", targetId: "MAD_MAN", amount: 4 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_hermit_3"] }
    },
    "bg_hermit_3": {
        id: "bg_hermit_3",
        name: "A Cursed Proximity",
        description: "Even out here, the static persists. The artifact radiates a corrupting frequency. The 'magic' is a curse, and anyone who draws near to it is doomed to lose their mind.",
        objectives: [
            { id: "obj_her3", type: "kill_enemy", targetId: "MAD_MAGE", amount: 1 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "insight_of_fire", amount: 1 },
                { id: "cloth_hood", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // FARMER QUESTLINE
    // ========================================================
    "bg_farmer_1": {
        id: "bg_farmer_1",
        name: "Unchanging Fields",
        description: "While the cities went mad with magic, your life didn't change. But today, city folk arrived on your farm on all fours, tearing up crops to eat dirt-covered roots. Drive them off.",
        objectives: [
            { id: "obj_far1", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 }
        ],
        rewards: { exp: 50, currency: 20, quests: ["bg_farmer_2"] }
    },
    "bg_farmer_2": {
        id: "bg_farmer_2",
        name: "Holding the Line",
        description: "More of them are coming. They act less like starving men and more like rabid animals. You are prepared for this. Gather materials to barricade your fences.",
        objectives: [
            { id: "obj_far2", type: "obtain_item", targetId: "stone", amount: 4 }
        ],
        rewards: { exp: 100, currency: 40, quests: ["bg_farmer_3"] }
    },
    "bg_farmer_3": {
        id: "bg_farmer_3",
        name: "The Prepared Suffer",
        description: "They break through the fences. You realize they aren't starving for food; the magic from the artifact has left them cursed and empty. The kingdom fell while you were tending your fields.",
        objectives: [
            { id: "obj_far3", type: "kill_enemy", targetId: "ROTTER", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "healing_herb", amount: 3 },
                { id: "leather_leggings", amount: 1 }
            ], 
            currency: 50 
        }
    },

    // ========================================================
    // BOUNTY HUNTER QUESTLINE
    // ========================================================
    "bg_bounty_hunter_1": {
        id: "bg_bounty_hunter_1",
        name: "The Irony of the Hunt",
        description: "Demand is high to hunt the mad. Ironically, your latest mark is a fellow, highly-skilled bounty hunter who lost his mind. Track him down and end it.",
        objectives: [
            { id: "obj_bh1", type: "kill_enemy", targetId: "SHADY_MERCHANT", amount: 1 }
        ],
        rewards: { exp: 50, currency: 50, quests: ["bg_bounty_hunter_2"] }
    },
    "bg_bounty_hunter_2": {
        id: "bg_bounty_hunter_2",
        name: "Lethal Madness",
        description: "You loot his belongings and find his Alterian sword heavily warped by foul magic. Gather untainted supplies from his camp.",
        objectives: [
            { id: "obj_bh2", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 100, currency: 60, quests: ["bg_bounty_hunter_3"] }
    },
    "bg_bounty_hunter_3": {
        id: "bg_bounty_hunter_3",
        name: "No One is Immune",
        description: "His journals reveal the truth. He didn't snap from stress; the kingdom's magical trinkets melted his mind. The best hunters become the worst monsters when the curse takes them.",
        objectives: [
            { id: "obj_bh3", type: "kill_enemy", targetId: "LEGIONARY", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [
                { id: "shortsword", amount: 1 },
                { id: "leather_helmet", amount: 1 }
            ], 
            currency: 80 
        }
    },

    // ========================================================
    // DISEASED QUESTLINE
    // ========================================================
    "bg_diseased_1": {
        id: "bg_diseased_1",
        name: "The 'Cure'",
        description: "You were taken for treatment for early signs of madness. They exposed you to the artifact's influence, but it only made the delirium worse. Brew a natural concoction to clear your head.",
        objectives: [
            { id: "obj_dis1", type: "obtain_item", targetId: "healing_herb", amount: 2 }
        ],
        rewards: { exp: 50, currency: 10, quests: ["bg_diseased_2"] }
    },
    "bg_diseased_2": {
        id: "bg_diseased_2",
        name: "Failing Treatments",
        description: "The concoction wears off quickly. You track down the scholar who 'treated' you, only to find him violently thrashing in the dirt, madder than his patients. Defeat him.",
        objectives: [
            { id: "obj_dis2", type: "kill_enemy", targetId: "MAD_MAGE", amount: 1 }
        ],
        rewards: { exp: 100, currency: 30, quests: ["bg_diseased_3"] }
    },
    "bg_diseased_3": {
        id: "bg_diseased_3",
        name: "A Toxic Remedy",
        description: "Reading the scholar's notes, the horror sets in. The artifact's light doesn't cure madness; it causes it. The magic itself is the sickness cursing Altus.",
        objectives: [
            { id: "obj_dis3", type: "kill_enemy", targetId: "ROTTER", amount: 2 }
        ],
        rewards: { 
            exp: 150, 
            items: [{ id: "cloth_gloves", amount: 1 }], // Replaced the generic tattered_hood with cloth_gloves
            currency: 50 
        }
    }
};
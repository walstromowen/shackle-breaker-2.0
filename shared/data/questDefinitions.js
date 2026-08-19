export const QuestDefinitions = {
    "shackled1": {
        id: "shackled1",
        name: "Shackled",
        description: "You wake up with shackles around your wrists. Though the chain connecting them is broken, the shackles remain locked.",
        objectives: [
            { id: "obj_reach_level_2", type: "party_level", targetLevel: 2, amount: 1 },
        ],
        rewards: {
            exp: 50,
            currency: 50,
            quests: ["shackled2"]
        }
    },
    "shackled2": {
        id: "shackled2",
        name: "Shackled",
        description: "You notice that many of the people here also have shackles on their wrists. They laugh wildly in the streets as if sharing the same hallucination, what happened here?",
        objectives: [
            { id: "obj_kill_madmen_part_2", type: "kill_enemy", targetId: "MAD_MAN", amount: 3 },
            { id: "obj_reach_level_3", type: "party_level", targetLevel: 3, amount: 1 }
        ],
        rewards: {
            exp: 100,
            currency: 100,
            quests: ["shackled3"]
        }
    },
    "shackled3": {
        id: "shackled3",
        name: "Shackled",
        description: "On examination of your shackles, you notice there is no keyhole. Your spirit weighs as heavy on you as the shackles themselves. Perhaps one of the scholars can help you, if there are any left.",
        objectives: [
            { id: "obj_reach_level_5", type: "party_level", targetLevel: 5, amount: 1 },
            { id: "obj_kill_mad_mages", type: "kill_enemy", targetId: "MAD_MAGE", amount: 3 },
        ],
        rewards: {
            exp: 150,
            currency: 150,
            quests: ["shackled4"]
        }
    },
    "shackled4": {
        id: "shackled4",
        name: "Shackled",
        description: "You overhear one of the scholars babbling about power coming from the heavens while fixating on a strange rock. He speaks to it as if it were his own child. ",
        objectives: [
            { id: "obj_reach_level_8", type: "party_level", targetLevel: 8, amount: 1 },
            { id: "obj_get_meteorite", type: "obtain_item", targetId: "meteorite", amount: 1 }
        ],
        rewards: {
            exp: 200,
            currency: 200,
            quests: ["shackled5"]
        }
    },
    "shackled5": {
        id: "shackled5",
        name: "Shackled",
        description: "You notice the madmen seem to be drawn to the meteorite. They seem to coordinate their efforts in retrieving it and bringing it to someone named Darius.",
        objectives: [
            { id: "obj_kill_darius", type: "kill_enemy", targetId: "DARIUS_THE_GROVELER", amount: 1 }
        ],
        rewards: {
            exp: 300,
            currency: 300
        }
    },
    "cursed_populance": {
        id: "cursed_populance",
        name: "Cursed Populance",
        description: "The entire town seems to be afflicted with a strange madness. The people here are not themselves, are they even still human?",
        objectives: [
            { 
                id: "obj_kill_madmen", 
                type: "kill_enemy", 
                targetId: "MAD_MAN", 
                amount: 3 
            }
        ],
        rewards: { 
            exp: 50, 
            currency: 100 
        }
    },
    "unnatural_flora": {
        id: "unnatural_flora",
        name: "Unnatural Flora",
        description: "Once ordinary flora seems to pulse with an otherworldly energy.",
        objectives: [
            { 
                id: "obj_get_healing_herbs", 
                type: "obtain_item", 
                targetId: "healing_herb", 
                amount: 2 
            },
            { 
                id: "obj_get_invigorating_herbs", 
                type: "obtain_item", 
                targetId: "invigorating_herb", 
                amount: 2 
            }
        ],
        rewards: { 
            exp: 50, 
            items: [ 
                { id: "insight_of_earth", amount: 1 } 
            ], 
            currency: 50, 
            quests: ["cure_the_afflicted"] 
        }
    },
    "men_no_less": {
        id: "men_no_less",
        name: "Men No Less",
        description: "You notice some of the afflicted appear to exhibit less madness than others, perhaps you can help one of them.",
        objectives: [
            { 
                id: "obj_cure_madmen", 
                type: "kill_enemy", 
                targetId: "MAD_MAN", 
                amount: 2 
            },
            { 
                id: "obj_cure_madmage", 
                type: "kill_enemy", 
                targetId: "MAD_MAGE", 
                amount: 2 
            },
            { 
                id: "obj_cure_madmen", 
                type: "kill_enemy", 
                targetId: "ROTTER", 
                amount: 2 
            }
        ],
        rewards: { 
            exp: 75, 
            currency: 150, 
            companions: [ 
                { 
                    id: "MAD_MAN", 
                    overrides: { name: "survivor" } 
                } 
            ] 
        }
    }
};
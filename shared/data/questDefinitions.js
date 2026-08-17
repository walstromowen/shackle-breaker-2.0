export const QuestDefinitions = {
    "q_tutorial_combat": {
        id: "q_tutorial_combat",
        name: "First Blood",
        description: "Something is wrong with the populace. They seem mad and behave like wild animals.",
        objectives: [
            { 
                id: "obj_kill_madmen", 
                type: "kill_enemy", 
                targetId: "MAD_MAN", // Updated to match ENTITY_DEFINITIONS key
                amount: 3 
            }
        ],
        rewards: { 
            exp: 50, 
            currency: 100 
        }
    },
    "q_fetch_herbs": {
        id: "q_fetch_herbs",
        name: "The Healer's Request",
        description: "Gather medicinal herbs to help treat the growing number of afflicted in the area.",
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
            // ---> NEW: Awards the follow-up quest <---
            quests: ["q_cure_the_afflicted"] 
        }
    },
    "q_hero_training": {
        id: "q_hero_training",
        name: "Path to Power",
        description: "Reach level 5 with any party member to prepare for the horrors ahead.",
        objectives: [
            { 
                id: "obj_level_up", 
                type: "party_level", 
                targetLevel: 5, 
                amount: 1 
            }
        ],
        rewards: { 
            exp: 50,
            items: [
                { id: "shortsword", amount: 1 }, // Used an actual weapon referenced in character creation
                { id: "iron_ingot", amount: 3 }  // Added materials to make it more rewarding
            ] 
        }
    },
    "q_cure_the_afflicted": {
        id: "q_cure_the_afflicted",
        name: "Administer the Cure",
        description: "The healer has crafted a remedy from the herbs you gathered. Subdue the afflicted and administer the cure.",
        objectives: [
            {
                id: "obj_cure_madmen",
                type: "kill_enemy", 
                targetId: "MAD_MAN",
                amount: 0
            }
        ],
        rewards: {
            exp: 75,
            currency: 150,
            items: [
                { id: "healing_herb", amount: 3 }
            ],
            // ---> NEW: Companion Reward <---
            companions: [
                { 
                    id: "MAD_MAN", // Must match an entity ID in your definitions
                    overrides: { name: "Elara the Grateful" } 
                }
            ]
        }
    }
};
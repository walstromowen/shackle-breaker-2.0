export const SpawnTableDefinitions = {

    // ==========================================
    // PLAINS BATTLES - DAY
    // ==========================================
    "plains_battles_day": {
        type: "faction_pool",
        pools: [
            {
                factionId: "wildlife",
                weight: 60,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 2 },
                    normal: { minSize: 1, maxSize: 2 },
                    hard: { minSize: 1, maxSize: 2 },
                    nightmare: { minSize: 1, maxSize: 3 }
                },
                members: [
                    { id: 'WOLF', weight: 100, modifiers: { levelOffset: { chance: 0.2, min: 1, max: 2 } } }
                ]
            },
            {
                factionId: "shackled",
                weight: 40,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 1 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 1, maxSize: 4 },
                    nightmare: { minSize: 1, maxSize: 5 }
                },
                members: [
                    { id: 'ROTTER', weight: 40 },
                    { id: 'MAD_MAN', weight: 30, modifiers: { equipment: [{ slot: 'mainHand', items: ['dagger', 'wooden_stick'], chance: 0.5 }] } },
                    { id: 'SHACKLED_STEED', weight: 20 },
                    { id: 'LEGIONARY', weight: 70, modifiers: { levelOffset: { chance: 0.3, min: -1, max: 2 }, equipment: [{ slot: 'mainHand', items: ['warhammer', 'spear'], chance: 0.3 }], traits: [{ id: 'iron_willed', chance: 0.15 }] } },
                    { id: 'MAD_MAGE', weight: 30 }
                ]
            }
        ]
    },

    // ==========================================
    // PLAINS BATTLES - NIGHT
    // ==========================================
    "plains_battles_night": {
        type: "faction_pool",
        pools: [
            {
                factionId: "cursedwildlife",
                weight: 40,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 3 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 1, maxSize: 4 },
                    nightmare: { minSize: 1, maxSize: 4 }
                },
                members: [
                    { id: 'GRIM_STAG', weight: 100, modifiers: { levelOffset: { chance: 0.1, min: 2, max: 3 } } }
                ]
            },
            {
                factionId: "shackled",
                weight: 60,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 1 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 1, maxSize: 4 },
                    nightmare: { minSize: 1, maxSize: 5 }
                },
                members: [
                    { id: 'ROTTER', weight: 40 },
                    { id: 'MAD_MAN', weight: 30, modifiers: { equipment: [{ slot: 'mainHand', items: ['dagger', 'wooden_stick'], chance: 0.5 }] } },
                    { id: 'SHACKLED_STEED', weight: 20 },
                    { id: 'HOLLOW_HARVESTER', weight: 80, modifiers: { levelOffset: { chance: 0.5, min: 1, max: 2 } } },
                    { id: 'LEGIONARY', weight: 70, modifiers: { levelOffset: { chance: 0.3, min: -1, max: 2 }, equipment: [{ slot: 'mainHand', items: ['warhammer', 'spear'], chance: 0.3 }], traits: [{ id: 'iron_willed', chance: 0.15 }] } },
                    { id: 'MAD_MAGE', weight: 30 }
                ]
            }
        ]
    },

    // ==========================================
    // DESERT BATTLES - DAY
    // ==========================================
    "desert_battles_day": {
        type: "faction_pool",
        pools: [
            {
                factionId: "wildlife",
                weight: 30,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 2 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 2, maxSize: 4 },
                    nightmare: { minSize: 3, maxSize: 5 }
                },
                members: [
                    { id: 'DUNE_MAW', weight: 60 },
                    { id: 'THUNDER_LOCUST', weight: 40, modifiers: { levelOffset: { chance: 0.3, min: 1, max: 3 } } }
                ]
            },
            {
                factionId: "shifting_sands",
                weight: 40,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 2 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 1, maxSize: 4 },
                    nightmare: { minSize: 1, maxSize: 5 }
                },
                members: [
                    { id: 'SAND_STALKER', weight: 70, modifiers: { levelOffset: { chance: 0.2, min: 1, max: 2 } } },
                    { id: 'CALCIFIED_CRUSADER', weight: 30, modifiers: { levelOffset: { chance: 0.25, min: 1, max: 2 } } }
                ]
            },
            {
                factionId: "shackled",
                weight: 30,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 1 },
                    normal: { minSize: 1, maxSize: 2 },
                    hard: { minSize: 1, maxSize: 4 },
                    nightmare: { minSize: 1, maxSize: 6 }
                },
                members: [
                    { id: 'SCORCHED_VAGRANT', weight: 100 }
                ]
            }
        ]
    },

    // ==========================================
    // DESERT BATTLES - NIGHT
    // ==========================================
    "desert_battles_night": {
        type: "faction_pool",
        pools: [
            {
                factionId: "cursedwildlife",
                weight: 30,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 2 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 2, maxSize: 4 },
                    nightmare: { minSize: 3, maxSize: 5 }
                },
                members: [
                    { id: 'DUNE_MAW', weight: 60 },
                    { id: 'THUNDER_LOCUST', weight: 40, modifiers: { levelOffset: { chance: 0.3, min: 1, max: 3 } } }
                ]
            },
            {
                factionId: "shifting_sands",
                weight: 35,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 2 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 2, maxSize: 4 },
                    nightmare: { minSize: 3, maxSize: 5 }
                },
                members: [
                    { id: 'SAND_STALKER', weight: 50, modifiers: { levelOffset: { chance: 0.2, min: 1, max: 2 } } },
                    { id: 'MIRAGEWRIGHT', weight: 25, modifiers: { levelOffset: { chance: 0.5, min: 1, max: 2 } } },
                    { id: 'CALCIFIED_CRUSADER', weight: 25, modifiers: { levelOffset: { chance: 0.3, min: 1, max: 3 } } }
                ]
            },
            {
                factionId: "shackled",
                weight: 35,
                difficultySettings: {
                    easy: { minSize: 1, maxSize: 1 },
                    normal: { minSize: 1, maxSize: 3 },
                    hard: { minSize: 2, maxSize: 4 },
                    nightmare: { minSize: 2, maxSize: 6 }
                },
                members: [
                    { id: 'SCORCHED_VAGRANT', weight: 100 }
                ]
            }
        ]
    },

    // ==========================================
    // ENCOUNTER BATTLES (Triggered via Events)
    // ==========================================
    "madman_pack": {
        type: "faction_pool",
        pools: [{
            factionId: "shackled",
            weight: 100,
            difficultySettings: {
                easy: { minSize: 2, maxSize: 2 },
                normal: { minSize: 3, maxSize: 3 },
                hard: { minSize: 4, maxSize: 4 },
                nightmare: { minSize: 5, maxSize: 6 }
            },
            members: [{ id: 'MAD_MAN', weight: 100 }, { id: 'MAD_MAGE', weight: 100 }, { id: 'ROTTER', weight: 100 }]
        }]
    },

    "wolf_pack": {
        type: "faction_pool",
        pools: [{
            factionId: "wildlife",
            weight: 100,
            difficultySettings: {
                easy: { minSize: 2, maxSize: 3 },
                normal: { minSize: 3, maxSize: 3 },
                hard: { minSize: 4, maxSize: 5 },
                nightmare: { minSize: 5, maxSize: 7 }
            },
            members: [{ id: 'WOLF', weight: 100 }]
        }]
    },

    "rabid_dog": {
        type: "faction_pool",
        pools: [{
            factionId: "wildlife",
            weight: 100,
            difficultySettings: {
                easy: { minSize: 1, maxSize: 1 },
                normal: { minSize: 1, maxSize: 1 },
                hard: { minSize: 1, maxSize: 2 },
                nightmare: { minSize: 2, maxSize: 3 }
            },
            members: [{ id: 'DOG', weight: 100, modifiers: { levelOffset: { chance: 1, min: 1, max: 2 } } }]
        }]
    },

    "dark_spirit": {
        type: "faction_pool",
        pools: [{
            factionId: "supernatural",
            weight: 100,
            difficultySettings: {
                easy: { minSize: 1, maxSize: 1 },
                normal: { minSize: 1, maxSize: 1 },
                hard: { minSize: 1, maxSize: 2 },
                nightmare: { minSize: 2, maxSize: 2 }
            },
            members: [{ id: 'DARK_SPIRIT', weight: 100, modifiers: { levelOffset: { chance: 1, min: 2, max: 4 } } }]
        }]
    },

    "biome_ambush": {
        type: "faction_pool",
        pools: [
            {
                factionId: "shackled",
                weight: 50,
                difficultySettings: {
                    easy: { minSize: 2, maxSize: 2 },
                    normal: { minSize: 2, maxSize: 2 },
                    hard: { minSize: 3, maxSize: 3 },
                    nightmare: { minSize: 4, maxSize: 5 }
                },
                members: [
                    { id: 'MAD_MAN', weight: 60 },
                    { id: 'ROTTER', weight: 40 }
                ]
            },
            {
                factionId: "wildlife",
                weight: 50,
                difficultySettings: {
                    easy: { minSize: 2, maxSize: 2 },
                    normal: { minSize: 2, maxSize: 2 },
                    hard: { minSize: 3, maxSize: 3 },
                    nightmare: { minSize: 4, maxSize: 5 }
                },
                members: [
                    { id: 'WOLF', weight: 100 }
                ]
            }
        ]
    }
};
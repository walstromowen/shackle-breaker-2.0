export const LootTableDefinitions = {
    // ==========================================
    // WEIGHTED POOLS (Pick exactly 1 item per roll)
    // ==========================================
    "basic_materials_pool": {
        type: "weighted",
        items: [
            { id: "soft_wood", weight: 60, min: 1, max: 3 },
            { id: "stone", weight: 30, min: 1, max: 2 },
            { id: "leather", weight: 10 } // Defaults to 1 if min/max omitted
        ]
    },
    "basic_weapons_pool": {
        type: "weighted",
        items: [
            { id: "dagger", weight: 50 },
            { id: "shortsword", weight: 30 },
            { id: "spear", weight: 20 }
        ]
    },
    "plains": {
        type: "weighted",
        items: [
            // --- MATERIALS (High Drop Rate, Multiple Quantities) ---
            { id: "soft_wood", weight: 50, min: 1, max: 3 },
            { id: "stone", weight: 50, min: 1, max: 3 },
            { id: "leather", weight: 40, min: 1, max: 2 },
            { id: "iron_ingot", weight: 20, min: 1, max: 2 },

            // --- CONSUMABLES (Medium Drop Rate, Multiple Quantities) ---
            { id: "healing_herb", weight: 40, min: 1, max: 2 },
            { id: "invigorating_herb", weight: 40, min: 1, max: 2 },
            { id: "illuminating_herb", weight: 40, min: 1, max: 2 },
            { id: "kurtus_brew", weight: 5, min: 1, max: 1 },

            // --- WEAPONS & SHIELDS (Standard Drop Rate) ---
            { id: "wooden_stick", weight: 30, min: 1, max: 1 },
            { id: "dagger", weight: 20, min: 1, max: 1 },
            { id: "shortsword", weight: 15, min: 1, max: 1 },
            { id: "handaxe", weight: 15, min: 1, max: 1 },
            { id: "warhammer", weight: 10, min: 1, max: 1 },
            { id: "spear", weight: 15, min: 1, max: 1 },
            { id: "wooden_buckler", weight: 20, min: 1, max: 1 },
            { id: "scythe", weight: 15, min: 1, max: 1 },

            // --- INSIGHT WEAPONS (Rare Drop Rate) ---
            { id: "insight_of_fire", weight: 5, min: 1, max: 1 },
            { id: "insight_of_water", weight: 5, min: 1, max: 1 },
            { id: "insight_of_earth", weight: 5, min: 1, max: 1 },
            { id: "insight_of_lightning", weight: 5, min: 1, max: 1 },
            { id: "insight_of_ice", weight: 5, min: 1, max: 1 },
            { id: "insight_of_wind", weight: 5, min: 1, max: 1 },
            { id: "insight_of_arcane", weight: 5, min: 1, max: 1 },
            { id: "insight_of_light", weight: 5, min: 1, max: 1 },
            { id: "insight_of_darkness", weight: 5, min: 1, max: 1 },

            // --- TATTERED ARMOR (Common Drop Rate) ---
            { id: "tattered_hood", weight: 25, min: 1, max: 1 },
            { id: "tattered_shirt", weight: 25, min: 1, max: 1 },
            { id: "tattered_gloves", weight: 25, min: 1, max: 1 },
            { id: "tattered_pants", weight: 25, min: 1, max: 1 },
            { id: "tattered_boots", weight: 25, min: 1, max: 1 },

            // --- CLOTH ARMOR (Standard Drop Rate) ---
            { id: "cloth_hood", weight: 15, min: 1, max: 1 },
            { id: "cloth_robe", weight: 15, min: 1, max: 1 },
            { id: "cloth_gloves", weight: 15, min: 1, max: 1 },
            { id: "cloth_pants", weight: 15, min: 1, max: 1 },
            { id: "cloth_shoes", weight: 15, min: 1, max: 1 },

            // --- LEATHER ARMOR (Uncommon Drop Rate) ---
            { id: "leather_helmet", weight: 10, min: 1, max: 1 },
            { id: "leather_armor", weight: 10, min: 1, max: 1 },
            { id: "leather_bracers", weight: 10, min: 1, max: 1 },
            { id: "leather_leggings", weight: 10, min: 1, max: 1 },
            { id: "leather_boots", weight: 10, min: 1, max: 1 },

            // --- IRON ARMOR (Rare Drop Rate) ---
            { id: "iron_helmet", weight: 5, min: 1, max: 1 },
            { id: "iron_armor", weight: 5, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 5, min: 1, max: 1 },
            { id: "iron_greaves", weight: 5, min: 1, max: 1 },
            { id: "iron_boots", weight: 5, min: 1, max: 1 }
        ]
    },
    "desert": {
        type: "weighted",
        items: [
            // --- MATERIALS (High Drop Rate, Multiple Quantities) ---
            { id: "soft_wood", weight: 50, min: 1, max: 3 },
            { id: "stone", weight: 50, min: 1, max: 3 },
            { id: "leather", weight: 40, min: 1, max: 2 },
            { id: "iron_ingot", weight: 20, min: 1, max: 2 },

            // --- CONSUMABLES (Medium Drop Rate, Multiple Quantities) ---
            { id: "healing_herb", weight: 40, min: 1, max: 2 },
            { id: "invigorating_herb", weight: 40, min: 1, max: 2 },
            { id: "illuminating_herb", weight: 40, min: 1, max: 2 },
            { id: "kurtus_brew", weight: 5, min: 1, max: 1 },

            // --- WEAPONS & SHIELDS (Standard Drop Rate) ---
            { id: "wooden_stick", weight: 30, min: 1, max: 1 },
            { id: "dagger", weight: 20, min: 1, max: 1 },
            { id: "shortsword", weight: 15, min: 1, max: 1 },
            { id: "handaxe", weight: 15, min: 1, max: 1 },
            { id: "warhammer", weight: 10, min: 1, max: 1 },
            { id: "spear", weight: 15, min: 1, max: 1 },
            { id: "wooden_buckler", weight: 20, min: 1, max: 1 },
            { id: "scythe", weight: 15, min: 1, max: 1 },

            // --- INSIGHT WEAPONS (Rare Drop Rate) ---
            { id: "insight_of_fire", weight: 5, min: 1, max: 1 },
            { id: "insight_of_water", weight: 5, min: 1, max: 1 },
            { id: "insight_of_earth", weight: 5, min: 1, max: 1 },
            { id: "insight_of_lightning", weight: 5, min: 1, max: 1 },
            { id: "insight_of_ice", weight: 5, min: 1, max: 1 },
            { id: "insight_of_wind", weight: 5, min: 1, max: 1 },
            { id: "insight_of_arcane", weight: 5, min: 1, max: 1 },
            { id: "insight_of_light", weight: 5, min: 1, max: 1 },
            { id: "insight_of_darkness", weight: 5, min: 1, max: 1 },

            // --- TATTERED ARMOR (Common Drop Rate) ---
            { id: "tattered_hood", weight: 25, min: 1, max: 1 },
            { id: "tattered_shirt", weight: 25, min: 1, max: 1 },
            { id: "tattered_gloves", weight: 25, min: 1, max: 1 },
            { id: "tattered_pants", weight: 25, min: 1, max: 1 },
            { id: "tattered_boots", weight: 25, min: 1, max: 1 },

            // --- CLOTH ARMOR (Standard Drop Rate) ---
            { id: "cloth_hood", weight: 15, min: 1, max: 1 },
            { id: "cloth_robe", weight: 15, min: 1, max: 1 },
            { id: "cloth_gloves", weight: 15, min: 1, max: 1 },
            { id: "cloth_pants", weight: 15, min: 1, max: 1 },
            { id: "cloth_shoes", weight: 15, min: 1, max: 1 },

            // --- LEATHER ARMOR (Uncommon Drop Rate) ---
            { id: "leather_helmet", weight: 10, min: 1, max: 1 },
            { id: "leather_armor", weight: 10, min: 1, max: 1 },
            { id: "leather_bracers", weight: 10, min: 1, max: 1 },
            { id: "leather_leggings", weight: 10, min: 1, max: 1 },
            { id: "leather_boots", weight: 10, min: 1, max: 1 },

            // --- IRON ARMOR (Rare Drop Rate) ---
            { id: "iron_helmet", weight: 5, min: 1, max: 1 },
            { id: "iron_armor", weight: 5, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 5, min: 1, max: 1 },
            { id: "iron_greaves", weight: 5, min: 1, max: 1 },
            { id: "iron_boots", weight: 5, min: 1, max: 1 }
        ]
    },

    // The caves: a chest, a stash or a dead explorer's pack. Ore, coal and flint skew high, plus bones, torches and the odd real find.
    "cave": {
        type: "weighted",
        items: [
            // --- MATERIALS (High Drop Rate) ---
            { id: "stone", weight: 60, min: 1, max: 4 },
            { id: "coal", weight: 40, min: 1, max: 3 },
            { id: "iron_ore", weight: 35, min: 1, max: 3 },
            { id: "copper_ore", weight: 25, min: 1, max: 2 },
            { id: "tin_ore", weight: 25, min: 1, max: 2 },
            { id: "flint", weight: 30, min: 1, max: 2 },
            { id: "bone", weight: 30, min: 1, max: 3 },
            { id: "iron_ingot", weight: 15, min: 1, max: 2 },
            { id: "bronze_ingot", weight: 6, min: 1, max: 1 },
            { id: "meteorite", weight: 1, min: 1, max: 1 },

            // --- CONSUMABLES ---
            { id: "torch", weight: 30, min: 1, max: 3 },
            { id: "healing_herb", weight: 25, min: 1, max: 2 },
            { id: "illuminating_herb", weight: 25, min: 1, max: 2 },
            { id: "bandage", weight: 20, min: 1, max: 2 },
            { id: "healing_tonic", weight: 6, min: 1, max: 1 },
            { id: "kurtus_brew", weight: 5, min: 1, max: 1 },

            // --- WEAPONS & SHIELDS ---
            { id: "pickaxe", weight: 12, min: 1, max: 1 },
            { id: "dagger", weight: 15, min: 1, max: 1 },
            { id: "shortsword", weight: 12, min: 1, max: 1 },
            { id: "handaxe", weight: 12, min: 1, max: 1 },
            { id: "warhammer", weight: 8, min: 1, max: 1 },
            { id: "wooden_buckler", weight: 12, min: 1, max: 1 },

            // --- INSIGHT WEAPONS (Rare) ---
            { id: "insight_of_earth", weight: 6, min: 1, max: 1 },
            { id: "insight_of_darkness", weight: 6, min: 1, max: 1 },
            { id: "insight_of_light", weight: 4, min: 1, max: 1 },
            { id: "insight_of_arcane", weight: 4, min: 1, max: 1 },
            { id: "insight_of_fire", weight: 3, min: 1, max: 1 },
            { id: "insight_of_ice", weight: 3, min: 1, max: 1 },

            // --- ARMOR ---
            { id: "tattered_hood", weight: 15, min: 1, max: 1 },
            { id: "tattered_shirt", weight: 15, min: 1, max: 1 },
            { id: "tattered_gloves", weight: 15, min: 1, max: 1 },
            { id: "tattered_pants", weight: 15, min: 1, max: 1 },
            { id: "tattered_boots", weight: 15, min: 1, max: 1 },
            { id: "leather_helmet", weight: 8, min: 1, max: 1 },
            { id: "leather_armor", weight: 8, min: 1, max: 1 },
            { id: "leather_bracers", weight: 8, min: 1, max: 1 },
            { id: "leather_leggings", weight: 8, min: 1, max: 1 },
            { id: "leather_boots", weight: 8, min: 1, max: 1 },
            { id: "iron_helmet", weight: 6, min: 1, max: 1 },
            { id: "iron_armor", weight: 6, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 6, min: 1, max: 1 },
            { id: "iron_greaves", weight: 6, min: 1, max: 1 },
            { id: "iron_boots", weight: 6, min: 1, max: 1 }
        ]
    },

    // ==========================================
    // AFTERMATH ENCOUNTER TABLES
    // ==========================================
    // Scavenging an old battlefield: weapons, armor and metal skew higher than the plains table.
    "battlefield_loot": {
        type: "weighted",
        items: [
            // --- MATERIALS ---
            { id: "iron_ingot", weight: 40, min: 1, max: 3 },
            { id: "leather", weight: 30, min: 1, max: 2 },

            // --- CONSUMABLES ---
            { id: "healing_herb", weight: 30, min: 1, max: 2 },
            { id: "kurtus_brew", weight: 8, min: 1, max: 1 },

            // --- WEAPONS & SHIELDS ---
            { id: "shortsword", weight: 25, min: 1, max: 1 },
            { id: "spear", weight: 25, min: 1, max: 1 },
            { id: "handaxe", weight: 20, min: 1, max: 1 },
            { id: "warhammer", weight: 15, min: 1, max: 1 },
            { id: "wooden_buckler", weight: 20, min: 1, max: 1 },

            // --- TATTERED ARMOR ---
            { id: "tattered_hood", weight: 15, min: 1, max: 1 },
            { id: "tattered_shirt", weight: 15, min: 1, max: 1 },
            { id: "tattered_gloves", weight: 15, min: 1, max: 1 },
            { id: "tattered_pants", weight: 15, min: 1, max: 1 },
            { id: "tattered_boots", weight: 15, min: 1, max: 1 },

            // --- LEATHER ARMOR ---
            { id: "leather_helmet", weight: 15, min: 1, max: 1 },
            { id: "leather_armor", weight: 15, min: 1, max: 1 },
            { id: "leather_bracers", weight: 15, min: 1, max: 1 },
            { id: "leather_leggings", weight: 15, min: 1, max: 1 },
            { id: "leather_boots", weight: 15, min: 1, max: 1 },

            // --- IRON ARMOR ---
            { id: "iron_helmet", weight: 8, min: 1, max: 1 },
            { id: "iron_armor", weight: 8, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 8, min: 1, max: 1 },
            { id: "iron_greaves", weight: 8, min: 1, max: 1 },
            { id: "iron_boots", weight: 8, min: 1, max: 1 },

            // --- INSIGHT WEAPONS (very rare) ---
            { id: "insight_of_fire", weight: 2, min: 1, max: 1 },
            { id: "insight_of_water", weight: 2, min: 1, max: 1 },
            { id: "insight_of_earth", weight: 2, min: 1, max: 1 },
            { id: "insight_of_lightning", weight: 2, min: 1, max: 1 },
            { id: "insight_of_ice", weight: 2, min: 1, max: 1 },
            { id: "insight_of_wind", weight: 2, min: 1, max: 1 },
            { id: "insight_of_arcane", weight: 2, min: 1, max: 1 },
            { id: "insight_of_light", weight: 2, min: 1, max: 1 },
            { id: "insight_of_darkness", weight: 2, min: 1, max: 1 }
        ]
    },

    // The fallen Royal Guard officer's satchel: no junk, better odds at iron gear and insight weapons.
    "alterian_officer_loot": {
        type: "weighted",
        items: [
            { id: "iron_ingot", weight: 20, min: 2, max: 4 },
            { id: "healing_herb", weight: 25, min: 2, max: 3 },
            { id: "kurtus_brew", weight: 20, min: 1, max: 2 },

            { id: "shortsword", weight: 15, min: 1, max: 1 },
            { id: "spear", weight: 15, min: 1, max: 1 },
            { id: "warhammer", weight: 15, min: 1, max: 1 },

            { id: "iron_helmet", weight: 15, min: 1, max: 1 },
            { id: "iron_armor", weight: 15, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 15, min: 1, max: 1 },
            { id: "iron_greaves", weight: 15, min: 1, max: 1 },
            { id: "iron_boots", weight: 15, min: 1, max: 1 },

            { id: "insight_of_light", weight: 8, min: 1, max: 1 },
            { id: "insight_of_earth", weight: 6, min: 1, max: 1 }
        ]
    },

    "house_interior": {
        type: "weighted",
        items: [
            // --- MATERIALS (High Drop Rate, Multiple Quantities) ---
            { id: "soft_wood", weight: 50, min: 1, max: 3 },
            { id: "stone", weight: 50, min: 1, max: 3 },
            { id: "leather", weight: 40, min: 1, max: 2 },
            { id: "iron_ingot", weight: 20, min: 1, max: 2 },

            // --- CONSUMABLES (Medium Drop Rate, Multiple Quantities) ---
            { id: "healing_herb", weight: 40, min: 1, max: 2 },
            { id: "invigorating_herb", weight: 40, min: 1, max: 2 },
            { id: "illuminating_herb", weight: 40, min: 1, max: 2 },
            { id: "kurtus_brew", weight: 5, min: 1, max: 1 },

            // --- WEAPONS & SHIELDS (Standard Drop Rate) ---
            { id: "wooden_stick", weight: 30, min: 1, max: 1 },
            { id: "dagger", weight: 20, min: 1, max: 1 },
            { id: "shortsword", weight: 15, min: 1, max: 1 },
            { id: "handaxe", weight: 15, min: 1, max: 1 },
            { id: "warhammer", weight: 10, min: 1, max: 1 },
            { id: "spear", weight: 15, min: 1, max: 1 },
            { id: "wooden_buckler", weight: 20, min: 1, max: 1 },
            { id: "scythe", weight: 15, min: 1, max: 1 },

            // --- INSIGHT WEAPONS (Rare Drop Rate) ---
            { id: "insight_of_fire", weight: 5, min: 1, max: 1 },
            { id: "insight_of_water", weight: 5, min: 1, max: 1 },
            { id: "insight_of_earth", weight: 5, min: 1, max: 1 },
            { id: "insight_of_lightning", weight: 5, min: 1, max: 1 },
            { id: "insight_of_ice", weight: 5, min: 1, max: 1 },
            { id: "insight_of_wind", weight: 5, min: 1, max: 1 },
            { id: "insight_of_arcane", weight: 5, min: 1, max: 1 },
            { id: "insight_of_light", weight: 5, min: 1, max: 1 },
            { id: "insight_of_darkness", weight: 5, min: 1, max: 1 },

            // --- TATTERED ARMOR (Common Drop Rate) ---
            { id: "tattered_hood", weight: 25, min: 1, max: 1 },
            { id: "tattered_shirt", weight: 25, min: 1, max: 1 },
            { id: "tattered_gloves", weight: 25, min: 1, max: 1 },
            { id: "tattered_pants", weight: 25, min: 1, max: 1 },
            { id: "tattered_boots", weight: 25, min: 1, max: 1 },

            // --- CLOTH ARMOR (Standard Drop Rate) ---
            { id: "cloth_hood", weight: 15, min: 1, max: 1 },
            { id: "cloth_robe", weight: 15, min: 1, max: 1 },
            { id: "cloth_gloves", weight: 15, min: 1, max: 1 },
            { id: "cloth_pants", weight: 15, min: 1, max: 1 },
            { id: "cloth_shoes", weight: 15, min: 1, max: 1 },

            // --- LEATHER ARMOR (Uncommon Drop Rate) ---
            { id: "leather_helmet", weight: 10, min: 1, max: 1 },
            { id: "leather_armor", weight: 10, min: 1, max: 1 },
            { id: "leather_bracers", weight: 10, min: 1, max: 1 },
            { id: "leather_leggings", weight: 10, min: 1, max: 1 },
            { id: "leather_boots", weight: 10, min: 1, max: 1 },

            // --- IRON ARMOR (Rare Drop Rate) ---
            { id: "iron_helmet", weight: 5, min: 1, max: 1 },
            { id: "iron_armor", weight: 5, min: 1, max: 1 },
            { id: "iron_gauntlets", weight: 5, min: 1, max: 1 },
            { id: "iron_greaves", weight: 5, min: 1, max: 1 },
            { id: "iron_boots", weight: 5, min: 1, max: 1 }
        ]
    },

    // ==========================================
    // INDEPENDENT TABLES (Roll every item individually)
    // ==========================================
    "mad_man_drops": {
        type: "independent",
        items: [
            { id: "healing_herb", dropRate: 0.1, min: 1, max: 2 },
            { id: "dagger", dropRate: 0.10 }
        ]
    },
    "magic_addict_drops": {
        type: "independent",
        items: [
            { id: "healing_herb", dropRate: 0.1 },
            { id: "dagger", dropRate: 0.05 },
            { id: "insight_of_arcane", dropRate: 0.15 }
        ]
    },
    "hollow_harvester_drops": {
        type: "independent",
        items: [
            { id: "scythe", dropRate: 0.02 },
            { id: "tattered_hood", dropRate: 0.02 },
            { id: "tattered_shirt", dropRate: 0.02 },
            { id: "tattered_gloves", dropRate: 0.02 },
            { id: "tattered_pants", dropRate: 0.02 },
            { id: "tattered_boots", dropRate: 0.02 }
        ]
    },
    "canine_drops": {
        type: "independent",
        items: [
            { id: "leather", dropRate: 0.20, min: 1, max: 2 },
            { id: "healing_herb", dropRate: 0.05 }
        ]
    },
    // ------------------------------------------
    // DESERT HUMANOIDS
    // ------------------------------------------
    "scorched_vagrant_drops": {
        type: "independent",
        items: [
            { id: "healing_herb", dropRate: 0.10 },
            { id: "illuminating_herb", dropRate: 0.10 },
            { id: "stone", dropRate: 0.20, min: 1, max: 2 },
            { id: "insight_of_fire", dropRate: 0.06 },
            { id: "cloth_hood", dropRate: 0.05 },
            { id: "cloth_robe", dropRate: 0.05 },
            { id: "cloth_gloves", dropRate: 0.04 },
            { id: "kurtus_brew", dropRate: 0.03 }
        ]
    },
    "sand_stalker_drops": {
        type: "independent",
        items: [
            { id: "invigorating_herb", dropRate: 0.10 },
            { id: "leather", dropRate: 0.20, min: 1, max: 2 },
            { id: "dagger", dropRate: 0.10 },
            { id: "shortsword", dropRate: 0.08 },
            { id: "leather_bracers", dropRate: 0.04 },
            { id: "leather_boots", dropRate: 0.05 },
            { id: "insight_of_wind", dropRate: 0.04 }
        ]
    },
    "miragewright_drops": {
        type: "independent",
        items: [
            { id: "illuminating_herb", dropRate: 0.15, min: 1, max: 2 },
            { id: "kurtus_brew", dropRate: 0.08 },
            { id: "insight_of_darkness", dropRate: 0.12 },
            { id: "insight_of_ice", dropRate: 0.05 },
            { id: "insight_of_wind", dropRate: 0.05 },
            { id: "cloth_robe", dropRate: 0.12 },
            { id: "cloth_hood", dropRate: 0.10 },
            { id: "cloth_gloves", dropRate: 0.08 }
        ]
    },
    "calcified_crusader_drops": {
        type: "independent",
        items: [
            { id: "stone", dropRate: 0.60, min: 2, max: 4 },
            { id: "iron_ingot", dropRate: 0.35, min: 1, max: 3 },
            { id: "glaive", dropRate: 0.10 },
            { id: "warhammer", dropRate: 0.06 },
            { id: "insight_of_earth", dropRate: 0.05 },
            { id: "iron_helmet", dropRate: 0.06 },
            { id: "iron_armor", dropRate: 0.06 },
            { id: "iron_gauntlets", dropRate: 0.05 },
            { id: "iron_greaves", dropRate: 0.05 },
            { id: "iron_boots", dropRate: 0.05 }
        ]
    },

    // ------------------------------------------
    // BEASTS
    // ------------------------------------------
    "grim_stag_drops": {
        type: "independent",
        items: [
            { id: "leather", dropRate: 0.90, min: 2, max: 4 },
            { id: "healing_herb", dropRate: 0.10 },
            { id: "invigorating_herb", dropRate: 0.10 },
            { id: "insight_of_darkness", dropRate: 0.04 }
        ]
    },
    "dune_maw_drops": {
        type: "independent",
        items: [
            { id: "stone", dropRate: 0.50, min: 1, max: 3 },
            { id: "leather", dropRate: 0.40, min: 1, max: 2 },
            { id: "iron_ingot", dropRate: 0.10 },
            { id: "insight_of_earth", dropRate: 0.04 }
        ]
    },
    "thunder_locust_drops": {
        type: "independent",
        items: [
            { id: "invigorating_herb", dropRate: 0.20 },
            { id: "illuminating_herb", dropRate: 0.10 },
            { id: "insight_of_lightning", dropRate: 0.08 },
            { id: "insight_of_wind", dropRate: 0.04 }
        ]
    },

    // ------------------------------------------
    // BOSSES
    // ------------------------------------------
    "boss_poachers_nightmare_drops": {
        type: "independent",
        items: [
            { id: "leather", dropRate: 1.0, min: 4, max: 6 },
            { id: "healing_herb", dropRate: 0.80, min: 2, max: 3 },
            { id: "iron_ingot", dropRate: 0.60, min: 2, max: 4 },
            { id: "kurtus_brew", dropRate: 0.50, min: 1, max: 2 },
            { id: "insight_of_earth", dropRate: 0.25 },
            { id: "insight_of_darkness", dropRate: 0.20 },
            { id: "leather_helmet", dropRate: 0.30 },
            { id: "leather_armor", dropRate: 0.35 },
            { id: "leather_bracers", dropRate: 0.30 },
            { id: "leather_leggings", dropRate: 0.30 },
            { id: "leather_boots", dropRate: 0.30 },
            { id: "iron_helmet", dropRate: 0.12 },
            { id: "iron_armor", dropRate: 0.12 }
        ]
    },
    // Panzerkamfer: a war beast bound in plate. Hide and bone, a lot of the iron it wore, and a real chance at a set of that armor.
    "boss_panzerkamfer_drops": {
        type: "independent",
        items: [
            { id: "fur", dropRate: 1.0, min: 4, max: 6 },
            { id: "bone", dropRate: 0.90, min: 3, max: 5 },
            { id: "leather", dropRate: 0.80, min: 3, max: 5 },
            { id: "iron_ingot", dropRate: 0.85, min: 3, max: 6 },
            { id: "healing_tonic", dropRate: 0.50, min: 1, max: 2 },
            { id: "invigorating_tonic", dropRate: 0.30 },
            { id: "kurtus_brew", dropRate: 0.40, min: 1, max: 2 },
            { id: "insight_of_ice", dropRate: 0.30 },
            { id: "insight_of_earth", dropRate: 0.10 },
            { id: "iron_helmet", dropRate: 0.30 },
            { id: "iron_armor", dropRate: 0.30 },
            { id: "iron_gauntlets", dropRate: 0.25 },
            { id: "iron_greaves", dropRate: 0.25 },
            { id: "iron_boots", dropRate: 0.25 },
            { id: "leather_armor", dropRate: 0.20 },
            { id: "leather_leggings", dropRate: 0.20 }
        ]
    },
    "boss_darius_drops": {
        type: "independent",
        items: [
            { id: "illuminating_herb", dropRate: 0.80, min: 2, max: 3 },
            { id: "healing_herb", dropRate: 0.50, min: 1, max: 3 },
            { id: "kurtus_brew", dropRate: 0.60, min: 1, max: 2 },
            { id: "insight_of_arcane", dropRate: 0.50 },
            { id: "insight_of_darkness", dropRate: 0.15 },
            { id: "tattered_hood", dropRate: 0.40 },
            { id: "cloth_hood", dropRate: 0.30 },
            { id: "cloth_robe", dropRate: 0.35 },
            { id: "cloth_gloves", dropRate: 0.30 },
            { id: "cloth_pants", dropRate: 0.30 },
            { id: "cloth_shoes", dropRate: 0.30 }
        ]
    },

    // ------------------------------------------
    // SNOW AND CAVE CREATURES
    // ------------------------------------------
    "snow_leopard_drops": {
        type: "independent",
        items: [
            { id: "fur", dropRate: 0.60, min: 1, max: 2 },
            { id: "leather", dropRate: 0.25, min: 1, max: 2 },
            { id: "bone", dropRate: 0.25, min: 1, max: 2 },
            { id: "healing_herb", dropRate: 0.05 },
            { id: "insight_of_ice", dropRate: 0.03 }
        ]
    },
    // Cave spiders: webbing (as plant fibers), a few bones and cave stone; the rare one carries a bit of the cave's earth.
    "arachnid_drops": {
        type: "independent",
        items: [
            { id: "plant_fibers", dropRate: 0.25, min: 1, max: 2 },
            { id: "bone", dropRate: 0.15 },
            { id: "stone", dropRate: 0.15, min: 1, max: 2 },
            { id: "flint", dropRate: 0.08 },
            { id: "invigorating_herb", dropRate: 0.05 },
            { id: "insight_of_earth", dropRate: 0.02 }
        ]
    },

    // ------------------------------------------
    // SNOWBOUND HUMANOIDS
    // ------------------------------------------
    // Frozen trapper: furs and traps-and-gear of a hunter lost to the cold, plus a spear and the odd frost focus.
    "frozen_trapper_drops": {
        type: "independent",
        items: [
            { id: "fur", dropRate: 0.40, min: 1, max: 2 },
            { id: "leather", dropRate: 0.25, min: 1, max: 2 },
            { id: "flint", dropRate: 0.15 },
            { id: "torch", dropRate: 0.15 },
            { id: "bandage", dropRate: 0.10 },
            { id: "healing_herb", dropRate: 0.08 },
            { id: "spear", dropRate: 0.08 },
            { id: "dagger", dropRate: 0.05 },
            { id: "tattered_hood", dropRate: 0.10 },
            { id: "tattered_gloves", dropRate: 0.06 },
            { id: "tattered_boots", dropRate: 0.06 },
            { id: "leather_boots", dropRate: 0.03 },
            { id: "leather_bracers", dropRate: 0.03 },
            { id: "insight_of_ice", dropRate: 0.10 }
        ]
    },
    // ------------------------------------------
    // SHACKLED UNDEAD (the caves)
    // ------------------------------------------
    // Old bones and what the dead still carry: bones to grind, a rusted blade, scraps of armor.
    "skeletal_warrior_drops": {
        type: "independent",
        items: [
            { id: "bone", dropRate: 0.60, min: 1, max: 3 },
            { id: "iron_ingot", dropRate: 0.10 },
            { id: "shortsword", dropRate: 0.08 },
            { id: "spear", dropRate: 0.05 },
            { id: "wooden_buckler", dropRate: 0.05 },
            { id: "tattered_shirt", dropRate: 0.04 },
            { id: "tattered_gloves", dropRate: 0.04 },
            { id: "tattered_pants", dropRate: 0.04 },
            { id: "tattered_boots", dropRate: 0.04 },
            { id: "iron_helmet", dropRate: 0.02 },
            { id: "iron_armor", dropRate: 0.02 },
            { id: "insight_of_darkness", dropRate: 0.02 }
        ]
    },
    // A skull that carried a spark of the old magic: bone, a little insight, the odd dark or arcane focus.
    "floating_skull_drops": {
        type: "independent",
        items: [
            { id: "bone", dropRate: 0.50, min: 1, max: 2 },
            { id: "illuminating_herb", dropRate: 0.10 },
            { id: "kurtus_brew", dropRate: 0.03 },
            { id: "insight_of_darkness", dropRate: 0.08 },
            { id: "insight_of_arcane", dropRate: 0.05 }
        ]
    },
    // The robed dead of a forgotten order: cloth, herbs and the focus of each half of their rites (light and dark).
    "ancient_cultist_drops": {
        type: "independent",
        items: [
            { id: "bone", dropRate: 0.40, min: 1, max: 2 },
            { id: "illuminating_herb", dropRate: 0.15, min: 1, max: 2 },
            { id: "healing_herb", dropRate: 0.08 },
            { id: "kurtus_brew", dropRate: 0.10 },
            { id: "insight_of_darkness", dropRate: 0.20 },
            { id: "insight_of_light", dropRate: 0.20 },
            { id: "tattered_hood", dropRate: 0.20 },
            { id: "cloth_hood", dropRate: 0.10 },
            { id: "cloth_robe", dropRate: 0.12 },
            { id: "cloth_gloves", dropRate: 0.08 },
            { id: "cloth_pants", dropRate: 0.06 },
            { id: "cloth_shoes", dropRate: 0.06 }
        ]
    },

    "watchman_drops": {
        type: "independent",
        items: [
            { id: "healing_herb", dropRate: 0.10 },
            { id: "leather", dropRate: 0.15, min: 1, max: 2 },
            { id: "iron_ingot", dropRate: 0.10, min: 1, max: 2 },
            { id: "crossbow", dropRate: 0.06 },
            { id: "leather_helmet", dropRate: 0.04 },
            { id: "leather_armor", dropRate: 0.04 },
            { id: "iron_helmet", dropRate: 0.02 }
        ]
    },
    "deer_drops": {
        type: "independent",
        items: [
            { id: "leather", dropRate: 1.0, min: 2, max: 4 },
        ]
    }
};
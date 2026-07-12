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
            { id: "healing_herb", dropRate: 0.15, min: 1, max: 2 },
            { id: "dagger", dropRate: 0.10 }
        ]
    },
    "mad_mage_drops": {
        type: "independent",
        items: [
            { id: "healing_herb", dropRate: 0.25 },
            { id: "dagger", dropRate: 0.05 },
            { id: "insight_of_arcane", dropRate: 0.15 }
        ]
    },
    "canine_drops": {
        type: "independent",
        items: [
            { id: "leather", dropRate: 0.20, min: 1, max: 2 },
            { id: "healing_herb", dropRate: 0.05 }
        ]
    }
};
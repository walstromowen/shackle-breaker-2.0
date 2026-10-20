export const craftingRecipeDefinitions = {
  // --- GEAR RECIPES ---
  "recipe_shortsword": {
    id: "recipe_shortsword",
    outputItemId: "shortsword",
    station: "anvil",
    materials: {
      "iron_ingot": 3,   // the blade
      "hard_wood": 1,   // the hilt
      "leather": 1   // the grip
    }
  },
  "recipe_spear": {
    id: "recipe_spear",
    outputItemId: "spear",
    station: "anvil",
    materials: {
      "hard_wood": 3,   // the shaft
      "iron_ingot": 1,   // the spearhead
      "plant_fibers": 2   // binds the head
    }
  },
  "recipe_dagger": {
    id: "recipe_dagger",
    outputItemId: "dagger",
    station: "anvil",
    materials: {
      "iron_ingot": 1,   // the blade
      "leather": 1   // the grip
    }
  },
  "recipe_handaxe": {
    id: "recipe_handaxe",
    outputItemId: "handaxe",
    station: "anvil",
    materials: {
      "iron_ingot": 2,   // the head
      "hard_wood": 2,   // the haft
      "plant_fibers": 2   // binds head to haft
    }
  },
  "recipe_pickaxe": {
    id: "recipe_pickaxe",
    outputItemId: "pickaxe",
    station: "anvil",
    materials: {
      "stone": 4,   // the head (a stone head, as its description says)
      "hard_wood": 3,   // the haft
      "plant_fibers": 3   // lashing
    }
  },
  "recipe_shortbow": {
    id: "recipe_shortbow",
    outputItemId: "shortbow",
    station: "carpenters_bench",
    materials: {
      "hard_wood": 3,   // the stave
      "plant_fibers": 6,   // the bowstring
      "leather": 1   // the grip
    }
  },

  // --- MORE WEAPONS ---
  "recipe_crossbow": {
    id: "recipe_crossbow",
    outputItemId: "crossbow",
    station: "carpenters_bench",
    materials: {
      "hard_wood": 5,   // the stock and prod
      "iron_ingot": 1,   // the trigger and latch
      "plant_fibers": 4,   // the string
      "leather": 1   // the grip
    }
  },
  "recipe_warhammer": {
    id: "recipe_warhammer",
    outputItemId: "warhammer",
    station: "anvil",
    materials: {
      "iron_ingot": 4,   // the head
      "hard_wood": 3,   // the haft
      "leather": 1   // the grip
    }
  },
  "recipe_scythe": {
    id: "recipe_scythe",
    outputItemId: "scythe",
    station: "anvil",
    materials: {
      "iron_ingot": 2,   // the blade
      "hard_wood": 4,   // the snath
      "plant_fibers": 2   // binds blade to snath
    }
  },
  "recipe_glaive": {
    id: "recipe_glaive",
    outputItemId: "glaive",
    station: "anvil",
    materials: {
      "iron_ingot": 3,   // the blade
      "hard_wood": 5,   // the pole
      "leather": 1   // the grip
    }
  },
  "recipe_wooden_buckler": {
    id: "recipe_wooden_buckler",
    outputItemId: "wooden_buckler",
    station: "carpenters_bench",
    materials: {
      "hard_wood": 5,   // the boards
      "iron_ingot": 1,   // the boss
      "leather": 1   // the handle strap
    }
  },

  // --- CLOTH ARMOR (tailor's bench) ---
  "recipe_cloth_hood": {
    id: "recipe_cloth_hood",
    outputItemId: "cloth_hood",
    station: "tailors_bench",
    materials: {
      "linen": 2,
      "plant_fibers": 2
    }
  },
  "recipe_cloth_robe": {
    id: "recipe_cloth_robe",
    outputItemId: "cloth_robe",
    station: "tailors_bench",
    materials: {
      "linen": 4,
      "plant_fibers": 4
    }
  },
  "recipe_cloth_gloves": {
    id: "recipe_cloth_gloves",
    outputItemId: "cloth_gloves",
    station: "tailors_bench",
    materials: {
      "linen": 1,
      "plant_fibers": 2
    }
  },
  "recipe_cloth_pants": {
    id: "recipe_cloth_pants",
    outputItemId: "cloth_pants",
    station: "tailors_bench",
    materials: {
      "linen": 3,
      "plant_fibers": 3
    }
  },
  "recipe_cloth_shoes": {
    id: "recipe_cloth_shoes",
    outputItemId: "cloth_shoes",
    station: "tailors_bench",
    materials: {
      "linen": 2,
      "plant_fibers": 2
    }
  },

  // --- LEATHER ARMOR (tailor's bench) ---
  "recipe_leather_helmet": {
    id: "recipe_leather_helmet",
    outputItemId: "leather_helmet",
    station: "tailors_bench",
    materials: {
      "leather": 3,
      "plant_fibers": 2
    }
  },
  "recipe_leather_armor": {
    id: "recipe_leather_armor",
    outputItemId: "leather_armor",
    station: "tailors_bench",
    materials: {
      "leather": 6,
      "linen": 2,
      "plant_fibers": 4
    }
  },
  "recipe_leather_bracers": {
    id: "recipe_leather_bracers",
    outputItemId: "leather_bracers",
    station: "tailors_bench",
    materials: {
      "leather": 2,
      "plant_fibers": 2
    }
  },
  "recipe_leather_leggings": {
    id: "recipe_leather_leggings",
    outputItemId: "leather_leggings",
    station: "tailors_bench",
    materials: {
      "leather": 4,
      "linen": 1,
      "plant_fibers": 3
    }
  },
  "recipe_leather_boots": {
    id: "recipe_leather_boots",
    outputItemId: "leather_boots",
    station: "tailors_bench",
    materials: {
      "leather": 3,
      "plant_fibers": 3
    }
  },

  "recipe_iron_helmet": {
    id: "recipe_iron_helmet",
    outputItemId: "iron_helmet",
    station: "anvil",
    materials: {
      "iron_ingot": 5,
      "leather": 2
    }
  },

  // --- IRON ARMOR (anvil; the helmet is above) ---
  "recipe_iron_armor": {
    id: "recipe_iron_armor",
    outputItemId: "iron_armor",
    station: "anvil",
    materials: {
      "iron_ingot": 10,
      "leather": 4
    }
  },
  "recipe_iron_gauntlets": {
    id: "recipe_iron_gauntlets",
    outputItemId: "iron_gauntlets",
    station: "anvil",
    materials: {
      "iron_ingot": 4,
      "leather": 2
    }
  },
  "recipe_iron_greaves": {
    id: "recipe_iron_greaves",
    outputItemId: "iron_greaves",
    station: "anvil",
    materials: {
      "iron_ingot": 8,
      "leather": 3
    }
  },
  "recipe_iron_boots": {
    id: "recipe_iron_boots",
    outputItemId: "iron_boots",
    station: "anvil",
    materials: {
      "iron_ingot": 5,
      "leather": 2
    }
  },

  // --- REFINING RECIPES (Materials to Materials) ---
  "recipe_iron_ingot": {
    id: "recipe_iron_ingot",
    outputItemId: "iron_ingot",
    station: "forge",
    materials: {
      "iron_ore": 2,
      "coal": 1
    }
  },
  "recipe_linen": {
    id: "recipe_linen",
    outputItemId: "linen",
    station: "tailors_bench",   // Renamed from weaving_loom
    materials: {
      "cotton": 2
    }
  },
  "recipe_leather": {
    id: "recipe_leather",
    outputItemId: "leather",
    station: "tailors_bench",   // Moved from "any"
    materials: {
      "fur": 2,
      "salt": 1 // Salt used for curing/tanning the hide
    }
  },
  "recipe_copper_ingot": {
    id: "recipe_copper_ingot",
    outputItemId: "copper_ingot",
    station: "forge",
    materials: {
      "copper_ore": 2,
      "coal": 1
    }
  },
  "recipe_bronze_ingot": {
    id: "recipe_bronze_ingot",
    outputItemId: "bronze_ingot",
    station: "forge",
    materials: {
      "copper_ingot": 1,
      "tin_ore": 2,   // Now uses raw Tin Ore directly
      "coal": 1
    }
  },

  // --- CONSUMABLE RECIPES ---
  "recipe_torch": {
    id: "recipe_torch",
    outputItemId: "torch",
    station: "any",
    materials: {
      "soft_wood": 2,
      "plant_fibers": 2
    }
  },
  "recipe_healing_tonic": {
    id: "recipe_healing_tonic",
    outputItemId: "healing_tonic",
    station: "any",
    materials: {
      "healing_herb": 5
    }
  },
  "recipe_invigorating_tonic": {
    id: "recipe_invigorating_tonic",
    outputItemId: "invigorating_tonic",
    station: "any",
    materials: {
      "invigorating_herb": 5
    }
  },
  "recipe_illuminating_tonic": {
    id: "recipe_illuminating_tonic",
    outputItemId: "illuminating_tonic",
    station: "any",
    materials: {
      "illuminating_herb": 5
    }
  },
  "recipe_kurtus_brew": {
    id: "recipe_kurtus_brew",
    outputItemId: "kurtus_brew",
    station: "any",
    materials: {
      "meteorite": 1,
      "coal": 2,      // To deeply char and steep the brew
      "sand": 1       // Adds a terrible texture, fits the "bad decisions" theme
    }
  },

  // --- COMBAT & TRAVEL CONSUMABLES ---
  "recipe_escape_rope": {
    id: "recipe_escape_rope",
    outputItemId: "escape_rope",
    station: "any",
    materials: {
      "plant_fibers": 30
    }
  },
  "recipe_throwing_knife": {
    id: "recipe_throwing_knife",
    outputItemId: "throwing_knife",
    outputQuantity: 3,        // one batch makes three blades
    station: "any",
    materials: {
      "flint": 3,
      "plant_fibers": 1,      // Grip wrap
      "soft_wood": 1          // Handle
    }
  },
  "recipe_poison_throwing_knife": {
    id: "recipe_poison_throwing_knife",
    outputItemId: "poison_throwing_knife",
    station: "any",
    materials: {
      "throwing_knife": 1,
      "invigorating_herb": 2  // STAND-IN: the game has no venom material. Boiled down, a heart-racing herb makes a fair toxin. Swap when one exists.
    }
  },
  "recipe_bear_trap": {
    id: "recipe_bear_trap",
    outputItemId: "bear_trap",
    station: "any",
    materials: {
      "iron_ore": 2
    }
  },
  "recipe_interior_map": {
    id: "recipe_interior_map",
    outputItemId: "interior_map",
    station: "any",
    materials: {
      "linen": 1,
      "coal": 1               // charcoal to draw the plan with
    }
  },
  "recipe_bedroll": {
    id: "recipe_bedroll",
    outputItemId: "bedroll",
    station: "any",
    materials: {
      "leather": 2,           // the waterproof outside
      "linen": 2,             // the blanket
      "plant_fibers": 4       // cord to tie it
    }
  },
  "recipe_smoke_bomb": {
    id: "recipe_smoke_bomb",
    outputItemId: "smoke_bomb",
    outputQuantity: 2,        // one batch makes two
    station: "any",
    materials: {
      "coal": 2,              // the smoke
      "sand": 1,              // packing
      "plant_fibers": 1       // fuse
    }
  }
};
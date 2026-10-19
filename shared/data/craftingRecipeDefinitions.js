export const craftingRecipeDefinitions = {
  // --- GEAR RECIPES ---
  "recipe_shortsword": {
    id: "recipe_shortsword",
    outputItemId: "shortsword",
    station: "any",   // TESTING: was "anvil"
    materials: {
      "soft_wood": 5,
      "stone": 5,
      "plant_fibers": 5,
      "sand":5
    }
  },
  "recipe_spear": {
    id: "recipe_spear",
    outputItemId: "spear",
    station: "any",   // TESTING: was "anvil"
    materials: {
      "soft_wood": 10,
      "stone": 3,
      "plant_fibers": 5,
      "sand":2
    }
  },
  "recipe_dagger": {
    id: "recipe_dagger",
    outputItemId: "dagger",
    station: "any",   // TESTING: was "anvil"
    materials: {
      "soft_wood": 3,
      "stone": 3,
      "plant_fibers": 3,
      "sand":3
    }
  },
  "recipe_handaxe": {
    id: "recipe_handaxe",
    outputItemId: "handaxe",
    station: "any",   // TESTING: was "anvil"
    materials: {
      "soft_wood": 7,
      "stone": 5,
      "plant_fibers": 3,
      "sand":3
    }
  },
  "recipe_pickaxe": {
    id: "recipe_pickaxe",
    outputItemId: "pickaxe",
    station: "any",   // TESTING: was "anvil"
    materials: {
      "soft_wood": 6,
      "stone": 7,
      "plant_fibers": 4,
      "sand":3
    }
  },
  "recipe_shortbow": {
    id: "recipe_shortbow",
    outputItemId: "shortbow",
    station: "any",   // TESTING: was "carpenters_bench"
    materials: {
      "soft_wood": 15,
      "plant_fibers": 15,
    }
  },

  "recipe_iron_helmet": {
    id: "recipe_iron_helmet",
    outputItemId: "iron_helmet",
    locked: true,
    station: "any",   // TESTING: was "anvil"
    materials: {
      "iron_ingot": 5,
      "leather": 2
    }
  },

  // --- REFINING RECIPES (Materials to Materials) ---
  "recipe_iron_ingot": {
    id: "recipe_iron_ingot",
    outputItemId: "iron_ingot",
    station: "any",   // TESTING: was "forge"
    materials: {
      "iron_ore": 2,
      "coal": 1
    }
  },
  "recipe_linen": {
    id: "recipe_linen",
    outputItemId: "linen",
    station: "any",   // TESTING: was "tailors_bench" // Renamed from weaving_loom
    materials: {
      "cotton": 2
    }
  },
  "recipe_leather": {
    id: "recipe_leather",
    outputItemId: "leather",
    station: "any",   // TESTING: was "tailors_bench" // Moved from "any"
    materials: {
      "fur": 2,
      "salt": 1 // Salt used for curing/tanning the hide
    }
  },
  "recipe_copper_ingot": {
    id: "recipe_copper_ingot",
    outputItemId: "copper_ingot",
    station: "any",   // TESTING: was "forge"
    materials: {
      "copper_ore": 2,
      "coal": 1
    }
  },
  "recipe_bronze_ingot": {
    id: "recipe_bronze_ingot",
    outputItemId: "bronze_ingot",
    station: "any",   // TESTING: was "forge"
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
    outputItemId: "brew_of_madness",
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
      "iron_ingot": 4
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
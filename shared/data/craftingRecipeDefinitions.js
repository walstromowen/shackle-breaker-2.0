export const craftingRecipeDefinitions = {
  // --- GEAR RECIPES ---
  "recipe_shortsword": {
    id: "recipe_shortsword",
    outputItemId: "shortsword",
    station: "anvil",
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
    station: "anvil",
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
    station: "anvil",
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
    station: "anvil",
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
    station: "anvil",
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
    station: "carpenters_bench",
    materials: {
      "soft_wood": 15,
      "plant_fibers": 15,
    }
  },

  "recipe_iron_helmet": {
    id: "recipe_iron_helmet",
    outputItemId: "iron_helmet",
    locked: true,
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
    station: "tailors_bench", // Renamed from weaving_loom
    materials: {
      "cotton": 2
    }
  },
  "recipe_leather": {
    id: "recipe_leather",
    outputItemId: "leather",
    station: "tailors_bench", // Moved from "any"
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
    outputItemId: "brew_of_madness",
    station: "any",
    materials: {
      "meteorite": 1,
      "coal": 2,      // To deeply char and steep the brew
      "sand": 1       // Adds a terrible texture, fits the "bad decisions" theme
    }
  }
};
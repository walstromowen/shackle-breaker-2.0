export const craftingRecipeDefinitions = {
  // --- GEAR RECIPES ---
  "recipe_shortsword": {
    id: "recipe_shortsword",
    outputItemId: "shortsword",
    locked: true,
    station: "anvil",
    materials: {
      "hard_wood": 1, // Swapped to hard wood for a sturdy handle
      "iron_ingot": 1
    }
  },
  "recipe_dagger": {
    id: "recipe_dagger",
    outputItemId: "dagger",
    station: "anvil",
    materials: {
      "hard_wood": 1, 
      "iron_ingot": 1
    }
  },
  "recipe_handaxe": {
    id: "recipe_handaxe",
    outputItemId: "handaxe",
    locked: true,
    station: "anvil",
    materials: {
      "hard_wood": 1, 
      "iron_ingot": 1
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
  "recipe_brass_ingot": {
    id: "recipe_brass_ingot",
    outputItemId: "brass_ingot",
    station: "forge",
    materials: {
      "copper_ingot": 1,
      "tin_ore": 2,   // Now uses raw Tin Ore directly
      "coal": 1
    }
  },

  // --- CONSUMABLE RECIPES ---
  "recipe_healing_herb": {
    id: "recipe_healing_herb",
    outputItemId: "healing_herb",
    station: "any",
    materials: {
      "wheat": 2,     // Ground down into a poultice
      "cotton": 1,    // Used as a bandage binding
      "salt": 1       // Used to clean the wound
    }
  },
  "recipe_invigorating_herb": {
    id: "recipe_invigorating_herb",
    outputItemId: "invigorating_herb",
    station: "any",
    materials: {
      "wheat": 2,
      "bone": 1       // Ground bone marrow for stamina recovery
    }
  },
  "recipe_illuminating_herb": {
    id: "recipe_illuminating_herb",
    outputItemId: "illuminating_herb",
    station: "any",
    materials: {
      "wheat": 1,
      "flint": 1,     // Consuming flint dust to 'spark' insight
      "copper_ore": 1 // Conductive properties for channel abilities
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
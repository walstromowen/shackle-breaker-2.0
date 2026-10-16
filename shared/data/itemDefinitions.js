export const ItemDefinitions = {
  // --- WEAPONS ---
  "wooden_stick": {
    id: "wooden_stick",
    name: "Wooden Stick",
    slot: "oneHand",
    type: "weapon",
    description: "A sturdy branch found on the forest floor.",
    value: 5,
    icon: { col: 11, row: 0 },
    attack: { blunt: 3 },
    grantedAbilities: ["strike"]
    // No upgrade data: cannot be upgraded.
  },
  "dagger": {
    id: "dagger",
    name: "Dagger",
    slot: "oneHand",
    type: "weapon",
    description: 'A standard dagger, perfect for quick strikes.',
    value: 20,
    icon: { col: 0, row: 0 },
    attack: { pierce: 3, slash: 2 },
    grantedAbilities: ["slash", "quick_stab"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 1, slash: 1 }
    },
    abilityUnlocks: {
      2: ["eviscerate"],
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "shortsword": {
    id: "shortsword",
    name: "Shortsword",
    slot: "oneHand",
    type: "weapon",
    description: 'A standard shortsword. Standard issue shortsword of the Altus legion. "A shorter longsword is a faster longsword" - Commander Mentoras.',
    value: 20,
    icon: { col: 1, row: 0 },
    attack: { pierce: 3, slash: 3 },
    grantedAbilities: ["slash", "thrust"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 2, slash: 2 }
    },
    abilityUnlocks: {
      2: ["cleave"],
      3: ["flurry"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  }, 
  "handaxe": {
    id: "handaxe",
    name: "Handaxe",
    slot: "oneHand",
    type: "weapon",
    description: 'A battered handaxe. After the fall of Altus kingdom, many common tools were repurposed as weapons much like this well worn axe. "An axe is a simple lever. The harder you pull the lever, the quicker your work becomes." - Commander Mentoras.',
    value: 20,
    icon: { col: 2, row: 0 },
    attack: { blunt: 3, slash: 3 },
    grantedAbilities: ["slash", "strike"],
    harvestTool: ["axe"],
    maxLevel: 5,
    statGrowth: {
      attack: { blunt: 2, slash: 2 }
    },
    abilityUnlocks: {
      2: ["cleave"],
      3: ["wild_swing"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "pickaxe": {
    id: "pickaxe",
    name: "Pickaxe",
    slot: "oneHand",
    type: "weapon",
    description: 'A stout pickaxe with a stone head lashed to a wooden haft. Built to break rock, not men, though it will do in a pinch. "A pick is patient. Give it time and it will open any mountain." - Commander Mentoras.',
    value: 18,
    icon: { col: 13, row: 0 },            // PLACEHOLDER: unused cell on the weapon sheet; draw a pickaxe here
    attack: { pierce: 2, blunt: 1 },     // deliberately weak: handaxe is 3/3, dagger 3/2
    grantedAbilities: ["strike"],
    harvestTool: ["pickaxe"],            // objects that need it use interaction.tool: 'pickaxe'; it must be equipped
    maxLevel: 3,
    statGrowth: {
      attack: { pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 40, materials: { "hard_wood": 3, "stone": 8 } },
      3: { currency: 120, materials: { "iron_ingot": 3, "hard_wood": 5 } }
    }
  },
    "shortbow": {
    id: "shortbow",
    name: "Shortbow",
    slot: "twoHand",
    type: "weapon",
    description: 'A standard shortbow. Common bow used to hunt game and defend against threats. "Sometimes its better to end a fight from afar before it begins." - Commander Mentoras.',
    value: 20,
    icon: { col: 5, row: 0 },
    attack: { pierce: 3, slash: 3 },
    grantedAbilities: ["loose_arrow", "quick_draw"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 2, slash: 2 }
    },
    abilityUnlocks: {
      2: ["poisoned_arrow"],
      3: ["triple_shot"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "crossbow": {
    id: "crossbow",
    name: "Crossbow",
    slot: "twoHand",
    type: "weapon",
    description: 'A standard crossbow. Standard issue crossbow of the Alterian watchmen. "A crossbow is the bow of a lazy man, and the weapon of an efficient adversary." - Commander Mentoras.',
    value: 20,
    icon: { col: 6, row: 0 },
    attack: { pierce: 3, slash: 3 },
    grantedAbilities: ["loose_arrow", "quick_draw"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 2, slash: 2 }
    },
    abilityUnlocks: {
      2: ["poisoned_arrow"],
      3: ["triple_shot"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "warhammer": {
    id: "warhammer",
    name: "Warhammer",
    slot: "twoHand",
    type: "weapon",
    description: 'A standard warhammer. Heavy and crushing.',
    value: 20,
    icon: { col: 3, row: 0 },
    attack: { blunt: 5},
    grantedAbilities: ["strike", "cleave"],
    harvestTool: ["hammer"],
    maxLevel: 5,
    statGrowth: {
      attack: { blunt: 3 }
    },
    abilityUnlocks: {
      2: ["wild_swing"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "spear": {
    id: "spear",
    name: "Spear",
    slot: "oneHand",
    type: "weapon",
    description: `A standard spear. Standard issue spear of the Altus legion. "Keep your enemies close and your friends at spear's length." - Commander Mentoras.`,
    value: 20,
    icon: { col: 3, row: 0 },
    attack: { pierce: 5},
    grantedAbilities: ["thrust"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 2 }
    },
    abilityUnlocks: {
      2: ["execute"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "scythe": {
    id: "scythe",
    name: "Scythe",
    slot: "twoHand",
    type: "weapon",
    description: 'A repurposed farming tool with a wickedly curved blade. Originally forged to reap grain in the fertile valleys of Altus, it now harvests a far more grim crop. "The arc of a scythe is absolute. Do not swing at a single foe; swing to clear the field." - Commander Mentoras.',
    value: 25,
    icon: { col: 8, row: 0 },
    attack: { slash: 5, pierce: 1 },
    grantedAbilities: ["slash"],
    harvestTool: ["sickle"],
    maxLevel: 5,
    statGrowth: {
      attack: { slash: 3, pierce: 1 }
    },
    abilityUnlocks: {
      2: ["execute"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "glaive": {
    id: "glaive",
    name: "Glaive",
    slot: "twoHand",
    type: "weapon",
    description: 'A polearm tipped with a sweeping blade. Standard issue for vanguard elite units tasked with holding back swarms. "A spear thrusts to kill one; a glaive sweeps to remind an army why they fear the front line." - Commander Mentoras.',
    value: 30,
    icon: { col: 4, row: 0 },
    attack: { slash: 4, pierce: 3 },
    grantedAbilities: ["slash", "thrust"],
    maxLevel: 5,
    statGrowth: {
      attack: { slash: 2, pierce: 2 }
    },
    abilityUnlocks: {
      2: ["cleave"],
      3: ["execute"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },
  "wooden_buckler": {
    id: "wooden_buckler",
    name: "Wooden Buckler",
    slot: "oneHand",
    type: "shield",
    description: 'A wooden buckler. A buckler fashioned from hard wood. A blue and green symbol of unknown origin is painted on its front.',
    value: 20,
    icon: { col: 3, row: 0 },
    defense: { blunt: 2, slash: 2, pierce: 1 },
    resistance: { blunt: 0.02, slash: 0.03, pierce: 0.03},
    grantedAbilities: [],
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 2, pierce: 2 },
    },
    abilityUnlocks: {
      2: ["bolster"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "iron_ingot": 5, "bronze_ingot": 10, "hard_wood": 15 } },
      5: { currency: 500, materials: { "steel_ingot": 5, "iron_ingot": 10, "bronze_ingot": 15 } }
    }
  },

  // --- INSIGHT WEAPONS ---
  "insight_of_fire": {
    id: "insight_of_fire",
    name: "Insight of Fire",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a firey truth.",
    value: 20,
    icon: { col: 0, row: 1 },
    attack: { fire: 5},
    grantedAbilities: ["fireball"],
    maxLevel: 5,
    statGrowth: {
      attack: { fire: 3 }
    },
    abilityUnlocks: {
      3: ["meteor_shower"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_water": {
    id: "insight_of_water",
    name: "Insight of Water",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a watery truth.",
    value: 20,
    icon: { col: 1, row: 1 },
    attack: { water: 5},
    grantedAbilities: ["water_blast"],
    maxLevel: 5,
    statGrowth: {
      attack: { water: 3 }
    },
    abilityUnlocks: {
      2: ["waterfall"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_earth": {
    id: "insight_of_earth",
    name: "Insight of Earth",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an earthy truth.",
    value: 20,
    icon: { col: 2, row: 1 },
    attack: { earth: 5},
    grantedAbilities: ["vine_lash"],
    maxLevel: 5,
    statGrowth: {
      attack: { earth: 3 }
    },
    abilityUnlocks: {
      2: ["boulder_throw"],
      3: ["earthquake"],
      4: ["acid_pool"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_lightning": {
    id: "insight_of_lightning",
    name: "Insight of Lightning",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an electrifying truth.",
    value: 20,
    icon: { col: 3, row: 1 },
    attack: { lightning: 5},
    grantedAbilities: ["shock"],
    maxLevel: 5,
    statGrowth: {
      attack: { lightning: 3 }
    },
    abilityUnlocks: {
      2: ["overload"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_ice": {
    id: "insight_of_ice",
    name: "Insight of Ice",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a frozen truth.",
    value: 20,
    icon: { col: 4, row: 1 },
    attack: { ice: 5},
    grantedAbilities: ["ice_shard"],
    maxLevel: 5,
    statGrowth: {
      attack: { ice: 3 }
    },
    abilityUnlocks: {
      2: ["frigid_gale"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_wind": {
    id: "insight_of_wind",
    name: "Insight of Wind",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a booming truth.",
    value: 20,
    icon: { col: 5, row: 1 },
    attack: { wind: 5},
    grantedAbilities: ["strike"],
    maxLevel: 5,
    statGrowth: {
      attack: { wind: 3 }
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_arcane": {
    id: "insight_of_arcane",
    name: "Insight of Arcane",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an arcane truth.",
    value: 20,
    icon: { col: 6, row: 1 },
    attack: { arcane: 5},
    grantedAbilities: ["arcane_dart"],
    maxLevel: 5,
    statGrowth: {
      attack: { arcane: 3 }
    },
    abilityUnlocks: {
      2: ["magic_missile"]
    },
    upgradeCosts: {
      2: { currency: 0,  },
      3: { currency: 1000,  }
    }
  },
  "insight_of_light": {
    id: "insight_of_light",
    name: "Insight of Light",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a luminous truth.",
    value: 20,
    icon: { col: 7, row: 1 },
    attack: { light: 5},
    grantedAbilities: ["spite"],
    maxLevel: 5,
    statGrowth: {
      attack: { light: 3 }
    },
    abilityUnlocks: {
      2: ["purify"],
      3: ["healing_rain"]
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },
  "insight_of_darkness": {
    id: "insight_of_darkness",
    name: "Insight of Darkness",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a shadowy truth.",
    value: 20,
    icon: { col: 8, row: 1 },
    attack: { dark: 5},
    grantedAbilities: ["spirit_reap"],
    maxLevel: 5,
    statGrowth: {
      attack: { dark: 3 }
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "stone": 5 } },
      3: { currency: 300, materials: { "iron_ingot": 2, "stone": 10 } }
    }
  },

  // --- TATTERED ARMOR SET (Non-Upgradeable Starter Gear) ---
  "tattered_hood": {
    id: "tattered_hood",
    name: "Tattered Hood",
    slot: "head",
    type: "armor",
    description: "A tattered hood that barely keeps the rain off.",
    value: 8,
    icon: { col: 0, row: 0 },
    defense: { slash: 1 },
    resistance: { lightning: 0.01, ice: 0.01, wind: 0.01, light: 0.01 }
  },
  "tattered_shirt": {
    id: "tattered_shirt",
    name: "Tattered Shirt",
    slot: "torso",
    type: "armor",
    description: "A tattered shirt that offers little physical protection but breathes well.",
    value: 15,
    icon: { col: 0, row: 1 },
    defense: { blunt: 1, slash: 1, pierce: 1 },
    resistance: { pierce: 0.01 }
  },
  "tattered_gloves": {
    id: "tattered_gloves",
    name: "Tattered Gloves",
    slot: "arms",
    type: "armor",
    description: "Tattered gloves. Better than bare hands.",
    value: 5,
    icon: { col: 1, row: 2 },
    defense: { fire: 1 },
    resistance: { earth: 0.02 }
  },
  "tattered_pants": {
    id: "tattered_pants",
    name: "Tattered Pants",
    slot: "legs",
    type: "armor",
    description: "Tattered trousers.",
    value: 10,
    icon: { col: 0, row: 3 },
    defense: { blunt: 1, slash: 1 },
    resistance: { slash: 0.01 }
  },
  "tattered_boots": {
    id: "tattered_boots",
    name: "Tattered Boots",
    slot: "feet",
    type: "armor",
    description: "Tattered boots.",
    value: 6,
    icon: { col: 0, row: 4 },
    defense: { blunt: 1 },
    resistance: { fire: 0.01, earth: 0.01 }
  },

  // --- CLOTH ARMOR SET ---
  "cloth_hood": {
    id: "cloth_hood",
    name: "Cloth Hood",
    slot: "head",
    type: "armor",
    description: "A simple hood that keeps the rain off.",
    value: 8,
    icon: { col: 1, row: 0 },
    defense: { slash: 1 },
    resistance: { arcane: 0.01, light: 0.01, dark: 0.01 },
    maxLevel: 5,
    statGrowth: {
      defense: { slash: 1, blunt: 1 }
    },
    upgradeCosts: {
      2: { currency: 20, materials: { "soft_wood": 2 } },
      3: { currency: 60, materials: { "leather": 1 } }
    }
  },
  "cloth_robe": {
    id: "cloth_robe",
    name: "Cloth Robe",
    slot: "torso",
    type: "armor",
    description: "A simple woven robe.",
    value: 15,
    icon: { col: 1, row: 1 },
    defense: { blunt: 1, slash: 1, pierce: 1 },
    resistance: { fire: 0.01, ice: 0.01, arcane: 0.02 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 40, materials: { "soft_wood": 3 } },
      3: { currency: 100, materials: { "leather": 2 } }
    }
  },
  "cloth_gloves": {
    id: "cloth_gloves",
    name: "Cloth Gloves",
    slot: "arms",
    type: "armor",
    description: "Thin gloves. Better than bare hands.",
    value: 5,
    icon: { col: 1, row: 2 },
    defense: { blunt: 1 },
    resistance: { ice: 0.01 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1 }
    },
    upgradeCosts: {
      2: { currency: 15, materials: { "soft_wood": 1 } },
      3: { currency: 45, materials: { "leather": 1 } }
    }
  },
  "cloth_pants": {
    id: "cloth_pants",
    name: "Cloth Pants",
    slot: "legs",
    type: "armor",
    description: "Standard woven trousers.",
    value: 10,
    icon: { col: 1, row: 3 },
    defense: { blunt: 1, slash: 1 },
    resistance: { arcane: 0.01 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1 }
    },
    upgradeCosts: {
      2: { currency: 25, materials: { "soft_wood": 2 } },
      3: { currency: 75, materials: { "leather": 1 } }
    }
  },
  "cloth_shoes": {
    id: "cloth_shoes",
    name: "Cloth Shoes",
    slot: "feet",
    type: "armor",
    description: "Soft-soled shoes.",
    value: 6,
    icon: { col: 1, row: 4 },
    defense: { blunt: 1 },
    resistance: { fire: 0.01 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1 }
    },
    upgradeCosts: {
      2: { currency: 15, materials: { "soft_wood": 1 } },
      3: { currency: 45, materials: { "leather": 1 } }
    }
  },

  // --- LEATHER ARMOR SET ---
  "leather_helmet": {
    id: "leather_helmet",
    name: "Leather Helmet",
    slot: "head",
    type: "armor",
    description: "A boiled leather cap.",
    value: 15,
    icon: { col: 2, row: 0 },
    defense: { blunt: 1, slash: 2, pierce: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1 }
    },
    upgradeCosts: {
      2: { currency: 30, materials: { "leather": 2 } },
      3: { currency: 90, materials: { "leather": 4, "iron_ingot": 1 } }
    }
  },
  "leather_armor": {
    id: "leather_armor",
    name: "Leather Armor",
    slot: "torso",
    type: "armor",
    description: "Toughened leather that provides decent protection.",
    value: 40,
    icon: { col: 2, row: 1 },
    defense: { blunt: 3, slash: 4, pierce: 2 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 2, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 80, materials: { "leather": 4 } },
      3: { currency: 200, materials: { "leather": 6, "iron_ingot": 2 } }
    }
  },
  "leather_bracers": {
    id: "leather_bracers",
    name: "Leather Bracers",
    slot: "arms",
    type: "armor",
    description: "Stiff leather arm guards.",
    value: 12,
    icon: { col: 2, row: 2 },
    defense: { blunt: 1, slash: 2, pierce: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: { slash: 1 }
    },
    upgradeCosts: {
      2: { currency: 25, materials: { "leather": 2 } },
      3: { currency: 70, materials: { "leather": 3, "iron_ingot": 1 } }
    }
  },
  "leather_leggings": {
    id: "leather_leggings",
    name: "Leather Leggings",
    slot: "legs",
    type: "armor",
    description: "Thick leather chaps.",
    value: 25,
    icon: { col: 2, row: 3 },
    defense: { blunt: 2, slash: 2, pierce: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1 }
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "leather": 3 } },
      3: { currency: 130, materials: { "leather": 5, "iron_ingot": 1 } }
    }
  },
  "leather_boots": {
    id: "leather_boots",
    name: "Leather Boots",
    slot: "feet",
    type: "armor",
    description: "Sturdy leather boots with good grip.",
    value: 18,
    icon: { col: 2, row: 4 },
    defense: { blunt: 1, slash: 1, pierce: 1 },
    combat: { speed: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: { pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 35, materials: { "leather": 2 } },
      3: { currency: 100, materials: { "leather": 3, "iron_ingot": 1 } }
    }
  },

  // --- IRON ARMOR SET ---
  "iron_helmet": {
    id: "iron_helmet",
    name: "Iron Helmet",
    slot: "head",
    type: "armor",
    description: "A heavy iron helm that protects the skull.",
    value: 45,
    icon: { col: 3, row: 0 },
    defense: { blunt: 2, slash: 3, pierce: 2 },
    combat: { speed: -1 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 2, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 100, materials: { "iron_ingot": 2, "leather": 1 } },
      3: { currency: 250, materials: { "iron_ingot": 4, "leather": 2 } }
    }
  },
  "iron_armor": {
    id: "iron_armor",
    name: "Iron Armor",
    slot: "torso",
    type: "armor",
    description: "Heavy iron plates that offer excellent defense.",
    value: 120,
    icon: { col: 3, row: 1 },
    defense: { blunt: 5, slash: 6, pierce: 5 },
    combat: { speed: -2 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 2, slash: 2, pierce: 2 }
    },
    upgradeCosts: {
      2: { currency: 200, materials: { "iron_ingot": 4, "leather": 2 } },
      3: { currency: 500, materials: { "iron_ingot": 8, "leather": 4 } }
    }
  },
  "iron_gauntlets": {
    id: "iron_gauntlets",
    name: "Iron Gauntlets",
    slot: "arms",
    type: "armor",
    description: "Plated gloves. Heavy but highly protective.",
    value: 35,
    icon: { col: 3, row: 2 },
    defense: { blunt: 2, slash: 2, pierce: 2 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 80, materials: { "iron_ingot": 2, "leather": 1 } },
      3: { currency: 200, materials: { "iron_ingot": 3, "leather": 2 } }
    }
  },
  "iron_greaves": {
    id: "iron_greaves",
    name: "Iron Greaves",
    slot: "legs",
    type: "armor",
    description: "Solid iron leg guards.",
    value: 70,
    icon: { col: 3, row: 3 },
    defense: { blunt: 3, slash: 4, pierce: 3 },
    combat: { speed: -1 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 2, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 150, materials: { "iron_ingot": 3, "leather": 2 } },
      3: { currency: 350, materials: { "iron_ingot": 6, "leather": 3 } }
    }
  },
  "iron_boots": {
    id: "iron_boots",
    name: "Iron Boots",
    slot: "feet",
    type: "armor",
    description: "Heavy iron-shod boots.",
    value: 40,
    icon: { col: 3, row: 4 },
    defense: { blunt: 2, slash: 2, pierce: 2 },
    combat: { speed: -1 },
    maxLevel: 5,
    statGrowth: {
      defense: { blunt: 1, slash: 1, pierce: 1 }
    },
    upgradeCosts: {
      2: { currency: 90, materials: { "iron_ingot": 2, "leather": 1 } },
      3: { currency: 220, materials: { "iron_ingot": 4, "leather": 2 } }
    }
  },

  // --- MATERIALS ---
  "soft_wood": {
    id: "soft_wood",
    name: "Soft Wood",
    type: "material",
    description: "A piece of soft, easily workable wood.",
    value: 5,
    icon: { col: 0, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "hard_wood": {
    id: "hard_wood",
    name: "Hard Wood",
    type: "material",
    description: "Dense, durable wood ideal for tool handles and weapons.",
    value: 10,
    icon: { col: 1, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "stone": {
    id: "stone",
    name: "Stone",
    type: "material",
    description: "A rough stone.",
    value: 2,
    icon: { col: 5, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "flint": {
    id: "flint",
    name: "Flint",
    type: "material",
    description: "A sharp, sparking stone.",
    value: 4,
    icon: { col: 2, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "bone": {
    id: "bone",
    name: "Bone",
    type: "material",
    description: "A sturdy, bleached bone.",
    value: 3,
    icon: { col: 2, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "sand": {
    id: "sand",
    name: "Sand",
    type: "material",
    description: "Fine, gritty sand.",
    value: 1,
    icon: { col: 1, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "leather": {
    id: "leather",
    name: "Leather",
    type: "material",
    description: "Hide treated with tannin.",
    value: 10,
    icon: { col: 3, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "fur": {
    id: "fur",
    name: "Fur",
    type: "material",
    description: "A warm, thick animal pelt.",
    value: 6,
    icon: { col: 3, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "cotton": {
    id: "cotton",
    name: "Cotton",
    type: "material",
    description: "Fluffy raw cotton, ready to be spun.",
    value: 4,
    icon: { col: 4, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "linen": {
    id: "linen",
    name: "Linen",
    type: "material",
    description: "Strong cloth woven from refined fibers.",
    value: 8,
    icon: { col: 4, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "wheat": {
    id: "wheat",
    name: "Wheat",
    type: "material",
    description: "A golden sheaf of harvested wheat.",
    value: 3,
    icon: { col: 3, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "salt": {
    id: "salt",
    name: "Salt",
    type: "material",
    description: "Coarse rock salt, useful for preserving and alchemy.",
    value: 5,
    icon: { col: 4, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "coal": {
    id: "coal",
    name: "Coal",
    type: "material",
    description: "A combustible black rock used for forging.",
    value: 6,
    icon: { col: 2, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "iron_ore": {
    id: "iron_ore",
    name: "Iron Ore",
    type: "material",
    description: "Unrefined iron. Needs to be smelted.",
    value: 8,
    icon: { col: 5, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "iron_ingot": {
    id: "iron_ingot",
    name: "Iron Ingot",
    type: "material",
    description: "A solid ingot of iron.",
    value: 15,
    icon: { col: 5, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "copper_ore": {
    id: "copper_ore",
    name: "Copper Ore",
    type: "material",
    description: "Unrefined copper. Highly conductive.",
    value: 5,
    icon: { col: 6, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "tin_ore": {
    id: "tin_ore",
    name: "Tin Ore",
    type: "material",
    description: "Unrefined tin. Soft and silvery.",
    value: 4,
    icon: { col: 3, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "copper_ingot": {
    id: "copper_ingot",
    name: "Copper Ingot",
    type: "material",
    description: "A solid ingot of refined copper. Highly conductive.",
    value: 12,
    icon: { col: 5, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "bronze_ingot": {
    id: "bronze_ingot",
    name: "Bronze Ingot",
    type: "material",
    description: "A heavy, golden-colored alloy ingot.",
    value: 25,
    icon: { col: 6, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "meteorite": {
    id: "meteorite",
    name: "Fallen Meteorite",
    type: "material",
    description: "A strange, jagged stone fallen from the heavens. It pulses with a faint, otherworldly glow. Staring into it for too long makes your own thoughts feel loud and unfamiliar.",
    value: 250,
    icon: { col: 6, row: 1 },
    stackable: false,
    maxStack: 1
  },
  "plant_fibers": {
    id: "plant_fibers",
    name: "Plant Fibers",
    type: "material",
    description: "Tough fibers extracted from wild stalks like stinging nettle, perfect for hand-twisting into basic reverse-wrap cordage.",
    value: 2,
    icon: { col: 0, row: 3 },
    stackable: true,
    maxStack: 99
  },

  // --- CONSUMABLES ---
  "healing_herb": {
    id: "healing_herb",
    name: "Healing Herb",
    type: "consumable",
    description: "A simple herb that can be used to treat minor wounds.",
    value: 10,
    icon: { col: 0, row: 0 },
    useAbility: "minor_heal",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "invigorating_herb": {
    id: "invigorating_herb",
    name: "Invigorating Herb",
    type: "consumable",
    description: "A refreshing herb that can be used to restore stamina.",
    value: 15,
    icon: { col: 1, row: 0 },
    useAbility: "minor_recover",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "illuminating_herb": {
    id: "illuminating_herb",
    name: "Illuminating Herb",
    type: "consumable",
    description: "A refreshing herb that can be used to restore insight.",
    value: 15,
    icon: { col: 2, row: 0 },
    useAbility: "minor_channel",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "kurtus_brew": {
    id: "brew_of_madness",
    name: "Kurtus's Brew of Madness",
    type: "consumable",
    useAbility: "brew_of_madness",
    description: "Smells like ozone and bad decisions. Sets HP to 1, fills Insight.",
    icon: { col: 1, row: 1 },
    stackable: true
  },
  "bandage": {
    id: "bandage",
    name: "Bandage",
    type: "consumable",
    description: "A clean strip of woven linen used to stem bleeding and dress wounds in the field.",
    value: 12,
    icon: { col: 5, row: 3 }, 
    useAbility: "minor_heal", 
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "healing_tonic": {
    id: "healing_tonic",
    name: "Healing Tonic",
    type: "consumable",
    description: "A concentrated, alchemically distilled brew that restores a moderate amount of health much faster than raw herbs.",
    value: 30,
    icon: { col: 0, row: 1 },
    useAbility: "moderate_heal",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "invigorating_tonic": {
    id: "invigorating_tonic",
    name: "Invigorating Tonic",
    type: "consumable",
    description: "A potent draft that forcefully stimulates the heart, rapidly replenishing stamina for sustained exertion.",
    value: 40,
    icon: { col: 1, row: 1 },
    useAbility: "moderate_recover",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "illuminating_tonic": {
    id: "illuminating_tonic",
    name: "Illuminating Tonic",
    type: "consumable",
    description: "A glowing elixir that abruptly sharpens the senses and clears the mind, restoring a moderate amount of insight.",
    value: 40,
    icon: { col: 2, row: 1 },
    useAbility: "moderate_channel",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },

  // Key item: has no use ability, so it can't be used from a menu. Encounters check for it (has_item) and consume it (REMOVE_ITEM).
  // The icon cell (7, 0) is an unused slot on the item sheet; point it at the real key art.
  "small_iron_key": {
    id: "small_iron_key",
    name: "Small Iron Key",
    type: "consumable",
    description: "A small, rust-flecked iron key. It looks like it would fit the lock of a sturdy chest.",
    value: 5,
    icon: { col: 6, row: 0 },
    usability: [],
    stackable: true,
    maxStack: 10
  },
  // Paste into ItemDefinitions (src/shared/data/itemDefinitions.js), in the CONSUMABLES section.
  "torch": {
    id: "torch",
    name: "Torch",
    type: "consumable",
    description: "A pitch-soaked brand. Lit, it burns for 8 hours and throws a wide, warm orange light around you.",
    value: 6,
    icon: { col: 5, row: 0 },            // PLACEHOLDER: point this at a free cell of assets/icons/consumables.png (or draw a torch there)
    usability: ['overworld'],
    lightBuff: {
      hours: 8,                          // in-game hours (TimeSystem: 2 game minutes per real second, so 8 h = 4 real minutes)
      light: { radius: 7, color: '255, 130, 40', maxAlpha: 0.8, flickerAmp: 0.5, flickerSpeed: 0.12 }   // the player's normal light is radius 4, '255, 200, 100', 0.5
    },
    stackable: true,
    maxStack: 10
  },

  // --- ACCESSORIES ---
  "artifact_of_the_dev": {
    id: "artifact_of_the_dev",
    name: "Artifact of the Developer",
    slot: "accessory",
    type: "accessory",
    description: "A testing artifact that buffs EVERYTHING.",
    value: 9999,
    icon: { col: 0, row: 5 },
    // Testing only: grants EVERY ability in abilityDefinitions.js. Add new ability ids here as you create them.
    grantedAbilities: [
      "punch", "strike", "shield_bash", "reckless_charge", "wild_swing", "fire_punch", "slash", "uppercut",
      "execute", "hit_and_run", "cleave", "flurry", "claw", "eviscerate", "rally", "intimidate",
      "howl", "hide", "thrust", "bite", "quick_stab", "item_poison_knife", "item_throw_net", "loose_arrow",
      "quick_draw", "poisoned_arrow", "triple_shot", "arcane_dart", "magic_missile", "hyper_beam", "fireball", "meteor_shower",
      "inferno", "flamethrower", "water_blast", "waterfall", "ice_shard", "frigid_gale", "shock", "overload",
      "earthquake", "acid_pool", "vine_lash", "boulder_throw", "solar_beam", "spite", "gravity", "spirit_reap",
      "drain_life", "healing_rain", "purify", "rest", "brew_of_madness", "minor_heal", "minor_recover", "minor_channel",
      "moderate_heal", "moderate_recover", "moderate_channel", "osmose", "raise_skeleton", "bear_form", "bolster", "baton_pass",
      "counter_stance", "retreat", "switch_combatant", "take_flight", "item_bear_trap", "item_smoke_bomb"
    ],
    attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 },
    resources: { maxHp: 100, maxStamina: 50, maxInsight: 50 },
    attack: { blunt: 5, slash: 5, pierce: 5, fire: 5, ice: 5, lightning: 5, arcane: 5 },
    defense: { blunt: 5, slash: 5, pierce: 5 },
    resistance: { fire: 1.0, ice: 1.0, lightning: 1.0, arcane: 1.0 },
    critChance: 0.10,
    critMultiplier: 0.50,
    evasion: 0.01,
    corruption: 0.02,
    speed: 5,
    hpRecovery: 10,
    staminaRecovery: 20,
    insightRecovery: 5
  }
};
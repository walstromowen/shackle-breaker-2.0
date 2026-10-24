import { AbilityDefinitions } from '../abilities/abilityDefinitions.js';
// ITEM VALUES (currency): the scale is 5x the old one, so a Shortsword is 100. Every item keeps its price relative to the others.
// (artifact_of_the_dev, a test item, keeps its 9999.)

// ARMOR TIERS. Tier 0 is the tattered starter gear. Tier 1 is cloth, leather and iron: the same tier, built for different characters, so a set is chosen
// by the build and not by which is "best":
//   cloth    high magic defense and resistance (all nine magic types), low physical, and Insight recovery          -> casters
//   leather  medium physical and medium magic defense and resistance, Stamina recovery, and light feet           -> quick fighters
//   iron     the highest physical defense and resistance in the game, low magic, at the cost of speed            -> front-liners
//   (whole-set resistance: cloth 3% physical / 15% magic, leather 9% physical / 8% magic, iron 15% physical / 3% magic)
const MAGIC_TYPES = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'];
const perMagicType = (n) => Object.fromEntries(MAGIC_TYPES.map(t => [t, n]));
const perPhysType = (n) => ({ blunt: n, slash: n, pierce: n });

export const ItemDefinitions = {
  // --- WEAPONS ---
  "wooden_stick": {
    id: "wooden_stick",
    name: "Wooden Stick",
    slot: "oneHand",
    type: "weapon",
    description: "A sturdy branch found on the forest floor.",
    value: 25,
    icon: { col: 11, row: 0 },
    attack: { blunt: 3 },
    grantedAbilities: ["strike"]
    // No upgrade data: cannot be upgraded.
  },
  "wooden_club": {
    id: "wooden_club",
    name: "Wooden Club",
    slot: "oneHand",
    type: "weapon",
    description: "A thick length of hardwood, studded with iron nails at the head. It has no edge to dull and nothing to break, and it hits harder the more it is trusted.",
    value: 60,
    icon: { col: 11, row: 0 },
    attack: { blunt: 4 },                // a step above the stick (3), below the two-handed warhammer (5)
    grantedAbilities: ["strike"],
    maxLevel: 5,
    statGrowth: {
      attack: { blunt: 1 }
    },
    abilityUnlocks: {                    // a club teaches its bearer as it is upgraded
      2: ["rally"],
      3: ["reckless_charge"],
      4: ["wild_swing"]
    },
    upgradeCosts: {
      2: { currency: 30, materials: { "hard_wood": 4, "soft_wood": 6 } },
      3: { currency: 80, materials: { "hard_wood": 6, "stone": 8 } },
      4: { currency: 160, materials: { "iron_ingot": 3, "hard_wood": 8 } },
      5: { currency: 300, materials: { "bronze_ingot": 5, "iron_ingot": 5, "hard_wood": 10 } }
    }
  },
  "dagger": {
    id: "dagger",
    name: "Dagger",
    slot: "oneHand",
    type: "weapon",
    description: 'A standard dagger, perfect for quick strikes.',
    value: 100,
    icon: { col: 0, row: 0 },
    attack: { pierce: 3, slash: 2 },
    grantedAbilities: ["slash", "quick_stab"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 1, slash: 1 }
    },
    abilityUnlocks: {
      2: ["eviscerate"],
      3: ["throw_poison_dagger"],
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
    value: 100,
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
    value: 100,
    icon: { col: 2, row: 0 },
    attack: { blunt: 2, slash: 2 },   // a tool first: clearly behind the shortsword (3 / 3, +2 / +2 per level)
    grantedAbilities: ["slash", "strike"],
    harvestTool: ["axe"],
    maxLevel: 5,
    statGrowth: {
      attack: { blunt: 1, slash: 1 }
    },
    abilityUnlocks: {
      2: ["cleave"],
      3: ["wild_swing"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "hard_wood": 5, "stone": 10, "soft_wood": 10, "plant_fibers": 15 } },
      3: { currency: 150, materials: { "bronze_ingot": 5, "hard_wood": 10, "soft_wood": 15 } },
      4: { currency: 300, materials: { "bronze_ingot": 10, "hard_wood": 15, "stone": 10 } },   // no iron: the handaxe is a tool first, like the pickaxe
      5: { currency: 500, materials: { "bronze_ingot": 15, "hard_wood": 20, "stone": 15 } }
    }
  },
  "pickaxe": {
    id: "pickaxe",
    name: "Pickaxe",
    slot: "oneHand",
    type: "weapon",
    description: 'A stout pickaxe with a stone head lashed to a wooden haft. Built to break rock, not men, though it will do in a pinch. "A pick is patient. Give it time and it will open any mountain." - Commander Mentoras.',
    value: 90,
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
    value: 100,
    icon: { col: 5, row: 0 },
    attack: { pierce: 4, slash: 3 },
    grantedAbilities: ["loose_arrow", "quick_draw"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 3, slash: 2 }
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
    value: 100,
    icon: { col: 6, row: 0 },
    attack: { pierce: 4, slash: 3 },
    grantedAbilities: ["loose_arrow", "quick_draw"],
    maxLevel: 5,
    statGrowth: {
      attack: { pierce: 3, slash: 2 }
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
    value: 100,
    icon: { col: 3, row: 0 },
    attack: { blunt: 6 },
    grantedAbilities: ["strike", "cleave"],
    harvestTool: ["hammer"],
    maxLevel: 5,
    statGrowth: {
      attack: { blunt: 4 }
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
    value: 100,
    icon: { col: 4, row: 0 },
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
    value: 125,
    icon: { col: 8, row: 0 },
    attack: { slash: 6, pierce: 1 },
    grantedAbilities: ["slash"],
    harvestTool: ["sickle"],
    maxLevel: 5,
    statGrowth: {
      attack: { slash: 4, pierce: 1 }
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
    value: 150,
    icon: { col: 7, row: 0 },
    attack: { slash: 5, pierce: 3 },
    grantedAbilities: ["slash", "thrust"],
    maxLevel: 5,
    statGrowth: {
      attack: { slash: 3, pierce: 2 }
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
    value: 100,
    icon: { col: 0, row: 2 },
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
  // Upgrading an insight weapon costs ONE MORE copy of the same insight per level (2, 3, 4 and 5), plus currency.
  "insight_of_fire": {
    id: "insight_of_fire",
    name: "Insight of Fire",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a firey truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_fire": 1 } },
      3: { currency: 150, materials: { "insight_of_fire": 1 } },
      4: { currency: 300, materials: { "insight_of_fire": 1 } },
      5: { currency: 500, materials: { "insight_of_fire": 1 } }
    }
  },
  "insight_of_water": {
    id: "insight_of_water",
    name: "Insight of Water",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a watery truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_water": 1 } },
      3: { currency: 150, materials: { "insight_of_water": 1 } },
      4: { currency: 300, materials: { "insight_of_water": 1 } },
      5: { currency: 500, materials: { "insight_of_water": 1 } }
    }
  },
  "insight_of_earth": {
    id: "insight_of_earth",
    name: "Insight of Earth",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an earthy truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_earth": 1 } },
      3: { currency: 150, materials: { "insight_of_earth": 1 } },
      4: { currency: 300, materials: { "insight_of_earth": 1 } },
      5: { currency: 500, materials: { "insight_of_earth": 1 } }
    }
  },
  "insight_of_lightning": {
    id: "insight_of_lightning",
    name: "Insight of Lightning",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an electrifying truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_lightning": 1 } },
      3: { currency: 150, materials: { "insight_of_lightning": 1 } },
      4: { currency: 300, materials: { "insight_of_lightning": 1 } },
      5: { currency: 500, materials: { "insight_of_lightning": 1 } }
    }
  },
  "insight_of_ice": {
    id: "insight_of_ice",
    name: "Insight of Ice",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a frozen truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_ice": 1 } },
      3: { currency: 150, materials: { "insight_of_ice": 1 } },
      4: { currency: 300, materials: { "insight_of_ice": 1 } },
      5: { currency: 500, materials: { "insight_of_ice": 1 } }
    }
  },
  "insight_of_wind": {
    id: "insight_of_wind",
    name: "Insight of Wind",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a booming truth.",
    value: 100,
    icon: { col: 5, row: 1 },
    attack: { wind: 5},
    grantedAbilities: ["strike"],
    maxLevel: 5,
    statGrowth: {
      attack: { wind: 3 }
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "insight_of_wind": 1 } },
      3: { currency: 150, materials: { "insight_of_wind": 1 } },
      4: { currency: 300, materials: { "insight_of_wind": 1 } },
      5: { currency: 500, materials: { "insight_of_wind": 1 } }
    }
  },
  "insight_of_arcane": {
    id: "insight_of_arcane",
    name: "Insight of Arcane",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into an arcane truth.",
    value: 100,
    icon: { col: 6, row: 1 },
    attack: { arcane: 5},
    grantedAbilities: ["arcane_dart"],
    maxLevel: 5,
    statGrowth: {
      attack: { arcane: 3 }
    },
    abilityUnlocks: {
      2: ["magic_missile"],
      3: ["arcane_blast"]
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "insight_of_arcane": 1 } },
      3: { currency: 150, materials: { "insight_of_arcane": 1 } },
      4: { currency: 300, materials: { "insight_of_arcane": 1 } },
      5: { currency: 500, materials: { "insight_of_arcane": 1 } }
    }
  },
  "insight_of_light": {
    id: "insight_of_light",
    name: "Insight of Light",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a luminous truth.",
    value: 100,
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
      2: { currency: 50, materials: { "insight_of_light": 1 } },
      3: { currency: 150, materials: { "insight_of_light": 1 } },
      4: { currency: 300, materials: { "insight_of_light": 1 } },
      5: { currency: 500, materials: { "insight_of_light": 1 } }
    }
  },
  "insight_of_darkness": {
    id: "insight_of_darkness",
    name: "Insight of Darkness",
    slot: "oneHand",
    type: "weapon",
    description: "An insight into a shadowy truth.",
    value: 100,
    icon: { col: 8, row: 1 },
    attack: { dark: 5},
    grantedAbilities: ["spirit_reap"],
    maxLevel: 5,
    statGrowth: {
      attack: { dark: 3 }
    },
    upgradeCosts: {
      2: { currency: 50, materials: { "insight_of_darkness": 1 } },
      3: { currency: 150, materials: { "insight_of_darkness": 1 } },
      4: { currency: 300, materials: { "insight_of_darkness": 1 } },
      5: { currency: 500, materials: { "insight_of_darkness": 1 } }
    }
  },

  // --- TATTERED ARMOR SET (Non-Upgradeable Starter Gear) ---
  "tattered_hood": {
    id: "tattered_hood",
    tier: 0,
    name: "Tattered Hood",
    slot: "head",
    type: "armor",
    description: "A tattered hood that barely keeps the rain off.",
    value: 40,
    icon: { col: 0, row: 0 },
    defense: { slash: 1 },
    resistance: { lightning: 0.01, ice: 0.01, wind: 0.01, light: 0.01 }
  },
  "tattered_shirt": {
    id: "tattered_shirt",
    tier: 0,
    name: "Tattered Shirt",
    slot: "torso",
    type: "armor",
    description: "A tattered shirt that offers little physical protection but breathes well.",
    value: 75,
    icon: { col: 0, row: 1 },
    defense: { blunt: 1, slash: 1, pierce: 1 },
    resistance: { pierce: 0.01 }
  },
  "tattered_gloves": {
    id: "tattered_gloves",
    tier: 0,
    name: "Tattered Gloves",
    slot: "arms",
    type: "armor",
    description: "Tattered gloves. Better than bare hands.",
    value: 25,
    icon: { col: 1, row: 2 },
    defense: { fire: 1 },
    resistance: { earth: 0.02 }
  },
  "tattered_pants": {
    id: "tattered_pants",
    tier: 0,
    name: "Tattered Pants",
    slot: "legs",
    type: "armor",
    description: "Tattered trousers.",
    value: 50,
    icon: { col: 0, row: 3 },
    defense: { blunt: 1, slash: 1 },
    resistance: { slash: 0.01 }
  },
  "tattered_boots": {
    id: "tattered_boots",
    tier: 0,
    name: "Tattered Boots",
    slot: "feet",
    type: "armor",
    description: "Tattered boots.",
    value: 30,
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
    description: "A hood of tightly woven cloth. Quiet to wear, and it hums faintly against hostile magic.",
    value: 75,
    icon: { col: 1, row: 0 },
    tier: 1,
    defense: { slash: 1, ...perMagicType(2) },
    resistance: { ...perPhysType(0.01), ...perMagicType(0.03) },
    resources: { insightRecovery: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: perMagicType(1)
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
    description: "A woven robe sewn through with warding thread. Poor against a blade, and very good against a spell.",
    value: 200,
    icon: { col: 1, row: 1 },
    tier: 1,
    grantedAbilities: ["draw_insight"],
    defense: { blunt: 1, slash: 1, pierce: 1, ...perMagicType(4) },
    resistance: { ...perPhysType(0.01), ...perMagicType(0.05) },
    resources: { insightRecovery: 2 },
    maxLevel: 5,
    statGrowth: {
      defense: perMagicType(1)
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
    description: "Thin gloves stitched with warding thread.",
    value: 60,
    icon: { col: 1, row: 2 },
    tier: 1,
    defense: { blunt: 1, ...perMagicType(1) },
    resistance: perMagicType(0.02),
    maxLevel: 5,
    statGrowth: {
      defense: perMagicType(1)
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
    description: "Woven trousers that turn aside a little magic.",
    value: 125,
    icon: { col: 1, row: 3 },
    tier: 1,
    defense: { blunt: 1, slash: 1, ...perMagicType(3) },
    resistance: { ...perPhysType(0.01), ...perMagicType(0.03) },
    resources: { insightRecovery: 1 },
    maxLevel: 5,
    statGrowth: {
      defense: perMagicType(1)
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
    description: "Soft-soled shoes. The thread in the hem eases the flow of magic.",
    value: 90,
    icon: { col: 1, row: 4 },
    tier: 1,
    defense: { blunt: 1, ...perMagicType(1) },
    resistance: perMagicType(0.02),
    maxLevel: 5,
    statGrowth: {
      defense: perMagicType(1)
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
    value: 75,
    icon: { col: 2, row: 0 },
    tier: 1,
    defense: { blunt: 1, slash: 2, pierce: 2 },
    resistance: { ...perPhysType(0.02), ...perMagicType(0.02) },
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
    value: 200,
    icon: { col: 2, row: 1 },
    tier: 1,
    grantedAbilities: ["recuperate"],
    abilityUnlocks: { 2: ["hide"] },
    defense: { blunt: 4, slash: 4, pierce: 3 },
    resistance: { ...perPhysType(0.03), ...perMagicType(0.03) },
    resources: { staminaRecovery: 2 },
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
    value: 60,
    icon: { col: 2, row: 2 },
    tier: 1,
    defense: { blunt: 1, slash: 2, pierce: 1 },
    resistance: { ...perPhysType(0.01), ...perMagicType(0.01) },
    resources: { staminaRecovery: 1 },
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
    value: 125,
    icon: { col: 2, row: 3 },
    tier: 1,
    defense: { blunt: 2, slash: 3, pierce: 2 },
    resistance: { ...perPhysType(0.02), ...perMagicType(0.01) },
    resources: { staminaRecovery: 1 },
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
    value: 90,
    icon: { col: 2, row: 4 },
    tier: 1,
    defense: { blunt: 1, slash: 2, pierce: 1 },
    resistance: { ...perPhysType(0.01), ...perMagicType(0.01) },
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
    value: 75,
    icon: { col: 3, row: 0 },
    tier: 1,
    defense: { blunt: 2, slash: 3, pierce: 2 },
    resistance: { ...perPhysType(0.03), ...perMagicType(0.01) },
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
    value: 200,
    icon: { col: 3, row: 1 },
    tier: 1,
    grantedAbilities: [],
    abilityUnlocks: { 2: ["bolster"] },
    defense: { blunt: 5, slash: 6, pierce: 5 },
    resistance: { ...perPhysType(0.05), ...perMagicType(0.01) },
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
    value: 60,
    icon: { col: 3, row: 2 },
    tier: 1,
    defense: { blunt: 2, slash: 2, pierce: 2 },
    resistance: { ...perPhysType(0.02) },
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
    value: 125,
    icon: { col: 3, row: 3 },
    tier: 1,
    defense: { blunt: 3, slash: 4, pierce: 3 },
    resistance: { ...perPhysType(0.03), ...perMagicType(0.01) },
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
    value: 90,
    icon: { col: 3, row: 4 },
    tier: 1,
    defense: { blunt: 2, slash: 2, pierce: 2 },
    resistance: { ...perPhysType(0.02) },
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
    value: 3,
    icon: { col: 5, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "flint": {
    id: "flint",
    name: "Flint",
    type: "material",
    description: "A sharp, sparking stone.",
    value: 5,
    icon: { col: 2, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "bone": {
    id: "bone",
    name: "Bone",
    type: "material",
    description: "A sturdy, bleached bone.",
    value: 4,
    icon: { col: 2, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "sand": {
    id: "sand",
    name: "Sand",
    type: "material",
    description: "Fine, gritty sand.",
    value: 2,
    icon: { col: 1, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "leather": {
    id: "leather",
    name: "Leather",
    type: "material",
    description: "Hide treated with tannin.",
    value: 12,
    icon: { col: 3, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "fur": {
    id: "fur",
    name: "Fur",
    type: "material",
    description: "A warm, thick animal pelt.",
    value: 7,
    icon: { col: 3, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "cotton": {
    id: "cotton",
    name: "Cotton",
    type: "material",
    description: "Fluffy raw cotton, ready to be spun.",
    value: 5,
    icon: { col: 4, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "linen": {
    id: "linen",
    name: "Linen",
    type: "material",
    description: "Strong cloth woven from refined fibers.",
    value: 10,
    icon: { col: 4, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "wheat": {
    id: "wheat",
    name: "Wheat",
    type: "material",
    description: "A golden sheaf of harvested wheat.",
    value: 4,
    icon: { col: 3, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "salt": {
    id: "salt",
    name: "Salt",
    type: "material",
    description: "Coarse rock salt, useful for preserving and alchemy.",
    value: 6,
    icon: { col: 4, row: 2 },
    stackable: true,
    maxStack: 99
  },
  "coal": {
    id: "coal",
    name: "Coal",
    type: "material",
    description: "A combustible black rock used for forging.",
    value: 7,
    icon: { col: 2, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "iron_ore": {
    id: "iron_ore",
    name: "Iron Ore",
    type: "material",
    description: "Unrefined iron. Needs to be smelted.",
    value: 12,
    icon: { col: 5, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "iron_ingot": {
    id: "iron_ingot",
    name: "Iron Ingot",
    type: "material",
    description: "A solid ingot of iron.",
    value: 30,
    icon: { col: 5, row: 1 },
    stackable: true,
    maxStack: 99
  },
  "copper_ore": {
    id: "copper_ore",
    name: "Copper Ore",
    type: "material",
    description: "Unrefined copper. Highly conductive.",
    value: 6,
    icon: { col: 6, row: 0 },
    stackable: true,
    maxStack: 99
  },
  "tin_ore": {
    id: "tin_ore",
    name: "Tin Ore",
    type: "material",
    description: "Unrefined tin. Soft and silvery.",
    value: 6,
    icon: { col: 7, row: 0 },            // was (3,2), the wheat sheaf
    stackable: true,
    maxStack: 99
  },
  "copper_ingot": {
    id: "copper_ingot",
    name: "Copper Ingot",
    type: "material",
    description: "A solid ingot of refined copper. Highly conductive.",
    value: 16,
    icon: { col: 6, row: 1 },            // was (5,2), the grey stone
    stackable: true,
    maxStack: 99
  },
  "bronze_ingot": {
    id: "bronze_ingot",
    name: "Bronze Ingot",
    type: "material",
    description: "A heavy, golden-colored alloy ingot.",
    value: 32,
    icon: { col: 9, row: 1 },            // was (6,2), an empty cell. The sprite was also cut across cells 9/10: fixed in materials.png
    stackable: true,
    maxStack: 99
  },
  "meteorite": {
    id: "meteorite",
    name: "Fallen Meteorite",
    type: "material",
    description: "A strange, jagged stone fallen from the heavens. It pulses with a faint, otherworldly glow. Staring into it for too long makes your own thoughts feel loud and unfamiliar.",
    value: 1250,
    icon: { col: 3, row: 2 },            // PLACEHOLDER (empty cell): the sheet has no meteorite art. It was (6,1), the copper ingot. Draw one here.
                                         // QUEST ITEM too: encounters check for it with { type: "has_item", itemId: "meteorite" } and take it with REMOVE_ITEM (also a Kurtus Brew ingredient).
    usable: true,                        // "Use" in the item menu, on the character viewed: frees a shackled one (see CorruptionSystem). Spent when it works.
    useAbility: "meteorite_unshackle",
    usability: ['overworld'],
    noHotbar: true,                      // the menu only: it is a quest item too, not something to fire off by key
    stackable: false,
    maxStack: 1
  },
  "plant_fibers": {
    id: "plant_fibers",
    name: "Plant Fibers",
    type: "material",
    description: "Tough fibers extracted from wild stalks like stinging nettle, perfect for hand-twisting into basic reverse-wrap cordage.",
    value: 3,
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
    value: 6,
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
    value: 6,
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
    value: 6,
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
  "healing_tonic": {
    id: "healing_tonic",
    name: "Healing Tonic",
    type: "consumable",
    description: "A concentrated, alchemically distilled brew that restores a moderate amount of health much faster than raw herbs.",
    value: 60,
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
    value: 60,
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
    value: 60,
    icon: { col: 2, row: 1 },
    useAbility: "moderate_channel",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },

  // --- Status cures: each removes ONE status from the character it is used on (and is only spent if there was something to cure). Icons: consumables sheet cells (7,1) (8,1) (9,1).
  "bandage": {
    id: "bandage",
    name: "Bandage",
    type: "consumable",
    description: "A clean roll of cloth pressed hard over a wound. Stops bleeding and closes the wound a little.",
    value: 8,
    icon: { col: 7, row: 1 },
    useAbility: "item_bandage",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "antidote": {
    id: "antidote",
    name: "Antidote",
    type: "consumable",
    description: "A bitter golden draught that drives venom out of the blood. Cures poison and restores a little health.",
    value: 12,
    icon: { col: 5, row: 1 },
    useAbility: "item_antidote",
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
  },
  "aloe": {
    id: "aloe",
    name: "Aloe",
    type: "consumable",
    description: "A fleshy leaf full of cool gel that soothes scorched skin. Cures burns and restores a little health. Grows wild in the desert.",
    value: 6,
    icon: { col: 8, row: 1 },
    useAbility: "item_aloe",
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
    value: 25,
    icon: { col: 6, row: 0 },
    usability: [],
    stackable: true,
    maxStack: 10
  },
  // QUEST ITEM, same pattern as the small iron key: no useAbility and nothing to use, so it just sits in the bag until an encounter asks for it
  // ({ type: "has_item", itemId: "large_iron_key" } as a condition, REMOVE_ITEM to spend it).
  "large_iron_key": {
    id: "large_iron_key",
    name: "Large Iron Key",
    type: "consumable",
    description: "A heavy, pitted iron key as long as a hand. Whatever it opens was built to keep something in, or someone out.",
    value: 25,
    icon: { col: 6, row: 1 },            // consumables.png
    usability: [],
    stackable: true,
    maxStack: 10
  },
  "torch": {
    id: "torch",
    name: "Torch",
    type: "consumable",
    description: "A pitch-soaked brand. Lit, it burns for 8 hours and throws a wide, warm orange light around you.",
    value: 30,
    icon: { col: 5, row: 0 },            // consumables.png
    useAbility: "torchlight",            // what makes it usable from the item menu AND placeable on the hotbar (the light itself is defined by that ability)
    usability: ['overworld'],
    stackable: true,
    maxStack: 10
  },
  "escape_rope": {
    id: "escape_rope",
    name: "Escape Rope",
    type: "consumable",
    description: "A coil of waxed rope that plays out behind you as you go in. Pull it, and you are hauled back out to the entrance of the cave or building you are in. Does nothing outside.",
    value: 125,
    icon: { col: 9, row: 0 },            // consumables.png
    useAbility: "escape_rope",           // usable from the item menu AND placeable on the hotbar (the effect is defined by that ability)
    usability: ['overworld'],
    stackable: true,
    maxStack: 10
  },
  "interior_map": {
    id: "interior_map",
    name: "Interior Map",
    type: "consumable",
    description: "A hand-drawn plan of the place you are standing in. Unfold it inside a cave or building and its layout shows on your minimap until you leave. It is used up. Does nothing outside.",
    value: 200,
    icon: { col: 11, row: 0 },           // consumables.png
    useAbility: "read_interior_map",     // usable from the item menu AND placeable on the hotbar (the effect is defined by that ability)
    usability: ['overworld'],
    stackable: true,
    maxStack: 10
  },
  "bedroll": {
    id: "bedroll",
    name: "Bedroll",
    type: "consumable",
    description: "A rolled-up blanket and a bit of oilcloth. Spread it out to sleep for twelve hours. It wears out and is used up each time.",
    value: 150,
    icon: { col: 10, row: 0 },           // consumables.png
    useAbility: "use_bedroll",           // fades out and moves the clock twelve hours (the hours are in that ability); no encounter
    usability: ['overworld'],
    stackable: true,
    maxStack: 10
  },

  // --- COMBAT ITEMS (thrown or set in a fight; each spends one when used) ---
  // usability is only a note: what decides it is the context of the ability (battle-only for a thrown knife, both for the bear trap).
  "throwing_knife": {
    id: "throwing_knife",
    name: "Throwing Knife",
    type: "consumable",
    description: "A balanced blade made for throwing. Used in battle; it is not recovered.",
    value: 40,
    icon: { col: 7, row: 0 },            // consumables.png
    useAbility: "item_throwing_knife",
    usability: ['battle'],
    stackable: true,
    maxStack: 20
  },
  "poison_throwing_knife": {
    id: "poison_throwing_knife",
    name: "Poison Throwing Knife",
    type: "consumable",
    description: "A throwing knife coated in a clinging venom. It hits lightly, but the poison keeps working. Used in battle.",
    value: 100,
    icon: { col: 8, row: 0 },            // consumables.png
    useAbility: "item_poison_knife",
    usability: ['battle'],
    stackable: true,
    maxStack: 20
  },
  "bear_trap": {
    id: "bear_trap",
    name: "Bear Trap",
    type: "consumable",
    description: "Heavy iron jaws on a spring. Set it, in battle or before one, and the next enemy to strike you in melee is bitten and held fast.",
    value: 150,
    icon: { col: 3, row: 0 },            // consumables.png
    useAbility: "item_bear_trap",        // usable from the item menu, in battle, and from the hotbar
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 10
  },
  "smoke_bomb": {
    id: "smoke_bomb",
    name: "Smoke Bomb",
    type: "consumable",
    description: "A packed shell of charcoal and sand with a short fuse. In battle it fills the air with thick smoke, making one ally much harder to hit for 3 turns. Set off on the overworld, the smoke hides the whole party for 4 hours: no random battles (story encounters still find you).",
    value: 75,
    icon: { col: 4, row: 1 },            // PLACEHOLDER (empty cell): no smoke bomb art on assets/icons/consumables.png yet
    useAbility: "item_smoke_bomb",       // usable in battle, from the item menu and from the hotbar (the overworld effect is in that ability)
    usability: ['overworld', 'battle'],
    stackable: true,
    maxStack: 20
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
    // Testing only: grants EVERY ability in abilityDefinitions.js, including the ones you add later (the list is read from there, so it never goes stale).
    grantedAbilities: Object.keys(AbilityDefinitions),
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

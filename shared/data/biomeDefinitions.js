import { CONFIG } from './constants.js'; 

export const BIOME_DEFINITIONS = { 
  PLAINS: { 
    id: 'PLAINS', 
    sheetId: 'plains', 
    objectSheetId: 'plainsMapObjects', 
    allowedWeather: ['rain', 'fog'], 
    music: { day: 'plainsBgmDay', night: 'plainsBgmNight', battle: 'plainsBattleBgm' }, 
    battleBackgrounds: { day: 'plainsBattleDayBg', dusk: 'plainsBattleDuskBg', night: 'plainsBattleNightBg' }, 
    shapeElevation: (noise) => noise, 
    
    structures: {
        rate: 0.10, // 10% chance per chunk
        pools: [
            { chance: 1.00, id: 'ABANDONED_VILLAGE' }
        ]
    },
    
    // RESTORED MAP OBJECTS 
    mapObjects: { 
      [CONFIG.TILE_TYPES.LAYER_2]: [ 
        { chance: 0.014, id: 'OAK_TREE_1', footprint: 2 }, 
        { chance: 0.044, id: 'PINE_TREE' }, 
        { chance: 0.074, id: 'SMALL_ROCKS_1' }, 
        { chance: 0.20, rangeStart: 0.10, pool: ['TULIPS_RED', 'TULIPS_WHITE', 'TULIPS_ORANGE'] }, 
        { chance: 0.70, rangeStart: 0.30, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2', 'GRASS_COVERAGE_3'] } 
      ], 
      [CONFIG.TILE_TYPES.LAYER_1]: [ 
        { chance: 0.15, id: 'SMALL_ROCKS_1' } 
      ], 
      _WALLS: [ 
        { chance: 0.05, id: 'PINE_TREE' }, 
        { chance: 0.10, id: 'SMALL_ROCKS_1' }, 
        { chance: 0.30, rangeStart: 0.15, pool: ['GRASS_COVERAGE_1', 'GRASS_COVERAGE_2'] } 
      ] 
    }, 
    encounters: { 
      rate: 0.001, 
      pools: [ 
        { chance: 0.30, id: 'wounded_mutt' }, 
      ] 
    }, 
    battles: { 
      rate: 0.1, 
      pools: { 
        easy: [ 
          { chance: 0.25, enemies: ['ROTTING_MAN', 'MAD_MAN', 'ROTTING_MAN'] }, 
          { chance: 0.25, enemies: ['SHACKLED_STEED', 'MAD_MAN'] } ,
           { chance: 0.5, enemies: ['WOLF', 'WOLF'] } 
        ], 
        normal: [ 
          { chance: 0.20, enemies: ['MAD_MAN', 'MAD_MAGE', 'MAD_MAN'] }, 
          { chance: 0.20, enemies: ['SHACKLED_STEED', 'MAD_MAN'] }, 
           { chance: 0.20, enemies: ['ROTTING_MAN', 'MAD_MAN', 'ROTTING_MAN'] }, 
          { chance: 0.20, enemies: ['WOLF', 'WOLF'] }, 
          { chance: 0.20, enemies: [ 
            { id: 'LEGIONARY', levelOffset: 5, traits: ['iron_willed'], equipment: { mainHand: 'warhammer' } }, 
            { id: 'LEGIONARY' }, 
            { id: 'MAD_MAGE' } 
          ]} 
        ], 
        hard: [ 
          { chance: 0.30, enemies: ['LEGIONARY', 'MAD_MAGE', 'LEGIONARY', 'WOLF'] }, 
          { chance: 0.30, enemies: ['SHACKLED_STEED', 'WOLF', 'MAD_MAN'] }, 
          { chance: 0.40, enemies: [ 
            { id: 'LEGIONARY', levelOffset: 5, traits: ['iron_willed'], equipment: { mainHand: 'warhammer' } }, 
            { id: 'LEGIONARY' }, 
            { id: 'LEGIONARY' }, 
            { id: 'MAD_MAGE' } 
          ]} 
        ], 
        nightmare: [ 
          { chance: 0.50, enemies: ['LEGIONARY', 'MAD_MAGE', 'MAD_MAGE', 'LEGIONARY', 'LEGIONARY'] }, 
          { chance: 0.50, enemies: ['SHACKLED_STEED', 'SHACKLED_STEED', 'MAD_MAN'] } 
        ] 
      } 
    } 
  }, 

  DESERT: { 
    id: 'DESERT', 
    sheetId: 'desert', 
    allowedWeather: ['sandstorm'], 
    objectSheetId: 'desertMapObjects', 
    music: { day: 'desertBgmDay', night: 'desertBgmNight', battle: 'desertBattleBgm' }, 
    battleBackgrounds: { day: 'desertBattleDayBg', dusk: 'desertBattleDuskBg', night: 'desertBattleNightBg' }, 
    shapeElevation: (noise) => { 
      if (noise < -0.20) { 
        return noise; 
      } else if (noise < 0.50) { 
        return 0.05 + (noise * 0.1); 
      } else { 
        return Math.min(0.65, 0.25 + ((noise - 0.50) * 10.0)); 
      } 
    }, 

    structures: {
        rate: 0.10, 
        pools: [
            { chance: 1.00, id: 'ABANDONED_VILLAGE' }
        ]
    },

    // RESTORED MAP OBJECTS 
    mapObjects: { 
      [CONFIG.TILE_TYPES.LAYER_2]: [ 
        { chance: 0.15, id: 'SMALL_ROCKS_1' }, 
        { chance: 0.50, rangeStart: 0.30, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] } 
      ], 
      _WALLS: [ 
        { chance: 0.05, id: 'SMALL_ROCKS_1' }, 
        { chance: 0.50, rangeStart: 0.30, pool: ['SAND_DUNE_1', 'SAND_DUNE_2', 'SAND_DUNE_3'] } 
      ] 
    }, 
    encounters: { 
      rate: 0.001, 
      pools: [ 
        { chance: 0.80, id: 'wounded_mutt', allowedTimes: ['day'] }, 
      ] 
    }, 
    battles: { 
      rate: 0.1, 
      pools: { 
        easy: [ 
          { chance: 1.00, enemies: ['SAND_STALKER', 'SAND_STALKER'] } 
        ], 
        normal: [ 
          { chance: 0.50, enemies: ['SAND_STALKER', 'SAND_STALKER'] }, 
          { chance: 0.30, enemies: ['SAND_STALKER', 'SAND_STALKER', 'SAND_STALKER'] }, 
          { chance: 0.20, enemies: ['LEGIONARY', 'LEGIONARY'] } 
        ], 
        hard: [ 
          { chance: 0.50, enemies: ['SAND_STALKER', 'SAND_STALKER', 'SAND_STALKER', 'SAND_STALKER'] }, 
          { chance: 0.50, enemies: ['LEGIONARY', 'LEGIONARY', 'LEGIONARY', 'MAD_MAN'] } 
        ], 
        nightmare: [ 
          { chance: 1.00, enemies: ['LEGIONARY', 'LEGIONARY', 'MAD_MAGE', 'LEGIONARY', 'LEGIONARY', 'MAD_MAN'] } 
        ] 
      } 
    } 
  },

  HOUSE_INTERIOR: {
    id: 'HOUSE_INTERIOR',
    sheetId: 'plains',
    objectSheetId: 'plainsMapObjects', 
    allowedWeather: [],
    music: { day: 'homeBgmDay', night: 'homeBgmNight', battle: 'plainsBattleBgm' },
    battleBackgrounds: { day: 'houseInteriorBg', dusk: 'houseInteriorBg', night: 'houseInteriorBg' },
    shapeElevation: (noise) => noise,
    structures: { rate: 0, pools: [] },
    
    mapObjects: { 
      [CONFIG.TILE_TYPES.LAYER_2]: [], 
      _WALLS: []
    },
    
    encounters: { rate: 0, pools: [] },
    battles: { rate: 0, pools: { easy: [], normal: [], hard: [], nightmare: [] } } 
  }
};
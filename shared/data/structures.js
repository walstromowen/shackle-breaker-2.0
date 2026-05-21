export const STRUCTURES = {
  // ==========================================
  // SUPER STRUCTURE (The Blueprint)
  // ==========================================
  ABANDONED_VILLAGE: {
    type: 'BLUEPRINT',
    centerPrefab: 'ABANDONED_CENTER',
    pathTile: 1,
    branchChance: 0.8,
    branchLength: { min: 8, max: 15 },
    modules: [
      { prefab: 'ABANDONED_HOUSE_SOUTH', spacing: 6, offset: 1, spawnChance: 0.5 },
      { prefab: 'ABANDONED_HOUSE_NORTH', spacing: 6, offset: 1, spawnChance: 0.5 },
      { prefab: 'ABANDONED_HOUSE_EAST',  spacing: 6, offset: 1, spawnChance: 0.5 },
      { prefab: 'ABANDONED_HOUSE_WEST',  spacing: 6, offset: 1, spawnChance: 0.5 },
      { prefab: 'ABANDONED_STORAGE',     spacing: 6, offset: 1, spawnChance: 0.4 },
      { prefab: 'ABANDONED_CAMP_SITE',   spacing: 6, offset: 1, spawnChance: 0.3 },
      { prefab: 'ABANDONED_RUINS',       spacing: 6, offset: 1, spawnChance: 0.6 },
      { prefab: 'ABANDONED_OVERGROWN',   spacing: 6, offset: 1, spawnChance: 0.4 }
    ]
  },

  // ==========================================
  // 9 SUB-STRUCTURES (The Modular Pieces)
  // ==========================================
  ABANDONED_CENTER: {
    type: 'PREFAB',
    width: 5,
    height: 5,
    terrain: [
      [null,    1,    1,    1,   null],
      [1,    1,    1,    1,   1],
      [1,    1,    1,    1,   1],
      [1,    1,    1,    1,   1],
      [null,    1,    1,    1,   null],
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'CAMPFIRE', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_HOUSE_SOUTH: {
    type: 'PREFAB',
    width: 4,
    height: 5,
    terrain: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_HOUSE_NORTH: {
    type: 'PREFAB',
    width: 4,
    height: 5,
    terrain: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_HOUSE_EAST: {
    type: 'PREFAB',
    width: 6,
    height: 3,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_HOUSE_WEST: {
    type: 'PREFAB',
    width: 6,
    height: 3,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_STORAGE: {
    type: 'PREFAB',
    width: 6,
    height: 5,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_OVERGROWN: {
    type: 'PREFAB',
    width: 6,
    height: 5,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_CAMP_SITE: {
    type: 'PREFAB',
    width: 6,
    height: 5,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  },

  ABANDONED_RUINS: {
    type: 'PREFAB',
    width: 6,
    height: 5,
    terrain: [
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null]
    ],
    objects: [
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1'],
      ['BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1', 'BOULDER_1']
    ]
  }
};
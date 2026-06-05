import { CONFIG } from '../data/constants.js';
import { gameState } from '../state/gameState.js';
import { biomeFactory } from './factories/biomeFactory.js';

const INTERIOR_LAYOUTS = {
  HOUSE_INTERIOR: {
    bounds: { minC: -4, maxC: 4, minR: -4, maxR: 4 },
    
    // --- NEW: THE MISSING SPAWN FUNCTION ---
    getSpawn: (bounds) => {
      // Spawn the player at col: 0, and one tile above the bottom wall!
      return { col: 0, row: bounds.maxR - 1 };
    },

    getTile: (col, row, bounds, TILES) => {
      // Carve out a dynamic doorway at the bottom center
      if (col === 0 && row === bounds.maxR) return TILES.LAYER_2;
      
      // Perimeter Walls
      if (col === bounds.minC || col === bounds.maxC || row === bounds.minR || row === bounds.maxR) {
        return TILES.LAYER_4; // Wooden wall layer
      }
      return TILES.LAYER_2; // Wooden floor layer
    },
    
    getObject(col, row, bounds, generator) {
      // 1. Interactive Doorway
      if (col === 0 && row === bounds.maxR) return 'HOUSE_EXIT_DOOR';
      
      // 2. Pre-placed layout items (your static chest)
      if (col === -1 && row === -1) return 'OAK_TREE_1';

    

      return null;
    }
  }
};

export class InteriorGenerator {
  constructor(seed, type) {
    this.type = type;
    this.TILES = CONFIG.TILE_TYPES;

    // 1. Calculate the unique seed based on the door ID
    let uniqueHouseModifier = 0;
    if (gameState.world.interiorId) {
      uniqueHouseModifier = gameState.world.interiorId.split('_')
        .reduce((acc, val) => acc + parseInt(val), 0);
    }
    this.seed = seed + uniqueHouseModifier;

    this.layoutProfile = INTERIOR_LAYOUTS[this.type] || INTERIOR_LAYOUTS.HOUSE_INTERIOR;
    this.bounds = this.layoutProfile.bounds;

    // --- TEST OAK TREE PLACEMENT ---
    const width = this.bounds.maxC - this.bounds.minC - 1; 
    const height = this.bounds.maxR - this.bounds.minR - 2; 

    // Wrapped in Math.abs to guarantee safe grid coordinates if seed math goes negative
    this.testTreeCol = this.bounds.minC + 1 + (Math.abs(this.seed) % width);
    this.testTreeRow = this.bounds.minR + 1 + (Math.abs(this.seed * 3) % height);
    
    // Safety check: Prevent the tree from ever accidentally blocking the front door warp tile
    if (this.testTreeCol === 0 && this.testTreeRow === this.bounds.maxR - 1) {
      this.testTreeRow -= 1; 
    }
  }

  getBiomeAt(col, row) {
    const biome = biomeFactory.getBiome(this.type);
    return biome || biomeFactory.getBiome('PLAINS');
  }

  getTileAt(col, row) {
    // 1. HARD OUT OF BOUNDS: Return void layer
    if (col < this.bounds.minC - 1 || col > this.bounds.maxC + 1 || row < this.bounds.minR - 1 || row > this.bounds.maxR + 1) {
      return this.TILES.LAYER_0;
    }
    // 2. BUFFER RING: Render an impenetrable LAYER_4 wall block exactly 1 tile outside the room
    if (col === this.bounds.minC - 1 || col === this.bounds.maxC + 1 || row === this.bounds.minR - 1 || row === this.bounds.maxR + 1) {
      return this.TILES.LAYER_4;
    }
    // 3. INSIDE THE ROOM: Render the layout
    return this.layoutProfile.getTile(col, row, this.bounds, this.TILES);
  }

  getObjectIdAt(col, row) {
    // Ensure the object logic is checked exactly to the bounds so the door can spawn at maxR
    if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) {
      return null;
    }
    return this.layoutProfile.getObject(col, row, this.bounds, this);
  }

  getEntrySpawnPoint() {
    return this.layoutProfile.getSpawn(this.bounds);
  }

  invalidateTile(key) { }
}
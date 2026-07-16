// 1. Directly import the individual encounters
import { aDisturbingSight } from './encounters/aDisturbingSight.js';
import { oakTree } from './encounters/oakTree.js';
import { woundedMutt } from './encounters/woundedMutt.js';
import { bonfire } from './encounters/bonfire.js';
import { wildHunt } from './encounters/wildHunt.js';
import { treasureChest } from './encounters/treasureChest.js';

// 2. Map them by their explicit system IDs
export const encounterDefinitions = {
  [oakTree.id]: oakTree,
  [woundedMutt.id]: woundedMutt,
  [aDisturbingSight.id]: aDisturbingSight,
  [bonfire.id]: bonfire,
  [wildHunt.id]: wildHunt,
  [treasureChest.id]: treasureChest,
  
  // When you make a new encounter, it's just two quick steps:
  // 1. Import it at the top.
  // 2. Add `[yourEncounter.id]: yourEncounter,` right here.
};
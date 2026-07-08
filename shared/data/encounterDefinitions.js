// 1. Directly import the individual encounters
import { madmanAhead } from './encounters/madmanAhead.js';
import { oakTree } from './encounters/oakTree.js';
import { woundedMutt } from './encounters/woundedMutt.js';

// 2. Map them by their explicit system IDs
export const encounterDefinitions = {
  [oakTree.id]: oakTree,
  [woundedMutt.id]: woundedMutt,
  [madmanAhead.id]: madmanAhead,
  
  // When you make a new encounter, it's just two quick steps:
  // 1. Import it at the top.
  // 2. Add `[yourEncounter.id]: yourEncounter,` right here.
};
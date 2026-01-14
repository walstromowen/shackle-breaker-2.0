import { bonfire } from '../data/encounters/bonfire.js';
import { oakTree } from '../data/encounters/oakTree.js';

const encounters = {
    "bonfire": bonfire,
    "oakTree": oakTree  
};

export const EncounterRegistry = {
    get: (id) => encounters[id] || null
};
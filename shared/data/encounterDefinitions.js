// 1. Directly import the individual encounters
import { aDisturbingSight } from './encounters/aDisturbingSight.js';
import { woundedMutt } from './encounters/woundedMutt.js';
import { bonfire } from './encounters/bonfire.js';
import { wildHunt } from './encounters/wildHunt.js';
import { treasureChest } from './encounters/treasureChest.js';
import { testEncounter } from './encounters/testEncounter.js';
import { strangeObelisk } from './encounters/strangeObelisk.js';
import { suspiciousMerchant } from './encounters/suspiciousMerchant.js';
import { aftermath } from './encounters/aftermath.js';
import { ironChest } from './encounters/ironChest.js';
import { tracksInTheSnow } from './encounters/tracksInTheSnow.js';
import { mysteriousAltar } from './encounters/mysteriousAltar.js';
import { prologue } from './encounters/prologue.js';

// <-- Import your new encounter here

// 2. Map them by their explicit system IDs
export const encounterDefinitions = {
    [woundedMutt.id]: woundedMutt,
    [aDisturbingSight.id]: aDisturbingSight,
    [bonfire.id]: bonfire,
    [wildHunt.id]: wildHunt,
    [treasureChest.id]: treasureChest,
    [testEncounter.id]: testEncounter,
    [strangeObelisk.id]: strangeObelisk,
    [suspiciousMerchant.id]: suspiciousMerchant,
    [aftermath.id]: aftermath,
    [ironChest.id]: ironChest,
    [tracksInTheSnow.id]: tracksInTheSnow,
    [mysteriousAltar.id]: mysteriousAltar,
    [prologue.id]: prologue,

    
    // <-- Add your new encounter here
    
    // When you make a new encounter, it's just two quick steps:
    // 1. Import it at the top.
    // 2. Add `[yourEncounter.id]: yourEncounter,` right here.
};
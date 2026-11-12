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
import { mysteriousAltar } from './encounters/story/mysteriousAltar.js';
import { hoodedStranger } from './encounters/story/hoodedStranger.js';
import { nikoli, nikoliAfterBattle } from './encounters/story/nikoli.js';
import { dryKrakenAmbush, codeyFreed } from './encounters/story/codey.js';
import { jaeger } from './encounters/story/jaeger.js';
import { ruinedCarriage } from './encounters/ruinedCarriage.js';
import { prologue } from './encounters/story/prologue.js';
import { actTwo } from './encounters/story/actTwo.js';
import { peculiarScarecrow } from './encounters/peculiarScarecrow.js';
import { oldGravestone } from './encounters/oldGravestone.js';
import { caveIn } from './encounters/caveIn.js';
import { arrowTrap, pitTrap, swingingAxes } from './encounters/catacombTraps.js';
import { catacombVaultDoor, infernusSentinel, infernusSentinelFallen } from './encounters/catacombDepths.js';
import { shackledBetrayal, shackledBetrayalEnd } from './encounters/story/shackledBetrayal.js';

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
    [hoodedStranger.id]: hoodedStranger,   // the Shackled quest giver, in one village workshop
    [nikoli.id]: nikoli,   // Nikoli, the Panzerian general, hunting for Commander Mentoras (story/encounters/story/nikoli.js)
    [nikoliAfterBattle.id]: nikoliAfterBattle,
    [dryKrakenAmbush.id]: dryKrakenAmbush,   // act 2: the Dry Kraken rises out of the desert, holding Codey (story/encounters/story/codey.js, story/storyAmbush.js)
    [codeyFreed.id]: codeyFreed,
    [jaeger.id]: jaeger,   // Jaeger, posing as his brother Nikoli, in the hoard of the first catacombs (story/encounters/story/jaeger.js)
    [ruinedCarriage.id]: ruinedCarriage,   // a broken merchant carriage on the plains: loot, or the shackled steeds (encounters/ruinedCarriage.js)
    [prologue.id]: prologue,
    [actTwo.id]: actTwo,
    [peculiarScarecrow.id]: peculiarScarecrow,
    [oldGravestone.id]: oldGravestone,
    [caveIn.id]: caveIn,
    [arrowTrap.id]: arrowTrap,       // the catacombs' traps (map objects TRAP_ARROW / TRAP_PIT / TRAP_AXES)
    [pitTrap.id]: pitTrap,
    [swingingAxes.id]: swingingAxes,
    [catacombVaultDoor.id]: catacombVaultDoor,   // the catacombs' locked vault, its boss and the boss's end (story/encounters/catacombDepths.js)
    [infernusSentinel.id]: infernusSentinel,
    [infernusSentinelFallen.id]: infernusSentinelFallen,
    [shackledBetrayal.id]: shackledBetrayal,
    [shackledBetrayalEnd.id]: shackledBetrayalEnd,

    
    // <-- Add your new encounter here
    
    // When you make a new encounter, it's just two quick steps:
    // 1. Import it at the top.
    // 2. Add `[yourEncounter.id]: yourEncounter,` right here.
};

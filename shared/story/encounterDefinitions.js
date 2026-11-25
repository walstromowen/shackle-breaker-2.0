// 1. Directly import the individual encounters
import { applyEncounterTraits } from './encounterTraits.js';
import { aDisturbingSight, madmanSpotsYou } from './encounters/aDisturbingSight.js';
import { woundedMutt } from './encounters/woundedMutt.js';
import { bearPatrol } from './encounters/bearPatrol.js';
import { legionaryPatrol, legionarySpotsYou } from './encounters/legionaryPatrol.js';
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
import { nikoli, nikoliAfterBattle, nikoliBrothersWon } from './encounters/story/nikoli.js';
import { dryKrakenAmbush, codeyFreed } from './encounters/story/codey.js';
import { jaeger } from './encounters/story/jaeger.js';
import { amputatorOsric, amputatorGarrick, amputatorGarrickFallen } from './encounters/story/amputators.js';
import { arcKnight, arcKnightFallen, arcKnightPatrol } from './encounters/story/arcKnight.js';
import { codey, strangerMark, strangerNote, brothersSword, pursuer, pursuerWon } from './encounters/story/heroesNorth.js';
import { ruinedCarriage, ruinedCarriageCleared } from './encounters/ruinedCarriage.js';
import { quicksand, cyclone, cycloneHeart } from './encounters/desertHazards.js';
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
    [bearPatrol.id]: bearPatrol,   // a grizzly keeping to its patch of the plains or the snowy mountains (BEAR_PATROL)
    [aDisturbingSight.id]: aDisturbingSight,
    [madmanSpotsYou.id]: madmanSpotsYou,   // a madman who sees you coming (front or sides): the fight
    [legionaryPatrol.id]: legionaryPatrol,       // a legionary on patrol in a village or a castle, walked up to from behind (LEGIONARY_PATROL)
    [legionarySpotsYou.id]: legionarySpotsYou,   // one who sees you coming: the fight
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
    [amputatorOsric.id]: amputatorOsric,   // the Amputators' Senior Surgeon Osric, in the first small graveyard of act 1 (story/encounters/story/amputators.js)
    [arcKnight.id]: arcKnight,   // an Arc Knight, act 1's mini boss, outside the Hooded Stranger's workshop (story/encounters/story/arcKnight.js)
    [arcKnightFallen.id]: arcKnightFallen,
    [arcKnightPatrol.id]: arcKnightPatrol,   // act 3: Arc Knights on patrol in the plains, rare
    [amputatorGarrick.id]: amputatorGarrick,   // Surgeon Garrick, going mad: Osric's quest
    [amputatorGarrickFallen.id]: amputatorGarrickFallen,
    [dryKrakenAmbush.id]: dryKrakenAmbush,   // act 3: the Dry Kraken rises out of the desert, holding Codey (story/encounters/story/codey.js, story/storyAmbush.js)
    [codeyFreed.id]: codeyFreed,
    [jaeger.id]: jaeger,
    // act 4: the three heroes' stories come together (story/heroes.js, story/encounters/story/heroesNorth.js)
    [codey.id]: codey,
    [strangerMark.id]: strangerMark,
    [strangerNote.id]: strangerNote,
    [brothersSword.id]: brothersSword,
    [pursuer.id]: pursuer,
    [pursuerWon.id]: pursuerWon,
    [nikoliBrothersWon.id]: nikoliBrothersWon,   // Jaeger, posing as his brother Nikoli, in the hoard of the first catacombs (story/encounters/story/jaeger.js)
    [quicksand.id]: quicksand,   // the desert's hazards (encounters/desertHazards.js): quicksand any time, a cyclone only in a sandstorm
    [cyclone.id]: cyclone,
    [cycloneHeart.id]: cycloneHeart,
    [ruinedCarriage.id]: ruinedCarriage,   // a broken merchant carriage on the plains: loot, or the shackled steeds (encounters/ruinedCarriage.js)
    [ruinedCarriageCleared.id]: ruinedCarriageCleared,   // ... and searched at leisure once its herd is beaten
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

// The moments that sometimes teach a trait, good or bad (story/encounterTraits.js): put into the stages above, once.
export const MISSING_TRAIT_STAGES = applyEncounterTraits(encounterDefinitions);

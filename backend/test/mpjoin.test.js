// backend/test/mpjoin.test.js: `npm test`. Joining a party member's encounter or fight in progress (walk up, Ask to Join, they say yes), the
// prologue of a world started together played as one encounter, and the encounter after a won party fight (A Dark Truth) shared by its players.
// The end-to-end runs (two and three browsers) live outside the suite; these pin the pieces they rest on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seedRandom, unseedRandom, rng, getRandomState, setRandomState } from '../../shared/core/random.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the shared dice can be handed to a newcomer: the same place in the stream gives the same rolls', () => {
    seedRandom(12345);
    for (let i = 0; i < 17; i++) rng();
    const at = getRandomState();
    const next = [rng(), rng(), rng()];
    seedRandom(999);   // another screen, somewhere else in its own stream
    setRandomState(at);
    assert.deepEqual([rng(), rng(), rng()], next);
    unseedRandom();
    assert.equal(getRandomState(), null, 'unseeded: nothing to hand over');
});

test('Ask to Join: offered for a party member in an encounter or a fight; they are asked; the leader lets them in', () => {
    const social = read('frontend/src/engine/multiplayerSocial.js');
    assert.match(social, /if \(busyIn && together\) options\.unshift\(\{ id: 'join'/, 'the menu offers it for a busy player of my party');
    assert.match(social, /wants to join your \$\{what\}/, 'the player walked up to is asked');
    assert.match(social, /inPlay: true/, 'on their encounter or battle screen');
    assert.match(social, /k: 'join_fwd'/, 'a player who does not lead it passes the yes on to the one who does');
    const scenes = read('frontend/src/engine/sceneManager.js');
    assert.match(scenes, /activePlayPrompt\(this\.currentScene\)[\s\S]*drawPlayPrompt/, 'the question is drawn over the encounter or the fight');
});

test('into an encounter between choices, at its stage and step; into a fight at the start of a round, as it stands', () => {
    const enc = read('frontend/src/screens/encounter/encounterController.js');
    assert.match(enc, /if \(mp\.admits\.length && this\.actionPhase === 'none'\)/, 'an encounter lets them in between choices');
    assert.match(enc, /stage: this\.model\.currentStageId, step: mp\.step/, 'at the stage and step it has reached');
    assert.match(enc, /makeShared\(\)/, 'an encounter of my own becomes a shared one');
    const bt = read('frontend/src/screens/battle/battleController.js');
    assert.match(bt, /if \(s\.mp\.admits\.length\) this\._admitWaiting\(\)/, 'a fight lets them in at the start of a round');
    assert.match(bt, /rng: getRandomState\(\)/, 'with the dice where everyone\'s are');
    assert.match(bt, /withoutSeed\(\(\) => new CombatantModel/, 'building their fighters never moves the dice');
    assert.match(read('frontend/src/engine/sceneManager.js'), /multiplayerSocial\.partyPlayers\(\)\.length > 0\)\) \{/, 'in a party every fight can be joined');
});

test('a world started together plays the prologue as one encounter, and a won party fight has one encounter after it', () => {
    const session = read('frontend/src/engine/multiplayerSession.js');
    assert.match(session, /this\._sharedPrologue = true;/, 'the host\'s prologue is the shared one');
    const scenes = read('frontend/src/engine/sceneManager.js');
    assert.match(scenes, /multiplayerSocial\.askToJoin\(host\.id, \{ auto: true, retry: 10 \}\)/, 'each guest asks to be let into it (no question asked)');
    assert.match(scenes, /mp\.authority !== mp\.me && multiplayerSocial\.awaitAfterFight\(after\.encounterId, solo\)/, 'the fight\'s other players wait for its leader\'s');
    assert.match(scenes, /players: shared \? mp\.players : undefined/, 'the leader\'s takes in every player of the fight');
    assert.match(scenes, /encounterId: 'act_two', context: \{\}, noShare: true/, 'A Dark Truth owed to an old save is that player\'s own');
});

// backend/test/cheats.test.js: `npm test`. The Cheats toggle on the character creator: off by default, saved with the game, and the only thing that lets "/" open the developer console.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { DEV_CONSOLE } from '../../shared/core/constants.js';
import { SaveManager } from '../../frontend/src/engine/saveManager.js';
import { CREATION_DATA, CharacterCreatorLogic } from '../../frontend/src/screens/characterCreator/characterCreatorLogic.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };

test('the creator offers Off / On, and Off is the default', () => {
    assert.ok(DEV_CONSOLE.ENABLED, 'the dev console is switched on in this build');
    assert.deepEqual(CREATION_DATA.CHEATS.map(c => c.id), [false, true]);
    assert.deepEqual(CREATION_DATA.CHEATS.map(c => c.label), ['Off', 'On']);
    const logic = new CharacterCreatorLogic();
    assert.equal(logic.state.cheatsIdx, 0);
    const order = logic.menuOrder;
    assert.ok(order.indexOf('cheats') === order.indexOf('difficulty') + 1, 'the row sits right after Difficulty');
    assert.ok(order.indexOf('cheats') < order.indexOf('seed'));
});

test('the Cheats row flips between Off and On', () => {
    const logic = new CharacterCreatorLogic();
    logic.setRowByStep('cheats');
    logic.modifyValue(1);
    assert.equal(logic.state.cheatsIdx, 1);
    logic.modifyValue(1);
    assert.equal(logic.state.cheatsIdx, 0, 'wraps around');
    logic.modifyValue(-1);
    assert.equal(logic.state.cheatsIdx, 1);
});

test('starting the game stores the choice in gameState', () => {
    const logic = new CharacterCreatorLogic();
    logic.setRowByStep('cheats');
    logic.modifyValue(1);
    quiet(() => logic.finalizeCharacter());
    assert.equal(gameState.cheats, true);

    const off = new CharacterCreatorLogic();
    quiet(() => off.finalizeCharacter());
    assert.equal(gameState.cheats, false);
});

test('the choice is saved and loaded with the game; old saves have cheats off', () => {
    gameState.cheats = true;
    const save = JSON.parse(JSON.stringify(SaveManager.createSnapshot()));
    assert.equal(save.data.cheats, true);
    gameState.cheats = false;
    SaveManager.applySnapshot(save);
    assert.equal(gameState.cheats, true, 'round trip');

    save.data.cheats = false;
    SaveManager.applySnapshot(save);
    assert.equal(gameState.cheats, false);

    gameState.cheats = true;
    delete save.data.cheats;
    SaveManager.applySnapshot(save);
    assert.equal(gameState.cheats, false, 'a save from before the toggle has no cheats');
});

test('"/" only opens the console in a game with cheats on', () => {
    const src = read('frontend/src/engine/sceneManager.js');
    const line = src.split('\n').find(l => /e\.code === 'Slash'/.test(l));
    assert.ok(line, 'the "/" handler exists');
    assert.ok(/gameState\.cheats === true/.test(line), 'and it checks the game\'s cheats flag');
    assert.ok(/this\.devConsole/.test(line));
});

test('the creator screen draws the Cheats row only when the console is available', () => {
    const src = read('frontend/src/screens/characterCreator/characterCreatorRenderer.js');
    assert.ok(/'cheats'/.test(src) && /data\.CHEATS/.test(src));
});

test('the battle debugger (C in a battle) and the map debug key ("`") are cheats too', () => {
    const bc = read('frontend/src/screens/battle/battleController.js');
    assert.ok(/if \(intent === 'DEBUG'\) \{\s*if \(gameState\.cheats !== true\) return;/.test(bc), 'C does nothing without cheats');
    const br = read('frontend/src/screens/battle/battleRenderer.js');
    assert.ok(/this\.showDebug = gameState\.cheats === true && !this\.showDebug/.test(br), 'the toggle event cannot switch it on either');
    assert.ok(/if \(this\.showDebug && gameState\.cheats === true\)/.test(br), 'and it is not drawn');
    const sm = read('frontend/src/engine/sceneManager.js');
    assert.ok(/e\.code === 'Backquote' && gameState\.cheats === true/.test(sm));
});

test('the creator draws the Cheats row, with its own label and description', () => {
    const src = read('frontend/src/screens/characterCreator/characterCreatorRenderer.js');
    assert.ok(/cheats: "CHEATS"/.test(src));
    assert.ok(/\.\.\.\(data\.CHEATS \? \['cheats'\] : \[\]\)/.test(src), 'the row is only in the menu while the console is switched on');
    assert.ok(/currentStep === 'cheats'\) return data\.CHEATS/.test(src));
    assert.ok(/battle debugger/.test(CREATION_DATA.CHEATS[1].desc), 'the On description says the battle debugger is included');
});

// backend/test/charactersex.test.js: `npm test`. The character creator's Male / Female button: every look has a female version (blank placeholder
// sheets for now, the same size as the male ones), and the character is made with the sprites of the chosen sex.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CREATION_DATA, CharacterCreatorLogic, appearanceSprites } from '../../frontend/src/screens/characterCreator/characterCreatorLogic.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const main = read('frontend/src/main.js');
const fileOf = (key) => { const m = main.match(new RegExp(`\\b${key}:\\s*'\\./([^']+)'`)); return m && m[1]; };

test('every look has a female version whose sheets are registered, on disk and the same size as the male ones', () => {
    for (const app of CREATION_DATA.APPEARANCES) {
        assert.ok(app.female, `${app.label} has a female version`);
        for (const k of ['spritePortrait', 'spriteOverworld']) {
            const male = fileOf(app[k]), female = fileOf(app.female[k]);
            assert.ok(female, `${app.female[k]} is registered`);
            const m = fs.readFileSync(new URL(`../../frontend/src/${male}`, import.meta.url)), f = fs.readFileSync(new URL(`../../frontend/src/${female}`, import.meta.url));
            // PNG width and height sit at bytes 16..23
            assert.deepEqual([...f.subarray(16, 24)], [...m.subarray(16, 24)], `${app.label} ${k}: same size`);
        }
    }
});

test('the creator starts male; the button (or Enter on LOOK) switches to female and back, and the character is made with those sprites', () => {
    const logic = new CharacterCreatorLogic();
    assert.equal(logic.state.sex, 'male');
    const app = CREATION_DATA.APPEARANCES[logic.state.appearanceIdx];
    assert.equal(logic._buildPlayerOverrides().spritePortrait, app.spritePortrait);
    logic.toggleSex();
    assert.equal(logic.state.sex, 'female');
    assert.equal(logic._buildPlayerOverrides().spritePortrait, app.female.spritePortrait);
    assert.equal(logic._buildPlayerOverrides().spriteOverworld, app.female.spriteOverworld);
    logic.setRowByStep('appearance');
    logic.handleAction();
    assert.equal(logic.state.sex, 'male', 'Enter on the LOOK row switches it back');
    assert.deepEqual(appearanceSprites(app, 'female'), app.female);
    assert.deepEqual(appearanceSprites({ spritePortrait: 'a', spriteOverworld: 'b' }, 'female'), { spritePortrait: 'a', spriteOverworld: 'b' }, 'a look with no female version keeps its own');
});

test('the creator draws the Male / Female button and handles its click', () => {
    assert.match(read('frontend/src/screens/characterCreator/characterCreatorRenderer.js'), /id: 'BTN_SEX'/);
    assert.match(read('frontend/src/screens/characterCreator/characterCreatorController.js'), /hitboxId === 'BTN_SEX'[\s\S]*toggleSex\(\)/);
});

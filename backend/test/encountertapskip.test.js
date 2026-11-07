// backend/test/encountertapskip.test.js: `npm test`. A plain click (or Enter / Space tap) on encounter text that is still being told finishes the
// words, and the next one moves the story on. Holding still works, and the dice keep their own pace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EncounterController } from '../../frontend/src/screens/encounter/encounterController.js';
import { textEndTimer, actionPadding } from '../../frontend/src/ui/narration.js';

const make = () => {
    const input = { heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } };
    const c = new EncounterController(input, {}, {});
    c.model = { stage: {} };
    c.hasDoneIntro = true;
    c.inputCooldown = 0;
    c._currentText = () => 'You take a step back to reconsider.';
    return c;
};

test('a click on action text finishes the words, the next one moves on', () => {
    const c = make();
    c.actionPhase = 'message';
    c.actionMessage = 'You take a step back to reconsider.';
    c.textTimer = 0.1;
    c.onClick(null);
    assert.equal(c.textTimer, textEndTimer(c.actionMessage), 'first click shows all the words');
    assert.equal(c.skipMessageAnimation, false, 'but the story waits for the player to read them');
    c.inputCooldown = 0;
    c.onClick(null);
    assert.equal(c.skipMessageAnimation, true, 'second click moves on');
});

test('Enter and Space tap through action text, a held key does not repeat the skip', () => {
    const c = make();
    c.actionPhase = 'message';
    c.textTimer = 0.1;
    c.handleKeyDown('Enter', { repeat: false, code: 'Enter', key: 'Enter', preventDefault() {} });
    const after = c.textTimer;
    assert.ok(after >= textEndTimer(c._currentText()) - 1e-9 || c.textTimer > 0.1);
    c.inputCooldown = 0;
    c.handleKeyDown('Enter', { repeat: true, code: 'Enter', key: 'Enter', preventDefault() {} });
    assert.equal(c.skipMessageAnimation, false, 'key repeat is the hold, not another tap');
});

test('a click while the dice are rolling does not skip them', () => {
    const c = make();
    c.actionPhase = 'rolling';
    c.rollTimer = 2;
    c.onClick(null);
    assert.equal(c.skipMessageAnimation, false);
});

test('a click right after choosing a decision does not skip the text that follows', () => {
    const c = make();
    c.actionPhase = 'message';
    c.textTimer = 0;
    c.inputCooldown = 0.4;       // set by executeSelectedDecision
    c.onClick(null);
    assert.equal(c.textTimer, 0);
    assert.equal(c.skipMessageAnimation, false);
});

test('a click on choices that have not appeared yet brings them in', () => {
    const c = make();
    c.actionPhase = 'none';
    c.textTimer = 0.2;
    c._decisionCount = () => 1;
    c.onClick('SOMETHING_ELSE');
    assert.ok(c.textTimer >= textEndTimer(c._currentText()));
});

test('the dice flash through numbers fast, slow down gradually, and land on the roll', async () => {
    const { EncounterLogic } = await import('../../frontend/src/screens/encounter/encounterLogic.js');
    const t = EncounterLogic.rollTickSchedule();
    const gaps = t.slice(1).map((x, i) => x - t[i]);
    assert.ok(t.length >= 20, `${t.length} ticks`);
    assert.ok(t[t.length - 1] > 2 && t[t.length - 1] < 3.5, `lands at ${t[t.length - 1]} s`);
    for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] >= gaps[i - 1] - 1e-9, 'never speeds up again');
    assert.ok(gaps[gaps.length - 1] > gaps[0] * 6, 'the last tick is much slower than the first');

    const c = make();
    c.rollData = { displayVal: '?', d20: 13, mod: 0, total: 13, dc: 10, isSuccess: true };
    c.inputCooldown = 0;
    c.actionPhase = 'wait_for_roll';
    c.triggerRoll();
    const shown = [];
    for (let i = 0; i < 400 && c.actionPhase === 'rolling'; i++) {
        c.update(1 / 60);
        if (shown[shown.length - 1] !== c.rollData.displayVal) shown.push(c.rollData.displayVal);
    }
    assert.equal(c.actionPhase, 'hold_base');
    assert.equal(c.rollData.displayVal, 13, 'lands on the roll');
    assert.ok(shown.length >= 15, `${shown.length} numbers flashed`);
    for (let i = 1; i < shown.length; i++) assert.notEqual(shown[i], shown[i - 1]);
});

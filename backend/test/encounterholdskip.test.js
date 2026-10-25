// backend/test/encounterholdskip.test.js: `npm test`. Nothing in an encounter is skipped by a click or a tap of Enter / Space: only by HOLDING the button, Enter or Space
// (NARRATION.HOLD_TO_SKIP). And the opening prologue can be skipped as a whole by holding its own button (or Escape).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EncounterController } from '../../frontend/src/screens/encounter/encounterController.js';
import { NARRATION, textEndTimer } from '../../frontend/src/ui/narration.js';

const make = () => {
    const input = { heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } };
    const c = new EncounterController(input, {}, {});
    c.model = { stage: {} };
    c.hasDoneIntro = true;
    c.inputCooldown = 0;
    c._currentText = () => 'You take a step back to reconsider.';
    return c;
};

test('a click on action text does not skip it, it only makes the hint flare', () => {
    const c = make();
    c.actionPhase = 'message';
    c.actionMessage = 'You take a step back to reconsider.';
    c.textTimer = 0.1;
    c.onClick(null);
    assert.equal(c.textTimer, 0.1);
    assert.equal(c.skipMessageAnimation, false);
    assert.equal(c.hintPulse, 1);
});

test('a tap of Enter does not skip either, and neither does a click on choices that have not appeared yet', () => {
    const c = make();
    c.actionPhase = 'message';
    c.textTimer = 0.1;
    c.handleKeyDown('Enter', { repeat: false, code: 'Enter', key: 'Enter', preventDefault() {} });
    assert.equal(c.textTimer, 0.1);
    const d = make();
    d.actionPhase = 'none';
    d.textTimer = 0.2;
    d._decisionCount = () => 1;
    d.onClick('SOMETHING_ELSE');
    assert.equal(d.textTimer, 0.2);
});

test('holding the button for HOLD_TO_SKIP seconds skips: the first hold shows the words, the next moves on', () => {
    const c = make();
    c.actionPhase = 'message';
    c.actionMessage = 'You take a step back to reconsider.';
    c.textTimer = 0.1;
    c.input.isMouseDown = true;
    c._updateHold(NARRATION.HOLD_TO_SKIP / 2);
    assert.equal(c.textTimer, 0.1, 'half a hold is nothing');
    c._updateHold(NARRATION.HOLD_TO_SKIP / 2 + 0.01);
    assert.equal(c.textTimer, textEndTimer(c.actionMessage));
    c.input.isMouseDown = false; c._updateHold(0.05);
    c.inputCooldown = 0; c.input.isMouseDown = true;
    c._updateHold(NARRATION.HOLD_TO_SKIP + 0.01);
    assert.equal(c.skipMessageAnimation, true);
});

const prologue = () => {
    const c = make();
    c._encounterId = 'prologue';
    c.actionPhase = 'none';
    c.endEncounter = (p) => { c.ended = true; c.actionPhase = 'ending'; };
    c.getFocusId = () => c.focus || null;
    return c;
};

test('the prologue ends when its skip button is held long enough, not when it is clicked', () => {
    const c = prologue();
    c.onClick('BTN_SKIP_PROLOGUE');
    assert.ok(!c.ended && c.prologueHint === 1);
    c.focus = 'BTN_SKIP_PROLOGUE';
    c.input.isMouseDown = true;
    c._updatePrologueHold(0.5);
    assert.ok(!c.ended && c.prologueHold > 0);
    c.input.isMouseDown = false;
    c._updatePrologueHold(0.1);
    assert.equal(c.prologueHold, 0, 'letting go starts over');
    c.input.isMouseDown = true;
    for (let i = 0; i < 4; i++) c._updatePrologueHold(0.4);
    assert.ok(c.ended);
});

test('Escape held also skips the prologue; a press elsewhere on the screen does not, and no other encounter has the button', () => {
    const c = prologue();
    c.input.heldKeys.add('Escape');
    for (let i = 0; i < 4; i++) c._updatePrologueHold(0.4);
    assert.ok(c.ended);
    const d = prologue();
    d.focus = 'DECISION_0'; d.input.isMouseDown = true;
    for (let i = 0; i < 10; i++) d._updatePrologueHold(0.4);
    assert.ok(!d.ended);
    const e = make();
    e._encounterId = 'tracks_in_the_snow'; e.input.heldKeys.add('Escape'); e.endEncounter = () => { e.ended = true; };
    for (let i = 0; i < 10; i++) e._updatePrologueHold(0.4);
    assert.ok(!e.ended && e._isPrologue() === false);
});

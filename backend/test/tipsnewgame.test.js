// backend/test/tipsnewgame.test.js: `npm test`. The first-visit control cards: seen once, remembered, and forgotten again when a new game starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TipStore, TutorialOverlay } from '../../frontend/src/ui/tutorialOverlay.js';

const memory = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test('a card shows once, is remembered by the browser, and shows again after a reset', () => {
    const storage = memory();
    const store = new TipStore(storage);
    const card = new TutorialOverlay(store);
    assert.equal(card.show('party'), true);
    card.dismiss();
    assert.equal(new TipStore(storage).hasSeen('party'), true, 'remembered across a reload');
    assert.equal(new TutorialOverlay(store).show('party'), false, 'not shown twice');
    store.reset();
    assert.equal(new TipStore(storage).hasSeen('party'), false, 'the reset is saved too');
    assert.equal(new TutorialOverlay(store).show('party'), true, 'shown again');
});

test('starting a new game (character creator to the world) resets the cards', () => {
    const src = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    const block = src.match(/currentScene === 'character-creator' && scene === 'overworld'\) \{[\s\S]*?\n\s*\}/);
    assert.ok(block && /this\.tutorial\.store\.reset\(\)/.test(block[0]), 'sceneManager resets the tip store on a new game');
    assert.ok(!/LOAD_GAME[\s\S]{0,200}store\.reset/.test(src), 'loading a save does not reset them');
});

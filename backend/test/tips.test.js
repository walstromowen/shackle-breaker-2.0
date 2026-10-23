// backend/test/tips.test.js: `npm test`. The first-visit control tips: the card text, which cards have been seen, and when a card opens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TIPS, TIP_SCENES } from '../../frontend/src/ui/tutorialData.js';
import { TipStore, TutorialOverlay } from '../../frontend/src/ui/tutorialOverlay.js';

/** A stand-in for localStorage. */
const memoryStorage = (initial = {}) => {
    const data = { ...initial };
    return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

test('every tip card has a title, 3 to 7 rows and keys for each row', () => {
    for (const id of TIP_SCENES) {
        const tip = TIPS[id];
        assert.ok(tip.title, `${id} has a title`);
        assert.ok(tip.rows.length >= 3 && tip.rows.length <= 7, `${id} has ${tip.rows.length} rows`);
        for (const row of tip.rows) {
            assert.ok(Array.isArray(row.keys) && row.keys.length > 0, `${id}: a row has no keys`);
            assert.ok(typeof row.text === 'string' && row.text.length > 3, `${id}: a row has no text`);
        }
    }
});

test('cards exist only for screens the scene manager really has, and none for the prologue-era screens', () => {
    const source = readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    for (const id of TIP_SCENES) assert.ok(source.includes(`case '${id}':`), `${id} is not a scene`);
    for (const id of ['boot', 'title', 'character-creator']) assert.equal(TIPS[id], undefined, `${id} must not have a card`);
});

/** Runs the overlay forward until its card is fully showing (the screen is not busy). */
const settle = (overlay) => { for (let i = 0; i < 60 && overlay.phase !== 'open'; i++) overlay.update(0.1); };

test('a card opens once, is remembered, and can be replayed after a reset', () => {
    const store = new TipStore(memoryStorage());
    const overlay = new TutorialOverlay(store);
    assert.equal(overlay.show('overworld'), true);
    assert.equal(overlay.active, true);
    assert.equal(overlay.dismiss(), true);
    assert.equal(overlay.active, false, 'dismissed before it ever showed: gone at once');
    assert.equal(overlay.show('overworld'), false, 'already seen');
    assert.equal(overlay.show('party'), true, 'a different screen is still new');
    store.reset();
    overlay.cancel();
    assert.equal(overlay.show('overworld'), true, 'shown again after Replay Tips');
});

test('a card that is cancelled (the scene changed first) is not counted as seen', () => {
    const overlay = new TutorialOverlay(new TipStore(memoryStorage()));
    overlay.show('battle');
    overlay.cancel();
    assert.equal(overlay.show('battle'), true);
});

test('a screen without a card never opens one', () => {
    const overlay = new TutorialOverlay(new TipStore(memoryStorage()));
    assert.equal(overlay.show('title'), false);
    assert.equal(overlay.active, false);
});

test('the card waits, eases in, and does not block the screen until it is on show', () => {
    const overlay = new TutorialOverlay(new TipStore(memoryStorage()));
    overlay.show('shop');
    assert.equal(overlay.phase, 'wait');
    assert.equal(overlay.blocking, false, 'the screen is still live while the card waits');
    assert.equal(overlay.visibility, 0);
    overlay.update(1, { sceneBusy: true });
    assert.equal(overlay.phase, 'wait', 'a scene transition still running keeps it waiting');
    overlay.update(0.5);
    assert.equal(overlay.phase, 'in');
    assert.equal(overlay.blocking, true);
    const early = overlay.visibility;
    overlay.update(0.2);
    assert.ok(overlay.visibility > early && overlay.visibility < 1, 'fading in');
    settle(overlay);
    assert.equal(overlay.visibility, 1);
});

test('input is ignored for the first moments so a held key cannot skip the card', () => {
    const overlay = new TutorialOverlay(new TipStore(memoryStorage()));
    overlay.show('shop');
    overlay.update(0.5);   // the wait is over, the fade-in starts
    assert.equal(overlay.canDismiss, false);
    overlay.update(0.5);
    assert.equal(overlay.canDismiss, false);
    overlay.update(0.5);
    assert.equal(overlay.canDismiss, true);
});

test('dismissing eases the card out, marks it seen at once, and then hands the screen back', () => {
    const store = new TipStore(memoryStorage());
    const overlay = new TutorialOverlay(store);
    overlay.show('journal');
    overlay.update(0.5);
    settle(overlay);
    overlay.update(1);
    assert.equal(overlay.dismiss(), true);
    assert.equal(overlay.phase, 'out');
    assert.equal(store.hasSeen('journal'), true);
    assert.equal(overlay.blocking, true, 'the screen stays paused while the card leaves');
    assert.equal(overlay.canDismiss, false);
    assert.equal(overlay.dismiss(), false, 'already leaving');
    overlay.update(0.15);
    assert.ok(overlay.visibility > 0 && overlay.visibility < 1, 'fading out');
    overlay.update(0.3);
    assert.equal(overlay.active, false);
    assert.equal(overlay.blocking, false);
});

test('every card has a short label for its Settings tab', () => {
    for (const id of TIP_SCENES) {
        assert.ok(TIPS[id].label && TIPS[id].label.length <= 12, `${id} needs a label of 12 characters or fewer`);
    }
    assert.equal(new Set(TIP_SCENES.map(id => TIPS[id].label)).size, TIP_SCENES.length, 'labels are unique');
});

test('seen cards are saved, survive a reload, and a broken or missing store still works', () => {
    const storage = memoryStorage();
    const first = new TipStore(storage);
    first.markSeen('journal');
    const second = new TipStore(storage);
    assert.equal(second.hasSeen('journal'), true);
    assert.equal(second.hasSeen('shop'), false);

    const garbage = new TipStore(memoryStorage({ 'shackle-breaker:tips': '{not json' }));
    assert.equal(garbage.hasSeen('journal'), false);

    const none = new TipStore(null);
    none.markSeen('shop');
    assert.equal(none.hasSeen('shop'), true, 'kept in memory for the session');

    const throwing = new TipStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
    assert.doesNotThrow(() => throwing.markSeen('shop'));
    assert.equal(throwing.hasSeen('shop'), true);
});

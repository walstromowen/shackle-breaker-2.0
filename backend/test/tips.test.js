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
    const source = readFileSync(new URL('../../frontend/src/core/sceneManager.js', import.meta.url), 'utf8');
    for (const id of TIP_SCENES) assert.ok(source.includes(`case '${id}':`), `${id} is not a scene`);
    for (const id of ['boot', 'title', 'character-creator']) assert.equal(TIPS[id], undefined, `${id} must not have a card`);
});

test('a card opens once, is remembered, and can be replayed after a reset', () => {
    const store = new TipStore(memoryStorage());
    const overlay = new TutorialOverlay(store);
    assert.equal(overlay.show('overworld'), true);
    assert.equal(overlay.active, true);
    assert.equal(overlay.dismiss(), true);
    assert.equal(overlay.active, false);
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

test('input is ignored for the first half second so a held key cannot skip the card', () => {
    const overlay = new TutorialOverlay(new TipStore(memoryStorage()));
    overlay.show('shop');
    assert.equal(overlay.canDismiss, false);
    overlay.update(0.3);
    assert.equal(overlay.canDismiss, false);
    overlay.update(0.3);
    assert.equal(overlay.canDismiss, true);
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

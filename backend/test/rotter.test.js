// backend/test/rotter.test.js: `npm test`. A rotter is not acidic until the blood moon rises (act 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActSystem } from '../../shared/story/actSystem.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';

test('before the blood moon a rotter has no acidic trait', () => {
    assert.ok(!(ENTITY_DEFINITIONS.ROTTER.traits || []).includes('acidic'));
    assert.ok(!(EntityFactory.create('ROTTER').traits || []).includes('acidic'));
    assert.equal(ActSystem.getEnemyUpgrade('ROTTER', { milestones: [] }), null);
});

test('once the blood moon is up (act 2) rotters are made acidic', () => {
    const up = ActSystem.getEnemyUpgrade('ROTTER', { milestones: ['act2'] });
    assert.ok(up.traits.includes('acidic'));
    const rotter = EntityFactory.create('ROTTER', { traits: up.traits });
    assert.ok(rotter.traits.includes('acidic'));
});

test('other acidic creatures are unchanged', () => {
    assert.ok(ENTITY_DEFINITIONS.CAVE_SPIDER.traits.includes('acidic'));
});

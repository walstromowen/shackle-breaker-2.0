import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbilityDefinitions } from '../../shared/data/abilityDefinitions.js';
import { ItemDefinitions } from '../../shared/data/itemDefinitions.js';
import { encounterDefinitions } from '../../shared/data/encounterDefinitions.js';
import { AbilitySystem } from '../../shared/systems/abilitySystem.js';
import { TimeSystem } from '../../shared/systems/timeSystem.js';
import { gameState } from '../../shared/state/gameState.js';
import { Formatting } from '../../shared/utils/formatting.js';
import { TransitionRenderer } from '../../frontend/src/renderers/transitions/transitionRenderer.js';

test('a bedroll sleeps the clock forward and starts no encounter', () => {
    const ability = AbilityDefinitions.use_bedroll;
    assert.equal(ItemDefinitions.bedroll.useAbility, 'use_bedroll');
    assert.ok(!JSON.stringify(ability).includes('start_encounter'), 'no encounter any more');
    assert.ok(!JSON.stringify(ability).includes('bonfire'));
    const effect = ability.effects.find(e => e.type === 'advance_time');
    assert.ok(effect && effect.hours > 0);

    const seen = [];
    const before = AbilitySystem.worldActionHandler;
    AbilitySystem.worldActionHandler = (a) => seen.push(a);
    try {
        const me = { name: 'Hero', stats: {}, statusEffects: [] };
        const result = AbilitySystem.execute('use_bedroll', me, me, { context: 'overworld' });
        assert.equal(result.success, true);
        assert.equal(result.outcome, 'WORLD');
        assert.deepEqual(seen, [{ type: 'advance_time', minutes: effect.hours * 60 }]);
        // never inside a battle
        seen.length = 0;
        assert.equal(AbilitySystem.execute('use_bedroll', me, me, {}).success, false);
        assert.equal(seen.length, 0);
    } finally { AbilitySystem.worldActionHandler = before; }
});

test('TimeSystem.advance moves the clock over midnight and uses up the weather', () => {
    gameState.world.time = 20 * 60; gameState.world.day = 3;
    gameState.world.currentWeather = { id: 'RAIN', timeRemaining: 5 };
    assert.equal(TimeSystem.advance(12 * 60), 720);
    assert.equal(gameState.world.time, 8 * 60);
    assert.equal(gameState.world.day, 4);
    assert.equal(gameState.world.currentWeather.timeRemaining, 5 - 12);
    assert.equal(TimeSystem.advance(0), 0);
    assert.equal(TimeSystem.advance(-30), 0);
    assert.equal(gameState.world.time, 8 * 60);
    gameState.world.currentWeather = null;
});

test('the bonfire rest is a threshold-8 check', () => {
    const bonfire = encounterDefinitions.bonfire;
    const rest = bonfire.stages.discovery.decisions.find(d => d.type === 'skill_check');
    assert.equal(rest.threshold, 8);
});

test('the fade can hold the screen dark and tells when the picture is back', () => {
    const t = new TransitionRenderer({ CANVAS_WIDTH: 100, CANVAS_HEIGHT: 100 });
    const log = [];
    t.start(() => log.push('mid'), 'fade', { speed: 2, hold: 1, onDone: () => log.push('done') });
    t.update(0.6);                                    // fully dark: the callback runs once
    assert.deepEqual(log, ['mid']);
    assert.equal(t.state, 'HOLD');
    t.update(0.5); assert.equal(t.state, 'HOLD');     // still dark
    t.update(0.6); assert.equal(t.state, 'IN');       // the hold is over: fading back in
    assert.deepEqual(log, ['mid']);
    t.update(1);
    assert.deepEqual(log, ['mid', 'done']);
    assert.equal(t.isActive, false);
    // no hold = the old behaviour
    const u = new TransitionRenderer({ CANVAS_WIDTH: 100, CANVAS_HEIGHT: 100 });
    u.start(() => {}, 'fade', { speed: 2 }); u.update(0.6);
    assert.equal(u.state, 'IN');
});

test('compactNumber shortens big numbers and never rounds up into the next unit', () => {
    const c = (n) => Formatting.compactNumber(n);
    assert.equal(c(0), '0'); assert.equal(c(9999), '9999');
    assert.equal(c(10000), '10k'); assert.equal(c(21929), '21.9k'); assert.equal(c(123456), '123k');
    assert.equal(c(999999), '999k'); assert.equal(c(1000000), '1M'); assert.equal(c(2500000), '2.5M');
    assert.equal(c(-21929), '-21.9k'); assert.equal(c('abc'), 'abc');
});

test('a "current/max" always fits its column: full, then shortened, then smaller', async () => {
    const { CanvasUI } = await import('../../frontend/src/ui/canvasUI.js');
    const ctx = { font: '400 22px mono', save() {}, restore() {}, measureText(t) { const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]); return { width: t.length * px * 0.6 }; } };
    const ui = new CanvasUI(ctx);
    const font = '400 22px mono';
    const roomy = ui.fitFraction(120, 150, 100, font);
    assert.equal(roomy.text, '120/150'); assert.equal(roomy.font, font);
    const big = ui.fitFraction(3700, 3700, 91, font);              // 9 characters = 119px: does not fit 91
    assert.ok(big.width <= 91.5, `fits (${big.width})`);
    const huge = ui.fitFraction(123456, 654321, 91, font);
    assert.equal(huge.text, '123k/654k');
    assert.ok(huge.width <= 91.5, `fits (${huge.width})`);
    const wide = ui.fitFraction(21929, 21929, 150, font);          // the widened party-card column
    assert.equal(wide.text, '21929/21929'); assert.equal(wide.font, font);
});

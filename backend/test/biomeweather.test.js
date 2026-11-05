import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { TimeSystem } from '../../shared/world/timeSystem.js';
import { events } from '../../shared/core/eventBus.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';

const fresh = () => {
    const w = gameState.world;
    w.isInterior = false; w.time = 600; w.day = 1; w.biomeWeather = {}; w.weatherBiome = null; w.currentBiome = null; w.currentWeather = null;
    TimeSystem.followsWeather = false;
};

test('each biome keeps its weather: rain on the plains is still there after a walk through the desert', () => {
    fresh();
    TimeSystem.syncBiomeWeather('PLAINS');
    TimeSystem.setWeather('RAIN');
    gameState.world.currentWeather.timeRemaining = 5;
    TimeSystem.syncBiomeWeather('DESERT');
    assert.equal(gameState.world.currentWeather.id.toUpperCase(), 'CLEAR', 'no rain in the desert');
    gameState.world.time += 60;   // an hour in the desert
    TimeSystem.syncBiomeWeather('PLAINS');
    assert.equal(gameState.world.currentWeather.id.toUpperCase(), 'RAIN', 'the plains are still raining');
    assert.ok(Math.abs(gameState.world.currentWeather.timeRemaining - 4) < 1e-6, 'and the rain kept running while away');
});

test('a house clears the sky and the weather outside is waiting at the door', () => {
    fresh();
    TimeSystem.syncBiomeWeather('PLAINS');
    TimeSystem.setWeather('FOG');
    gameState.world.currentWeather.timeRemaining = 3;
    TimeSystem.syncBiomeWeather('HOUSE_INTERIOR');
    assert.equal(gameState.world.currentWeather.id.toUpperCase(), 'CLEAR');
    TimeSystem.syncBiomeWeather('PLAINS');
    assert.equal(gameState.world.currentWeather.id.toUpperCase(), 'FOG');
});

test('weather that ran out while away is not brought back', () => {
    fresh();
    TimeSystem.syncBiomeWeather('PLAINS');
    TimeSystem.setWeather('RAIN');
    gameState.world.currentWeather.timeRemaining = 1;
    TimeSystem.syncBiomeWeather('DESERT');
    gameState.world.time += 120;
    TimeSystem.syncBiomeWeather('PLAINS');
    assert.equal(gameState.world.currentWeather.id.toUpperCase(), 'CLEAR');
});

test('a change of weather tells the screen to flash, but not stepping into a house', () => {
    fresh();
    const seen = [];
    events.on('WEATHER_CHANGED', (d) => seen.push(d));
    TimeSystem.syncBiomeWeather('PLAINS');
    TimeSystem.setWeather('CLEAR');
    TimeSystem.setWeather('RAIN');
    assert.deepEqual(seen.at(-1), { from: 'CLEAR', to: 'RAIN' });
    const n = seen.length;
    TimeSystem.syncBiomeWeather('HOUSE_INTERIOR');
    assert.equal(seen.length, n, 'no flash for the door');
    TimeSystem.syncBiomeWeather('PLAINS');
    assert.equal(seen.length, n, 'nor for coming back out');
});

test('about half of the snowy mountain ambushes are the shackled, from act 1, day and night', () => {
    for (const k of ['snowy_mountains_battles_day', 'snowy_mountains_battles_night', 'snowy_mountains_battles_blood_moon']) {
        const pools = SpawnTableDefinitions[k].pools;
        const total = pools.reduce((a, p) => a + p.weight, 0);
        const shackled = pools.filter(p => p.factionId === 'shackled').reduce((a, p) => a + p.weight, 0) / total;
        assert.ok(Math.abs(shackled - 0.5) < 0.02, `${k}: ${shackled}`);
        assert.ok(pools.every(p => !p.minAct), `${k} has no act gate`);
        assert.ok(pools.some(p => p.members.some(m => m.id === 'FROZEN_TRAPPER')), `${k} has frozen trappers`);
    }
});

test('wild cotton grows on the plains', () => {
    const rules = Object.values(BIOME_DEFINITIONS.PLAINS.mapObjects).flat();
    assert.ok(rules.some(r => r.id === 'COTTON_PLANT'));
});

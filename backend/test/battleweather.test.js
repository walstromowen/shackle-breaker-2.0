// backend/test/battleweather.test.js: `npm test`. A fight keeps its weather for as long as it lasts: a look of its own (frontend battleWeather.js:
// the backdrop dimmed or tinted, the weather falling or blowing across the field, lightning in a storm) and its sound looped under it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WeatherDefinitions as W } from '../../shared/world/weatherDefinitions.js';
import { WeatherFactory } from '../../shared/world/weatherFactory.js';

test('every weather but clear skies has a look for the whole fight and a sound to loop under it', async () => {
    const { BATTLE_WEATHER } = await import('../../frontend/src/screens/battle/battleWeather.js');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const def of Object.values(W)) {
        if (def.id === 'clear') continue;
        const look = BATTLE_WEATHER[def.id];
        assert.ok(look && look.tint && look.bgFilter, `${def.id}: a look`);
        assert.ok(look.rate > 0 || look.fog, `${def.id}: something falling, blowing or drifting`);
        const sound = WeatherFactory.createWeather(def.id).battleAmbience || def.audioEffect;
        assert.match(main, new RegExp(`\\b${sound}: '\\./assets/audio/`), `${def.id}: ${sound} is a loaded sound`);
    }
    assert.ok(BATTLE_WEATHER.thunderstorm.lightning, 'a storm has lightning');
    assert.equal(WeatherFactory.createWeather('blizzard').battleAmbience, 'snowWind');
});

test('the battle scene plays the weather\'s sound (not silence), clear skies none', () => {
    const src = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    const fn = src.slice(src.indexOf('resolveTargetAmbience(targetScene)'), src.indexOf('changeScene(sceneName'));
    assert.match(fn, /targetScene === 'battle'/);
    assert.match(fn, /battleAmbience \|\| w\.audioEffect/);
    assert.ok(!/\['battle', 'encounter'/.test(fn), 'a fight is no longer silent');
});

test('the weather has no one-off animation at the start of a fight any more: only its message and status, then its look for the whole fight', async () => {
    const anims = fs.readFileSync(new URL('../../shared/battle/animation/battleAnimationDefinition.js', import.meta.url), 'utf8');
    for (const name of ['weatherRain', 'weatherThunderstorm', 'weatherFog', 'weatherSandstorm', 'weatherBlizzard']) assert.ok(!anims.includes(`"${name}": anim(`), `${name} is gone`);
    for (const def of Object.values(W)) assert.ok(!def.animationId, `${def.id}: no animation`);
});

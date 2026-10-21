// backend/test/music.test.js: `npm test`. Silence in an encounter (a stage with bgm: 'none') must not leave its track marked as "still playing".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync(new URL('../../frontend/src/core/sceneManager.js', import.meta.url), 'utf8');

test('STOP_MUSIC clears the current track, so the overworld starts its own track again after the prologue\'s silence', () => {
    const m = scene.match(/events\.on\('STOP_MUSIC',[\s\S]*?\n\s*\}\);/);
    assert.ok(m, 'SceneManager listens for STOP_MUSIC');
    assert.match(m[0], /currentBgm\s*=\s*null/);
    // changeScene only plays a track that differs from currentBgm, which is what makes the cleared value matter
    assert.match(scene, /gameState\.world\.currentBgm !== targetBGM/);
});

test('the encounters that call for silence are the ones this covers', async () => {
    const { prologue } = await import('../../shared/data/encounters/prologue.js');
    const silent = Object.entries(prologue.stages).filter(([, s]) => s.bgm === 'none').map(([id]) => id);
    assert.ok(silent.length > 0, `the prologue has a silent stage (${silent})`);
});

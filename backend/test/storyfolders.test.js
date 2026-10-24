// backend/test/storyfolders.test.js: `npm test`. The story encounters (prologue, act two, the Shackling, the Darius altar) and their art and sounds live in story/ folders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';

const root = new URL('../../', import.meta.url);
const exists = (p) => fs.existsSync(new URL(p, root));
const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');

test('the story encounters are in encounters/story, and everything else stays in encounters/', () => {
    for (const f of ['prologue', 'actTwo', 'shackledBetrayal', 'mysteriousAltar']) {
        assert.ok(exists(`shared/story/encounters/story/${f}.js`), `${f}.js is in story/`);
        assert.ok(!exists(`shared/story/encounters/${f}.js`), `${f}.js is not also left in encounters/`);
    }
    for (const id of ['prologue', 'act_two', 'shackled_betrayal', 'shackled_betrayal_end', 'mysterious_altar']) {
        assert.ok(encounterDefinitions[id], `the registry still has ${id}`);
    }
});

test('the story art and sounds are in story folders, and every path the manifest gives for them exists', () => {
    const wanted = {
        encounter_prologue: 'assets/icons/encounters/story/prologue.png',
        encounter_mysterious_altar: 'assets/icons/encounters/story/mysterious_altar.png',
        prologueMarch: 'assets/audio/sfx/encounters/story/prologue/prologue_march.wav',
        prologueWind: 'assets/audio/sfx/encounters/story/prologue/prologue_wind.wav',
        chainSnap: 'assets/audio/sfx/encounters/story/prologue/chain_snap.wav',
        heartbeat: 'assets/audio/sfx/encounters/story/prologue/heartbeat.wav',
        altarDrone: 'assets/audio/sfx/encounters/story/altar_drone.wav'
    };
    for (const [key, path] of Object.entries(wanted)) {
        assert.match(main, new RegExp(`${key}:\\s*'\\./${path.replace(/\./g, '\\.')}'`), `${key} points at ${path}`);
        assert.ok(exists(`frontend/src/${path}`), `${path} exists`);
    }
    for (const old of ['assets/icons/encounters/prologue.png', 'assets/icons/encounters/mysterious_altar.png', 'assets/audio/sfx/prologue/', 'assets/audio/sfx/encounters/altar_drone.wav']) {
        assert.ok(!main.includes(old), `nothing in the manifest uses the old path ${old}`);
    }
});

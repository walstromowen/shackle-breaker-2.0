// backend/test/legionarypatrol.test.js: `npm test`. Legionaries on patrol: a walking map character in every village and down the lanes of every
// castle, its sneak-up encounter (assassinate, distract, steal, switch, walk away) and its spotted fight; and patrols coming back with a new act.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';
import { VOICED } from '../../shared/story/voiceLines.js';
import { STRUCTURES } from '../../shared/world/structures.js';
import { planCastle, CASTLE } from '../../shared/world/castleLayout.js';
import { isPatrol, notePatrolFallen, respawnPatrols } from '../../shared/world/patrols.js';
import { ActSystem } from '../../shared/story/actSystem.js';

const allResults = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])].flatMap(o => o.results);
const types = (d) => allResults(d).map(r => r.type);

test('the legionary on patrol: a walking map character with eyes, drawn from its own sheet', () => {
    const p = M.LEGIONARY_PATROL;
    assert.ok(p && p.character && p.character.entity === 'LEGIONARY');
    assert.equal(p.interaction.id, 'legionary_patrol', 'walked up to from behind: the sneak-up encounter');
    assert.equal(p.interaction.seenId, 'legionary_spots_you', 'seen: the fight');
    assert.equal(p.interaction.sight, 5);
    assert.ok(p.wander && p.wander.radius >= 4, 'he walks a round');
    assert.equal(ENTITY_DEFINITIONS.LEGIONARY.spriteOverworld, 'legionaryPatrolSprite');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const key of ['legionaryPatrolSprite', 'encounter_legionary_patrol']) assert.match(main, new RegExp(`${key}: '\\./assets/`), `${key} is registered`);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/sprites/legionary/legionary_patrol_sprite.png', import.meta.url)));
});

test('sneaking up: assassinate, distract, steal, switch, or walk away; a failed roll is the fight; a kill, a distraction or a theft sends him off the map', () => {
    const e = E.legionary_patrol;
    const d = e.stages[e.initialStage].decisions;
    const find = (re) => d.find(x => re.test(x.text));
    const assassinate = find(/Assassinate/), distract = find(/Distract/), steal = find(/Steal/), sw = d.find(x => x.type === 'switch_character'), away = find(/Walk away/);
    for (const x of [assassinate, distract, steal, sw, away]) assert.ok(x, 'every choice is there');
    assert.equal(assassinate.attribute, 'dexterity'); assert.equal(distract.attribute, 'intelligence'); assert.equal(steal.attribute, 'dexterity');
    const stageOf = (outs) => outs[0].results.find(r => r.type === 'ADVANCE_STAGE').payload.stageId;
    for (const x of [assassinate, distract, steal]) {
        const lose = e.stages[stageOf(x.failureOutcomes)];
        assert.ok(lose.decisions.some(dd => types(dd).includes('START_BATTLE') && types(dd).includes('DESTROY_OBJECT')), `${x.text}: failing it is the fight`);
        const win = e.stages[stageOf(x.successOutcomes)];
        assert.ok(win.decisions.every(dd => types(dd).includes('DESTROY_OBJECT')), `${x.text}: done, he is off the map`);
    }
    assert.ok(types(e.stages.slain.decisions[0]).includes('RECORD_KILL'));
    assert.ok(!types(away).includes('DESTROY_OBJECT'), 'walking away leaves him on his round');
    const seen = E.legionary_spots_you;
    assert.equal(e.stages.unseen.image.col, 0, 'his back');
    // a picture for each moment, as A Disturbing Sight has: no two of these stages show the same one
    const pics = ['unseen', 'slain', 'distracted', 'robbed', 'caught', 'turned'].map(id => `${e.stages[id].image.col},${e.stages[id].image.row}`);
    assert.equal(new Set(pics).size, pics.length, `every stage its own picture: ${pics.join(' ')}`);
    assert.ok(!pics.includes(`${seen.stages.spotted.image.col},${seen.stages.spotted.image.row}`), 'seen first: a picture of its own too');
    assert.ok(seen.stages[seen.initialStage].decisions.every(dd => types(dd).includes('START_BATTLE')), 'seen first: only the fight');
    assert.deepEqual(VOICED.legionary_patrol, []); assert.deepEqual(VOICED.legionary_spots_you, []);
});

test('one in every village (the blueprint), a few down the lanes of every castle', () => {
    assert.equal(STRUCTURES.ABANDONED_VILLAGE.patrol.id, 'LEGIONARY_PATROL');
    for (const seed of [1, 7, 42]) {
        const plan = planCastle(seed);
        const n = plan.props.filter(p => p.id === 'LEGIONARY_PATROL').length;
        assert.ok(n >= CASTLE.PATROLS.min, `castle ${seed}: ${n} on patrol`);
        assert.ok(n <= Math.round(plan.buildings.length / CASTLE.PATROLS.every) + 1, `castle ${seed}: not a crowd (${n})`);
    }
});

test('every patrol (madmen, legionaries, Arc Knights, bears) is put back when a new act begins, not before', () => {
    for (const id of ['MADMAN_NPC', 'LEGIONARY_PATROL', 'ARC_KNIGHT_PATROL', 'BEAR_PATROL']) assert.ok(isPatrol(id), `${id} is a patrol`);
    for (const id of ['CRATE', 'HOODED_STRANGER_NPC', 'ARC_KNIGHT_NPC']) assert.ok(!isPatrol(id), `${id} is not`);
    const keep = { world: gameState.world, milestones: gameState.milestones };
    gameState.world = { changes: {}, isInterior: false };
    gameState.milestones = [];
    try {
        const placed = [];
        const wm = { _s: (c, r) => `${c},${r}`, modifyWorld(c, r, id) { gameState.world.changes[`${c},${r}`] = id; }, getObject(c, r) { placed.push([c, r]); return null; } };
        gameState.world.changes['5,6'] = null;            // a legionary killed at his home cell, in act 1
        notePatrolFallen('LEGIONARY_PATROL', 5, 6, null);
        notePatrolFallen('CRATE', 1, 1, null);            // not a patrol: never comes back
        assert.equal(respawnPatrols(wm), 0, 'still act 1: he stays dead');
        ActSystem.grantMilestone('arc_knight_slain');     // act 2
        assert.equal(ActSystem.getAct(), 2);
        assert.equal(respawnPatrols(wm), 1, 'act 2: he is back');
        assert.equal(gameState.world.changes['5,6'], 'LEGIONARY_PATROL');
        assert.deepEqual(placed, [[5, 6]], 'made at once where the map is loaded');
        assert.equal(respawnPatrols(wm), 0, 'only once');
        assert.equal(gameState.world.changes['1,1'], undefined);
        // one killed in act 2 waits for act 3
        notePatrolFallen('MADMAN_NPC', 9, 9, null);
        assert.equal(respawnPatrols(wm), 0);
    } finally { gameState.world = keep.world; gameState.milestones = keep.milestones; }
});

test('every patrol stage that leads to a fight plays its battle music already (the patrol has recognized you), and the screen keeps it', () => {
    const res = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])].flatMap(o => o.results || []);
    const ids = new Set();
    for (const [k, d] of Object.entries(M)) if (isPatrol(k)) { ids.add(d.interaction.id); if (d.interaction.seenId) ids.add(d.interaction.seenId); }
    for (const id of ids) {
        for (const [sid, st] of Object.entries(E[id].stages)) {
            const ds = st.decisions || [];
            const fights = ds.filter(d => res(d).some(r => r.type === 'START_BATTLE'));
            if (!fights.length || fights.length !== ds.length) continue;   // a forced fight: it has seen you
            assert.ok(st.bgm && st.bgm !== 'none', `${id}/${sid}: its battle music plays on this screen`);
        }
    }
    // the encounter screen opening does not put the overworld's music back over the stage's (SceneManager.resolveTargetBGM)
    const sm = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    assert.match(sm, /targetScene === 'encounter' && this\.encounterController && this\.encounterController\.model/);
});

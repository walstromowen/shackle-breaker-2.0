// backend/test/bearpatrol.test.js: `npm test`. The Grizzly: a rare bear seen on the map in the plains and the snowy mountains, keeping to its patch
// (a slow step or two, long stops), whose encounter starts when you come near: fight it, back away, or roar it off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { BIOME_DEFINITIONS as B } from '../../shared/world/biomeDefinitions.js';
import { VOICED } from '../../shared/story/voiceLines.js';
import { WorldManager } from '../../shared/world/worldManager.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const allResults = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])].flatMap(o => o.results);

test('the bear is a map object drawn from its own sheet, keeping close to home, and being seen by it starts "A Grizzly"', () => {
    const b = M.BEAR_PATROL;
    assert.ok(b, 'BEAR_PATROL exists');
    assert.equal(b.interaction.type, 'ENCOUNTER');
    assert.equal(b.interaction.id, 'bear_patrol');
    assert.equal(b.interaction.sight, 5, 'it sees 5 tiles ahead of it');
    assert.ok(b.wander, 'it moves');
    assert.ok(b.wander.radius <= 2, 'only a little way from where it stands');
    assert.ok(b.wander.radius < M.MADMAN_NPC.wander.radius && b.wander.pauseChance > M.MADMAN_NPC.wander.pauseChance, 'less than a madman, and stopping more');
    assert.ok(b.wander.stepMs[0] >= M.MADMAN_NPC.wander.stepMs[0], 'slow steps');
    assert.equal(b.entityId || b.npc?.entityId || 'BEAR', 'BEAR');
});

test('rare, in the plains and the snowy mountains only, each in a band of its own', () => {
    const rulesOf = (biome) => Object.values(B[biome].mapObjects || {}).flat().filter(r => r && r.id === 'BEAR_PATROL');
    for (const biome of ['PLAINS', 'SNOWY_MOUNTAINS']) {
        const [r] = rulesOf(biome);
        assert.ok(r, `${biome}: a bear rule`);
        const share = r.chance - (r.rangeStart || 0);
        assert.ok(share > 0 && share <= 0.0001, `${biome}: rare (${(share * 100).toFixed(3)}% of the ground)`);
    }
    for (const biome of Object.keys(B)) if (!['PLAINS', 'SNOWY_MOUNTAINS'].includes(biome)) assert.equal(rulesOf(biome).length, 0, `${biome}: no bears`);
});

test('the encounter: fight, back away (DEX) or roar it off (STR); a failed roll is a charge; it is voiced by the narrator', () => {
    const e = encounterDefinitions.bear_patrol;
    assert.ok(e && e.stages[e.initialStage]);
    const d = e.stages.spotted.decisions;
    const fight = d.find(x => /Fight/.test(x.text));
    assert.ok(allResults(fight).some(r => r.type === 'START_BATTLE' && r.payload.enemies[0].id === 'BEAR'));
    assert.ok(allResults(fight).some(r => r.type === 'DESTROY_OBJECT'), 'the bear on the map is the one you fight');
    const back = d.find(x => /DEX/.test(x.text)), roar = d.find(x => /STR/.test(x.text));
    for (const x of [back, roar]) assert.ok(x.failureOutcomes[0].results.some(r => r.payload && r.payload.stageId === 'charge'));
    assert.ok(allResults(e.stages.charge.decisions[0]).some(r => r.type === 'START_BATTLE'));
    assert.ok(!allResults(e.stages.backed_off.decisions[0]).some(r => r.type === 'DESTROY_OBJECT'), 'backed away from: it stays');
    assert.ok(allResults(e.stages.driven_off.decisions[0]).some(r => r.type === 'DESTROY_OBJECT'), 'roared off: it is gone');
    assert.deepEqual(VOICED.bear_patrol, [], 'the narrator only');
});

test('placed on the map, it wanders a step or two about its home and no further', () => {
    quiet(() => {
        gameState.seed = 4242; gameState.milestones = []; gameState.quests = { active: {}, completed: [], trackedIds: [] };
        Object.assign(gameState.world, { changes: {}, isInterior: false, structureChunks: {}, strangerHome: null, amputatorGraveyard: null, amputatorQuarry: null, nikoliCampfire: null });
        const wm = new WorldManager();
        const sp = wm.findSpawnPoint();
        gameState.player.col = sp.col; gameState.player.row = sp.row;
        for (let y = sp.row - 32; y <= sp.row + 32; y += 16) for (let x = sp.col - 32; x <= sp.col + 32; x += 16) wm.ensureChunkLoaded(x, y);
        const home = wm._freeNear(sp.col + 5, sp.row + 5, 6);
        gameState.world.changes[wm._s(home[0], home[1])] = 'BEAR_PATROL';
        wm._placeObject(home[0], home[1], 'BEAR_PATROL');
        wm.objects.get(wm._s(home[0], home[1]))._home = [...home];
        const bear = () => [...wm.objects.values()].find(o => o.id === 'BEAR_PATROL' && o._home && o._home[0] === home[0] && o._home[1] === home[1]);
        let t = 0, moves = 0;
        const seen = new Set();
        for (let i = 0; i < 300; i++) {
            t += 2500;
            const was = bear();
            wm.tickWanderers(t);
            const m = bear();
            assert.ok(m, 'still one bear');
            if (m !== was) moves++;
            seen.add(`${m.col},${m.row}`);
            assert.ok(Math.max(Math.abs(m.col - home[0]), Math.abs(m.row - home[1])) <= M.BEAR_PATROL.wander.radius, 'never far from home');
        }
        assert.ok(moves > 5, `it does move (${moves} steps)`);
        assert.ok(seen.size >= 2, `it shifts about (${seen.size} cells)`);
    });
});

test('bears fight alone or with other bears, never beside other beasts, in every table they roam (ambushes too)', async () => {
    const { SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
    const { seedRandom, unseedRandom } = await import('../../shared/core/random.js');
    const realRandom = Math.random;
    let r = 777; Math.random = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
    seedRandom(77);
    try {
        let bearFights = 0;
        for (const id of ['plains_battles_day', 'snowy_mountains_battles_day', 'snowy_mountains_battles_night', 'snowy_mountains_battles_blood_moon']) {
            for (let i = 0; i < 600; i++) {
                for (const opts of [{}, { ambush: true, fighters: 3 }]) {
                    const ids = quiet(() => SpawnTableFactory.generateBattle(id, 'normal', opts)).enemies.map(e => e.id);
                    if (!ids.includes('BEAR')) continue;
                    bearFights++;
                    assert.ok(ids.every(x => x === 'BEAR'), `${id}: ${ids.join(', ')}`);
                }
            }
        }
        assert.ok(bearFights > 100, `bears still turn up (${bearFights} fights)`);
    } finally { unseedRandom(); Math.random = realRandom; }
});

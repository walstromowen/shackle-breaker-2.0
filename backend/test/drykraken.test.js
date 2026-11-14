// backend/test/drykraken.test.js: `npm test`. The Dry Kraken, a desert world boss: a head (192 px frames) and eight tentacles that come up out of
// the sand two at a time, a new one rising whenever one is cut down; kill the head and every tentacle falls with it. Placeholder art for now.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { events } from '../../shared/core/eventBus.js';
import { gameState } from '../../shared/core/gameState.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions as L } from '../../shared/items/lootTableDefinitions.js';
import { createBattleState, isBoss } from '../../shared/battle/battleState.js';
import { queueDeath } from '../../shared/battle/battleQueue.js';
import { TURN_TYPES } from '../../shared/battle/battleConstants.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';

const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const fileOf = (key) => { const m = main.match(new RegExp(`${key}: '([^']+)'`)); return m && new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url); };
const pngSize = (u) => { const b = fs.readFileSync(u); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const KRAKEN = ['DRY_KRAKEN', ...Array(8).fill('DRY_KRAKEN_TENTACLE')];
const battle = () => quiet(() => {
    gameState.party.members = [EntityFactory.create('LEGIONARY', 10), EntityFactory.create('LEGIONARY', 10), EntityFactory.create('LEGIONARY', 10)];
    return createBattleState(KRAKEN.map(id => EntityFactory.create(id, 10)), { maxActive: 3 });
});

test('a boss head with 192 px frames, eight tentacles that die with it, sheets in the battle layout', () => {
    assert.ok(E.DRY_KRAKEN.tags.includes('BOSS'));
    assert.equal(E.DRY_KRAKEN.frameSize, 192);
    assert.equal(E.DRY_KRAKEN_TENTACLE.fallsWith, 'DRY_KRAKEN');
    assert.ok(!E.DRY_KRAKEN_TENTACLE.tags.includes('BOSS'));
    // 16 frames to a row; an enemy only ever shows the front rows 0 and 1, so a sheet of just those two is whole (the artist's are)
    const [hw, hh] = pngSize(fileOf(E.DRY_KRAKEN.spritePortrait)), [tw, th] = pngSize(fileOf(E.DRY_KRAKEN_TENTACLE.spritePortrait));
    assert.equal(hw, 16 * 192); assert.ok(hh >= 2 * 192 && hh % 192 === 0, `head: rows of 192 (${hh})`);
    assert.equal(tw, 16 * 128); assert.ok(th >= 2 * 128 && th % 128 === 0, `tentacle: rows of 128 (${th})`);
    for (const id of ['DRY_KRAKEN', 'DRY_KRAKEN_TENTACLE']) {
        for (const a of E[id].abilities) assert.ok(A[a], `${id}: ${a} is a real ability`);
        for (const s of [E[id].crySound, E[id].deathSound]) assert.match(main, new RegExp(`${s}: '`), `${id}: ${s} is loaded`);
    }
    const trap = A.wrap.statusEffects.find(s => s.id === 'bound');
    assert.ok(trap && trap.chance >= 0.4, 'Wrap: a good chance to trap');
    assert.ok(A.wrap.effects.some(e => e.type === 'damage'), 'and it hurts');
    assert.ok(E.DRY_KRAKEN_TENTACLE.abilities.includes('wrap'));
    assert.ok(!A.constrict, 'Wrap took Constrict\'s place');
    for (const it of L.boss_dry_kraken_drops.items) assert.ok(I[it.id], `${it.id} is a real item`);
});

test('the head and two tentacles on the field, six waiting; no running from it', () => {
    const s = battle();
    assert.equal(s.activeEnemies.length, 3);
    assert.equal(s.activeEnemies[0].templateId, 'DRY_KRAKEN', 'the head takes the middle of the field');
    assert.ok(s.activeEnemies.slice(1).every(e => e.templateId === 'DRY_KRAKEN_TENTACLE'));
    assert.equal(s.enemyRoster.length, 9);
    assert.equal(s.noEscape, true);
    assert.ok(isBoss(s.activeEnemies[0]));
});

test('a tentacle cut down: the next one rises from the sand', () => {
    const s = battle();
    s.turnQueue = [];
    const t = s.activeEnemies[1];
    t.modifyResource('hp', -9999);
    queueDeath(s, t);
    const rise = s.turnQueue.find(q => q.type === TURN_TYPES.REINFORCEMENT);
    assert.ok(rise && rise.replacement.templateId === 'DRY_KRAKEN_TENTACLE');
    assert.equal(s.enemyRoster.filter(e => !e.isDead()).length, 8, 'only that one is dead');
});

test('the head killed: every tentacle falls with it, on the field and under the sand, all counted, none steps in', () => {
    const s = battle();
    s.turnQueue = [];
    const kills = [];
    const onKill = (d) => kills.push(d.enemyId);
    events.on('ENEMY_KILLED', onKill);
    const head = s.activeEnemies[0];
    head.modifyResource('hp', -99999);
    queueDeath(s, head);
    events.off('ENEMY_KILLED', onKill);
    assert.ok(s.enemyRoster.every(e => e.isDead()), 'nothing of it is left');
    assert.equal(kills.filter(k => k === 'DRY_KRAKEN').length, 1);
    assert.equal(kills.filter(k => k === 'DRY_KRAKEN_TENTACLE').length, 8);
    assert.ok(!s.turnQueue.some(q => q.type === TURN_TYPES.REINFORCEMENT), 'no tentacle rises to take a place');
    const faints = s.turnQueue.filter(q => q.animationId === 'faint').map(q => q.actor.templateId);
    assert.deepEqual(faints.sort(), ['DRY_KRAKEN', 'DRY_KRAKEN_TENTACLE', 'DRY_KRAKEN_TENTACLE'], 'the head and the two on the field fall where we can see');
    assert.equal(s.turnQueue[0].type, TURN_TYPES.MESSAGE_STATUS);
    assert.match(s.turnQueue[0].message, /Dry Kraken has been slain/, 'the head falls first');
});

/* plays a whole fight through the controller: everyone uses their second ability on whoever the cursor is on, the clock ticks until it is over */
function fight(bc) {
    const ended = [];
    const off = (e) => ended.push(e);
    events.on('BATTLE_ENDED', off);
    const key = (code) => bc.handleKeyDown(code, { code });
    let guard = 0;
    while (bc.state.active && guard++ < 4000) {
        if (bc.state.phase === 'SELECT_ACTION') { key('KeyD'); key('Enter'); }
        else if (bc.state.phase === 'SELECT_TARGET') key('Enter');
        else bc.update(0.4);
    }
    events.off('BATTLE_ENDED', off);
    return { ended, guard };
}

test('whole fights end once, won or lost; strike the head down and the fight is won at once, all nine counted', () => {
    const real = Math.random;
    try {
        for (const seed of [1, 2, 3]) {
            let a = seed; Math.random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
            quiet(() => {
                gameState.party.members = [EntityFactory.create('LEGIONARY', 14), EntityFactory.create('LEGIONARY', 14), EntityFactory.create('LEGIONARY', 14)];
                const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
                bc.start(KRAKEN.map(id => EntityFactory.create(id, 8)), { maxActive: 3 });
                const { ended, guard } = fight(bc);
                assert.ok(guard < 4000, `seed ${seed}: the fight ends`);
                assert.equal(ended.length, 1, `seed ${seed}: once`);
            });
        }
        // the head on its last legs: one blow and the tentacles go with it, a victory
        quiet(() => {
            gameState.party.members = [EntityFactory.create('LEGIONARY', 14), EntityFactory.create('LEGIONARY', 14), EntityFactory.create('LEGIONARY', 14)];
            const foes = KRAKEN.map(id => EntityFactory.create(id, 8));
            foes[0].hp = 1;
            foes[0].baseStats.speed = 0;
            const kills = [];
            const onKill = (d) => kills.push(d.enemyId);
            events.on('ENEMY_KILLED', onKill);
            const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
            bc.start(foes, { maxActive: 3 });
            const key = (code) => bc.handleKeyDown(code, { code });
            let guard = 0;
            while (bc.state.active && guard++ < 400) {
                if (bc.state.phase === 'SELECT_ACTION') { key('KeyD'); key('Enter'); }
                else if (bc.state.phase === 'SELECT_TARGET') key('Enter');   // the cursor starts on the head
                else bc.update(0.4);
                if (foes[0].hp <= 0) break;
            }
            const { ended } = fight(bc);
            events.off('ENEMY_KILLED', onKill);
            assert.equal(foes[0].hp, 0, 'the head is down');
            assert.equal(kills.length, 9, 'the head and every tentacle');
            assert.equal(ended.length, 1);
            assert.equal(ended[0].victory, true, 'won');
        });
    } finally { Math.random = real; }
});

test('every tentacle cut down tears the head open: 8% off each of its resistances, stacking; the head alone ends the fight', async () => {
    const { StatCalculator } = await import('../../shared/characters/statCalculator.js');
    const s = battle();
    s.turnQueue = [];
    const head = s.enemyRoster[0];
    const res = () => StatCalculator.calculateDetailed(head.originalEntity).resistance;
    const before = res();
    assert.ok(before.slash >= 0.3 && before.blunt >= 0.35, 'hard to hurt at first');
    for (const t of s.enemyRoster.filter(e => e.templateId === 'DRY_KRAKEN_TENTACLE')) assert.ok(StatCalculator.calculateDetailed(t.originalEntity).resistance.slash >= 0.3, 'the tentacles shrug off much of every blow');
    const cut = (n) => { for (const t of s.enemyRoster.filter(e => e.templateId === 'DRY_KRAKEN_TENTACLE' && !e.isDead()).slice(0, n)) { t.modifyResource('hp', -99999); queueDeath(s, t); } };
    cut(1);
    const sev = () => head.statusEffects.find(e => e.id === 'severed');
    assert.equal(sev().stacks, 1);
    assert.ok(Math.abs((before.slash - res().slash) - 0.08) < 1e-9, 'one tentacle: 8% less');
    assert.ok(s.turnQueue.some(q => /easier to hurt/.test(q.message || '')), 'the player is told');
    cut(7);
    assert.equal(sev().stacks, 8);
    assert.ok(res().slash < 0 && res().blunt < 0, 'all eight: the head takes more than full damage');
    assert.ok(sev().isInfinite, 'it lasts the whole fight');
    assert.ok(!head.isDead(), 'the tentacles gone, the head fights on: only its death ends it');
});

test('tuned (tools/krakenSim.mjs): small, sturdy tentacles next to the head; a boss\'s limbs scale with the players as the boss does', async () => {
    assert.equal(E.DRY_KRAKEN.baseStats.maxHpMultiplier, 1.5);
    assert.ok(E.DRY_KRAKEN_TENTACLE.baseStats.maxHpMultiplier < 0.2, 'each tentacle small next to the head');
    const head = EntityFactory.create('DRY_KRAKEN', 25), tentacle = EntityFactory.create('DRY_KRAKEN_TENTACLE', 25);
    assert.ok(tentacle.maxHp * 5 < head.maxHp, `a tentacle (${tentacle.maxHp}) is a small part of the head (${head.maxHp})`);
    const scene = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    assert.match(scene, /enemyDef\.fallsWith && \(ENTITY_DEFINITIONS\[enemyDef\.fallsWith\]\?\.tags \|\| \[\]\)\.includes\('BOSS'\)/);
    assert.ok(fs.existsSync(new URL('../../tools/krakenSim.mjs', import.meta.url)), 'the tuning tool is kept');
});

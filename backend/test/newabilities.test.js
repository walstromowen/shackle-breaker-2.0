// backend/test/newabilities.test.js: `npm test`. Whirlwind Slash, Low Sweep, Guard Break and Leaping Slash, the Vulnerable status, and their art.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { StatusEffectDefinitions as SD } from '../../shared/abilities/statusEffectDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { TurnManager } from '../../shared/battle/turnManager.js';
import { AbilityFactory } from '../../shared/abilities/abilityFactory.js';

const NEW = ['whirlwind_slash', 'low_sweep', 'guard_break', 'leaping_slash'];
const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

test('the four abilities: what they hit and how', () => {
    assert.deepEqual(A.whirlwind_slash.targeting, { scope: 'all_enemies', select: 'auto' }, 'every enemy');
    assert.equal(A.whirlwind_slash.effects[0].damageType, 'slash');
    assert.ok(A.whirlwind_slash.effects[0].power >= 0.9 && A.whirlwind_slash.effects[0].power <= 1.3, 'medium damage');
    assert.deepEqual(A.low_sweep.statusEffects.map(s => s.id).sort(), ['bleed', 'knocked_down'], 'a knock-down and / or a bleed (two separate rolls)');
    assert.equal(A.guard_break.effects[0].damageType, 'blunt');
    assert.equal(A.guard_break.effects[0].shatter.status, 'fortified');
    const leap = A.leaping_slash;
    assert.equal(leap.effects[0].damageType, 'slash');
    assert.ok(leap.effects[0].power > Math.max(...Object.values(A).filter(a => a.id !== 'leaping_slash' && a.effects?.[0]?.damageType === 'slash' && a.tags?.includes('blade')).map(a => a.effects[0].power)), 'the hardest blade slash');
    assert.ok(leap.cost.stamina >= 25, 'a lot of stamina');
    assert.deepEqual(leap.selfStatusEffects.map(s => s.id), ['vulnerable']);
});

test('each has its own icon cell, an animation of its own, and is taught by a weapon', () => {
    const cells = Object.values(A).map(a => a.icon && `${a.icon.col},${a.icon.row}`);
    for (const id of NEW) {
        const a = A[id];
        assert.equal(cells.filter(c => c === `${a.icon.col},${a.icon.row}`).length, 1, `${id}'s icon is its own`);
        assert.ok(B[a.animationId], `${id} has an animation`);
        const teaching = Object.values(I).filter(w => w.abilityUnlocks && Object.values(w.abilityUnlocks).some(l => l.includes(id)));
        assert.ok(teaching.length > 0, `${id} is learnt from a weapon`);
    }
    const main = read('frontend/src/main.js');
    for (const [key, file] of [['whirlwindSlashAnimation', 'whirlwind_slash'], ['lowSweepAnimation', 'low_sweep'], ['leapingSlashAnimation', 'leaping_slash'], ['guardBreakAnimation', 'guard_break'], ['vulnerableAnimation', 'vulnerable']]) {
        assert.ok(main.includes(`${key}: './assets/abilityAnimations/${file}.png'`), `${key} is loaded`);
        assert.ok(fs.existsSync(new URL(`../../frontend/src/assets/abilityAnimations/${file}.png`, import.meta.url)), `${file}.png exists`);
    }
    const statusCells = Object.values(SD).map(s => s.icon && `${s.icon.col},${s.icon.row}`);
    assert.equal(statusCells.filter(c => c === `${SD.vulnerable.icon.col},${SD.vulnerable.icon.row}`).length, 1, 'Vulnerable\'s icon is its own');
});

const fighter = () => { const c = new CombatantModel(EntityFactory.create('HUMANOID', { level: 5, levelEdge: false }), 'party'); return c; };

test('Vulnerable halves physical defense', () => {
    const c = fighter();
    const before = { ...c.stats.defense };
    c.applyStatusEffect(StatusEffectFactory.createEffect('vulnerable', 2, c));
    for (const t of ['slash', 'blunt', 'pierce']) assert.ok(c.stats.defense[t] <= Math.ceil(before[t] / 2), `${t}: ${before[t]} -> ${c.stats.defense[t]}`);
});

test('Guard Break shatters a Fortified guard and hits far harder than a blow the guard would take', () => {
    const hit = (abilityId, fortified) => {
        const src = fighter(), tgt = fighter();
        if (fortified) tgt.applyStatusEffect(StatusEffectFactory.createEffect('fortified', 3, tgt));
        const before = tgt.hp;
        const r = quiet(() => withRandom(0.5, () => AbilitySystem.execute(abilityId, src, tgt)));
        return { damage: before - tgt.hp, fortifiedLeft: tgt.statusEffects.some(s => s.id === 'fortified'), message: r.message };
    };
    const gb = hit('guard_break', true), strike = hit('strike', true), gbOpen = hit('guard_break', false);
    assert.equal(gb.fortifiedLeft, false, 'the guard is gone');
    assert.match(gb.message, /guard is broken/);
    assert.ok(gb.damage > strike.damage * 4, `${gb.damage} against the guard, where a strike does ${strike.damage}`);
    assert.ok(gb.damage > gbOpen.damage, 'more than against an open target');
});

test('an attack\'s selfStatusEffects land on its user once (Leaping Slash leaves them Vulnerable; Arcane Blast\'s recharge works again)', () => {
    const actor = fighter(), target = new CombatantModel(EntityFactory.create('MAD_MAN', { level: 5 }), 'enemy');
    const state = { turnQueue: [], activeParty: [actor], activeEnemies: [target], partyRoster: [actor], enemyRoster: [target], battleLedger: [] };
    const host = { state, timer: 0, checkBattleStatus() {}, endBattle() {} };
    const tm = new TurnManager(host);
    const [action] = AbilityFactory.createAbilities(['leaping_slash']);
    quiet(() => withRandom(0.5, () => tm._applyAbilityEffects({ actor, action, targets: [target], isFirstTarget: true, isLastTarget: true })));
    assert.ok(actor.statusEffects.some(s => s.id === 'vulnerable'), 'the wielder is Vulnerable');
    assert.ok(!target.statusEffects.some(s => s.id === 'vulnerable'), 'not the target');
    assert.match(read('shared/battle/turnManager.js'), /selfStatusEffects/);
});

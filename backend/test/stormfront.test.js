// backend/test/stormfront.test.js: `npm test`. Storm Front (which replaced Solar Beam): a charged wind attack. The turn it is chosen it only gathers,
// paid for then, the caster in the Eye of the Storm (half damage from the six elements); the caster's next turn looses it at the same target, with
// no menu to pick from and nothing more to pay. And Reckless Charge hits for twice a blow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';
import { PHASE } from '../../shared/battle/battleConstants.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { StatusEffectDefinitions as S } from '../../shared/abilities/statusEffectDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { seedRandom, unseedRandom } from '../../shared/core/random.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const untilChoice = (bc) => { let g = 0; while (bc.state.active && bc.state.phase !== PHASE.SELECT_ACTION && g++ < 400) bc.update(0.4); };
const until = (bc, ok) => { let g = 0; while (bc.state.active && !ok() && g++ < 400) bc.update(0.4); };

test('Storm Front: Solar Beam is gone; a surer Arcane Blast of wind whose waiting comes first, taught by the Insight of Wind at rank 4', () => {
    assert.equal(A.solar_beam, undefined);
    const s = A.storm_front, ab = A.arcane_blast;
    assert.equal(s.behavior, 'charge_attack');
    assert.equal(s.effects[0].damageType, 'wind');
    assert.equal(s.effects[0].power, ab.effects[0].power, 'as heavy as Arcane Blast');
    assert.ok(s.accuracy > ab.accuracy, 'but surer');
    assert.ok(!s.selfStatusEffects, 'no recharge after it: the waiting comes first');
    assert.equal(s.chargeStatus, 'eye_of_the_storm');
    const eye = S.eye_of_the_storm;
    for (const t of ['fire', 'ice', 'lightning', 'earth', 'water', 'wind']) assert.ok(eye.modifiers.some(m => m.target === `resistance.${t}` && m.value === 0.5), t);
    assert.deepEqual(I.insight_of_wind.insight.spells[4], ['storm_front']);
});

test('in a fight: the first turn gathers (no damage, paid, in the eye), the next looses it at the same target with no menu and no second cost', () => {
    seedRandom(7);
    // the wolf's making (traits, its natural moves) rolls Math.random, not the seeded dice: pinned too, or now and then it is born to dodge the storm
    const realRandom = Math.random;
    let r = 12345; Math.random = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
    try {
        quiet(() => {
            const mage = EntityFactory.create('HUMANOID', { name: 'Mage', level: 10, abilities: ['storm_front'] });
            mage.insight = mage.maxInsight;
            gameState.party.members = [mage];
            const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
            const foe = EntityFactory.create('WOLF', 10);
            foe.state.baseStats.maxHp = 5000; foe.hp = 5000;
            bc.start([foe], { maxActive: 3 });
            untilChoice(bc);
            const caster = bc.state.activeParty[0], wolf = bc.state.activeEnemies[0];
            const storm = caster.abilities.find(a => a.id === 'storm_front');
            // the round: the mage casts, the wolf does what it does
            const insightBefore = caster.insight, hpBefore = wolf.hp;
            bc.state.turnQueue = [{ actor: caster, action: storm, target: wolf }];
            bc.state.phase = PHASE.RESOLVE;
            until(bc, () => caster._charging);
            assert.ok(caster._charging, 'gathering');
            assert.equal(wolf.hp, hpBefore, 'no damage yet');
            assert.equal(insightBefore - caster.insight >= 16 - 1, true, 'paid on the first turn');
            assert.ok(caster.statusEffects.some(s => s.id === 'eye_of_the_storm'), 'in the eye of the storm');
            // the next round: the controller asks nothing of the mage and queues the release itself
            const insightMid = caster.insight;
            let menuWhileCharging = false;
            until(bc, () => { if (caster._charging && bc.state.phase === PHASE.SELECT_ACTION) menuWhileCharging = true; return !caster._charging; });
            assert.equal(menuWhileCharging, false, 'no menu for a fighter gathering a storm');
            untilChoice(bc);
            assert.ok(wolf.hp < hpBefore, `the storm breaks on the wolf (${hpBefore - wolf.hp} damage)`);
            assert.ok(!caster._charging && !caster.statusEffects.some(s => s.id === 'eye_of_the_storm'), 'the charge and the eye are spent');
            assert.ok(caster.insight >= insightMid, 'nothing more to pay');
            assert.equal(bc.state.phase, PHASE.SELECT_ACTION, 'and then a free choice again');
        });
    } finally { unseedRandom(); Math.random = realRandom; }
});

test('an enemy gathers and looses it too (the AI queues nothing else for it meanwhile)', () => {
    seedRandom(3);
    try {
        quiet(() => {
            const hero = EntityFactory.create('HUMANOID', { name: 'Hero', level: 10 });
            hero.state.baseStats.maxHp = 5000; hero.hp = 5000;
            gameState.party.members = [hero];
            const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
            const witch = EntityFactory.create('MAGIC_ADDICT', { level: 10, abilities: ['storm_front'] });
            witch.insight = witch.maxInsight;
            bc.start([witch], { maxActive: 3 });
            untilChoice(bc);
            const w = bc.state.activeEnemies[0], me = bc.state.activeParty[0];
            const storm = w.abilities.find(a => a.id === 'storm_front');
            bc.state.turnQueue = [{ actor: w, action: storm, target: me }];
            bc.state.phase = PHASE.RESOLVE;
            until(bc, () => w._charging);
            assert.ok(w._charging);
            // the player's turn: the AI adds nothing for the witch, and her release is in the queue
            bc.state.turnQueue = [];
            bc._startActionPhase();
            const hers = bc.state.turnQueue.filter(t => t.actor === w);
            assert.equal(hers.length, 1);
            assert.equal(hers[0].action.id, 'storm_front');
        });
    } finally { unseedRandom(); }
});

test('Reckless Charge hits for twice a blow', () => {
    assert.equal(A.reckless_charge.effects[0].power, 2.0);
});

test('every ability has an icon, and every icon cell has a picture in it (none blank)', async () => {
    const fs = await import('node:fs');
    const { execFileSync } = await import('node:child_process');
    const cells = Object.values(A).map(a => [a.id, a.icon]);
    for (const [id, icon] of cells) assert.ok(icon && Number.isInteger(icon.col) && Number.isInteger(icon.row), `${id} names an icon cell`);
    // read the sheet's cells with Python's Pillow (the art tools' own dependency) and check none is empty
    const script = `import json,sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGBA')\ncells=json.loads(sys.argv[2])\nprint(json.dumps([k for k,(c,r) in cells.items() if im.crop((c*64,r*64,c*64+64,r*64+64)).getbbox() is None]))`;
    const sheet = new URL('../../frontend/src/assets/icons/abilities.png', import.meta.url).pathname;
    const arg = JSON.stringify(Object.fromEntries(cells.map(([id, i]) => [id, [i.col, i.row]])));
    let blank;
    try { blank = JSON.parse(execFileSync('python3', ['-c', script, sheet, arg]).toString()); }
    catch { return; }   // no Python here: the definitions check above still ran
    assert.deepEqual(blank, [], 'abilities whose icon cell is empty');
    assert.ok(fs.existsSync(new URL('../../tools/art/missingAbilityIcons.py', import.meta.url)));
});

test('every ability has an icon of its own: no two abilities share a cell', () => {
    const seen = new Map();
    for (const a of Object.values(A)) {
        const k = `${a.icon.col},${a.icon.row}`;
        assert.ok(!seen.has(k), `${a.id} shares its icon cell (${k}) with ${seen.get(k)}`);
        seen.set(k, a.id);
    }
});

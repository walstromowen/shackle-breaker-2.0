// backend/test/summons.test.js: `npm test`. Summons that never crowd the field (shared/battle/summons.js): Raise Dead's familiar stands beside its
// caster without a slot, acts right after it, may take a blow meant for it, and crumbles with it; Bear Form turns the caster into a bear in its own
// slot for a few turns, then back. Neither touches the saved character.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { events } from '../../shared/core/eventBus.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';
import { PHASE } from '../../shared/battle/battleConstants.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { seedRandom, unseedRandom } from '../../shared/core/random.js';
import { guardFor, familiarOf, revertExpiredForms, GUARD_CHANCE } from '../../shared/battle/summons.js';
import { queueDeath } from '../../shared/battle/battleQueue.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const until = (bc, ok) => { let g = 0; while (bc.state.active && !ok() && g++ < 600) bc.update(0.4); };
const untilChoice = (bc) => until(bc, () => bc.state.phase === PHASE.SELECT_ACTION);
const fight = (partyIds, foeIds, opts = {}) => {
    const members = partyIds.map((id, i) => { const e = EntityFactory.create('HUMANOID', { name: `Caster${i}`, level: 10, abilities: [id] }); e.insight = e.maxInsight; e.state.baseStats.maxHp = 400; e.hp = e.maxHp; return e; });
    gameState.party.members = members;
    const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
    const foes = foeIds.map(id => { const f = EntityFactory.create(id, 10); f.state.baseStats.maxHp = opts.foeHp || 3000; f.hp = f.maxHp; return f; });
    bc.start(foes, { maxActive: 3 });
    untilChoice(bc);
    return bc;
};
const cast = (bc, actor, id, target = null) => {
    const action = actor.abilities.find(a => a.id === id);
    bc.state.turnQueue = [{ actor, action, target: target || actor }];
    bc.state.phase = PHASE.RESOLVE;
};

test('Raise Skeleton: a familiar beside the caster, in no slot; it acts right after its caster at the caster\'s target; casting again replaces it', () => {
    seedRandom(11);
    try {
        quiet(() => {
            const bc = fight(['raise_skeleton'], ['WOLF']);
            const me = bc.state.activeParty[0], wolf = bc.state.activeEnemies[0];
            const slots = bc.state.activeParty.length, insight = me.insight;
            cast(bc, me, 'raise_skeleton');
            until(bc, () => familiarOf(me));
            const fam = familiarOf(me);
            assert.ok(fam, 'raised');
            assert.equal(fam.isFamiliar, true);
            assert.equal(fam.team, 'party');
            assert.equal(bc.state.activeParty.length, slots, 'no slot taken');
            assert.ok(!bc.state.partyRoster.includes(fam), 'never in the line-up');
            assert.ok(Math.abs(fam.maxHp - me.maxHp * 0.4) <= 2, `its health a share of the caster's (${fam.maxHp} of ${me.maxHp})`);
            assert.equal(insight - me.insight, me.abilities.find(x => x.id === 'raise_skeleton').costFor(me).insight, 'paid for (its cost scales with the caster)');
            untilChoice(bc);
            // a round: the caster strikes the wolf with nothing it can (the caster has only Raise Dead: it mends), the familiar strikes too
            const hp = wolf.hp;
            fam.originalEntity.hp = Math.floor(fam.maxHp / 2);
            me.originalEntity.insight = me.maxInsight;
            cast(bc, me, 'raise_skeleton');
            untilChoice(bc);
            const fresh = familiarOf(me);
            assert.ok(fresh && fresh !== fam, 'casting again replaces it: one summon per combatant');
            assert.ok(fam.isDead(), 'the old one crumbled');
            assert.equal(fresh.hp, fresh.maxHp, 'the new one fresh');
            assert.ok(wolf.hp < hp, 'it struck the wolf by itself, after its caster');
            assert.ok(bc.state.battleLedger.some(e => e.type === 'ABILITY_USED' && (e.actor === fam || e.actor === fresh)), 'in the ledger as its own blow');
        });
    } finally { unseedRandom(); }
});

test('one summon each (every caster may have one); one crumbles with its caster; an enemy\'s familiar is nobody\'s kill and leaves no slot to fill', () => {
    seedRandom(5);
    try {
        quiet(() => {
            const bc = fight(['raise_skeleton', 'raise_skeleton', 'raise_skeleton'], ['WOLF']);
            const [a, b, c] = bc.state.activeParty;
            for (const who of [a, b, c]) { who.originalEntity.insight = who.maxInsight; cast(bc, who, 'raise_skeleton'); untilChoice(bc); }
            assert.equal([a, b, c].filter(x => familiarOf(x)).length, 3, 'each caster has its own');
            assert.equal(new Set([a, b, c].map(familiarOf)).size, 3);
            // a caster falls: its familiar with it
            const fam = familiarOf(a);
            a.originalEntity.hp = 0;
            queueDeath(bc.state, a);
            assert.ok(fam.isDead() && !familiarOf(a), 'crumbled with its caster');
        });
    } finally { unseedRandom(); }
    // the death path by itself
    const kills = []; const on = (e) => kills.push(e); events.on('ENEMY_KILLED', on);
    const state = { turnQueue: [], activeParty: [], activeEnemies: [], partyRoster: [], enemyRoster: [] };
    const owner = { team: 'enemy', name: 'Cultist', isDead: () => false };
    const fam = { team: 'enemy', name: 'Skeletal Warrior', isFamiliar: true, familiarOf: owner, isDead: () => true };
    owner._familiar = fam;
    queueDeath(state, fam);
    events.off('ENEMY_KILLED', on);
    assert.deepEqual(kills, [], 'nobody\'s kill');
    assert.ok(!state.turnQueue.some(t => t.type === 'PROMPT_REINFORCEMENT' || t.replacement), 'no reserve steps in');
    assert.equal(owner._familiar, null);
    assert.match(state.turnQueue.map(t => t.message).join(' '), /crumbles/);
});

test('a familiar takes about a third of the single blows meant for its caster, never its own side\'s', () => {
    seedRandom(99);
    try {
        const caster = { team: 'party', isDead: () => false };
        const fam = { team: 'party', isFamiliar: true, familiarOf: caster, isDead: () => false };
        caster._familiar = fam;
        const foe = { team: 'enemy' }, friend = { team: 'party' };
        let took = 0;
        for (let i = 0; i < 2000; i++) if (guardFor(caster, foe) === fam) took++;
        assert.ok(Math.abs(took / 2000 - GUARD_CHANCE) < 0.04, `${took} of 2000`);
        assert.equal(guardFor(caster, friend), null);
    } finally { unseedRandom(); }
});

test('Bear Form: a bear in the caster\'s own slot (its moves, its strength, some health back), then back again; the character itself untouched', () => {
    seedRandom(2);
    try {
        quiet(() => {
            const bc = fight(['bear_form'], ['WOLF']);
            const me = bc.state.activeParty[0];
            const own = me.abilities.map(a => a.id), savedAbilities = JSON.stringify(me.originalEntity.state.abilities);
            const before = me.stats.attack.slash;
            me.originalEntity.hp = Math.floor(me.maxHp / 2);
            const hp = me.hp;
            cast(bc, me, 'bear_form');
            until(bc, () => me._form);
            assert.deepEqual(me.abilities.map(a => a.id), ['claw', 'bite', 'pounce', 'rampage', 'rest'], 'the bear\'s moves');
            assert.ok(me.statusEffects.some(s => s.id === 'bear_form'));
            assert.ok(me.stats.attack.slash > before, 'stronger');
            assert.ok(me.hp > hp, 'some health back');
            assert.equal(bc.state.activeParty[0], me, 'in its own slot');
            assert.equal(JSON.stringify(me.originalEntity.state.abilities), savedAbilities, 'the saved character keeps its own moves');
            // the form runs out: it turns back at the next round
            me.removeStatusEffect('bear_form');
            const said = revertExpiredForms(bc.state);
            assert.deepEqual(me.abilities.map(a => a.id), own, 'its own moves again');
            assert.match(said.join(' '), /turns back/);
            assert.equal(me._form, undefined);
        });
    } finally { unseedRandom(); }
});

test('the abilities say so: Raise Dead names a creature that exists, Bear Form a form that exists', async () => {
    const { ENTITY_DEFINITIONS } = await import('../../shared/characters/entityDefinitions.js');
    const { FORMS } = await import('../../shared/battle/summons.js');
    assert.equal(A.raise_skeleton.name, 'Raise Skeleton');
    const { ItemDefinitions: I } = await import('../../shared/items/itemDefinitions.js');
    assert.deepEqual(I.insight_of_darkness.insight.spells[3], ['raise_skeleton'], 'the Insight of Darkness teaches it');
    assert.deepEqual(I.insight_of_earth.insight.spells[5], ['bear_form'], 'the Insight of Earth teaches Bear Form');
    const rd = A.raise_skeleton.effects[0];
    assert.equal(rd.familiar, true);
    assert.ok(ENTITY_DEFINITIONS[rd.entityId], `${rd.entityId} exists`);
    assert.ok(FORMS[A.bear_form.effects[0].form]);
});

test('a familiar\'s card: on top while something just happened to it (summoned, resources, statuses, in the animation), then back under, greyed', async () => {
    const { familiarCard, ATTENTION_MS } = await import('../../frontend/src/screens/battle/summonCards.js');
    const memo = new WeakMap();
    const fam = { hp: 50, stamina: 10, insight: 0, statusEffects: [] };
    let t = 0;
    const step = (ms, anim = null) => { t += ms; return familiarCard(memo, fam, t, anim, ms / 1000); };
    assert.equal(step(16).progress > 0, true, 'just summoned: it shows itself');
    for (let i = 0; i < 20; i++) step(16);
    assert.equal(step(16).onTop, true);
    step(ATTENTION_MS + 100); for (let i = 0; i < 30; i++) step(16);
    assert.equal(step(16).onTop, false, 'quiet: back under');
    fam.hp = 40;
    for (let i = 0; i < 20; i++) step(16);
    assert.equal(step(16).onTop, true, 'hurt: it shuffles to the top');
    step(ATTENTION_MS + 100); for (let i = 0; i < 30; i++) step(16);
    assert.equal(step(16).onTop, false);
    fam.statusEffects = [{ id: 'bleed', stacks: 1 }];
    for (let i = 0; i < 20; i++) step(16);
    assert.equal(step(16).onTop, true, 'a status lands');
    step(ATTENTION_MS + 100); for (let i = 0; i < 30; i++) step(16);
    for (let i = 0; i < 20; i++) step(16, { actor: fam });
    assert.equal(step(16, { actor: fam }).onTop, true, 'it acts');
    step(ATTENTION_MS + 100); for (let i = 0; i < 30; i++) step(16);
    for (let i = 0; i < 20; i++) step(16, { actor: {}, targets: [fam] });
    assert.equal(step(16).onTop, true, 'it is targeted');
    // the shuffle is eased, not a jump
    const memo2 = new WeakMap(); const f2 = { hp: 1, stamina: 1, insight: 1, statusEffects: [] };
    const first = familiarCard(memo2, f2, 0, null, 0.016);
    assert.ok(first.progress > 0 && first.progress < 0.5);
});

test('the art waiting to be painted: blank Bear sheets the game loads, the skeleton\'s back rows, guides and a note; the Bear and Bear Form use them', async () => {
    const fs = await import('node:fs');
    const root = new URL('../../', import.meta.url);
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    for (const [key, file] of [['bearPortrait', 'bear/bear_portrait.png'], ['bearSprite', 'bear/bear_sprite.png']]) {
        assert.match(main, new RegExp(`${key}: '\\./assets/sprites/${file.replace('/', '\\/')}'`));
        assert.ok(fs.existsSync(new URL(`frontend/src/assets/sprites/${file}`, root)), file);
    }
    for (const f of ['README.md', 'bear_portrait_GUIDE.png', 'bear_sprite_GUIDE.png', 'skeletal_warrior_back_GUIDE.png']) assert.ok(fs.existsSync(new URL(`tools/art/templates/${f}`, root)), f);
    const { ENTITY_DEFINITIONS: E } = await import('../../shared/characters/entityDefinitions.js');
    const { FORMS } = await import('../../shared/battle/summons.js');
    assert.equal(E.BEAR.spritePortrait, 'bearPortrait');
    assert.equal(E.BEAR.naturalPackage, 'ursine');
    assert.equal(FORMS.bear.sprite, E.BEAR.spritePortrait, 'Bear Form draws the Bear once it is painted');
    const renderer = fs.readFileSync(new URL('frontend/src/screens/battle/battleCombatantRenderer.js', root), 'utf8');
    assert.match(renderer, /_rowsHaveArt\(img, 4, frameSize\)/, 'a familiar faces away on the party side once its back view is painted');
});

test('bears roam the plains by day and the snowy mountains at every hour, and leave a pelt behind', async () => {
    const { SpawnTableDefinitions: T } = await import('../../shared/battle/spawnTableDefinitions.js');
    const { SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
    const { LootTableDefinitions: L } = await import('../../shared/items/lootTableDefinitions.js');
    const { ItemDefinitions: I } = await import('../../shared/items/itemDefinitions.js');
    const { ENTITY_DEFINITIONS: E } = await import('../../shared/characters/entityDefinitions.js');
    for (const id of ['plains_battles_day', 'snowy_mountains_battles_day', 'snowy_mountains_battles_night', 'snowy_mountains_battles_blood_moon']) {
        const wild = T[id].pools.find(p => p.members.some(m => m.id === 'BEAR'));
        assert.ok(wild && wild.factionId !== 'shackled', `${id}: bears are among its beasts`);
        seedRandom(7);
        let bears = 0;
        for (let i = 0; i < 400; i++) bears += SpawnTableFactory.generateBattle(id, 'normal').enemies.filter(e => e.id === 'BEAR').length;
        unseedRandom();
        assert.ok(bears > 10, `${id}: a bear turns up now and then (${bears} in 400 fights)`);
    }
    const drops = L[E.BEAR.lootTableId];
    assert.ok(drops, 'the Bear has a loot table');
    for (const d of drops.items) assert.ok(I[d.id], `${d.id} is a real item`);
    assert.ok(drops.items.some(d => d.id === 'fur'));
});

test('the Bear roars with a bear\'s voice, as it attacks and as it dies, and so does Bear Form', async () => {
    const fs = await import('node:fs');
    const root = new URL('../../', import.meta.url);
    const { ENTITY_DEFINITIONS: E } = await import('../../shared/characters/entityDefinitions.js');
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    assert.equal(E.BEAR.crySound, 'bearCry');
    assert.equal(E.BEAR.deathSound, 'bearCry', 'the same roar when it dies');
    for (const [key, file] of [['bearCry', 'cries/bear_cry.mp3']]) {
        assert.ok(main.includes(`${key}: './assets/audio/sfx/${file}'`), `${key} registered`);
        assert.ok(fs.statSync(new URL(`frontend/src/assets/audio/sfx/${file}`, root)).size > 10000, `${file} on disk`);
    }
    const anims = fs.readFileSync(new URL('shared/battle/animation/battleAnimationDefinition.js', root), 'utf8');
    const bearForm = anims.slice(anims.indexOf('"bear_form": anim('), anims.indexOf('"bear_form": anim(') + 400);
    assert.match(bearForm, /sfx\([^)]*'bearCry'/, 'Bear Form roars like the bear');
    assert.doesNotMatch(bearForm, /wolfCry/);
});

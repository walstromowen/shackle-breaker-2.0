// The developer console's commands (shared/core/devCommands.js): each one does what the game does for the same thing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { events } from '../../shared/core/eventBus.js';
import { DevCommands, tokenize } from '../../shared/core/devCommands.js';
import { InventorySystem } from '../../shared/items/inventorySystem.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CorruptionSystem } from '../../shared/characters/corruptionSystem.js';
import { ExperienceSystem } from '../../shared/characters/experienceSystem.js';
import { ActSystem } from '../../shared/story/actSystem.js';

const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
const run = (line, host) => quiet(() => DevCommands.run(line, host));
const text = (result) => result.lines.map(l => l.text).join('\n');
const kinds = (result) => result.lines.map(l => l.kind);

function freshParty(...names) {
    gameState.party.members = names.map(name => quiet(() => EntityFactory.create('HUMANOID', { name })));
    gameState.party.inventory.length = 0;
    gameState.party.currency = 0;
    gameState.milestones = [];
}

test('words are split on spaces, and "quotes" keep a name together', () => {
    assert.deepEqual(tokenize('additem meteorite 2'), ['additem', 'meteorite', '2']);
    assert.deepEqual(tokenize('awardxp 50 "Legionary Companion"'), ['awardxp', '50', 'Legionary Companion']);
    assert.deepEqual(tokenize('   '), []);
});

test('/additem puts the item in the inventory the way an encounter does, in any case, with a quantity', () => {
    freshParty('Hero');
    let r = run('/additem meteorite');
    assert.deepEqual(kinds(r), ['ok']);
    assert.equal(gameState.party.inventory.filter(i => i.defId === 'meteorite').length >= 1, true);
    const before = gameState.party.inventory.reduce((n, i) => n + (i.defId === 'copper_ore' ? i.qty : 0), 0);
    r = run('/ADDITEM Copper_Ore 5');
    assert.match(text(r), /Added 5 x copper_ore/);
    assert.equal(gameState.party.inventory.reduce((n, i) => n + (i.defId === 'copper_ore' ? i.qty : 0), 0), before + 5);
    assert.deepEqual(kinds(run('/additem no_such_thing')), ['error']);
    assert.deepEqual(kinds(run('/additem meteorite 0')), ['error']);
    assert.deepEqual(kinds(run('/additem meteorite x')), ['error']);
    assert.deepEqual(kinds(run('/additem')), ['error']);
});

test('/addentity adds a rested party member (the RECRUIT_CHARACTER way), at a level if asked, and refuses past 6', () => {
    freshParty('Hero');
    let r = run('/addentity legionary_companion');
    assert.match(text(r), /joined the party as member 2/);
    const recruit = gameState.party.members[1];
    assert.equal(recruit.hp, recruit.maxHp);
    assert.equal(recruit.state.levelEdgeHp || 0, 0, 'the enemy-only level HP bonus is taken off');
    r = run('/addentity LEGIONARY_COMPANION 7');
    assert.equal(gameState.party.members[2].level, 7);
    assert.deepEqual(kinds(run('/addentity nobody')), ['error']);
    assert.deepEqual(kinds(run('/addentity wolf 0')), ['error']);
    while (gameState.party.members.length < 6) run('/addentity wolf');
    r = run('/addentity wolf');
    assert.deepEqual(kinds(r), ['error']);
    assert.match(text(r), /full/);
    assert.equal(gameState.party.members.length, 6);
});

test('/awardxp gives XP through ExperienceSystem: to the leader, a number, part of a name or everyone, and says when a level was gained', () => {
    freshParty('Aldric', 'Brenna Stone', 'Cass');
    const [a, b, c] = gameState.party.members;
    let r = run('/awardxp 10');
    assert.equal(a.xp, 10); assert.equal(b.xp, 0);
    run('/awardxp 5 3');
    assert.equal(c.xp, 5);
    run('/awardxp 7 brenna');
    assert.equal(b.xp, 7);
    run('/awardxp 4 "Brenna Stone"'); run('/awardxp 4 brenna_stone');
    assert.equal(b.xp, 15);
    r = run('/awardxp 1 all');
    assert.deepEqual([a.xp, b.xp, c.xp], [11, 16, 6]);
    assert.equal(r.lines.length, 3);
    const need = a.maxXp - a.xp;
    r = run(`/awardxp ${need} aldric`);
    assert.match(text(r), /reached level 2/);
    assert.equal(a.level, 2);
    assert.ok(a.skillPoints >= 1, 'the level-up skill point is given by the game\'s own code');
    assert.deepEqual(kinds(run('/awardxp abc')), ['error']);
    assert.deepEqual(kinds(run('/awardxp 5 9')), ['error']);
    assert.deepEqual(kinds(run('/awardxp 5 zzz')), ['error']);
    freshParty('Ann', 'Anna');
    assert.match(text(run('/awardxp 5 ann')), /Ann gained/, 'an exact name wins over a longer one');
    assert.match(text(run('/awardxp 5 an')), /more than one/);
});

test('/gold, /heal and /corruption use the game\'s own rules', () => {
    freshParty('Hero', 'Friend');
    run('/gold 50'); assert.equal(gameState.party.currency, 50);
    run('/gold -80'); assert.equal(gameState.party.currency, 0, 'never below nothing');
    assert.deepEqual(kinds(run('/gold 0')), ['error']);

    const [hero, friend] = gameState.party.members;
    hero.hp = 1; friend.hp = 1; hero.stamina = 0; hero.insight = 0;
    run('/heal');
    assert.equal(hero.hp, hero.maxHp); assert.equal(hero.stamina, hero.maxStamina); assert.equal(hero.insight, hero.maxInsight);
    assert.equal(friend.hp, friend.maxHp);

    // act 1: corruption stops short of the first tier (CorruptionSystem), and the console says so
    let r = run('/corruption 80');
    assert.equal(CorruptionSystem.valueOf(hero), CorruptionSystem.ceiling());
    assert.match(text(r), /Act 1/);
    assert.match(text(run('/milestone act2')), /granted: now act 2/);
    run('/corruption 80 friend');
    assert.equal(CorruptionSystem.valueOf(friend), 80);
    r = run('/corruption 20 friend');
    assert.equal(CorruptionSystem.isShackled(friend), true, 'the 100th point shackles, as in the game');
    assert.match(text(r), /Iron shackles bind/);
    run('/heal all');
    assert.equal(friend.hp, 0, 'a shackled member stays down');
    run('/corruption -30 hero');
    assert.ok(CorruptionSystem.valueOf(hero) < 50);
});

test('/milestone grants through ActSystem and shows the ones reached', () => {
    freshParty('Hero');
    assert.match(text(run('/milestone')), /Act 1\. Milestones reached: none/);
    assert.equal(ActSystem.getAct(), 1);
    run('/milestone act2');
    assert.equal(ActSystem.getAct(), 2);
    assert.match(text(run('/milestone act2')), /already/);
    assert.match(text(run('/milestone')), /Act 2\. Milestones reached: act2/);
    assert.match(text(run('/milestone custom_flag')), /not an act milestone/);
});

test('/encounter and /battle emit what the overworld emits, lock the world first and close the console; the Shackling gets its context', () => {
    freshParty('Hero', 'Friend');
    const heard = [];
    const off = [events.on('START_ENCOUNTER', d => heard.push(['enc', d])), events.on('START_BATTLE', d => heard.push(['battle', d]))];
    let locked = 0;
    const host = { lockWorld: () => locked++, battleSetup: () => ({ background: 'plainsDay', weather: 'CLEAR' }) };
    try {
        let r = run('/encounter wounded_mutt', host);
        assert.equal(r.closeConsole, true);
        assert.equal(heard[0][0], 'enc');
        assert.equal(heard[0][1].encounterId, 'wounded_mutt');
        assert.equal(locked, 1);
        r = run('/battle wolf ROTTER', host);
        assert.equal(r.closeConsole, true);
        assert.deepEqual(heard[1][1].enemies, [{ id: 'WOLF' }, { id: 'ROTTER' }]);
        assert.equal(heard[1][1].background, 'plainsDay');
        assert.equal(locked, 2);
        // nothing is started (or locked) for a mistake
        r = run('/encounter nope', host); assert.deepEqual(kinds(r), ['error']); assert.equal(r.closeConsole, false);
        r = run('/battle wolf nope', host); assert.deepEqual(kinds(r), ['error']);
        r = run('/battle', host); assert.deepEqual(kinds(r), ['error']);
        assert.equal(locked, 2); assert.equal(heard.length, 2);
        // the Shackling: refused with nobody shackled, started with the betrayer in its context otherwise
        r = run('/encounter shackled_betrayal', host);
        assert.deepEqual(kinds(r), ['error']);
        run('/milestone act2'); run('/corruption 100 friend');
        r = run('/encounter shackled_betrayal', host);
        assert.equal(r.closeConsole, true);
        assert.deepEqual(heard[2][1].context, { betrayerIndex: 1, betrayerName: 'Friend' });
    } finally { off.forEach(o => typeof o === 'function' && o()); }
});

test('/list, /help and unknown commands answer, and Tab completion offers commands, ids and member names', () => {
    freshParty('Hero', 'Brenna Stone');
    assert.match(text(run('/list items cop')), /copper_ore/);
    assert.match(text(run('/list entities legionary')), /LEGIONARY/);
    assert.match(text(run('/list enc mutt')), /wounded_mutt/);
    assert.match(text(run('/list items zzzzzz')), /No items/);
    assert.deepEqual(kinds(run('/list')), ['error']);
    const help = text(run('/help'));
    for (const name of DevCommands.names()) assert.ok(help.includes(`/${name}`), `help lists /${name}`);
    assert.match(text(run('/help additem')), /\/additem <itemId>/);
    assert.deepEqual(kinds(run('/frobnicate')), ['error']);
    assert.deepEqual(run('').lines, []);
    for (const need of ['additem', 'addentity', 'awardxp']) assert.ok(DevCommands.names().includes(need));

    assert.deepEqual(DevCommands.complete('/addi'), { start: 1, options: ['additem'] });
    assert.deepEqual(DevCommands.complete('/add').options.sort(), ['additem', 'addentity'].sort());
    assert.deepEqual(DevCommands.complete('/additem meteo'), { start: 9, options: ['meteorite'] });
    assert.ok(DevCommands.complete('/addentity legion').options.every(o => /^LEGION/.test(o)));
    assert.deepEqual(DevCommands.complete('/awardxp 5 bre').options, ['Brenna_Stone']);
    assert.ok(DevCommands.complete('/awardxp 5 ').options.includes('all'));
    assert.deepEqual(DevCommands.complete('/additem meteorite 3').options, []);
});

test('the console is wired in: "/" opens it only in the overworld, it can be switched off, and the files follow the architecture', () => {
    const scene = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    assert.match(scene, /e\.code === 'Slash'/);
    assert.match(scene, /this\.currentScene === 'overworld'/);
    assert.match(scene, /DEV_CONSOLE\.ENABLED/);
    const consts = fs.readFileSync(new URL('../../shared/core/constants.js', import.meta.url), 'utf8');
    assert.match(consts, /DEV_CONSOLE = \{\s*ENABLED: true/);
    const arch = fs.readFileSync(new URL('../../ARCHITECTURE.md', import.meta.url), 'utf8');
    assert.match(arch, /devConsole/);
    // nothing in shared/ imports the commands: only the console does
    for (const dir of ['abilities', 'battle', 'characters', 'core', 'items', 'story', 'world']) {
        for (const f of fs.readdirSync(new URL(`../../shared/${dir}/`, import.meta.url)).filter(n => n.endsWith('.js') && n !== 'devCommands.js')) {
            assert.ok(!/from\s*['"][^'"]*devCommands/.test(fs.readFileSync(new URL(`../../shared/${dir}/${f}`, import.meta.url), 'utf8')), `${dir}/${f} must not import devCommands`);
        }
    }
});

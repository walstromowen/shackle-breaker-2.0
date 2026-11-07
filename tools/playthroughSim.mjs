// tools/playthroughSim.mjs: simulated playthroughs to tune enemy difficulty.
// Every starting class, N runs, levels 1..MAXL, FIGHTS fights a level, against encounters rolled from the real spawn tables, with the
// game's real stat, ability and damage code. Solo player, fresh HP each fight, attribute points spent the way the class leans, weapon
// upgraded on a schedule and levelled into its requirements.
//
//   node tools/playthroughSim.mjs [runs=100] [maxLevel=50] [fightsPerLevel=3]          a table per metric, per class and level band
//   JSON=1 node tools/playthroughSim.mjs ...                                            the raw numbers as JSON instead
//   KNOBS='{"edgeAtk":0.5,"edgeHp":0}' node tools/playthroughSim.mjs ...               a what-if with other dials (defaults: the game's)
//   TRACE=Traveler,Hermit node tools/playthroughSim.mjs                                 how those classes' builds grow
//   STATS=1 node tools/playthroughSim.mjs [runs] > stats.json                           every enemy's stats at levels 1-20, and every class's
//                                                                                        build (averaged over the runs) at levels 1-30, as JSON
//   PARTY=3 node tools/playthroughSim.mjs ...                                           fight with companions: 3 fighters (the class plus two of random
//   PARTY='1:1,5:2,12:3' ...                                                            classes, built the same way), or a party size that grows by level
//   DIFF=hard node tools/playthroughSim.mjs ...                                         the game's difficulty: spawn group sizes and the enemy level offset
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RUNS = +(process.argv[2] || 100), MAXL = +(process.argv[3] || 50), FIGHTS = +(process.argv[4] || 3);
const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };
const realLog = console.log;
console.log = noop; console.warn = noop; console.error = noop;
const out = (s) => process.stdout.write(s + '\n');
// the dials (the game's values as defaults): per level above 1 an enemy gains
// edgeHp max HP and edgeAtk points in the attribute its best attack scales with (on top of the 2 HP and 1 attribute point every level gives)
const { LEVEL_EDGE_HP_PER_LEVEL, LEVEL_EDGE_ATTACK_PER_LEVEL } = await import(ROOT + '/shared/characters/entityFactory.js');
const K = { edgeHp: LEVEL_EDGE_HP_PER_LEVEL, edgeAtk: LEVEL_EDGE_ATTACK_PER_LEVEL, ...JSON.parse(process.env.KNOBS || '{}') };
// ATTRS='{"WOLF":{"strength":8}}': try other attributes for some enemy kinds (merged over their definitions)
const ATTR_OVERRIDES = JSON.parse(process.env.ATTRS || '{}');
const makeEnemy = (id, overrides) => EntityFactory.create(id, ATTR_OVERRIDES[id] ? { ...overrides, attributes: { ...(overrides.attributes || {}), ...ATTR_OVERRIDES[id] } } : overrides);

const { gameState } = await import(ROOT + '/shared/core/gameState.js');
const { StatCalculator } = await import(ROOT + '/shared/characters/statCalculator.js');
const { EntityFactory } = await import(ROOT + '/shared/characters/entityFactory.js');
const { ItemFactory } = await import(ROOT + '/shared/items/itemFactory.js');
const { AbilityFactory } = await import(ROOT + '/shared/abilities/abilityFactory.js');
const { CombatCalculator } = await import(ROOT + '/shared/battle/combatCalculator.js');
const { SpawnTableFactory } = await import(ROOT + '/shared/battle/spawnTableFactory.js');
const { ActSystem } = await import(ROOT + '/shared/story/actSystem.js');
const { requirementsAt } = await import(ROOT + '/shared/items/weaponRequirements.js');
const { DIFFICULTY_MODIFIERS } = await import(ROOT + '/shared/core/constants.js');
const DIFF = process.env.DIFF || 'normal';
const DIFF_OFFSET = DIFFICULTY_MODIFIERS[DIFF]?.enemyLevelOffset || 0;
// PARTY: '3' or '1:1,5:2,12:3' (from level 1 one fighter, from level 5 two, from level 12 three)
const PARTY_STEPS = String(process.env.PARTY || '1').split(',').map(x => x.includes(':') ? x.split(':').map(Number) : [1, +x]).sort((a, b) => a[0] - b[0]);
const partySizeAt = (level) => PARTY_STEPS.filter(([l]) => level >= l).reduce((n, [, k]) => k, 1);

// ---- the classes (characterCreatorLogic.js) ----
const CLASSES = {
    Traveler:     { a: [11, 11, 10, 9, 9],  weapon: 'shortsword',        armor: 'leather' },
    Blacksmith:   { a: [15, 13, 8, 7, 7],   weapon: 'shortsword',        armor: 'iron' },
    Ranger:       { a: [10, 9, 15, 8, 8],   weapon: 'shortbow',          armor: 'leather' },
    Scholar:      { a: [8, 7, 9, 14, 12],   weapon: 'insight_of_arcane', armor: 'cloth' },
    Warrior:      { a: [13, 15, 9, 7, 6],   weapon: 'handaxe',           armor: 'iron' },
    Thief:        { a: [9, 8, 16, 9, 8],    weapon: 'dagger',            armor: 'leather' },
    Hermit:       { a: [10, 7, 9, 13, 11],  weapon: 'insight_of_earth',  armor: 'cloth' },
    Farmer:       { a: [15, 12, 9, 7, 7],   weapon: 'scythe',            armor: 'iron' },
    BountyHunter: { a: [12, 11, 14, 7, 6],  weapon: 'shortsword',        armor: 'leather' },
    Diseased:     { a: [10, 10, 10, 10, 10], weapon: null,               armor: 'leather' },
};
const ATTRS = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
const ARMOR = {
    tattered: ['tattered_hood', 'tattered_shirt', 'tattered_gloves', 'tattered_pants', 'tattered_boots'],
    leather: ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'],
    iron: ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'],
    cloth: ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'],
};
const WEAPON_DUE = [1, 4, 9, 15, 22];   // player level at which the weapon reaches level 1..5 (materials), give or take
const rnd = Math.random;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---- one playthrough's character ----
function newRun(cls) {
    const base = {};
    ATTRS.forEach((k, i) => base[k] = cls.a[i]);
    // what this player likes to raise: the class's own leanings, a little vigor always, and a personal twist
    const w = {};
    ATTRS.forEach((k, i) => w[k] = Math.max(0.3, cls.a[i] - 6) * (0.7 + rnd() * 0.6));
    w.vigor += 2;
    return { attrs: { ...base }, weights: w, weaponLevel: 1, due: WEAPON_DUE.map(l => Math.max(1, l + Math.round((rnd() - 0.5) * 3))), armorAt: 3 + Math.floor(rnd() * 3) };
}
function spendPoint(run, cls, level) {
    // the next weapon upgrade's requirements come first (a Souls player levels into the weapon), then what the class likes
    if (cls.weapon) {
        const next = run.weaponLevel + 1;
        if (next <= 5 && run.due[next - 1] <= level + 3) {
            const reqs = requirementsAt(cls.weapon, next);
            for (const [k, need] of Object.entries(reqs)) if (run.attrs[k] < need) { run.attrs[k]++; return; }
        }
    }
    const total = ATTRS.reduce((s, k) => s + run.weights[k], 0);
    let r = rnd() * total;
    for (const k of ATTRS) { r -= run.weights[k]; if (r <= 0) { run.attrs[k]++; return; } }
    run.attrs.vigor++;
}
function buildPlayer(run, cls, level) {
    // upgrade the weapon when it is due and its requirements are met
    if (cls.weapon) while (run.weaponLevel < 5 && run.due[run.weaponLevel] <= level) {
        const reqs = requirementsAt(cls.weapon, run.weaponLevel + 1);
        if (Object.entries(reqs).some(([k, need]) => run.attrs[k] < need)) break;
        run.weaponLevel++;
    }
    const equipment = {};
    if (cls.weapon) { const it = ItemFactory.createItem(cls.weapon); it.level = run.weaponLevel; equipment[it.slot === 'twoHand' ? 'twoHand' : 'mainHand'] = it; }
    const set = level >= run.armorAt ? cls.armor : 'tattered';
    const armorLevel = set === 'tattered' ? 1 : Math.min(5, 1 + Math.floor((level - run.armorAt) / 6));
    for (const id of ARMOR[set]) { const it = ItemFactory.createItem(id); if (!it) continue; it.level = Math.min(armorLevel, it.maxLevel || 1); equipment[it.slot] = it; }
    const e = EntityFactory.create('HUMANOID', { attributes: { ...run.attrs }, equipment, level, traits: [], levelEdge: false });
    Object.assign(e.state ? e.state.attributes : e.attributes, run.attrs);
    return e;
}

// ---- battle ----
const abilityIdsOf = (e) => {
    const ids = new Set((e.abilities || e.state?.abilities || []).map(a => typeof a === 'string' ? a : a.id));
    for (const it of Object.values(e.equipment || e.state?.equipment || {})) {
        if (!it) continue;
        const item = typeof it === 'string' ? ItemFactory.createItem(it) : it;
        (item?.grantedAbilities || []).forEach(a => ids.add(a));
    }
    return [...ids];
};
function combatant(e, team) {
    const stats = StatCalculator.calculate(e);   // enemies hit by the same rule as the party: their attributes are what make them dangerous
    const c = { e, team, stats, name: e.name, hp: stats.maxHp, stamina: stats.maxStamina, insight: stats.maxInsight, maxHp: stats.maxHp, maxStamina: stats.maxStamina, maxInsight: stats.maxInsight };
    c.abilities = AbilityFactory.createAbilities(abilityIdsOf(e)).filter(a => a && (typeof a.usableIn !== 'function' || a.usableIn('battle')));
    for (const a of c.abilities) { a._cost = a.costFor({ maxStamina: c.maxStamina, maxInsight: c.maxInsight, maxHp: c.maxHp }); a._dmg = (a.effects || []).filter(f => f.type === 'damage'); }
    return c;
}
const canPay = (c, a) => (!a._cost.stamina || c.stamina >= a._cost.stamina) && (!a._cost.insight || c.insight >= a._cost.insight) && (!a._cost.hp || c.hp > a._cost.hp);
const pay = (c, a) => { c.stamina -= a._cost.stamina || 0; c.insight -= a._cost.insight || 0; c.hp -= a._cost.hp || 0; };
const hitsOf = (a) => { const m = a.multihit; return m ? (typeof m === 'number' ? m : (m.max || m.min || 1)) : 1; };
function targetsOf(a, foes) {
    const live = foes.filter(f => f.hp > 0);
    const t = a.targeting || {};
    if (t.scope === 'all_enemies') return live;
    if (t.select === 'multiple') return live.slice(0, t.count || 2);
    if (t.scope === 'random_enemy') return [pick(live)];
    return [live.sort((x, y) => x.hp - y.hp)[0]];
}
function expected(a, c, foes) {
    if (!a._dmg.length) return 0;
    const ts = targetsOf(a, foes); let sum = 0;
    for (const t of ts) for (const f of a._dmg) {
        const type = (f.damageType || 'blunt').toLowerCase();
        sum += CombatCalculator.calculateMitigatedDamage((c.stats.attack[type] || 0) * (f.power || 1) * 1.4, t.stats.defense[type] || 0, t.stats.resistance[type] || 0, false) * hitsOf(a);
    }
    return sum;
}
function act(c, a, foes, log) {
    pay(c, a);
    for (const f of (a.effects || [])) {
        if (f.type === 'recover' && f.calculation === 'percent') {
            if (f.resource === 'stamina') c.stamina = Math.min(c.maxStamina, c.stamina + c.maxStamina * f.power);
            if (f.resource === 'insight') c.insight = Math.min(c.maxInsight, c.insight + c.maxInsight * f.power);
        }
    }
    if (!a._dmg.length) return;
    for (const t of targetsOf(a, foes)) for (let h = 0; h < hitsOf(a); h++) for (const f of a._dmg) {
        if (t.hp <= 0) break;
        const r = CombatCalculator.calculateDamage({ team: c.team, stats: c.stats }, { stats: t.stats }, f.power || 1, f.damageType || 'blunt', a.accuracy ?? 1);
        if (r.hit) { t.hp -= r.damage; if (log) log.dealt += r.damage; }
    }
}
const REST = () => { const r = AbilityFactory.createAbilities(['rest'])[0]; r._cost = {}; r._dmg = []; return r; };
function battle(players, enemies, carryHp = null) {
    const party = (Array.isArray(players) ? players : [players]).map(e => combatant(e, 'party'));
    if (carryHp) party.forEach((c, i) => { c.hp = Math.max(0, Math.round(c.maxHp * (carryHp[i] ?? 1))); });   // wounds from the last fight
    const p = party[0];
    const foes = enemies.map(e => combatant(e, 'enemy'));
    const startHp = party.reduce((s, c) => s + c.hp, 0), foeHp = foes.reduce((s, f) => s + f.maxHp, 0);
    const alive = () => party.some(c => c.hp > 0);
    let rounds = 0, playerAttacks = 0;
    const log = { dealt: 0 };
    const rest = REST();
    while (rounds < 60 && alive() && foes.some(f => f.hp > 0)) {
        rounds++;
        const field = () => foes.filter(f => f.hp > 0).slice(0, 3);   // three enemies on the field, the rest wait in reserve and step in as others fall
        const order = [...party.filter(c => c.hp > 0), ...field()].sort((x, y) => (y.stats.speed || 0) - (x.stats.speed || 0) + (rnd() - 0.5) * 0.01);
        for (const c of order) {
            if (c.hp <= 0 || !alive() || !foes.some(f => f.hp > 0)) continue;
            if (c.team === 'party') {
                let best = null, bestV = 0, topV = 0;
                for (const a of c.abilities) {
                    if (!a._dmg.length) continue;
                    const v = expected(a, c, field());
                    if (v > topV) topV = v;
                    if (canPay(c, a) && v > bestV) { bestV = v; best = a; }
                }
                // a player rests a turn rather than poke with an attack far weaker than the one the rest would pay for
                if (best && bestV < topV * 0.5) best = null;
                if (best) { act(c, best, field(), c === p ? log : null); if (c === p) playerAttacks++; } else act(c, rest, field());
            } else {
                const valid = c.abilities.filter(a => canPay(c, a) && !['rest', 'punch'].includes(a.id));
                const choice = valid.length ? pick(valid) : (c.abilities.find(a => a.id === 'punch' && canPay(c, a)) || rest);
                act(c, choice, [pick(party.filter(m => m.hp > 0))]);   // the enemy AI picks among the living fighters
            }
        }
        for (const c of [...party, ...foes]) {
            if (c.hp <= 0) continue;
            c.stamina = Math.min(c.maxStamina, c.stamina + Math.round(c.stats.staminaRecovery || 0));
            c.insight = Math.min(c.maxInsight, c.insight + Math.round(c.stats.insightRecovery || 0));
            c.hp = Math.min(c.maxHp, c.hp + Math.round(c.stats.hpRecovery || 0));
        }
    }
    const won = alive() && !foes.some(f => f.hp > 0);
    const killed = foes.filter(f => f.hp <= 0).length;
    return { won, hpEach: party.map(c => Math.max(0, c.hp) / c.maxHp), hpLeft: party.reduce((s, c) => s + Math.max(0, c.hp), 0) / Math.max(1, startHp), rounds, n: foes.length, attacksPerKill: killed ? playerAttacks / killed : null, dmgShare: log.dealt / Math.max(1, playerAttacks) / (foeHp / foes.length) };
}

// ---- encounters ----
const { PARTY_SCALING } = await import(ROOT + '/shared/battle/spawnTableFactory.js');
const SCALE = { ...PARTY_SCALING, ...JSON.parse(process.env.PSCALE || '{}') };   // PSCALE='{"EXTRA_ENEMIES":[0,1.5,3]}': other group growth with party size
function encounter(level, fighters = 1) {
    const act2 = level >= 20;
    gameState.milestones = act2 ? ['act2'] : [];
    const biomes = level < 6 ? ['plains'] : ['plains', 'desert', 'snowy_mountains'];
    const b = pick(biomes);
    const night = rnd() < 0.3;
    const table = act2 && night && rnd() < 0.6 ? `${b}_battles_blood_moon` : `${b}_battles_${night ? 'night' : 'day'}`;
    const model = SpawnTableFactory.generateBattle(table, DIFF, { fighters }, SCALE);
    const base = level + DIFF_OFFSET + ActSystem.getEnemyLevelOffset();
    return (model.enemies || []).map(cfg => {
        const id = cfg.id; const { id: _, levelOffset = 0, ...rest } = cfg;
        let overrides = { level: Math.max(1, base + levelOffset), ...rest };
        const up = ActSystem.getEnemyUpgrade(id);
        if (up) overrides = { ...overrides, abilities: [...(overrides.abilities || []), ...up.abilities], traits: [...(overrides.traits || []), ...up.traits] };
        const e = makeEnemy(id, { ...overrides, levelEdge: false });
        if (!e) return null;
        // the level edge, from the dials
        const lv = overrides.level, st = e.state || e;
        if (lv > 1) {
            const main = EntityFactory._mainAttackAttribute({ attributes: st.attributes, equipment: st.equipment, baseStats: st.baseStats, tags: st.tags });
            if (main) st.attributes[main] += Math.floor((lv - 1) * K.edgeAtk);
            st.baseStats.maxHp += Math.trunc((lv - 1) * K.edgeHp);
            e.hp = e.maxHp;
        }
        return e;
    }).filter(Boolean);
}

// MATCHUP=level: every enemy kind, one on one, against each class at that level (fresh HP, 60 fights each): who is too strong or too weak
if (process.env.MATCHUP) {
    const level = +process.env.MATCHUP;
    const { SpawnTableDefinitions } = await import(ROOT + '/shared/battle/spawnTableDefinitions.js');
    const kinds = new Set();
    for (const [tid, t] of Object.entries(SpawnTableDefinitions)) if (/_battles_/.test(tid)) for (const m of JSON.stringify(t).matchAll(/"id":"([A-Z_]+)"/g)) kinds.add(m[1]);
    const names = Object.keys(CLASSES).filter(n => n !== 'Diseased');
    out(`level ${level}: player win % one on one`);
    out('enemy'.padEnd(20) + names.map(n => n.slice(0, 7).padStart(8)).join('') + '     avg');
    const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
    if (only) for (const id of only) kinds.add(id);   // ONLY may name any enemy, a boss too
    for (const id of [...kinds].sort().filter(k => !only || only.includes(k))) {
        const row = [];
        for (const name of names) {
            const cls = CLASSES[name]; let wins = 0; const N = +(process.env.N || 60);
            for (let i = 0; i < N; i++) {
                const r = newRun(cls);
                for (let l = 2; l <= level; l++) spendPoint(r, cls, l);
                const p = buildPlayer(r, cls, level);
                const e = makeEnemy(id, { level, levelEdge: false });
                const st = e.state || e;
                if (level > 1) {
                    const main = EntityFactory._mainAttackAttribute({ attributes: st.attributes, equipment: st.equipment, baseStats: st.baseStats, tags: st.tags });
                    if (main) st.attributes[main] += Math.floor((level - 1) * K.edgeAtk);
                    st.baseStats.maxHp += Math.trunc((level - 1) * K.edgeHp);
                    e.hp = e.maxHp;
                }
                if (battle(p, [e]).won) wins++;
            }
            row.push(wins / N * 100);
        }
        out(id.padEnd(20) + row.map(v => v.toFixed(0).padStart(8)).join('') + (row.reduce((a, b) => a + b, 0) / row.length).toFixed(0).padStart(8));
    }
    process.exit(0);
}
if (process.env.TRACE) {
    for (const name of process.env.TRACE.split(',')) {
        const cls = CLASSES[name]; const r = newRun(cls);
        for (let level = 1; level <= 25; level++) {
            if (level > 1) spendPoint(r, cls, level);
            const p = buildPlayer(r, cls, level);
            if ([1, 4, 8, 12, 16, 20, 25].includes(level)) {
                const d = StatCalculator.calculateDetailed(p);
                realLog(`${name} L${level} wpn Lv${r.weaponLevel} ${JSON.stringify(r.attrs)} slash ${d.attack.slash} pierce ${d.attack.pierce} unmet ${JSON.stringify(d.unmetRequirements.map(u => u.unmet))} hp ${d.maxHp.total} stam ${d.maxStamina.total}`);
            }
        }
    }
    process.exit(0);
}
if (process.env.STATS) {
    const PHYS = ['blunt', 'slash', 'pierce'], MAGIC = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'];
    const avg = (o, ks) => ks.reduce((t, k) => t + (o[k] || 0), 0) / ks.length;
    const best = (o) => Object.entries(o).reduce((b, [k, v]) => (v > b[1] ? [k, v] : b), ['', -1]);
    const { SpawnTableDefinitions } = await import(ROOT + '/shared/battle/spawnTableDefinitions.js');
    
    const tables = {};
    for (const [tid, t] of Object.entries(SpawnTableDefinitions)) for (const m of JSON.stringify(t).matchAll(/"id":"([A-Z_]+)"/g)) (tables[m[1]] ??= new Set()).add(tid);
    const enemies = {};
    for (const [id, inTables] of Object.entries(tables)) {
        const rows = [];
        for (let level = 1; level <= 20; level++) {
            const e = EntityFactory.create(id, level);   // the game's own enemy, level edge and all
            if (!e) break;
            const st = StatCalculator.calculate(e);
            const [type, attack] = best(st.attack);
            rows.push({ level, hp: st.maxHp, attackType: type, attack, 
                physDef: +avg(st.defense, PHYS).toFixed(1), magicDef: +avg(st.defense, MAGIC).toFixed(1), speed: st.speed, evasion: st.evasion, accuracy: st.accuracy });
        }
        if (rows.length) enemies[id] = { name: EntityFactory.create(id, 1).name, tables: [...inTables], rows };
    }
    const classes = {};
    for (const [name, cls] of Object.entries(CLASSES)) {
        const sum = Array.from({ length: 30 }, () => ({}));
        const add = (row, k, v) => { row[k] = (row[k] || 0) + v; };
        let attackType = {};
        for (let run = 0; run < RUNS; run++) {
            const r = newRun(cls);
            for (let level = 1; level <= 30; level++) {
                if (level > 1) spendPoint(r, cls, level);
                const p = buildPlayer(r, cls, level), st = StatCalculator.calculate(p), row = sum[level - 1];
                const [type, attack] = best(st.attack);
                attackType[level] = attackType[level] || {}; attackType[level][type] = (attackType[level][type] || 0) + 1;
                for (const k of ATTRS) add(row, k, r.attrs[k]);
                add(row, 'hp', st.maxHp); add(row, 'stamina', st.maxStamina); add(row, 'insight', st.maxInsight);
                add(row, 'attack', attack); add(row, 'physDef', avg(st.defense, PHYS)); add(row, 'magicDef', avg(st.defense, MAGIC));
                add(row, 'speed', st.speed); add(row, 'weaponLevel', r.weaponLevel);
                add(row, 'armorLevel', level >= r.armorAt ? Math.min(5, 1 + Math.floor((level - r.armorAt) / 6)) : 0);
            }
        }
        classes[name] = { weapon: cls.weapon, armor: cls.armor, rows: sum.map((row, i) => ({ level: i + 1,
            attackType: Object.entries(attackType[i + 1]).sort((a, b) => b[1] - a[1])[0][0],
            ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, +(v / RUNS).toFixed(1)])) })) };
    }
    process.stdout.write(JSON.stringify({ runs: RUNS, enemies, classes }) + '\n');
    process.exit(0);
}
// ---- run ----
const BANDS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 40], [41, 50], [51, 80], [81, 150]].filter(([a]) => a <= MAXL);
const stats = {};
const t0 = Date.now();
for (const [name, cls] of Object.entries(CLASSES)) {
    const S = stats[name] = BANDS.map(() => ({ fights: 0, wins: 0, hpLeft: 0, rounds: 0, apk: 0, apkN: 0, enemies: 0, dmg: 0, chain: 0, chainN: 0 }));
    for (let run = 0; run < RUNS; run++) {
        const r = newRun(cls);
        // companions: other classes, levelled and geared the same way (a recruit is on the player rules)
        const mates = [1, 2].map(() => { const c = CLASSES[pick(Object.keys(CLASSES).filter(n => n !== 'Diseased'))]; return { c, r: newRun(c) }; });
        for (let level = 1; level <= MAXL; level++) {
            if (level > 1) { spendPoint(r, cls, level); for (const m of mates) spendPoint(m.r, m.c, level); }
            const player = [buildPlayer(r, cls, level), ...mates.slice(0, partySizeAt(level) - 1).map(m => buildPlayer(m.r, m.c, level))];
            const band = BANDS.findIndex(([a, b]) => level >= a && level <= b);
            for (let f = 0; f < FIGHTS; f++) {
                const foes = encounter(level, player.length);
                if (!foes.length) continue;
                const res = battle(player, foes);
                const s = S[band];
                s.fights++; if (res.won) s.wins++; s.hpLeft += res.won ? res.hpLeft : 0; s.rounds += res.rounds; s.enemies += res.n; s.dmg += res.dmgShare;
                if (res.attacksPerKill !== null) { s.apk += res.attacksPerKill; s.apkN++; }
            }
            // attrition: fights in a row, wounds carried over and no healing, until the party falls (at most 12)
            let hp = null, n = 0;
            while (n < 12) {
                const foes = encounter(level, player.length);
                if (!foes.length) continue;
                const res = battle(player, foes, hp);
                if (!res.won) break;
                n++; hp = res.hpEach;
            }
            S[band].chain += n; S[band].chainN++;
        }
    }
}
const result = { knobs: K, runs: RUNS, maxLevel: MAXL, fights: FIGHTS, bands: BANDS, stats, seconds: (Date.now() - t0) / 1000 };
if (process.env.JSON) { process.stdout.write(JSON.stringify(result) + '\n'); process.exit(0); }
const bandName = ([a, b]) => `L${a}-${b}`;
out(`dials ${JSON.stringify(K)}  difficulty ${DIFF}  party ${process.env.PARTY || '1'}`);
out(`${RUNS} runs x ${FIGHTS} fights a level, levels 1-${MAXL}, ${result.seconds.toFixed(0)}s`);
const METRICS = [
    ['WIN RATE (fresh HP)', s => s.wins / s.fights * 100, '%'],
    ['HP LEFT AFTER A WIN', s => s.hpLeft / Math.max(1, s.wins) * 100, '%'],
    ['PLAYER ATTACKS PER KILL', s => s.apk / Math.max(1, s.apkN), ' '],
    ['ROUNDS PER FIGHT', s => s.rounds / s.fights, ' '],
    ['FIGHTS IN A ROW BEFORE THE PARTY FALLS (wounds carried, no healing, max 12)', s => s.chain / Math.max(1, s.chainN), ' '],
];
for (const [title, fn, unit] of METRICS) {
    out(`\n${title}`);
    out('class'.padEnd(14) + BANDS.map(b => bandName(b).padStart(9)).join(''));
    const agg = BANDS.map(() => [0, 0]);
    for (const [name, S] of Object.entries(stats)) {
        out(name.padEnd(14) + S.map((s, i) => {
            if (!s.fights) return '-'.padStart(9);
            const v = fn(s);
            if (name !== 'Diseased') { agg[i][0] += v; agg[i][1]++; }
            return (v.toFixed(1) + unit).padStart(9);
        }).join(''));
    }
    out('AVG (no Dis.)'.padEnd(14) + agg.map(([t, n]) => ((t / Math.max(1, n)).toFixed(1) + unit).padStart(9)).join(''));
}

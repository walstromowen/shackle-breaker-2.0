// tools/krakenSim.mjs: the Dry Kraken fight, played through the game's own battle code (BattleController), to tune it.
// Parties are built as tools/playthroughSim.mjs builds them (random classes, attribute points spent the way each class leans, weapon and armour
// upgraded on that schedule), at the level the fight comes at ("Behind the Mirage" asks for 24). The enemies are built the way SceneManager
// builds a story fight: the party's level + 1 (act 2) + 1 for every player beyond the first; the head's health scaled for the number of players
// (PARTY_SCALING.BOSS_HP_BY_PLAYERS). Three fighters on the field; in a party of players, everyone's other characters wait in reserve.
// Every character uses its strongest move it can pay for, aimed by a strategy: 'head' (straight for the head) or 'tentacles' (cut them first).
//
//   node tools/krakenSim.mjs [runs=40] [level=24]
//   KNOBS='{"headHp":2,"tentacleHp":18}' node tools/krakenSim.mjs        a what-if (headHp: the head's maxHpMultiplier; tentacleHp: their maxHp)
//   BOSS=DARIUS_THE_GROVELER node tools/krakenSim.mjs 40 15              another boss, alone, for comparison (the same parties, the same scaling)
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RUNS = +(process.argv[2] || 40), LEVEL = +(process.argv[3] || 24);
const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };
const out = (s) => process.stdout.write(s + '\n');
console.log = noop; console.warn = noop; console.error = noop;

const { gameState } = await import(ROOT + '/shared/core/gameState.js');
const { events } = await import(ROOT + '/shared/core/eventBus.js');
const { EntityFactory } = await import(ROOT + '/shared/characters/entityFactory.js');
const { ItemFactory } = await import(ROOT + '/shared/items/itemFactory.js');
const { InventorySystem } = await import(ROOT + '/shared/items/inventorySystem.js');
const { ENTITY_DEFINITIONS } = await import(ROOT + '/shared/characters/entityDefinitions.js');
const { bossHpFactor, PARTY_SCALING } = await import(ROOT + '/shared/battle/spawnTableFactory.js');
const { requirementsAt } = await import(ROOT + '/shared/items/weaponRequirements.js');
const { BattleController } = await import(ROOT + '/frontend/src/screens/battle/battleController.js');
const K = { ...JSON.parse(process.env.KNOBS || '{}') };
const WEAPON_CAP = Number(process.env.WEAPON_CAP || 4);   // by the Kraken a party has usually forged enough steel for level 4, rarely 5

// ---- parties, built as tools/playthroughSim.mjs builds them ----
const CLASSES = {
    Traveler: { a: [11, 11, 10, 9, 9], weapon: 'shortsword', armor: 'leather' }, Blacksmith: { a: [15, 13, 8, 7, 7], weapon: 'shortsword', armor: 'iron' },
    Ranger: { a: [10, 9, 15, 8, 8], weapon: 'shortbow', armor: 'leather' }, Scholar: { a: [8, 7, 9, 14, 12], weapon: 'insight_of_arcane', armor: 'cloth' },
    Warrior: { a: [13, 15, 9, 7, 6], weapon: 'handaxe', armor: 'iron' }, Thief: { a: [9, 8, 16, 9, 8], weapon: 'dagger', armor: 'leather' },
    Hermit: { a: [10, 7, 9, 13, 11], weapon: 'insight_of_earth', armor: 'cloth' }, Farmer: { a: [15, 12, 9, 7, 7], weapon: 'scythe', armor: 'iron' },
    BountyHunter: { a: [12, 11, 14, 7, 6], weapon: 'shortsword', armor: 'leather' },
};
const ATTRS = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
const ARMOR = { leather: ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'], iron: ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'], cloth: ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'] };
const WEAPON_DUE = [1, 4, 9, 15, 22];
function buildCharacter(cls, level) {
    const attrs = {}; ATTRS.forEach((k, i) => attrs[k] = cls.a[i]);
    const w = {}; ATTRS.forEach((k, i) => w[k] = Math.max(0.3, cls.a[i] - 6) * (0.7 + Math.random() * 0.6)); w.vigor += 2;
    let wl = 1;
    for (let l = 2; l <= level; l++) {
        let spent = false;
        if (cls.weapon && wl < 5 && WEAPON_DUE[wl] <= l + 3) {
            for (const [k, need] of Object.entries(requirementsAt(cls.weapon, wl + 1))) if (attrs[k] < need) { attrs[k]++; spent = true; break; }
        }
        if (!spent) { const tot = ATTRS.reduce((s, k) => s + w[k], 0); let r = Math.random() * tot; for (const k of ATTRS) { r -= w[k]; if (r <= 0) { attrs[k]++; break; } } }
        if (cls.weapon) while (wl < 5 && WEAPON_DUE[wl] <= l && !Object.entries(requirementsAt(cls.weapon, wl + 1)).some(([k, n]) => attrs[k] < n)) wl++;
    }
    wl = Math.min(wl, WEAPON_CAP);   // WEAPON_CAP=3 for a party that hasn't forged steel yet (levels 4 and 5 need steel ingots)
    const equipment = {};
    if (cls.weapon) { const it = ItemFactory.createItem(cls.weapon); it.level = wl; equipment[it.slot === 'twoHand' ? 'twoHand' : 'mainHand'] = it; }
    const armorLevel = Math.min(5, 1 + Math.floor((level - 4) / 6));
    for (const id of ARMOR[cls.armor]) { const it = ItemFactory.createItem(id); if (it) { it.level = Math.min(armorLevel, it.maxLevel || 1); equipment[it.slot] = it; } }
    const e = EntityFactory.create('HUMANOID', { attributes: { ...attrs }, equipment, level, traits: [], levelEdge: false });
    Object.assign(e.state ? e.state.attributes : e.attributes, attrs);
    e.hp = e.maxHp; e.stamina = e.maxStamina; e.insight = e.maxInsight;
    return e;
}
const randomClass = () => Object.values(CLASSES)[Math.floor(Math.random() * Object.keys(CLASSES).length)];

// ---- the kraken, built as SceneManager builds it ----
const BOSS = process.env.BOSS || null;
function buildBoss(players) {
    const lvl = LEVEL + (ENTITY_DEFINITIONS[BOSS].tags.includes('BOSS') ? 0 : 0) + (players - 1) * PARTY_SCALING.LEVELS_PER_PLAYER + (process.env.ACT2 ? 1 : 0);
    const def = ENTITY_DEFINITIONS[BOSS];
    return [EntityFactory.create(BOSS, { level: lvl, baseStats: { ...def.baseStats, maxHpMultiplier: (def.baseStats.maxHpMultiplier || 1) * bossHpFactor(players) } })];
}
// knobs: headHp (maxHpMultiplier), tentacleHp (base maxHp), tentHpMult (the tentacles' maxHpMultiplier), headRes / tentRes (every resistance times this), headAtk / tentAtk (attack stats times this)
const scaleRes = (r, f) => (f === undefined ? r : Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v * f])));
const scaleAtk = (a, f) => (f === undefined ? a : Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v * f])));
function buildKraken(players) {
    const lvl = LEVEL + 1 + (players - 1) * PARTY_SCALING.LEVELS_PER_PLAYER;
    const def = ENTITY_DEFINITIONS.DRY_KRAKEN, b = def.baseStats;
    const head = EntityFactory.create('DRY_KRAKEN', { level: lvl, baseStats: { ...b, maxHpMultiplier: (K.headHp ?? b.maxHpMultiplier ?? 1) * bossHpFactor(players),
        baseResistance: scaleRes(b.baseResistance, K.headRes), baseAttack: scaleAtk(b.baseAttack, K.headAtk) } });
    const tb = ENTITY_DEFINITIONS.DRY_KRAKEN_TENTACLE.baseStats;
    const tentacles = Array.from({ length: 8 }, () => EntityFactory.create('DRY_KRAKEN_TENTACLE', { level: lvl, baseStats: { ...tb, maxHp: K.tentacleHp ?? tb.maxHp, maxHpMultiplier: (K.tentHpMult ?? tb.maxHpMultiplier ?? 1) * bossHpFactor(players),   // a boss's limbs scale with the players as it does
        baseResistance: scaleRes(tb.baseResistance, K.tentRes), baseAttack: scaleAtk(tb.baseAttack, K.tentAtk) } }));
    return [head, ...tentacles];
}

// ---- one fight, played by a strategy ----
const power = (a) => (a.effects || []).filter(e => e.type === 'damage').reduce((s, e) => s + (e.power || 1), 0) * Math.max(1, a.targeting?.count || (a.targeting?.select === 'all' ? 2 : 1));
function fight(players, strategy) {
    gameState.party.members = Array.from({ length: 3 * players }, () => buildCharacter(randomClass(), LEVEL));
    gameState.party.inventory.length = 0;
    const foes = BOSS ? buildBoss(players) : buildKraken(players);
    const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
    let ended = null;
    const off = events.on('BATTLE_ENDED', (e) => { ended = e; });
    // a fallen fighter's place: the first one still standing in reserve steps in (the player would pick)
    const offSwap = events.on('REQUEST_PARTY_SWAP', (req) => {
        const i = req.members.findIndex((m, idx) => !req.activeIndices.includes(idx) && m.hp > 0);
        setTimeout(() => {}, 0);
        req.callback(i >= 0 ? i : null);
    });
    bc.start(foes, { maxActive: 3 });
    const key = (code) => bc.handleKeyDown(code, { code });
    let rounds = 0, guard = 0, lastIdx = -1;
    while (bc.state.active && guard++ < 6000) {
        const s = bc.state;
        if (s.phase === 'SELECT_ACTION') {
            const c = s.activeParty[s.activePartyIndex];
            if (s.activePartyIndex <= lastIdx) rounds++;
            lastIdx = s.activePartyIndex;
            let best = -1, bestP = -1;
            c.abilities.forEach((a, i) => {
                if (!a.canPayCost || !a.canPayCost(c, InventorySystem)) return;
                if (a.isFlee && a.isFlee()) return;
                const scope = a.targeting?.scope;
                const p = scope === 'enemy' ? power(a) : 0;
                if (p > bestP) { bestP = p; best = i; }
            });
            if (best < 0) best = Math.max(0, c.abilities.findIndex(a => a.id === 'rest'));
            s.menuIndex = best;
            key('Enter');
        } else if (s.phase === 'SELECT_TARGET') {
            if (s.targetIndex !== 'ALL' && bc.targeting && bc.targeting.targetsFromGroup) {
                const pool = bc.targeting.targetsFromGroup();
                const living = pool.filter(t => t && !t.isDead());
                const head = living.find(t => t.templateId === 'DRY_KRAKEN');
                const tents = living.filter(t => t.templateId === 'DRY_KRAKEN_TENTACLE').sort((a, b) => a.hp - b.hp);
                // a move that hits several different targets: each pick a new one
                const taken = new Set(s.selectedTargets || []);
                const order = (strategy === 'head' ? [head, ...tents] : [...tents, head]).filter(t => t && !taken.has(t));
                const want = order[0] || living[0];
                const i = pool.indexOf(want);
                if (i >= 0) s.targetIndex = i;
            }
            key('Enter');
        } else bc.update(0.4);
    }
    off && off(); offSwap && offSwap();
    const party = bc.state.partyRoster || [];
    const alive = party.filter(p => !p.isDead()).length;
    const hpLeft = party.reduce((t, p) => t + Math.max(0, p.hp), 0) / party.reduce((t, p) => t + p.maxHp, 0);
    const cut = foes.slice(1).filter(t => t.hp <= 0).length;
    return { won: !!(ended && ended.victory), rounds, alive, of: party.length, hpLeft, cut, timedOut: guard >= 6000 };
}

out(`${BOSS || 'The Dry Kraken'} at level ${LEVEL} (${RUNS} fights each)${Object.keys(K).length ? ' with ' + JSON.stringify(K) : ''}`);
out('players  strategy    won   rounds  standing  party hp left  tentacles cut');
for (const players of [1, 2, 3]) for (const strategy of (BOSS ? ['head'] : ['head', 'tentacles'])) {
    const rs = Array.from({ length: RUNS }, () => fight(players, strategy));
    const avg = (f) => rs.reduce((t, r) => t + f(r), 0) / rs.length;
    out(`${String(players).padEnd(9)}${strategy.padEnd(12)}${(avg(r => r.won) * 100).toFixed(0).padStart(3)}%  ${avg(r => r.rounds).toFixed(1).padStart(6)}  ${avg(r => r.alive).toFixed(1).padStart(4)}/${rs[0].of}  ${(avg(r => r.hpLeft) * 100).toFixed(0).padStart(10)}%  ${avg(r => r.cut).toFixed(1).padStart(10)}${rs.some(r => r.timedOut) ? '  (some timed out)' : ''}`);
}

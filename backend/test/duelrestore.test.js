// backend/test/duelrestore.test.js: `npm test`. A duel between players is for nothing: everything about each party goes back exactly as it was
// before it (characters' health, corruption, status effects, gear, levels; the inventory, purse and recipes; the hotbar, buffs and quests), and it
// is fought in the challenger's biome background and weather, the same on both screens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { events } from '../../shared/core/eventBus.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { WeatherFactory } from '../../shared/world/weatherFactory.js';
import { multiplayerSocial } from '../../frontend/src/engine/multiplayerSocial.js';
import { multiplayerSession } from '../../frontend/src/engine/multiplayerSession.js';
import { multiplayer } from '../../frontend/src/engine/multiplayerClient.js';
import { serializeEntity } from '../../frontend/src/engine/saveManager.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };

function setUpParty() {
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Hero', level: 7 }));
    const dog = quiet(() => EntityFactory.create('DOG', { name: 'Rex', level: 6 }));
    hero.state.baseStats.corruption = 12;
    hero.hp = Math.max(1, hero.maxHp - 5);
    hero.applyStatusEffect(StatusEffectFactory.createEffect('poison', 3, null));
    gameState.party.members.splice(0, gameState.party.members.length, hero, dog);
    gameState.party.inventory.splice(0, gameState.party.inventory.length, ItemFactory.createItem('healing_tonic', { qty: 3 }), ItemFactory.createItem('torch', { qty: 2 }));
    gameState.party.currency = 250;
    gameState.party.unlockedCraftingRecipes = ['bandage'];
    gameState.player.hotbar = ['healing_tonic', null];
    gameState.player.buffs = { camouflage: { until: 999 } };
    gameState.quests = { active: { q1: { progress: 1 } }, completed: [], trackedIds: ['q1'] };
}

test('everything a duel can touch comes back exactly as it was', () => {
    setUpParty();
    const before = JSON.stringify({ members: gameState.party.members.map(serializeEntity), inv: gameState.party.inventory.map(i => i.toJSON()), currency: gameState.party.currency,
        recipes: gameState.party.unlockedCraftingRecipes, hotbar: gameState.player.hotbar, buffs: gameState.player.buffs, quests: gameState.quests });
    multiplayerSocial.duelBackup = multiplayerSocial._duelSnapshot();
    // the duel: hurt, corrupted, cured, items drunk, gold and buffs gone, a quest moved on, a fighter fallen
    const hero = gameState.party.members[0];
    hero.hp = 1; hero.state.baseStats.corruption = 60; hero.state.statusEffects.length = 0;
    hero.applyStatusEffect(StatusEffectFactory.createEffect('bleed', 2, null));
    gameState.party.members[1].hp = 0;
    gameState.party.inventory.splice(0, 1);
    gameState.party.currency = 0;
    gameState.party.unlockedCraftingRecipes.push('anything');
    gameState.player.hotbar = [null, null];
    gameState.player.buffs = {};
    gameState.quests.active.q1.progress = 9;
    assert.equal(multiplayerSocial.battleEnded({ kind: 'duel', bid: 'b' }), true);
    const after = JSON.stringify({ members: gameState.party.members.map(serializeEntity), inv: gameState.party.inventory.map(i => i.toJSON()), currency: gameState.party.currency,
        recipes: gameState.party.unlockedCraftingRecipes, hotbar: gameState.player.hotbar, buffs: gameState.player.buffs, quests: gameState.quests });
    assert.equal(after, before);
    assert.equal(multiplayerSocial.duelBackup, null);
    assert.equal(multiplayerSocial.battleEnded({ kind: 'party', bid: 'c' }), false, 'a party fight is not undone');
});

test('leaving the world in the middle of a duel undoes it before the last save is sent', () => {
    setUpParty();
    multiplayerSocial.wire();
    multiplayerSocial.duelBackup = multiplayerSocial._duelSnapshot();
    gameState.party.currency = 0;
    multiplayerSession.beforeLeave();
    assert.equal(gameState.party.currency, 250);
});

test("a duel is fought in the challenger's biome background and weather, on both screens", () => {
    setUpParty();
    const realYou = multiplayer.you, realSend = multiplayerSocial._send;
    const realEnv = multiplayerSession.env;
    const sent = [];
    multiplayer.you = { id: 'me' };
    multiplayerSocial._send = (m, to) => sent.push({ m, to });
    multiplayerSession.env = { getWorldManager: () => ({ getBiomeAt: () => ({ getBattleBackground: () => 'desertBattleBg' }) }) };
    gameState.world.currentWeather = WeatherFactory.createWeather('RAIN');
    let started = null;
    const on = (d) => { started = d; };
    events.on('MP_START_BATTLE', on);
    try {
        multiplayerSocial._startDuel('them', gameState.party.members.map(serializeEntity));
        const spec = sent.find(s => s.m.k === 'bt_start').m.spec;
        assert.equal(spec.background, 'desertBattleBg');
        assert.equal(spec.weather.id, gameState.world.currentWeather.id);
        assert.equal(started.context.backgroundId, 'desertBattleBg');
        assert.equal(started.context.weather.id, gameState.world.currentWeather.id, 'my screen fights in it');
    } finally {
        events.off && events.off('MP_START_BATTLE', on);
        multiplayer.you = realYou; multiplayerSocial._send = realSend; multiplayerSession.env = realEnv;
        multiplayerSocial.battle = null; multiplayerSocial.duelBackup = null;
        gameState.world.currentWeather = null;
    }
});

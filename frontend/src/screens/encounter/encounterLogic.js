import { gameState } from "../../../../shared/core/gameState.js";
import { events } from "../../../../shared/core/eventBus.js";
import { InventorySystem } from "../../../../shared/items/inventorySystem.js";
import { PartyManager } from "../../../../shared/characters/partyManager.js";
import { ExperienceSystem } from '../../../../shared/characters/experienceSystem.js';
import { EncounterFactory } from "../../../../shared/story/encounterFactory.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/core/constants.js';
import { LootTableFactory } from "../../../../shared/items/lootTableFactory.js";
import { SpawnTableFactory } from "../../../../shared/battle/spawnTableFactory.js";
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { ActSystem } from '../../../../shared/story/actSystem.js';
import { EntityFactory } from '../../../../shared/characters/entityFactory.js';
import { CorruptionSystem } from '../../../../shared/characters/corruptionSystem.js';
import { rng, withoutSeed } from '../../../../shared/core/random.js';
import { multiplayerSocial } from '../../engine/multiplayerSocial.js';

/* A party of several players in one encounter (EncounterController, engine/multiplayerSocial.js): every member's browser plays it with the
   same dice, so the results here are cut to each player's part. The leader's lead character is the one who rolls and the one an
   "active_character" result is about, so those (and starting a fight, a recruit, a shop, the XP for a roll, an object taken off the map)
   happen on the leader's browser only. Found items go one at a time to a player picked by the dice; found coin is split evenly. */
const LEADER_ONLY = new Set(['DESTROY_OBJECT', 'START_BATTLE', 'RECRUIT_CHARACTER', 'OPEN_SHOP', 'ADVANCE_TIME', 'REMOVE_ITEM', 'TRIGGER_GAME_OVER']);
const ABOUT_THE_ROLLER = new Set(['ADD_TRAIT', 'REMOVE_TRAIT', 'MODIFY_CORRUPTION', 'MODIFY_VITALS', 'APPLY_STATUS_EFFECT', 'TAKE_DAMAGE', 'AWARD_XP']);
/* Whether this browser leaves a result to someone else. The active character (the one who rolls: any character in the party's line-up, the
   leader's lead to begin with, see EncounterController's switch) belongs to one player: what happens to them happens on that player's
   browser. What happens to the "entire_party" happens to every player's own party (XP included). The rest is the leader's. */
function notMine(type, payload) {
    const s = EncounterLogic.shared;
    if (ABOUT_THE_ROLLER.has(type)) return payload.target === 'entire_party' ? false : !EncounterLogic.isActiveOwner();
    if (LEADER_ONLY.has(type)) return !s.isLeader;
    if (type === 'MODIFY_CURRENCY') return (payload.amount || 0) < 0 && !s.isLeader;   // a price or a theft is the leader's
    return false;
}

// The plains battle track is what encounter definitions name for "an ordinary fight". It stands in for the music of the biome the party is in
// (the cave's battle track in a cave, the desert's in the desert...). Tracks made for one scene (a boss, a creature's theme) are played as named.
const GENERIC_BATTLE_BGM = 'plainsBattleBgm';

export class EncounterLogic {
    /** The battle track to play for `bgmId`: the biome's own when `bgmId` is the generic one, else `bgmId` untouched. */
    static resolveBattleBgm(bgmId, worldManager) {
        if (bgmId !== GENERIC_BATTLE_BGM || !worldManager || !gameState.player) return bgmId;
        const biome = worldManager.getBiomeAt(gameState.player.col, gameState.player.row);
        return (biome && biome.getMusic && biome.getMusic(0, true)) || bgmId;
    }

    /** The music of the stage on screen, when it is a real track (a stage may also call for 'none', silence): the battle that starts from it keeps it. */
    static stageBattleBgm(model) {
        const bgm = model && model.getBgm ? model.getBgm() : null;
        return bgm && bgm !== 'none' ? bgm : null;
    }

    static checkConditions(decision, context = {}) {
        if (!decision || !decision.conditions) return true;
        return decision.conditions.every(cond => {
            switch (cond.type) {
                case "has_other_party_members":
                    // a shared encounter: anyone else in the party's line-up (another player's character counts)
                    if (EncounterLogic.shared && EncounterLogic.shared.lineupSize) return EncounterLogic.shared.lineupSize > 1;
                    return gameState.party?.members?.length > 1;
                case "has_item":
                    return InventorySystem.hasItem(cond.itemId, cond.qty || 1);
                case "has_currency":
                    return (gameState.party?.currency || 0) >= (cond.amount || 0);
                case "context_flag_set":
                    return !!context[cond.flagId];
                case "context_flag_not_set":
                    return !context[cond.flagId];
                // The acts (story/actDefinitions.js): a choice that only exists once the world has got harder, or only before
                case "act_at_least":
                    return ActSystem.getAct() >= (cond.act || 1);
                case "act_below":
                    return ActSystem.getAct() < (cond.act || 1);
                case "has_milestone":
                    return ActSystem.hasMilestone(cond.id);
                case "lacks_milestone":
                    return !ActSystem.hasMilestone(cond.id);
                case "has_tag":
                case "has_trait": {
                    const activeCharacter = EncounterLogic.rollerEntity();
                    if (!activeCharacter) return false;
                    const targetTag = cond.tag || cond.traitId;
                    const hasTrait = activeCharacter.traits?.includes(targetTag);
                    const hasTag = activeCharacter.tags?.includes(targetTag);
                    return hasTrait || hasTag;
                }
                case "has_any_trait": {
                    const activeCharacter = EncounterLogic.rollerEntity();
                    return !!(activeCharacter && activeCharacter.traits && activeCharacter.traits.length > 0);
                }
                default:
                    console.warn(`[EncounterLogic] Unknown condition type '${cond.type}'; treating as met.`);
                    return true;
            }
        });
    }

    /* Set while a party of players shares an encounter: { players: [ids], me, isLeader, roller: the active character's attributes (sent with each
       choice), active: { owner, idx, entity }: the line-up character the encounter is about } */
    static shared = null;

    /** How many of `qty` found items this player keeps (each to one player of the party, by the shared dice). */
    static _keepOf(qty) {
        const s = EncounterLogic.shared;
        if (!s || !s.players || s.players.length < 2) return qty;
        let kept = 0;
        for (let i = 0; i < qty; i++) if (s.players[Math.floor(rng() * s.players.length)] === s.me) kept++;
        return kept;
    }

    /** This player's part of `amount` found coin: an even split, the odd coins to one player by the dice. */
    static _coinOf(amount) {
        const s = EncounterLogic.shared;
        if (!s || !s.players || s.players.length < 2 || amount <= 0) return amount;
        const each = Math.floor(amount / s.players.length);
        const odd = s.players[Math.floor(rng() * s.players.length)];
        return each + (odd === s.me ? amount - each * s.players.length : 0);
    }

    /** The character the encounter is about (who rolls, whose portrait shows): in a shared encounter the line-up's active character, on
     *  every screen; otherwise the party's lead. */
    static rollerEntity() {
        const s = EncounterLogic.shared;
        return (s && s.active && s.active.entity) || gameState.party?.members?.[0] || null;
    }

    /** Is the active character one of mine? (always, outside a shared encounter) */
    static isActiveOwner() {
        const s = EncounterLogic.shared;
        return !s || !s.active || s.active.owner === s.me;
    }

    /** The active character in MY party, for the results about them; null when they are another player's (their browser applies those). */
    static activeMember() {
        const s = EncounterLogic.shared;
        if (!s || !s.active) return gameState.party?.members?.[0] || null;
        return s.active.owner === s.me ? (gameState.party?.members?.[s.active.idx] || null) : null;
    }

    static calculateRoll(decision) {
        const roller = EncounterLogic.rollerEntity();
        const attributes = (EncounterLogic.shared && EncounterLogic.shared.roller) || roller?.attributes || {};
        const difficulty = gameState.difficulty || 'normal';
        const globalConfig = DIFFICULTY_MODIFIERS[difficulty] || { rollBonus: 0 };
        const difficultyRollMod = globalConfig.rollBonus || 0;
        
        let appliedAttributeBonus = 0;
        if (decision.attribute && decision.attribute !== 'none') {
            const statValue = attributes[decision.attribute] || 0;
            const attributeBonus = Math.floor((statValue - 10) / 3);
            appliedAttributeBonus = attributeBonus;
            if (difficulty === 'easy' || difficulty === 'normal') {
                appliedAttributeBonus = Math.max(0, attributeBonus);
            }
        }
        
        const finalAppliedMod = appliedAttributeBonus + difficultyRollMod;
        let finalizedNightmareMod = finalAppliedMod;
        if (difficulty === 'nightmare' && finalAppliedMod > 0) {
            finalizedNightmareMod = Math.floor(finalAppliedMod / 2);
        }
        
        const d20 = Math.floor(rng() * 20) + 1;
        const total = d20 + finalizedNightmareMod;
        
        return {
            d20, mod: finalizedNightmareMod, total, dc: decision.threshold || 0,
            isSuccess: total >= (decision.threshold || 0), displayVal: "?", duration: 1.5
        };
    }

    /** The XP a successful roll earns the one who rolled (party leader), as an AWARD_XP result; null when it is worth nothing (DC 0) */
    static rollXpResult(dc) {
        const roller = EncounterLogic.rollerEntity();
        const amount = ExperienceSystem.rollXp(roller?.level || 1, dc);
        return amount > 0 ? { type: "AWARD_XP", payload: { amount, exact: true, target: "active_character" } } : null;
    }

    static selectOutcome(outcomes) {
        if (!outcomes || outcomes.length === 0) return null;
        const totalWeight = outcomes.reduce((sum, outcome) => sum + (outcome.weight || 1), 0);
        let roll = rng() * totalWeight;
        let selectedOutcome = null;
        
        for (const outcome of outcomes) {
            roll -= (outcome.weight || 1);
            if (roll <= 0) {
                selectedOutcome = outcome;
                break;
            }
        }
        return selectedOutcome || outcomes[0];
    }

   static resolveResults(resultsArray, model, worldManager) {
        const response = {
            messages: [],
            shouldEndEncounter: false,
            endEncounterPayload: null,
            modelChanged: false,
            newModel: null,
            stageChanged: false,
            newStageId: null,
            isGameOver: false,
            forceCharacterSwitch: false,
            isOpeningShop: false,
            shopId: null,
            wares: [], 
            returnScene: 'encounter', // <--- ADD THIS HERE!
            messageItems: {}   // message text -> [{id, qty}]: the items a reward message lists, so the screen can show their pictures
        };
        
        if (!resultsArray) return response;
        
        // Group the messages to allow sequenced reward screens
        let itemsFound = [];
        let itemsFoundData = [];   // the same items as {id, qty}
        let xpEarned = [];
        let levelsGained = [];
        let currencyFound = [];
        let traitsGained = [];
        let traitsLost = [];
        let statusEffects = [];
        let questsStarted = []; // Array to collect started quests
        let generalMessages = [];
        
        resultsArray.forEach(result => {
            const type = result.type;
            const payload = result.payload || {};
            if (EncounterLogic.shared && notMine(type, payload)) return;
            
            switch (type) {
                case "RECORD_KILL":
                    events.emit('ENEMY_KILLED', { 
                        enemyId: payload.enemyId, 
                        amount: payload.amount || 1 
                    });
                    break;
                case "GRANT_MILESTONE":
                    // A turning point of the game (story/actDefinitions.js): granting it moves the world into its next act
                    if (payload.id) ActSystem.grantMilestone(payload.id);
                    break;
                case "SET_CONTEXT_FLAG":
                    if (!model.context) model.context = {};
                    model.context[payload.flagId] = payload.value !== undefined ? payload.value : true;
                    break;
                case "ADVANCE_STAGE":
                    response.stageChanged = true;
                    response.newStageId = payload.stageId;
                    break;
                case "CHANGE_ENCOUNTER":
                    response.modelChanged = true;
                    response.newModel = EncounterFactory.create(payload.encounterId, model.context, payload.stageId);
                    break;
                case "END_ENCOUNTER":
                    response.shouldEndEncounter = true;
                    response.endEncounterPayload = payload;
                    break;
                case "DESTROY_OBJECT":
                    const ctx = model.context;
                    if (ctx && ctx.col !== undefined && ctx.row !== undefined) {
                        worldManager.modifyWorld(ctx.col, ctx.row, null, ctx.mapId);
                    }
                    break;
                case "GIVE_ITEM":
                    let itemsToGive = [];
                    if (payload.items && Array.isArray(payload.items)) {
                        itemsToGive = [...payload.items];
                    } else if (payload.itemId) {
                        itemsToGive.push({ id: payload.itemId, qty: payload.qty || 1 });
                    }
                    itemsToGive.forEach(item => {
                        const qty = item.id ? EncounterLogic._keepOf(item.qty || 1) : 0;
                        if (item.id && qty > 0) {
                            InventorySystem.addItem(item.id, qty);
                            const formattedName = item.id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            itemsFound.push(`${formattedName} x${qty}`);
                            itemsFoundData.push({ id: item.id, qty });
                        }
                    });
                    break;
                case "START_QUEST":
                    if (payload.questId) {
                        // QuestSystem starts it (it listens for START_QUEST). A quest the party already has, or has finished, is not
                        // started again and is not announced again.
                        const questLog = gameState.quests || {};
                        const alreadyKnown = !!(questLog.active && questLog.active[payload.questId])
                            || (Array.isArray(questLog.completed) && questLog.completed.includes(payload.questId));
                        if (!alreadyKnown) {
                            events.emit('START_QUEST', { questId: payload.questId });
                            const questName = payload.questName || payload.questId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            questsStarted.push(`New Quest: ${questName}`);
                        }
                    }
                    break;
                case "ROLL_LOOT_TABLE":
                    if (payload.lootTableId) {
                        let actualTableId = payload.lootTableId;
                        if (actualTableId === "biome_default") {
                            const context = model.context || {};
                            const col = context.col !== undefined ? context.col : (gameState.player?.col || 0);
                            const row = context.row !== undefined ? context.row : (gameState.player?.row || 0);
                            const biome = worldManager.getBiomeAt(col, row);
                            if (biome && biome.defaultLootTable) {
                                actualTableId = biome.defaultLootTable;
                            } else {
                                console.warn(`No defaultLootTable found for biome at ${col},${row}.`);
                            }
                        }
                        let computedRolls = payload.rolls || 1;
                        if (payload.minRolls !== undefined && payload.maxRolls !== undefined) {
                            computedRolls = Math.floor(rng() * (payload.maxRolls - payload.minRolls + 1)) + payload.minRolls;
                        }
                        const lootModel = LootTableFactory.generateLoot(actualTableId, computedRolls, payload.baseCurrency || 0, payload.exclude);
                        if (lootModel.hasItems()) {
                            lootModel.items.forEach(item => {
                                const qty = EncounterLogic._keepOf(item.qty);
                                if (qty <= 0) return;
                                InventorySystem.addItem(item.id, qty);
                                const formattedName = item.id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                itemsFound.push(`${formattedName} x${qty}`);
                                itemsFoundData.push({ id: item.id, qty });
                            });
                        }
                        if (lootModel.hasCurrency()) {
                            if (typeof gameState.party.currency === 'undefined') {
                                gameState.party.currency = 0;
                            }
                            const coin = EncounterLogic._coinOf(lootModel.currency);
                            gameState.party.currency += coin;
                            if (coin > 0) currencyFound.push(coin === lootModel.currency ? `Found ${coin} currency!` : `Found ${lootModel.currency} currency: your share is ${coin}.`);
                        }
                    }
                    break;
                case "REMOVE_ITEM":
                    InventorySystem.removeItem(payload.itemId, payload.qty || 1);
                    break;
                case "AWARD_XP":
                    const xpBase = payload.amount || 0;
                    if (xpBase <= 0) break;
                    // the amounts are written for the early game: they grow with the level like an enemy's XP does (ExperienceSystem.scaleReward)
                    if (payload.target === "entire_party") {
                        const xpAmount = payload.exact ? Math.round(xpBase) : ExperienceSystem.scaleReward(xpBase, PartyManager.getHighestLevel());
                        gameState.party?.members?.forEach(m => {
                            if (ExperienceSystem.addXp(m, xpAmount)) {
                                levelsGained.push(`${m.name} hit Lvl ${m.level}!`);
                            }
                        });
                        xpEarned.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const active = EncounterLogic.activeMember();
                        if (active) {
                            const xpAmount = payload.exact ? Math.round(xpBase) : ExperienceSystem.scaleReward(xpBase, active.level);
                            if (ExperienceSystem.addXp(active, xpAmount)) {
                                levelsGained.push(`${active.name} hit Lvl ${active.level}!`);
                            }
                            xpEarned.push(`${active.name} gained ${xpAmount} XP.`);
                        }
                    }
                    break;
               case "MODIFY_CURRENCY": {
                    if (typeof gameState.party.currency === 'undefined') gameState.party.currency = 0;

                    const amount = payload.amount || 0;
                    const purse = Math.max(0, gameState.party.currency);

                    if (amount >= 0) {
                        const coin = EncounterLogic._coinOf(amount);
                        gameState.party.currency = purse + coin;
                        if (coin > 0) currencyFound.push(coin === amount ? `Found ${coin} currency!` : `Found ${amount} currency: your share is ${coin}.`);
                        break;
                    }

                    // A loss takes only what the party actually has, and the message reports what was really taken.
                    const demand = -amount;
                    const taken = Math.min(purse, demand);
                    gameState.party.currency = purse - taken;
                    const shortfall = demand - taken;
                    const lines = [];
                    if (taken > 0) lines.push(`Lost ${taken} currency!`);

                    // Optional (payload.stealItemOnShortfall): when the purse can't cover it, take the item whose value is
                    // closest to what is missing. Equipped gear isn't in the inventory, so it is never touched.
                    if (shortfall > 0 && payload.stealItemOnShortfall) {
                        const stealable = (gameState.party.inventory || []).filter(it => {
                            const id = it && (it.defId ?? (it.definition && it.definition.id));
                            const def = id && ItemDefinitions[id];
                            return def && (it.qty || 1) > 0 && !def.questItem && !def.unstealable;
                        });
                        if (stealable.length > 0) {
                            const idOf = (it) => it.defId ?? it.definition.id;
                            const gap = (it) => Math.abs((ItemDefinitions[idOf(it)].value || 0) - shortfall);
                            const best = Math.min(...stealable.map(gap));
                            const closest = stealable.filter(it => gap(it) === best);
                            const pickId = idOf(closest[Math.floor(Math.random() * closest.length)]);
                            InventorySystem.removeItem(pickId, 1);
                            const pickName = ItemDefinitions[pickId].name || pickId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            lines.push(`Lost ${pickName} x1!`);
                        }
                    }
                    if (lines.length === 0) lines.push("There was nothing to take.");
                    generalMessages.push(lines.join('\n'));
                    break;
                }
                case "MODIFY_VITALS":
                    const targetMembers = payload.target === "entire_party" ? (gameState.party?.members || []) : [EncounterLogic.activeMember()].filter(Boolean);
                    targetMembers.forEach(char => {
                        let hpChange = payload.hp || 0;
                        let stamChange = payload.stamina || 0;
                        let insightChange = payload.insight || 0;
                        let isPct = payload.isPercentage || false;
                        
                        // `isPercentageOfMax: true` -- hp / stamina / insight are percentages of the character's MAX (PartyManager.modifyVitals does the sum): hp 50 heals half of their max HP
                        if (payload.isPercentageOfMax) {
                            isPct = true;
                        } else if (payload.isPercentageOfCurrent || isPct) {
                            hpChange = Math.floor(char.hp * (hpChange / 100));
                            stamChange = Math.floor(char.stamina * (stamChange / 100));
                            insightChange = Math.floor((char.insight || 0) * (insightChange / 100));
                            isPct = false;
                        }
                        PartyManager.modifyVitals(char, hpChange, stamChange, insightChange, payload.damageType || 'true', isPct, payload.bypassDefense || false);
                    });
                    break;
                case "APPLY_STATUS_EFFECT": {
                    const effectTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [EncounterLogic.activeMember()].filter(Boolean);
                    effectTargets.forEach(char => {
                        PartyManager.applyStatusEffect(char, payload.effectId, payload.charges);
                        const effectName = (payload.effectId || "a status effect").replace(/_/g, ' ');
                        statusEffects.push(`${char.name} was afflicted with ${effectName}!`);
                    });
                    break;
                }
                case "ADD_TRAIT": {
                    const traitTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [EncounterLogic.activeMember()].filter(Boolean);
                    traitTargets.forEach(char => {
                        const alreadyHasTrait = char.traits && char.traits.includes(payload.traitId);
                        if (char.addTrait && !alreadyHasTrait) {
                            char.addTrait(payload.traitId);
                            const formattedTraitName = payload.traitId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            traitsGained.push(`${char.name} developed the trait: ${formattedTraitName}!`);
                        }
                    });
                    break;
                }
                case "REMOVE_TRAIT": {
                    const removeTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [EncounterLogic.activeMember()].filter(Boolean);
                    removeTargets.forEach(char => {
                        // { all: true } (or traitId "all") strips every trait the character has
                        if (payload.all || payload.traitId === "all") {
                            const toRemove = [...(char.traits || [])];
                            if (char.removeTrait && toRemove.length > 0) {
                                toRemove.forEach(id => char.removeTrait(id));
                                traitsLost.push(`${char.name} has been stripped of every trait.`);
                            }
                            return;
                        }
                        const hasTrait = char.traits && char.traits.includes(payload.traitId);
                        if (char.removeTrait && hasTrait) {
                            char.removeTrait(payload.traitId);
                            const formattedTraitName = payload.traitId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            traitsLost.push(`${char.name} lost the trait: ${formattedTraitName}.`);
                        }
                    });
                    break;
                }
                case "START_BATTLE": {
                    let enemyList = Array.isArray(payload.enemies) ? [...payload.enemies] : [];
                    let betrayal = null;
                    // `betrayer: true`: the shackled member this encounter is about (model.context.betrayerIndex) leaves the party for good and is the enemy
                    // (shackled_betrayal.js). They fight at full health in whatever they still wear.
                    // In a party of players it can be another player's companion (context.betrayerOwner): the leader rebuilds them as the enemy and the
                    // owner's browser lets them go when the fight starts (multiplayerSocial._beginBattle). Nobody can run from a betrayal.
                    if (payload.betrayer) {
                        const members = gameState.party?.members || [];
                        const owner = model.context?.betrayerOwner;
                        let turned;
                        if (owner && owner !== multiplayerSocial.me) {
                            turned = multiplayerSocial.takeBetrayer(owner, model.context.betrayerIndex);
                            if (turned) betrayal = { owner, idx: model.context.betrayerIndex };
                        } else {
                            const named = members[model.context?.betrayerIndex];
                            turned = CorruptionSystem.turnAgainstParty(named && CorruptionSystem.isShackled(named) ? named : CorruptionSystem.pickBetrayer());
                        }
                        if (!turned) {
                            generalMessages.push("The chains hang still. Whatever stirred is gone.");
                            break;
                        }
                        model.updateContext({ betrayerName: turned.name });
                        enemyList.push(turned);
                    }
                    const currentDifficulty = payload.difficulty || gameState.difficulty || 'normal';
                    if (payload.tableId) {
                        const spawnModel = SpawnTableFactory.generateBattle(payload.tableId, currentDifficulty, multiplayerSocial.partySize());
                        if (spawnModel && spawnModel.hasEnemies()) {
                            enemyList = [...enemyList, ...spawnModel.enemies];
                        }
                    }
                    let battleBgAsset = payload.background;
                    if (!battleBgAsset) {
                        const currentHour = gameState.world?.time ? gameState.world.time / 60 : 12;
                        const context = model.context || {};
                        const col = context.col !== undefined ? context.col : (gameState.player?.col || 0);
                        const row = context.row !== undefined ? context.row : (gameState.player?.row || 0);
                        const biome = worldManager.getBiomeAt(col, row);
                        battleBgAsset = biome ? biome.getBattleBackground(currentHour) : 'default';
                    }
                    events.emit('START_BATTLE', {
                        enemies: enemyList, tableId: payload.tableId || null, difficulty: currentDifficulty,
                        background: battleBgAsset, weather: gameState.world?.currentWeather || 'clear',
                        context: model.context, bgm: EncounterLogic.resolveBattleBgm(payload.bgm || EncounterLogic.stageBattleBgm(model) || GENERIC_BATTLE_BGM, worldManager),   // the fight's own track, else the music already playing on the stage that led here (so it carries into the battle unbroken), else the biome's battle music
                        // `afterVictory: { encounterId }` plays that encounter when the fight is won, before the overworld (the end of Darius)
                        afterVictory: payload.afterVictory || null,
                        noEscape: !!(payload.betrayer || payload.noEscape), betrayal,
                    });
                    break;
                }
                case "RECRUIT_CHARACTER": {
                    // A creature or person who joins the party: { entityId, overrides }. (This handler went missing in the encounter refactor, so
                    // every recruit -- the mutt, the snow leopard, the legionary, the madman -- silently did nothing.) The newcomer arrives rested,
                    // loses the enemy-only level edge, joins at the party's average level (PartyManager.recruit), and the player is told; a full party (6)
                    // leaves them behind.
                    const recruit = PartyManager.recruit(payload.entityId, payload.overrides || {});
                    if (recruit) {
                        generalMessages.push(`${recruit.name} joined your party at level ${recruit.level}!`);
                    } else {
                        generalMessages.push(`Your party is full. There is no room for another companion.`);
                    }
                    break;
                }
                case "ADVANCE_TIME":
                    if (gameState.world && typeof gameState.world.time !== 'undefined') {
                        const minutesToAdvance = (payload.hours || 0) * 60 + (payload.minutes || 0);
                        gameState.world.time += minutesToAdvance;
                        while (gameState.world.time >= (24 * 60)) {
                            gameState.world.time -= (24 * 60);
                            gameState.world.day = (gameState.world.day || 1) + 1;
                        }
                        if (gameState.world.currentWeather) {
                            gameState.world.currentWeather.timeRemaining -= (minutesToAdvance / 60);
                        }
                        if (payload.hours) {
                            response.messages.push(`${payload.hours} hours have passed.`);
                        } else if (payload.minutes) {
                            response.messages.push(`${payload.minutes} minutes have passed.`);
                        }
                    }
                    break;
                case "TAKE_DAMAGE":
                    events.emit("TAKE_DAMAGE", payload);
                    break;
                case "MODIFY_CORRUPTION": {
                    // { amount, target: 'active_character' (the leader, the default) | 'entire_party' }: cruel or magical choices add, kind ones take away (CorruptionSystem).
                    // Reaching the top shackles the character (down, like a fainted one): another member steps to the front, and with nobody left standing it is the end.
                    const members = gameState.party?.members || [];
                    const targets = payload.target === 'entire_party' ? [...members] : [EncounterLogic.activeMember()].filter(Boolean);
                    targets.filter(Boolean).forEach(char => {
                        const change = CorruptionSystem.change(char, payload.amount || 0);
                        // Until the story reveals corruption (act 2) it builds quietly: nothing is said about it
                        if (CorruptionSystem.isRevealed()) {
                            if (change.amount > 0) generalMessages.push(`${char.name} feels the darkness take hold. (Corruption +${change.amount}%)`);
                            else if (change.amount < 0) generalMessages.push(`${char.name} feels a weight lift. (Corruption ${change.amount}%)`);
                        }
                        change.messages.forEach(line => generalMessages.push(line));
                        if (change.shackled) {
                            PartyManager.ensureLivingLeader();
                            if (!members.some(m => m.hp > 0)) response.isGameOver = true;
                        }
                    });
                    break;
                }

              case "OPEN_SHOP":
                response.isOpeningShop = true;
                response.shopId = payload.shopId;
                response.encounterInstanceId = model.instanceId;
                // We generate the wares from the loot table every time the outcome is rolled.
                // We NO LONGER cache this in model.context.shopWares. 
                // ShopLogic will use the encounterInstanceId to ignore these new rolls 
                // if the player is just re-opening the shop during the same visit.
                let resolvedWares = payload.wares ? [...payload.wares] : [];
                
                if (payload.lootTableId) {
                    const rolls = payload.rolls || 5;
                    // a shop's wares are the leader's alone: rolled off the shared dice, so the others' dice stay in step
                    const lootModel = withoutSeed(() => LootTableFactory.generateLoot(payload.lootTableId, rolls));
                    if (lootModel.hasItems()) {
                        const generatedWares = lootModel.items.map(item => ({
                            id: item.id,
                            qty: item.qty
                        }));
                        resolvedWares = [...resolvedWares, ...generatedWares];
                    }
                }
                
                response.wares = resolvedWares;
                break;
                default:
                    events.emit(type, payload);
                    break;
            }
        });
        
        // Grouping the collected messages sequentially
        if (generalMessages.length > 0) response.messages.push(...generalMessages);
        if (statusEffects.length > 0) response.messages.push(statusEffects.join('\n'));
        if (xpEarned.length > 0) response.messages.push(xpEarned.join('\n'));
        if (levelsGained.length > 0) response.messages.push(levelsGained.join('\n'));
        if (traitsGained.length > 0) response.messages.push(traitsGained.join('\n'));
        if (traitsLost.length > 0) response.messages.push(traitsLost.join('\n'));
        if (questsStarted.length > 0) response.messages.push(questsStarted.join('\n'));
        if (itemsFound.length > 0) {
            const itemsMessage = `Obtained Items:\n` + itemsFound.join('\n');
            response.messages.push(itemsMessage);
            response.messageItems[itemsMessage] = itemsFoundData;
        }
        if (currencyFound.length > 0) response.messages.push(currencyFound.join('\n'));
        
        return response;
    }
}
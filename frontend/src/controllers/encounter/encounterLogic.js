import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { InventorySystem } from "../../../../shared/systems/inventorySystem.js";
import { PartyManager } from "../../../../shared/systems/partyManager.js";
import { ExperienceSystem } from '../../../../shared/systems/experienceSystem.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';
import { LootTableFactory } from "../../../../shared/systems/factories/lootTableFactory.js";
import { SpawnTableFactory } from "../../../../shared/systems/factories/spawnTableFactory.js";

export class EncounterLogic {
    static checkConditions(decision, context = {}) {
        if (!decision || !decision.conditions) return true;
        return decision.conditions.every(cond => {
            switch (cond.type) {
                case "has_other_party_members":
                    return gameState.party?.members?.length > 1;
                case "has_item":
                    return InventorySystem.hasItem(cond.itemId, cond.qty || 1);
                case "context_flag_set":
                    return !!context[cond.flagId];
                case "context_flag_not_set":
                    return !context[cond.flagId];
                case "has_tag":
                case "has_trait": {
                    const activeCharacter = gameState.party?.members?.[0];
                    if (!activeCharacter) return false;
                    const targetTag = cond.tag || cond.traitId;
                    const hasTrait = activeCharacter.traits?.includes(targetTag);
                    const hasTag = activeCharacter.tags?.includes(targetTag);
                    return hasTrait || hasTag;
                }
                default:
                    return true;
            }
        });
    }

    static calculateRoll(decision) {
        const roller = gameState.party.members[0];
        const attributes = roller?.attributes || {};
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
        
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + finalizedNightmareMod;
        
        return {
            d20, mod: finalizedNightmareMod, total, dc: decision.threshold || 0,
            isSuccess: total >= (decision.threshold || 0), displayVal: "?", duration: 1.5
        };
    }

    static selectOutcome(outcomes) {
        if (!outcomes || outcomes.length === 0) return null;
        const totalWeight = outcomes.reduce((sum, outcome) => sum + (outcome.weight || 1), 0);
        let roll = Math.random() * totalWeight;
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
            returnScene: 'encounter' // <--- ADD THIS HERE!
        };
        
        if (!resultsArray) return response;
        
        // Group the messages to allow sequenced reward screens
        let itemsFound = [];
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
            
            switch (type) {
                case "RECORD_KILL":
                    events.emit('ENEMY_KILLED', { 
                        enemyId: payload.enemyId, 
                        amount: payload.amount || 1 
                    });
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
                        if (item.id) {
                            InventorySystem.addItem(item.id, item.qty || 1);
                            const formattedName = item.id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            itemsFound.push(`${formattedName} x${item.qty || 1}`);
                        }
                    });
                    break;
                case "START_QUEST":
                    if (payload.questId) {
                        events.emit('START_QUEST', { questId: payload.questId });
                        const questName = payload.questName || payload.questId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        questsStarted.push(`New Quest: ${questName}`);
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
                            computedRolls = Math.floor(Math.random() * (payload.maxRolls - payload.minRolls + 1)) + payload.minRolls;
                        }
                        const lootModel = LootTableFactory.generateLoot(actualTableId, computedRolls, payload.baseCurrency || 0);
                        if (lootModel.hasItems()) {
                            lootModel.items.forEach(item => {
                                InventorySystem.addItem(item.id, item.qty);
                                const formattedName = item.id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                itemsFound.push(`${formattedName} x${item.qty}`);
                            });
                        }
                        if (lootModel.hasCurrency()) {
                            if (typeof gameState.party.currency === 'undefined') {
                                gameState.party.currency = 0;
                            }
                            gameState.party.currency += lootModel.currency;
                            currencyFound.push(`Found ${lootModel.currency} currency!`);
                        }
                    }
                    break;
                case "REMOVE_ITEM":
                    InventorySystem.removeItem(payload.itemId, payload.qty || 1);
                    break;
                case "AWARD_XP":
                    const xpAmount = payload.amount || 0;
                    if (xpAmount <= 0) break;
                    if (payload.target === "entire_party") {
                        gameState.party?.members?.forEach(m => {
                            if (ExperienceSystem.addXp(m, xpAmount)) {
                                levelsGained.push(`${m.name} hit Lvl ${m.level}!`);
                            }
                        });
                        xpEarned.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const active = gameState.party?.members?.[0];
                        if (active) {
                            if (ExperienceSystem.addXp(active, xpAmount)) {
                                levelsGained.push(`${active.name} hit Lvl ${active.level}!`);
                            }
                            xpEarned.push(`${active.name} gained ${xpAmount} XP.`);
                        }
                    }
                    break;
               case "MODIFY_CURRENCY":
                    if (typeof gameState.party.currency === 'undefined') gameState.party.currency = 0;
                    
                    const amount = payload.amount || 0;
                    const startingCurrency = gameState.party.currency;
                    
                    // Apply the change
                    gameState.party.currency += amount;
                    
                    // Prevent currency from dropping below zero
                    if (gameState.party.currency < 0) gameState.party.currency = 0;
                    
                    // Calculate exactly how much actually changed
                    const amountChanged = Math.abs(gameState.party.currency - startingCurrency);
                    
                    // Notify the player of the gain or loss
                    if (amount > 0) {
                        currencyFound.push(`Found ${amountChanged} currency!`);
                    } else if (amount < 0 && amountChanged > 0) {
                        generalMessages.push(`Lost ${amountChanged} currency!`);
                    }
                    break;
                case "MODIFY_VITALS":
                    const targetMembers = payload.target === "entire_party" ? (gameState.party?.members || []) : [gameState.party?.members?.[0]].filter(Boolean);
                    targetMembers.forEach(char => {
                        let hpChange = payload.hp || 0;
                        let stamChange = payload.stamina || 0;
                        let insightChange = payload.insight || 0;
                        let isPct = payload.isPercentage || false;
                        
                        if (payload.isPercentageOfCurrent || isPct) {
                            hpChange = Math.floor(char.hp * (hpChange / 100));
                            stamChange = Math.floor(char.stamina * (stamChange / 100));
                            insightChange = Math.floor((char.insight || 0) * (insightChange / 100));
                            isPct = false;
                        }
                        PartyManager.modifyVitals(char, hpChange, stamChange, insightChange, payload.damageType || 'true', isPct, payload.bypassDefense || false);
                    });
                    break;
                case "APPLY_STATUS_EFFECT": {
                    const effectTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [gameState.party?.members?.[0]].filter(Boolean);
                    effectTargets.forEach(char => {
                        PartyManager.applyStatusEffect(char, payload.effectId, payload.charges);
                        const effectName = (payload.effectId || "a status effect").replace(/_/g, ' ');
                        statusEffects.push(`${char.name} was afflicted with ${effectName}!`);
                    });
                    break;
                }
                case "ADD_TRAIT": {
                    const traitTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [gameState.party?.members?.[0]].filter(Boolean);
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
                    const removeTargets = payload.target === "entire_party" ? (gameState.party?.members || []) : [gameState.party?.members?.[0]].filter(Boolean);
                    removeTargets.forEach(char => {
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
                    const currentDifficulty = payload.difficulty || gameState.difficulty || 'normal';
                    if (payload.tableId) {
                        const spawnModel = SpawnTableFactory.generateBattle(payload.tableId, currentDifficulty);
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
                        context: model.context, bgm: payload.bgm || null
                    });
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
                    const lootModel = LootTableFactory.generateLoot(payload.lootTableId, rolls);
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
        if (itemsFound.length > 0) response.messages.push(`Obtained Items:\n` + itemsFound.join('\n'));
        if (currencyFound.length > 0) response.messages.push(currencyFound.join('\n'));
        
        return response;
    }
}
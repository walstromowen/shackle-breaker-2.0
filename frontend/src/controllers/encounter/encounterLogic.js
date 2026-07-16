// ui/overworld/encounter/encounterLogic.js
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { InventorySystem } from "../../../../shared/systems/inventorySystem.js";
import { PartyManager } from "../../../../shared/systems/partyManager.js";
import { ExperienceSystem } from '../../../../shared/systems/experienceSystem.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';
import { LootTableFactory } from "../../../../shared/systems/factories/lootTableFactory.js";

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
            d20,
            mod: finalizedNightmareMod,
            total,
            dc: decision.threshold || 0,
            isSuccess: total >= (decision.threshold || 0),
            displayVal: "?",
            duration: 3.5
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
            forceCharacterSwitch: false
        };

        if (!resultsArray) return response;

        resultsArray.forEach(result => {
            const type = result.type;
            const payload = result.payload || {};

            switch (type) {
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
                            const formattedName = item.id
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                            response.messages.push(`Obtained ${formattedName} x${item.qty || 1}`);
                        }
                    });
                    break;
                case "ROLL_LOOT_TABLE":
                    if (payload.lootTableId) {
                        let computedRolls = payload.rolls || 1;
                        if (payload.minRolls !== undefined && payload.maxRolls !== undefined) {
                            computedRolls = Math.floor(Math.random() * (payload.maxRolls - payload.minRolls + 1)) + payload.minRolls;
                        }
                        const lootModel = LootTableFactory.generateLoot(
                            payload.lootTableId,
                            computedRolls,
                            payload.baseCurrency || 0
                        );
                        if (lootModel.hasItems()) {
                            lootModel.items.forEach(item => {
                                InventorySystem.addItem(item.id, item.qty);
                                const formattedName = item.id
                                    .split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                                response.messages.push(`Obtained ${formattedName} x${item.qty}`);
                            });
                        }
                        if (lootModel.hasCurrency()) {
                            if (typeof gameState.party.currency === 'undefined') {
                                gameState.party.currency = 0;
                            }
                            gameState.party.currency += lootModel.currency;
                            response.messages.push(`Found ${lootModel.currency} currency!`);
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
                                response.messages.push(`${m.name} hit Lvl ${m.level}!`);
                            }
                        });
                        response.messages.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const active = gameState.party?.members?.[0];
                        if (active) {
                            if (ExperienceSystem.addXp(active, xpAmount)) {
                                response.messages.push(`${active.name} hit Lvl ${active.level}!`);
                            }
                            response.messages.push(`${active.name} gained ${xpAmount} XP.`);
                        }
                    }
                    break;
                case "MODIFY_CURRENCY":
                    if (typeof gameState.party.currency === 'undefined') gameState.party.currency = 0;
                    gameState.party.currency += (payload.amount || 0);
                    if (gameState.party.currency < 0) gameState.party.currency = 0;
                    if ((payload.amount || 0) > 0) response.messages.push(`Found ${payload.amount} currency!`);
                    break;
                case "MODIFY_VITALS":
                    const targetMembers = payload.target === "entire_party"
                        ? (gameState.party?.members || [])
                        : [gameState.party?.members?.[0]].filter(Boolean);

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
                        PartyManager.modifyVitals(
                            char,
                            hpChange,
                            stamChange,
                            insightChange,
                            payload.damageType || 'true',
                            isPct,
                            payload.bypassDefense || false
                        );
                    });
                    break;
                case "APPLY_STATUS_EFFECT": {
                    const effectTargets = payload.target === "entire_party" 
                        ? (gameState.party?.members || []) 
                        : [gameState.party?.members?.[0]].filter(Boolean);
                    
                    effectTargets.forEach(char => {
                        // Use your existing PartyManager method to handle the factory and application
                        PartyManager.applyStatusEffect(char, payload.effectId, payload.charges);
                        
                        // Generate the UI message so the player knows what happened
                        const effectName = (payload.effectId || "a status effect").replace(/_/g, ' ');
                        response.messages.push(`${char.name} was afflicted with ${effectName}!`);
                    });
                    break;
                
                }
                case "START_BATTLE":
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
                        enemies: payload.enemies || [],
                        background: battleBgAsset,
                        weather: gameState.world?.currentWeather || 'clear',
                        context: model.context,
                        bgm: payload.bgm || null
                    });
                    break;
                case "TAKE_DAMAGE":
                    events.emit("TAKE_DAMAGE", payload);
                    break;
                case "RECRUIT_CHARACTER":
                    const newCharacter = PartyManager.addMember(payload.entityId, payload.overrides);
                    if (newCharacter) {
                        newCharacter.hp = newCharacter.maxHp;
                        newCharacter.stamina = newCharacter.maxStamina;
                        events.emit('CHARACTER_RECRUITED', { character: newCharacter });
                    }
                    break;
                case "ADVANCE_TIME":
                    if (gameState.world && typeof gameState.world.time !== 'undefined') {
                        const minutesToAdvance = (payload.hours || 0) * 60 + (payload.minutes || 0);
                        gameState.world.time += minutesToAdvance;

                        // Handle day rollovers (in case they rest through midnight)
                        while (gameState.world.time >= (24 * 60)) {
                            gameState.world.time -= (24 * 60);
                            gameState.world.day = (gameState.world.day || 1) + 1;
                        }

                        // Fast-forward weather timers so TimeSystem rerolls it on the next frame if needed
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
                default:
                    events.emit(type, payload);
                    break;
            }
        });

        // 🌟 Post-process check for dead party members
        const members = gameState.party?.members || [];
        if (members.length > 0) {
            const hasLivingMembers = members.some(m => m.hp > 0);
            if (!hasLivingMembers) {
                response.isGameOver = true;
            } else if (members[0].hp <= 0) {
                response.forceCharacterSwitch = true;
            }
        }
        return response;
    }
}
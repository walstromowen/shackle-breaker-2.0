// ui/overworld/encounter/encounterLogic.js
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { InventorySystem } from "../../../../shared/systems/inventorySystem.js";
import { PartyManager } from "../../../../shared/systems/partyManager.js";
import { ExperienceSystem } from '../../../../shared/systems/experienceSystem.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';

export class EncounterLogic {
    static calculateRoll(decision) {
        const roller = gameState.party.members[0];
        const attributes = roller?.attributes || {};
        const statValue = attributes[decision.attribute] || 0;
        const difficulty = gameState.difficulty || 'normal';
        const globalConfig = DIFFICULTY_MODIFIERS[difficulty] || { rollBonus: 0 };
        const difficultyRollMod = globalConfig.rollBonus || 0;
        const attributeBonus = Math.floor((statValue - 10) / 3);
        let appliedAttributeBonus = attributeBonus;
        if (difficulty === 'easy' || difficulty === 'normal') {
            appliedAttributeBonus = Math.max(0, attributeBonus);
        }
        const finalAppliedMod = appliedAttributeBonus + difficultyRollMod;
        let finalizedNightmareMod = finalAppliedMod;
        if (difficulty === 'nightmare' && finalAppliedMod > 0) {
            finalizedNightmareMod = Math.floor(finalAppliedMod / 2);
        }
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + finalizedNightmareMod;
        return { d20, mod: finalizedNightmareMod, total, dc: decision.threshold || 0, isSuccess: total >= (decision.threshold || 0), displayVal: "?", duration: 3.5 };
    }

    static selectOutcome(outcomes) {
        if (!outcomes || outcomes.length === 0) return null;
        const totalWeight = outcomes.reduce((sum, outcome) => sum + (outcome.weight || 1), 0);
        let roll = Math.random() * totalWeight;
        let selectedOutcome = null;
        for (const outcome of outcomes) {
            roll -= (outcome.weight || 1);
            if (roll <= 0) { selectedOutcome = outcome; break; }
        }
        return selectedOutcome || outcomes[0];
    }

    static resolveResults(resultsArray, model, worldManager) {
        const response = { messages: [], shouldEndEncounter: false, endEncounterPayload: null, modelChanged: false, newModel: null, stageChanged: false, newStageId: null };
        if (!resultsArray) return response;

        resultsArray.forEach(result => {
            const type = result.type;
            const payload = result.payload || {};
            
            switch (type) {
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
                    InventorySystem.addItem(payload.itemId, payload.qty || 1);
                    response.messages.push(`Obtained ${payload.itemId.replace(/_/g, ' ')} x${payload.qty || 1}`);
                    break;
                case "REMOVE_ITEM":
                    InventorySystem.removeItem(payload.itemId, payload.qty || 1);
                    break;
                case "AWARD_XP":
                    const xpAmount = payload.amount || 0;
                    if (xpAmount <= 0) break;
                    if (payload.target === "entire_party") {
                        gameState.party?.members?.forEach(m => { if (ExperienceSystem.addXp(m, xpAmount)) response.messages.push(`${m.name} hit Lvl ${m.level}!`); });
                        response.messages.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const active = gameState.party?.members?.[0];
                        if (active) {
                            if (ExperienceSystem.addXp(active, xpAmount)) response.messages.push(`${active.name} hit Lvl ${active.level}!`);
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
                    const activeChar = gameState.party?.members?.[0];
                    if (activeChar) PartyManager.modifyVitals(activeChar, payload.hp || 0, payload.stamina || 0, payload.insight || 0, payload.damageType || 'true', payload.isPercentage || false, payload.bypassDefense || false);
                    break;
                    
                // 🎵 SCENARIO 3: Pass Battle BGM from payload cleanly directly to Event Bus
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

                    // Send data to the combat engine
                    events.emit('START_BATTLE', {
                        enemies: payload.enemies || [],
                        background: battleBgAsset,
                        weather: gameState.world?.currentWeather || 'clear',
                        context: model.context,
                        bgm: payload.bgm || null // 🛑 Strict rule: ONLY use what's explicitly inside the payload!
                    });
                    break;
                case "TAKE_DAMAGE": events.emit("TAKE_DAMAGE", payload); break;
                case "RECRUIT_CHARACTER":
                    const newCharacter = PartyManager.addMember(payload.entityId, payload.overrides);
                    if (newCharacter) {
                        newCharacter.hp = newCharacter.maxHp; newCharacter.stamina = newCharacter.maxStamina;
                        events.emit('CHARACTER_RECRUITED', { character: newCharacter });
                    }
                    break;
                default: events.emit(type, payload); break;
            }
        });
        return response;
    }
}
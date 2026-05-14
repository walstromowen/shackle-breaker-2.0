// ui/overworld/encounter/encounterLogic.js
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { InventorySystem } from "../../../../shared/systems/inventorySystem.js";
import { PartyManager } from "../../../../shared/systems/partyManager.js";
import { EntityFactory } from '../../../../shared/systems/factories/entityFactory.js';
import { ExperienceSystem } from '../../../../shared/systems/experienceSystem.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';

export class EncounterLogic {
    
    /**
     * Calculates all modifiers and the final result of a dice roll.
     */
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
        
        return {
            d20: d20,
            mod: finalizedNightmareMod,
            total: total,
            dc: decision.threshold || 0,
            isSuccess: total >= (decision.threshold || 0),
            displayVal: "?",
            duration: 3.5
        };
    }

    /**
     * Determines which outcome occurs based on defined weights.
     */
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

    /**
     * Processes the results array and modifies game state accordingly.
     * Returns a state object so the controller knows if it needs to update visuals.
     */
    static resolveResults(resultsArray, model, worldManager) {
        const response = {
            messages: [],
            shouldEndEncounter: false,
            endEncounterPayload: null,
            modelChanged: false,
            newModel: null,
            stageChanged: false,
            newStageId: null
        };

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
                        worldManager.modifyWorld(ctx.col, ctx.row, null);
                    }
                    break;
                    
                case "GIVE_ITEM":
                    InventorySystem.addItem(payload.itemId, payload.qty || 1);
                    const readableName = payload.itemId.replace(/_/g, ' ');
                    response.messages.push(`Obtained ${readableName} x${payload.qty || 1}`);
                    break;
                    
                case "REMOVE_ITEM":
                    InventorySystem.removeItem(payload.itemId, payload.qty || 1);
                    break;
                    
                case "AWARD_XP":
                    const xpAmount = payload.amount || 0;
                    const xpTarget = payload.target || "active_character";
                    if (xpAmount <= 0) break;
                    
                    if (xpTarget === "entire_party") {
                        gameState.party?.members?.forEach(member => {
                            if (ExperienceSystem.addXp(member, xpAmount)) {
                                response.messages.push(`${member.name} reached Level ${member.level}!`);
                            }
                        });
                        response.messages.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const activeCharacter = gameState.party?.members?.[0];
                        if (activeCharacter) {
                            if (ExperienceSystem.addXp(activeCharacter, xpAmount)) {
                                response.messages.push(`${activeCharacter.name} reached Level ${activeCharacter.level}!`);
                            }
                            response.messages.push(`${activeCharacter.name} gained ${xpAmount} XP.`);
                        }
                    }
                    break;
                    
                case "MODIFY_CURRENCY":
                    const currencyAmount = payload.amount || 0;
                    if (typeof gameState.party.currency === 'undefined') {
                        gameState.party.currency = 0;
                    }
                    gameState.party.currency += currencyAmount;
                    if (gameState.party.currency < 0) gameState.party.currency = 0;
                    
                    if (currencyAmount > 0) response.messages.push(`Found ${currencyAmount} currency!`);
                    else if (currencyAmount < 0) response.messages.push(`Lost ${Math.abs(currencyAmount)} currency.`);
                    break;
                    
                case "MODIFY_VITALS":
                    const activeChar = gameState.party?.members?.[0];
                    if (activeChar) {
                        PartyManager.modifyVitals(
                            activeChar, payload.hp || 0, payload.stamina || 0, payload.insight || 0, 
                            payload.damageType || 'true', payload.isPercentage || false, payload.bypassDefense || false
                        );
                    }
                    break;
                    
                case "START_BATTLE":
                    let battleBgAsset = payload.background;
                    
                    // Resolve background if not explicitly provided
                    if (!battleBgAsset) {
                        const currentHour = gameState.world?.time ? gameState.world.time / 60 : 12;
                        const context = model.context || {};
                        const col = context.col !== undefined ? context.col : (gameState.player?.col || 0);
                        const row = context.row !== undefined ? context.row : (gameState.player?.row || 0);
                        const biome = worldManager.getBiomeAt(col, row);
                        
                        battleBgAsset = biome ? biome.getBattleBackground(currentHour) : 'default';
                    }

                    // ✅ Just pass the raw enemies payload directly to the SceneManager!
                    // The SceneManager will handle all the scaling and EntityFactory logic.
                    events.emit('START_BATTLE', { 
                        enemies: payload.enemies || [], 
                        background: battleBgAsset, 
                        weather: gameState.world?.currentWeather || 'clear', 
                        context: model.context 
                    });
                    break;
                    
                case "TAKE_DAMAGE":
                    events.emit("TAKE_DAMAGE", payload);
                    break;
                    
                case "APPLY_STATUS_EFFECT":
                    const effectId = payload.effectId;
                    const customCharges = payload.charges || null;
                    const targetType = payload.target || "active_character";
                    
                    if (!effectId) {
                        console.warn("[Encounter] APPLY_STATUS_EFFECT missing effectId.");
                        break;
                    }
                    if (targetType === "entire_party") {
                        gameState.party?.members?.forEach(member => {
                            PartyManager.applyStatusEffect(member, effectId, customCharges);
                        });
                    } else {
                        const activeCharacter = gameState.party?.members?.[0];
                        if (activeCharacter) {
                            PartyManager.applyStatusEffect(activeCharacter, effectId, customCharges);
                        }
                    }
                    break;
                    
                case "RECRUIT_CHARACTER":
                    const newCharacter = PartyManager.addMember(payload.entityId, payload.overrides);
                    if (newCharacter) {
                        newCharacter.hp = newCharacter.maxHp;
                        newCharacter.stamina = newCharacter.maxStamina;
                        events.emit('CHARACTER_RECRUITED', { character: newCharacter });
                    }
                    break;
                    
                default:
                    events.emit(type, payload);
                    break;
            }
        });

        return response;
    }
}
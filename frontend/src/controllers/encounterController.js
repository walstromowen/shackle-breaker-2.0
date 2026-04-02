import { EncounterFactory } from "../../../shared/systems/factories/encounterFactory.js";
import { gameState } from "../../../shared/state/gameState.js";
import { events } from "../core/eventBus.js"; 
import { InventorySystem } from "../../../shared/systems/inventorySystem.js"; 
import { PartyManager } from "../../../shared/systems/partyManager.js";
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { ExperienceSystem } from '../../../shared/systems/experienceSystem.js';

export class EncounterController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager;
        
        this.model = null;
        this.selectedIndex = 0;

        // Action State Variables
        this.actionPhase = 'none'; // 'none', 'message', 'wait_for_roll', 'rolling', 'hold_base', 'apply_mod', 'result'
        this.pendingDecision = null; 
        this.actionMessage = "";
        
        // Dice Timers and Data
        this.rollTimer = 0;
        this.rollTickTimer = 0; 
        this.rollData = { displayVal: "?", d20: 0, mod: 0, total: 0, dc: 0, isSuccess: false, duration: 3.5 };

        // GameLoop-Synced Animation Tracking
        this.lastText = ""; 
        this.textTimer = 0; 
        this.skipMessageAnimation = false;
       
        this.updateBGM();
    }

    start(encounterId, context = {}) {
        this.model = EncounterFactory.create(encounterId, context);
        
        if (!this.model) {
            console.error(`[Encounter] Failed to create model for ID '${encounterId}'.`);
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        this.selectedIndex = 0;
        this.actionPhase = 'none';
        this.pendingDecision = null;
        this.actionMessage = "";
        this.rollTimer = 0;
        
        this.lastText = ""; 
        this.textTimer = 0; 
        this.skipMessageAnimation = false;
        console.log(`[Encounter] Started: ${this.model.id}`);

        this.updateBGM();
    }

    update(dt) {
        if (!this.model) return;
        this.textTimer += dt;

        if (this.actionPhase === 'message') {
            const charsPerSecond = 45;
            const totalTypingTime = this.actionMessage.length * (1 / charsPerSecond);

            if (this.skipMessageAnimation || this.textTimer >= (totalTypingTime + 2.0)) {
                this.skipMessageAnimation = false; 
                
                if (this.pendingDecision && this.pendingDecision.type === 'skill_check') {
                    this.setupRollData(this.pendingDecision);
                    this.actionPhase = 'wait_for_roll';
                } else {
                    this.resolveAction();
                }
            }
        } 
        else if (this.actionPhase === 'rolling') {
            this.rollTimer -= dt;
            this.rollTickTimer -= dt;
            
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                // Phase 1 finished: Hold on the base d20
                this.rollData.displayVal = this.rollData.d20; 
                this.actionPhase = 'hold_base';
                this.rollTimer = 1.5; // Hold for 1.5 seconds
                this.skipMessageAnimation = false;

                events.emit('PLAY_SFX', { id: 'dice_land', volume: 0.7 });

            } else if (this.rollTickTimer <= 0) {
                this.rollData.displayVal = Math.floor(Math.random() * 20) + 1;
                
                const progress = 1.0 - (this.rollTimer / this.rollData.duration);
                this.rollTickTimer = 0.015 + (Math.pow(progress, 6) * 1.2); 

                events.emit('PLAY_SFX', { 
                    id: 'diceTick', 
                    volume: 0.3, 
                    pitch: 0.9 + (Math.random() * 0.2) 
                });
            }
        }
        else if (this.actionPhase === 'hold_base') {
            this.rollTimer -= dt;
            
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                // Phase 2 finished: Begin animating the modifier
                this.actionPhase = 'apply_mod';
                this.rollTimer = 2.0; // Animate modifier over 2 seconds
                this.skipMessageAnimation = false;
            }
        }
        else if (this.actionPhase === 'apply_mod') {
            this.rollTimer -= dt;
            
            // Calculate progress (0.0 to 1.0) and apply partial modifier
            const duration = 2.0; 
            let progress = 1.0 - (this.rollTimer / duration);
            progress = Math.min(Math.max(progress, 0), 1); 
            
            const currentMod = Math.round(this.rollData.mod * progress);
            this.rollData.displayVal = this.rollData.d20 + currentMod;

            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                // Phase 3 finished: Show final total and trigger result phase
                this.rollData.displayVal = this.rollData.total; 
                this.actionPhase = 'result';
                this.rollTimer = 2.0; 
                this.skipMessageAnimation = false;
            }
        }
        else if (this.actionPhase === 'result') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.resolveAction();
            }
        }
    }

    handleKeyDown(key) {
        if (!this.model) return; 

        const charsPerSecond = 45;
        const totalTypingTime = this.lastText.length * (1 / charsPerSecond);
        const isAnimatingText = this.textTimer < (totalTypingTime + 2.0);

        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result'];

        if (skipPhases.includes(this.actionPhase) || isAnimatingText) {
            if (key === "Enter" || key === "Space") {
                this.skipMessageAnimation = true; 
                this.textTimer = totalTypingTime + 2.0; 
            }
            return; 
        }

        if (this.actionPhase === 'wait_for_roll') {
            if (key === "Enter" || key === "Space") {
                this.triggerRoll();
            }
            return; 
        }

        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;

        if (key === "Escape") {
             this.endEncounter(); 
             return;
        } 

        if (key === "ArrowUp" || key === "KeyW") {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
            events.emit('PLAY_SFX', { id: 'ui_hover', volume: 0.4 });
        } 
        else if (key === "ArrowDown" || key === "KeyS") {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
            events.emit('PLAY_SFX', { id: 'ui_hover', volume: 0.4 });
        } 
        else if (key === "Enter" || key === "Space") {
            this.executeSelectedDecision();
        }
    }

    executeSelectedDecision() {
        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;

        events.emit('PLAY_SFX', { id: 'ui_select', volume: 0.6 });
        
        const selectedDecision = options[this.selectedIndex];
        
        // Switch to Party Screen via Callback Pattern
        if (selectedDecision.type === 'switch_character') {
            events.emit('CHANGE_SCENE', { 
                scene: 'party',
                data: {
                    mode: 'ENCOUNTER_SELECT',
                    activeIndices: [0], 
                    callback: (chosenIndex) => {
                        if (chosenIndex !== null && chosenIndex >= 0 && chosenIndex < gameState.party.members.length) {
                            const party = gameState.party.members;
                            const selectedMember = party.splice(chosenIndex, 1)[0];
                            party.unshift(selectedMember);
                            
                            this.selectedIndex = 0;
                        }
                    }
                }
            });
        } else {
            this.beginActionSequence(selectedDecision);
        }
    }
    
    triggerRoll() {
        this.actionPhase = 'rolling';
        this.rollTimer = this.rollData.duration;
        this.rollTickTimer = 0; 
        events.emit('PLAY_SFX', { id: 'dice_throw', volume: 0.8 });
    }

    beginActionSequence(decision) {
        if (!decision) return;

        this.pendingDecision = decision;
        this.actionPhase = 'message';
        this.textTimer = 0; 
        this.skipMessageAnimation = false;
        
        // Ensure party members exist before accessing
        const actorName = gameState.party?.members?.[0]?.name || "The party"; 
        
        // --- NEW LOGIC: Check for custom text first ---
        if (decision.customActionText) {
             // Replace '{name}' with the active character's name
             this.actionMessage = decision.customActionText.replace(/{name}/g, actorName);
        } 
        // --- FALLBACK LOGIC ---
        else {
             // Strips out bracketed DC tags and generates standard text for all decision types
             const cleanText = decision.text.replace(/\[.*?\]/g, '').trim().toLowerCase();
             // FIX: Replace {name} in the fallback string
             this.actionMessage = `${actorName} decides to ${cleanText.replace(/{name}/g, actorName)}...`;
        }

        this.lastText = this.actionMessage; 
    }

    setupRollData(decision) {
        const roller = gameState.party.members[0];
        const attributes = roller?.attributes || {};
        const statValue = attributes[decision.attribute] || 0; 
        
        const modifier = statValue > 10 ? Math.floor((statValue - 10) / 3) : 0;
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + modifier;
        
        this.rollData = {
            d20: d20,
            mod: modifier,
            total: total,
            dc: decision.threshold || 0,
            isSuccess: total >= (decision.threshold || 0),
            displayVal: "?", 
            duration: 3.5
        };
    }

    resolveAction() {
        this.actionPhase = 'none';
        const decision = this.pendingDecision;
        this.pendingDecision = null;
        
        if (!decision) return;

        if (decision.type === 'skill_check') {
            if (this.rollData.isSuccess) {
                events.emit('PLAY_SFX', { id: 'skill_success', volume: 0.7 });
            } else {
                events.emit('PLAY_SFX', { id: 'skill_failure', volume: 0.7 });
            }

            this.model.updateContext({
                roll_stat: decision.attribute?.toUpperCase() || "UNKNOWN",
                roll_d20: this.rollData.d20,
                roll_mod: this.rollData.mod,
                roll_total: this.rollData.total,
                roll_dc: this.rollData.dc,
                roll_result: this.rollData.isSuccess ? "SUCCESS" : "FAILED"
            });
            const targetOutcomes = this.rollData.isSuccess ? decision.successOutcomes : decision.failureOutcomes;
            this.processOutcomes(targetOutcomes);
        } else {
            this.processOutcomes(decision.outcomes);
        }
    }

    processOutcomes(outcomes) {
        if (!outcomes || outcomes.length === 0) return;

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

        if (!selectedOutcome) selectedOutcome = outcomes[0];
        this.resolveResults(selectedOutcome.results);
    }

    resolveResults(resultsArray) {
        if (!resultsArray) return;

        const messages = [];
        let shouldEndEncounter = false;
        let endEncounterPayload = null;

        resultsArray.forEach(result => {
            const type = result.type;
            const payload = result.payload || {};

            switch (type) {
                case "ADVANCE_STAGE":
                    this.model.advanceToStage(payload.stageId);
                    this.selectedIndex = 0;
                    this.updateBGM(); 
                    break;
                case "CHANGE_ENCOUNTER":
                    this.model = EncounterFactory.create(payload.encounterId, this.model.context, payload.stageId);
                    this.selectedIndex = 0;
                    this.updateBGM(); 
                    break;
                case "END_ENCOUNTER":
                    shouldEndEncounter = true;
                    endEncounterPayload = payload;
                    break;
                case "DESTROY_OBJECT":
                    const ctx = this.model.context;
                    if (ctx && ctx.col !== undefined && ctx.row !== undefined) {
                        this.worldManager.modifyWorld(ctx.col, ctx.row, null);
                    }
                    break;
                case "GIVE_ITEM":
                    InventorySystem.addItem(payload.itemId, payload.qty || 1);
                    const readableName = payload.itemId.replace(/_/g, ' ');
                    messages.push(`Obtained ${readableName} x${payload.qty || 1}`);
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
                                messages.push(`${member.name} reached Level ${member.level}!`);
                            }
                        });
                        messages.push(`The party gained ${xpAmount} XP.`);
                    } else {
                        const activeCharacter = gameState.party?.members?.[0];
                        if (activeCharacter) {
                            if (ExperienceSystem.addXp(activeCharacter, xpAmount)) {
                                messages.push(`${activeCharacter.name} reached Level ${activeCharacter.level}!`);
                            }
                            messages.push(`${activeCharacter.name} gained ${xpAmount} XP.`);
                        }
                    }
                    break;

                case "MODIFY_CURRENCY":
                    const currencyAmount = payload.amount || 0;
                    
                    if (typeof gameState.party.currency === 'undefined') {
                        gameState.party.currency = 0;
                    }

                    gameState.party.currency += currencyAmount;
                    
                    if (gameState.party.currency < 0) {
                        gameState.party.currency = 0;
                    }
                    
                    if (currencyAmount > 0) {
                        messages.push(`Found ${currencyAmount} currency!`);
                    } else if (currencyAmount < 0) {
                        messages.push(`Lost ${Math.abs(currencyAmount)} currency.`);
                    }
                    break;
                case "MODIFY_VITALS":
                    const activeCharacter = gameState.party?.members?.[0];
                    
                    if (activeCharacter) {
                        PartyManager.modifyVitals(
                            activeCharacter, 
                            payload.hp || 0, 
                            payload.stamina || 0,
                            payload.insight || 0, 
                            payload.damageType || 'true',
                            payload.isPercentage || false,
                            payload.bypassDefense || false 
                        );
                    }
                    break;
                case "START_BATTLE":
                    const rawEnemies = payload.enemies || [];
                    const enemyParty = rawEnemies.map((enemyId, index) => {
                        const enemyEntity = EntityFactory.create(enemyId);
                        enemyEntity.name = `${enemyEntity.name || enemyId} ${index + 1}`;
                        return enemyEntity;
                    });

                    let battleBgAsset = payload.background;

                    if (!battleBgAsset) {
                        const currentHour = gameState.world?.time ? gameState.world.time / 60 : 12;
                        
                        const context = this.model.context || {};
                        const col = context.col !== undefined ? context.col : (gameState.player?.col || 0);
                        const row = context.row !== undefined ? context.row : (gameState.player?.row || 0);
                        
                        const biome = this.worldManager.getBiomeAt(col, row);
                        
                        if (biome) {
                            battleBgAsset = biome.getBattleBackground(currentHour);
                        } else {
                            battleBgAsset = 'default'; 
                        }
                    }

                    events.emit('START_BATTLE', {
                        enemies: enemyParty, 
                        background: battleBgAsset,
                        weather: gameState.world?.currentWeather || 'clear',
                        context: this.model.context 
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
                        console.warn("[Encounter] APPLY_STATUS_EFFECT missing effectId in payload.");
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
                    } else {
                        console.log(`[Encounter] Could not recruit ${payload.entityId}, party full.`);
                    }
                    break;

                default:
                    events.emit(type, payload);
                    break;
            }
        });

        // --- NEW REWARD INTERCEPTOR ---
        if (messages.length > 0 && shouldEndEncounter) {
            const rewardText = messages.join('\n\n');
            
            // Ensure stages object exists on the model
            this.model.stages = this.model.stages || {};
            
            // Inject a dynamic stage into the model
            this.model.stages["encounter_rewards_stage"] = {
                imageId: this.model.getImageId ? this.model.getImageId() : null, // Retain the current background
                text: rewardText,
                decisions: [
                    { 
                        text: "Continue.", 
                        outcomes: [
                            { 
                                weight: 100, 
                                results: [{ type: "END_ENCOUNTER", payload: endEncounterPayload }] 
                            }
                        ] 
                    }
                ]
            };
            
            // Advance to our new dynamic stage instead of immediately closing
            this.model.advanceToStage("encounter_rewards_stage");
            this.selectedIndex = 0;
            return; // Abort the actual end sequence for now
        }

        // Standard exit
        if (shouldEndEncounter) {
            this.endEncounter(endEncounterPayload);
        }
    }

    endEncounter(payload = null) {
        events.emit('CHANGE_SCENE', { scene: 'overworld', data: payload });
    }

    cleanup() {
        this.model = null;
        this.pendingDecision = null;
    }

    updateBGM() {
        if (!this.model) return; 

        const targetBGM = this.model.getBgm ? this.model.getBgm() : null;
        if (targetBGM) {
            events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 });
        }
    }

    getState() {
        if (!this.model) {
            return { 
                imageId: null, 
                title: "", 
                text: "", 
                decisions: [], 
                ui: { selectedDecisionIndex: 0 }, 
                party: [], 
                currency: gameState.party?.currency || 0,
                skipMessageAnimation: false, 
                textTimer: 0, 
                actionPhase: 'none',
                rollTimer: 0,
                rollData: this.rollData
            };
        }

        let displayText = this.model.getCurrentText() || "";
        let displayDecisions = this.model.getAvailableDecisions() || [];

        // --- FIX: Grab actorName and replace {name} globally for UI elements ---
        const actorName = gameState.party?.members?.[0]?.name || "The party";
        
        displayText = displayText.replace(/{name}/g, actorName);
        
        displayDecisions = displayDecisions.map(decision => ({
            ...decision,
            text: decision.text.replace(/{name}/g, actorName)
        }));
        // -----------------------------------------------------------------------

        if (this.actionPhase !== 'none') {
            displayText = this.actionMessage; 
            displayDecisions = []; 
        }

        if (this.lastText !== displayText) {
            this.lastText = displayText;
            this.textTimer = 0; 
            this.skipMessageAnimation = false; 
        }

        return {
            title: this.model.title || "Unknown Encounter", 
            imageId: this.model.getImageId ? this.model.getImageId() : null,
            text: displayText, 
            decisions: displayDecisions,
            ui: { selectedDecisionIndex: this.selectedIndex },
            
            party: gameState.party?.members?.length > 0 ? [gameState.party.members[0]] : [], 
            currency: gameState.party?.currency || 0,
            
            skipMessageAnimation: this.skipMessageAnimation,
            textTimer: this.textTimer,
            actionPhase: this.actionPhase,
            rollTimer: this.rollTimer,
            rollData: this.rollData
        };
    }
}
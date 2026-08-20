import { BaseController } from '../core/baseController.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { EncounterLogic } from './encounterLogic.js';
import { QuestModel } from '../../../../shared/models/questModel.js';
import { QuestDefinitions } from '../../../../shared/data/questDefinitions.js';
import { LootTableFactory } from "../../../../shared/systems/factories/lootTableFactory.js";
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 'Tab': 'CANCEL'
};

export class EncounterController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.config = config;
        this.worldManager = worldManager;
        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('decision_list', { thumbIds: ['SCROLL_THUMB_DECISIONS'] });
        this.scrollManager.registerZone('text_content', { thumbIds: ['SCROLL_THUMB_TEXT'] });

        this.model = null;
        this.selectedIndex = 0;
        this.actionPhase = 'none';
        this.pendingDecision = null;
        this.pendingLogicResponse = null;
        this.actionMessage = "";
        this.rollTimer = 0;
        this.rollTickTimer = 0;
        this.rollData = { displayVal: "?", d20: 0, mod: 0, total: 0, dc: 0, isSuccess: false, duration: 2.5 };
        this.lastText = "";
        this.textTimer = 0;
        this.hasDoneIntro = false;
        this.skipMessageAnimation = false;
        this.inputCooldown = 0.15;
        this.imageTransition = { active: false, timer: 0, duration: 0.4, previousInfo: null, previousPartyMember: null };
        this.rewardQueue = [];
        this.pendingEndEncounterPayload = null;
        
        this.isUsingKeyboard = false;
        this._lastMouseX = null;
        this._lastMouseY = null;
        
        this.updateBGM();
    }

    start(encounterId, context = {}) {
        if (gameState.party && gameState.party.members && gameState.party.members.length > 0) {
            const members = gameState.party.members;
            if (members[0].hp <= 0) {
                const firstLivingIndex = members.findIndex(m => m.hp > 0);
                if (firstLivingIndex > 0) {
                    const livingMember = members.splice(firstLivingIndex, 1)[0];
                    members.unshift(livingMember);
                } else if (firstLivingIndex === -1) {
                    events.emit('CHANGE_SCENE', { scene: 'game_over' });
                    return;
                }
            }
        }
        this.model = EncounterFactory.create(encounterId, context);
        if (!this.model) {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }
        this.selectedIndex = 0;
        this.actionPhase = 'none';
        this.pendingDecision = null;
        this.pendingLogicResponse = null;
        this.actionMessage = "";
        this.rollTimer = 0;
        this.lastText = "";
        this.textTimer = 0;
        this.hasDoneIntro = false;
        this.skipMessageAnimation = false;
        this.inputCooldown = 0.15;
        this.rewardQueue = [];
        this.pendingEndEncounterPayload = null;
        this.imageTransition = { active: false, timer: 0, duration: 0.4, previousInfo: null, previousPartyMember: null };
        this.updateBGM();
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
        if (!hitboxId) return;
        if (hitboxId.startsWith('DECISION_')) {
            this.isUsingKeyboard = false;
            this._setFocus(hitboxId);
        }
    }

    update(dt) {
        if (super.update) super.update(dt);
        if (this.inputCooldown > 0) this.inputCooldown -= dt;
        this.scrollManager.update(dt);

        if (!this.model) return;

        this.textTimer += dt;
        if (this.textTimer >= 6.0) {
            this.hasDoneIntro = true;
        }

        if (this.imageTransition.active) {
            this.imageTransition.timer += dt;
            if (this.imageTransition.timer >= this.imageTransition.duration) {
                this.imageTransition.active = false;
                this.imageTransition.previousInfo = null;
                this.imageTransition.previousPartyMember = null;
                this.imageTransition.timer = this.imageTransition.duration;
            }
        }

        if (this.actionPhase === 'message') {
            const charsPerSecond = 25;
            const totalTypingTime = this.actionMessage.length * (1 / charsPerSecond);
            const padding = Math.max(0.8, Math.min(2.5, this.actionMessage.length * 0.02));
            if (this.skipMessageAnimation || this.textTimer >= (6.0 + totalTypingTime + padding)) {
                this.skipMessageAnimation = false;
                if (this.pendingDecision && this.pendingDecision.type === 'skill_check') {
                    this.rollData = EncounterLogic.calculateRoll(this.pendingDecision);
                    this.actionPhase = 'wait_for_roll';
                } else {
                    this.applySceneChanges();
                }
            }
        } else if (this.actionPhase === 'rolling') {
            this.rollTimer -= dt;
            this.rollTickTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.rollData.displayVal = this.rollData.d20;
                this.actionPhase = 'hold_base';
                this.rollTimer = 1.0;
                this.skipMessageAnimation = false;
                events.emit('PLAY_SFX', { id: 'dice_land', volume: 0.7 });
            } else if (this.rollTickTimer <= 0) {
                this.rollData.displayVal = Math.floor(Math.random() * 20) + 1;
                const progress = 1.0 - (this.rollTimer / this.rollData.duration);
                this.rollTickTimer = 0.04 + (Math.pow(progress, 6) * 1.2);
                events.emit('PLAY_SFX', { id: 'diceTick', volume: 0.3, pitch: 0.9 + (Math.random() * 0.2) });
            }
        } else if (this.actionPhase === 'hold_base') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.actionPhase = 'apply_mod';
                this.rollTimer = 2.5;
                this.skipMessageAnimation = false;
            }
        } else if (this.actionPhase === 'apply_mod') {
            this.rollTimer -= dt;
            let progress = Math.min(Math.max(1.0 - (this.rollTimer / 2.5), 0), 1);
            this.rollData.displayVal = this.rollData.d20 + Math.round(this.rollData.mod * progress);
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.rollData.displayVal = this.rollData.total;
                this.actionPhase = 'result';
                this.rollTimer = 3.5;
                this.skipMessageAnimation = false;
                this.executeLogic();
            }
        } else if (this.actionPhase === 'result') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.applySceneChanges();
            }
        } else if (this.actionPhase === 'reward_delay') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.skipMessageAnimation = false;
                this.showNextReward();
            }
        } else if (this.actionPhase === 'ending_delay') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.endEncounter(this.pendingDecision ? this.pendingDecision.payload : null);
            }
        }
    }

    _triggerImageTransition(duration = 0.4) {
        if (!this.model) return;
        const outgoingInfo = this.model.getImage ? this.model.getImage() : null;
        const outgoingMember = gameState.party?.members?.[0] || null;
        
        this.imageTransition.active = true;
        this.imageTransition.timer = 0;
        this.imageTransition.duration = duration;
        this.imageTransition.previousInfo = outgoingInfo;
        
        if (outgoingMember) {
            this.imageTransition.previousPartyMember = {
                name: outgoingMember.name, hp: outgoingMember.hp, maxHp: outgoingMember.maxHp,
                stamina: outgoingMember.stamina, maxStamina: outgoingMember.maxStamina,
                insight: outgoingMember.insight || 0, maxInsight: outgoingMember.maxInsight || 100,
                statusEffects: outgoingMember.statusEffects ? [...outgoingMember.statusEffects] : [],
                sheet: outgoingMember.sheet, col: outgoingMember.col, row: outgoingMember.row
            };
        } else {
            this.imageTransition.previousPartyMember = null;
        }
    }

    _getValidDecisions() {
        if (!this.model) return [];
        const rawDecisions = this.model.getAvailableDecisions() || [];
        return rawDecisions.filter(decision => EncounterLogic.checkConditions(decision, this.model.context || {}));
    }

    handleMouseMove(x, y, isMouseDown, renderer) {
        super.handleMouseMove(x, y, isMouseDown, renderer);
        if (this._lastMouseX !== x || this._lastMouseY !== y) {
            this.isUsingKeyboard = false;
            this._lastMouseX = x;
            this._lastMouseY = y;
        }
    }

    _setFocus(hitboxId) {
        if (!hitboxId) return;
        if (hitboxId.startsWith('DECISION_')) {
            const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index) && this.selectedIndex !== index) {
                this.selectedIndex = index;
                this.playNavSound();
            }
        }
    }

    onClick(hitboxId) {
        if (!this.model) return;
        if (this.inputCooldown > 0) return;
        
        if (!this.isUsingKeyboard) {
            this._setFocus(hitboxId);
            this.isUsingKeyboard = false;
        }

        if (!this.hasDoneIntro) {
            if (this.textTimer < 3.0) { this.textTimer = 3.0; this.inputCooldown = 0.15; return; }
            else if (this.textTimer < 6.0) { this.textTimer = 6.0; this.inputCooldown = 0.15; return; }
            else { this.hasDoneIntro = true; }
        }

        const charsPerSecond = 25;
        const currentText = this.actionPhase === 'message' ? this.actionMessage : this.lastText;
        const totalTypingTime = currentText.length * (1 / charsPerSecond);
        const decisionFadeTime = this.actionPhase === 'none' ? 3.0 : 0;
        const padding = Math.max(0.8, Math.min(2.5, currentText.length * 0.02));
        const textStartTime = 6.0;
        const textEndTime = textStartTime + totalTypingTime;
        const isAnimatingText = this.textTimer < (textEndTime + decisionFadeTime);
        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result', 'ending', 'ending_delay', 'reward_delay'];

        if (skipPhases.includes(this.actionPhase) || (this.actionPhase === 'none' && isAnimatingText)) {
            if ((this.actionPhase === 'message' || this.actionPhase === 'none' || this.actionPhase === 'reward_delay') && this.textTimer < textEndTime) {
                this.textTimer = textEndTime;
                this.inputCooldown = 0.15;
                return;
            }
            this.skipMessageAnimation = true;
            this.textTimer = textEndTime + decisionFadeTime + padding;
            this.inputCooldown = 0.15;
            return;
        }

        if (this.actionPhase === 'wait_for_roll') {
            if (hitboxId === 'BTN_ROLL') {
                this.playConfirmSound();
                this.inputCooldown = 0.15;
                this.triggerRoll();
            }
            return;
        }

        if (hitboxId && hitboxId.startsWith('DECISION_')) {
            const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index)) {
                this.selectedIndex = index;
                this.inputCooldown = 0.15;
                this.executeSelectedDecision();
            }
        }
    }

    onRightClick(hitboxId) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
    }
    onDragStart(hitboxId) {
        if (hitboxId === 'SCROLL_THUMB_DECISIONS' || hitboxId === 'SCROLL_THUMB_TEXT') {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
        }
    }
    onDragMove(x, y) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragMove(y);
    }
    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
    }
    handleScroll(delta) {
        this.isUsingKeyboard = false;
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 40);
    }

    handleKeyDown(keyCode, e) {
        this.isUsingKeyboard = true;
        if (!this.model) return;
        if (this.inputCooldown > 0) return;
        
        const intent = (e && KEY_BINDINGS[e.code]) || KEY_BINDINGS[keyCode];
        
        if (!this.hasDoneIntro && (intent === 'CONFIRM' || intent === 'CANCEL')) {
            if (this.textTimer < 3.0) { this.textTimer = 3.0; this.inputCooldown = 0.15; return; }
            else if (this.textTimer < 6.0) { this.textTimer = 6.0; this.inputCooldown = 0.15; return; }
            else { this.hasDoneIntro = true; }
        }

        const charsPerSecond = 25;
        const currentText = this.actionPhase === 'message' ? this.actionMessage : this.lastText;
        const totalTypingTime = currentText.length * (1 / charsPerSecond);
        const decisionFadeTime = this.actionPhase === 'none' ? 3.0 : 0;
        const padding = Math.max(0.8, Math.min(2.5, currentText.length * 0.02));
        const textStartTime = 6.0;
        const textEndTime = textStartTime + totalTypingTime;
        const isAnimatingText = this.textTimer < (textEndTime + decisionFadeTime);
        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result', 'ending', 'ending_delay', 'reward_delay'];

        if (skipPhases.includes(this.actionPhase) || (this.actionPhase === 'none' && isAnimatingText)) {
            if (intent === 'CONFIRM') {
                this.playConfirmSound();
                if ((this.actionPhase === 'message' || this.actionPhase === 'none' || this.actionPhase === 'reward_delay') && this.textTimer < textEndTime) {
                    this.textTimer = textEndTime;
                    this.inputCooldown = 0.15;
                    return;
                }
                this.skipMessageAnimation = true;
                this.textTimer = textEndTime + decisionFadeTime + padding;
                this.inputCooldown = 0.15;
            }
            return;
        }

        if (this.actionPhase === 'wait_for_roll') {
            if (intent === 'CONFIRM') {
                this.playConfirmSound();
                this.inputCooldown = 0.15;
                this.triggerRoll();
            }
            return;
        }

        const options = this._getValidDecisions();
        if (!options || options.length === 0) return;

        if (intent === 'CANCEL') {
            this.playCancelSound();
            if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
            return;
        }

        const prevIndex = this.selectedIndex;
        if (intent === 'UP') {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
            if (this.selectedIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'DOWN') {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
            if (this.selectedIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'CONFIRM') {
            this.playConfirmSound();
            this.inputCooldown = 0.15;
            this.executeSelectedDecision();
        }
    }

    executeSelectedDecision() {
        if (this.actionPhase === 'ending' || this.pendingDecision !== null) return;
        const options = this._getValidDecisions();
        if (!options || options.length === 0) return;
        
        this.playConfirmSound('ui_select');
        const selectedDecision = options[this.selectedIndex];

        if (selectedDecision.type === 'switch_character') {
            this.inputCooldown = 0.5;
            events.emit('CHANGE_SCENE', {
                scene: 'party',
                data: {
                    mode: 'ENCOUNTER_SELECT',
                    activeIndices: [0],
                    callback: (chosenIndex) => {
                        if (chosenIndex !== null && chosenIndex >= 0 && chosenIndex < gameState.party.members.length) {
                            this._triggerImageTransition();
                            const party = gameState.party.members;
                            const selectedMember = party.splice(chosenIndex, 1)[0];
                            party.unshift(selectedMember);
                            this.selectedIndex = 0;
                        }
                    }
                }
            });
        }
        // --- NEW: Emit OPEN_SHOP event ---
        else if (selectedDecision.type === 'open_shop') {
            this.inputCooldown = 0.5;
            let finalWares = selectedDecision.wares || [];
            
            // Generate dynamic wares if a loot table is provided
            if (selectedDecision.lootTableId) {
                const rolls = selectedDecision.rolls || 5;
                const lootModel = LootTableFactory.generateLoot(selectedDecision.lootTableId, rolls);
                
                if (lootModel.hasItems()) {
                    const dynamicWares = lootModel.items.map(item => ({
                        id: item.id,
                        qty: item.qty 
                        // ShopController automatically handles the price!
                    }));
                    finalWares = [...finalWares, ...dynamicWares];
                }
            }

            events.emit('OPEN_SHOP', {
                shopId: selectedDecision.shopId,
                wares: finalWares,
                returnScene: 'encounter', // <--- THIS TELLS THE SHOP WHERE TO GO BACK TO
                callback: () => {
                    this.inputCooldown = 0.5;
                    this.updateBGM();
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

        if (decision.bgm) {
            events.emit('PLAY_MUSIC', { id: decision.bgm, fadeTime: 0.5 });
        } else if (decision.outcomes && decision.outcomes[0] && decision.outcomes[0].bgm) {
            events.emit('PLAY_MUSIC', { id: decision.outcomes[0].bgm, fadeTime: 0.5 });
        }

        if (decision.image) {
            this._triggerImageTransition(0.4);
            if (this.model && this.model.getImage) {
                this.model._originalGetImage = this.model.getImage;
                const currentImage = this.model._originalGetImage.call(this.model);
                const baseSheet = currentImage ? currentImage.sheet : this.model.imageSheet;
                this.model.getImage = () => { return { sheet: decision.image.sheet || baseSheet, col: decision.image.col, row: decision.image.row }; };
            }
        }

        if (decision.type !== 'skill_check') {
            this.executeLogic();
        }

        const actorName = gameState.party?.members?.[0]?.name || "The party";
        if (decision.customActionText) {
            this.actionPhase = 'message';
            this.textTimer = 6.0;
            this.hasDoneIntro = true;
            this.skipMessageAnimation = false;
            this.actionMessage = decision.customActionText.replace(/{name}/g, actorName);
            this.lastText = this.actionMessage;
        } else {
            if (decision.type === 'skill_check') {
                this.rollData = EncounterLogic.calculateRoll(this.pendingDecision);
                this.actionPhase = 'wait_for_roll';
            } else {
                this.applySceneChanges();
            }
        }
    }

    executeLogic() {
        const decision = this.pendingDecision;
        if (!decision) return;
        let targetOutcomes = decision.outcomes;
        
        if (decision.type === 'skill_check') {
            events.emit('PLAY_SFX', { id: this.rollData.isSuccess ? 'skill_success' : 'skill_failure', volume: 0.7 });
            this.model.updateContext({
                roll_stat: decision.attribute?.toUpperCase() || "UNKNOWN",
                roll_d20: this.rollData.d20, roll_mod: this.rollData.mod,
                roll_total: this.rollData.total, roll_dc: this.rollData.dc,
                roll_result: this.rollData.isSuccess ? "SUCCESS" : "FAILED"
            });
            targetOutcomes = this.rollData.isSuccess ? decision.successOutcomes : decision.failureOutcomes;
        }
        
        const selectedOutcome = EncounterLogic.selectOutcome(targetOutcomes);
        if (selectedOutcome) {
            const resultsArray = selectedOutcome.results;
            let isStartingBattle = false;
            let isGameOverTriggered = false;
            if (resultsArray) {
                for (const r of resultsArray) {
                    if (r.type === 'START_BATTLE') isStartingBattle = true;
                    if (r.type === 'TRIGGER_GAME_OVER') isGameOverTriggered = true;
                    if (r.type === 'RECORD_KILL') {
                        const targetIdSafe = String(r.payload.enemyId).toLowerCase().replace(/[\s_\-]+/g, '');
                        const killAmount = r.payload.amount || 1;
                        Object.keys(gameState.quests.active).forEach(questId => {
                            const questDef = QuestDefinitions[questId];
                            if (questDef) {
                                questDef.objectives.forEach(obj => {
                                    const objTargetSafe = String(obj.targetId).toLowerCase().replace(/[\s_\-]+/g, '');
                                    if (obj.type === 'kill_enemy' && objTargetSafe === targetIdSafe) {
                                        const didUpdate = QuestModel.updateProgress(gameState, questId, obj.id, killAmount);
                                        if (didUpdate && QuestModel.checkCompletion(gameState, questId)) {
                                            console.log(`Quest Complete: ${questDef.name}!`);
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            }
            const logicResponse = EncounterLogic.resolveResults(resultsArray, this.model, this.worldManager);
            this.pendingLogicResponse = { response: logicResponse, isStartingBattle, isGameOverTriggered };
        }
    }

    applySceneChanges() {
        this.actionPhase = 'none';
        this.pendingDecision = null;
        if (!this.pendingLogicResponse) return;
        
        const { response: logicResponse, isStartingBattle, isGameOverTriggered } = this.pendingLogicResponse;
        this.pendingLogicResponse = null;

        if (isGameOverTriggered) {
            this.actionPhase = 'ending';
            events.emit('CHANGE_SCENE', { scene: 'game_over' });
            return;
        }

        const party = gameState.party.members;
        const nextLivingIndex = party.findIndex(m => m.hp > 0);
        const isTotalWipe = logicResponse.isGameOver || (logicResponse.forceCharacterSwitch && nextLivingIndex === -1);
        
        if (isTotalWipe) {
            this._triggerImageTransition(2.0);
            const deathMsg = "Game over, all party members have been slain!";
            const fullText = logicResponse.messages.length > 0 ? logicResponse.messages.join('\n\n') + '\n\n' + deathMsg : deathMsg;
            this.model.stages = this.model.stages || {};
            this.model.stages["game_over_stage"] = {
                displayText: "Defeat",
                image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
                text: fullText,
                decisions: [{ text: "Accept your fate.", outcomes: [{ weight: 100, results: [{ type: "TRIGGER_GAME_OVER" }] }] }]
            };
            this.model.advanceToStage("game_over_stage");
            this.selectedIndex = 0;
            return;
        }

        if (logicResponse.forceCharacterSwitch) {
            this._triggerImageTransition();
            if (nextLivingIndex > 0) {
                const deadMember = party[0];
                const selectedMember = party.splice(nextLivingIndex, 1)[0];
                party.unshift(selectedMember);
                this.selectedIndex = 0;
                logicResponse.messages.unshift(`${deadMember.name} has fallen! ${selectedMember.name} steps up.`);
            }
        }

        // --- NEW: Emit OPEN_SHOP event here as well to capture outcome-based shop encounters ---
        if (logicResponse.isOpeningShop) {
            this.actionPhase = 'ending'; // Locks input in the encounter scene temporarily
            events.emit('OPEN_SHOP', { 
                shopId: logicResponse.shopId, 
                wares: logicResponse.wares || [],
                returnScene: logicResponse.returnScene || 'encounter' // <--- ADD THIS HERE TOO
            });
            return;
        }

        if (logicResponse.modelChanged) {
            if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
            this.model = logicResponse.newModel;
            this.selectedIndex = 0;
            this.updateBGM();
        } else if (logicResponse.stageChanged) {
            if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
            this.model.advanceToStage(logicResponse.newStageId);
            this.selectedIndex = 0;
            this.updateBGM();
        }

        if (logicResponse.messages.length > 0 && logicResponse.shouldEndEncounter && !isStartingBattle) {
            this.rewardQueue = [...logicResponse.messages];
            this.pendingEndEncounterPayload = logicResponse.endEncounterPayload;
            if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
            this.showNextReward();
            return;
        }
        
        if (isStartingBattle) {
            this.actionPhase = 'ending';
        } else if (logicResponse.shouldEndEncounter) {
            this.endEncounter(logicResponse.endEncounterPayload);
        }
    }

    showNextReward() {
        if (!this.rewardQueue || this.rewardQueue.length === 0) {
            this.endEncounter(this.pendingEndEncounterPayload);
            return;
        }
        const nextMsg = this.rewardQueue.shift();
        this.model.stages = this.model.stages || {};
        this.model.stages["encounter_rewards_stage"] = {
            displayText: "Victory",
            image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
            text: nextMsg,
            decisions: []
        };
        this.model.advanceToStage("encounter_rewards_stage");
        this.selectedIndex = 0;
        this.actionPhase = 'reward_delay';
        const typingTime = nextMsg.length / 25;
        this.rollTimer = typingTime + 2.0;
        this.lastText = "";
        this.textTimer = 6.0;
        this.skipMessageAnimation = false;
    }

   endEncounter(payload = null) {
        this.actionPhase = 'ending';
        events.emit('CHANGE_SCENE', { scene: 'overworld', data: payload }); // <-- FIX: Sends you to 'overworld'
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
        const currentIntroAlpha = this.hasDoneIntro ? 1.0 : Math.max(0, Math.min(1, (this.textTimer - 3.0) / 3.0));
        let virtualHoverId = this.hoveredHitboxId;
        if (this.isUsingKeyboard) {
            if (this.actionPhase === 'none') {
                const options = this._getValidDecisions();
                if (options && options.length > 0 && this.selectedIndex < options.length) {
                    virtualHoverId = `DECISION_${this.selectedIndex}`;
                }
            } else if (this.actionPhase === 'wait_for_roll') {
                virtualHoverId = 'BTN_ROLL';
            }
        }
        const basePayload = {
            imageInfo: null,
            transition: { active: this.imageTransition.active, progress: Math.min(1.0, this.imageTransition.timer / this.imageTransition.duration), previousImageInfo: this.imageTransition.previousInfo, previousPartyMember: this.imageTransition.previousPartyMember },
            title: "", text: "", decisions: [], ui: { selectedDecisionIndex: this.selectedIndex, introAlpha: currentIntroAlpha },
            party: gameState.party?.members?.length > 0 ? [gameState.party.members[0]] : [],
            currency: gameState.party?.currency || 0,
            skipMessageAnimation: this.skipMessageAnimation, textTimer: this.textTimer, actionPhase: this.actionPhase, rollTimer: this.rollTimer, rollData: this.rollData,
            mouse: this.mouse, hoveredElement: virtualHoverId ? { id: virtualHoverId } : null, isUsingKeyboard: this.isUsingKeyboard,
            scrollOffsets: { decisions: this.scrollManager.getOffset('decision_list'), text: this.scrollManager.getOffset('text_content') },
            onLayoutUpdate: (hitboxes, scrollBounds) => {
                this.updateHitboxes(hitboxes);
                if (scrollBounds) {
                    if (scrollBounds.decisions) { this.scrollManager.registerZone('decision_list', scrollBounds.decisions); }
                    if (scrollBounds.text) { this.scrollManager.registerZone('text_content', scrollBounds.text); }
                }
            }
        };
        
        if (!this.model) return basePayload;
        let displayText = this.model.getCurrentText() || "";
        let displayDecisions = this._getValidDecisions();
        let displayStageName = this.model.getStageDisplayText ? this.model.getStageDisplayText() : "Unknown Stage";
        
        const actorName = gameState.party?.members?.[0]?.name || "The party";
        displayText = displayText.replace(/{name}/g, actorName);
        displayStageName = displayStageName.replace(/{name}/g, actorName);
        displayDecisions = displayDecisions.map(decision => ({ ...decision, text: decision.text.replace(/{name}/g, actorName) }));
        
        if (this.actionPhase !== 'none' && this.actionPhase !== 'ending_delay' && this.actionPhase !== 'reward_delay') {
            displayText = this.actionPhase === 'ending' ? this.lastText : this.actionMessage;
            displayDecisions = [];
        }
        
        if (this.lastText !== displayText) {
            const isFirstText = this.lastText === "";
            this.lastText = displayText;
            if (!isFirstText) { this.textTimer = 6.0; }
            this.skipMessageAnimation = false;
        }
        let currentImage = this.model.getImage ? this.model.getImage() : null;
        return { ...basePayload, textTimer: this.textTimer, skipMessageAnimation: this.skipMessageAnimation, title: this.model.title || "Unknown Encounter", stageName: displayStageName, imageInfo: currentImage, text: displayText, decisions: displayDecisions, ui: { selectedDecisionIndex: this.selectedIndex, introAlpha: currentIntroAlpha } };
    }
}
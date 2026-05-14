// ui/overworld/encounter/encounterController.js
import { BaseController } from '../core/baseController.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { EncounterLogic } from './encounterLogic.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP', 'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT', 'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM', 'Escape': 'CANCEL',
    'Backspace': 'CANCEL', 'Tab': 'CANCEL'
};

export class EncounterController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.config = config;
        this.worldManager = worldManager;
        
        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('decision_list', { thumbIds: ['SCROLL_THUMB_DECISIONS'] });
        
        this.model = null;
        this.selectedIndex = 0;
        
        this.actionPhase = 'none'; 
        this.pendingDecision = null;
        this.actionMessage = "";
        
        this.rollTimer = 0;
        this.rollTickTimer = 0;
        this.rollData = { displayVal: "?", d20: 0, mod: 0, total: 0, dc: 0, isSuccess: false, duration: 3.5 };
        
        this.lastText = "";
        this.textTimer = 0;
        this.skipMessageAnimation = false;
        
        this.imageTransition = {
            active: false, timer: 0, duration: 2.0, previousInfo: null
        };
        
        this.updateBGM();
    }

    start(encounterId, context = {}) {
        this.model = EncounterFactory.create(encounterId, context);
        if (!this.model) {
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
        this.imageTransition = { active: false, timer: 0, duration: 2.0, previousInfo: null };
        this.updateBGM();
    }

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
        if (!this.model) return;
        
        this.textTimer += dt;
        
        if (this.imageTransition.active) {
            this.imageTransition.timer += dt;
            if (this.imageTransition.timer >= this.imageTransition.duration) {
                this.imageTransition.active = false;
                this.imageTransition.previousInfo = null;
                this.imageTransition.timer = this.imageTransition.duration;
            }
        }

        if (this.actionPhase === 'message') {
            const charsPerSecond = 45;
            const totalTypingTime = this.actionMessage.length * (1 / charsPerSecond);
            if (this.skipMessageAnimation || this.textTimer >= (totalTypingTime + 2.0)) {
                this.skipMessageAnimation = false;
                if (this.pendingDecision && this.pendingDecision.type === 'skill_check') {
                    this.rollData = EncounterLogic.calculateRoll(this.pendingDecision);
                    this.actionPhase = 'wait_for_roll';
                } else {
                    this.resolveAction();
                }
            }
        } else if (this.actionPhase === 'rolling') {
            this.rollTimer -= dt;
            this.rollTickTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.rollData.displayVal = this.rollData.d20;
                this.actionPhase = 'hold_base';
                this.rollTimer = 1.5;
                this.skipMessageAnimation = false;
                events.emit('PLAY_SFX', { id: 'dice_land', volume: 0.7 });
            } else if (this.rollTickTimer <= 0) {
                this.rollData.displayVal = Math.floor(Math.random() * 20) + 1;
                const progress = 1.0 - (this.rollTimer / this.rollData.duration);
                this.rollTickTimer = 0.015 + (Math.pow(progress, 6) * 1.2);
                events.emit('PLAY_SFX', { id: 'diceTick', volume: 0.3, pitch: 0.9 + (Math.random() * 0.2) });
            }
        } else if (this.actionPhase === 'hold_base') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.actionPhase = 'apply_mod';
                this.rollTimer = 2.0;
                this.skipMessageAnimation = false;
            }
        } else if (this.actionPhase === 'apply_mod') {
            this.rollTimer -= dt;
            let progress = Math.min(Math.max(1.0 - (this.rollTimer / 2.0), 0), 1);
            this.rollData.displayVal = this.rollData.d20 + Math.round(this.rollData.mod * progress);
            
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.rollData.displayVal = this.rollData.total;
                this.actionPhase = 'result';
                this.rollTimer = 2.0;
                this.skipMessageAnimation = false;
            }
        } else if (this.actionPhase === 'result') {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.resolveAction();
            }
        }
    }

    _triggerImageTransition() {
        if (!this.model) return;
        const outgoingInfo = this.model.getImage ? this.model.getImage() : null;
        if (outgoingInfo) {
            this.imageTransition.active = true;
            this.imageTransition.timer = 0;
            this.imageTransition.previousInfo = outgoingInfo;
        }
    }

    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevX = this.mouse?.x;
        const prevY = this.mouse?.y;
        super.handleMouseMove(x, y, isMouseDown, renderer);
        
        if ((prevX !== x || prevY !== y) && this.hoveredHitboxId && this.hoveredHitboxId.startsWith('DECISION_')) {
            const index = parseInt(this.hoveredHitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index) && this.selectedIndex !== index) {
                this.selectedIndex = index;
                this.playNavSound();
            }
        }
    }

    onClick(hitboxId) {
        if (!this.model) return;
        
        const charsPerSecond = 45;
        const totalTypingTime = this.lastText.length * (1 / charsPerSecond);
        const isAnimatingText = this.textTimer < (totalTypingTime + 2.0);
        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result', 'ending'];
        
        if (skipPhases.includes(this.actionPhase) || isAnimatingText) {
            this.skipMessageAnimation = true;
            this.textTimer = totalTypingTime + 2.0;
            return;
        }
        
        if (this.actionPhase === 'wait_for_roll') {
            this.playConfirmSound();
            this.triggerRoll();
            return;
        }
        
        if (hitboxId && hitboxId.startsWith('DECISION_')) {
            const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index)) {
                this.selectedIndex = index;
                this.executeSelectedDecision();
            }
        }
    }

    onRightClick(hitboxId) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
    }

    onDragStart(hitboxId) {
        if (hitboxId === 'SCROLL_THUMB_DECISIONS') this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
    }

    onDragMove(x, y) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragMove(y);
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 40);
    }

    handleKeyDown(keyCode, e) {
        if (!this.model) return;
        
        const intent = (e && KEY_BINDINGS[e.code]) || KEY_BINDINGS[keyCode];
        const charsPerSecond = 45;
        const totalTypingTime = this.lastText.length * (1 / charsPerSecond);
        const isAnimatingText = this.textTimer < (totalTypingTime + 2.0);
        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result', 'ending'];
        
        if (skipPhases.includes(this.actionPhase) || isAnimatingText) {
            if (intent === 'CONFIRM') {
                this.playConfirmSound();
                this.skipMessageAnimation = true;
                this.textTimer = totalTypingTime + 2.0;
            }
            return;
        }
        
        if (this.actionPhase === 'wait_for_roll') {
            if (intent === 'CONFIRM') {
                this.playConfirmSound();
                this.triggerRoll();
            }
            return;
        }
        
        const options = this.model.getAvailableDecisions();
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
            this.executeSelectedDecision();
        }
    }

    executeSelectedDecision() {
        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;
        
        this.playConfirmSound('ui_select');
        const selectedDecision = options[this.selectedIndex];
        
        if (selectedDecision.type === 'switch_character') {
            events.emit('CHANGE_SCENE', {
                scene: 'party', data: {
                    mode: 'ENCOUNTER_SELECT', activeIndices: [0],
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
        
        const actorName = gameState.party?.members?.[0]?.name || "The party";
        if (decision.customActionText) {
            this.actionMessage = decision.customActionText.replace(/{name}/g, actorName);
        } else {
            const cleanText = decision.text.replace(/\[.*?\]/g, '').trim().toLowerCase();
            this.actionMessage = `${actorName} decides to ${cleanText.replace(/{name}/g, actorName)}...`;
        }
        this.lastText = this.actionMessage;
    }

    resolveAction() {
        this.actionPhase = 'none';
        const decision = this.pendingDecision;
        this.pendingDecision = null;
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
            this.applyLogicResults(selectedOutcome.results);
        }
    }

    applyLogicResults(resultsArray) {
        const logicResponse = EncounterLogic.resolveResults(resultsArray, this.model, this.worldManager);
        
        if (logicResponse.modelChanged) {
            this._triggerImageTransition();
            this.model = logicResponse.newModel;
            this.selectedIndex = 0;
            this.updateBGM();
        } else if (logicResponse.stageChanged) {
            this._triggerImageTransition();
            this.model.advanceToStage(logicResponse.newStageId);
            this.selectedIndex = 0;
            this.updateBGM();
        }
        
        if (logicResponse.messages.length > 0 && logicResponse.shouldEndEncounter) {
            const rewardText = logicResponse.messages.join('\n\n');
            this.model.stages = this.model.stages || {};
            this.model.stages["encounter_rewards_stage"] = {
                image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
                text: rewardText,
                decisions: [{
                    text: "Continue.", outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: logicResponse.endEncounterPayload }] }]
                }]
            };
            this._triggerImageTransition();
            this.model.advanceToStage("encounter_rewards_stage");
            this.selectedIndex = 0;
            return;
        }
        
        if (logicResponse.shouldEndEncounter) {
            this.endEncounter(logicResponse.endEncounterPayload);
        }
    }

    endEncounter(payload = null) {
        this.actionPhase = 'ending';
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
        const basePayload = {
            imageInfo: null,
            transition: {
                active: this.imageTransition.active,
                progress: Math.min(1.0, this.imageTransition.timer / this.imageTransition.duration),
                previousImageInfo: this.imageTransition.previousInfo
            },
            title: "", text: "", decisions: [],
            ui: { selectedDecisionIndex: this.selectedIndex },
            party: gameState.party?.members?.length > 0 ? [gameState.party.members[0]] : [],
            currency: gameState.party?.currency || 0,
            skipMessageAnimation: this.skipMessageAnimation,
            textTimer: this.textTimer, actionPhase: this.actionPhase,
            rollTimer: this.rollTimer, rollData: this.rollData,
            mouse: this.mouse,
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            scrollOffsets: { decisions: this.scrollManager.getOffset('decision_list') },
            onLayoutUpdate: (hitboxes, scrollBounds) => {
                this.updateHitboxes(hitboxes);
                if (scrollBounds && scrollBounds.decisions) {
                    this.scrollManager.registerZone('decision_list', scrollBounds.decisions);
                }
            }
        };

        if (!this.model) return basePayload;

        let displayText = this.model.getCurrentText() || "";
        let displayDecisions = this.model.getAvailableDecisions() || [];
        const actorName = gameState.party?.members?.[0]?.name || "The party";
        
        displayText = displayText.replace(/{name}/g, actorName);
        displayDecisions = displayDecisions.map(decision => ({
            ...decision, text: decision.text.replace(/{name}/g, actorName)
        }));

        if (this.actionPhase !== 'none') {
            displayText = this.actionPhase === 'ending' ? this.lastText : this.actionMessage;
            displayDecisions = [];
        }

        if (this.lastText !== displayText) {
            this.lastText = displayText;
            this.textTimer = 0;
            this.skipMessageAnimation = false;
        }

        return {
            ...basePayload,
            title: this.model.title || "Unknown Encounter",
            imageInfo: this.model.getImage ? this.model.getImage() : null,
            text: displayText,
            decisions: displayDecisions,
        };
    }
}
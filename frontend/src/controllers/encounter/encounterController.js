import { BaseController } from '../core/baseController.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { EncounterFactory } from "../../../../shared/systems/factories/encounterFactory.js";
import { gameState } from "../../../../shared/state/gameState.js";
import { events } from "../../core/eventBus.js";
import { InventorySystem } from "../../../../shared/systems/inventorySystem.js";
import { PartyManager } from "../../../../shared/systems/partyManager.js";
import { EntityFactory } from '../../../../shared/systems/factories/entityFactory.js';
import { ExperienceSystem } from '../../../../shared/systems/experienceSystem.js';

// --- STANDARDIZED INPUT BINDINGS ---
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

        // Setup standardized UI managers
        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('decision_list', { thumbIds: ['SCROLL_THUMB_DECISIONS'] });

        this.model = null;
        this.selectedIndex = 0; // The focused element index

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

        // --- [TRANSITION ADDITION] Image Transition State ---
        this.imageTransition = {
            active: false,
            timer: 0,
            duration: 2.0, // Seconds for the fade/burn effect. Can move to config.
            previousInfo: null // Stores { sheet, col, row } of outgoing image
        };

        this.updateBGM();
    }

    start(encounterId, context = {}) {
        this.model = EncounterFactory.create(encounterId, context);

        if (!this.model) {
            console.error(`[Encounter] Failed to create model for ID '${encounterId}'.`);
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        // Initialize focus to first element
        this.selectedIndex = 0;
        this.actionPhase = 'none';
        this.pendingDecision = null;
        this.actionMessage = "";
        this.rollTimer = 0;
        this.lastText = "";
        this.textTimer = 0;
        this.skipMessageAnimation = false;

        // --- [TRANSITION ADDITION] Reset transition on start ---
        this.imageTransition.active = false;
        this.imageTransition.previousInfo = null;
        this.imageTransition.timer = 0;

        console.log(`[Encounter] Started: ${this.model.id}`);
        this.updateBGM();
    }

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);

        if (!this.model) return;

        this.textTimer += dt;

        // --- [TRANSITION ADDITION] Update transition timer ---
        if (this.imageTransition.active) {
            this.imageTransition.timer += dt;
            if (this.imageTransition.timer >= this.imageTransition.duration) {
                this.imageTransition.active = false;
                this.imageTransition.previousInfo = null;
                // Keep timer at max for getState calculation stability until next change
                this.imageTransition.timer = this.imageTransition.duration; 
            }
        }

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
        } else if (this.actionPhase === 'rolling') {
            this.rollTimer -= dt;
            this.rollTickTimer -= dt;

            if (this.rollTimer <= 0 || this.skipMessageAnimation) {
                this.rollData.displayVal = this.rollData.d20;
                this.actionPhase = 'hold_base';
                this.rollTimer = 1.5;
                this.skipMessageAnimation = false;
                // Specific game mechanic sounds remain specific, not general UI standard sounds
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
            const duration = 2.0;
            let progress = 1.0 - (this.rollTimer / duration);
            progress = Math.min(Math.max(progress, 0), 1);

            const currentMod = Math.round(this.rollData.mod * progress);
            this.rollData.displayVal = this.rollData.d20 + currentMod;

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

    // --- [TRANSITION ADDITION] Helper to set up transition state ---
    /**
     * Call this BEFORE updating the model to advance stage or change encounter.
     * It captures the current image as the background for the transition.
     */
    _triggerImageTransition() {
        if (!this.model) return;
        
        // Capture outgoing image info
        const outgoingInfo = this.model.getImage ? this.model.getImage() : null;
        
        // Only trigger if there actually was an image (avoid visual glitch on first load if black)
        if (outgoingInfo) {
            this.imageTransition.active = true;
            this.imageTransition.timer = 0;
            this.imageTransition.previousInfo = outgoingInfo;
        }
    }

    // ========================================================
    // STANDARDIZED UI CALLBACKS
    // ========================================================

    handleMouseMove(x, y, isMouseDown, renderer) {
        // Track previous position to detect actual physical mouse movement
        const prevX = this.mouse?.x;
        const prevY = this.mouse?.y;

        super.handleMouseMove(x, y, isMouseDown, renderer);

        // Check if the mouse actually changed coordinates. 
        // This prevents a stationary mouse from fighting keyboard navigation.
        const hasMoved = (prevX !== x || prevY !== y);

        if (hasMoved && this.hoveredHitboxId && this.hoveredHitboxId.startsWith('DECISION_')) {
            const index = parseInt(this.hoveredHitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index) && this.selectedIndex !== index) {
                this.selectedIndex = index; // Updates focus, overriding keyboard if mouse moves
                // --- SFX UPDATED: Play the default tick sound ---
                this.playNavSound();
            }
        }
    }

    onClick(hitboxId) {
        // Universal Left-Click: Advance Animation or Select
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
            // UI interaction for roll button. Standard sound first, then mechanic trigger which has its sound.
            this.playConfirmSound();
            this.triggerRoll();
            return;
        }

        if (!hitboxId) return;

        if (hitboxId.startsWith('DECISION_')) {
            const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
            if (!isNaN(index)) {
                this.selectedIndex = index;
                this.executeSelectedDecision();
            }
        }
    }

    onRightClick(hitboxId) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        }
    }

    // --- Standard Drag and Drop / Scroll Mapping ---
    onDragStart(hitboxId) {
        if (hitboxId === 'SCROLL_THUMB_DECISIONS') {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
        }
    }

    onDragMove(x, y) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragMove(y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        }
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 40);
    }

    // ========================================================
    // RAW INPUT FALLBACK (KEYBOARD)
    // ========================================================

    handleKeyDown(keyCode, e) {
        if (!this.model) return;

        const charsPerSecond = 45;
        const totalTypingTime = this.lastText.length * (1 / charsPerSecond);
        const isAnimatingText = this.textTimer < (totalTypingTime + 2.0);
        const skipPhases = ['message', 'rolling', 'hold_base', 'apply_mod', 'result', 'ending'];

        const intent = (e && KEY_BINDINGS[e.code]) || KEY_BINDINGS[keyCode];

        if (skipPhases.includes(this.actionPhase) || isAnimatingText) {
            if (intent === 'CONFIRM') {
                this.playConfirmSound(); // Play confirm sound for skipped content
                this.skipMessageAnimation = true;
                this.textTimer = totalTypingTime + 2.0;
            }
            return;
        }

        if (this.actionPhase === 'wait_for_roll') {
            if (intent === 'CONFIRM') {
                // UI interaction for roll. Standard sound first, then mechanic trigger which has its sound.
                this.playConfirmSound();
                this.triggerRoll();
            }
            return;
        }

        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;

        if (intent === 'CANCEL') {
            this.playCancelSound();
            if (this.scrollManager.isDragging) {
                this.scrollManager.handleDragEnd();
            }
            return;
        }

        // Track state to see if a tick sound should fire
        const prevIndex = this.selectedIndex;

        if (intent === 'UP') {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
            if (this.selectedIndex !== prevIndex) {
                this.playNavSound();
            }
        } else if (intent === 'DOWN') {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
            if (this.selectedIndex !== prevIndex) {
                this.playNavSound();
            }
        } else if (intent === 'CONFIRM') {
            this.playConfirmSound(); // generic UI interaction sound before core logic trigger
            this.executeSelectedDecision();
        }
    }

    // ========================================================
    // CORE ENCOUNTER LOGIC
    // ========================================================

    executeSelectedDecision() {
        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;

        // --- SFX UPDATED: Standardized helper for selection with specific ID for choice ---
        this.playConfirmSound('ui_select');

        const selectedDecision = options[this.selectedIndex];

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
        // Thematic mechanic sound remains different from generic UI confirms
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
                // Game mechanic sounds remain thematic not standard interface sounds
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
                    // --- [TRANSITION ADDITION] Prepare transition before changing stage ---
                    this._triggerImageTransition();
                    this.model.advanceToStage(payload.stageId);
                    this.selectedIndex = 0;
                    this.updateBGM();
                    break;

                case "CHANGE_ENCOUNTER":
                    // --- [TRANSITION ADDITION] Prepare transition before changing model ---
                    this._triggerImageTransition();
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
                    if (gameState.party.currency < 0) gameState.party.currency = 0;

                    if (currencyAmount > 0) messages.push(`Found ${currencyAmount} currency!`);
                    else if (currencyAmount < 0) messages.push(`Lost ${Math.abs(currencyAmount)} currency.`);
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
                    const dynamicLevel = PartyManager.getHighestLevel();
                    const rawEnemies = payload.enemies || [];
                    const enemyParty = rawEnemies.map((enemyData, index) => {
                        const enemyId = typeof enemyData === 'string' ? enemyData : enemyData.id;
                        let overrides = { level: dynamicLevel };

                        if (typeof enemyData === 'object') {
                            const levelOffset = enemyData.levelOffset || 0;
                            overrides = { ...enemyData, level: Math.max(1, dynamicLevel + levelOffset) };
                        }

                        const enemyEntity = EntityFactory.create(enemyId, overrides);
                        if (typeof enemyData === 'string' || !enemyData.name) {
                            enemyEntity.name = `${enemyEntity.name || enemyId} ${index + 1}`;
                        }
                        return enemyEntity;
                    });

                    let battleBgAsset = payload.background;
                    if (!battleBgAsset) {
                        const currentHour = gameState.world?.time ? gameState.world.time / 60 : 12;
                        const context = this.model.context || {};
                        const col = context.col !== undefined ? context.col : (gameState.player?.col || 0);
                        const row = context.row !== undefined ? context.row : (gameState.player?.row || 0);
                        const biome = this.worldManager.getBiomeAt(col, row);
                        battleBgAsset = biome ? biome.getBattleBackground(currentHour) : 'default';
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

        if (messages.length > 0 && shouldEndEncounter) {
            const rewardText = messages.join('\n\n');
            this.model.stages = this.model.stages || {};
            
            // Updated reward stage definition to use the new image object structure
            this.model.stages["encounter_rewards_stage"] = {
                image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
                text: rewardText,
                decisions: [
                    {
                        text: "Continue.",
                        outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: endEncounterPayload }] }]
                    }
                ]
            };

            // --- [TRANSITION ADDITION] Prepare transition before showing rewards stage ---
            // Note: Since image usually doesn't change for rewards, this might be skipped in _triggerImageTransition based on logic, 
            // but we call it here for consistency.
            this._triggerImageTransition();
            this.model.advanceToStage("encounter_rewards_stage");
            this.selectedIndex = 0;
            return;
        }

        if (shouldEndEncounter) {
            this.endEncounter(endEncounterPayload);
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

    // ========================================================
    // STATE ACCESS FOR RENDERER
    // ========================================================

    getState() {
        const basePayload = {
            // UPDATED: imageInfo now holds the object { sheet, col, row }
            // This is the TARGET image.
            imageInfo: null, 
            
            // --- [TRANSITION ADDITION] Data for renderer effects ---
            transition: {
                active: this.imageTransition.active,
                // Normalized progress 0.0 -> 1.0
                progress: Math.min(1.0, this.imageTransition.timer / this.imageTransition.duration),
                // The outgoing image definition
                previousImageInfo: this.imageTransition.previousInfo
            },

            title: "",
            text: "",
            decisions: [],
            ui: {
                selectedDecisionIndex: this.selectedIndex
            },
            party: gameState.party?.members?.length > 0 ? [gameState.party.members[0]] : [],
            currency: gameState.party?.currency || 0,
            skipMessageAnimation: this.skipMessageAnimation,
            textTimer: this.textTimer,
            actionPhase: this.actionPhase,
            rollTimer: this.rollTimer,
            rollData: this.rollData,
            mouse: this.mouse,
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            scrollOffsets: {
                decisions: this.scrollManager.getOffset('decision_list')
            },
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
            ...decision,
            text: decision.text.replace(/{name}/g, actorName)
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
            // UPDATED: Use getImage() to get the definition object. This is the intended destination image.
            imageInfo: this.model.getImage ? this.model.getImage() : null,
            text: displayText,
            decisions: displayDecisions,
        };
    }
}
import { gameState } from '../../../../shared/state/gameState.js';
import { AbilityFactory } from '../../../../shared/systems/factories/abilityFactory.js';
import { events } from '../../core/eventBus.js';
import { CombatantModel } from '../../../../shared/models/combatantModel.js';
import { BattleRewardSystem } from '../../../../shared/systems/battleRewardSystem.js';
import { TurnManager, TURN_TYPES } from '../../../../shared/systems/turnManager.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { BaseController } from '../core/baseController.js';

// --- ADDED KEY BINDINGS ---
const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 'Tab': 'CANCEL',
    'KeyP': 'SWAP',
    'KeyI': 'SUMMARY', 'i': 'SUMMARY',
    'KeyC': 'DEBUG', 'c': 'DEBUG'
};

export const PHASE = {
    INTRO: 'INTRO',
    SELECT_ACTION: 'SELECT_ACTION',
    SELECT_TARGET: 'SELECT_TARGET',
    RESOLVE: 'RESOLVE',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

export class BattleController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.config = config;
        this.state = null;
        this.timer = 0;
        this.turnManager = new TurnManager(this);
    }

    start(enemies, context = {}) {
        const maxActive = context.maxActive || 3;
        const party = gameState.party.members.map(member => new CombatantModel(member, 'party'));
        const preparedEnemies = enemies.map(enemy => new CombatantModel(enemy, 'enemy'));

        this.state = {
            active: true,
            isPausedForUI: false,
            phase: PHASE.INTRO,
            backgroundId: context.backgroundId,
            weather: context.weather || null,
            partyRoster: party,
            enemyRoster: preparedEnemies,
            activeParty: party.slice(0, maxActive),
            activeEnemies: preparedEnemies.slice(0, maxActive),
            activePartyIndex: 0,
            selectedAction: null,
            turnQueue: [],
            menuIndex: 0,
            targetIndex: 0,
            selectedTargets: [],
            message: `Battle started!`,
            fled: false
        };

        console.log('[DEBUG] BattleController.start received context:', context);
        let preBattleActionsQueued = false;

        // --- 1. ENEMY INTRO CRIES ---
        this.state.activeEnemies.forEach(enemy => {
            if (enemy && !enemy.isDead()) {
                enemy.hasEnteredBattle = false;
                this.state.turnQueue.push({
                    type: TURN_TYPES.ANIMATION,
                    actor: enemy,
                    animationId: 'enter_battle',
                    soundId: enemy.crySound || null,
                    duration: 1.0
                });
                preBattleActionsQueued = true;
            }
        });

        // --- 1.5 ALLY INTRO CRIES ---
        this.state.activeParty.forEach(ally => {
            if (ally && !ally.isDead()) {
                ally.hasEnteredBattle = false;
                this.state.turnQueue.push({
                    type: TURN_TYPES.ANIMATION,
                    actor: ally,
                    animationId: 'enter_battle',
                    soundId: ally.crySound || null,
                    duration: 1.0
                });
                preBattleActionsQueued = true;
            }
        });

        // --- 1.7 WEATHER INTRO ---
        if (this.state.weather && this.state.weather.id !== 'clear') {
            console.log('[DEBUG] WEATHER TRIGGERED in BattleController! Pushing to queue.', this.state.weather);
            const weatherMsg = this.state.weather.battleMessage || `A fierce ${this.state.weather.name} begins!`;
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: weatherMsg });

            const activeCombatants = [...this.state.activeParty, ...this.state.activeEnemies].filter(c => c && !c.isDead());
            this.state.turnQueue.push({
                type: TURN_TYPES.WEATHER_INTRO,
                weather: this.state.weather,
                targets: activeCombatants
            });
            preBattleActionsQueued = true;
        }

        // --- 2. PRE-BATTLE TRAIT SWEEP ---
        const traitsQueued = this._queuePreBattleTraits();
        if (traitsQueued) preBattleActionsQueued = true;

        // --- 3. DETERMINE STARTING PHASE ---
        if (preBattleActionsQueued) {
            this.state.phase = PHASE.RESOLVE;
            console.log('[DEBUG] Pre-battle queue loaded. Phase set to RESOLVE. Queue:', this.state.turnQueue);
        } else {
            console.log('[DEBUG] No weather or pre-battle traits. Proceeding with standard INTRO phase.');
        }

        this.timer = 0;
    }

    _queuePreBattleTraits() {
        let traitsQueued = false;
        const activeCombatants = [...this.state.activeParty, ...this.state.activeEnemies].filter(c => c && !c.isDead());
        activeCombatants.sort((a, b) => (b.stats?.speed ?? 10) - (a.stats?.speed ?? 10));

        activeCombatants.forEach(combatant => {
            const rawTraits = combatant.traits;
            console.log(`[Debug Sweeper] Checking ${combatant.name}. Raw Traits found:`, rawTraits);

            if (rawTraits && Array.isArray(rawTraits) && rawTraits.length > 0) {
                rawTraits.forEach(trait => {
                    const startTrigger = trait?.triggers?.onBattleStart;
                    if (startTrigger && startTrigger.ability) {
                        const abilityId = startTrigger.ability;
                        const [ability] = AbilityFactory.createAbilities([abilityId]);

                        if (ability) {
                            // --- 1. QUEUE ANIMATION ---
                            if (startTrigger.animationId) {
                                this.state.turnQueue.push({
                                    type: TURN_TYPES.PLAY_ANIMATION,
                                    animationId: startTrigger.animationId,
                                    target: combatant
                                });
                            }

                            // --- 2. QUEUE BATTLE MESSAGE ---
                            const msgTemplate = startTrigger.battleMessage || "{actor}'s {trait} activates!";
                            const finalMessage = msgTemplate
                                .replace(/{actor}/g, combatant.name)
                                .replace(/{trait}/g, trait.name);
                            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: finalMessage });

                            // --- 3. QUEUE ABILITY EXECUTION ---
                            this.state.turnQueue.push({
                                type: TURN_TYPES.EXECUTE_ACTION,
                                ignoreCost: true,
                                actor: combatant,
                                action: ability,
                                target: combatant
                            });
                            traitsQueued = true;
                        }
                    }
                });
            }
        });

        return traitsQueued;
    }

    // --- NEW: Death Trait Sweeper ---
    _queueDeathTraits(deadCombatant) {
        const rawTraits = deadCombatant.traits;
        if (!rawTraits || !Array.isArray(rawTraits) || rawTraits.length === 0) return;

        rawTraits.forEach(trait => {
            const deathTrigger = trait?.triggers?.onDeath;
            if (deathTrigger && deathTrigger.ability) {
                const abilityId = deathTrigger.ability;
                const [ability] = AbilityFactory.createAbilities([abilityId]);

                if (ability) {
                    console.log(`[Debug Sweeper] SUCCESS! Queuing death trait [${trait.name}] -> casting [${ability.name}] for ${deadCombatant.name}`);

                    this.state.turnQueue.unshift({
                        type: TURN_TYPES.EXECUTE_ACTION,
                        ignoreCost: true,
                        allowDeadActor: true,
                        actor: deadCombatant,
                        action: ability,
                        target: deadCombatant
                    });

                    const msgTemplate = deathTrigger.battleMessage || "{actor}'s {trait} activates upon death!";
                    const finalMessage = msgTemplate
                        .replace(/{actor}/g, deadCombatant.name)
                        .replace(/{trait}/g, trait.name);
                    this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: finalMessage });

                    const animId = deathTrigger.animationId || "trait_activate";
                    this.state.turnQueue.unshift({
                        type: TURN_TYPES.PLAY_ANIMATION,
                        animationId: animId,
                        target: deadCombatant
                    });

                } else {
                    console.warn(`[Debug Sweeper] Trait ${trait.name} tried to fire death ability '${abilityId}' but it failed to build.`);
                }
            }
        });
    }

    // ========================================================
    // UNIFIED TARGETING PIPELINE (KEYBOARD & MOUSE)
    // ========================================================
    _getTargetsFromGroup() {
        if (this.state.targetGroup === 'everyone') {
            return [...this.state.activeParty, ...this.state.activeEnemies];
        }
        return this.getActivePool(this.state.targetGroup);
    }

    _getTargetFromHitbox(hitboxId) {
        if (!hitboxId || !hitboxId.startsWith('TARGET_')) return null;
        const parts = hitboxId.split('_');
        const team = parts[1].toLowerCase(); // 'party' or 'enemy'
        const index = parseInt(parts[2], 10);
        const pool = this.getActivePool(team);
        return pool[index];
    }

    _isValidTargetHitbox(hitboxId) {
        if (!this.state.targetGroup) return false;
        const target = this._getTargetFromHitbox(hitboxId);
        if (!target || target.isDead()) return false;

        // Both mouse and keyboard now validate against the exact same pool!
        const validTargets = this._getTargetsFromGroup();
        return validTargets.includes(target);
    }

    onHover(hitboxId) {
        const prevMenuIndex = this.state?.menuIndex;
        const prevTargetIndex = this.state?.targetIndex;

        super.onHover(hitboxId);
        if (!hitboxId || this.state?.isPausedForUI || !this.state?.active) return;

        // Sync focus logic to brackets on hover
        if (this.state.phase === PHASE.SELECT_ACTION && hitboxId.startsWith('ACTION_')) {
            this.state.menuIndex = parseInt(hitboxId.split('_')[1], 10);
            if (this.state.menuIndex !== prevMenuIndex) this.playNavSound();
        } 
        else if (this.state.phase === PHASE.SELECT_TARGET && hitboxId.startsWith('TARGET_')) {
            if (this.state.targetIndex === 'ALL') return; // Do not snap cursor to specific index for AoE

            if (this._isValidTargetHitbox(hitboxId)) {
                // UNIFY: Set the index based on the shared array, not the raw hitbox suffix
                const target = this._getTargetFromHitbox(hitboxId);
                const validTargets = this._getTargetsFromGroup();
                this.state.targetIndex = validTargets.indexOf(target);
                
                if (this.state.targetIndex !== prevTargetIndex) this.playNavSound();
            }
        }
    }

    onClick(hitboxId) {
        if (!hitboxId || this.state?.isPausedForUI || !this.state?.active) return;

        // Treat clicking an action the same as hitting Enter on it
        if (this.state.phase === PHASE.SELECT_ACTION && hitboxId.startsWith('ACTION_')) {
            this.state.menuIndex = parseInt(hitboxId.split('_')[1], 10);
            this._handleActionSelection('CONFIRM');
        } 
        // Treat clicking a target the same as hitting Enter on it
        else if (this.state.phase === PHASE.SELECT_TARGET && hitboxId.startsWith('TARGET_')) {
            if (this.state.targetIndex === 'ALL') {
                if (this._isValidTargetHitbox(hitboxId)) {
                    this._handleTargetSelection('CONFIRM');
                }
            } else if (this._isValidTargetHitbox(hitboxId)) {
                const target = this._getTargetFromHitbox(hitboxId);
                const validTargets = this._getTargetsFromGroup();
                this.state.targetIndex = validTargets.indexOf(target);
                this._handleTargetSelection('CONFIRM');
            }
        } 
        // --- Handle Global Battle UI Buttons ---
        else if (this.state.phase === PHASE.SELECT_ACTION) {
            if (hitboxId === 'BUTTON_PARTY') {
                this.playConfirmSound('ui_select');
                this.requestPartySwap(false, this.state.activePartyIndex);
            } else if (hitboxId === 'BUTTON_INVENTORY') {
                this.playConfirmSound('ui_select');
                this._openCharacterSummary();
            }
        }
    }

    onRightClick(hitboxId) {
        if (this.state?.isPausedForUI || !this.state?.active) return;

        // Universal Cancel / Back
        if (this.state.phase === PHASE.SELECT_TARGET) {
            this._handleTargetSelection('CANCEL');
        }
    }

    // --- INPUT HANDLING ---
    handleKeyDown(key) {
        console.log(`[Input Check] Key pressed: ${key}, Phase: ${this.state?.phase}, Paused: ${this.state?.isPausedForUI}`);

        if (!this.state?.active || this.state.isPausedForUI) return;

        // Map the raw keycode to our standardized intent
        const intent = KEY_BINDINGS[key] || key;

        // 1. Check for global/debug hotkeys FIRST
        if (intent === 'DEBUG') {
            console.log("Debug View Toggled!");
            events.emit('TOGGLE_BATTLE_DEBUG');
            return;
        }

        // 2. Ignore inputs during processing/animation phases
        const ignorePhases = [PHASE.INTRO, PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT];
        if (ignorePhases.includes(this.state.phase)) return;

        if (intent === 'SUMMARY') {
            this.playConfirmSound('ui_select');
            this._openCharacterSummary();
            return;
        }

        // 3. Delegate to specific menu phases using intents
        if (this.state.phase === PHASE.SELECT_ACTION) {
            this._handleActionSelection(intent);
        } else if (this.state.phase === PHASE.SELECT_TARGET) {
            this._handleTargetSelection(intent);
        }
    }

    _handleActionSelection(intent) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;
        const prevIndex = this.state.menuIndex;

        if (intent === 'RIGHT') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
            if (this.state.menuIndex !== prevIndex) this.playNavSound();
        } 
        else if (intent === 'LEFT') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
            if (this.state.menuIndex !== prevIndex) this.playNavSound();
        } 
        else if (intent === 'CONFIRM') {
            const action = activeChar.abilities[this.state.menuIndex];

            // Verify they have the resources/items to use it from the primary menu
            if (!action.canPayCost(activeChar, InventorySystem)) {
                this.playCancelSound(); // SFX for invalid action
                this.state.message = `Not enough resources to use ${action.name}!`;
                return;
            }

            this.playConfirmSound();
            this._setupTargetSelection(action, activeChar);
        } 
        else if (intent === 'SWAP') {
            this.playConfirmSound('ui_select');
            this.requestPartySwap(false, this.state.activePartyIndex);
        }
    }

    _setupTargetSelection(action, activeChar) {
        this.state.selectedAction = action;
        this.state.selectedTargets = [];

        const scope = action.targeting?.scope || 'enemy';
        const selectMode = action.targeting?.select || 'single';

        // 1. Self bypass
        if (scope === 'self') {
            return this.commitAction(activeChar);
        }

        // 2. Random bypass
        if (selectMode === 'random' || scope.includes('random')) {
            const isPartyTarget = scope.includes('allies') || scope === 'ally';
            const targetPool = isPartyTarget ? this.state.activeParty : this.state.activeEnemies;
            const fallbackTarget = targetPool.find(t => t && !t.isDead()) || activeChar;
            return this.commitAction(fallbackTarget);
        }

        this.state.phase = PHASE.SELECT_TARGET;

        // 3. NEW: Explicitly handle the 'everyone' scope
        if (scope === 'everyone') {
            this.state.targetGroup = 'everyone';
            this.state.message = `Confirm target for ${action.name}`;
            this.state.targetIndex = 'ALL';
            return;
        }

        // 4. Standard Ally/Enemy processing
        const isPartyTarget = scope.includes('allies') || scope === 'ally';
        const targetPool = isPartyTarget ? this.state.activeParty : this.state.activeEnemies;

        this.state.targetGroup = isPartyTarget ? 'party' : 'enemy';

        if (['all_enemies', 'all_allies'].includes(scope)) {
            this.state.message = `Confirm target for ${action.name}`;
            this.state.targetIndex = 'ALL';
        } else {
            this.state.message = `Select a target for ${action.name}`;
            this.state.targetIndex = Math.max(0, targetPool.findIndex(t => t && !t.isDead()));
        }
    }

    _handleTargetSelection(intent) {
        // UNIFY: Keyboard now fetches the exact same pool as the mouse
        const targetArray = this._getTargetsFromGroup();
        const prevIndex = this.state.targetIndex;

        if (this.state.targetIndex === 'ALL') {
            if (intent === 'CONFIRM') {
                this.playConfirmSound('ui_select');
                this.commitAction('ALL');
            } else if (intent === 'CANCEL') {
                this.playCancelSound();
                this._cancelTargetSelection();
            }
            return;
        }

        if (intent === 'DOWN' || intent === 'RIGHT') {
            this.state.targetIndex = this._cycleTarget(targetArray, 1);
            if (this.state.targetIndex !== prevIndex) this.playNavSound();
        } 
        else if (intent === 'UP' || intent === 'LEFT') {
            this.state.targetIndex = this._cycleTarget(targetArray, -1);
            if (this.state.targetIndex !== prevIndex) this.playNavSound();
        } 
        else if (intent === 'CONFIRM') {
            this.playConfirmSound('ui_select');
            this._selectSpecificTarget(targetArray[this.state.targetIndex]);
        } 
        else if (intent === 'CANCEL') {
            this.playCancelSound();
            this._cancelTargetSelection();
        }
    }

    _cycleTarget(targetArray, direction) {
        const count = targetArray.length;
        let nextIndex = this.state.targetIndex;

        for (let i = 0; i < count; i++) {
            nextIndex = (nextIndex + direction + count) % count;
            if (targetArray[nextIndex] && !targetArray[nextIndex].isDead()) return nextIndex;
        }
        return this.state.targetIndex;
    }

    _selectSpecificTarget(target) {
        if (!target || target.isDead()) return;

        const targeting = this.state.selectedAction.targeting || {};
        if (targeting.select !== 'multiple') {
            return this.commitAction(target);
        }

        const requiredCount = targeting.count || 1;
        this.state.selectedTargets.push(target);

        if (this.state.selectedTargets.length >= requiredCount) {
            this.commitAction([...this.state.selectedTargets]);
            this.state.selectedTargets = [];
        } else {
            this.state.message = `Select target ${this.state.selectedTargets.length + 1} of ${requiredCount} for ${this.state.selectedAction.name}`;
        }
    }

    _cancelTargetSelection() {
        if (this.state.selectedTargets?.length > 0) {
            this.state.selectedTargets.pop();
            const requiredCount = this.state.selectedAction.targeting?.count || 1;
            this.state.message = `Select target ${this.state.selectedTargets.length + 1} of ${requiredCount} for ${this.state.selectedAction.name}`;
            return;
        }

        this.state.phase = PHASE.SELECT_ACTION;
        this.state.selectedAction = null;
        this.state.targetGroup = null;
        this.state.selectedTargets = [];
    }

    // --- PARTY SWAP LOGIC ---
    requestPartySwap(isForced = false, slotIndex = -1) {
        const activeIndices = this.state.activeParty
            .map(p => p ? this.state.partyRoster.indexOf(p) : -1)
            .filter(i => i !== -1);

        this.state.turnQueue.forEach(turn => {
            if (turn.type === TURN_TYPES.REINFORCEMENT && turn.team === 'party' && turn.replacement) {
                const pendingIndex = this.state.partyRoster.indexOf(turn.replacement);
                if (pendingIndex !== -1 && !activeIndices.includes(pendingIndex)) {
                    activeIndices.push(pendingIndex);
                }
            }
        });

        this.state.isPausedForUI = true;

        events.emit('REQUEST_PARTY_SWAP', {
            mode: 'BATTLE_SELECT',
            activeIndices: activeIndices,
            callback: (selectedRosterIndex) => {
                this.state.isPausedForUI = false;
                if (selectedRosterIndex === null || selectedRosterIndex === undefined) {
                    if (isForced) this.requestPartySwap(isForced, slotIndex);
                    return;
                }
                this._executeSwap(selectedRosterIndex, isForced, slotIndex);
            }
        });
    }

    _executeSwap(selectedRosterIndex, isForced, slotIndex) {
        const replacement = this.state.partyRoster[selectedRosterIndex];

        if (isForced) {
            this.state.turnQueue.unshift({
                type: TURN_TYPES.ANIMATION,
                actor: replacement,
                animationId: 'enter_battle',
                soundId: replacement.crySound,
                duration: 1.0
            });
            this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: `${replacement.name} steps into the fray!` });
            this.state.turnQueue.unshift({ type: TURN_TYPES.REINFORCEMENT, team: 'party', slotIndex, replacement });
        } else {
            const activeChar = this.state.activeParty[slotIndex];
            const swapSpeed = (activeChar.stats?.speed ?? 10) + (slotIndex * 0.001);

            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: `${activeChar.name} falls back...`, speedOverride: swapSpeed, swapSequenceOrder: 1, swapInitiator: activeChar });
            this.state.turnQueue.push({ type: TURN_TYPES.ANIMATION, actor: activeChar, animationId: 'retreat', duration: 1.0, speedOverride: swapSpeed, swapSequenceOrder: 2, swapInitiator: activeChar });
            this.state.turnQueue.push({ type: TURN_TYPES.REINFORCEMENT, team: 'party', slotIndex, replacement, speedOverride: swapSpeed, swapSequenceOrder: 3, swapInitiator: activeChar });
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: `${replacement.name} steps into the fray!`, speedOverride: swapSpeed, swapSequenceOrder: 4, swapInitiator: activeChar });
            this.state.turnQueue.push({ type: TURN_TYPES.ANIMATION, actor: replacement, animationId: 'enter_battle', soundId: replacement.crySound, duration: 1.0, speedOverride: swapSpeed, swapSequenceOrder: 5, swapInitiator: activeChar });

            this._advancePartyTurn();
        }
    }

    // --- TURN QUEUING LOGIC ---
    commitAction(primaryTarget) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];

        if (!this.state.selectedAction.canPayCost(activeChar, InventorySystem)) {
            console.warn(`[BattleController] commitAction aborted: Cost check failed for ${this.state.selectedAction.name}`);
            return;
        }

        this.state.turnQueue.push({
            actor: activeChar,
            action: this.state.selectedAction,
            target: primaryTarget
        });

        this._advancePartyTurn();
    }

    _advancePartyTurn() {
        do {
            this.state.activePartyIndex++;
        } while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())
        );

        if (this.state.activePartyIndex < this.state.activeParty.length) {
            this.state.phase = PHASE.SELECT_ACTION;
            this.state.menuIndex = 0;
            this.state.selectedAction = null;
        } else {
            this._queueEnemyActions();
            this._sortTurnQueue();
            this.state.phase = PHASE.RESOLVE;
            this.state.message = "Turns Processing...";
            this.timer = 0;
        }
    }

    getActivePool(team) {
        return team === 'party' ? this.state.activeParty : this.state.activeEnemies;
    }

    handleFlee(actor) {
        this.state.fled = true;
        this.state.turnQueue = [
            { type: TURN_TYPES.MESSAGE_STATUS, message: `${actor.name}'s party escapes!` },
            { type: TURN_TYPES.BATTLE_END }
        ];
    }

    _queueEnemyActions() {
        const livingParty = this.state.activeParty.filter(p => p && !p.isDead());
        if (livingParty.length === 0) return;

        this.state.activeEnemies.forEach(enemy => {
            if (!enemy || enemy.isDead()) return;

            const validAbilities = enemy.abilities.filter(a =>
                a.canPayCost(enemy, InventorySystem) && !['rest', 'punch'].includes(a.id)
            );

            const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];

            if (validAbilities.length > 0) {
                const action = validAbilities[Math.floor(Math.random() * validAbilities.length)];
                return this.state.turnQueue.push({ actor: enemy, action, target: randomTarget });
            }

            const punch = enemy.abilities.find(a => a.id === 'punch' && a.canPayCost(enemy, InventorySystem));
            if (punch) {
                return this.state.turnQueue.push({ actor: enemy, action: punch, target: randomTarget });
            }

            const restAction = AbilityFactory.createAbilities(['rest'])[0];
            this.state.turnQueue.push({ actor: enemy, action: restAction, target: enemy });
        });
    }

    _sortTurnQueue() {
        this.state.turnQueue.sort((a, b) => {
            const speedA = a.speedOverride ?? ((a.actor?.stats?.speed ?? 10) * (a.action?.speedModifier ?? 1));
            const speedB = b.speedOverride ?? ((b.actor?.stats?.speed ?? 10) * (b.action?.speedModifier ?? 1));

            if (speedA !== speedB) {
                return speedB - speedA;
            }

            const orderA = a.swapSequenceOrder ?? 99;
            const orderB = b.swapSequenceOrder ?? 99;
            return orderA - orderB;
        });
    }

    // --- MAIN TICK ---
    update(dt) {
        if (!this.state?.active || this.state.isPausedForUI) return;
        this.state.timer = this.timer;

        if (this.state.phase === PHASE.INTRO) {
            this.timer += dt;
            if (this.timer > 1.5) this._startActionPhase();
            return;
        }

        if ([PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT].includes(this.state.phase)) {
            this.timer += dt;
            const waitTime = this.state.activeAnimation?.duration ?? 1.5;

            if (this.timer >= waitTime) {
                if (this.state.activeAnimation) {
                    const finishedAnim = this.state.activeAnimation;
                    if (finishedAnim.id === 'enter_battle' && finishedAnim.actor) {
                        finishedAnim.actor.hasEnteredBattle = true;
                    }
                    if (finishedAnim.id === 'retreat' && finishedAnim.actor) {
                        finishedAnim.actor.hasEnteredBattle = false;
                    }
                    this.state.activeAnimation = null;
                }
                this.timer = 0;
                this.state.timer = 0;
                this.turnManager.processNextTurnInQueue();
            }
        }
    }

    _startActionPhase() {
        this.state.menuIndex = 0;
        this.state.activePartyIndex = 0;
        this.state.turnQueue = [];
        this.timer = 0;

        while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())
        ) {
            this.state.activePartyIndex++;
        }

        if (this.state.activePartyIndex >= this.state.activeParty.length) {
            this._queueEnemyActions();
            this._sortTurnQueue();
            this.state.phase = PHASE.RESOLVE;
            this.state.message = "Turns Processing...";
            return;
        }

        this.state.phase = PHASE.SELECT_ACTION;
        this.state.message = "What will you do? [P] for Party";
    }

    handleDeath(combatant) {
        if (combatant._deathHandled) return;
        combatant._deathHandled = true;

        // Remove pending actions and abort pending swaps
        this.state.turnQueue = this.state.turnQueue.filter(turn =>
            turn.actor !== combatant && turn.swapInitiator !== combatant
        );

        const isParty = combatant.team === 'party';
        const activeArray = isParty ? this.state.activeParty : this.state.activeEnemies;
        const rosterArray = isParty ? this.state.partyRoster : this.state.enemyRoster;
        const slotIndex = activeArray.indexOf(combatant);

        // --- 4. Queue Reinforcements (Executes LAST) ---
        if (slotIndex !== -1) {
            const livingReserves = rosterArray.filter(member =>
                !member.isDead() &&
                !activeArray.includes(member) &&
                !this.state.turnQueue.some(turn => turn.replacement === member)
            );

            if (livingReserves.length > 0) {
                if (isParty) {
                    this.state.turnQueue.unshift({ type: TURN_TYPES.PROMPT_REINFORCEMENT, slotIndex });
                } else {
                    const replacement = livingReserves[0];
                    // Step 4b: Enter Battle Animation
                    this.state.turnQueue.unshift({ type: TURN_TYPES.ANIMATION, actor: replacement, animationId: 'enter_battle', soundId: replacement.crySound, duration: 1.0 });
                    // Step 4a: Joins Battle Message
                    this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: `${replacement.name} joins the battle!` });
                    // Data Swap happens silently right before the entrance
                    this.state.turnQueue.unshift({ type: TURN_TYPES.REINFORCEMENT, team: 'enemy', slotIndex, replacement });
                }
            }
        }

        // --- 3. Queue the Faint Animation ---
        this.state.turnQueue.unshift({
            type: TURN_TYPES.ANIMATION,
            actor: combatant,
            animationId: 'faint',
            soundId: combatant.deathSound,
            duration: 1.0
        });

        // --- 2. Queue Death Traits (Executes right after the slain message) ---
        this._queueDeathTraits(combatant);

        // --- 1. Queue the Death Message (Executes FIRST) ---
        // Unshifting this absolute last guarantees it sits at index 0 of the queue
        this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: `${combatant.name} has been slain!` });
    }

    checkBattleStatus() {
        const enemiesAlive = this.state.enemyRoster.some(e => !e.isDead());
        const partyAlive = this.state.partyRoster.some(p => !p.isDead());

        if (!enemiesAlive) this._handleVictory();
        else if (!partyAlive) this._handleDefeat();
        else {
            this._applyRoundEndRecovery();
            this._startActionPhase();
        }
    }

    _applyRoundEndRecovery() {
        const activeCombatants = [
            ...this.state.activeParty,
            ...this.state.activeEnemies
        ].filter(c => c && !c.isDead());

        activeCombatants.forEach(c => {
            c.modifyResource('stamina', c.stats?.staminaRecovery ?? 200);
            c.modifyResource('insight', c.stats?.insightRecovery ?? 100);
            if ((c.stats?.hpRecovery ?? 0) > 0) c.modifyResource('hp', c.stats.hpRecovery);
        });
    }

    // --- POST-BATTLE ---
    _handleVictory() {
        this.state.phase = PHASE.VICTORY;
        this.state.turnQueue = [];

        const rewardMessages = BattleRewardSystem.processVictory(
            this.state.partyRoster,
            this.state.enemyRoster
        );

        rewardMessages.forEach(msg => {
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: msg });
        });

        this.state.turnQueue.push({ type: TURN_TYPES.BATTLE_END });
    }

    _handleDefeat() {
        this.state.phase = PHASE.DEFEAT;
        this.state.turnQueue = [
            { type: TURN_TYPES.MESSAGE_DEFEAT, message: `The party has fallen in battle...` },
            { type: TURN_TYPES.BATTLE_END }
        ];
    }

    endBattle() {
        this.state.partyRoster.forEach(combatant => {
            combatant.originalEntity.hp = combatant.hp;
            combatant.originalEntity.stamina = combatant.stamina;
            combatant.originalEntity.insight = combatant.insight;

            // Standard cleanup for temporary combat effects
            const effectsToRemove = combatant.originalEntity.statusEffects
                .filter(effect => !effect.persistAfterCombat)
                .map(effect => effect.id);

            // Explicitly ensure the weather status effect is stripped
            if (this.state.weather && this.state.weather.appliedStatusId) {
                if (!effectsToRemove.includes(this.state.weather.appliedStatusId)) {
                    effectsToRemove.push(this.state.weather.appliedStatusId);
                }
            }

            effectsToRemove.forEach(effectId => combatant.originalEntity.removeStatusEffect(effectId));
        });

        this.state.active = false;
        events.emit('BATTLE_ENDED', {
            victory: this.state.partyRoster.some(p => !p.isDead()),
            fled: !!this.state.fled
        });
    }

    _openCharacterSummary() {
        console.log("Character Summary Toggled!");
        events.emit('TOGGLE_CHARACTER_SUMMARY', {
            combatant: this.state.activeParty[this.state.activePartyIndex],
            phase: this.state.phase,
            onItemSelected: (payload) => {
                const { itemId, abilityId } = payload;
                const [action] = AbilityFactory.createAbilities([abilityId]);
                const activeChar = this.state.activeParty[this.state.activePartyIndex];

                if (action) {
                    if (itemId) {
                        action.cost = { item: itemId, amount: 1 };
                        action.isItemAction = true;
                    }

                    const inventory = InventorySystem;
                    console.log("Checking inventory:", inventory);

                    if (!action.canPayCost(activeChar, inventory)) {
                        this.state.message = `Cannot use ${action.name}!`;
                        console.warn("Cost check failed! Kicking back to menu.");
                    } else {
                        console.log("Cost check PASSED! Moving to target selection.");
                        this._setupTargetSelection(action, activeChar);
                        this.state.isPausedForUI = false;
                    }
                }
                events.emit('CHANGE_SCENE', { scene: 'battle' });
            }
        });
    }

    // --- NEW: Dump raw objects for inspection ---
    _dumpCombatantObjects(phaseName) {
        console.log(`\n=== [DEBUG] OBJECT DUMP: ${phaseName} ===`);
        const allCombatants = [...this.state.partyRoster, ...this.state.enemyRoster];
        allCombatants.forEach((c, i) => {
            if (c) {
                console.log(`[${c.team.toUpperCase()}] ${c.name || 'Unknown'} object:`, c);
            }
        });
        console.log(`==========================================\n`);
    }

    getState() {
        if (!this.state) return null;

        // --- INJECT PIPELINE STATE ---
        return {
            ...this.state,
            mouse: this.mouse,
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
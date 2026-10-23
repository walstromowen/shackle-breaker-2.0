import { AbilityFactory } from '../../../../shared/abilities/abilityFactory.js';
import { events } from '../../../../shared/core/eventBus.js';
import { TurnManager } from '../../../../shared/battle/turnManager.js';
import { PHASE, TURN_TYPES } from '../../../../shared/battle/battleConstants.js';
import { createBattleState, applyRoundEndRecovery, commitBattleResults, registerStatusApplication } from '../../../../shared/battle/battleState.js';
import { queueOpeningSequence, queueSwap, queueVictory, queueDefeat, sortTurnQueue } from '../../../../shared/battle/battleQueue.js';
import { queueEnemyActions } from '../../../../shared/battle/enemyAI.js';
import { InventorySystem } from '../../../../shared/items/inventorySystem.js';
import { QuestSystem } from '../../../../shared/story/questSystem.js';
import { BaseController } from '../../engine/baseController.js';
import { TargetSelection } from './targetSelection.js';

// The battle's own keys, on top of the shared ones (arrows / WASD, Enter / Space, Esc / Backspace / Tab)
const BATTLE_KEYS = {
    'KeyP': 'SWAP',
    'KeyI': 'SUMMARY',
    'KeyC': 'DEBUG',
    'ShiftLeft': 'TOGGLE_DETAILS', 'ShiftRight': 'TOGGLE_DETAILS',
    'KeyH': 'TOGGLE_DETAILS'
};

/* The battle screen's brain: reads the player's keys and mouse, keeps the battle moving from phase to phase, and hands everything else on.
     the rules and the turn queue ........ shared/battle (battleState, battleQueue, enemyAI, turnManager, targetingResolver)
     choosing a target ................... targetSelection.js (next to this file)
     what is drawn ....................... battleRenderer.js, battleHUDRenderer.js and the other renderers in this folder */
export class BattleController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        this.extraBindings = BATTLE_KEYS;
        // Backing out only means something while picking a target; every other right-click is silent
        this.cancelSfxOnRightClick = false;
        this.config = config;
        this.state = null;
        this.timer = 0;
        this.turnManager = new TurnManager(this);
        this.targeting = new TargetSelection(this);

        // ENEMY_KILLED (emitted by queueDeath, shared/battle/battleQueue.js) only advances a quest if the QuestSystem is listening. init() is idempotent.
        QuestSystem.init();
        this.lastHoveredHitboxId = null;

        // Statuses announce themselves on the event bus (combatantModel.js); the ledger keeps them for the trait checks after a win
        events.on('ON_STATUS_APPLIED', (data) => {
            // Make sure we are currently in a battle with a ledger before recording
            if (this.state && this.state.battleLedger) {
                registerStatusApplication(this.state, data.status, data.actor, data.target);
            }
        });
    }

    start(enemies, context = {}) {
        this.state = createBattleState(enemies, context);

        const preBattleActionsQueued = queueOpeningSequence(this.state);

        if (preBattleActionsQueued) {
            // Entrances, weather and pre-battle traits play out as a "round" of their own; when that queue empties, checkBattleStatus runs.
            // That is not the end of a real round, so it must not hand out recovery: recovery only starts after the first round has been fought.
            this._preBattleResolving = true;
            this.state.phase = PHASE.RESOLVE;
        } else {
            this._startActionPhase();
        }

        this.timer = 0;
    }

    // The keyboard cursor, as a hitbox id: the highlighted ability while choosing an action, the aimed target while choosing a target.
    // (An "all targets" ability has no single aimed card; the shards over the combatants show the whole group.)
    getKeyboardFocusId() {
        const s = this.state;
        if (!s || !s.active || s.isPausedForUI) return null;

        if (s.phase === PHASE.SELECT_ACTION) return `ACTION_${s.menuIndex}`;

        if (s.phase === PHASE.SELECT_TARGET) return this.targeting.keyboardFocusId();
        return null;
    }

    // The mouse moved onto something: the cursor follows it (silent; UIInteractionManager adds the hover tick).
    // Returns false for things that cannot be picked right now, so hovering them is silent too.
    setFocusFromPointer(hitboxId) {
        if (!hitboxId || this.state?.isPausedForUI || !this.state?.active) return false;

        if (this.state.phase === PHASE.SELECT_ACTION) {
            if (hitboxId.startsWith('ACTION_')) {
                this.state.menuIndex = parseInt(hitboxId.split('_')[1], 10);
            } else if (hitboxId !== 'BUTTON_PARTY' && hitboxId !== 'BUTTON_INVENTORY') {
                return false;
            }
        } else if (this.state.phase === PHASE.SELECT_TARGET && hitboxId.startsWith('TARGET_')) {
            if (!this.targeting.isValidTargetHitbox(hitboxId)) return false;
            if (this.state.targetIndex === 'ALL') return;

            const target = this.targeting.targetFromHitbox(hitboxId);
            this.state.targetIndex = this.targeting.targetsFromGroup().indexOf(target);
        } else {
            return false;
        }
    }

    onClick(hitboxId) {
        if (!hitboxId || this.state?.isPausedForUI || !this.state?.active) return;

        if (this.state.phase === PHASE.SELECT_ACTION && hitboxId.startsWith('ACTION_')) {
            this.state.menuIndex = parseInt(hitboxId.split('_')[1], 10);
            this._handleActionSelection('CONFIRM');
        } else if (this.state.phase === PHASE.SELECT_TARGET && hitboxId.startsWith('TARGET_')) {
            if (this.state.targetIndex === 'ALL') {
                if (this.targeting.isValidTargetHitbox(hitboxId)) {
                    this.targeting.handleIntent('CONFIRM');
                }
            } else if (this.targeting.isValidTargetHitbox(hitboxId)) {
                const target = this.targeting.targetFromHitbox(hitboxId);
                const validTargets = this.targeting.targetsFromGroup();
                this.state.targetIndex = validTargets.indexOf(target);
                this.targeting.handleIntent('CONFIRM');
            }
        } else if (this.state.phase === PHASE.SELECT_ACTION) {
            if (hitboxId === 'BUTTON_PARTY') {
                this.playConfirmSound();
                this.requestPartySwap(false, this.state.activePartyIndex);
            } else if (hitboxId === 'BUTTON_INVENTORY') {
                this.playConfirmSound();
                this._openCharacterSummary();
            }
        }
    }

    onRightClick(hitboxId) {
        if (this.state?.isPausedForUI || !this.state?.active) return false;
        if (this.state.phase === PHASE.SELECT_TARGET) {
            this.targeting.handleIntent('CANCEL'); // plays the cancel sound
            return;
        }
        return false; // nothing to back out of
    }

    handleKeyDown(key, e) {
        const intent = this.resolveIntent(key, e); // also hands control to the keyboard
        if (!intent) return;

        if (!this.state?.active || this.state.isPausedForUI) return;

        if (intent === 'DEBUG') {
            console.log("Debug View Toggled!");
            events.emit('TOGGLE_BATTLE_DEBUG');
            return;
        }

        const ignorePhases = [PHASE.INTRO, PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT];
        if (ignorePhases.includes(this.state.phase)) return;

        if (intent === 'SUMMARY') {
            this.playConfirmSound();
            this._openCharacterSummary();
            return;
        }

        if (this.state.phase === PHASE.SELECT_ACTION) {
            this._handleActionSelection(intent);
        } else if (this.state.phase === PHASE.SELECT_TARGET) {
            this.targeting.handleIntent(intent);
        }
    }

    _handleActionSelection(intent) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;
        const prevIndex = this.state.menuIndex;

        if (intent === 'RIGHT') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
            if (this.state.menuIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'LEFT') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
            if (this.state.menuIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'TOGGLE_DETAILS') {
            this.state.showAbilityDetails = !this.state.showAbilityDetails;
            this.playNavSound();
        } else if (intent === 'CONFIRM') {
            const action = activeChar.abilities[this.state.menuIndex];
            if (typeof action.usableIn === 'function' && !action.usableIn('battle')) { // last line of defence; the menu should never list one
                this.playErrorSound();
                this.state.message = `${action.name} can't be used in battle!`;
                return;
            }
            if (!action.canPayCost(activeChar, InventorySystem)) {
                this.playErrorSound();
                this.state.message = `Not enough resources to use ${action.name}!`;
                return;
            }
            this.playConfirmSound();
            this.targeting.setup(action, activeChar);
        } else if (intent === 'SWAP') {
            this.playConfirmSound();
            this.requestPartySwap(false, this.state.activePartyIndex);
        }
    }

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
                // ---> THE FIX: Guard against UI double-clicks! <---
                // If it's already false, this callback has already been handled.
                if (!this.state.isPausedForUI) return; 
                
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
        queueSwap(this.state, this.state.partyRoster[selectedRosterIndex], isForced, slotIndex);
        if (!isForced) this._advancePartyTurn();
    }

    commitAction(primaryTarget) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        if (!this.state.selectedAction.canPayCost(activeChar, InventorySystem)) {
            return;
        }
        this.state.turnQueue.push({ actor: activeChar, action: this.state.selectedAction, target: primaryTarget });
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
            queueEnemyActions(this.state);
            sortTurnQueue(this.state);
            this.state.phase = PHASE.RESOLVE;
            this.state.message = "Turns Processing...";
            this.timer = 0;
        }
    }

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
        this.state.showAbilityDetails = true;

        while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())
        ) {
            this.state.activePartyIndex++;
        }

        if (this.state.activePartyIndex >= this.state.activeParty.length) {
            queueEnemyActions(this.state);
            sortTurnQueue(this.state);
            this.state.phase = PHASE.RESOLVE;
            this.state.message = "Turns Processing...";
            return;
        }

        this.state.phase = PHASE.SELECT_ACTION;
        this.state.message = "What will you do? [P] for Party";
    }

    checkBattleStatus() {
        const enemiesAlive = this.state.enemyRoster.some(e => !e.isDead());
        const partyAlive = this.state.partyRoster.some(p => !p.isDead());

        if (!enemiesAlive) this._handleVictory();
        else if (!partyAlive) this._handleDefeat();
        else {
            if (this._preBattleResolving) this._preBattleResolving = false;   // the opening sequence just finished: no recovery yet
            else applyRoundEndRecovery(this.state);
            this._startActionPhase();
        }
    }

    _handleVictory() {
        this.state.phase = PHASE.VICTORY;
        queueVictory(this.state);
    }

    _handleDefeat() {
        this.state.phase = PHASE.DEFEAT;
        queueDefeat(this.state);
    }

    endBattle() {
        const victory = commitBattleResults(this.state);
        this.state.active = false;
        events.emit('BATTLE_ENDED', { victory, fled: !!this.state.fled });
    }

    _openCharacterSummary() {
        events.emit('TOGGLE_CHARACTER_SUMMARY', {
            combatant: this.state.activeParty[this.state.activePartyIndex],
            phase: this.state.phase,
            onItemSelected: (payload) => {
                const { itemId, abilityId } = payload;
                const [action] = AbilityFactory.createAbilities([abilityId]);
                const activeChar = this.state.activeParty[this.state.activePartyIndex];

                if (action && !action.usableIn('battle')) { // an overworld-only item (a torch) must not be spent here
                    this.state.message = `${action.name} can't be used in battle!`;
                } else if (action) {
                    if (itemId) {
                        action.cost = { item: itemId, amount: 1 };
                        action.isItemAction = true;
                    }
                    if (!action.canPayCost(activeChar, InventorySystem)) {
                        this.state.message = `Cannot use ${action.name}!`;
                    } else {
                        this.targeting.setup(action, activeChar);
                        this.state.isPausedForUI = false;
                    }
                }
                events.emit('CHANGE_SCENE', { scene: 'battle' });
            }
        });
    }

    getState() {
        if (!this.state) return null;
        return {
            ...this.state,
            mouse: this.mouse,
            // The one lit element: what the mouse is over, or the keyboard cursor (ACTION_n / TARGET_...)
            hoveredElement: this.getFocusId() ? { id: this.getFocusId() } : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}
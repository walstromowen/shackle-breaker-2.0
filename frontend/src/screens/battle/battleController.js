import { revertExpiredForms } from '../../../../shared/battle/summons.js';
import { AbilityFactory } from '../../../../shared/abilities/abilityFactory.js';
import { events } from '../../../../shared/core/eventBus.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { TurnManager } from '../../../../shared/battle/turnManager.js';
import { PHASE, TURN_TYPES } from '../../../../shared/battle/battleConstants.js';
import { createBattleState, applyRoundEndRecovery, commitBattleResults, registerStatusApplication, noEscapeMessage, stripNonBattleAbilities } from '../../../../shared/battle/battleState.js';
import { CombatantModel } from '../../../../shared/battle/combatantModel.js';
import { serializeEntity, hydrateEntity } from '../../engine/saveManager.js';
import { queueOpeningSequence, queueSwap, queueVictory, queueDefeat, sortTurnQueue } from '../../../../shared/battle/battleQueue.js';
import { queueEnemyActions } from '../../../../shared/battle/enemyAI.js';
import { InventorySystem } from '../../../../shared/items/inventorySystem.js';
import { QuestSystem } from '../../../../shared/story/questSystem.js';
import { BaseController } from '../../engine/baseController.js';
import { TargetSelection } from './targetSelection.js';
import { seedRandom, unseedRandom, withoutSeed, getRandomState, setRandomState } from '../../../../shared/core/random.js';
import { multiplayerSocial } from '../../engine/multiplayerSocial.js';
import { multiplayer } from '../../engine/multiplayerClient.js';

/* A shared multiplayer fight (a duel, or a party of several players): every player's browser plays the same battle from the same seed
   (shared/core/random.js). Each player picks for their own characters only; the others' picks arrive as messages (MP_BATTLE_DECISION),
   and the round plays out once every pick is in. The lead browser sends the true health of everyone at each round's start (MP_BATTLE_SYNC),
   so a slip anywhere is put right. */
const WAIT_REMOTE = 'WAIT_REMOTE';

// The battle's own keys, on top of the shared ones (arrows / WASD, Enter / Space, Esc / Backspace / Tab)
const BATTLE_KEYS = {
    'KeyP': 'SWAP',
    'KeyI': 'SUMMARY',
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

        events.on('MP_BATTLE_DECISION', (d) => this._onRemoteDecision(d));
        events.on('MP_BATTLE_SYNC', (d) => this._onRemoteSync(d));
        // a player of this shared fight was busy elsewhere (or has left): stop waiting for their fighters' picks
        events.on('MP_BATTLE_DECLINE', () => this._tryResolveShared());
        events.on('MP_BATTLE_ADD', (d) => this._onRemoteAdd(d));   // a player let into the fight: their characters join the line-up

        // Statuses announce themselves on the event bus (combatantModel.js); the ledger keeps them for the trait checks after a win
        events.on('ON_STATUS_APPLIED', (data) => {
            // Make sure we are currently in a battle with a ledger before recording
            if (this.state && this.state.battleLedger) {
                registerStatusApplication(this.state, data.status, data.actor, data.target);
            }
        });
    }

    start(enemies, context = {}) {
        if (context.mp) seedRandom(context.mp.seed); else unseedRandom();
        this.state = createBattleState(enemies, context);
        this._mySwaps = [];   // a shared fight: my swaps this round, held until every pick is in (_settleSwaps)
        this._awaitReinforce = null;   // a shared fight: waiting for another player's pick of who steps in for their fallen fighter
        this._reinforceIn = new Map(); // ... and those picks as they come (one can come before this screen gets there)
        if (context.mp) this._setupShared(context.mp);
        // let into a fight in progress (multiplayerSocial bt_join): it stands as the leader's screen had it at the start of this round
        if (context.mp && context.mp.resume) { this._resumeFrom(context.mp.resume); this.timer = 0; return; }

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
        if (this._canUndoPick()) { this.undoLastPick(); return; }
        return false; // nothing to back out of
    }

    handleKeyDown(key, e) {
        const intent = this.resolveIntent(key, e); // also hands control to the keyboard
        if (!intent) return;

        if (!this.state?.active || this.state.isPausedForUI) return;

        const ignorePhases = [PHASE.INTRO, PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT];
        if (ignorePhases.includes(this.state.phase)) return;

        if (intent === 'SUMMARY') {
            this.playConfirmSound();
            this._openCharacterSummary();
            return;
        }

        if (intent === 'CANCEL' && this._canUndoPick()) { this.undoLastPick(); return; }

        if (this.state.phase === PHASE.SELECT_ACTION) {
            this._handleActionSelection(intent);
        } else if (this.state.phase === PHASE.SELECT_TARGET) {
            this.targeting.handleIntent(intent);
        }
    }

    // ================================================================ TAKING A PICK BACK
    /* Until the round starts, a pick already made can be taken back (Escape / Backspace / right-click while choosing the next fighter's
       action, or while waiting for the other players): the last one first, and that fighter chooses again. In a shared fight the others are
       told (kind 'undo'); a screen that has already started the round with it answers 'undo_late', and the pick is put back here and sent
       again, so every screen plays the same round. */
    _canUndoPick() {
        const s = this.state;
        return !!(s && s.active && !s.isPausedForUI && (this._myPicks || []).length && (s.phase === PHASE.SELECT_ACTION || s.phase === WAIT_REMOTE));
    }

    _recordPick(index, actor, entries, d = null, swap = null) {
        (this._myPicks ||= []).push({ index, actor, entries, d, swap, ability: this.state.selectedAction ? this.state.selectedAction.id : null, round: this.state.mp ? this.state.mp.round : 0 });
    }

    undoLastPick() {
        const s = this.state;
        const pick = (this._myPicks || []).pop();
        if (!pick) return false;
        s.turnQueue = s.turnQueue.filter(t => !pick.entries.includes(t));
        if (pick.swap) this._mySwaps = (this._mySwaps || []).filter(x => x !== pick.swap);
        if (s.mp && pick.d) {
            (this._retracted ||= new Map()).set(`${pick.round}:${pick.d.actor}`, pick);
            multiplayerSocial.sendBattleDecision(s.mp, { round: pick.round, actor: pick.d.actor, kind: 'undo' });
        }
        s.activePartyIndex = pick.index;
        s.phase = PHASE.SELECT_ACTION;
        s.selectedAction = null;
        const again = pick.ability ? pick.actor.abilities.findIndex(a => a.id === pick.ability) : -1;
        s.menuIndex = again >= 0 ? again : 0;
        s.message = `${pick.actor.name} chooses again.`;
        this.playCancelSound();
        return true;
    }

    /** Another screen had already started the round with a pick I took back: it stands. Back in, and sent again (the screens that let it go
     *  take it back), and the fighter's new pick, if one was made, is dropped. */
    _restoreRetracted(round, actorNet) {
        const s = this.state;
        const key = `${round}:${actorNet}`;
        const pick = this._retracted && this._retracted.get(key);
        if (!pick || !s.mp || round !== s.mp.round || s.phase === PHASE.RESOLVE) return;
        this._retracted.delete(key);
        const newer = (this._myPicks || []).find(p => p.actor === pick.actor);
        if (newer) {
            this._myPicks = this._myPicks.filter(p => p !== newer);
            s.turnQueue = s.turnQueue.filter(t => !newer.entries.includes(t));
            if (newer.swap) this._mySwaps = (this._mySwaps || []).filter(x => x !== newer.swap);
        }
        s.turnQueue.push(...pick.entries);
        if (pick.swap) (this._mySwaps ||= []).push(pick.swap);
        this._myPicks.push(pick);
        multiplayerSocial.sendBattleDecision(s.mp, pick.d);
        s.message = `Too late to change ${pick.actor.name}'s action: the round had already begun.`;
        // on to the first of my fighters still without a pick, or wait for the others
        const picked = new Set(this._myPicks.map(p => p.actor));
        const next = s.activeParty.findIndex(c => c && !c.isDead() && this._isMine(c) && !picked.has(c) && !c._charging);
        if (next >= 0) { s.activePartyIndex = next; s.phase = PHASE.SELECT_ACTION; s.selectedAction = null; }
        else this._waitForOthers();
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
            if (this.state.noEscape && typeof action.isFlee === 'function' && action.isFlee()) {
                this.playErrorSound();
                this.state.message = noEscapeMessage(this.state);
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
        const mp = this.state.mp;
        if (!isForced && mp && mp.kind === 'duel') {   // a duel is fought with what is on the field
            this.playErrorSound();
            this.state.message = 'No swapping in a duel.';
            return;
        }
        // a shared fight, a fighter has fallen: their owner picks who steps in; everyone else waits for that pick
        if (isForced && mp) {
            const fallen = this.state.activeParty[slotIndex];
            const owner = fallen && fallen.netOwner;
            if (owner !== mp.me) {
                const key = `${slotIndex}:${fallen ? fallen.netId : ''}`;
                this._awaitReinforce = { key, slotIndex, owner, t: 0 };
                const here = multiplayerSocial.partyHere(mp.players);
                if (!owner || !here.includes(owner)) { this._applyReinforce(null); return; }   // their owner has left: the first one standing
                this.state.message = `Waiting for ${(mp.names || {})[owner] || 'your ally'} to choose who steps in…`;
                const early = this._reinforceIn.get(key);
                if (early) this._applyReinforce(early);
                return;
            }
        }
        const activeIndices = this.state.activeParty
            .map(p => p ? this.state.partyRoster.indexOf(p) : -1)
            .filter(i => i !== -1);
        // a shared fight: the reserves are the whole line-up (every player's characters); one another player (or I) already called in this
        // round is taken
        if (mp) {
            const called = [...(this._mySwaps || []).map(x => x.d.replacement)];
            for (const [key, d] of mp.decisions || []) if (key.startsWith(`${mp.round}:`) && d && d.kind === 'swap') called.push(d.replacement);
            for (const id of called) { const i = this.state.partyRoster.indexOf(this.byNet.get(id)); if (i !== -1 && !activeIndices.includes(i)) activeIndices.push(i); }
        }

        this.state.turnQueue.forEach(turn => {
            if (turn.type === TURN_TYPES.REINFORCEMENT && turn.team === 'party' && turn.replacement) {
                const pendingIndex = this.state.partyRoster.indexOf(turn.replacement);
                if (pendingIndex !== -1 && !activeIndices.includes(pendingIndex)) {
                    activeIndices.push(pendingIndex);
                }
            }
        });

        // who can step in: standing, not on the field, not already called in (by me or, in a shared fight, by another player this round). Nobody at all (in a shared fight another player may have called the last reserve in this very
        // round): no question is asked, the slot stays empty and the fight goes on, rather than a pick nobody can make
        const pickable = this.state.partyRoster.map((c, i) => !c.isDead() && !activeIndices.includes(i));
        if (!pickable.some(Boolean)) {
            if (!isForced) { this.playErrorSound(); this.state.message = 'There is no one to swap in.'; return; }
            if (mp) multiplayerSocial.sendBattleDecision(mp, { round: mp.round, kind: 'reinforce', key: `${slotIndex}:${this.state.activeParty[slotIndex]?.netId || ''}`, replacement: null, none: true });
            this.state.isPausedForUI = false;
            return;
        }
        this.state.isPausedForUI = true;
        
        events.emit('REQUEST_PARTY_SWAP', { 
            mode: 'BATTLE_SELECT', 
            activeIndices: activeIndices, 
            pickable,
            // the cards are the fight's roster (in a shared fight: the line-up, with whose each character is)
            members: this.state.partyRoster.map(c => c.originalEntity),
            owners: mp ? this.state.partyRoster.map(c => (mp.names || {})[c.netOwner] || '') : null,
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

    /** A shared fight: the pick of who steps into a fallen fighter's place came from its owner (null: nobody answered, the first one standing). */
    _applyReinforce(d) {
        const s = this.state, w = this._awaitReinforce;
        if (!s || !w) return;
        this._awaitReinforce = null;
        if (d && d.none) { s.isPausedForUI = false; return; }   // its owner had nobody to send in: the slot stays empty on every screen
        const free = (c) => c && !c.isDead() && !s.activeParty.includes(c) && !s.turnQueue.some(t => t.replacement === c);
        let replacement = d ? this.byNet.get(d.replacement) : null;
        if (!free(replacement)) replacement = s.partyRoster.find(free) || null;
        s.isPausedForUI = false;
        if (replacement) this._executeSwap(s.partyRoster.indexOf(replacement), true, w.slotIndex);
    }

    _executeSwap(selectedRosterIndex, isForced, slotIndex) {
        const replacement = this.state.partyRoster[selectedRosterIndex];
        // a shared fight: my pick for my fallen fighter's place goes to the others, who are waiting for it
        if (this.state.mp && isForced) {
            const fallen = this.state.activeParty[slotIndex];
            multiplayerSocial.sendBattleDecision(this.state.mp, { round: this.state.mp.round, kind: 'reinforce', key: `${slotIndex}:${fallen ? fallen.netId : ''}`, replacement: replacement?.netId });
        }
        if (this.state.mp && !isForced) {
            // a shared fight: sent, and kept until every pick is in, so every screen settles the swaps in the same order (_tryResolveShared)
            const d = { round: this.state.mp.round, actor: this.state.activeParty[slotIndex]?.netId, kind: 'swap', replacement: replacement?.netId, slotIndex };
            multiplayerSocial.sendBattleDecision(this.state.mp, d);
            const swap = { actor: this.state.activeParty[slotIndex], d };
            (this._mySwaps ||= []).push(swap);
            this.state.selectedAction = null;
            this._recordPick(slotIndex, this.state.activeParty[slotIndex], [], d, swap);
            this._advancePartyTurn();
            return;
        }
        const before = new Set(this.state.turnQueue);
        const actorBefore = this.state.activeParty[slotIndex];
        queueSwap(this.state, replacement, isForced, slotIndex);
        if (!isForced) {
            this.state.selectedAction = null;
            this._recordPick(slotIndex, actorBefore, this.state.turnQueue.filter(t => !before.has(t)));
            this._advancePartyTurn();
        }
    }

    commitAction(primaryTarget) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        if (!this.state.selectedAction.canPayCost(activeChar, InventorySystem)) {
            return;
        }
        const entry = { actor: activeChar, action: this.state.selectedAction, target: primaryTarget };
        this.state.turnQueue.push(entry);
        let d = null;
        if (this.state.mp) {
            const action = this.state.selectedAction;
            d = {
                round: this.state.mp.round, actor: activeChar.netId, kind: 'act', ability: action.id,
                item: action.isItemAction && action.cost ? action.cost.item : null, target: this._encodeTarget(primaryTarget)
            };
            multiplayerSocial.sendBattleDecision(this.state.mp, d);
        }
        this._recordPick(this.state.activePartyIndex, activeChar, [entry], d);
        this._advancePartyTurn();
    }

    _advancePartyTurn() {
        do {
            this.state.activePartyIndex++;
        } while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead() || !this._isMine(this.state.activeParty[this.state.activePartyIndex]) || this.state.activeParty[this.state.activePartyIndex]._charging)
        );

        if (this.state.activePartyIndex < this.state.activeParty.length) {
            this.state.phase = PHASE.SELECT_ACTION;
            this.state.menuIndex = 0;
            this.state.selectedAction = null;
        } else if (this.state.mp) {
            this._waitForOthers();
        } else {
            queueEnemyActions(this.state);
            sortTurnQueue(this.state);
            this.state.phase = PHASE.RESOLVE;
            this.state.message = "Turns Processing...";
            this.timer = 0;
        }
    }

    update(dt) {
        // a duel whose opponent has left the world (or lost their connection) cannot go on: it is called off, and (like every duel) both
        // parties are put back exactly as they were before it
        if (this.state?.active && this.state.mp && this.state.mp.kind === 'duel') {
            this._duelCheck = (this._duelCheck || 0) + dt;
            if (this._duelCheck >= 1) {
                this._duelCheck = 0;
                const opp = this.state.mp.opponent, room = multiplayer.room;
                if (!(room && room.players.some(p => p.id === opp && p.connected))) { this._callOffDuel(); return; }
            }
        }
        // a shared fight waiting on another player's pick of who steps into a fallen fighter's place: if they leave the world before
        // answering, the first one standing steps in by itself (every screen sees them go, so every screen does the same)
        if (this._awaitReinforce && this.state?.active) {
            const w = this._awaitReinforce;
            w.t += dt;
            if (w.t >= 1) { w.t = 0; if (!multiplayerSocial.partyHere(this.state.mp.players).includes(w.owner)) this._applyReinforce(null); }
            return;
        }
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
        this._myPicks = [];
        this._retracted = new Map();
        this.state.menuIndex = 0;
        this.state.activePartyIndex = 0;
        this.state.turnQueue = [];
        this.timer = 0;
        this.state.showAbilityDetails = true;

        if (this.state.mp) this._beginSharedRound();
        // a shapeshift that has run out turns back before anyone picks (battle/summons.js), its own moves returned
        for (const message of revertExpiredForms(this.state)) this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message, speedOverride: 999 });
        // a fighter gathering a charged attack (Storm Front) picks nothing this round: its release goes in the queue, on every screen alike
        for (const c of [...this.state.activeParty, ...this.state.activeEnemies]) {
            if (c && !c.isDead() && c._charging) this.state.turnQueue.push({ actor: c, action: c._charging.action, target: c._charging.target });
        }

        while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead() || !this._isMine(this.state.activeParty[this.state.activePartyIndex]) || this.state.activeParty[this.state.activePartyIndex]._charging)
        ) {
            this.state.activePartyIndex++;
        }

        if (this.state.activePartyIndex >= this.state.activeParty.length && this.state.mp) {
            this._waitForOthers();
            return;
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
        const partyAlive = this.state.partyRoster.some(p => !p.isAlly && !p.isDead());   // an ally left alone does not win the fight for you

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

    /** The duel's opponent is gone: end it at once, with nothing gained or lost (multiplayerSocial.battleEnded restores the party). */
    _callOffDuel() {
        const mp = this.state.mp;
        this.state.active = false;
        unseedRandom();
        multiplayerSocial._say(`${(mp.names || {})[mp.opponent] || 'Your opponent'} left, so the duel was called off.`);
        events.emit('BATTLE_ENDED', { victory: false, fled: false, mp: { kind: mp.kind, bid: mp.bid, opponent: mp.opponent || null } });
    }

    endBattle() {
        const victory = commitBattleResults(this.state);
        this.state.active = false;
        const mp = this.state.mp;
        unseedRandom();
        events.emit('BATTLE_ENDED', { victory, fled: !!this.state.fled, mp: mp ? { kind: mp.kind, bid: mp.bid, opponent: mp.opponent || null, authority: mp.authority, me: mp.me, players: (mp.players || []).slice() } : null });
    }

    // ================================================================ SHARED (MULTIPLAYER) FIGHTS
    _setupShared(mp) {
        const s = this.state;
        s.mp = { ...mp, round: 0, decisions: new Map(), syncs: new Map(), adds: new Map(), admits: [] };
        multiplayerSocial.battleCtrl = () => this;   // (a player who walks up can ask to join it: admitPlayer)
        const tag = (c, meta) => { if (c && meta) { c.netId = meta.netId; c.netOwner = meta.owner || null; c.isPlayerCharacter = !!meta.owner; } };
        s.partyRoster.forEach((c, i) => tag(c, mp.partyMeta[i]));
        s.enemyRoster.forEach((c, i) => tag(c, (mp.enemyMeta || [])[i]));
        this.byNet = new Map([...s.partyRoster, ...s.enemyRoster].filter(c => c.netId).map(c => [c.netId, c]));
        multiplayerSocial.battleState = () => this.state;   // a look at the shared fight (the debug overlay, tests)
        for (const d of mp.early || []) this._onRemoteDecision(d);   // picks that arrived before this screen was ready
    }

    // (an ally who only joined for this fight, Nikoli, is nobody's: enemyAI.queueAllyActions picks for them)
    _isMine(c) { if (c && c.isAlly) return false; return !this.state.mp || !c || c.netOwner === this.state.mp.me; }

    /** The combatants whose picks come from other players this round: their characters on the field who can still act. */
    _othersToWaitFor() {
        const s = this.state;
        const field = s.mp.kind === 'duel' ? [...s.activeParty, ...s.activeEnemies] : s.activeParty;
        // (a fighter whose player is not in the fight, busy elsewhere or gone, has nobody to pick for it: it holds its ground)
        const here = new Set(multiplayerSocial.partyHere(s.mp.players));
        return field.filter(c => c && !c.isDead() && !c._charging && c.netOwner && c.netOwner !== s.mp.me && (s.mp.kind === 'duel' || here.has(c.netOwner)));   // (a charging fighter's turn is its release)
    }

    _beginSharedRound() {
        const s = this.state;
        s.mp.round++;
        if (s.mp.authority === s.mp.me) {
            const vitals = {};
            for (const c of this.byNet.values()) vitals[c.netId] = [c.hp, c.stamina, c.insight];
            multiplayerSocial.sendBattleSync(s.mp, { round: s.mp.round, vitals });
            if (s.mp.admits.length) this._admitWaiting();
        } else {
            if (s.mp.syncs.has(s.mp.round)) this._applySync(s.mp.syncs.get(s.mp.round));
            if (s.mp.adds.has(s.mp.round)) { const d = s.mp.adds.get(s.mp.round); s.mp.adds.delete(s.mp.round); this._addFighters(d); }
        }
    }

    // ---------------------------------------------------------------- a player let into the fight in progress (multiplayerSocial: join)
    /** The authority: a player asked to join and was let in. They come in at the start of a round (_beginSharedRound). */
    admitPlayer(id, members, jid) {
        const s = this.state;
        if (!s || !s.mp || s.mp.kind !== 'party' || s.mp.authority !== s.mp.me || !id || id === s.mp.me) return;
        if (s.mp.players.includes(id)) { multiplayerSocial._send({ k: 'join_no', jid, why: 'in' }, id); return; }
        s.mp.admits.push({ id, members, jid, waited: 0 });
        s.message = `${multiplayerSocial.nameOf(id)} will join at the start of the next round.`;
    }

    /* A field the newcomer's screen can be given as it stands: nobody gathering a charged blow, shapeshifted or with a familiar out (those live
       on the fighters, not in their characters, and are not sent). Otherwise they wait for a plainer round (a few at most). */
    _plainField() {
        const s = this.state;
        return ![...s.partyRoster, ...s.enemyRoster].some(c => c && (c._charging || c._form || c._familiar || c.familiarOf || !c.netId));
    }

    _admitWaiting() {
        const s = this.state;
        if (!this._plainField()) {
            for (const a of s.mp.admits) if (++a.waited > 6) multiplayerSocial._send({ k: 'join_no', jid: a.jid, why: 'busy' }, a.id);
            s.mp.admits = s.mp.admits.filter(a => a.waited <= 6);
            return;
        }
        for (const a of s.mp.admits.splice(0)) {
            if (s.mp.players.includes(a.id) || !multiplayerSocial.partyHere([a.id]).length) continue;
            const entries = multiplayerSocial.joinEntries(a.id, a.members);
            if (!entries.length) { multiplayerSocial._send({ k: 'join_no', jid: a.jid, why: 'full' }, a.id); continue; }
            // their lead takes an empty place on the field, if there is one (never in the middle of the allies'); the rest wait at the back
            const hasAllies = s.activeParty.some(c => c && c.isAlly);
            let slot = s.activeParty.findIndex(c => !c);
            if (slot < 0 && !hasAllies && s.activeParty.length < 3) slot = s.activeParty.length;
            const add = { bid: s.mp.bid, round: s.mp.round, id: a.id, name: multiplayerSocial.nameOf(a.id), entries, slot: slot >= 0 ? slot : null };
            multiplayerSocial.sendBattleAdd(s.mp, add);   // the others, before the newcomer is one of the players
            this._addFighters(add);
            multiplayerSocial._send({ k: 'bt_join', jid: a.jid, spec: this._resumeSpec() }, a.id);
        }
    }

    /** Every screen: one more player in the fight, their characters at the back of the line-up (and their lead on the field, given a place). */
    _addFighters(d) {
        const s = this.state;
        if (!s || !s.mp || s.mp.players.includes(d.id)) return;
        s.mp.players.push(d.id);
        s.mp.names = { ...(s.mp.names || {}), [d.id]: d.name || multiplayerSocial.nameOf(d.id) };
        if (multiplayerSocial.battle && multiplayerSocial.battle.bid === s.mp.bid && !multiplayerSocial.battle.players.includes(d.id)) multiplayerSocial.battle.players.push(d.id);
        multiplayerSocial.declined.delete(d.id);
        const firstAlly = s.partyRoster.findIndex(c => c && c.isAlly);
        const added = [];
        for (const e of d.entries || []) {
            const entity = e.owner === s.mp.me ? gameState.party.members[e.idx] : hydrateEntity(e.data);
            if (!entity) continue;
            // (made without the shared dice: building a fighter must never move them)
            const c = withoutSeed(() => new CombatantModel(entity, 'party'));
            stripNonBattleAbilities(c);
            c.netId = `${e.owner}#${e.idx}`; c.netOwner = e.owner; c.isPlayerCharacter = true; c.hasEnteredBattle = true;
            added.push(c);
            this.byNet.set(c.netId, c);
        }
        if (firstAlly >= 0) s.partyRoster.splice(firstAlly, 0, ...added); else s.partyRoster.push(...added);
        if (added.length && Number.isInteger(d.slot) && d.slot >= 0 && d.slot <= s.activeParty.length && !s.activeParty[d.slot]) s.activeParty[d.slot] = added[0];
        s.message = `${s.mp.names[d.id]} joins the fight!`;
        // picks of mine already sent this round went to the players as they were: the newcomer needs them too
        for (const p of this._myPicks || []) if (p.round === s.mp.round && p.d) multiplayerSocial.sendBattleDecision(s.mp, p.d, d.id);
        this._tryResolveShared();
    }

    /** The authority: the fight as it stands at the start of this round, for a newcomer's screen (multiplayerSocial._beginBattle with `resume`). */
    _resumeSpec() {
        const s = this.state, mp = s.mp;
        const party = s.partyRoster.filter(c => c && !c.isAlly);
        const allies = s.partyRoster.filter(c => c && c.isAlly);
        const fighter = (c) => ({ netId: c.netId, dead: !!c._deathHandled, entered: !!c.hasEnteredBattle });
        const lineup = party.map(c => {
            const idx = parseInt(String(c.netId).split('#')[1], 10);
            return { owner: c.netOwner, idx, data: serializeEntity(c.originalEntity) };
        });
        return {
            bid: mp.bid, kind: 'party', seed: mp.seed, authority: mp.me, players: mp.players.slice(), names: { ...(mp.names || {}) },
            lineup, enemies: s.enemyRoster.map(c => serializeEntity(c.originalEntity)), allies: allies.map(c => serializeEntity(c.originalEntity)),
            background: s.backgroundId || null, weather: s.weather && s.weather.id ? { id: String(s.weather.id), intensity: s.weather.intensity } : null,
            bgm: mp.bgm || null, noEscape: !!s.noEscape, afterVictory: null,
            resume: {
                round: mp.round, rng: getRandomState(),
                fighters: [...s.partyRoster, ...s.enemyRoster].filter(Boolean).map(fighter),
                activeParty: s.activeParty.map(c => (c ? c.netId : null)), activeEnemies: s.activeEnemies.map(c => (c ? c.netId : null)),
            },
        };
    }

    /** The newcomer: the fight they were let into, set as the leader's screen had it at the start of this round, then their first picks. */
    _resumeFrom(r) {
        const s = this.state;
        for (const f of r.fighters || []) {
            const c = this.byNet.get(f.netId);
            if (c) { c._deathHandled = !!f.dead; c.hasEnteredBattle = !!f.entered; }
        }
        const pick = (id) => (id ? this.byNet.get(id) || null : null);
        s.activeParty = (r.activeParty || []).map(pick);
        s.activeEnemies = (r.activeEnemies || []).map(pick);
        s.mp.round = (r.round || 1) - 1;
        setRandomState(r.rng);
        this._startActionPhase();
        s.message = 'You join the fight. Your characters wait at the back of the line-up until they are called in.';
    }

    _onRemoteAdd(d) {
        const s = this.state;
        if (!s || !s.mp || !d || d.bid !== s.mp.bid || s.mp.authority === s.mp.me || d.from !== s.mp.authority || typeof d.id !== 'string') return;
        // at the start of its round (as the authority did), never in the middle of one still playing out
        if (d.round === s.mp.round && s.phase !== PHASE.RESOLVE && s.phase !== PHASE.INTRO) this._addFighters(d);
        else if (d.round > s.mp.round) s.mp.adds.set(d.round, d);
        else this._addFighters(d);
    }

    _waitForOthers() {
        this.state.phase = WAIT_REMOTE;
        this.state.selectedAction = null;
        this._tryResolveShared();
    }

    _tryResolveShared() {
        const s = this.state;
        if (!s || !s.mp || s.phase !== WAIT_REMOTE) return;
        const others = this._othersToWaitFor();
        const missing = others.filter(c => !s.mp.decisions.has(`${s.mp.round}:${c.netId}`));
        if (missing.length) {
            const names = [...new Set(missing.map(c => (s.mp.names || {})[c.netOwner] || 'the other player'))];
            s.message = `Waiting for ${names.join(' and ')} to choose ${missing.length > 1 ? 'their actions' : 'an action'}…`
                + (this._canUndoPick() ? ' (Esc or right-click to change your pick)' : '');
            return;
        }
        // every pick is in: the same order on every screen (sortTurnQueue settles ties by network id)
        const swaps = this._mySwaps || [];
        this._mySwaps = [];
        for (const c of others.sort((a, b) => (a.netId < b.netId ? -1 : 1))) {
            const d = s.mp.decisions.get(`${s.mp.round}:${c.netId}`);
            if (d && d.kind === 'swap') swaps.push({ actor: c, d }); else this._applyDecision(c, d);
        }
        this._settleSwaps(swaps);
        if (s.mp.kind !== 'duel') queueEnemyActions(s);
        sortTurnQueue(s);
        s.phase = PHASE.RESOLVE;
        s.message = "Turns Processing...";
        this.timer = 0;
    }

    /* The round's swaps, mine and the others', in network-id order on every screen: a reserve two players both called in goes to the first,
       and the second stays on the field (the line-up is everyone's, so anyone can bring in anyone's character; its owner plays it). */
    _settleSwaps(swaps) {
        const s = this.state;
        const taken = new Set(s.activeParty.filter(Boolean));
        for (const { actor, d } of swaps.sort((a, b) => (a.d.actor < b.d.actor ? -1 : 1))) {
            const replacement = this.byNet.get(d.replacement);
            const slot = s.activeParty.indexOf(actor);
            if (!replacement || replacement.isDead() || taken.has(replacement) || slot === -1) {
                if (actor) s.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: `${actor.name} holds the line: ${replacement ? replacement.name : 'that fighter'} cannot step in.`, speedOverride: actor.stats?.speed ?? 10 });
                continue;
            }
            taken.add(replacement);
            queueSwap(s, replacement, false, slot);
        }
    }

    _applyDecision(actor, d) {
        const s = this.state;
        if (!actor || !d) return;
        if (d.kind === 'swap') {
            const replacement = this.byNet.get(d.replacement);
            if (replacement && !replacement.isDead()) queueSwap(s, replacement, false, d.slotIndex);
            return;
        }
        let action = actor.abilities.find(a => a.id === d.ability) || null;
        if (!action && d.ability) {
            [action] = AbilityFactory.createAbilities([d.ability]);
            if (action && d.item) { action.cost = { item: d.item, amount: 1 }; action.isItemAction = true; }
        }
        if (!action) return;
        s.turnQueue.push({ actor, action, target: this._decodeTarget(d.target, actor) });
    }

    _encodeTarget(t) {
        if (t === 'ALL') return 'ALL';
        if (Array.isArray(t)) return t.map(x => (x && x.netId) || null);
        return t && t.netId ? t.netId : null;
    }

    _decodeTarget(t, actor) {
        if (t === 'ALL') return 'ALL';
        if (Array.isArray(t)) return t.map(id => this.byNet.get(id)).filter(Boolean);
        return this.byNet.get(t) || actor;
    }

    _onRemoteDecision(d) {
        const s = this.state;
        if (!s || !s.mp || !d || d.bid !== s.mp.bid) return;
        if (d.kind === 'reinforce') {   // another player's pick of who steps into their fallen fighter's place
            this._reinforceIn.set(d.key, d);
            if (this._awaitReinforce && this._awaitReinforce.key === d.key) this._applyReinforce(d);
            return;
        }
        if (d.kind === 'undo') {   // another player took a pick back: let it go, unless this screen has already started the round with it
            const started = d.round < s.mp.round || (d.round === s.mp.round && (s.phase === PHASE.RESOLVE || s.phase === PHASE.VICTORY || s.phase === PHASE.DEFEAT));
            if (started) { if (d.from) multiplayerSocial.sendBattleDecision(s.mp, { round: d.round, actor: d.actor, kind: 'undo_late' }, d.from); }
            else s.mp.decisions.delete(`${d.round}:${d.actor}`);
            return;
        }
        if (d.kind === 'undo_late') { this._restoreRetracted(d.round, d.actor); return; }
        s.mp.decisions.set(`${d.round}:${d.actor}`, d);
        this._tryResolveShared();
    }

    /* The lead browser's health totals for the start of a round: put in at that round's start here (never in the middle of a round
       that is still playing out, which would count its blows twice). */
    _onRemoteSync(d) {
        const s = this.state;
        if (!s || !s.mp || !d || d.bid !== s.mp.bid || s.mp.authority === s.mp.me) return;
        if (d.round === s.mp.round && s.phase !== PHASE.RESOLVE && s.phase !== PHASE.INTRO) this._applySync(d);
        else if (d.round > s.mp.round) s.mp.syncs.set(d.round, d);
    }

    _applySync(d) {
        for (const [netId, v] of Object.entries(d.vitals || {})) {
            const c = this.byNet.get(netId);
            if (!c || !Array.isArray(v)) continue;
            if (c.isDead() !== (v[0] <= 0)) continue;   // never raise or fell anyone by a correction
            const e = c.originalEntity;   // a combatant's health is its character's
            e.hp = v[0]; e.stamina = v[1]; e.insight = v[2];
        }
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
            // the fighter whose pick Back would take back (null when there is none to take back)
            undoName: this._canUndoPick() ? this._myPicks[this._myPicks.length - 1].actor.name : null,
            // The one lit element: what the mouse is over, or the keyboard cursor (ACTION_n / TARGET_...)
            hoveredElement: this.getFocusId() ? { id: this.getFocusId() } : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}

import { gameState } from '../../../shared/state/gameState.js';
import { AbilityFactory } from '../../../shared/systems/factories/abilityFactory.js';
import { events } from '../core/eventBus.js'; 
import { CombatantModel } from '../../../shared/models/combatantModel.js'; 
import { BattleRewardSystem } from '../../../shared/systems/battleRewardSystem.js'; 
import { TurnManager, TURN_TYPES } from '../../../shared/systems/turnManager.js';

export const PHASE = {
    INTRO: 'INTRO',
    SELECT_ACTION: 'SELECT_ACTION',
    SELECT_TARGET: 'SELECT_TARGET',
    RESOLVE: 'RESOLVE',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.state = null;
        this.timer = 0; 
        
        // Instantiate the turn manager, injecting a reference to this controller
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
            weather: context.weather || null,  // <-- NEW: Store the weather in state!
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

        // --- NEW WEATHER INTRO LOGIC ---
        if (this.state.weather && this.state.weather.id !== 'clear') { // <-- FIXED: Reference this.state.weather
            console.log('[DEBUG] WEATHER TRIGGERED in BattleController! Pushing to queue.', this.state.weather);
            
            // 1. Queue the intro message
            this.state.turnQueue.push({ 
                type: TURN_TYPES.MESSAGE_STATUS, 
                message: `A fierce ${this.state.weather.name} begins!` 
            });

            // 2. Gather all living, active combatants on the field
            const activeCombatants = [...this.state.activeParty, ...this.state.activeEnemies]
                .filter(c => c && !c.isDead());

            // 3. Queue the custom weather animation & trait application
            this.state.turnQueue.push({
                type: TURN_TYPES.WEATHER_INTRO,
                weather: this.state.weather,
                targets: activeCombatants
            });

            this.state.phase = PHASE.RESOLVE; 
            console.log('[DEBUG] Turn queue loaded. Phase set to RESOLVE. Queue:', this.state.turnQueue);
        } else {
             console.log('[DEBUG] No weather or weather is clear. Skipping to INTRO phase.');
        }

        this.timer = 0;
    }

    // --- INPUT HANDLING ---
    handleKeyDown(key) {
        if (!this.state?.active || this.state.isPausedForUI) return;
        
        // 1. Check for global/debug hotkeys FIRST
        // FIXED: Check for 'KeyC' instead of 'c'
        if (key === 'KeyC') { 
             console.log("Debug View Toggled!");
             events.emit('TOGGLE_BATTLE_DEBUG');
             return; 
        }

        // 2. Ignore inputs during processing/animation phases
        const ignorePhases = [PHASE.INTRO, PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT];
        if (ignorePhases.includes(this.state.phase)) return;

        // 3. Route normal battle inputs
        if (this.state.phase === PHASE.SELECT_ACTION) this._handleActionSelection(key);
        else if (this.state.phase === PHASE.SELECT_TARGET) this._handleTargetSelection(key);
    }

    _handleActionSelection(key) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;

        if (key === 'ArrowRight') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
        } else if (key === 'ArrowLeft') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
        } else if (key === 'Enter') {
            const action = activeChar.abilities[this.state.menuIndex];

            if (!action.canPayCost(activeChar)) {
                this.state.message = `Not enough resources to use ${action.name}!`;
                return; 
            }
            this._setupTargetSelection(action, activeChar);
        } else if (key === 'KeyP') { 
            this.requestPartySwap(false, this.state.activePartyIndex);
        }
    }

    _setupTargetSelection(action, activeChar) {
        this.state.selectedAction = action;
        this.state.selectedTargets = []; 
        
        const scope = action.targeting?.scope || 'enemy';
        const selectMode = action.targeting?.select || 'single';
        
        if (scope === 'self') {
            return this.commitAction(activeChar);
        } 
        const isPartyTarget = scope.includes('allies') || scope === 'ally';
        const targetPool = isPartyTarget ? this.state.activeParty : this.state.activeEnemies;

        if (selectMode === 'random' || scope.includes('random')) {
            const fallbackTarget = targetPool.find(t => t && !t.isDead()) || activeChar;
            return this.commitAction(fallbackTarget);
        }
        
        this.state.phase = PHASE.SELECT_TARGET;
        this.state.targetGroup = isPartyTarget ? 'party' : 'enemy';

        if (['all_enemies', 'all_allies'].includes(scope)) {
            this.state.message = `Confirm target for ${action.name}`;
            this.state.targetIndex = 'ALL'; 
        } else {
            this.state.message = `Select a target for ${action.name}`;
            this.state.targetIndex = Math.max(0, targetPool.findIndex(t => t && !t.isDead())); 
        }
    }

    _handleTargetSelection(key) {
        const targetArray = this.getActivePool(this.state.targetGroup);

        if (this.state.targetIndex === 'ALL') {
            if (key === 'Enter') this.commitAction('ALL');
            else if (key === 'Escape') this._cancelTargetSelection();
            return;
        }

        if (key === 'ArrowDown' || key === 'ArrowRight') {
            this.state.targetIndex = this._cycleTarget(targetArray, 1);
        } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
            this.state.targetIndex = this._cycleTarget(targetArray, -1);
        } else if (key === 'Enter') {
            this._selectSpecificTarget(targetArray[this.state.targetIndex]);
        } else if (key === 'Escape') {
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
            this.state.activeParty[slotIndex] = replacement;
            this.state.message = `${replacement.name} steps in!`;
        } else {
            const activeChar = this.state.activeParty[slotIndex];
            this.state.turnQueue.push({
                type: TURN_TYPES.REINFORCEMENT,
                team: 'party',
                slotIndex,
                replacement,
                message: `${activeChar.name} swaps out for ${replacement.name}!`
            });
            this._advancePartyTurn();
        }
    }

    // --- TURN QUEUING LOGIC ---
    commitAction(primaryTarget) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        if (!this.state.selectedAction.canPayCost(activeChar)) return;

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

            const validAbilities = enemy.abilities.filter(a => a.canPayCost(enemy) && !['rest', 'punch'].includes(a.id));
            const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];

            if (validAbilities.length > 0) {
                const action = validAbilities[Math.floor(Math.random() * validAbilities.length)];
                return this.state.turnQueue.push({ actor: enemy, action, target: randomTarget });
            }

            const punch = enemy.abilities.find(a => a.id === 'punch' && a.canPayCost(enemy));
            if (punch) {
                return this.state.turnQueue.push({ actor: enemy, action: punch, target: randomTarget });
            }

            const restAction = AbilityFactory.createAbilities(['rest'])[0];
            this.state.turnQueue.push({ actor: enemy, action: restAction, target: enemy });
        });
    }

    _sortTurnQueue() {
        this.state.turnQueue.sort((a, b) => {
            const speedA = (a.actor?.stats?.speed ?? 10) * (a.action?.speedModifier ?? 1);
            const speedB = (b.actor?.stats?.speed ?? 10) * (b.action?.speedModifier ?? 1);
            return speedB - speedA; 
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

            // Hand execution over to the TurnManager
            if (this.timer >= waitTime) {
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

    // --- BATTLE STATE MANAGEMENT ---
    handleDeath(combatant) {
        if (combatant._deathHandled) return;
        combatant._deathHandled = true;

        this.state.turnQueue = this.state.turnQueue.filter(turn => turn.actor !== combatant);
        
        const isParty = combatant.team === 'party';
        const activeArray = isParty ? this.state.activeParty : this.state.activeEnemies;
        const rosterArray = isParty ? this.state.partyRoster : this.state.enemyRoster;
        const slotIndex = activeArray.indexOf(combatant);
        
        if (slotIndex === -1) return;
        
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
                this.state.turnQueue.unshift({
                    type: TURN_TYPES.REINFORCEMENT,
                    team: 'enemy', slotIndex, replacement,
                    message: `${replacement.name} joins the battle!`
                });
            }
        }
        
        this.turnManager.queueMessage(`${combatant.name} has been slain!`, TURN_TYPES.MESSAGE_DEATH);
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
        
        const rewardMessages = BattleRewardSystem.processVictory(this.state.partyRoster, this.state.enemyRoster);
        
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
                
            // NEW: Explicitly ensure the weather status effect is stripped
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

    getState() {
        return this.state;
    }
}
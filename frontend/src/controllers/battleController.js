import { gameState } from '../../../shared/state/gameState.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../../../shared/systems/factories/abilityFactory.js';
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js'; 
import { ExperienceSystem } from '../../../shared/systems/experienceSystem.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';
import { events } from '../core/eventBus.js'; 
import { TargetingResolver } from '../../../shared/systems/targetingResolver.js';
import { StatusEffectFactory } from '../../../shared/systems/factories/statusEffectFactory.js';
import { AbilitySystem } from '../../../shared/systems/abilitySystem.js'; 
import { BattleAnimationFactory } from '../../../shared/systems/factories/battleAnimationFactory.js';

const PHASE = {
    INTRO: 'INTRO',
    SELECT_ACTION: 'SELECT_ACTION',
    SELECT_TARGET: 'SELECT_TARGET',
    RESOLVE: 'RESOLVE',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

const TURN_TYPES = {
    MESSAGE_STATUS: 'STATUS_MESSAGE',
    MESSAGE_VICTORY: 'VICTORY_MESSAGE',
    MESSAGE_DEFEAT: 'DEFEAT_MESSAGE',
    MESSAGE_DEATH: 'DEATH_MESSAGE',
    BATTLE_END: 'BATTLE_END',
    REINFORCEMENT: 'REINFORCEMENT',
    PROMPT_REINFORCEMENT: 'PROMPT_REINFORCEMENT',
    PLAY_ANIMATION: 'PLAY_ANIMATION',
    APPLY_ABILITY_EFFECTS: 'APPLY_ABILITY_EFFECTS',
    END_ACTOR_TURN: 'END_ACTOR_TURN', // ✅ Step 1: Added new turn type
    EXECUTE_ACTION: 'EXECUTE_ACTION',            // ✅ Added
    APPLY_STATUS_EFFECT: 'APPLY_STATUS_EFFECT'   // ✅ Added
};

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.state = null;
        this.timer = 0; 
    }

    start(enemies, context = {}) {
        const maxActive = context.maxActive || 3; 
        const party = gameState.party.members.map(member => this._createCombatant(member, 'party'));
        const preparedEnemies = enemies.map(enemy => this._createCombatant(enemy, 'enemy'));

        this.state = {
            active: true,
            isPausedForUI: false,
            phase: PHASE.INTRO, 
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

        this.timer = 0;
    }

    // --- ENTITY SETUP ---
    _createCombatant(entity, teamAllegiance) {
        // We still need a quick initial calculation just to set starting HP/MaxHP correctly
        const initialStats = StatCalculator.calculateDetailed(entity);
        const maxHp = initialStats.maxHp?.total || 1;
        const maxStamina = initialStats.maxStamina?.total || 10;
        const maxInsight = initialStats.maxInsight?.total || 10;

        const combatant = {
            originalEntity: entity, 
            name: entity.name,
            team: teamAllegiance, 
            spritePortrait: entity.spritePortrait, 
            spriteOverworld: entity.spriteOverworld,
            maxHp, hp: Math.min(entity.hp ?? maxHp, maxHp),
            maxStamina, stamina: Math.min(entity.stamina ?? maxStamina, maxStamina),
            maxInsight, insight: Math.min(entity.insight ?? maxInsight, maxInsight),
            abilities: this._extractAndResolveAbilities(entity, teamAllegiance),
            _deathHandled: false,

            // --- THE FIX: Make these dynamically pull live data ---
            get statusEffects() { return this.originalEntity.statusEffects; },
            
            // Calculates fresh stats on-demand, incorporating active mid-fight status effects!
            get stats() { return StatCalculator.calculateDetailed(this.originalEntity); },
            get baseStats() { return this.originalEntity.baseStats; },
            
            getAttack(type) { return this.stats.attack?.[type] || 0; },
            getDefense(type) { return this.stats.defense?.[type] || 0; },
            // ------------------------------------------------------

            isDead() { return this.hp <= 0; },

            modifyResource(resource, amount) {
                if (this[resource] === undefined) return 0;
                
                const maxProp = 'max' + resource.charAt(0).toUpperCase() + resource.slice(1);
                const originalValue = this[resource]; 
                
                this[resource] = Math.max(0, Math.min(this[maxProp], this[resource] + amount));
                const actualDifference = this[resource] - originalValue; 

                // Emit FCT event for UI
                if (actualDifference !== 0) {
                    events.emit('SPAWN_FCT', {
                        target: this,
                        value: actualDifference,
                        resource: resource, 
                        isCritical: false 
                    });
                }

                return actualDifference; 
            },

            applyStatusEffect(effect) { this.originalEntity.applyStatusEffect(effect); },
            removeStatusEffect(effectId) { this.originalEntity.removeStatusEffect(effectId); }
        };

        this._applyStartingStatuses(entity, combatant);
        return combatant;
    }

    _extractAndResolveAbilities(entity, teamAllegiance) {
        const abilityIds = new Set();
        
        // Helper to safely extract IDs
        const addId = (a) => {
            if (a) abilityIds.add(typeof a === 'string' ? a : a.id);
        };

        // Extract base abilities
        const baseAbilities = entity.abilities || entity.state?.abilities || entity.definition?.abilities || [];
        baseAbilities.forEach(addId);

        // Extract equipment abilities
        const equipment = entity.equipment || entity.state?.equipment || entity.definition?.equipment || {};
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const itemDef = typeof item === 'string' ? ItemFactory.createItem(item) : (item.definition || item);
            if (!itemDef) return;

            itemDef.grantedAbilities?.forEach(addId);
            addId(itemDef.grantedAbility);
            addId(itemDef.useAbility);
        });

        // Add fallbacks
        if (teamAllegiance === 'party') abilityIds.add('retreat');
        if (abilityIds.size === 0) abilityIds.add('punch'); 
        abilityIds.delete(undefined);
        
        return AbilityFactory.createAbilities(Array.from(abilityIds)).filter(Boolean);
    }

    _applyAbilityEffects(turn) {
        let { actor, action, targets, isFirstTarget, isLastTarget } = turn;

        if (isFirstTarget) action.payCost(actor, null);

        for (let target of targets) {
            const actualTarget = this._getValidTarget(target);
            if (!actualTarget) continue; 
            
            const wasTargetDead = actualTarget.isDead();
            const wasActorDead = actor.isDead(); 

            const result = AbilitySystem.execute(action.id, actor, actualTarget);
            
            if (result.fled) {
                this._handleFlee(actor);
                break; 
            }

            // ✅ Added: Emit FCT event for Dodges or Misses
            if (result.missed || result.evaded) {
                events.emit('SPAWN_FCT', {
                    target: actualTarget,
                    text: result.evaded ? 'Evade!' : 'Miss!',
                    type: 'status'
                });
            }

            if (result.message) this._queueMessage(result.message);

            if (!wasTargetDead && actualTarget.isDead()) this.handleDeath(actualTarget);
            if (!wasActorDead && actor.isDead()) {
                this.handleDeath(actor);
                break; 
            }
        }

        this._processNextTurnInQueue();
    }

    _applyStartingStatuses(entity, combatant) {
        if (!Array.isArray(entity.startingStatuses)) return;
        entity.startingStatuses.forEach(statusId => {
            const newStatus = StatusEffectFactory.createEffect(statusId, null, combatant);
            if (newStatus) combatant.applyStatusEffect(newStatus);
        });
    }

    // --- INPUT HANDLING ---
    handleKeyDown(key) {
        if (!this.state?.active || this.state.isPausedForUI) return;
        
        const ignorePhases = [PHASE.INTRO, PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT];
        if (ignorePhases.includes(this.state.phase)) return;

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
            this._requestPartySwap(false, this.state.activePartyIndex);
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
        // Setup Phase for Manual Selection
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
        const targetArray = this._getActivePool(this.state.targetGroup);

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
    _requestPartySwap(isForced = false, slotIndex = -1) {
        const activeIndices = this.state.activeParty
            .map(p => p ? this.state.partyRoster.indexOf(p) : -1)
            .filter(i => i !== -1);

        // Include pending reinforcements in active roster checks
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
                    if (isForced) this._requestPartySwap(isForced, slotIndex); 
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

    // --- TURN LOGIC ---
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
        // Skip dead/empty slots
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

    _getActivePool(team) {
        return team === 'party' ? this.state.activeParty : this.state.activeEnemies;
    }

    _getValidTarget(target) {
        if (!target.isDead()) return target;
        
        const fallbackPool = this._getActivePool(target.team);
        const livingTargets = fallbackPool.filter(t => t && !t.isDead());
        
        if (livingTargets.length === 0) return null;
        return livingTargets[Math.floor(Math.random() * livingTargets.length)];
    }

    _queueMessage(message, type = TURN_TYPES.MESSAGE_STATUS) {
        this.state.turnQueue.unshift({ type, message });
    }

    _handleFlee(actor) {
        this.state.fled = true; 
        this.state.turnQueue = [
            { type: TURN_TYPES.MESSAGE_STATUS, message: `${actor.name}'s party escapes!` },
            { type: TURN_TYPES.BATTLE_END }
        ];
    }

    _queueEnemyActions() {
        const livingParty = this.state.activeParty.filter(p => p && !p.isDead());
        if (livingParty.length === 0) return; // No targets available

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
                this._processNextTurnInQueue();
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

    _processNextTurnInQueue() {
        this.timer = 0;
        this.state.activeAnimation = null; 

        if (this.state.turnQueue.length > 0) {
            this.executeTurn(this.state.turnQueue.shift());
        } else if (this.state.phase === PHASE.RESOLVE) {
            this._checkBattleStatus();
        }
    }

    _queueStatusEffects(combatant, triggerEvent, context = {}) {
        if (!combatant || combatant.isDead()) return;

        for (let i = combatant.statusEffects.length - 1; i >= 0; i--) {
            const status = combatant.statusEffects[i];
            
            // ✅ Check if the status has an explicit effect for this trigger
            const hasActiveTrigger = status.effects && status.effects.some(e => e.trigger === triggerEvent);

            // 2. Queue Apply (Executes AFTER animation finishes, triggers FCT)
            // We always queue this so ON_TURN_END can silently tick down charges in the background.
            this.state.turnQueue.unshift({
                type: TURN_TYPES.APPLY_STATUS_EFFECT,
                actor: combatant,
                status: status,
                triggerEvent: triggerEvent,
                context: context
            });

            // 1. Queue Animation (Executes FIRST) - ONLY if there's an active trigger
            if (hasActiveTrigger) {
                const animId = status.animationId || status.definition?.animationId || status.config?.animationId;
                if (animId) {
                    this.state.turnQueue.unshift({
                        type: TURN_TYPES.PLAY_ANIMATION,
                        actor: combatant,
                        target: combatant,
                        animationId: animId
                    });
                }
            }
        }
    }

    _unpackBaseTurn(turn) {
        let { actor, action, target } = turn;
        if (actor.isDead()) return this._processNextTurnInQueue();

        actor._skipAction = false; // Reset stun/skip flag

        // Unshift drops things at the FRONT of the queue, so we add them in reverse order:
        
        // 3. The End Turn Phase
        this.state.turnQueue.unshift({ type: TURN_TYPES.END_ACTOR_TURN, actor: actor });
        
        // 2. The Main Action
        this.state.turnQueue.unshift({ type: TURN_TYPES.EXECUTE_ACTION, actor, action, target });

        // 1. Start Turn Statuses
        this._queueStatusEffects(actor, 'ON_TURN_START');

        this._processNextTurnInQueue();
    }

    _applyStatusEffectTurn(turn) {
        const { actor, status, triggerEvent, context } = turn;
        if (actor.isDead() || status.isExpired()) return this._processNextTurnInQueue();

        // 💥 THIS is where damage natively modifies HP and FCT spawns
        const result = status.onEvent(triggerEvent, actor, context);
        
        // If the effect causes a skip (like Stun), flag the actor
        if (result.cancelAction) actor._skipAction = true;

        if (result.messages?.length > 0) {
            // Inject messages immediately so they appear simultaneously with the FCT
            const messageTurns = result.messages.map(msg => ({
                type: TURN_TYPES.MESSAGE_STATUS, 
                message: msg
            }));
            this.state.turnQueue.unshift(...messageTurns);
        }

        if (actor.isDead()) this.handleDeath(actor);
        if (context.attacker?.isDead()) this.handleDeath(context.attacker);
        if (status.isExpired()) actor.removeStatusEffect(status.id);

        this._processNextTurnInQueue();
    }

    executeTurn(turn) {
        // Handle immediate message types
        const messageTypes = [TURN_TYPES.MESSAGE_VICTORY, TURN_TYPES.MESSAGE_DEFEAT, TURN_TYPES.MESSAGE_STATUS, TURN_TYPES.MESSAGE_DEATH];
        if (messageTypes.includes(turn.type)) {
            this.state.message = turn.message;
            return;
        }
        switch (turn.type) {
            case TURN_TYPES.APPLY_STATUS_EFFECT:
                return this._applyStatusEffectTurn(turn);

            case TURN_TYPES.EXECUTE_ACTION:
                // Catch Stuns/Skips here before the action fires
                if (turn.actor._skipAction || turn.actor.isDead()) {
                    turn.actor._skipAction = false; 
                    return this._processNextTurnInQueue();
                }
                return this._handleActionExecution(turn);

            case TURN_TYPES.END_ACTOR_TURN:
                if (!turn.actor.isDead() && !this.state.fled) {
                    this._queueStatusEffects(turn.actor, 'ON_TURN_END');
                }
                return this._processNextTurnInQueue();

            case TURN_TYPES.PROMPT_REINFORCEMENT:
                return this._requestPartySwap(true, turn.slotIndex);
            
            case TURN_TYPES.BATTLE_END:
                return this._endBattle();
            
            case TURN_TYPES.REINFORCEMENT:
                const pool = turn.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
                pool[turn.slotIndex] = turn.replacement; 
                this.state.message = turn.message;
                return;
            
            case TURN_TYPES.PLAY_ANIMATION:
                return this._handleAnimationTurn(turn);
            
            case TURN_TYPES.APPLY_ABILITY_EFFECTS:
                return this._applyAbilityEffects(turn);
            
            default: // Base turn (Phase 1)
               return this._unpackBaseTurn(turn);
        }
    }

    _handleAnimationTurn(turn) {
        const targetList = turn.targets || [turn.target];
        const validTargets = [];
        const redirectedTurns = new Set();

        for (let target of targetList) {
            let actualTarget = this._getValidTarget(target);
            if (!actualTarget) continue; 
            
            if (actualTarget !== target) {
                const nextApplyTurn = this.state.turnQueue.find(t => 
                    t.type === TURN_TYPES.APPLY_ABILITY_EFFECTS && 
                    t.targets?.includes(target) &&
                    !redirectedTurns.has(t) 
                );
                
                if (nextApplyTurn) {
                    nextApplyTurn.targets = [actualTarget];
                    redirectedTurns.add(nextApplyTurn); 
                }
            }
            
            if (!validTargets.includes(actualTarget)) validTargets.push(actualTarget);
        }

        if (validTargets.length === 0) {
            return this._processNextTurnInQueue(); 
        }

        // ✅ Modify this line to fall back to a direct turn.animationId
        const animId = turn.animationId || turn.action?.animationId;
        this.state.activeAnimation = BattleAnimationFactory.create(animId, turn.actor, validTargets);
    }

    _handleActionExecution(turn) {
        let { actor, action, target: primaryTarget } = turn;

        // If the actor died before their action fires, skip their action
        if (actor.isDead()) return this._processNextTurnInQueue();

        let resolvedTargets = TargetingResolver.resolve(action, actor, primaryTarget, this.state);

        // If targets are dead/gone, the action fizzles
        if (resolvedTargets.length === 0) {
            this.state.message = `${actor.name} tried to use ${action.name}, but there were no targets left!`;
            return this._processNextTurnInQueue();
        }

        // Check resources; fallback to rest if drained
        if (!action.canPayCost(actor)) {
            action = AbilityFactory.createAbilities(['rest'])[0]; 
            resolvedTargets = [actor]; 
        }
        
        this.state.message = action.id === 'rest' ? `${actor.name} had to rest!` : `${actor.name} used ${action.name}!`;

        const isAoE = ['all_enemies', 'all_allies'].includes(action.targeting?.scope) || action.targeting?.isAoE;

        // Queue the visual and mechanical application of the ability
        if (isAoE) {
            this._queueAoEAction(actor, action, resolvedTargets);
        } else {
            this._queueMultiAction(actor, action, resolvedTargets);
        }
        
        this._processNextTurnInQueue();
    }

    _queueAoEAction(actor, action, targets) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1));
        }
        this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, targets });
    }

    _queueMultiAction(actor, action, targets) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1));
            this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, target: targets[i] });
        }
    }

    _createApplyEffectTurn(actor, action, targets, isFirst, isLast) {
        return {
            type: TURN_TYPES.APPLY_ABILITY_EFFECTS,
            actor, action, targets, 
            isFirstTarget: isFirst, 
            isLastTarget: isLast 
        };
    }

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
        
        this._queueMessage(`${combatant.name} has been slain!`, TURN_TYPES.MESSAGE_DEATH);
    }

    _checkBattleStatus() {
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

    _calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        
        const sumStats = (statObj) => statObj ? Object.values(statObj).reduce((sum, val) => sum + val, 0) : 0;
        const statSum = enemy.maxHp + (enemy.stats.speed ?? 10) + sumStats(enemy.stats.attack) + sumStats(enemy.stats.defense);
       
        return Math.floor(statSum * 0.15) + ((enemy.originalEntity.level || 1) * 10);
    }

    _handleVictory() {
        this.state.phase = PHASE.VICTORY;
        this.state.turnQueue = []; 
        
        let totalXp = 0;
        let totalCurrency = 0;
        const droppedItems = [];

        this.state.enemyRoster.forEach(enemy => {
            totalXp += this._calculateEnemyXp(enemy);
            
            const currReward = enemy.originalEntity.currencyReward || { min: 0, max: 0 };
            if (currReward.max > 0) {
                totalCurrency += Math.floor(Math.random() * (currReward.max - currReward.min + 1)) + currReward.min;
            }
            
            (enemy.originalEntity.lootTable || []).forEach(loot => {
                if (Math.random() <= loot.dropRate) droppedItems.push(loot.id);
            });
        });
        this._distributeVictoryRewards(totalXp, totalCurrency, droppedItems);
    }

    _distributeVictoryRewards(totalXp, totalCurrency, droppedItems) {
        const queueRewardMsg = (msg) => this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: msg });

        queueRewardMsg(`Victory! The party gained ${totalXp} XP.`);

        const aliveParty = this.state.partyRoster.filter(m => !m.isDead());
        const xpPerMember = Math.floor(totalXp / Math.max(1, aliveParty.length));

        aliveParty.forEach(member => {
            if (ExperienceSystem.addXp(member.originalEntity, xpPerMember)) {
                queueRewardMsg(`${member.name} reached Level ${member.originalEntity.level}!`);
            }
        });
        if (totalCurrency > 0) {
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            queueRewardMsg(`The party found ${totalCurrency} currency!`);
        }
        if (droppedItems.length > 0) {
            const itemCounts = droppedItems.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
            const lootStrings = Object.entries(itemCounts).map(([id, count]) => {
                InventorySystem.addItem(id, count);
                const readableName = id.replace(/_/g, ' '); 
                return count > 1 ? `${readableName} x${count}` : readableName;
            });
            queueRewardMsg(`Loot recovered: ${lootStrings.join(', ')}`);
        } else if (totalCurrency === 0) {
            queueRewardMsg(`The enemies left nothing useful behind.`);
        }

        this.state.turnQueue.push({ type: TURN_TYPES.BATTLE_END });
    }

    _handleDefeat() {
        this.state.phase = PHASE.DEFEAT;
        this.state.turnQueue = [
            { type: TURN_TYPES.MESSAGE_DEFEAT, message: `The party has fallen in battle...` }, 
            { type: TURN_TYPES.BATTLE_END }
        ];
    }

    _endBattle() {
        this.state.partyRoster.forEach(combatant => {
            combatant.originalEntity.hp = combatant.hp;
            combatant.originalEntity.stamina = combatant.stamina;
            combatant.originalEntity.insight = combatant.insight;
            
            const effectsToRemove = combatant.originalEntity.statusEffects
                .filter(effect => !effect.persistAfterCombat)
                .map(effect => effect.id);
                
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
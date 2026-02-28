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
    PROMPT_REINFORCEMENT: 'PROMPT_REINFORCEMENT' // NEW: Pause queue to ask player
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
            isPausedForUI: false, // --- NEW: Halt updates/input when Party UI is open
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
        const detailedStats = StatCalculator.calculateDetailed(entity);
        const maxHp = detailedStats.maxHp?.total || 1;
        const maxStamina = detailedStats.maxStamina?.total || 10;
        const maxInsight = detailedStats.maxInsight?.total || 10;

        const abilities = this._extractAndResolveAbilities(entity, teamAllegiance);

        const combatant = {
            originalEntity: entity, 
            name: entity.name,
            team: teamAllegiance, 
            spritePortrait: entity.spritePortrait, 
            spriteOverworld: entity.spriteOverworld,
            maxHp, hp: Math.min(entity.hp ?? maxHp, maxHp),
            maxStamina, stamina: Math.min(entity.stamina ?? maxStamina, maxStamina),
            maxInsight, insight: Math.min(entity.insight ?? maxInsight, maxInsight),
            stats: detailedStats,
            abilities,
            _deathHandled: false,

            get statusEffects() { return this.originalEntity.statusEffects; },
            get baseStats() { return this.stats; },
            getAttack(type) { return this.stats.attack?.[type] || 0; },
            getDefense(type) { return this.stats.defense?.[type] || 0; },
            isDead() { return this.hp <= 0; },

            modifyResource(resource, amount) {
                if (this[resource] !== undefined) {
                    const maxProp = 'max' + resource.charAt(0).toUpperCase() + resource.slice(1);
                    const originalValue = this[resource]; 
                    
                    this[resource] = Math.max(0, Math.min(this[maxProp], this[resource] + amount));
                    
                    return this[resource] - originalValue; 
                }
                return 0; 
            },

            applyStatusEffect(effect) {
                this.originalEntity.applyStatusEffect(effect);
            },
            removeStatusEffect(effectId) {
                this.originalEntity.removeStatusEffect(effectId);
            }
        };

        this._applyStartingStatuses(entity, combatant);
        return combatant;
    }

    _extractAndResolveAbilities(entity, teamAllegiance) {
        const abilityIdSet = new Set();
        
        const baseAbilities = entity.abilities || entity.state?.abilities || entity.definition?.abilities || [];
        baseAbilities.forEach(a => abilityIdSet.add(typeof a === 'string' ? a : a.id));

        const equipment = entity.equipment || entity.state?.equipment || entity.definition?.equipment || {};
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const itemDef = typeof item === 'string' ? ItemFactory.createItem(item) : (item.definition || item);
            if (!itemDef) return;

            const extractId = (a) => abilityIdSet.add(typeof a === 'string' ? a : a?.id);
            if (itemDef.grantedAbilities) itemDef.grantedAbilities.forEach(extractId);
            if (itemDef.grantedAbility) extractId(itemDef.grantedAbility);
            if (itemDef.useAbility) extractId(itemDef.useAbility);
        });

        if (teamAllegiance === 'party') {
            abilityIdSet.add('retreat');
        }

        if (abilityIdSet.size === 0) abilityIdSet.add('punch'); 
        abilityIdSet.delete(undefined);
        
        return AbilityFactory.createAbilities(Array.from(abilityIdSet)).filter(Boolean);
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

        if (this.state.phase === PHASE.SELECT_ACTION) {
            this._handleActionSelection(key);
        } else if (this.state.phase === PHASE.SELECT_TARGET) {
            this._handleTargetSelection(key);
        }
    }

    _handleActionSelection(key) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;

        if (key === 'ArrowRight') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
        } else if (key === 'ArrowLeft') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
        } else if (key === 'Enter') {
            const attemptedAction = activeChar.abilities[this.state.menuIndex];

            if (!attemptedAction.canPayCost(activeChar)) {
                this.state.message = `Not enough resources to use ${attemptedAction.name}!`;
                return; 
            }

            this._setupTargetSelection(attemptedAction, activeChar);
        } else if (key === 'KeyP') { // <--- UPDATE THIS LINE
            // NEW: Voluntary Party Swap during Turn
            this._requestPartySwap(false, this.state.activePartyIndex);
        }
    }

    _setupTargetSelection(action, activeChar) {
        this.state.selectedAction = action;
        this.state.selectedTargets = []; 
        
        const scope = action.targeting?.scope || 'enemy';
        const selectMode = action.targeting?.select || 'single';
        
        if (scope === 'self') {
            this.commitAction(activeChar);
        } else if (selectMode === 'random' || scope.includes('random')) {
            const targetPool = (scope.includes('allies') || scope === 'ally') ? this.state.activeParty : this.state.activeEnemies;
            const fallbackLivingTarget = targetPool.find(t => t && !t.isDead()) || activeChar;
            
            this.commitAction(fallbackLivingTarget);

        } else if (['all_enemies', 'all_allies'].includes(scope)) {
            this.state.message = `Confirm target for ${action.name}`;
            this.state.phase = PHASE.SELECT_TARGET;
            this.state.targetGroup = scope === 'all_allies' ? 'party' : 'enemy';
            this.state.targetIndex = 'ALL'; 
        } else {
            this.state.message = `Select a target for ${action.name}`;
            this.state.phase = PHASE.SELECT_TARGET;
            this.state.targetGroup = scope === 'ally' ? 'party' : 'enemy';
            
            const targetArray = this.state.targetGroup === 'party' ? this.state.activeParty : this.state.activeEnemies;
            this.state.targetIndex = Math.max(0, targetArray.findIndex(t => t && !t.isDead())); 
        }
    }

    _handleTargetSelection(key) {
        const targetArray = this.state.targetGroup === 'party' ? this.state.activeParty : this.state.activeEnemies;

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
            this.commitAction(target);
            return;
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

    // --- NEW: PARTY SWAP LOGIC ---

    _requestPartySwap(isForced = false, slotIndex = -1) {
        // Collect indices of currently active members so the UI can dim them
        const activeIndices = this.state.activeParty.map(p => 
            p ? this.state.partyRoster.indexOf(p) : -1
        ).filter(i => i !== -1);

        // --- THE FIX: Add pending replacements currently waiting in the turn queue ---
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
                
                // If user pressed ESC/Canceled
                if (selectedRosterIndex === null || selectedRosterIndex === undefined) {
                    if (isForced) {
                        // Cannot cancel a forced death swap
                        this._requestPartySwap(isForced, slotIndex); 
                    }
                    return; 
                }

                this._executeSwap(selectedRosterIndex, isForced, slotIndex);
            }
        });
    }

    _executeSwap(selectedRosterIndex, isForced, slotIndex) {
        const replacement = this.state.partyRoster[selectedRosterIndex];
        
        if (isForced) {
            // Immediate fill during queue resolution
            this.state.activeParty[slotIndex] = replacement;
            this.state.message = `${replacement.name} steps in!`;
        } else {
            // Voluntary swap during SELECT phase, push as a turn
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

    _queueEnemyActions() {
        this.state.activeEnemies.forEach(enemy => {
            if (!enemy || enemy.isDead()) return; 

            const validAbilities = enemy.abilities.filter(a => a.canPayCost(enemy) && a.id !== 'rest' && a.id !== 'punch');

            if (validAbilities.length === 0) {
                const basicAttack = enemy.abilities.find(a => a.id === 'punch' && a.canPayCost(enemy));
                const livingParty = this.state.activeParty.filter(p => p && !p.isDead());
                
                if (basicAttack && livingParty.length > 0) {
                    const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];
                    this.state.turnQueue.push({ actor: enemy, action: basicAttack, target: randomTarget });
                } else {
                    this.state.turnQueue.push({ actor: enemy, action: AbilityFactory.createAbilities(['rest'])[0], target: enemy });
                }
                return; 
            }

            const livingParty = this.state.activeParty.filter(p => p && !p.isDead());
            if (livingParty.length > 0) {
                const randomAbility = validAbilities[Math.floor(Math.random() * validAbilities.length)];
                const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];
                this.state.turnQueue.push({ actor: enemy, action: randomAbility, target: randomTarget });
            }
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

        if (this.state.phase === PHASE.INTRO) {
            this.timer += dt; 
            if (this.timer > 1.5) this._startActionPhase();
        } else if ([PHASE.RESOLVE, PHASE.VICTORY, PHASE.DEFEAT].includes(this.state.phase)) {
            this.timer += dt;
            if (this.timer >= 1.5) this._processNextTurnInQueue();
        }
    }

    _startActionPhase() {
        this.state.menuIndex = 0;
        this.state.activePartyIndex = 0;
        this.state.turnQueue = [];
        this.timer = 0;

        while(this.state.activePartyIndex < this.state.activeParty.length && 
              (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())) {
            this.state.activePartyIndex++;
        }

        if (this.state.activePartyIndex >= this.state.activeParty.length) {
            // Automatically push through to enemies' turns if there is no living active party member right now
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
        if (this.state.turnQueue.length > 0) {
            this.executeTurn(this.state.turnQueue.shift());
        } else if (this.state.phase === PHASE.RESOLVE) {
            this._checkBattleStatus();
        }
    }

    // --- EFFECT RESOLUTION ---

    processStatusEffects(combatant, triggerEvent, context = {}) {
        if (!combatant || combatant.isDead()) return false;
        let skipTurn = false;

        for (let i = combatant.statusEffects.length - 1; i >= 0; i--) {
            const status = combatant.statusEffects[i];
            const result = status.onEvent(triggerEvent, combatant, context);
            
            if (result.cancelAction) skipTurn = true;

            if (result.messages?.length > 0) {
                result.messages.forEach(msg => this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: msg }));
            }

            if (combatant.isDead()) {
                this.handleDeath(combatant);
                break; 
            }

            if (context.attacker?.isDead()) this.handleDeath(context.attacker);
            if (status.isExpired()) combatant.removeStatusEffect(status.id);
        }
        return skipTurn;
    }

    executeTurn(turn) {
        if ([TURN_TYPES.MESSAGE_VICTORY, TURN_TYPES.MESSAGE_DEFEAT, TURN_TYPES.MESSAGE_STATUS, TURN_TYPES.MESSAGE_DEATH].includes(turn.type)) {
            this.state.message = turn.message;
            return;
        }

        // --- NEW: Triggered if a party member dies mid-resolve phase ---
        if (turn.type === TURN_TYPES.PROMPT_REINFORCEMENT) {
            this._requestPartySwap(true, turn.slotIndex);
            return; 
        }

        if (turn.type === TURN_TYPES.BATTLE_END) return this._endBattle();
        
        if (turn.type === TURN_TYPES.REINFORCEMENT) {
            const activeArray = turn.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
            activeArray[turn.slotIndex] = turn.replacement; 
            this.state.message = turn.message;
            return;
        }

        let { actor, action, target: primaryTarget } = turn;
        if (actor.isDead()) return; 

        if (this.processStatusEffects(actor, 'ON_TURN_START')) {
            this.processStatusEffects(actor, 'ON_TURN_END');
            return; 
        }

        let resolvedTargets = TargetingResolver.resolve(action, actor, primaryTarget, this.state);

        if (resolvedTargets.length === 0) {
            this.state.message = `${actor.name} tried to use ${action.name}, but there were no targets left!`;
            this.processStatusEffects(actor, 'ON_TURN_END');
            return;
        }

        if (!action.canPayCost(actor)) {
            action = AbilityFactory.createAbilities(['rest'])[0]; 
            resolvedTargets = [actor]; 
        }
        
        this.state.message = action.id === 'rest' ? `${actor.name} had to rest!` : `${actor.name} used ${action.name}!`;
        action.payCost(actor, null);
        
        for (let target of resolvedTargets) {
            let actualTarget = target;
            
            if (actualTarget.isDead()) {
                const fallbackPool = actualTarget.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
                const livingTargets = fallbackPool.filter(t => t && !t.isDead());
                if (livingTargets.length === 0) continue; 
                actualTarget = livingTargets[Math.floor(Math.random() * livingTargets.length)];
            }
            
            const wasTargetDead = actualTarget.isDead();
            const wasActorDead = actor.isDead(); 

            const result = AbilitySystem.execute(action.id, actor, actualTarget);
            
            if (result.fled) {
                this.state.fled = true; 

                this.state.turnQueue = [
                    { type: TURN_TYPES.MESSAGE_STATUS, message: `${actor.name}'s party escapes!` },
                    { type: TURN_TYPES.BATTLE_END }
                ];
                break; 
            }

            if (result.message) {
                this.state.turnQueue.unshift({
                    type: TURN_TYPES.MESSAGE_STATUS,
                    message: result.message
                });
            }

            if (!wasTargetDead && actualTarget.isDead()) {
                this.handleDeath(actualTarget);
            }

            if (!wasActorDead && actor.isDead()) {
                this.handleDeath(actor);
                break; 
            }
        }

        if (!actor.isDead() && !this.state.fled) {
            this.processStatusEffects(actor, 'ON_TURN_END');
        }
    }

    // --- COMBAT RESOLUTION ---

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
            !member.isDead() && !activeArray.includes(member) &&
            !this.state.turnQueue.some(turn => turn.replacement === member) 
        );
        
        if (livingReserves.length > 0) {
            if (isParty) {
                // NEW: Push Prompt instead of Auto-Picking
                this.state.turnQueue.unshift({
                    type: TURN_TYPES.PROMPT_REINFORCEMENT,
                    slotIndex
                });
            } else {
                // Enemies still auto-pick first available
                const replacement = livingReserves[0];
                this.state.turnQueue.unshift({
                    type: TURN_TYPES.REINFORCEMENT,
                    team: 'enemy', slotIndex, replacement,
                    message: `${replacement.name} joins the battle!`
                });
            }
        }
        
        this.state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_DEATH, message: `${combatant.name} has been slain!` });
    }

    _checkBattleStatus() {
        const enemiesAlive = this.state.enemyRoster.filter(e => !e.isDead());
        const partyAlive = this.state.partyRoster.filter(p => !p.isDead());
        
        if (enemiesAlive.length === 0) this._handleVictory(); 
        else if (partyAlive.length === 0) this._handleDefeat(); 
        else {
            this._applyRoundEndRecovery();
            this._startActionPhase();
        }
    }

    _applyRoundEndRecovery() {
        const activeCombatants = [
            ...this.state.activeParty.filter(p => p && !p.isDead()),
            ...this.state.activeEnemies.filter(e => e && !e.isDead())
        ];
        activeCombatants.forEach(c => {
            c.modifyResource('stamina', c.stats?.staminaRecovery ?? 200);
            c.modifyResource('insight', c.stats?.insightRecovery ?? 100);
            if ((c.stats?.hpRecovery ?? 0) > 0) c.modifyResource('hp', c.stats.hpRecovery);
        });
    }

    // --- REWARDS & ENDGAME ---

    _calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        const stats = enemy.stats;
        let statSum = enemy.maxHp + (stats.speed ?? 10);
        if (stats.attack) statSum += Object.values(stats.attack).reduce((a, b) => a + b, 0);
        if (stats.defense) statSum += Object.values(stats.defense).reduce((a, b) => a + b, 0);
       
        return Math.floor(statSum * 0.15) + ((enemy.originalEntity.level || 1) * 10);
    }

    _handleVictory() {
        this.state.phase = PHASE.VICTORY;
        this.state.turnQueue = []; 
        
        let totalXp = 0;
        let totalCurrency = 0;
        let droppedItems = [];
        this.state.enemyRoster.forEach(enemy => {
            totalXp += this._calculateEnemyXp(enemy);
            const currReward = enemy.originalEntity.currencyReward || { min: 0, max: 0 };
            if (currReward.max > 0) totalCurrency += Math.floor(Math.random() * (currReward.max - currReward.min + 1)) + currReward.min;
            
            (enemy.originalEntity.lootTable || []).forEach(loot => {
                if (Math.random() <= loot.dropRate) droppedItems.push(loot.id);
            });
        });

        this._distributeVictoryRewards(totalXp, totalCurrency, droppedItems);
    }

    _distributeVictoryRewards(totalXp, totalCurrency, droppedItems) {
        this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: `Victory! The party gained ${totalXp} XP.` });

        const aliveParty = this.state.partyRoster.filter(m => !m.isDead());
        
        const xpPerMember = Math.floor(totalXp / Math.max(1, aliveParty.length));

        aliveParty.forEach(member => {
            if (ExperienceSystem.addXp(member.originalEntity, xpPerMember)) {
                this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: `${member.name} reached Level ${member.originalEntity.level}!` });
            }
        });

        if (totalCurrency > 0) {
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: `The party found ${totalCurrency} currency!` });
        }

        if (droppedItems.length > 0) {
            const itemCounts = droppedItems.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {});
            const lootStrings = Object.entries(itemCounts).map(([id, count]) => {
                InventorySystem.addItem(id, count);
                const readableName = id.replace(/_/g, ' '); 
                return count > 1 ? `${readableName} x${count}` : readableName;
            });
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: `Loot recovered: ${lootStrings.join(', ')}` });
        } else if (totalCurrency === 0) {
            this.state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: `The enemies left nothing useful behind.` });
        }

        this.state.turnQueue.push({ type: TURN_TYPES.BATTLE_END });
    }

    _handleDefeat() {
        this.state.phase = PHASE.DEFEAT;
        this.state.turnQueue = [{ type: TURN_TYPES.MESSAGE_DEFEAT, message: `The party has fallen in battle...` }, { type: TURN_TYPES.BATTLE_END }];
    }

    _endBattle() {
        this.state.partyRoster.forEach(combatant => {
            combatant.originalEntity.hp = combatant.hp;
            combatant.originalEntity.stamina = combatant.stamina;
            combatant.originalEntity.insight = combatant.insight;
            
            const effectsToRemove = combatant.originalEntity.statusEffects
                .filter(effect => !effect.persistAfterCombat)
                .map(effect => effect.id);
                
            effectsToRemove.forEach(effectId => {
                combatant.originalEntity.removeStatusEffect(effectId);
            });
        });

        this.state.active = false;

        events.emit('BATTLE_ENDED', { 
            victory: this.state.partyRoster.some(p => !p.isDead()),
            fled: !!this.state.fled 
        });
    }

    getState() { return this.state; }
}
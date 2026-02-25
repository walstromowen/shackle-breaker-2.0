import { gameState } from '../../../shared/state/gameState.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../../../shared/systems/factories/abilityFactory.js';
import { CombatCalculator } from '../../../shared/systems/combatCalculator.js';
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js'; 
import { ExperienceSystem } from '../../../shared/systems/experienceSystem.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';
import { events } from '../core/eventBus.js'; 
import { TargetingResolver } from '../../../shared/systems/targetingResolver.js';
import { StatusEffectFactory } from '../../../shared/systems/factories/statusEffectFactory.js';

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        
        this.state = null;
        this.timer = 0; 
    }

    start(enemies, context = {}) {
        // REMOVED: console.log(`[BattleController] Received Entities:`, enemies);
        
        const maxActive = context.maxActive || 3; 

        const party = gameState.party.members.map(member => this.createCombatant(member, 'party'));
        const preparedEnemies = enemies.map(enemy => this.createCombatant(enemy, 'enemy'));

        this.state = {
            active: true,
            phase: 'INTRO', 
            
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
            message: `Battle started!`
        };

        this.timer = 0;
    }

    createCombatant(entity, teamAllegiance) {
        const detailedStats = StatCalculator.calculateDetailed(entity);
        const calculatedMaxHp = detailedStats.maxHp?.total || 1;
        const calculatedMaxStamina = detailedStats.maxStamina?.total || 10;
        const calculatedMaxInsight = detailedStats.maxInsight?.total || 10;

        let currentHp = entity.hp ?? calculatedMaxHp;
        let currentStamina = entity.stamina ?? calculatedMaxStamina;
        let currentInsight = entity.insight ?? calculatedMaxInsight;

        currentHp = Math.min(currentHp, calculatedMaxHp);
        currentStamina = Math.min(currentStamina, calculatedMaxStamina);
        currentInsight = Math.min(currentInsight, calculatedMaxInsight);

        const abilityIdSet = new Set();

        const baseAbilities = entity.abilities || entity.state?.abilities || entity.definition?.abilities || [];
        if (Array.isArray(baseAbilities)) {
            baseAbilities.forEach(a => {
                const id = typeof a === 'string' ? a : a.id;
                if (id) abilityIdSet.add(id);
            });
        }

        const equipment = entity.equipment || entity.state?.equipment || entity.definition?.equipment || {};
        Object.entries(equipment).forEach(([slot, item]) => {
            if (!item) return;
            let itemDef = item;
            if (typeof item === 'string') {
                itemDef = ItemFactory.createItem(item); 
            } else {
                itemDef = item.definition || item;
            }

            if (!itemDef) return;

            const extractId = (a) => {
                const id = typeof a === 'string' ? a : a?.id;
                if (id) abilityIdSet.add(id);
            };

            if (itemDef.grantedAbilities && Array.isArray(itemDef.grantedAbilities)) {
                itemDef.grantedAbilities.forEach(extractId);
            }
            if (itemDef.grantedAbility) extractId(itemDef.grantedAbility);
            if (itemDef.useAbility) extractId(itemDef.useAbility);
        });

        if (abilityIdSet.size === 0) {
            abilityIdSet.add('punch'); 
        }

        const abilityArray = Array.from(abilityIdSet);
        const resolvedAbilities = AbilityFactory.createAbilities(abilityArray);

        // 1. Assign to a variable so we can process statuses before returning
        const combatant = {
            originalEntity: entity, 
            name: entity.name,
            team: teamAllegiance, 
            spritePortrait: entity.spritePortrait, 
            spriteOverworld: entity.spriteOverworld,
            maxHp: calculatedMaxHp,
            hp: currentHp,
            maxStamina: calculatedMaxStamina,
            stamina: currentStamina,
            maxInsight: calculatedMaxInsight,
            insight: currentInsight,
            stats: detailedStats,
            abilities: resolvedAbilities,

            // --- DELEGATED STATUS EFFECTS ---
            get statusEffects() { return this.originalEntity.statusEffects; },

            get baseStats() { return this.stats; },
            getAttack(type) { return this.stats.attack?.[type] || 0; },
            getDefense(type) { return this.stats.defense?.[type] || 0; },

            isDead() { return this.hp <= 0; },
            
            modifyResource(resource, amount) {
                if (this[resource] !== undefined) {
                    const maxProp = 'max' + resource.charAt(0).toUpperCase() + resource.slice(1);
                    this[resource] = Math.max(0, Math.min(this[maxProp], this[resource] + amount));
                }
            },

            // Delegate to the EntityModel, unconditional logging
            applyStatusEffect(effect) {
                console.debug(`[Status Debug] Delegating '${effect.id}' to EntityModel for ${this.name}.`);
                this.originalEntity.applyStatusEffect(effect);
            },

            removeStatusEffect(effectId) {
                console.debug(`[Status Debug] Removing effect '${effectId}' from EntityModel for ${this.name}.`);
                this.originalEntity.removeStatusEffect(effectId);
            }
        };

        // 2. Parse starting statuses (from the Map logic)
        if (entity.startingStatuses && Array.isArray(entity.startingStatuses)) {
            entity.startingStatuses.forEach(statusId => {
                const newStatus = StatusEffectFactory.createEffect(statusId, null, combatant);
                if (newStatus) {
                    combatant.applyStatusEffect(newStatus);
                }
            });
        }

        return combatant;
    }

    handleKeyDown(key) {
        if (!this.state || !this.state.active) return;
        if (this.state.phase === 'INTRO' || this.state.phase === 'RESOLVE' || this.state.phase === 'VICTORY' || this.state.phase === 'DEFEAT') return;

        if (this.state.phase === 'SELECT_ACTION') {
            this.handleActionSelection(key);
        } else if (this.state.phase === 'SELECT_TARGET') {
            this.handleTargetSelection(key);
        }
    }

    handleActionSelection(key) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;

        if (key === 'ArrowRight') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
        } 
        else if (key === 'ArrowLeft') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
        }
        else if (key === 'Enter') {
            const attemptedAction = activeChar.abilities[this.state.menuIndex];

            if (!attemptedAction.canPayCost(activeChar)) {
                this.state.message = `Not enough resources to use ${attemptedAction.name}!`;
                return; 
            }

            this.state.selectedAction = attemptedAction;
            this.state.selectedTargets = []; 
            this.state.message = `Select a target for ${attemptedAction.name}`;
            
            const scope = attemptedAction.targeting?.scope || 'enemy';
            
            if (scope === 'self') {
                this.commitAction(activeChar);
            } 
            else if (scope === 'all_enemies' || scope === 'all_allies') {
                this.state.phase = 'SELECT_TARGET';
                this.state.targetGroup = scope === 'all_allies' ? 'party' : 'enemy';
                this.state.targetIndex = 'ALL'; 
            } 
            else {
                this.state.phase = 'SELECT_TARGET';
                this.state.targetGroup = scope === 'ally' ? 'party' : 'enemy';
                
                const targetArray = this.state.targetGroup === 'party' ? this.state.activeParty : this.state.activeEnemies;
                const firstValidTarget = targetArray.findIndex(t => t && !t.isDead());
                this.state.targetIndex = firstValidTarget !== -1 ? firstValidTarget : 0; 
            }
        }
    }

    handleTargetSelection(key) {
        const targetArray = this.state.targetGroup === 'party' 
            ? this.state.activeParty 
            : this.state.activeEnemies;

        if (this.state.targetIndex === 'ALL') {
            if (key === 'Enter') {
                this.commitAction('ALL'); 
            } else if (key === 'Escape') {
                this.state.phase = 'SELECT_ACTION';
                this.state.selectedAction = null;
                this.state.targetGroup = null;
            }
            return;
        }

        const targetCount = targetArray.length;

        const cycleTarget = (direction) => {
            let nextIndex = this.state.targetIndex;
            for (let i = 0; i < targetCount; i++) {
                nextIndex = (nextIndex + direction + targetCount) % targetCount;
                const checkTarget = targetArray[nextIndex];
                
                if (checkTarget && !checkTarget.isDead()) {
                    return nextIndex;
                }
            }
            return this.state.targetIndex; 
        };

        if (key === 'ArrowDown' || key === 'ArrowRight') {
            this.state.targetIndex = cycleTarget(1);
        }
        else if (key === 'ArrowUp' || key === 'ArrowLeft') {
            this.state.targetIndex = cycleTarget(-1);
        }
        else if (key === 'Enter') {
            const target = targetArray[this.state.targetIndex];
            
            if (target && !target.isDead()) {
                const targeting = this.state.selectedAction.targeting || {};
                
                if (targeting.select === 'multiple') {
                    const requiredCount = targeting.count || 1;
                    if (!this.state.selectedTargets) {
                        this.state.selectedTargets = [];
                    }
                    this.state.selectedTargets.push(target);
                    
                    if (this.state.selectedTargets.length >= requiredCount) {
                        this.commitAction(this.state.selectedTargets);
                        this.state.selectedTargets = []; 
                    } else {
                        const currentNum = this.state.selectedTargets.length + 1;
                        this.state.message = `Select target ${currentNum} of ${requiredCount} for ${this.state.selectedAction.name}`;
                    }
                } else {
                    this.commitAction(target);
                }
            }
        }
        else if (key === 'Escape') {
            if (this.state.selectedTargets && this.state.selectedTargets.length > 0) {
                this.state.selectedTargets.pop(); 
                const requiredCount = this.state.selectedAction.targeting?.count || 1;
                const currentNum = this.state.selectedTargets.length + 1;
                this.state.message = `Select target ${currentNum} of ${requiredCount} for ${this.state.selectedAction.name}`;
            } else {
                this.state.phase = 'SELECT_ACTION';
                this.state.selectedAction = null;
                this.state.targetGroup = null; 
                this.state.selectedTargets = [];
            }
        }
    }

    commitAction(primaryTarget) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];

        if (!this.state.selectedAction.canPayCost(activeChar)) return;

        this.state.turnQueue.push({
            actor: activeChar,
            action: this.state.selectedAction,
            target: primaryTarget 
        });

        do {
            this.state.activePartyIndex++;
        } while (
            this.state.activePartyIndex < this.state.activeParty.length &&
            (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())
        );

        if (this.state.activePartyIndex < this.state.activeParty.length) {
            this.state.phase = 'SELECT_ACTION';
            this.state.menuIndex = 0;
            this.state.selectedAction = null;
        } else {
            this.queueEnemyActions();
            this.sortTurnQueue();

            this.state.phase = 'RESOLVE';
            this.state.message = "Turns Processing..."; 
            this.timer = 0; 
        }
    }

    queueEnemyActions() {
        this.state.activeEnemies.forEach(enemy => {
            if (!enemy || enemy.isDead()) return; 

            let validAIAbilities = enemy.abilities.filter(ability => ability.canPayCost(enemy));
            validAIAbilities = validAIAbilities.filter(a => a.id !== 'rest' && a.id !== 'punch');

            if (validAIAbilities.length === 0) {
                const restAbility = AbilityFactory.createAbilities(['rest'])[0];
                this.state.turnQueue.push({
                    actor: enemy,
                    action: restAbility,
                    target: enemy 
                });
                return; 
            }

            const randomAbility = validAIAbilities[Math.floor(Math.random() * validAIAbilities.length)];
            const livingParty = this.state.activeParty.filter(p => p && !p.isDead());
            
            if (livingParty.length > 0) {
                const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];
                this.state.turnQueue.push({
                    actor: enemy,
                    action: randomAbility,
                    target: randomTarget
                });
            }
        });
    }

    sortTurnQueue() {
        this.state.turnQueue.sort((a, b) => {
            const speedA = (a.actor.stats?.speed?.total || 10) * (a.action.speedModifier ?? 1);
            const speedB = (b.actor.stats?.speed?.total || 10) * (b.action.speedModifier ?? 1);
            return speedB - speedA; 
        });
    }

    update(dt) {
        if (!this.state || !this.state.active) return;

        if (this.state.phase === 'INTRO') {
            this.timer += dt; 
            if (this.timer > 1.5) { 
                this.state.phase = 'SELECT_ACTION';
                this.state.message = "What will you do?"; 
                this.state.menuIndex = 0;
                this.state.activePartyIndex = 0;
                this.state.turnQueue = [];
                this.timer = 0;

                while(this.state.activePartyIndex < this.state.activeParty.length && 
                      (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())) {
                    this.state.activePartyIndex++;
                }
            }
        }
        
        if (this.state.phase === 'RESOLVE' || this.state.phase === 'VICTORY' || this.state.phase === 'DEFEAT') {
            this.timer += dt;
            if (this.timer >= 1.5) {
                this.timer = 0;
                if (this.state.turnQueue.length > 0) {
                    const currentTurn = this.state.turnQueue.shift();
                    this.executeTurn(currentTurn);
                } else if (this.state.phase === 'RESOLVE') {
                    this.checkBattleStatus();
                }
            }
        }
    }

    processStatusEffects(combatant, triggerEvent, context = {}) {
        if (!combatant || combatant.isDead()) return false;
        let skipTurn = false;

        if (combatant.statusEffects.length > 0) {
            console.debug(`[Status Debug] Firing event '${triggerEvent}' on ${combatant.name}. Active effects:`, combatant.statusEffects.map(e => e.id));
        }

        for (let i = combatant.statusEffects.length - 1; i >= 0; i--) {
            const status = combatant.statusEffects[i];
            
            const result = status.onEvent(triggerEvent, combatant, context);
            
            if (result.cancelAction || result.messages?.length > 0) {
                console.debug(`[Status Debug] Effect '${status.id}' triggered. Payload result:`, result);
            }

            if (result.cancelAction) {
                skipTurn = true;
            }

            if (result.messages && result.messages.length > 0) {
                result.messages.forEach(msg => {
                    this.state.turnQueue.unshift({
                        type: 'STATUS_MESSAGE',
                        message: msg
                    });
                });
            }

            if (combatant.isDead()) {
                console.debug(`[Status Debug] ${combatant.name} died to status effect '${status.id}' during ${triggerEvent}!`);
                this.handleDeath(combatant);
                break; 
            }

            if (context.attacker && context.attacker.isDead()) {
                console.debug(`[Status Debug] Attacker ${context.attacker.name} died to retaliation status effect '${status.id}'!`);
                this.handleDeath(context.attacker);
            }

            if (status.isExpired()) {
                console.debug(`[Status Debug] Effect '${status.id}' expired on ${combatant.name}.`);
                combatant.removeStatusEffect(status.id);
            }
        }
        return skipTurn;
    }

    executeTurn(turn) {
        if (turn.type === 'VICTORY_MESSAGE' || turn.type === 'DEFEAT_MESSAGE' || turn.type === 'STATUS_MESSAGE') {
            this.state.message = turn.message;
            return;
        }

        if (turn.type === 'BATTLE_END') {
            this.state.partyRoster.forEach(combatant => {
                combatant.originalEntity.hp = combatant.hp;
                combatant.originalEntity.stamina = combatant.stamina;
                combatant.originalEntity.insight = combatant.insight;
                combatant.statusEffects = []; 
            });

            this.state.active = false;
            
            const isVictory = this.state.partyRoster.some(p => !p.isDead());
            events.emit('BATTLE_ENDED', { victory: isVictory });
            return;
        }

        if (turn.type === 'DEATH_MESSAGE') {
            this.state.message = turn.message;
            return;
        }
        
        if (turn.type === 'REINFORCEMENT') {
            const activeArray = turn.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
            activeArray[turn.slotIndex] = turn.replacement; 
            this.state.message = turn.message;
            return;
        }

        let { actor, action, target: primaryTarget } = turn;

        if (actor.isDead()) return; 

        const skipAction = this.processStatusEffects(actor, 'ON_TURN_START');
        if (skipAction) {
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

        if (action.id === 'rest') {
            this.state.message = `${actor.name} had to rest!`;
        } else {
            this.state.message = `${actor.name} used ${action.name}!`;
        }

        action.payCost(actor, null);

        resolvedTargets.forEach(target => {
            let currentTarget = target;
            if (currentTarget.isDead()) {
                const fallbackPool = currentTarget.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
                const livingTargets = fallbackPool.filter(t => t && !t.isDead());
                
                if (livingTargets.length === 0) return; 
                currentTarget = livingTargets[Math.floor(Math.random() * livingTargets.length)];
            }

            action.effects.forEach((effect) => {
                if (effect.type === 'damage') {
                    let calcResult;
                    const element = effect.element || (action.type === 'magic' ? 'fire' : 'blunt');
                    const abilityAccuracy = action.accuracy ?? 1.0;

                    if (action.type === 'physical') {
                        calcResult = CombatCalculator.calculatePhysical(actor, currentTarget, effect.power, element, abilityAccuracy);
                    } else if (action.type === 'magic') {
                        calcResult = CombatCalculator.calculateMagic(actor, currentTarget, effect.power, element, abilityAccuracy);
                    } else {
                        calcResult = { hit: true, crit: false, damage: effect.power || 1, message: "" };
                    }

                    if (!calcResult.hit) return; 

                    const wasDead = currentTarget.isDead();
                    currentTarget.modifyResource('hp', -calcResult.damage);

                    this.processStatusEffects(currentTarget, 'ON_DAMAGE_RECEIVED', { damage: calcResult.damage, attacker: actor });
                    this.processStatusEffects(actor, 'ON_DAMAGE_DEALT', { damage: calcResult.damage, target: currentTarget });
                    
                    if (!wasDead && currentTarget.isDead()) {
                        this.handleDeath(currentTarget);
                    }
                } 
                else if (effect.type === 'recover') {
                    const resourceType = effect.resource || 'hp'; 
                    const maxStatName = 'max' + resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
                    const maxResource = currentTarget[maxStatName] || currentTarget.stats?.[maxStatName]?.total || 100;
                    let healAmount = effect.amount ? effect.amount : Math.floor(maxResource * effect.power);

                    currentTarget.modifyResource(resourceType, healAmount);
                }
                else if (effect.type === 'resource_damage') {
                    const resourceType = effect.resource || 'insight';
                    const drain = effect.amount || effect.power;
                    currentTarget.modifyResource(resourceType, -drain);
                }
                else if (effect.type === 'status') {
                    const newStatus = StatusEffectFactory.createEffect(effect.statusId, effect.charges, actor);
                    if (newStatus) {
                        currentTarget.applyStatusEffect(newStatus);
                        
                        this.state.turnQueue.unshift({
                            type: 'STATUS_MESSAGE',
                            message: `${currentTarget.name} was inflicted with ${newStatus.name}!`
                        });
                    }
                }
            });
        });

        this.processStatusEffects(actor, 'ON_TURN_END');
    }

    handleDeath(combatant) {
        this.state.turnQueue = this.state.turnQueue.filter(turn => turn.actor !== combatant);
        
        const isParty = combatant.team === 'party';
        const activeArray = isParty ? this.state.activeParty : this.state.activeEnemies;
        const rosterArray = isParty ? this.state.partyRoster : this.state.enemyRoster;
        
        const slotIndex = activeArray.indexOf(combatant);
        if (slotIndex === -1) return;

        const replacement = rosterArray.find(member => 
            !member.isDead() && 
            !activeArray.includes(member) &&
            !this.state.turnQueue.some(turn => turn.replacement === member) 
        );

        if (replacement) {
            this.state.turnQueue.unshift({
                type: 'REINFORCEMENT',
                team: combatant.team,
                slotIndex: slotIndex,
                replacement: replacement,
                message: `${replacement.name} joins the battle!`
            });
        }

        this.state.turnQueue.unshift({
            type: 'DEATH_MESSAGE',
            message: `${combatant.name} has been slain!`
        });
    }

    calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        
        const stats = enemy.stats;
        let statSum = enemy.maxHp;
        
        if (stats.attack) {
            statSum += Object.values(stats.attack).reduce((a, b) => a + b, 0);
        }
        if (stats.defense) {
            statSum += Object.values(stats.defense).reduce((a, b) => a + b, 0);
        }
        
        statSum += (stats.speed?.total || 10);
        
        const levelMultiplier = (enemy.originalEntity.level || 1) * 10;
        return Math.floor(statSum * 0.15) + levelMultiplier;
    }

    handleVictory() {
        this.state.phase = 'VICTORY';
        this.state.turnQueue = []; 
        
        let totalXp = 0;
        let totalCurrency = 0;
        let droppedItems = [];

        this.state.enemyRoster.forEach(enemy => {
            const entityDef = enemy.originalEntity;
            
            totalXp += this.calculateEnemyXp(enemy);

            const currencyDef = entityDef.currencyReward || { min: 0, max: 0 };
            if (currencyDef.max > 0) {
                totalCurrency += Math.floor(Math.random() * (currencyDef.max - currencyDef.min + 1)) + currencyDef.min;
            }

            const lootTable = entityDef.lootTable || [];
            lootTable.forEach(loot => {
                if (Math.random() <= loot.dropRate) {
                    droppedItems.push(loot.id);
                }
            });
        });

        this.state.turnQueue.push({
            type: 'VICTORY_MESSAGE',
            message: `Victory! The party gained ${totalXp} XP.`
        });

        const aliveParty = this.state.partyRoster.filter(member => !member.isDead());
        const xpPerMember = Math.floor(totalXp / aliveParty.length);

        aliveParty.forEach(member => {
            const leveledUp = ExperienceSystem.addXp(member.originalEntity, xpPerMember);
            if (leveledUp) {
                this.state.turnQueue.push({
                    type: 'VICTORY_MESSAGE',
                    message: `${member.name} reached Level ${member.originalEntity.level}!`
                });
            }
        });

        if (totalCurrency > 0) {
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            this.state.turnQueue.push({
                type: 'VICTORY_MESSAGE',
                message: `The party found ${totalCurrency} currency!`
            });
        }

        if (droppedItems.length > 0) {
            const itemCounts = droppedItems.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
            }, {});

            const lootStrings = [];

            Object.entries(itemCounts).forEach(([itemId, count]) => {
                InventorySystem.addItem(itemId, count);

                const readableName = itemId.replace(/_/g, ' '); 
                lootStrings.push(count > 1 ? `${readableName} x${count}` : readableName);
            });

            this.state.turnQueue.push({
                type: 'VICTORY_MESSAGE',
                message: `Loot recovered: ${lootStrings.join(', ')}`
            });
        } else {
            if (totalCurrency === 0) {
                this.state.turnQueue.push({
                    type: 'VICTORY_MESSAGE',
                    message: `The enemies left nothing useful behind.`
                });
            }
        }

        this.state.turnQueue.push({
            type: 'BATTLE_END'
        });
    }

    handleDefeat() {
        this.state.phase = 'DEFEAT';
        this.state.turnQueue = []; 
        
        this.state.turnQueue.push({
            type: 'DEFEAT_MESSAGE',
            message: `The party has fallen in battle...`
        });

        this.state.turnQueue.push({
            type: 'BATTLE_END'
        });
    }

    checkBattleStatus() {
        const enemiesAlive = this.state.enemyRoster.filter(e => !e.isDead());
        const partyAlive = this.state.partyRoster.filter(p => !p.isDead());

        if (enemiesAlive.length === 0) {
            this.handleVictory(); 
        } else if (partyAlive.length === 0) {
            this.handleDefeat(); 
        } else {
            this.applyRoundEndRecovery();

            this.state.phase = 'SELECT_ACTION';
            this.state.activePartyIndex = 0;
            this.state.menuIndex = 0;
            this.state.message = "What will you do?";
            
            while(this.state.activePartyIndex < this.state.activeParty.length && 
                 (!this.state.activeParty[this.state.activePartyIndex] || this.state.activeParty[this.state.activePartyIndex].isDead())) {
                this.state.activePartyIndex++;
            }
        }
    }

    applyRoundEndRecovery() {
        const activeCombatants = [
            ...this.state.activeParty.filter(p => p && !p.isDead()),
            ...this.state.activeEnemies.filter(e => e && !e.isDead())
        ];

        activeCombatants.forEach(combatant => {
            const staminaRegen = combatant.stats?.staminaRecovery ?? 2;
            const insightRegen = combatant.stats?.insightRecovery ?? 1;
            const hpRegen = combatant.stats?.hpRecovery ?? 0; 

            combatant.modifyResource('stamina', staminaRegen);
            combatant.modifyResource('insight', insightRegen);
            
            if (hpRegen > 0) {
                combatant.modifyResource('hp', hpRegen);
            }
        });
    }

    getState() {
        return this.state;
    }
}
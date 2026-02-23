import { gameState } from '../../../shared/state/gameState.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../../../shared/systems/factories/abilityFactory.js';
import { CombatCalculator } from '../../../shared/systems/combatCalculator.js';
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js'; 
import { ExperienceSystem } from '../../../shared/systems/experienceSystem.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';

// NEW: Import the event bus to handle decoupling
import { events } from '../core/eventBus.js'; 

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        
        this.state = null;
        this.timer = 0; 
    }

    start(enemies, context = {}) {
        console.log(`[BattleController] Received Entities:`, enemies);
        
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
            message: `Battle started!`
        };

        this.timer = 0;
    }

    createCombatant(entity, teamAllegiance) {
        const detailedStats = StatCalculator.calculateDetailed(entity);
        const calculatedMaxHp = detailedStats.maxHp.total;
        const calculatedMaxStamina = detailedStats.maxStamina?.total || 10;
        const calculatedMaxInsight = detailedStats.maxInsight?.total || 10;

        let currentHp = entity.hp ?? calculatedMaxHp;
        let currentStamina = entity.stamina ?? calculatedMaxStamina;
        let currentInsight = entity.insight ?? calculatedMaxInsight;

        currentHp = Math.min(currentHp, calculatedMaxHp);
        currentStamina = Math.min(currentStamina, calculatedMaxStamina);
        currentInsight = Math.min(currentInsight, calculatedMaxInsight);

        const abilityIdSet = new Set();
        console.log(`\n[Battle Debug] --- Processing ${entity.name} ---`);

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

        return {
            originalEntity: entity, // <-- Crucial: this holds the persistent object!
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

            get baseStats() { return this.stats; },
            getAttack(type) { return this.stats.attack?.[type] || 0; },
            getDefense(type) { return this.stats.defense?.[type] || 0; },

            isDead() { return this.hp <= 0; },
            modifyResource(resource, amount) {
                if (this[resource] !== undefined) {
                    const maxProp = 'max' + resource.charAt(0).toUpperCase() + resource.slice(1);
                    this[resource] = Math.max(0, Math.min(this[maxProp], this[resource] + amount));
                }
            }
        };
    }

    handleKeyDown(key) {
        if (!this.state || !this.state.active) return;
        if (this.state.phase === 'INTRO' || this.state.phase === 'RESOLVE' || this.state.phase === 'VICTORY' || this.state.phase === 'DEFEAT') return;

        if (this.state.phase === 'SELECT_ACTION') {
            this.handleActionSelection(key);
        } else if (this.state.phase === 'SELECT_TARGET') {
            this.handleTargetSelection(key);
        } else if (key === 'Escape') {
            this.state.active = false;
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
            this.state.message = `Select a target for ${attemptedAction.name}`; 
            
            if (this.state.selectedAction.targeting && this.state.selectedAction.targeting.scope === 'self') {
                this.commitAction(activeChar);
            } else {
                this.state.phase = 'SELECT_TARGET';
                this.state.targetIndex = 0; 
            }
        }
    }

    handleTargetSelection(key) {
        const enemyCount = this.state.activeEnemies.length;

        if (key === 'ArrowDown' || key === 'ArrowRight') {
            this.state.targetIndex = (this.state.targetIndex + 1) % enemyCount;
        }
        else if (key === 'ArrowUp' || key === 'ArrowLeft') {
            this.state.targetIndex = (this.state.targetIndex - 1 + enemyCount) % enemyCount;
        }
        else if (key === 'Enter') {
            const target = this.state.activeEnemies[this.state.targetIndex];
            this.commitAction(target);
        }
        else if (key === 'Escape') {
            this.state.phase = 'SELECT_ACTION';
            this.state.selectedAction = null;
        }
    }

    commitAction(target) {
        const activeChar = this.state.activeParty[this.state.activePartyIndex];

        if (!this.state.selectedAction.canPayCost(activeChar)) return;

        this.state.turnQueue.push({
            actor: activeChar,
            action: this.state.selectedAction,
            target: target
        });

        if (this.state.activePartyIndex < this.state.activeParty.length - 1) {
            this.state.activePartyIndex++;
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
            if (enemy.isDead()) return;

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
            const livingParty = this.state.activeParty.filter(p => !p.isDead());
            
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
            const speedA = (a.actor.stats?.speed?.total || 10) * a.action.speedModifier;
            const speedB = (b.actor.stats?.speed?.total || 10) * b.action.speedModifier;
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
            }
        }
        
        // Let the update loop process the queue during Resolve, Victory, AND Defeat phases
        if (this.state.phase === 'RESOLVE' || this.state.phase === 'VICTORY' || this.state.phase === 'DEFEAT') {
            this.timer += dt;
            if (this.timer >= 1.5) {
                this.timer = 0;
                if (this.state.turnQueue.length > 0) {
                    const currentTurn = this.state.turnQueue.shift();
                    this.executeTurn(currentTurn);
                } else if (this.state.phase === 'RESOLVE') {
                    // Only run status checks if we are still actively fighting
                    this.checkBattleStatus();
                }
            }
        }
    }

    executeTurn(turn) {
        // --- NARRATIVE MESSAGES ---
        if (turn.type === 'VICTORY_MESSAGE' || turn.type === 'DEFEAT_MESSAGE') {
            this.state.message = turn.message;
            return;
        }

        // --- NEW: STAT SYNC AND BATTLE END VIA EVENT BUS ---
        if (turn.type === 'BATTLE_END') {
            // 1. Sync the final battle stats back to the persistent entities
            this.state.partyRoster.forEach(combatant => {
                combatant.originalEntity.hp = combatant.hp;
                combatant.originalEntity.stamina = combatant.stamina;
                combatant.originalEntity.insight = combatant.insight;
            });

            // 2. Shut down the battle
            this.state.active = false;
            
            // 3. Emit the event to the Scene Manager
            const isVictory = this.state.partyRoster.some(p => !p.isDead());
            events.emit('BATTLE_ENDED', { victory: isVictory });
            return;
        }

        // --- DEATH & REINFORCEMENT ---
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

        // --- STANDARD COMBAT LOGIC ---
        let { actor, action, target } = turn;

        if (actor.isDead()) return; 
        
        if (target.isDead()) {
            const targetTeam = target.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
            const newTarget = targetTeam.find(t => !t.isDead());
            
            if (newTarget) {
                target = newTarget;
            } else {
                this.state.message = `But there were no targets left!`;
                return;
            }
        }

        if (!action.canPayCost(actor)) {
            action = AbilityFactory.createAbilities(['rest'])[0]; 
            target = actor; 
        }

        action.payCost(actor, null);

        let totalDamage = 0;
        let totalHeal = 0; 
        let missed = false;
        let critMsg = "";

        action.effects.forEach((effect) => {
            if (effect.type === 'damage') {
                let calcResult;
                const element = effect.element || (action.type === 'magic' ? 'fire' : 'blunt');
                const abilityAccuracy = action.accuracy ?? 1.0;

                if (action.type === 'physical') {
                    calcResult = CombatCalculator.calculatePhysical(actor, target, effect.power, element, abilityAccuracy);
                } else if (action.type === 'magic') {
                    calcResult = CombatCalculator.calculateMagic(actor, target, effect.power, element, abilityAccuracy);
                } else {
                    calcResult = { hit: true, crit: false, damage: effect.power || 1, message: "" };
                }

                if (!calcResult.hit) {
                    missed = true;
                    return; 
                }

                if (calcResult.crit) critMsg = " Critical hit!";

                target.modifyResource('hp', -calcResult.damage);
                totalDamage += calcResult.damage;
                
                if (target.isDead()) {
                    this.handleDeath(target);
                }
            } 
            else if (effect.type === 'recover') {
                const resourceType = effect.resource || 'hp'; 
                const maxStatName = 'max' + resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
                const maxResource = target[maxStatName] || target.stats?.[maxStatName]?.total || 100;
                let healAmount = effect.amount ? effect.amount : Math.floor(maxResource * effect.power);

                target.modifyResource(resourceType, healAmount);
                if (resourceType === 'hp') totalHeal += healAmount;
            }
            else if (effect.type === 'resource_damage') {
                const resourceType = effect.resource || 'insight';
                const drain = effect.amount || effect.power;
                target.modifyResource(resourceType, -drain);
            }
        });

        if (missed) {
             this.state.message = `${actor.name} used ${action.name} but missed!`;
        } else if (action.id === 'rest') {
             this.state.message = `${actor.name} had to rest!`;
        } else if (totalDamage > 0) {
             this.state.message = `${actor.name} used ${action.name} for ${totalDamage} damage!${critMsg}`;
        } else if (totalHeal > 0) {
             this.state.message = `${actor.name} used ${action.name} and recovered ${totalHeal} HP!`;
        } else {
             this.state.message = `${actor.name} used ${action.name}!`;
        }
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

        // 1. Calculate all rewards from the enemy roster
        this.state.enemyRoster.forEach(enemy => {
            const entityDef = enemy.originalEntity;
            
            // Calculate XP
            totalXp += this.calculateEnemyXp(enemy);

            // Calculate Currency
            const currencyDef = entityDef.currencyReward || { min: 0, max: 0 };
            if (currencyDef.max > 0) {
                totalCurrency += Math.floor(Math.random() * (currencyDef.max - currencyDef.min + 1)) + currencyDef.min;
            }

            // Calculate Item Drops
            const lootTable = entityDef.lootTable || [];
            lootTable.forEach(loot => {
                if (Math.random() <= loot.dropRate) {
                    droppedItems.push(loot.id);
                }
            });
        });

        // 2. Push XP Message & Apply Level Ups
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

        // 3. Apply Currency and push message
        if (totalCurrency > 0) {
            // Ensure the party wallet exists, then add to it
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            this.state.turnQueue.push({
                type: 'VICTORY_MESSAGE',
                message: `The party found ${totalCurrency} currency!`
            });
        }

        // 4. Apply Loot and push message
        if (droppedItems.length > 0) {
            // Group duplicates into an object first: { "wolf_pelt": 2, "beast_fang": 1 }
            const itemCounts = droppedItems.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
            }, {});

            const lootStrings = [];

            // Iterate through our grouped items
            Object.entries(itemCounts).forEach(([itemId, count]) => {
                // Delegate to your inventory system to handle stacks and models!
                InventorySystem.addItem(itemId, count);

                // Format the string for the player message (e.g. "wolf pelt x2")
                const readableName = itemId.replace(/_/g, ' '); 
                lootStrings.push(count > 1 ? `${readableName} x${count}` : readableName);
            });

            this.state.turnQueue.push({
                type: 'VICTORY_MESSAGE',
                message: `Loot recovered: ${lootStrings.join(', ')}`
            });
        } else {
            // Only show this if they got absolutely nothing (no items, no coins)
            if (totalCurrency === 0) {
                this.state.turnQueue.push({
                    type: 'VICTORY_MESSAGE',
                    message: `The enemies left nothing useful behind.`
                });
            }
        }

        // 5. Finally, tell the queue to wrap up the battle
        this.state.turnQueue.push({
            type: 'BATTLE_END'
        });
    }

    handleDefeat() {
        this.state.phase = 'DEFEAT';
        this.state.turnQueue = [];

        this.state.turnQueue.push({
            type: 'DEFEAT_MESSAGE',
            message: "The party has fallen..."
        });

        this.state.turnQueue.push({
            type: 'BATTLE_END'
        });
    }

    checkBattleStatus() {
        const enemiesAlive = this.state.enemyRoster.filter(e => !e.isDead());
        const partyAlive = this.state.partyRoster.filter(p => !p.isDead());

        if (enemiesAlive.length === 0) {
            this.handleVictory(); // Trigger the victory sequence!
        } else if (partyAlive.length === 0) {
            this.handleDefeat(); // Trigger the defeat sequence!
        } else {
            this.state.phase = 'SELECT_ACTION';
            this.state.activePartyIndex = 0;
            this.state.menuIndex = 0;
            this.state.message = "What will you do?";
            
            while(this.state.activeParty[this.state.activePartyIndex] && this.state.activeParty[this.state.activePartyIndex].isDead()) {
                this.state.activePartyIndex++;
            }
        }
    }

    getState() {
        return this.state;
    }
}
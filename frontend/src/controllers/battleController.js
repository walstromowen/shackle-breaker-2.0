import { gameState } from '../../../shared/state/gameState.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../../../shared/systems/factories/abilityFactory.js';

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        
        this.state = null;
        this.timer = 0; 
    }

    start(enemies, context) {
        console.log(`[BattleController] Received Entities:`, enemies);

        const party = gameState.party.members.map(member => this.createCombatant(member, 'party'));
        const preparedEnemies = enemies.map(enemy => this.createCombatant(enemy, 'enemy'));

        this.state = {
            active: true,
            phase: 'INTRO', 
            party: party,    
            enemies: preparedEnemies,
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
        // Stats Logic
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

        // --- DEBUG: Check the incoming entity ---
        console.log(`\n[Battle Debug] --- Processing ${entity.name} ---`);
        console.log(`[Battle Debug] Raw equipment object:`, entity.equipment);

        // Strict check for innate abilities
        if (Array.isArray(entity.abilities)) {
            entity.abilities.forEach(a => {
                const id = typeof a === 'string' ? a : a.id;
                if (id) abilityIdSet.add(id);
            });
        }

        // Strict check for equipment abilities
        if (entity.equipment) {
            Object.entries(entity.equipment).forEach(([slot, item]) => {
                if (!item) return;

                // --- DEBUG: Check each item ---
                console.log(`[Battle Debug] Slot '${slot}' holds item:`, item.name || item.id || item);

                // FIX: Point to the nested definition object where the item data actually lives
                const itemDef = item.definition || item;

                // Helper to safely extract string IDs, even if they are passed as objects
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
        }

        if (abilityIdSet.size === 0) {
            abilityIdSet.add('punch'); 
        }

        const abilityArray = Array.from(abilityIdSet);
        
        // --- DEBUG: Check the extracted IDs ---
        console.log(`[Battle Debug] Final Extracted IDs for Factory:`, abilityArray);

        const resolvedAbilities = AbilityFactory.createAbilities(abilityArray);
        
        // --- DEBUG: Check what the factory actually created ---
        console.log(`[Battle Debug] Factory output:`, resolvedAbilities);

        return {
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

            isDead() {
                return this.hp <= 0;
            },
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
        
        if (this.state.phase === 'INTRO' || this.state.phase === 'RESOLVE') return;

        if (this.state.phase === 'SELECT_ACTION') {
            this.handleActionSelection(key);
        } 
        else if (this.state.phase === 'SELECT_TARGET') {
            this.handleTargetSelection(key);
        }
        else if (key === 'Escape') {
             this.state.active = false;
        }
    }

    handleActionSelection(key) {
        const activeChar = this.state.party[this.state.activePartyIndex];
        const abilityCount = activeChar.abilities.length;

        if (key === 'ArrowRight') {
            this.state.menuIndex = (this.state.menuIndex + 1) % abilityCount;
        } 
        else if (key === 'ArrowLeft') {
            this.state.menuIndex = (this.state.menuIndex - 1 + abilityCount) % abilityCount;
        }
        else if (key === 'Enter') {
            this.state.selectedAction = activeChar.abilities[this.state.menuIndex];
            
            if (this.state.selectedAction.targeting && this.state.selectedAction.targeting.scope === 'self') {
                this.commitAction(activeChar);
            } else {
                this.state.phase = 'SELECT_TARGET';
                this.state.targetIndex = 0; 
            }
        }
    }

    handleTargetSelection(key) {
        const enemyCount = this.state.enemies.length;

        if (key === 'ArrowDown' || key === 'ArrowRight') {
            this.state.targetIndex = (this.state.targetIndex + 1) % enemyCount;
        }
        else if (key === 'ArrowUp' || key === 'ArrowLeft') {
            this.state.targetIndex = (this.state.targetIndex - 1 + enemyCount) % enemyCount;
        }
        else if (key === 'Enter') {
            const target = this.state.enemies[this.state.targetIndex];
            this.commitAction(target);
        }
        else if (key === 'Escape') {
            this.state.phase = 'SELECT_ACTION';
            this.state.selectedAction = null;
        }
    }

    commitAction(target) {
        const activeChar = this.state.party[this.state.activePartyIndex];

        if (!this.state.selectedAction.canPayCost(activeChar)) {
            console.log(`Not enough resources to use ${this.state.selectedAction.name}!`);
            return;
        }

        this.state.turnQueue.push({
            actor: activeChar,
            action: this.state.selectedAction,
            target: target
        });

        if (this.state.activePartyIndex < this.state.party.length - 1) {
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
        this.state.enemies.forEach(enemy => {
            if (enemy.isDead()) return;

            // SMART AI: Filter abilities to only those the enemy can actually afford to use!
            const affordableAbilities = enemy.abilities.filter(ability => ability.canPayCost(enemy));

            if (affordableAbilities.length === 0) {
                // If the enemy is completely out of stamina/insight and has no free moves, they skip.
                console.log(`${enemy.name} is too exhausted to act!`);
                return; 
            }

            // Pick a random affordable ability
            const randomAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
            
            // Pick a random living party member to attack
            // TODO (Future): Enhance this to check randomAbility.targeting.scope to heal allies vs attack players
            const livingParty = this.state.party.filter(p => !p.isDead());
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
        
        // NEW: The Resolve Loop added to update
        if (this.state.phase === 'RESOLVE') {
            this.timer += dt;
            
            if (this.timer >= 1.5) {
                this.timer = 0;

                if (this.state.turnQueue.length > 0) {
                    const currentTurn = this.state.turnQueue.shift();
                    this.executeTurn(currentTurn);
                } else {
                    this.checkBattleStatus();
                }
            }
        }
    }

    // NEW: Execute the logic and apply damage
    executeTurn(turn) {
        const { actor, action, target } = turn;

        if (actor.isDead()) return; 
        if (target.isDead()) {
            this.state.message = `${actor.name}'s target is already down!`;
            return;
        }

        action.payCost(actor, null);

        let totalDamage = 0;
        let totalHeal = 0;

        action.effects.forEach(effect => {
            if (effect.type === 'damage') {
                const attackStat = actor.stats?.attack?.total || 10;
                const defenseStat = target.stats?.defense?.total || 5;
                
                let rawDamage = (attackStat * effect.power) - (defenseStat * 0.5);
                rawDamage = Math.max(1, Math.floor(rawDamage)); 
                
                target.modifyResource('hp', -rawDamage);
                totalDamage += rawDamage;
            } 
            else if (effect.type === 'recover') {
                const healAmount = Math.floor((target.maxHp || 100) * effect.power);
                target.modifyResource('hp', healAmount);
                totalHeal += healAmount;
            }
        });

        if (totalDamage > 0) {
            this.state.message = `${actor.name} used ${action.name} for ${totalDamage} damage!`;
        } else if (totalHeal > 0) {
            this.state.message = `${actor.name} used ${action.name} and recovered ${totalHeal} HP!`;
        } else {
            this.state.message = `${actor.name} used ${action.name}!`;
        }
    }

    // NEW: Check if anyone won, or loop back to selection phase
    checkBattleStatus() {
        const enemiesAlive = this.state.enemies.filter(e => !e.isDead());
        const partyAlive = this.state.party.filter(p => !p.isDead());

        if (enemiesAlive.length === 0) {
            this.state.message = "Victory!";
            this.state.phase = 'VICTORY';
        } else if (partyAlive.length === 0) {
            this.state.message = "The party has fallen...";
            this.state.phase = 'DEFEAT';
        } else {
            this.state.phase = 'SELECT_ACTION';
            this.state.activePartyIndex = 0;
            this.state.menuIndex = 0;
            this.state.message = "What will you do?";
            
            while(this.state.party[this.state.activePartyIndex] && this.state.party[this.state.activePartyIndex].isDead()) {
                this.state.activePartyIndex++;
            }
        }
    }

    getState() {
        return this.state;
    }
}
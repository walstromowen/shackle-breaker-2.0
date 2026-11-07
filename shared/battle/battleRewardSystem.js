import { gameState } from '../core/gameState.js';
import { ExperienceSystem } from '../characters/experienceSystem.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { LootTableFactory } from '../items/lootTableFactory.js';
import { rng } from '../core/random.js';
import { ABILITY_TRAIT_CHANCE, SCAR_TRAITS, scarForAbility } from '../abilities/abilityTraits.js';

export class BattleRewardSystem {
    /**
     * Processes all XP, currency, and loot drops, applying them to the game state.
     * @param {Array} partyRoster - Array of CombatantModels
     * @param {Array} enemyRoster - Array of CombatantModels
     * @param {Array} battleLedger - Array of battle events (e.g., kills, ability uses)
     * @returns {Array<string>} An array of formatted UI messages describing the rewards. It also carries lootMessage (the text of
     *          the message that lists the dropped items) and lootItems ([{id, qty}]) when anything dropped.
     */
    /* `share`: a party of several players (multiplayer): { players: [ids, the same order everywhere], me: this player's id }. The money is
       split evenly (the odd coins to one player, by the battle's dice), each dropped item goes to one player at random, and this browser
       only puts THIS player's share in this player's bag. Every player's browser rolls the same dice, so they all agree who got what. */
    static processVictory(partyRoster, enemyRoster, battleLedger = [], share = null) {
        let totalXp = 0;
        let totalCurrency = 0;
        const droppedItems = [];
        const messages = [];

        // 1. Calculate Totals from Enemies
        enemyRoster.forEach(enemy => {
            totalXp += this._calculateEnemyXp(enemy);

            const currReward = enemy.originalEntity.currencyReward || { min: 0, max: 0 };
            if (currReward.max > 0) {
                totalCurrency += Math.floor(rng() * (currReward.max - currReward.min + 1)) + currReward.min;
            }

            // --- Process Loot Table ID via Factory ---
            const lootId = enemy.originalEntity.lootTableId;
            if (lootId) {
                const generatedLoot = LootTableFactory.generateLoot(lootId, 1, 0);
                if (generatedLoot && generatedLoot.items) {
                    generatedLoot.items.forEach(item => {
                        const itemId = typeof item === 'string' ? item : item.id;
                        const quantity = item.qty || 1;
                        for (let i = 0; i < quantity; i++) {
                            droppedItems.push(itemId);
                        }
                    });
                }
            }
        });

        messages.push(`Victory! The party gained ${totalXp} XP.`);

        // 2. Distribute XP to Surviving Party Members
        const aliveParty = partyRoster.filter(m => !m.isDead());
        const xpPerMember = Math.floor(totalXp / Math.max(1, aliveParty.length));

        aliveParty.forEach(member => {
            if (ExperienceSystem.addXp(member.originalEntity, xpPerMember)) {
                messages.push(`${member.name} reached Level ${member.originalEntity.level}!`);
            }
        });

        // 3. Distribute Currency
        const players = share && Array.isArray(share.players) && share.players.length > 1 ? share.players : null;
        if (totalCurrency > 0 && players) {
            const each = Math.floor(totalCurrency / players.length);
            const oddTo = players[Math.floor(rng() * players.length)];
            const mine = each + (oddTo === share.me ? totalCurrency - each * players.length : 0);
            gameState.party.currency = (gameState.party.currency || 0) + mine;
            messages.push(`The party found ${totalCurrency} currency: your share is ${mine}.`);
        } else if (totalCurrency > 0) {
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            messages.push(`The party found ${totalCurrency} currency!`);
        }
        if (players && droppedItems.length > 0) {
            // each item to one player; only this player's items are kept here
            const kept = [];
            for (const id of droppedItems) if (players[Math.floor(rng() * players.length)] === share.me) kept.push(id);
            const given = droppedItems.length - kept.length;
            droppedItems.length = 0;
            droppedItems.push(...kept);
            if (given > 0) messages.push(given === 1 ? 'One item went to another player.' : `${given} items went to the other players.`);
        }

        // 4. Distribute Loot
        if (droppedItems.length > 0) {
            const itemCounts = droppedItems.reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {});

            const lootStrings = Object.entries(itemCounts).map(([id, count]) => {
                InventorySystem.addItem(id, count);
                const readableName = id.replace(/_/g, ' ');
                return count > 1 ? `${readableName} x${count}` : readableName;
            });
            const lootMessage = `Loot recovered: ${lootStrings.join(', ')}`;
            messages.push(lootMessage);
            // Which message lists the items, and what they are, so the battle screen can show their pictures
            messages.lootMessage = lootMessage;
            messages.lootItems = Object.entries(itemCounts).map(([id, qty]) => ({ id, qty }));
        } else if (totalCurrency === 0) {
            messages.push(`The enemies left nothing useful behind.`);
        }

        // 5. Process Trait Rewards from the Ledger, and the scars of those who fell
        if (battleLedger && battleLedger.length > 0) {
            const traitMessages = this._processTraitRewards(battleLedger, partyRoster, enemyRoster);
            messages.push(...traitMessages);
            messages.push(...this.processDeathScars(battleLedger));
        }

        return messages;
    }

    static _calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        
        const sumStats = (statObj) => statObj ? Object.values(statObj).reduce((sum, val) => sum + val, 0) : 0;
        const statSum = enemy.maxHp + (enemy.stats.speed ?? 10) + sumStats(enemy.stats.attack) + sumStats(enemy.stats.defense);
        return Math.floor(statSum * 0.15) + ((enemy.originalEntity.level || 1) * 10);
    }

    /**
     * Party members an enemy struck down in this fight: each may carry a scar out of it (ABILITY_TRAIT_CHANCE.killed_by_ability), a bad trait
     * that fits the blow (abilityTraits.scarForAbility: magic -> Superstitious, an arrow -> Myopic, a heavy blow -> Frail, ...), or another bad
     * one they do not have yet. After a win, and after a loss in a multiplayer world (where the party carries on). Returns the lines to show.
     */
    static processDeathScars(battleLedger) {
        const messages = [];
        const lastHit = new Map();   // party member -> the last ability an enemy hit them with
        for (const entry of battleLedger || []) {
            if (entry.type === 'ABILITY_USED' && entry.actor?.team === 'enemy' && entry.target?.team === 'party') lastHit.set(entry.target, entry.action);
            if (entry.type !== 'DEATH' || entry.killed?.team !== 'party' || entry.killer?.team !== 'enemy') continue;
            const fallen = entry.killed, entity = fallen.originalEntity;
            if (!entity || typeof entity.addTrait !== 'function' || rng() > ABILITY_TRAIT_CHANCE.killed_by_ability) continue;
            const held = entity.traits || [];
            const action = lastHit.get(fallen);
            const fit = scarForAbility(action && (action.config || action));
            const open = SCAR_TRAITS.filter(t => !held.includes(t));
            if (!open.length) continue;
            const scar = open.includes(fit) ? fit : open[Math.floor(rng() * open.length)];
            entity.addTrait(scar);
            const readable = scar.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            messages.push(`${fallen.name} was struck down and carries a scar from it: ${readable}.`);
        }
        return messages;
    }

    static _processTraitRewards(battleLedger, partyRoster, enemyRoster) {
        const messages = [];

        const tryAwardTrait = (partyMember, sourceData, condition) => {
            if (!partyMember || !sourceData || partyMember.isDead()) return;

            const traitRewards = sourceData.traitRewards || sourceData.traitReward || sourceData.def?.traitRewards || sourceData.def?.traitReward || sourceData.definition?.traitRewards || sourceData.definition?.traitReward || sourceData.config?.traitRewards || sourceData.config?.traitReward;
            if (!traitRewards) return;

            const traits = Array.isArray(traitRewards) ? traitRewards : [traitRewards];

            traits.forEach(traitDef => {
                const reqCondition = (typeof traitDef === 'object' && traitDef.condition) ? traitDef.condition : 'kill';
                if (reqCondition !== condition) return;

                const traitId = typeof traitDef === 'string' ? traitDef : traitDef.id;
                const chance = (typeof traitDef === 'object' && traitDef.chance !== undefined) ? traitDef.chance : 1.0;

                if (rng() <= chance) {
                    const entity = partyMember.originalEntity;
                    const currentTraits = entity.traits || [];

                    if (!currentTraits.includes(traitId)) {
                        if (typeof entity.addTrait === 'function') {
                            entity.addTrait(traitId); 
                            const readableName = traitId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            messages.push(`${partyMember.name} learned a new trait: ${readableName}!`);
                        } else {
                            console.warn(`Could not add trait ${traitId} to ${partyMember.name}: no addTrait method found.`);
                        }
                    }
                }
            });
        };

        // the last ability each party member used on each enemy: the one a kill is credited to
        const lastBlow = new Map();
        battleLedger.forEach(entry => {
            if (entry.type === 'DEATH') {
                if (entry.killer?.team === 'party' && entry.killed?.team === 'enemy') {
                    tryAwardTrait(entry.killer, entry.killed.originalEntity, 'kill');
                    const blow = lastBlow.get(entry.killed);
                    if (blow && blow.actor === entry.killer) tryAwardTrait(entry.killer, blow.action, 'kill');   // finishing a foe with it
                }
            }
            else if (entry.type === 'ABILITY_USED') {
                if (entry.actor?.team === 'party' && entry.target?.team === 'enemy') lastBlow.set(entry.target, { actor: entry.actor, action: entry.action });
                if (entry.actor?.team === 'party') {
                    tryAwardTrait(entry.actor, entry.action, 'use_ability');
                    if (entry.target?.team === 'enemy') {
                        tryAwardTrait(entry.actor, entry.target.originalEntity, 'use_ability');
                    }
                }
                if (entry.target?.team === 'party') {
                    tryAwardTrait(entry.target, entry.action, 'hit_by_ability');
                    if (entry.actor?.team === 'enemy') {
                        tryAwardTrait(entry.target, entry.actor.originalEntity, 'hit_by_ability');
                    }
                }
            }
            else if (entry.type === 'STATUS_APPLIED') {
                if (entry.actor?.team === 'party' && entry.target?.team === 'enemy') {
                    tryAwardTrait(entry.actor, entry.target.originalEntity, 'apply_status');
                    tryAwardTrait(entry.actor, entry.status, 'apply_status');
                }
                if (entry.actor?.team === 'enemy' && entry.target?.team === 'party') {
                    tryAwardTrait(entry.target, entry.actor.originalEntity, 'receive_status');
                    tryAwardTrait(entry.target, entry.status, 'receive_status');
                }
            }
        });

        partyRoster.forEach(partyMember => {
            if (!partyMember.isDead()) {
                enemyRoster.forEach(enemy => {
                    tryAwardTrait(partyMember, enemy.originalEntity, 'survive');
                });
            }
        });

        return messages;
    }
}
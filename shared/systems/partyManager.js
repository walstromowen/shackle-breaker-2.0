// src/shared/systems/partyManager.js
import { StatusEffectFactory } from '../systems/factories/statusEffectFactory.js';
import { gameState } from '../state/gameState.js';
import { EntityFactory } from './factories/entityFactory.js';
import { ItemFactory } from './factories/itemFactory.js';
import { CombatCalculator } from './combatCalculator.js';

export const PartyManager = {
    
    // --- READ OPERATIONS (Getters) ---
    
    /**
     * Returns the entire party array (Entities)
     */
    getMembers() {
        return gameState.party.members;
    },

    /**
     * Returns the Main Character (usually index 0)
     */
    getPlayer() {
        // Safety check: returns null if party is empty
        return gameState.party.members[0] || null;
    },

    /**
     * Returns total Gold
     */
    getCurrency() {
        return gameState.party.currency || 0;
    },

    // --- WRITE OPERATIONS (Setters / Actions) ---

    /**
     * CLEARS the current party and creates a new Main Character.
     * Use this when the user clicks "Start Game" on the Character Creator.
     * @param {string} templateId - The base template
     * @param {object} overrides - { attributes, equipment, etc. }
     */
    createMainCharacter(templateId, overrides) {
        console.log(`[PartyManager] Creating Hero...`);

        // 1. Clear existing data (Reset for new game)
        gameState.party.members = [];
        gameState.party.currency = 0;
        gameState.party.inventory = [];

        // 2. Resolve Equipment 
        if (overrides.equipment) {
            const resolvedEquipment = {};
            for (const [slot, itemData] of Object.entries(overrides.equipment)) {
                if (typeof itemData === 'string') {
                    const realItem = ItemFactory.createItem(itemData);
                    if (realItem) resolvedEquipment[slot] = realItem;
                } else {
                    resolvedEquipment[slot] = itemData;
                }
            }
            overrides.equipment = resolvedEquipment;
        }

        // 3. Create the Hero 
        const hero = EntityFactory.create(templateId, overrides);

        // Fill resources 
        if (hero) {
            hero.hp = hero.maxHp;
            hero.stamina = hero.maxStamina;
            hero.insight = hero.maxInsight;
            
            gameState.party.members.push(hero);
            console.log("[PartyManager] Hero created successfully:", hero);
            return hero;
        } else {
            console.error("[PartyManager] Failed to create Hero.");
            return null;
        }
    },

    /**
     * Adds a generic NPC/Monster to the party (e.g., a summoned companion)
     * @param {string} entityId - The ID from entityDefinitions
     * @param {object} overrides - Optional custom stats or name overrides
     * @returns {object|null} - Returns the new character object if successful, or null if full
     */
    addMember(entityId, overrides = {}) {
        const MAX_PARTY_SIZE = 6;

        if (gameState.party.members.length >= MAX_PARTY_SIZE) {
            console.warn("[PartyManager] Party is full.");
            return null; 
        }

        // Resolve Equipment Strings into Item Objects 
        if (overrides.equipment) {
            const resolvedEquipment = {};
            for (const [slot, itemData] of Object.entries(overrides.equipment)) {
                if (typeof itemData === 'string') {
                    const realItem = ItemFactory.createItem(itemData);
                    if (realItem) resolvedEquipment[slot] = realItem;
                } else {
                    resolvedEquipment[slot] = itemData;
                }
            }
            overrides.equipment = resolvedEquipment;
        }

        const newMember = EntityFactory.create(entityId, overrides);
        
        if (newMember) {
            gameState.party.members.push(newMember);
            return newMember; 
        }
        return null;
    },

    /**
     * Safely applies damage or healing to a party member's vitals.
     * Uses CombatCalculator math for incoming damage so stats actually matter.
     * @param {object} target - The entity receiving the stat change
     * @param {number} hpDelta - The raw amount to change HP by (negative for damage)
     * @param {number} staminaDelta - The amount to change Stamina by
     * @param {number} insightDelta - The amount to change Insight by
     * @param {string} damageType - "true" for unmitigated, or a valid DAMAGE_TYPE string
     * @param {boolean} isPercentage - If true, treats deltas as a percentage of max stats
     * @param {boolean} bypassDefense - If true, ignores all armor/resistance mitigation
     */
    modifyVitals(target, hpDelta, staminaDelta = 0, insightDelta = 0, damageType = 'true', isPercentage = false, bypassDefense = false) {
        if (!target || target.isDead?.()) return;

        let finalHpDelta = hpDelta;
        let finalStaminaDelta = staminaDelta;
        let finalInsightDelta = insightDelta;

        // Convert percentages to flat numbers based on the character's max stats
        if (isPercentage) {
            finalHpDelta = Math.round(target.maxHp * (hpDelta / 100));
            finalStaminaDelta = Math.round(target.maxStamina * (staminaDelta / 100));
            finalInsightDelta = Math.round(target.maxInsight * (insightDelta / 100));
        }

        // --- 1. HANDLE HP ---
        if (finalHpDelta !== 0) {
            if (finalHpDelta < 0) {
                const safeType = damageType.toLowerCase();
                
                // Now checks for the new flag OR the legacy 'true' string
                if (bypassDefense || safeType === 'true') {
                    // True damage (skips mitigation entirely)
                    target.hp = Math.max(0, (target.hp || target.maxHp) - Math.abs(finalHpDelta));
                    console.log(`[PartyManager] Raw Event Damage: ${Math.abs(finalHpDelta)} ${safeType} | Mitigated To: ${Math.abs(finalHpDelta)} (Defense Bypassed)`);
                } else {
                    // --- ENCOUNTER DAMAGE MITIGATION ---
                    const stats = target.calculatedStats || target.stats || {};
                    const defenseVal = stats.defense?.[safeType] || 0;
                    const resistanceVal = stats.resistance?.[safeType] || 0;

                    // Route through our shared mathematical pipeline
                    const finalHpDamage = CombatCalculator.calculateMitigatedDamage(
                        Math.abs(finalHpDelta), 
                        defenseVal, 
                        resistanceVal, 
                        true // Enable variance
                    );

                    target.hp = Math.max(0, (target.hp || target.maxHp) - finalHpDamage);
                    console.log(`[PartyManager] Raw Event Damage: ${Math.abs(finalHpDelta)} ${safeType} | Mitigated To: ${finalHpDamage}`);
                }
            } else {
                // Apply Healing (capped at maxHP)
                target.hp = Math.min(target.maxHp, (target.hp || 0) + finalHpDelta);
            }
        }

        // --- 2. HANDLE STAMINA ---
        if (finalStaminaDelta !== 0) {
            if (finalStaminaDelta < 0) {
                target.stamina = Math.max(0, (target.stamina || target.maxStamina) - Math.abs(finalStaminaDelta));
            } else {
                target.stamina = Math.min(target.maxStamina, (target.stamina || 0) + finalStaminaDelta);
            }
        }

        // --- 3. HANDLE INSIGHT ---
        if (finalInsightDelta !== 0) {
            if (finalInsightDelta < 0) {
                target.insight = Math.max(0, (target.insight || target.maxInsight) - Math.abs(finalInsightDelta));
            } else {
                target.insight = Math.min(target.maxInsight, (target.insight || 0) + finalInsightDelta);
            }
        }
    },
    /**
     * Safely creates and applies a status effect to a character.
     * @param {object} target - The EntityModel receiving the effect.
     * @param {string} effectId - The ID matching a StatusEffectDefinition.
     * @param {number} customCharges - Optional override for how long it lasts.
     */
    applyStatusEffect(target, effectId, customCharges = null) {
        if (!target || target.isDead?.()) return;

        // Use the factory to generate the model!
        const newEffect = StatusEffectFactory.createEffect(effectId, customCharges, null);
        
        if (!newEffect) {
            // The factory already logs a warning if the ID is invalid, 
            // so we can just safely back out here.
            return; 
        }

        // Apply it using the method already on your EntityModel
        target.applyStatusEffect(newEffect);
        
        console.log(`[PartyManager] Applied [${newEffect.name}] to ${target.name || 'character'}`);
    }
    
};
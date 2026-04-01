// src/shared/systems/partyManager.js

import { gameState } from '../state/gameState.js';
import { EntityFactory } from './factories/entityFactory.js';
import { ItemFactory } from './factories/itemFactory.js'; // <-- ADD THIS


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
     * * @param {string} name - The name entered by the user
     * @param {object} attributes - { vigor, strength, dexterity, etc. }
     */
    // In PartyManager.js
    createMainCharacter(templateId, overrides) {
        console.log(`[PartyManager] Creating Hero...`);

        // 1. Clear existing data (Reset for new game)
        gameState.party.members = [];
        gameState.party.currency = 0;
        gameState.party.inventory = [];

        // 2. Resolve Equipment (Borrowing the logic you already wrote in addMember)
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

        // Fill resources (Do this here so you never have to do it manually again!)
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

        // --- NEW FIX: Resolve Equipment Strings into Item Objects ---
        if (overrides.equipment) {
            const resolvedEquipment = {};
            for (const [slot, itemData] of Object.entries(overrides.equipment)) {
                // Check if it's a raw string ID (e.g., "shortsword"). If so, build it!
                if (typeof itemData === 'string') {
                    const realItem = ItemFactory.createItem(itemData);
                    if (realItem) resolvedEquipment[slot] = realItem;
                } else {
                    // It's already an item object, just pass it through
                    resolvedEquipment[slot] = itemData;
                }
            }
            overrides.equipment = resolvedEquipment;
        }
        // ------------------------------------------------------------

        const newMember = EntityFactory.create(entityId, overrides);
        
        if (newMember) {
            gameState.party.members.push(newMember);
            return newMember; 
        }
        return null;
    }
};
// src/shared/systems/partyManager.js

import { gameState } from '../state/gameState.js';
import { EntityFactory } from './factories/entityFactory.js';

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
    getGold() {
        return gameState.party.gold || 0;
    },

    // --- WRITE OPERATIONS (Setters / Actions) ---

    /**
     * CLEARS the current party and creates a new Main Character.
     * Use this when the user clicks "Start Game" on the Character Creator.
     * * @param {string} name - The name entered by the user
     * @param {object} attributes - { vigor, strength, dexterity, etc. }
     */
    createMainCharacter(name, attributes) {
        console.log(`[PartyManager] Creating Hero: ${name}...`);

        // 1. Clear existing data (Reset for new game)
        gameState.party.members = [];
        gameState.party.gold = 0;
        gameState.party.inventory = [];

        // 2. Create the Hero using the Factory
        // We pass "PLAYER" as the template ID, and the user's choices as overrides.
        const hero = EntityFactory.create("PLAYER", {
            name: name,
            attributes: attributes
        });

        // 3. Add to the State
        if (hero) {
            gameState.party.members.push(hero);
            console.log("[PartyManager] Hero created successfully:", hero);
        } else {
            console.error("[PartyManager] Failed to create Hero.");
        }
    },

    /**
     * Adds a generic NPC/Monster to the party (e.g., a summoned companion)
     * @param {string} entityId - The ID from entityDefinitions
     */
    addMember(entityId) {
        const MAX_PARTY_SIZE = 6;

        if (gameState.party.members.length >= MAX_PARTY_SIZE) {
            console.warn("[PartyManager] Party is full.");
            return false;
        }

        const newMember = EntityFactory.create(entityId);
        
        if (newMember) {
            gameState.party.members.push(newMember);
            return true;
        }
        return false;
    }
};
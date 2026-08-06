export class SpawnTableModel {
    /**
     * @param {Array} enemies - Array of generated enemy config objects:
     * { id: string, levelOffset?: number, equipment?: object, traits?: array }
     * @param {string} encounterId - The ID of a non-combat encounter, if applicable.
     */
    constructor(enemies = [], encounterId = null) {
        this.enemies = enemies;
        this.encounterId = encounterId;
    }

    hasEnemies() {
        return this.enemies && this.enemies.length > 0;
    }
    
    isEncounter() {
        return !!this.encounterId;
    }
}
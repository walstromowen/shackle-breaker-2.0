// frontend/src/screens/battle/targetSelection.js
//
// The player choosing who an ability hits: the cursor over the field (single target, "all" confirm, several distinct picks), backing out one pick at a
// time, and the hover / keyboard focus on a target card. It works on the battle `state` and plays the UI sounds through the BattleController that owns it.
import { PHASE } from '../../../../shared/battle/battleConstants.js';
import { ALLY_SCOPES, needsDistinctTargets } from '../../../../shared/battle/targetingResolver.js';
import { getActivePool } from '../../../../shared/battle/battleState.js';

export class TargetSelection {
    /** @param battle the BattleController: `state`, the play*Sound helpers and commitAction(target) */
    constructor(battle) {
        this.battle = battle;
    }

    get state() { return this.battle.state; }

    /* The ability was chosen: commit it straight away when there is nothing to aim (self, random), otherwise open the target cursor. */
    setup(action, activeChar) {
        const state = this.state;
        state.selectedAction = action;
        state.selectedTargets = [];
        const scope = action.targeting?.scope || 'enemy';
        const selectMode = action.targeting?.select || 'single';

        if (scope === 'self') {
            return this.battle.commitAction(activeChar);
        }
        if (selectMode === 'random' || scope.includes('random')) {
            const isPartyTarget = ALLY_SCOPES.includes(scope);
            const targetPool = isPartyTarget ? state.activeParty : state.activeEnemies;
            const fallbackTarget = targetPool.find(t => t && !t.isDead()) || activeChar;
            return this.battle.commitAction(fallbackTarget);
        }

        state.phase = PHASE.SELECT_TARGET;

        if (scope === 'everyone') {
            state.targetGroup = 'everyone';
            state.message = `Confirm target for ${action.name}`;
            state.targetIndex = 'ALL';
            return;
        }

        if (scope === 'any') {
            state.targetGroup = 'any';
            const allTargets = [...state.activeParty, ...state.activeEnemies];
            state.message = `Select a target for ${action.name}`;

            // Default the cursor to the first living enemy, or fallback to first living ally
            const defaultTarget = state.activeEnemies.find(t => t && !t.isDead()) ||
                                  allTargets.find(t => t && !t.isDead());
            state.targetIndex = allTargets.indexOf(defaultTarget);
            return;
        }

        const isPartyTarget = ALLY_SCOPES.includes(scope);
        const targetPool = isPartyTarget ? state.activeParty : state.activeEnemies;
        state.targetGroup = isPartyTarget ? 'party' : 'enemy';

        if (['all_enemies', 'all_allies', 'full_ally_party'].includes(scope)) {
            state.message = `Confirm target for ${action.name}`;
            state.targetIndex = 'ALL';
        } else {
            state.message = `Select a target for ${action.name}`;
            state.targetIndex = Math.max(0, targetPool.findIndex(t => t && !t.isDead()));
        }
    }

    /* A key (as an intent: UP / DOWN / LEFT / RIGHT / CONFIRM / CANCEL) while the target cursor is open. */
    handleIntent(intent) {
        const state = this.state;
        const targetArray = this.targetsFromGroup();
        const prevIndex = state.targetIndex;

        if (state.targetIndex === 'ALL') {
            if (intent === 'CONFIRM') {
                this.battle.playConfirmSound();
                this.battle.commitAction('ALL');
            } else if (intent === 'CANCEL') {
                this.battle.playCancelSound();
                this.cancel();
            }
            return;
        }

        if (intent === 'DOWN' || intent === 'RIGHT') {
            state.targetIndex = this.cycle(targetArray, 1);
            if (state.targetIndex !== prevIndex) this.battle.playNavSound();
        } else if (intent === 'UP' || intent === 'LEFT') {
            state.targetIndex = this.cycle(targetArray, -1);
            if (state.targetIndex !== prevIndex) this.battle.playNavSound();
        } else if (intent === 'CONFIRM') {
            this.battle.playConfirmSound();
            this.selectSpecific(targetArray[state.targetIndex]);
        } else if (intent === 'CANCEL') {
            this.battle.playCancelSound();
            this.cancel();
        }
    }

    // ---- who can be aimed at ----
    targetsFromGroup() {
        const state = this.state;
        // Treat 'any' just like 'everyone' when building the list of valid cursor targets
        if (state.targetGroup === 'everyone' || state.targetGroup === 'any') {
            return [...state.activeParty, ...state.activeEnemies];
        }
        return getActivePool(state, state.targetGroup);
    }

    targetFromHitbox(hitboxId) {
        if (!hitboxId || !hitboxId.startsWith('TARGET_')) return null;
        const parts = hitboxId.split('_');
        const team = parts[1].toLowerCase();
        const index = parseInt(parts[2], 10);
        const pool = getActivePool(this.state, team);
        return pool[index];
    }

    isValidTargetHitbox(hitboxId) {
        if (!this.state.targetGroup) return false;
        const target = this.targetFromHitbox(hitboxId);
        if (!target || target.isDead()) return false;
        if (this.isAlreadyPicked(target)) return false;
        const validTargets = this.targetsFromGroup();
        return validTargets.includes(target);
    }

    /* The keyboard cursor while a target is being chosen, as a hitbox id (null when an "all targets" ability has no single aimed card). */
    keyboardFocusId() {
        const s = this.state;
        if (typeof s.targetIndex !== 'number') return null;
        const target = this.targetsFromGroup()[s.targetIndex];
        if (!target) return null;
        const p = s.activeParty.indexOf(target);
        if (p !== -1) return `TARGET_PARTY_${p}`;
        const e = s.activeEnemies.indexOf(target);
        if (e !== -1) return `TARGET_ENEMY_${e}`;
        return null;
    }

    cycle(targetArray, direction) {
        const count = targetArray.length;
        let nextIndex = this.state.targetIndex;
        for (let i = 0; i < count; i++) {
            nextIndex = (nextIndex + direction + count) % count;
            if (targetArray[nextIndex] && !targetArray[nextIndex].isDead() && !this.isAlreadyPicked(targetArray[nextIndex])) return nextIndex;
        }
        return this.state.targetIndex;
    }

    // ---- picking ----
    isAlreadyPicked(target) {
        return needsDistinctTargets(this.state.selectedAction) && (this.state.selectedTargets || []).includes(target);
    }

    // How many picks the player must make. Distinct abilities can't ask for more targets than are alive.
    requiredPickCount(action) {
        const wanted = action.targeting?.count || 1;
        if (!needsDistinctTargets(action)) return wanted;
        const living = this.targetsFromGroup().filter(t => t && !t.isDead()).length;
        return Math.max(1, Math.min(wanted, living));
    }

    selectSpecific(target) {
        const state = this.state;
        if (!target || target.isDead()) return;

        const targeting = state.selectedAction.targeting || {};
        if (targeting.select !== 'multiple') {
            return this.battle.commitAction(target);
        }

        if (this.isAlreadyPicked(target)) {
            this.battle.playErrorSound();
            state.message = `${target.name} is already selected - choose a different target`;
            return;
        }

        const requiredCount = this.requiredPickCount(state.selectedAction);
        state.selectedTargets.push(target);

        if (state.selectedTargets.length >= requiredCount) {
            this.battle.commitAction([...state.selectedTargets]);
            state.selectedTargets = [];
        } else {
            state.message = `Select target ${state.selectedTargets.length + 1} of ${requiredCount} for ${state.selectedAction.name}`;
            // Move the cursor off the target that was just picked
            state.targetIndex = this.cycle(this.targetsFromGroup(), 1);
        }
    }

    /* Back out: take the last pick off, or, with none left, close the cursor and go back to the ability list. */
    cancel() {
        const state = this.state;
        if (state.selectedTargets?.length > 0) {
            state.selectedTargets.pop();
            const requiredCount = this.requiredPickCount(state.selectedAction);
            state.message = `Select target ${state.selectedTargets.length + 1} of ${requiredCount} for ${state.selectedAction.name}`;
            return;
        }
        state.phase = PHASE.SELECT_ACTION;
        state.selectedAction = null;
        state.targetGroup = null;
        state.selectedTargets = [];
    }
}

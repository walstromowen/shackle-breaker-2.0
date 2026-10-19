import { StatCalculator } from './statCalculator.js';
import { CombatCalculator } from './combatCalculator.js';
import { StatusEffectFactory } from './factories/statusEffectFactory.js';
import { AbilityDefinitions } from '../data/abilityDefinitions.js';
import { AbilityModel } from '../models/abilityModel.js';
import { gameState } from '../state/gameState.js';

/* Effect types that are real but resolved by the battle code itself, not here: they must not trigger the "unknown effect type" warning. */
const EFFECTS_HANDLED_ELSEWHERE = ['summon', 'switch_self'];

export class AbilitySystem {
    /* Set by the scene manager. Overworld effects that must change the live scene (leaving an interior...) return `worldAction: { type, ... }`; it is handed to this
       function the moment the effect runs, so every caller (hotbar, item menu, anything later) gets the behaviour without doing anything. shared/ may not import
       the client, which is why the client plugs itself in here. */
    static worldActionHandler = null;

    /* Where may this ability be used? 'battle', 'overworld' or 'both' (see AbilityModel.contextOf). where = 'battle' | 'overworld'. */
    static usableIn(abilityId, where) {
        const ctx = AbilityModel.contextOf(AbilityDefinitions[abilityId]);
        return ctx === 'both' || ctx === where;
    }

    /* ctx.context = 'overworld' when the ability is used outside a fight (the character summary screen, a hotbar...). Battle callers pass nothing.
       Overworld effects (the static _world_* methods at the bottom of this class) only run with it; in a battle they are skipped. */
    static execute(abilityId, source, target, ctx = {}) {
        const def = AbilityDefinitions[abilityId];
        if (!def) return { success: false, message: "Invalid Ability" };

        // --- Intercept Flee Behavior (Evasion-Based) ---
        if (def.behavior === 'flee_battle') {
            const stats = source.baseStats || source.stats || {};
            const evasion = stats.evasion || 100;
            const abilityAcc = def.accuracy !== undefined ? def.accuracy : 1.0;
            let fleeChance = abilityAcc * (evasion / 100);
            fleeChance = Math.max(0.05, Math.min(1.0, fleeChance));
            const roll = Math.random();
            const isSuccess = roll <= fleeChance;
            console.log(`[MATH DEBUG] Flee Check -> Evasion: ${evasion} | Chance: ${(fleeChance * 100).toFixed(1)}% | Roll: ${(roll * 100).toFixed(1)}% | Success: ${isSuccess}`);
            return {
                success: isSuccess,
                fled: isSuccess,
                outcome: isSuccess ? 'FLEE_SUCCESS' : 'FLEE_FAIL',
                delta: 0,
                message: isSuccess ? `${source.name} successfully escaped` : `Failed to escape`,
                addedTags: []
            };
        }

        // ---> NEW: REACH & IMMUNITY ENFORCEMENT <---
        // 1. Tag Immunity Check
        if (def.tags && target.checkImmunityToTags && target.checkImmunityToTags(def.tags)) {
            return {
                success: false,
                outcome: 'IMMUNE',
                delta: 0,
                message: `${target.name} is immune to ${def.name}`,
                addedTags: []
            };
        }

        // 2. Reach (Melee vs Flying) Check
        if (def.range === 'melee' && target.hasTag && target.hasTag('flying')) {
            const canReach = source.hasTag && (source.hasTag('flying') || source.hasTag('reach'));
            if (!canReach) {
                return {
                    success: false,
                    outcome: 'OUT_OF_RANGE',
                    delta: 0,
                    message: `${source.name} is out of range of ${target.name}`,
                    addedTags: []
                };
            }
        }
        // -------------------------------------------

        const result = { success: false, outcome: 'NONE', delta: 0, resource: 'hp', message: "", addedTags: [] };
        let attackHit = true;

        if (def.effects && Array.isArray(def.effects)) {
            for (const effect of def.effects) {
                if (effect.type === 'damage') {
                    const calc = this._handleDamage(effect, source, target, def.accuracy, def);
                    result.success = calc.hit;
                    result.outcome = calc.crit ? 'CRIT' : (calc.hit ? 'HIT' : 'MISS');
                    result.delta = -calc.damage;
                    result.message = result.message ? `${result.message} ${calc.message}` : calc.message;
                    if (!calc.hit) {
                        attackHit = false;
                        break;
                    }
                } else if (effect.type === 'recover') {
                    const subResult = this._handleRecover(effect, source, target, def);
                    if (subResult.success) {
                        result.success = true;
                        result.outcome = 'HEAL';
                        result.delta = subResult.amount;
                        result.resource = effect.resource;
                        result.message = result.message ? `${result.message} ${subResult.message}` : subResult.message;
                    }
                } else if (effect.type === 'set') {
                    const subResult = this._handleSet(effect, target);
                    if (subResult.success) {
                        result.success = true;
                        result.message = result.message ? `${result.message} ${subResult.message}` : subResult.message;
                    }
                } else if (effect.type === 'dispel') {
                    if (target.statusEffects && Array.isArray(target.statusEffects)) {
                        let dispelledStatusNames = [];
                        for (let i = target.statusEffects.length - 1; i >= 0; i--) {
                            const currentStatus = target.statusEffects[i];
                            if (effect.tags.includes(currentStatus.id)) {
                                dispelledStatusNames.push(currentStatus.name || currentStatus.id);
                                if (typeof target.removeStatusEffect === 'function') {
                                    target.removeStatusEffect(currentStatus.id);
                                } else {
                                    target.statusEffects.splice(i, 1);
                                }
                            }
                        }
                        if (dispelledStatusNames.length > 0) {
                            const cleansedString = dispelledStatusNames.join(" and ");
                            result.success = true;
                            const cleanseMsg = `${target.name || 'Target'} was cleansed of ${cleansedString}`;
                            result.message = result.message ? `${result.message} ${cleanseMsg}` : cleanseMsg;
                        }
                    }
                } else if (typeof this['_world_' + effect.type] === 'function') {
                    if (ctx.context !== 'overworld') continue; // overworld effects never run inside a battle
                    const sub = this['_world_' + effect.type](effect, source, target, def, ctx);
                    if (sub.success) {
                        result.success = true;
                        result.outcome = 'WORLD';
                        result.message = result.message ? `${result.message} ${sub.message}` : sub.message;
                        if (sub.worldAction) {
                            (result.worldActions = result.worldActions || []).push(sub.worldAction);
                            this._dispatchWorldAction(sub.worldAction);
                        }
                    } else if (sub.message && !result.success) {
                        result.message = result.message ? `${result.message} ${sub.message}` : sub.message; // why it did nothing ("Your torch is still burning well.")
                    }
                } else if (!EFFECTS_HANDLED_ELSEWHERE.includes(effect.type)) {
                    const known = Object.getOwnPropertyNames(AbilitySystem).filter(n => n.startsWith('_world_')).map(n => n.slice(7));
                    console.warn(`[AbilitySystem] "${abilityId}" has an effect of unknown type "${effect.type}"; nothing happened. Known: damage, recover, set, dispel, ${known.join(', ')}.`);
                }
            }
        }

        // 2. Process Status Effects (Only if the attack didn't miss)
        if (attackHit && def.statusEffects && Array.isArray(def.statusEffects)) {
            for (const statusDef of def.statusEffects) {
                const roll = Math.random();
                const chance = statusDef.chance !== undefined ? statusDef.chance : 1.0;
                if (roll <= chance) {
                    const existingStatus = (target.statusEffects || []).find(s => s.id === statusDef.id);
                    if (existingStatus) {
                        // `skipIfActive: true` -- do not stack or refresh; nothing happens and (when nothing else worked) the item is kept. A bear trap that is already set.
                        if (statusDef.skipIfActive) {
                            const why = this._parseMessage(statusDef.activeMessage || '{target} already has {status}.', source, target, def, { status: existingStatus.name });
                            if (!result.success) result.message = ((result.message || '') + ' ' + why).trim();
                            continue;
                        }
                        existingStatus.addStack();
                        result.success = true;
                        result.addedTags.push(statusDef.id);
                        const stackText = existingStatus.stacks === existingStatus.maxStacks ? '(Max Stacks)' : `(x${existingStatus.stacks})`;
                        const template = statusDef.stackMessage || "{target}'s {status} grew stronger {stackText}";
                        result.message += " " + this._parseMessage(template, source, target, def, { status: existingStatus.name, stackText: stackText });
                    } else {
                        const activeEffect = StatusEffectFactory.createEffect(statusDef.id, statusDef.duration, source);
                        if (activeEffect) {
                            target.applyStatusEffect(activeEffect);
                            result.success = true;
                            result.addedTags.push(statusDef.id);
                            const template = statusDef.applyMessage || "{target} gained {status}";
                            result.message += " " + this._parseMessage(template, source, target, def, { status: activeEffect.name });
                        } else {
                            console.error(`[Debug] Factory failed to create the effect! Check StatusEffectFactory.`);
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * Evaluates a condition object on an effect to dynamically scale power.
     */
    static _calculateConditionalMultiplier(effect, source, target) {
        if (!effect.condition) return 1.0;
        let multiplier = 1.0;
        const condition = effect.condition;
        const condMultiplier = condition.multiplier || 1.0;

        // Target HP condition
        if (condition.target_hp_below !== undefined && target.maxHp) {
            const hpPercent = target.hp / target.maxHp;
            if (hpPercent < condition.target_hp_below) multiplier *= condMultiplier;
        }
        // Source HP condition
        if (condition.user_hp_below !== undefined && source.maxHp) {
            const hpPercent = source.hp / source.maxHp;
            if (hpPercent < condition.user_hp_below) multiplier *= condMultiplier;
        }
        // Target Status condition
        if (condition.target_has_status && target.statusEffects) {
            const hasStatus = target.statusEffects.some(s => s.id === condition.target_has_status);
            if (hasStatus) multiplier *= condMultiplier;
        }
        // Source Status condition
        if (condition.user_has_status && source.statusEffects) {
            const hasStatus = source.statusEffects.some(s => s.id === condition.user_has_status);
            if (hasStatus) multiplier *= condMultiplier;
        }
        // ---> Tag Conditions <---
        if (condition.target_has_tag && typeof target.hasTag === 'function') {
            if (target.hasTag(condition.target_has_tag)) multiplier *= condMultiplier;
        }
        if (condition.user_has_tag && typeof source.hasTag === 'function') {
            if (source.hasTag(condition.user_has_tag)) multiplier *= condMultiplier;
        }
        return multiplier;
    }

    static _handleDamage(effect, source, target, abilityAccuracy = 1.0, def) {
        const conditionMultiplier = this._calculateConditionalMultiplier(effect, source, target);
        const basePower = effect.power || 10;
        const finalPower = basePower * conditionMultiplier;

        if (conditionMultiplier > 1.0) {
            console.log(`[BATTLE DEBUG] Condition met! Multiplier applied: x${conditionMultiplier} (Final Power: ${finalPower})`);
        }

        const calc = CombatCalculator.calculateDamage(source, target, finalPower, effect.damageType || 'blunt', abilityAccuracy);

        if (calc.hit) {
            const targetResource = effect.resource || 'hp';
            target.modifyResource(targetResource, -calc.damage);
            const template = calc.crit ? (def.critMessage || "{target} takes {damage} damage (Critical)") : (def.hitMessage || "{target} takes {damage} damage");
            calc.message = this._parseMessage(template, source, target, def, { damage: calc.damage });
            
            if (targetResource !== 'hp') {
                calc.message = calc.message.replace("damage", `${targetResource.toUpperCase()} damage`);
            }

            if (effect.drain && effect.drain > 0) {
                const currentResourceAmount = Math.max(0, (target[targetResource] || target.stats[targetResource]));
                const effectiveDamage = Math.min(calc.damage, currentResourceAmount);
                const drainAmount = Math.floor(effectiveDamage * effect.drain);
                if (drainAmount > 0) {
                    const drainResource = effect.drainResource || targetResource;
                    source.modifyResource(drainResource, drainAmount);
                    calc.message += ` ${source.name} absorbed ${drainAmount} ${drainResource.toUpperCase()}`;
                }
            }

            if (effect.recoil && effect.recoil > 0) {
                const recoilAmount = Math.max(1, Math.floor(calc.damage * effect.recoil));
                const recoilResource = effect.recoilResource || 'hp';
                source.modifyResource(recoilResource, -recoilAmount);
                calc.message += ` ${source.name} took ${recoilAmount} recoil damage`;
            }

            if (target.statusEffects && Array.isArray(target.statusEffects)) {
                for (let i = target.statusEffects.length - 1; i >= 0; i--) {
                    const status = target.statusEffects[i];
                    // range = the range of the ability that hit ('melee', 'ranged'), so a status can answer only melee attacks (see StatusEffectModel `range`)
                    const reaction = status.onEvent('ON_DAMAGE_RECEIVED', target, { attacker: source, damage: calc.damage, range: def && def.range });
                    if (reaction.messages && reaction.messages.length > 0) {
                        calc.message += ` ${reaction.messages.join(' ')}`;
                    }
                    const applied = this._applyReactionStatuses(reaction, target);
                    if (applied) calc.message += ` ${applied}`;
                    if (status.isExpired()) {
                        target.removeStatusEffect(status.id);
                    }
                }
            }
        } else {
            const template = def.missMessage || "{user}'s ability missed {target}";
            calc.message = this._parseMessage(template, source, target, def);
        }
        return calc;
    }

    /* A status effect that answers a hit by putting ANOTHER status on someone (the bear trap binds its attacker) reports it in reaction.applyStatuses.
       Build and apply them here. `holder` is whose status reacted; it is recorded as the inflictor. Returns the messages to add to the log. */
    static _applyReactionStatuses(reaction, holder) {
        const messages = [];
        for (const entry of (reaction && reaction.applyStatuses) || []) {
            const victim = entry.target;
            if (!victim || typeof victim.applyStatusEffect !== 'function') continue;
            const effect = StatusEffectFactory.createEffect(entry.id, entry.charges, holder);
            if (!effect) {
                console.error(`[AbilitySystem] A status reacted by applying "${entry.id}", which StatusEffectFactory could not create.`);
                continue;
            }
            victim.applyStatusEffect(effect); // an existing one just has its charges reset
            if (entry.message) messages.push(entry.message.replace(/{target}/g, victim.name || 'the target').replace(/{status}/g, effect.name));
        }
        return messages.join(' ');
    }

    static _handleRecover(effect, source, target, def) {
        let amount = 0;
        if (effect.calculation === 'flat') {
            amount = effect.power;
        } else if (effect.calculation === 'attribute') {
            const currentStats = source.stats;
            amount = effect.power + Math.floor((currentStats.attributes?.[effect.attribute] || 0) * (effect.scaling || 0));
        } else if (effect.calculation === 'percent') {
            const maxProp = 'max' + effect.resource.charAt(0).toUpperCase() + effect.resource.slice(1);
            const maxValue = target[maxProp] || 1;
            amount = Math.floor(maxValue * effect.power);
        } else if (effect.calculation === 'max') {
            amount = 9999;
        }
        const actualChange = target.modifyResource(effect.resource, amount);
        const template = def.healMessage || "{target} recovers {amount} {resource}";
        const parsedMessage = this._parseMessage(template, source, target, def, { amount: actualChange, resource: effect.resource });
        return { success: actualChange !== 0, amount: actualChange, message: actualChange !== 0 ? parsedMessage : "Recover failed" };
    }

    static _handleSet(effect, target) {
        const currentVal = target.stats ? target.stats[effect.resource] : target[effect.resource];
        const diff = effect.value - currentVal;
        if (diff === 0) return { success: false };
        target.modifyResource(effect.resource, diff);
        return { success: true, message: `${effect.resource.toUpperCase()} set to ${effect.value}` };
    }

    // =========================================================================
    // OVERWORLD EFFECTS
    // To add a new kind of overworld effect, add ONE static method named _world_<effect type> here: (effect, source, target, def, ctx) => { success, message }.
    // execute() finds it by that name (no list to update). The item that carries the ability is only spent when success is true. A handler that needs the
    // live scene (warp, jump) should not touch it: return `worldAction: { type, ... }` and let the caller send it on.
    // =========================================================================

    /* { type: 'world_buff', id, minutes | hours, light?: { radius, color, maxAlpha, flickerAmp, flickerSpeed }, grants?: ['climb'], message? }
       A timed state that runs in IN-GAME time. `light` widens the player's light while it lasts (OverworldController.currentLight); `grants` are permissions
       other code asks about with AbilitySystem.hasWorldGrant('climb'). Using the same buff again restarts its clock (they do not add up). */
    static _world_world_buff(effect, source, target, def) {
        const id = effect.id || def.id;
        const minutes = effect.minutes !== undefined ? effect.minutes : (effect.hours !== undefined ? effect.hours : 8) * 60;
        const name = effect.name || def.name || id;
        // refreshBelow (0..1): while the buff still has MORE than that share of its time left, using the ability again does nothing and costs nothing (so
        // mashing a hotbar key does not burn a second torch). Leave it out and every use restarts the buff.
        const running = this.worldBuffStore()[id];
        if (running && effect.refreshBelow !== undefined && running.durationMinutes > 0 &&
            (running.expiresAt - this.worldNow()) / running.durationMinutes > effect.refreshBelow) {
            return { success: false, message: this._fillTemplate(effect.stillActive || '{name} is still active.', { name }) };
        }
        this.worldBuffStore()[id] = {
            id, name,
            expiresAt: this.worldNow() + minutes,
            durationMinutes: minutes,
            light: effect.light ? { ...effect.light } : null,
            grants: Array.isArray(effect.grants) ? [...effect.grants] : []
        };
        const hours = Math.round(minutes / 6) / 10;
        return { success: true, message: this._fillTemplate(effect.message || '{name} lasts {hours} hours.', { name, hours }) };
    }

    /* { type: 'exit_interior', message?, notInside? }
       Takes the player from inside a cave / house back to the entrance they came in by (the same place walking out of it would). Outside, it does nothing and
       the item is kept. The actual move is the scene manager's job: this only checks that it makes sense and sends { type: 'exit_interior' } on. */
    static _world_exit_interior(effect) {
        const w = gameState.world || {};
        if (!w.isInterior || !w.savedOverworld) {
            return { success: false, message: effect.notInside || 'There is nothing to escape from here.' };
        }
        return { success: true, message: effect.message || 'You are hauled back out to the entrance.', worldAction: { type: 'exit_interior' } };
    }

    /* { type: 'show_interior_map', message?, notInside?, alreadyOpen? }
       Turns the minimap on for the interior the player is standing in. gameState.world.interiorMapId holds the id of that interior (gameState.world.interiorId); the
       minimap draws inside only while the two match, and the scene manager clears it when the player leaves or enters an interior, so the map is good for this one
       visit. Outside, or with the map already open, it does nothing and the item is kept. */
    static _world_show_interior_map(effect) {
        const w = gameState.world || {};
        if (!w.isInterior || !w.interiorId) return { success: false, message: effect.notInside || 'There is nothing here to map.' };
        if (w.interiorMapId === w.interiorId) return { success: false, message: effect.alreadyOpen || 'You already have this place mapped.' };
        w.interiorMapId = w.interiorId;
        return { success: true, message: effect.message || 'You unfold the map.' };
    }

    /* { type: 'start_encounter', encounterId, context?, message? }
       Opens an encounter from the item (a bedroll: the sleep encounter). The scene manager does the opening (worldAction 'start_encounter'); the item is spent by
       whoever used it, as for any other successful overworld ability. */
    static _world_start_encounter(effect) {
        if (!effect.encounterId) return { success: false, message: 'Nothing happens.' };
        return {
            success: true,
            message: effect.message || '',
            worldAction: { type: 'start_encounter', encounterId: effect.encounterId, context: { ...(effect.context || {}) } }
        };
    }

    static _dispatchWorldAction(action) {
        if (typeof this.worldActionHandler === 'function') this.worldActionHandler(action);
        else console.warn(`[AbilitySystem] World action "${action.type}" has no handler (the scene manager sets AbilitySystem.worldActionHandler); nothing happened.`);
    }

    /* { type: 'grant_currency', amount, message? } */
    static _world_grant_currency(effect) {
        const amount = effect.amount || 0;
        if (!amount) return { success: false, message: '' };
        gameState.party.currency = (gameState.party.currency || 0) + amount;
        return { success: true, message: this._fillTemplate(effect.message || 'You gain {amount} currency.', { amount }) };
    }

    static _fillTemplate(template, vars) {
        return template.replace(/{(\w+)}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    }

    // --- timed world buffs: gameState.player.buffs = { [id]: { id, name, expiresAt, durationMinutes, light, grants } } (plain data, so a save keeps it) ---
    // Times are absolute in-game minutes (day * 1440 + minute of the day), so a buff burns on across midnight.

    static worldNow() {
        return (gameState.world.day || 0) * 1440 + (gameState.world.time || 0);
    }

    static worldBuffStore() {
        if (!gameState.player.buffs) gameState.player.buffs = {};
        return gameState.player.buffs;
    }

    /* The buffs still running. Ones that have run out are removed here. */
    static getWorldBuffs() {
        const player = gameState.player;
        const buffs = this.worldBuffStore();

        // saves from before buffs existed kept the torch in player.torch
        if (player.torch) {
            const t = player.torch;
            if (!buffs.torchlight) buffs.torchlight = { id: 'torchlight', name: t.name || 'Torch', expiresAt: t.expiresAt, durationMinutes: t.durationMinutes, light: t.light || null, grants: [] };
            delete player.torch;
        }

        const now = this.worldNow();
        const list = [];
        for (const id of Object.keys(buffs)) {
            const b = buffs[id];
            const left = b.expiresAt - now;
            if (left <= 0 || left > b.durationMinutes + 1) { // ran out (or a nonsense expiry from some other save)
                if (left <= 0) console.log(`[World] ${b.name} has run out.`);
                delete buffs[id];
                continue;
            }
            list.push(b);
        }
        return list;
    }

    /* Is a permission granted by a running buff, e.g. hasWorldGrant('climb')? */
    static hasWorldGrant(grant) {
        return this.getWorldBuffs().some(b => b.grants && b.grants.includes(grant));
    }

    static _parseMessage(template, source, target, def, extra = {}) {
        const targetName = target?.name || "the target";
        let msg = template
            .replace(/{user}/g, source?.name || "Someone")
            .replace(/{target}/g, targetName)
            .replace(/{ability}/g, def?.name || "the action");
            
        if (extra.damage !== undefined) msg = msg.replace(/{damage}/g, extra.damage);
        if (extra.status !== undefined) msg = msg.replace(/{status}/g, extra.status);
        if (extra.amount !== undefined) msg = msg.replace(/{amount}/g, extra.amount);
        if (extra.resource !== undefined) msg = msg.replace(/{resource}/g, extra.resource.toUpperCase());
        if (extra.stackText !== undefined) msg = msg.replace(/{stackText}/g, extra.stackText);
        
        return msg;
    }
}
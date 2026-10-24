import { events } from '../../../../shared/core/eventBus.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { EntityFactory } from '../../../../shared/characters/entityFactory.js';
import { WeatherFactory } from '../../../../shared/world/weatherFactory.js';
import { TimeSystem } from '../../../../shared/world/timeSystem.js';
import { PartyManager } from '../../../../shared/characters/partyManager.js';
import { BaseController } from '../../engine/baseController.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { DIFFICULTY_MODIFIERS } from '../../../../shared/core/constants.js';
import { QuestDefinitions } from '../../../../shared/story/questDefinitions.js';
import { InventorySystem } from '../../../../shared/items/inventorySystem.js';
import { LootTableFactory } from '../../../../shared/items/lootTableFactory.js';
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { AbilitySystem } from '../../../../shared/abilities/abilitySystem.js';
import { AbilityDefinitions } from '../../../../shared/abilities/abilityDefinitions.js';

/* A world buff with a `light` (a torch: the ability `torchlight`, see abilityDefinitions.js) lasts a number of IN-GAME minutes. In its last TORCH_GUTTER_MINUTES the light shrinks back to normal. */
const TORCH_GUTTER_MINUTES = 30;
/* The colour is mixed in this many steps (not smoothly), so LightingRenderer's colour cache only ever holds a handful of entries. */
const TORCH_COLOR_STEPS = 8;

/* Keyboard shortcuts of the overworld menu. The number keys 1-9 and 0 belong to the hotbar (InventorySystem.HOTBAR_KEYS), so the menu uses letters. Change a key here
   and its button badge follows. */
const MENU_KEYS = {
    toggle: 'KeyM',     // open / close the menu
    party: 'KeyP',
    character: 'KeyC',
    journal: 'KeyJ',
    crafting: 'KeyB',   // the crafting Bag
    system: 'KeyO'      // System: save / load / quit to title
};
const keyLabel = (code) => code.replace(/^Key|^Digit/, '');

export class OverworldController extends BaseController {
    constructor(input, config, worldManager) {
        super(input);
        // The world has nothing to "go back" from: right-click only closes the menu when it is open, and is silent otherwise
        this.cancelSfxOnRightClick = false;
        this.config = config;
        this.worldManager = worldManager;
        this.player = this.createPlayerEntity();
        this.baseLight = { ...this.player.light }; // the player's own light; a burning torch lifts it every frame (see currentLight / update)
        this.camera = { x: 0, y: 0, prevX: 0, prevY: 0 };
        this.isLocked = false;
        this.isMenuOpen = false;

        // --- NEW: HARVEST STATE ---
        this.isHarvesting = false;
        this.harvestTimer = 0;
        this.harvestDuration = 0;
        this.harvestTarget = null;

        // --- RESTORED SQUARE LAYOUT ---
        const MENU_X = 48;
        const MENU_Y = 48;
        const BTN_SIZE = 104; // Square width/height
        const GAP = 8;        // Gap between stacked buttons

        this.menuToggleHitbox = {
            id: 'btn_menu_toggle', x: MENU_X, y: MENU_Y, w: BTN_SIZE, h: BTN_SIZE,
            spriteCol: 0, spriteRow: 0, label: 'Menu', shortcut: keyLabel(MENU_KEYS.toggle), zIndex: 100
        };

        this.dropdownHitboxes = [
            { id: 'btn_party',     x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 1, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, spriteCol: 1, spriteRow: 0, label: 'Party', shortcut: keyLabel(MENU_KEYS.party) },
            { id: 'btn_character', x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 2, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, spriteCol: 2, spriteRow: 0, label: 'Character', shortcut: keyLabel(MENU_KEYS.character) },
            { id: 'btn_journal',   x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 3, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, spriteCol: 3, spriteRow: 0, label: 'Journal', shortcut: keyLabel(MENU_KEYS.journal) },
            { id: 'btn_crafting',  x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 4, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, spriteCol: 4, spriteRow: 0, label: 'Crafting', shortcut: keyLabel(MENU_KEYS.crafting) },
            { id: 'btn_system',    x: MENU_X, y: MENU_Y + (BTN_SIZE + GAP) * 5, w: BTN_SIZE, h: BTN_SIZE, zIndex: 101, spriteCol: 5, spriteRow: 0, label: 'System', shortcut: keyLabel(MENU_KEYS.system) }
        ];

        // --- HOTBAR: one clickable slot per key in InventorySystem.HOTBAR_KEYS. Positions here are only a first guess for a 1920x1080 screen:
        // OverworldUIRenderer.drawHotbar centres the row at the bottom of the real canvas every frame and moves these same objects, so clicks always match what is drawn.
        this.hotbarHitboxes = InventorySystem.HOTBAR_KEYS.map((key, i) => ({
            id: 'hotbar_' + i, x: 0, y: 0, w: 68, h: 68, zIndex: 100
        }));
        this.hotbarFlash = null; // { index, at, ok }: a short flash on the slot that was just used
        this.notice = null;      // { text, ok, until }: a line shown above the hotbar ("You light a torch...")
    }

    getHitboxes() {
        if (this.isMenuOpen) {
            return [this.menuToggleHitbox, ...this.dropdownHitboxes, ...this.hotbarHitboxes];
        }
        return [this.menuToggleHitbox, ...this.hotbarHitboxes];
    }

    onClick(hitboxId) {
        if (this.isLocked) return false;

        if (typeof hitboxId === 'string' && hitboxId.startsWith('hotbar_')) {
            // Using a slot makes its own sound (or none for an empty slot), so no default confirm on top of it
            this.claimSfx();
            this.useHotbarSlot(parseInt(hitboxId.slice(7), 10));
            return;
        }

        switch (hitboxId) {
            case 'btn_menu_toggle':
                this.playConfirmSound();
                this.isMenuOpen = !this.isMenuOpen;
                break;
            case 'btn_party':
                this.executeMenuAction('party');
                break;
            case 'btn_character':
                this.executeMenuAction('character_summary');
                break;
            case 'btn_journal':
                this.executeMenuAction('journal');
                break;
            case 'btn_crafting':
                this.playConfirmSound();
                this.isMenuOpen = false;
                this.isLocked = true;
                events.emit('OPEN_WORKSHOP', { station: 'any', title: 'Crafting Bag' });
                break;
            case 'btn_system':
                this.executeMenuAction('saves', { mode: 'game' });
                break;
            default:
                // A click on nothing closes the open menu; with no menu open nothing happened
                if (this.isMenuOpen) {
                    this.isMenuOpen = false;
                    this.playCancelSound();
                } else {
                    return false;
                }
                break;
        }
    }

    onRightClick(hitboxId) {
        if (this.isLocked || !this.isMenuOpen) return false;
        this.isMenuOpen = false;
        this.playCancelSound();
    }

    executeMenuAction(sceneName, data) {
        this.playConfirmSound();
        console.log(`[Overworld] Opening ${sceneName} Menu...`);
        this.isMenuOpen = false;
        this.isLocked = true;
        events.emit('CHANGE_SCENE', data ? { scene: sceneName, data } : { scene: sceneName });
    }

    handleKeyDown(code, e) {
    if (this.isLocked) return;

    // Change interaction key to Spacebar (and prevent page scrolling)
    if (code === 'Space' || code === 'Enter') {
      if (e && e.preventDefault) e.preventDefault(); 
      this.interact();
    }

    // M: Toggle Menu
    if (code === MENU_KEYS.toggle) {
      this.playConfirmSound();
      this.isMenuOpen = !this.isMenuOpen;
    }
    // P: Party
    if (code === MENU_KEYS.party) this.executeMenuAction('party');
    // C: Character
    if (code === MENU_KEYS.character) this.executeMenuAction('character_summary');
    // J: Journal
    if (code === MENU_KEYS.journal) this.executeMenuAction('journal');
    // B: Crafting Bag
    if (code === MENU_KEYS.crafting) {
      this.playConfirmSound();
      this.isLocked = true;
      this.isMenuOpen = false;
      events.emit('OPEN_WORKSHOP', { station: 'any', title: 'Crafting Bag' });
    }
    // O: System (save / load / quit to title)
    if (code === MENU_KEYS.system) this.executeMenuAction('saves', { mode: 'game' });

    // 1-9 and 0: use the item in that hotbar slot
    const hotbarIndex = InventorySystem.HOTBAR_KEYS.indexOf(code);
    if (hotbarIndex !== -1) this.useHotbarSlot(hotbarIndex);

    // Esc / Backspace / Tab: back (closes the menu; there is nothing else to go back from in the world)
    if ((code === 'Escape' || code === 'Backspace' || code === 'Tab') && this.isMenuOpen) {
      this.isMenuOpen = false;
      this.playCancelSound();
    }
  }

    /* ---------------------------------------------------------------- hotbar ----------------------------------------------------------------
       The slots live in gameState.player.hotbar (item definition ids, see InventorySystem.getHotbar) and are filled from the item menu of the character summary
       screen. Using a slot is the same as choosing "Use" there: the item's useAbility runs with { context: 'overworld' }, and one item is spent only when it worked. */

    /* Who an item's ability is aimed at when it is used from the hotbar: the most hurt living party member for a heal, the first fallen one for a revive, every living
       member for a whole-party ability. Abilities that aim at "self" go to the first living member, the one in front: a torch does not care who that is, a bear trap is theirs. */
    pickHotbarTargets(abilityId) {
        const members = (gameState.party && gameState.party.members) || [];
        const scope = AbilityDefinitions[abilityId] && AbilityDefinitions[abilityId].targeting && AbilityDefinitions[abilityId].targeting.scope;
        const dead = (m) => (m.hp !== undefined && m.hp <= 0);
        const living = members.filter(m => !dead(m));
        if (scope === 'self') return living.slice(0, 1);
        if (scope === 'dead_ally') return members.filter(dead).slice(0, 1);
        if (scope === 'all_allies' || scope === 'full_ally_party') return living;
        const share = (m) => (m.maxHp ? m.hp / m.maxHp : 1);
        const hurt = [...living].sort((a, b) => share(a) - share(b))[0];
        return hurt ? [hurt] : members.slice(0, 1);
    }

    /* Use the item in a hotbar slot. Returns true when it worked (and one item was spent). */
    useHotbarSlot(index) {
        if (this.isLocked || this.isHarvesting) return false;
        const defId = InventorySystem.getHotbar()[index];
        if (!defId) return false;

        const def = ItemDefinitions[defId];
        const abilityId = def && def.useAbility;
        const fail = (text) => {
            this.showNotice(text, false);
            this.hotbarFlash = { index, at: performance.now(), ok: false };
            this.playErrorSound();
            return false;
        };

        if (!def || !abilityId) return fail('Nothing happens.');
        if (!InventorySystem.hasItem(defId)) return fail(`You have no ${def.name}.`);
        if (!AbilitySystem.usableIn(abilityId, 'overworld')) return fail('That can only be used in battle.');

        let worked = false, world = false, firstFailure = '';
        const doneMessages = [];
        for (const target of this.pickHotbarTargets(abilityId)) {
            const result = AbilitySystem.execute(abilityId, target, target, { context: 'overworld' });
            const text = (result.message || '').trim();
            if (result.success) {
                worked = true;
                world = world || result.outcome === 'WORLD';
                if (text) doneMessages.push(text);
            } else if (!firstFailure) {
                firstFailure = text;
            }
        }
        const message = doneMessages.join(' ');

        if (!worked) return fail(firstFailure || 'It has no effect.');

        InventorySystem.removeItem(defId, 1);
        this.showNotice(message || 'Used.', true);
        this.hotbarFlash = { index, at: performance.now(), ok: true };
        this.playSfx(UI_SFX.pickup, 0.7, world ? 0.8 : 1.2);
        return true;
    }

    showNotice(text, ok = true, ms = 3000) {
        this.notice = { text, ok, until: performance.now() + ms };
    }

    /* One entry per hotbar slot for the HUD. */
    getHotbarInfo() {
        const now = performance.now();
        const bar = InventorySystem.getHotbar();
        return InventorySystem.HOTBAR_KEYS.map((_, i) => {
            const defId = bar[i];
            const def = defId ? ItemDefinitions[defId] : null;
            const qty = def ? InventorySystem.countItem(defId) : 0;
            const flashAge = this.hotbarFlash && this.hotbarFlash.index === i ? now - this.hotbarFlash.at : Infinity;
            return {
                index: i,
                hitbox: this.hotbarHitboxes[i],
                key: InventorySystem.HOTBAR_LABELS[i],
                defId: def ? defId : null,
                name: def ? def.name : '',
                qty,
                icon: def ? { sheet: this.iconSheetFor(def), col: (def.icon && def.icon.col) || 0, row: (def.icon && def.icon.row) || 0 } : null,
                flash: flashAge < 300 ? 1 - flashAge / 300 : 0,
                flashOk: !!(this.hotbarFlash && this.hotbarFlash.ok)
            };
        });
    }

    /* ---------------------------------------------------------------- carried light (world buffs) ----------------------------------------------------------------
       Timed overworld states (a torch, later a lantern, levitation...) live in gameState.player.buffs and are started by abilities (see AbilitySystem._world_world_buff in
       shared/abilities/abilitySystem.js). This controller only READS them: every buff with a `light` lifts the player's light while it lasts. The renderer is not
       involved: it already draws `player.light`. */
    gameMinutes() {
        return AbilitySystem.worldNow();
    }

    /* The light with one buff's light mixed in. burn: 1 = fully lit, 0 = out. A buff never makes the light weaker, and any field it leaves out stays as it was. */
    liftLight(base, buff) {
        const T = buff.light || {};
        const burn = Math.max(0, Math.min(1, (buff.expiresAt - this.gameMinutes()) / TORCH_GUTTER_MINUTES));
        const lerp = (a, b, t) => a + (b - a) * t;
        const up = (name, fallback) => {
            const a = base[name] !== undefined ? base[name] : fallback;
            return lerp(a, T[name] !== undefined ? Math.max(a, T[name]) : a, burn);
        };
        const light = { ...base, hasLight: true, radius: up('radius', 4), maxAlpha: up('maxAlpha', 0.5), flickerAmp: up('flickerAmp', 0) };
        if (T.flickerSpeed !== undefined) light.flickerSpeed = T.flickerSpeed;
        if (T.color !== undefined) {
            const rgb = (c) => { const m = typeof c === 'string' && /(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : null; };
            const from = rgb(base.color), to = rgb(T.color), t = Math.round(burn * TORCH_COLOR_STEPS) / TORCH_COLOR_STEPS;
            light.color = from && to ? to.map((v, i) => Math.round(lerp(from[i], v, t))).join(', ') : (burn >= 0.5 ? T.color : base.color);
        }
        return light;
    }

    /* The player's light for this frame: the normal light, lifted by every running buff that carries a light. */
    currentLight() {
        let light = this.baseLight;
        for (const buff of AbilitySystem.getWorldBuffs()) {
            if (buff.light) light = this.liftLight(light, buff);
        }
        return light;
    }

    /* For a HUD: one entry per running buff, { id, name, remainingHours, fraction (1 = just started), guttering, hasLight }. */
    getBuffInfo() {
        const now = this.gameMinutes();
        return AbilitySystem.getWorldBuffs().map(b => {
            const left = Math.max(0, b.expiresAt - now);
            return { id: b.id, name: b.name, remainingHours: left / 60, fraction: left / b.durationMinutes, guttering: left < TORCH_GUTTER_MINUTES, hasLight: !!b.light };
        });
    }

    handleMouseDown(x, y, renderer) {
        if (this.isLocked) return;
    }

    update(dt) {
        super.update(dt);
        this.player.light = this.currentLight(); // LightingRenderer draws whatever light the player entity carries: a torch makes it wider, brighter and redder
        this.validateBiomeWeather(); // every frame: the weather must fit the biome the player stands in even when no step ends (a warp, standing still)
        this.checkEnvironmentMusic();
        if (!this.encounterZones) this.encounterZones = this.findEncounterZones(gameState.player.col, gameState.player.row); // standing in a zone when the world opens: it does not fire

        this.worldManager.getActiveObjects().forEach(obj => {
            if (obj.isAnimating) {
                obj.animTimer = (obj.animTimer || 0) + dt;
                if (obj.animTimer >= (obj.speed || 0.15)) {
                    obj.animTimer = 0;
                    if (obj.currentFrame < obj.frames - 1) {
                        obj.currentFrame++;
                    } else {
                        obj.isAnimating = false;
                        if (obj.interaction?.type === 'WARP') {
                            events.emit('INTERACT', { ...obj.interaction, context: { col: obj.col, row: obj.row, objectId: obj.id } });
                        } else {
                            this.isLocked = false;
                        }
                    }
                }
            }
        });

        this.updateCharacterAnimation(dt);

        // --- NEW: Process active harvesting sequence ---
        if (this.isHarvesting && this.harvestTarget) {
            this.harvestTimer += dt;
            if (this.harvestTimer >= this.harvestDuration) {
                this.completeHarvest();
            }
            return; // Block movement and other updates while harvesting
        }

        if (this.isLocked) return;

        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
        this.camera.prevX = this.camera.x;
        this.camera.prevY = this.camera.y;

        if (this.player.isMoving) {
            this.continueMoving(dt);
        } else {
            this.checkForNewMove();
        }

        this.updateCamera();
    }

    /* Which icon sheet an item's icon is on (toasts and the hotbar). */
    iconSheetFor(itemDef) {
        let sheetName = 'items';
        if (itemDef) {
            const type = (itemDef.type || '').toLowerCase();
            const slot = (itemDef.slot || '').toLowerCase();
            if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
                sheetName = 'weapons';
            } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
                sheetName = 'armor';
            } else if (type === 'consumable') {
                sheetName = 'consumables';
            } else if (type === 'material') {
                sheetName = 'materials';
            }
        }
        return sheetName;
    }

    // --- REUSABLE UI TOAST SYSTEM ---
    createItemToast(itemId, amount) {
        const itemDef = ItemDefinitions[itemId];
        const iconCol = itemDef?.icon?.col || 0;
        const iconRow = itemDef?.icon?.row || 0;

        const sheetName = this.iconSheetFor(itemDef);

        if (!gameState.ui) gameState.ui = {};
        if (!gameState.ui.toasts) gameState.ui.toasts = [];

        gameState.ui.toasts.push({
            itemId: itemId,
            amount: amount,
            createdAt: performance.now(),
            duration: 2500,
            iconSheet: sheetName,
            iconCol: iconCol,
            iconRow: iconRow
        });

        gameState.ui.toasts = gameState.ui.toasts.filter(t => performance.now() - t.createdAt < 3000);
    }

    processPickup(targetObj) {
        targetObj.isFading = true;
        // A pickup gives either one fixed item, or (interaction.lootTableId) whatever the loot table rolls: a stick is mostly soft wood, now and then hard wood
        // (interaction.maxAmount: a pickup that gives anywhere from `amount` to `maxAmount`; the herbs give 1 or 2)
        const minQty = targetObj.interaction.amount || 1;
        const maxQty = Math.max(minQty, targetObj.interaction.maxAmount || minQty);
        let gained = [{ id: targetObj.interaction.itemId, qty: minQty + Math.floor(Math.random() * (maxQty - minQty + 1)) }];
        if (targetObj.interaction.lootTableId) {
            const rolled = LootTableFactory.generateLoot(targetObj.interaction.lootTableId, 1).items;
            if (rolled.length) gained = rolled;
        }
        for (const { id, qty } of gained) {
            InventorySystem.addItem(id, qty);
            this.createItemToast(id, qty);
        }
        events.emit('PLAY_SFX', { id: UI_SFX.pickup, volume: 0.8, pitch: 1.0 });

        // --- FADE OUT MAP OBJECT ---
        targetObj.alpha = 1.0;
        const fadeSteps = 15;
        const fadeDuration = 300;
        const stepTime = fadeDuration / fadeSteps;
        const alphaDrop = 1.0 / fadeSteps;

        const fadeInterval = setInterval(() => {
            targetObj.alpha -= alphaDrop;
            if (targetObj.alpha <= 0) {
                this.worldManager.modifyWorld(targetObj.col, targetObj.row, null);
                clearInterval(fadeInterval);
            }
        }, stepTime);
    }

    /* Search a container on the map: what it holds comes from its own loot table (interaction.lootTableId), and it can only be searched once. */
    searchContainer(obj) {
        const name = obj.interaction.name || 'container';
        if (this.worldManager.isSearched(obj.col, obj.row)) {
            this.showNotice(`You already searched the ${name}.`, false);
            return;
        }
        this.worldManager.markSearched(obj.col, obj.row);
        const found = LootTableFactory.searchContainer(obj.interaction.lootTableId);
        if (!found.length) {
            this.showNotice(`The ${name} is empty.`, false);
            return;
        }
        for (const { id, qty } of found) {
            InventorySystem.addItem(id, qty);
            this.createItemToast(id, qty);
        }
        events.emit('PLAY_SFX', { id: UI_SFX.pickup, volume: 0.8, pitch: 1.0 });
    }

   // --- NEW: Helper to check if party leader has required tool ---
    hasRequiredTool(requiredTool) {
        if (!requiredTool) return true; // Always true if no tool is required

        const leader = PartyManager.getPlayer();
        let hasTool = false;

        const checkTool = (item) => this.getHarvestTools(item).includes(requiredTool);

        if (leader?.equipment) {
            if (checkTool(leader.equipment.mainHand)) hasTool = true;
            if (checkTool(leader.equipment.twoHand)) hasTool = true;
            if (checkTool(leader.equipment.offHand)) hasTool = true;
        }

        return hasTool;
    }

    /* The tools an equipped item works as ('axe', 'pickaxe', 'sickle'...). Reads the item's own harvestTool first, and if the item model does not expose it
       (or the item is only an id), falls back to the item's definition, so every tool in itemDefinitions.js works, the pickaxe included. */
    getHarvestTools(item) {
        if (!item) return [];
        if (Array.isArray(item.harvestTool) && item.harvestTool.length) return item.harvestTool;
        const def = (typeof item === 'string' ? ItemDefinitions[item] : null)
            || item.definition
            || ItemDefinitions[item.defId]
            || ItemDefinitions[item.id];
        return (def && Array.isArray(def.harvestTool)) ? def.harvestTool : [];
    }

    // --- NEW: HARVESTING LOGIC ---
    startHarvest(targetObj) {
        const requiredTool = targetObj.interaction.tool;
        // The party leader must have the required tool equipped (same check as the prompt in getState)
        const hasTool = this.hasRequiredTool(requiredTool);

        if (!hasTool) {
            console.log(`[Overworld] Requires a ${requiredTool} to harvest this!`);
            this.playErrorSound();
            return;
        }

        // Lock player and start harvesting timer
        this.isHarvesting = true;
        this.isLocked = true;
        this.harvestTarget = targetObj;
        this.harvestDuration = targetObj.interaction.duration || 1.5;
        this.harvestTimer = 0;

        // Make the character face the object during animation
        this.player.animFrame = 0;
        events.emit('PLAY_SFX', { id: 'harvest_start', volume: 0.6 });
    }

    completeHarvest() {
        this.isHarvesting = false;
        this.isLocked = false;
        const obj = this.harvestTarget;
        this.harvestTarget = null;
        if (!obj) return;

        const itemId = obj.interaction.itemId;
        const amount = obj.interaction.amount || 1;
        InventorySystem.addItem(itemId, amount);
        events.emit('PLAY_SFX', { id: UI_SFX.pickup, volume: 0.8, pitch: 1.0 });
        this.createItemToast(itemId, amount);
        // Check if object leaves a remnant behind (e.g. Tree -> Stump)
        if (obj.interaction.replaceWith) {
            // The remnant stands where the object's solid part stood: the bottom-left cell of its hitbox. The bottom-left of the *sprite* is
            // often empty ground the player can stand on (the left side of a wide tree), and a stump put there would land on top of them.
            const hb = (obj.hitboxes && obj.hitboxes[0]) || { xOffset: 0, yOffset: 0, w: 1, h: 1 };
            const remnantCol = obj.col + (hb.xOffset || 0);
            const remnantRow = obj.row + (hb.yOffset || 0) + Math.max(1, hb.h || 1) - 1;
            this.worldManager.modifyWorld(obj.col, obj.row, null);   // the tree is gone (this also frees its hitbox cells)
            this.worldManager.modifyWorld(remnantCol, remnantRow, obj.interaction.replaceWith);
        } else {
            this.worldManager.modifyWorld(obj.col, obj.row, null);
        }
    }

    interact() {
        if (this.player.isMoving || this.isLocked) return;
        const obj = this.getFacedObject();
        if (obj && obj.interaction) {
            console.log(`[Overworld] Interacting with ${obj.id} at ${obj.col},${obj.row}`);
            // --- Intercept item pickups so the game doesn't freeze! ---
            if (obj.interaction.type === 'PICKUP') {
                this.processPickup(obj);
                return;
            }

            // --- Search a crate, wardrobe or sacks (no encounter) ---
            if (obj.interaction.type === 'SEARCH') {
                this.searchContainer(obj);
                return;
            }

            // --- Intercept harvesting mechanics ---
            if (obj.interaction.type === 'HARVEST') {
                this.startHarvest(obj);
                return;
            }

            this.isLocked = true;
            this.player.animFrame = 0;

            // Handle custom workbench/station interactions
            if (obj.interaction.type === 'CRAFTING_STATION' || obj.interaction.type === 'WORKSHOP') {
                events.emit('CHANGE_SCENE', { scene: 'workshop', data: { station: obj.interaction.station || 'any', title: obj.interaction.title || obj.name || 'Workshop' } });
                return;
            }

            // Default interaction dispatch
            events.emit('INTERACT', { ...obj.interaction, context: { col: obj.col, row: obj.row, objectId: obj.id } });
        }
    }

    checkForNewMove() {
        const dir = this.input.direction;
        if (!dir) return;

        const { TILE_SIZE } = this.config;
        let nextX = this.player.x;
        let nextY = this.player.y;

        this.player.direction = dir;

        if (dir === "UP")    nextY -= TILE_SIZE;
        if (dir === "DOWN")  nextY += TILE_SIZE;
        if (dir === "LEFT")  nextX -= TILE_SIZE;
        if (dir === "RIGHT") nextX += TILE_SIZE;

        if (this.isSpaceFree(nextX, nextY)) {
            this.startMove(nextX, nextY);
        }
    }

    /* Holding shift runs (Input.run). Read once per tile (in startMove), so a step is never half walk, half run. */
    isRunHeld() {
        return !!this.input.run;
    }

    /* Seconds one tile takes: CONFIG.WALK_DURATION on foot, CONFIG.RUN_DURATION when running (default: a little over half the walking time). */
    getMoveDuration() {
        const walk = this.config.WALK_DURATION;
        return this.player.isRunning ? (this.config.RUN_DURATION ?? walk * 0.55) : walk;
    }

    /* Back to the idle pose: the idle loop starts again from its first frame. */
    setAnimIdle() {
        this.player.animState = 'idle';
        this.player.animPhase = 0;
        this.player.idleTimer = 0;
    }

    /* Called every update. While standing still (also while the player is locked in a menu or harvesting) the idle clock runs; the walk / run phase is
       advanced by the movement itself, in continueMoving. MapRenderer turns the clock or the phase into a frame of the sheet. */
    updateCharacterAnimation(dt) {
        if (this.player.isMoving) return;
        if (this.player.animState !== 'idle') this.setAnimIdle(); // a move that ended without a follow-up (blocked, locked, warp...)
        this.player.idleTimer += dt;
    }

    startMove(nextX, nextY) {
        this.player.sourceX = this.player.x;
        this.player.sourceY = this.player.y;
        this.player.destX = nextX;
        this.player.destY = nextY;
        this.player.moveProgress = 0;
        this.player.isMoving = true;

        const wasIdle = this.player.animState === 'idle';
        this.player.isRunning = this.isRunHeld();
        this.player.animState = this.player.isRunning ? 'run' : 'walk';
        if (wasIdle) this.player.animPhase = 0; // a fresh start; a chained step keeps the cycle going
    }

    continueMoving(dt) {
        const progressStep = dt / this.getMoveDuration();
        this.player.moveProgress += progressStep;

        /* Walk / run animation follows the distance covered, not the clock, so a faster step plays the same cycle faster and the feet keep to the tiles.
           animPhase runs 0..1 through one cycle of the sheet's 8 frames; one cycle spans this many tiles (8 frames = two footsteps, so 2 = a footstep per
           tile). Override with CONFIG.CHARACTER_ANIM = { walkTilesPerCycle, runTilesPerCycle }. */
        const ca = this.config.CHARACTER_ANIM || {};
        const tilesPerCycle = this.player.isRunning ? (ca.runTilesPerCycle ?? 3) : (ca.walkTilesPerCycle ?? 2);
        this.player.animPhase = (this.player.animPhase + progressStep / tilesPerCycle) % 1;

        if (this.player.moveProgress >= 1) {
            const overshoot = this.player.moveProgress - 1;
            this.finishMove();
            if (this.player.isMoving) {
                this.player.moveProgress = overshoot;
                this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
                this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
            }
        } else {
            this.player.x = this.player.sourceX + (this.player.destX - this.player.sourceX) * this.player.moveProgress;
            this.player.y = this.player.sourceY + (this.player.destY - this.player.sourceY) * this.player.moveProgress;
        }
    }

    finishMove() {
        this.player.x = Math.round(this.player.destX);
        this.player.y = Math.round(this.player.destY);
        this.player.isMoving = false;
        this.player.moveProgress = 0;

        gameState.player.col = Math.floor(this.player.x / this.config.TILE_SIZE);
        gameState.player.row = Math.floor(this.player.y / this.config.TILE_SIZE);
        gameState.player.direction = this.player.direction;

        const stepOnObj = this.worldManager.getObjectAt(gameState.player.col, gameState.player.row);
        // --- UPDATED: Handle Walk-Over Pickups ---
        if (stepOnObj && stepOnObj.interaction?.type === 'PICKUP' && !stepOnObj.isFading) {
            this.processPickup(stepOnObj);
        }
        // Existing Warp logic
        if (stepOnObj && stepOnObj.frames > 1 && stepOnObj.interaction?.type === 'WARP') {
            this.isLocked = true;
            stepOnObj.isAnimating = true;
            stepOnObj.currentFrame = 0;
            stepOnObj.animTimer = 0;
            events.emit('PLAY_SFX', { id: 'door_open', volume: 0.6, pitch: 1.0 });
            return;
        }

        // Walk-in warps (cave mouths, `walkIn: true` on the WARP): a single-frame object has no door to open, so stepping onto its doorway cell warps at once
        if (stepOnObj && !(stepOnObj.frames > 1) && stepOnObj.interaction?.type === 'WARP' && stepOnObj.interaction.walkIn) {
            this.isLocked = true;
            this.setAnimIdle();
            events.emit('INTERACT', { ...stepOnObj.interaction, context: { col: stepOnObj.col, row: stepOnObj.row, objectId: stepOnObj.id } });
            return;
        }

        // Walk-in encounters (`walkIn: true` on an ENCOUNTER, e.g. ANIMAL_TRACKS): stepping onto the object starts the encounter, no need to face it and press interact.
        // The object is not solid, so you are standing on its tile; INTERACT carries its col / row / id as the encounter context (DESTROY_OBJECT uses it).
        if (stepOnObj && !stepOnObj.isFading && stepOnObj.interaction?.type === 'ENCOUNTER' && stepOnObj.interaction.walkIn) {
            this.isLocked = true;
            this.setAnimIdle();
            events.emit('INTERACT', { ...stepOnObj.interaction, context: { col: stepOnObj.col, row: stepOnObj.row, objectId: stepOnObj.id } });
            return;
        }

        // Lines of sight (`triggerLine` on an ENCOUNTER, e.g. PECULIAR_SCARECROW): stepping onto the cells it sees (5 tiles beneath its base) starts the encounter
        if (this.checkEncounterZones()) return;

        this.checkTileEvents();
        this.validateBiomeWeather();

        if (this.isLocked) return;

        if (this.input.direction) {
            this.checkForNewMove();
        } else {
            this.setAnimIdle();
        }
    }

    /* The ENCOUNTER objects the player is in the line of sight of: a Map of "col,row" -> object. An object with `interaction.triggerLine = { direction, length }`
       (PECULIAR_SCARECROW: down, 5) sees the cells in a straight line from its base, `length` tiles one way, across its whole width: for the two wide scarecrow,
       'down' is the two columns straight beneath it. Only the player's own row and column are searched, MAX_LINE_LENGTH tiles each way. */
    findEncounterZones(col, row) {
        const MAX_LINE_LENGTH = 8, MAX_WIDTH = 4;
        const LOOKING = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
        const zones = new Map();
        const wm = this.worldManager;
        if (!wm || !wm.getObject) return zones;
        for (const [direction, [dx, dy]] of Object.entries(LOOKING)) {
            if (wm.ensureChunkLoaded) wm.ensureChunkLoaded(col - dx * MAX_LINE_LENGTH, row - dy * MAX_LINE_LENGTH);
            for (let k = 1; k <= MAX_LINE_LENGTH; k++) {
                for (let j = 0; j < MAX_WIDTH; j++) {
                    // j = how many columns the player stands to the right of the object's own column; up and down lines see its whole width, a line to the right starts at its right edge
                    const ox = dx === 0 ? col - j : (dx > 0 ? col - k - j : col + k);
                    const obj = wm.getObject(ox, row - dy * k);   // where an object that looks along (dx, dy) would stand
                    const line = obj && !obj.isFading && obj.interaction && obj.interaction.type === 'ENCOUNTER' && obj.interaction.triggerLine;
                    if (!line || line.direction !== direction || k > line.length) continue;
                    const w = obj.w || 1;
                    if (dx === 0 ? j >= w : (dx > 0 ? j !== w - 1 : j > 0)) continue;
                    zones.set(`${obj.col},${obj.row}`, obj);
                }
            }
        }
        return zones;
    }

    /* Called when a step ends. A line of sight fires once when the player steps into it; while the player stays inside (after the encounter, or after the
       fight it led to) it stays quiet, and it is armed again once the player has left. Returns true when an encounter was started. */
    checkEncounterZones() {
        const now = this.findEncounterZones(gameState.player.col, gameState.player.row);
        const before = this.encounterZones || new Map();
        this.encounterZones = now;
        for (const [key, obj] of now) {
            if (before.has(key)) continue;
            this.isLocked = true;
            this.setAnimIdle();
            events.emit('INTERACT', { ...obj.interaction, context: { col: obj.col, row: obj.row, objectId: obj.id } });
            return true;
        }
        return false;
    }

    checkTileEvents() {
        const col = Math.floor(this.player.x / this.config.TILE_SIZE);
        const row = Math.floor(this.player.y / this.config.TILE_SIZE);
        const biome = this.worldManager.getBiomeAt(col, row);
        const currentHour = gameState.world.time / 60;
        const encounterData = biome.getEncounter(currentHour);

        if (encounterData) {
            console.log(`[Overworld] Encounter triggered in ${biome.id} at hour ${Math.floor(currentHour)}: ${encounterData.id}!`);
            this.isLocked = true;
            this.player.isMoving = false;
            this.player.moveProgress = 0;
            this.player.animFrame = 0;
            events.emit('START_ENCOUNTER', { encounterId: encounterData.id, context: encounterData.context });
            return;
        }

        // The smoke bomb on the overworld (a world buff that grants 'no_ambush') keeps random battles away while it lasts; the roll is not even made
        if (AbilitySystem.hasWorldGrant('no_ambush')) return;

        const difficulty = gameState.difficulty || 'normal';
        const battleData = biome.getBattle(difficulty, currentHour);   // the hour picks the day / dusk / night (and blood moon) spawn table
        if (!battleData) return;

        console.log(`[Overworld] Ambush triggered in biome: ${biome.id} on ${difficulty} difficulty!`);
        this.isLocked = true;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.player.animFrame = 0;

        const battleBgAsset = biome.getBattleBackground(currentHour);
        const battlePayload = {
            enemies: battleData.enemies,
            background: battleBgAsset,
            weather: gameState.world.currentWeather
        };
        events.emit('START_BATTLE', battlePayload);
    }

    /* The developer console (ui/devConsole.js, commands in shared/core/devCommands.js) starts scenes the way a step does (checkTileEvents): the world stops taking
       input first, and a battle gets the background and weather of where the player stands. */
    devLockWorld() {
        this.isLocked = true;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.player.animFrame = 0;
    }

    devBattleSetup() {
        const biome = this.worldManager.getBiomeAt(gameState.player.col, gameState.player.row);
        return { background: biome.getBattleBackground(gameState.world.time / 60), weather: gameState.world.currentWeather };
    }

    /* Keeps gameState.world.currentBiome and the weather in step with where the player stands. The rules live in TimeSystem.syncBiomeWeather:
       weather the biome does not allow becomes CLEAR and its sound is stopped. Cheap (the biome lookup is cached), so it runs every frame. */
    validateBiomeWeather() {
        const biome = this.worldManager.getBiomeAt(gameState.player.col, gameState.player.row);
        TimeSystem.syncBiomeWeather(biome.id);
    }

    checkEnvironmentMusic() {
        const col = gameState.player.col;
        const row = gameState.player.row;
        const biome = this.worldManager.getBiomeAt(col, row);
        const currentHour = (gameState.world.time || 0) / 60;
        const targetTrack = biome.getMusic(currentHour, false);

        if (targetTrack && gameState.world.currentBgm !== targetTrack) {
            console.log(`[Overworld] Music shift to: ${targetTrack}`);
            gameState.world.currentBgm = targetTrack;
            events.emit('PLAY_MUSIC', { id: targetTrack, fadeTime: 4.0 });
        }
    }

    isSpaceFree(targetX, targetY) {
        const { TILE_SIZE } = this.config;
        const startCol = Math.floor(this.player.x / TILE_SIZE);
        const startRow = Math.floor(this.player.y / TILE_SIZE);
        const endCol = Math.floor(targetX / TILE_SIZE);
        const endRow = Math.floor(targetY / TILE_SIZE);

        return this.worldManager.canMove(startCol, startRow, endCol, endRow, this.player.direction);
    }

    updateCamera() {
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
        this.camera.prevX = this.player.prevX;
        this.camera.prevY = this.player.prevY;
    }

    getTrackedQuests() {
        if (!gameState.quests || !gameState.quests.active) return [];
        const trackedIds = gameState.quests.trackedIds || [];
        const trackedQuests = [];

        for (const id of trackedIds) {
            const questState = gameState.quests.active[id];
            const def = QuestDefinitions[id];

            if (questState && def) {
                const formattedObjectives = def.objectives.map(obj => {
                    const current = questState.progress[obj.id] || 0;
                    const required = obj.amount || 1;
                    // Pass the raw data so the UIRenderer can resolve the real names 
                    // using ENTITY_DEFINITIONS and ItemDefinitions
                    return {
                        description: obj.description, // Only pass if hardcoded in the quest def
                        type: obj.type,
                        targetId: obj.targetId,
                        targetLevel: obj.targetLevel,
                        current: current,
                        required: required
                    };
                });
                trackedQuests.push({ title: def.name, objectives: formattedObjectives });
            }
        }
        return trackedQuests;
    }

    getFacedObject() {
        if (this.player.isMoving || this.isLocked) return null;

        const { TILE_SIZE } = this.config;
        let targetX = this.player.x;
        let targetY = this.player.y;

        if (this.player.direction === "UP")    targetY -= TILE_SIZE;
        if (this.player.direction === "DOWN")  targetY += TILE_SIZE;
        if (this.player.direction === "LEFT")  targetX -= TILE_SIZE;
        if (this.player.direction === "RIGHT") targetX += TILE_SIZE;

        const lookCol = Math.floor(targetX / TILE_SIZE);
        const lookRow = Math.floor(targetY / TILE_SIZE);

        const obj = this.worldManager.getObjectAt(lookCol, lookRow);
        // Only return it if it has an interaction and isn't currently fading
        if (obj && obj.interaction && !obj.isFading) {
            return obj;
        }
        return null;
    }

    getState() {
        const buffInfo = this.getBuffInfo();
        let displayFacedObject = this.getFacedObject();

        // --- NEW: Hide interaction prompt if missing required harvest tool ---
        if (displayFacedObject && displayFacedObject.interaction?.type === 'HARVEST') {
            if (!this.hasRequiredTool(displayFacedObject.interaction.tool)) {
                displayFacedObject = null; // Hide from UI
            }
        }

        return {
            entities: [this.player],
            camera: this.camera,
            worldManager: this.worldManager, // the minimap reads the terrain around the player from it
            hoveredHitboxId: this.hoveredHitboxId,
            skillPointReady: !!gameState.party?.members?.some(m => m.skillPoints > 0),   // a skill point is waiting to be spent: the menu / Party buttons show a badge
            menuToggleHitbox: this.menuToggleHitbox,
            dropdownHitboxes: this.dropdownHitboxes,
            isMenuOpen: this.isMenuOpen,
            trackedQuests: this.getTrackedQuests(),
            toasts: (gameState.ui && gameState.ui.toasts) ? gameState.ui.toasts : [],
            facedObject: displayFacedObject, // Passes null if they lack the tool!
            hotbar: this.getHotbarInfo(),
            notice: (this.notice && performance.now() < this.notice.until) ? { text: this.notice.text, ok: this.notice.ok, left: this.notice.until - performance.now() } : null,
            buffs: buffInfo, // running world buffs, for a HUD
            torch: buffInfo.find(b => b.hasLight) || null, // the first light buff (the old name for it)
            isHarvesting: this.isHarvesting,
            harvestTimer: this.harvestTimer,
            harvestDuration: this.harvestDuration,
            harvestTarget: this.harvestTarget
        };
    }

    warpTo(col, row) {
        const { TILE_SIZE } = this.config;
        gameState.player.col = col;
        gameState.player.row = row;
        this.player.x = col * TILE_SIZE;
        this.player.y = row * TILE_SIZE;
        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
        this.player.destX = this.player.x;
        this.player.destY = this.player.y;
        this.player.sourceX = this.player.x;
        this.player.sourceY = this.player.y;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
        this.camera.prevX = this.player.x;
        this.camera.prevY = this.player.y;

        this.validateBiomeWeather(); // a new map (a house, a cave, back outside): drop weather that does not belong there, and its sound, right now
    }

    createPlayerEntity() {
        let startX, startY;
        const savedCol = gameState.player.col;
        const savedRow = gameState.player.row;
        if (savedCol !== 0 || savedRow !== 0) {
            startX = savedCol * this.config.TILE_SIZE;
            startY = savedRow * this.config.TILE_SIZE;
        } else {
            const spawn = this.worldManager.findSpawnPoint();
            startX = spawn.col * this.config.TILE_SIZE;
            startY = spawn.row * this.config.TILE_SIZE;
            gameState.player.col = spawn.col;
            gameState.player.row = spawn.row;
        }

        return {
            id: "player",
            isPlayer: true,
            x: startX,
            y: startY,
            hitbox: { y: 0.5, h: 0.5 },
            direction: gameState.player.direction || "DOWN",
            isMoving: false,
            isRunning: false,
            animState: 'idle', // 'idle' | 'walk' | 'run': which set of rows of the sheet MapRenderer draws
            animPhase: 0,      // 0..1 through the walk / run cycle
            idleTimer: 0,      // seconds spent standing still, for the idle loop
            animFrame: 0,      // no longer used by MapRenderer (it works the frame out from animPhase / idleTimer)
            light: {
                hasLight: true,
                radius: 4,
                color: '255, 200, 100',
                maxAlpha: 0.5,
                flickerAmp: 0.1
            }
        };
    }
}
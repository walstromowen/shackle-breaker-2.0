import { BaseController } from '../../engine/baseController.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { EncounterFactory } from "../../../../shared/story/encounterFactory.js";
import { gameState } from "../../../../shared/core/gameState.js";
import { events } from "../../../../shared/core/eventBus.js";
import { EncounterLogic } from './encounterLogic.js';
import { LootTableFactory } from "../../../../shared/items/lootTableFactory.js";
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { NARRATION, STAGE_START_TIMER, narrationPlan, textEndTimer, decisionAlpha, decisionsDoneTimer, actionPadding } from '../../ui/narration.js';

const PROLOGUE_HOLD = 1.2;     // seconds the "skip the prologue" button (or Escape) is held

export class EncounterController extends BaseController {
  constructor(input, config, worldManager) {
    super(input);
    this.config = config;
    this.worldManager = worldManager;
    this.scrollManager = new ScrollManager();
    this.scrollManager.registerZone('decision_list', { thumbIds: ['SCROLL_THUMB_DECISIONS'] });
    this.scrollManager.registerZone('text_content', { thumbIds: ['SCROLL_THUMB_TEXT'] });

    this.model = null;
    this.selectedIndex = 0;
    this.actionPhase = 'none';
    this.pendingDecision = null;
    this.pendingLogicResponse = null;
    this.actionMessage = "";
    this.rollTimer = 0;
    this.rollTickTimer = 0;
    this.rollData = { displayVal: "?", d20: 0, mod: 0, total: 0, dc: 0, isSuccess: false, duration: 2.5 };
    this.lastText = "";
    this.textTimer = 0;
    this.hasDoneIntro = false;
    this.skipMessageAnimation = false;
    this.inputCooldown = 0.15;
    // Nothing is skipped by clicking. Skipping ahead takes a deliberate HOLD (NARRATION.HOLD_TO_SKIP) of the button, Enter or Space.
    this.holdTimer = 0;               // seconds the skip button has been held (0..HOLD_TO_SKIP)
    this.prologueHold = 0;            // seconds the "skip the prologue" button (or Escape) has been held
    this.prologueHint = 0;            // a click on that button makes it flare
    this._holdArmed = false;          // this press began while something was skippable
    this._wasDown = false;
    this._swallowClick = false;       // the release of a hold that has just skipped must not also click whatever is under the mouse
    this._swallowTimer = 0;
    this.hintPulse = 0;               // a click that did nothing makes the "hold to skip" hint flare for a moment
    this.imageTransition = { active: false, timer: 0, duration: 0.4, previousInfo: null, previousPartyMember: null };
    this.rewardQueue = [];
    this.rewardItemsByMessage = {};   // reward message text -> [{id, qty}] (pictures of the items it lists)
    this.currentRewardItems = null;   // the items of the reward message on screen
    this.pendingEndEncounterPayload = null;
    this.rewardsEndEncounter = false;
    this.pendingSceneChange = null;
    this.rewardReturnStageId = null;
    // An encounter is never "backed out of": right-click / Esc only let go of a dragged scrollbar, and are silent otherwise
    this.cancelSfxOnRightClick = false;
    this.updateBGM();
  }

  start(encounterId, context = {}) {
    if (gameState.party && gameState.party.members && gameState.party.members.length > 0) {
      const members = gameState.party.members;
      if (members[0].hp <= 0) {
        const firstLivingIndex = members.findIndex(m => m.hp > 0);
        if (firstLivingIndex > 0) {
          const livingMember = members.splice(firstLivingIndex, 1)[0];
          members.unshift(livingMember);
        } else if (firstLivingIndex === -1) {
          events.emit('CHANGE_SCENE', { scene: 'game_over' });
          return;
        }
      }
    }
    
    this.model = EncounterFactory.create(encounterId, context);
    this._encounterId = encounterId;
    this.prologueHold = 0;
    if (!this.model) {
      events.emit('CHANGE_SCENE', { scene: 'overworld' });
      return;
    }
    this.selectedIndex = 0;
    this.actionPhase = 'none';
    this.pendingDecision = null;
    this.pendingLogicResponse = null;
    this.actionMessage = "";
    this.rollTimer = 0;
    this.lastText = "";
    this.textTimer = 0;
    this.hasDoneIntro = false;
    this.skipMessageAnimation = false;
    this.inputCooldown = 0.15;
    this.holdTimer = 0; this._holdArmed = false; this._wasDown = false; this._swallowClick = false; this._swallowTimer = 0; this.hintPulse = 0;
    this._cueKey = null;              // the stage whose sound cues (sfx / ambience) have been played
    this.rewardQueue = [];
    this.rewardItemsByMessage = {};   // reward message text -> [{id, qty}] (pictures of the items it lists)
    this.currentRewardItems = null;   // the items of the reward message on screen
    this.pendingEndEncounterPayload = null;
    this.rewardsEndEncounter = false;
    this.pendingSceneChange = null;
    this.rewardReturnStageId = null;
    this.imageTransition = { active: false, timer: 0, duration: 0.4, previousInfo: null, previousPartyMember: null };
    this.updateBGM();
  }

  update(dt) {
    if (super.update) super.update(dt);
    if (this.inputCooldown > 0) this.inputCooldown -= dt;
    this._playStageCues();
    this.scrollManager.update(dt);
    if (!this.model) return;
    
    this.textTimer += dt;
    if (this.textTimer >= NARRATION.TEXT_START) {
      this.hasDoneIntro = true;
    }
    this._updateHold(dt);
    this._updatePrologueHold(dt);
    
    if (this.imageTransition.active) {
      this.imageTransition.timer += dt;
      if (this.imageTransition.timer >= this.imageTransition.duration) {
        this.imageTransition.active = false;
        this.imageTransition.previousInfo = null;
        this.imageTransition.previousPartyMember = null;
        this.imageTransition.timer = this.imageTransition.duration;
      }
    }
    
    if (this.actionPhase === 'message') {
      if (this.skipMessageAnimation || this.textTimer >= textEndTimer(this.actionMessage) + actionPadding(this.actionMessage)) {
        this.skipMessageAnimation = false;
        if (this.pendingDecision && this.pendingDecision.type === 'skill_check') {
          this.rollData = EncounterLogic.calculateRoll(this.pendingDecision);
          this.actionPhase = 'wait_for_roll';
        } else {
          this.applySceneChanges();
        }
      }
    } else if (this.actionPhase === 'rolling') {
      this.rollTimer -= dt;
      this.rollTickTimer -= dt;
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.rollData.displayVal = this.rollData.d20;
        this.actionPhase = 'hold_base';
        this.rollTimer = 1.0;
        this.skipMessageAnimation = false;
        events.emit('PLAY_SFX', { id: 'dice_land', volume: 0.7 });
      } else if (this.rollTickTimer <= 0) {
        this.rollData.displayVal = Math.floor(Math.random() * 20) + 1;
        const progress = 1.0 - (this.rollTimer / this.rollData.duration);
        this.rollTickTimer = 0.04 + (Math.pow(progress, 6) * 1.2);
        events.emit('PLAY_SFX', { id: 'diceTick', volume: 0.3, pitch: 0.9 + (Math.random() * 0.2) });
      }
    } else if (this.actionPhase === 'hold_base') {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.actionPhase = 'apply_mod';
        this.rollTimer = 2.5;
        this.skipMessageAnimation = false;
      }
    } else if (this.actionPhase === 'apply_mod') {
      this.rollTimer -= dt;
      let progress = Math.min(Math.max(1.0 - (this.rollTimer / 2.5), 0), 1);
      this.rollData.displayVal = this.rollData.d20 + Math.round(this.rollData.mod * progress);
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.rollData.displayVal = this.rollData.total;
        this.actionPhase = 'result';
        this.rollTimer = 3.5;
        this.skipMessageAnimation = false;
        this.executeLogic();
      }
    } else if (this.actionPhase === 'result') {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.applySceneChanges();
      }
    } else if (this.actionPhase === 'reward_delay') {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.skipMessageAnimation = false;
        this.showNextReward();
      }
    } else if (this.actionPhase === 'ending_delay') {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0 || this.skipMessageAnimation) {
        this.endEncounter(this.pendingDecision ? this.pendingDecision.payload : null);
      }
    }
  }

  /* The party column of the screen: the leader, or in a betrayal encounter the shackled member it is about (drawn cursed, at 0 health). */
  _shownMembers() {
    const members = gameState.party?.members || [];
    const ctx = this.model?.context || {};
    const byIndex = members[ctx.betrayerIndex];
    const betrayer = (byIndex && byIndex.shackled) ? byIndex : (ctx.betrayerName ? members.find(m => m.name === ctx.betrayerName && m.shackled) : null);
    const shown = betrayer || members[0];
    return shown ? [shown] : [];
  }

  _triggerImageTransition(duration = 0.4) {
    if (!this.model) return;
    const outgoingInfo = this.model.getImage ? this.model.getImage() : null;
    const outgoingMember = gameState.party?.members?.[0] || null;
    this.imageTransition.active = true;
    this.imageTransition.timer = 0;
    this.imageTransition.duration = duration;
    this.imageTransition.previousInfo = outgoingInfo;
    if (outgoingMember) {
      this.imageTransition.previousPartyMember = {
        name: outgoingMember.name,
        hp: outgoingMember.hp,
        maxHp: outgoingMember.maxHp,
        stamina: outgoingMember.stamina,
        maxStamina: outgoingMember.maxStamina,
        insight: outgoingMember.insight || 0,
        maxInsight: outgoingMember.maxInsight || 100,
        statusEffects: outgoingMember.statusEffects ? [...outgoingMember.statusEffects] : [],
        spritePortrait: outgoingMember.spritePortrait,
        shackled: !!outgoingMember.shackled,
        sheet: outgoingMember.sheet,
        col: outgoingMember.col,
        row: outgoingMember.row
      };
    } else {
      this.imageTransition.previousPartyMember = null;
    }
  }

  _getValidDecisions() {
    if (!this.model) return [];
    const rawDecisions = this.model.getAvailableDecisions() || [];
    return rawDecisions.filter(decision => EncounterLogic.checkConditions(decision, this.model.context || {}));
  }

  // The mouse moved onto a decision: the keyboard cursor follows it (silent; UIInteractionManager adds the hover tick)
  setFocusFromPointer(hitboxId) {
    if (!hitboxId || !hitboxId.startsWith('DECISION_')) return;
    const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
    if (!isNaN(index)) this.selectedIndex = index;
  }

  // The element the keyboard cursor is on
  getKeyboardFocusId() {
    if (this.actionPhase === 'none') {
      const options = this._getValidDecisions();
      if (options && options.length > 0 && this.selectedIndex < options.length) return `DECISION_${this.selectedIndex}`;
    } else if (this.actionPhase === 'wait_for_roll') {
      return 'BTN_ROLL';
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // PACING AND SKIPPING (see ui/narration.js)
  // ---------------------------------------------------------------------------------------------------------------------

  /** The text on screen now (a typed result message while one is playing, otherwise the stage text). */
  _currentText() {
    return this.actionPhase === 'message' ? this.actionMessage : this.lastText;
  }

  /** How many choices the stage shows. */
  _decisionCount() {
    return this.actionPhase === 'none' ? this._getValidDecisions().length : 0;
  }

  /** Is choice `index` visible enough to be picked? (The renderer fades them in one after another.) */
  _decisionReady(index) {
    if (this.actionPhase !== 'none' || !this.model) return false;
    if (this.skipMessageAnimation) return true;
    if (!this.hasDoneIntro) return false;
    return decisionAlpha(this.textTimer, this._currentText(), index) >= NARRATION.DECISION_READY;
  }

  /** Is there something on screen that is still being revealed (and so can be skipped by holding)? */
  _isSkippable() {
    if (!this.model) return false;
    if (!this.hasDoneIntro) return true;
    switch (this.actionPhase) {
      case 'message': case 'rolling': case 'hold_base': case 'apply_mod': case 'result': case 'reward_delay': case 'ending_delay':
        return true;
      case 'none':
        if (this.skipMessageAnimation) return false;
        return this.textTimer < decisionsDoneTimer(this._currentText(), this._decisionCount());
      default:
        return false;
    }
  }

  /** Is the skip control down? The left button (pressed on the canvas), Enter or Space. */
  _skipControlDown() {
    const input = this.input;
    if (!input) return false;
    if (this._onPrologueButton()) return false;      // a press on the prologue's own button is not a press on the text
    const keys = input.heldKeys;
    return !!(input.isMouseDown || (keys && (keys.has('Enter') || keys.has('NumpadEnter') || keys.has('Space'))));
  }

  /** Is this the opening prologue? It can be skipped altogether (hold the button, or Escape). */
  _isPrologue() {
    return !!this.model && this._encounterId === 'prologue' && this.actionPhase !== 'ending';
  }

  _onPrologueButton() {
    return this._isPrologue() && this.getFocusId() === 'BTN_SKIP_PROLOGUE';
  }

  /** Holding the "skip the prologue" button (or Escape) for PROLOGUE_HOLD seconds ends the encounter at once, as its last stage would. */
  _updatePrologueHold(dt) {
    if (this.prologueHint > 0) this.prologueHint = Math.max(0, this.prologueHint - dt * 1.6);
    if (!this._isPrologue()) { this.prologueHold = 0; return; }
    const input = this.input;
    const keys = input && input.heldKeys;
    const down = !!(input && ((input.isMouseDown && this._onPrologueButton()) || (keys && keys.has('Escape'))));
    if (!down) { this.prologueHold = 0; return; }
    this.prologueHold += dt;
    if (this.prologueHold >= PROLOGUE_HOLD) {
      this.prologueHold = 0;
      this._swallowClick = true;
      this._swallowTimer = 0;
      this.endEncounter(null);
    }
  }

  _updateHold(dt) {
    if (this.hintPulse > 0) this.hintPulse = Math.max(0, this.hintPulse - dt * 1.6);
    const down = this._skipControlDown();

    if (down && !this._wasDown) {          // a fresh press
      this._holdArmed = this._isSkippable() && this.inputCooldown <= 0;
      this.holdTimer = 0;
    }
    if (down && this._holdArmed && this._isSkippable()) {
      this.holdTimer += dt;
      if (this.holdTimer >= NARRATION.HOLD_TO_SKIP) {
        this._skipAhead();
        this.holdTimer = 0;
        this._holdArmed = false;
        this._swallowClick = true;         // the release of this hold is not a click on a choice
        this._swallowTimer = 0;
        this.inputCooldown = 0.2;
      }
    } else if (!down) {
      this.holdTimer = 0;
      this._holdArmed = false;
    } else if (!this._isSkippable()) {
      this.holdTimer = 0;
    }
    this._wasDown = down;

    // A hold that ended outside the canvas never produces a click; do not swallow some later, real one
    if (this._swallowClick && !down) {
      this._swallowTimer += dt;
      if (this._swallowTimer > 0.35) this._swallowClick = false;
    }
  }

  /** What a completed hold does: the first one finishes the words, the next one brings the choices / the story on. */
  _skipAhead() {
    const text = this._currentText();
    const end = textEndTimer(text);

    if (!this.hasDoneIntro && this.textTimer < NARRATION.TEXT_START) {
      this.textTimer = NARRATION.TEXT_START;      // straight into the first words
      this.hasDoneIntro = true;
      return;
    }
    if ((this.actionPhase === 'message' || this.actionPhase === 'none' || this.actionPhase === 'reward_delay') && this.textTimer < end) {
      this.textTimer = end;                        // the words are all there; the story waits for the player to read them
      return;
    }
    this.skipMessageAnimation = true;
    if (this.actionPhase === 'none') this.textTimer = decisionsDoneTimer(text, this._decisionCount());
    else this.textTimer = end + actionPadding(text);
  }

  onClick(hitboxId) {
    if (hitboxId === 'BTN_SKIP_PROLOGUE') { this.claimSfx(); this.prologueHint = 1; return; }     // a click on it only reminds: skipping takes a hold
    // In an encounter a click either does something that makes its own sound or does nothing at all (silent), so
    // UIInteractionManager must not add a second one, not even when the click is ignored.
    this.claimSfx();
    if (!this.model) return;
    if (this._swallowClick) { this._swallowClick = false; return; }   // the release that ends a hold-to-skip
    if (this.inputCooldown > 0) return;

    if (this.actionPhase === 'wait_for_roll') {
      if (hitboxId === 'BTN_ROLL') {
        this.playConfirmSound();
        this.inputCooldown = 0.15;
        this.triggerRoll();
      }
      return;
    }

    if (this.actionPhase === 'none' && hitboxId && hitboxId.startsWith('DECISION_')) {
      const index = parseInt(hitboxId.replace('DECISION_', ''), 10);
      if (!isNaN(index) && this._decisionReady(index)) {
        this.selectedIndex = index;
        this.inputCooldown = 0.4;
        this.executeSelectedDecision();
        return;
      }
    }

    // A click on text that is still appearing (or on a choice that has not appeared yet) hurries it along
    if (this._isSkippable()) this.hintPulse = 1;      // a click never skips: only a hold does
  }

  onRightClick(hitboxId) {
    if (this.scrollManager.isDragging) {
      this.scrollManager.handleDragEnd();
      this.playCancelSound();
      return;
    }
    return false; // nothing to go back to
  }

  onDragStart(hitboxId) {
    if (hitboxId === 'SCROLL_THUMB_DECISIONS' || hitboxId === 'SCROLL_THUMB_TEXT') {
      this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
    }
  }

  onDragMove(x, y) {
    if (this.scrollManager.isDragging) this.scrollManager.handleDragMove(y);
  }

  onDrop(sourceHitboxId, targetHitboxId) {
    if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
  }

  handleScroll(delta) {
    this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 40);
  }

  handleKeyDown(keyCode, e) {
    const intent = this.resolveIntent(keyCode, e); // also hands control to the keyboard
    if (!this.model) return;
    if (this.inputCooldown > 0) return;

    if (this.actionPhase === 'wait_for_roll') {
      if (intent === 'CONFIRM') {
        this.playConfirmSound();
        this.inputCooldown = 0.15;
        this.triggerRoll();
      }
      return;
    }

    if (this.actionPhase !== 'none') {
      if (intent === 'CONFIRM') {
        if (e && e.repeat) return;                                           // a held key is the hold-to-skip, handled in update()
        if (this._isSkippable()) this.hintPulse = 1;
      }
      return;
    }

    const options = this._getValidDecisions();
    if (!options || options.length === 0) {
      if (intent === 'CONFIRM' && !(e && e.repeat) && this._isSkippable()) this.hintPulse = 1;
      return;
    }

    if (intent === 'CANCEL') {
      // Nothing to back out of: only let go of a dragged scrollbar
      if (this.scrollManager.isDragging) {
        this.scrollManager.handleDragEnd();
        this.playCancelSound();
      }
      return;
    }

    // Until the first choice has appeared there is nothing to move through or pick
    if (!this._decisionReady(0)) {
      if (intent === 'CONFIRM' && !(e && e.repeat) && this._isSkippable()) this.hintPulse = 1;
      return;
    }

    const prevIndex = this.selectedIndex;
    if (intent === 'UP') {
      this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
      if (this.selectedIndex !== prevIndex) this.playNavSound();
    } else if (intent === 'DOWN') {
      this.selectedIndex = (this.selectedIndex + 1) % options.length;
      if (this.selectedIndex !== prevIndex) this.playNavSound();
    } else if (intent === 'CONFIRM') {
      if (!this._decisionReady(this.selectedIndex)) { this.hintPulse = 1; return; }
      this.inputCooldown = 0.4;
      this.executeSelectedDecision(); // plays the confirm sound
    }
  }

  executeSelectedDecision() {
    if (this.actionPhase === 'ending' || this.pendingDecision !== null) return;
    const options = this._getValidDecisions();
    if (!options || options.length === 0) return;
    
    this.playConfirmSound();
    const selectedDecision = options[this.selectedIndex];
    
    if (selectedDecision.type === 'switch_character') {
      this.inputCooldown = 0.5;
      events.emit('CHANGE_SCENE', {
        scene: 'party',
        data: {
          mode: 'ENCOUNTER_SELECT',
          activeIndices: [0],
          callback: (chosenIndex) => {
            if (chosenIndex !== null && chosenIndex >= 0 && chosenIndex < gameState.party.members.length) {
              this._triggerImageTransition();
              const party = gameState.party.members;
              const selectedMember = party.splice(chosenIndex, 1)[0];
              party.unshift(selectedMember);
              this.selectedIndex = 0;
            }
          }
        }
      });
    }
    else if (selectedDecision.type === 'open_shop') {
      this.inputCooldown = 0.5;
      let finalWares = selectedDecision.wares || [];
      if (selectedDecision.lootTableId) {
        const rolls = selectedDecision.rolls || 5;
        const lootModel = LootTableFactory.generateLoot(selectedDecision.lootTableId, rolls);
        if (lootModel.hasItems()) {
          const dynamicWares = lootModel.items.map(item => ({ id: item.id, qty: item.qty }));
          finalWares = [...finalWares, ...dynamicWares];
        }
      }
      events.emit('OPEN_SHOP', {
        shopId: selectedDecision.shopId,
        wares: finalWares,
        returnScene: 'encounter',
        encounterInstanceId: this.model.instanceId,
        callback: () => {
          this.inputCooldown = 0.5;
          this.updateBGM();
        }
      });
    } else {
      this.beginActionSequence(selectedDecision);
    }
  }

  triggerRoll() {
    this.actionPhase = 'rolling';
    this.rollTimer = this.rollData.duration;
    this.rollTickTimer = 0;
    events.emit('PLAY_SFX', { id: 'dice_throw', volume: 0.8 });
  }

  beginActionSequence(decision) {
    if (!decision) return;
    this.pendingDecision = decision;
    
    const decisionBgm = decision.bgm || (decision.outcomes && decision.outcomes[0] && decision.outcomes[0].bgm);
    if (decisionBgm) {
      events.emit('PLAY_MUSIC', { id: EncounterLogic.resolveBattleBgm(decisionBgm, this.worldManager), fadeTime: 0.5 });
    }
    
    if (decision.image) {
      this._triggerImageTransition(0.4);
      if (this.model && this.model.getImage) {
        this.model._originalGetImage = this.model.getImage;
        const currentImage = this.model._originalGetImage.call(this.model);
        const baseSheet = currentImage ? currentImage.sheet : this.model.imageSheet;
        this.model.getImage = () => {
          return { sheet: decision.image.sheet || baseSheet, col: decision.image.col, row: decision.image.row };
        };
      }
    }
    
    if (decision.type !== 'skill_check') {
      this.executeLogic();
    }
    
    const actorName = gameState.party?.members?.[0]?.name || "The party";
    if (decision.customActionText) {
      this.actionPhase = 'message';
      this.textTimer = STAGE_START_TIMER;
      this.hasDoneIntro = true;
      this.skipMessageAnimation = false;
      this.actionMessage = this._fillNames(decision.customActionText, actorName);
      this.lastText = this.actionMessage;
    } else {
      if (decision.type === 'skill_check') {
        this.rollData = EncounterLogic.calculateRoll(this.pendingDecision);
        this.actionPhase = 'wait_for_roll';
      } else {
        this.applySceneChanges();
      }
    }
  }

  /* {name} is the leader; {betrayer} is the shackled member a betrayal encounter is about (it is in the encounter's context from the moment it starts). */
  _fillNames(text, actorName) {
    return String(text)
      .replace(/{name}/g, actorName)
      .replace(/{betrayer}/g, this.model?.context?.betrayerName || 'The shackled one');
  }

  executeLogic() {
    const decision = this.pendingDecision;
    if (!decision) return;
    
    let targetOutcomes = decision.outcomes;
    if (decision.type === 'skill_check') {
      events.emit('PLAY_SFX', { id: this.rollData.isSuccess ? 'skill_success' : 'skill_failure', volume: 0.7 });
      this.model.updateContext({
        roll_stat: decision.attribute?.toUpperCase() || "UNKNOWN",
        roll_d20: this.rollData.d20,
        roll_mod: this.rollData.mod,
        roll_total: this.rollData.total,
        roll_dc: this.rollData.dc,
        roll_result: this.rollData.isSuccess ? "SUCCESS" : "FAILED"
      });
      targetOutcomes = this.rollData.isSuccess ? decision.successOutcomes : decision.failureOutcomes;
    }
    
    const selectedOutcome = EncounterLogic.selectOutcome(targetOutcomes);
    if (selectedOutcome) {
      let resultsArray = selectedOutcome.results;
      // A decision can carry `corruption: n` (magic used, a cruel act: positive; a kind one: negative): it applies whichever way the outcome falls
      if (decision.corruption && resultsArray) {
        resultsArray = [{ type: 'MODIFY_CORRUPTION', payload: { amount: decision.corruption, target: 'active_character' } }, ...resultsArray];
      }
      let isStartingBattle = false;
      let isGameOverTriggered = false;
      
      if (resultsArray) {
        for (const r of resultsArray) {
          if (r.type === 'START_BATTLE') isStartingBattle = true;
          if (r.type === 'TRIGGER_GAME_OVER') isGameOverTriggered = true;
        }
      }
      
      const logicResponse = EncounterLogic.resolveResults(resultsArray, this.model, this.worldManager);
      this.pendingLogicResponse = { response: logicResponse, isStartingBattle, isGameOverTriggered };
    }
  }

  applySceneChanges() {
    this.actionPhase = 'none';
    this.pendingDecision = null;
    if (!this.pendingLogicResponse) return;
    
    const { response: logicResponse, isStartingBattle, isGameOverTriggered } = this.pendingLogicResponse;
    this.pendingLogicResponse = null;
    
    if (isGameOverTriggered) {
      this.actionPhase = 'ending';
      events.emit('CHANGE_SCENE', { scene: 'game_over' });
      return;
    }
    
    const party = gameState.party.members;
    const nextLivingIndex = party.findIndex(m => m.hp > 0);
    const isTotalWipe = logicResponse.isGameOver || (logicResponse.forceCharacterSwitch && nextLivingIndex === -1);
    
    if (isTotalWipe) {
      this._triggerImageTransition(2.0);
      const deathMsg = "Game over, all party members have been slain!";
      const fullText = logicResponse.messages.length > 0 ? logicResponse.messages.join('\n\n') + '\n\n' + deathMsg : deathMsg;
      this.model.stages = this.model.stages || {};
      this.model.stages["game_over_stage"] = {
        displayText: "Defeat",
        image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
        text: fullText,
        decisions: [{ text: "Accept your fate.", outcomes: [{ weight: 100, results: [{ type: "TRIGGER_GAME_OVER" }] }] }]
      };
      this.model.advanceToStage("game_over_stage");
      this.selectedIndex = 0;
      return;
    }
    
    if (logicResponse.forceCharacterSwitch) {
      this._triggerImageTransition();
      if (nextLivingIndex > 0) {
        const deadMember = party[0];
        const selectedMember = party.splice(nextLivingIndex, 1)[0];
        party.unshift(selectedMember);
        this.selectedIndex = 0;
        logicResponse.messages.unshift(`${deadMember.name} has fallen! ${selectedMember.name} steps up.`);
      }
    }
    
    if (logicResponse.isOpeningShop) {
      this.actionPhase = 'ending';
      events.emit('OPEN_SHOP', {
        shopId: logicResponse.shopId,
        wares: logicResponse.wares || [],
        returnScene: logicResponse.returnScene || 'encounter',
        encounterInstanceId: logicResponse.encounterInstanceId
      });
      return;
    }
    
    const hasMessages = logicResponse.messages.length > 0 && !isStartingBattle;

    // Mid-encounter rewards: show the gain messages on the CURRENT stage first,
    // then move on to the destination stage/model once the player has read them.
    if (hasMessages && !logicResponse.shouldEndEncounter) {
      if (logicResponse.modelChanged) {
        this.pendingSceneChange = { type: 'model', model: logicResponse.newModel };
      } else if (logicResponse.stageChanged) {
        this.pendingSceneChange = { type: 'stage', stageId: logicResponse.newStageId };
      } else {
        this.pendingSceneChange = null;
      }
      this.rewardReturnStageId = this.model.currentStageId || null;
      this.rewardsEndEncounter = false;
      this.rewardQueue = [...logicResponse.messages];
      this.rewardItemsByMessage = logicResponse.messageItems || {};
      this.showNextReward();
      return;
    }

    if (logicResponse.modelChanged) {
      if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
      this.model = logicResponse.newModel;
      this.selectedIndex = 0;
      this.updateBGM();
    } else if (logicResponse.stageChanged) {
      if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
      this.model.advanceToStage(logicResponse.newStageId);
      this.selectedIndex = 0;
      this.updateBGM();
    }

    if (hasMessages && logicResponse.shouldEndEncounter) {
      this.rewardQueue = [...logicResponse.messages];
      this.rewardItemsByMessage = logicResponse.messageItems || {};
      this.pendingEndEncounterPayload = logicResponse.endEncounterPayload;
      this.rewardsEndEncounter = true;
      this.pendingSceneChange = null;
      if (!logicResponse.forceCharacterSwitch) this._triggerImageTransition();
      this.showNextReward();
      return;
    }

    if (isStartingBattle) {
      this.actionPhase = 'ending';
    } else if (logicResponse.shouldEndEncounter) {
      this.endEncounter(logicResponse.endEncounterPayload);
    }
  }

  showNextReward() {
    if (!this.rewardQueue || this.rewardQueue.length === 0) {
      this.currentRewardItems = null;
      if (this.rewardsEndEncounter) {
        this.endEncounter(this.pendingEndEncounterPayload);
      } else {
        this._finishMidEncounterRewards();
      }
      return;
    }
    
    const nextMsg = this.rewardQueue.shift();
    this.currentRewardItems = this.rewardItemsByMessage[nextMsg] || null;
    this.model.stages = this.model.stages || {};
    this.model.stages["encounter_rewards_stage"] = {
      displayText: this.rewardsEndEncounter ? "Victory" : "Spoils",
      image: this.model.getImage ? this.model.getImage() : { sheet: 'bg_default_black', col: 0, row: 0 },
      text: nextMsg,
      decisions: []
    };
    this.model.advanceToStage("encounter_rewards_stage");
    this.selectedIndex = 0;
    this.actionPhase = 'reward_delay';
    // The message is told word by word, then stays up a while so it can be read (and the item pictures, if it has any, seen)
    this.rollTimer = NARRATION.BEAT + narrationPlan(nextMsg).duration + 3.0 + (this.currentRewardItems ? 1.5 : 0);
    this.lastText = "";
    this.textTimer = STAGE_START_TIMER;
    this.skipMessageAnimation = false;
  }

  _finishMidEncounterRewards() {
    const change = this.pendingSceneChange;
    const returnStageId = this.rewardReturnStageId;
    this.pendingSceneChange = null;
    this.rewardReturnStageId = null;

    if (change && change.type === 'model') {
      this._triggerImageTransition();
      this.model = change.model;
    } else if (change && change.type === 'stage') {
      this._triggerImageTransition();
      this.model.advanceToStage(change.stageId);
    } else if (returnStageId) {
      // No stage change: go back to the stage the player acted from.
      this.model.advanceToStage(returnStageId);
    }

    this.selectedIndex = 0;
    this.actionPhase = 'none';
    this.lastText = "";
    this.textTimer = STAGE_START_TIMER;
    this.skipMessageAnimation = false;
    this.inputCooldown = 0.15;
    this.updateBGM();
  }

  endEncounter(payload = null) {
    this.actionPhase = 'ending';
    events.emit('CHANGE_SCENE', { scene: 'overworld', data: payload });
  }

  cleanup() {
    this.model = null;
    this.pendingDecision = null;
    this.rewardQueue = [];
    this.rewardItemsByMessage = {};   // reward message text -> [{id, qty}] (pictures of the items it lists)
    this.currentRewardItems = null;   // the items of the reward message on screen
    this.pendingSceneChange = null;
    this.rewardReturnStageId = null;
    this.rewardsEndEncounter = false;
  }

  updateBGM() {
    if (!this.model) return;
    const targetBGM = this.model.getBgm ? this.model.getBgm() : null;
    if (targetBGM === 'none') {
      events.emit('STOP_MUSIC', { fadeTime: 0.15 });      // a stage may call for silence
    } else if (targetBGM) {
      events.emit('PLAY_MUSIC', { id: EncounterLogic.resolveBattleBgm(targetBGM, this.worldManager), fadeTime: 1.0 });
    }
  }

  /**
   * Optional sound cues of a stage (stage.sfx = a one-off sound, stage.ambience = a looping bed, 'none' stops the current one). The
   * ambience may also be set once for the whole encounter (definition.ambience), and starts with it. Both are played when the stage opens,
   * and not on the frame the scene changes, because SceneManager stops the ambience as a scene opens. A stage's sound waits for the same
   * moment as its screen effect (STAGE_START_TIMER), which is the opening of the encounter's first screen too.
   */
  _playStageCues() {
    if (!this.model || !this.model.getCurrentStage) return;
    const key = `${this.model.instanceId}:${this.model.currentStageId}`;
    const stage = this.model.getCurrentStage();
    if (!stage) return;
    if (this._cueKey !== key) {
      const firstStage = this._cueKey === null || !String(this._cueKey).startsWith(`${this.model.instanceId}:`);
      this._cueKey = key;
      this._sfxPending = true;
      const ambience = stage.ambience !== undefined ? stage.ambience : (firstStage ? this.model.ambience : undefined);
      if (ambience === 'none') events.emit('STOP_AMBIENCE', { fadeTime: stage.ambienceFade ?? 2.0 });
      else if (ambience) events.emit('PLAY_AMBIENCE', { id: ambience, fadeTime: stage.ambienceFade ?? 3.0 });
    }
    if (this._sfxPending && this.textTimer >= STAGE_START_TIMER) {
      this._sfxPending = false;
      if (stage.sfx) events.emit('PLAY_SFX', { id: stage.sfx, volume: stage.sfxVolume ?? 1.0 });
    }
  }

  getState() {
    const currentIntroAlpha = this.hasDoneIntro ? 1.0 : Math.max(0, Math.min(1, (this.textTimer - 0.6) / 1.8));
    // One highlight: the hovered element in mouse mode, the keyboard cursor in keyboard mode
    const virtualHoverId = this.getFocusId();
    
    const basePayload = {
      imageInfo: null,
      transition: {
        active: this.imageTransition.active,
        progress: Math.min(1.0, this.imageTransition.timer / this.imageTransition.duration),
        previousImageInfo: this.imageTransition.previousInfo,
        previousPartyMember: this.imageTransition.previousPartyMember
      },
      title: "",
      text: "",
      decisions: [],
      ui: { selectedDecisionIndex: this.selectedIndex, introAlpha: currentIntroAlpha },
      party: this._shownMembers(),
      currency: gameState.party?.currency || 0,
      skipMessageAnimation: this.skipMessageAnimation,
      textTimer: this.textTimer,
      stageTone: (this.model.getCurrentStage && this.model.getCurrentStage()?.tone) || this.model.tone || null,
      stageEffect: (this.actionPhase === 'none' && this.model.getCurrentStage && this.model.getCurrentStage()?.effect) || null,
      hasDoneIntro: this.hasDoneIntro,
      canSkip: this._isSkippable(),
      prologueSkip: this._isPrologue() ? { progress: Math.min(1, this.prologueHold / PROLOGUE_HOLD), pulse: this.prologueHint } : null,
      holdProgress: Math.min(1, this.holdTimer / NARRATION.HOLD_TO_SKIP),
      hintPulse: this.hintPulse,
      actionPhase: this.actionPhase,
      rollTimer: this.rollTimer,
      rollData: this.rollData,
      mouse: this.mouse,
      hoveredElement: virtualHoverId ? { id: virtualHoverId } : null,
      isUsingKeyboard: this.inputMode === 'keyboard',
      scrollOffsets: {
        decisions: this.scrollManager.getOffset('decision_list'),
        text: this.scrollManager.getOffset('text_content')
      },
      onLayoutUpdate: (hitboxes, scrollBounds) => {
        this.updateHitboxes(hitboxes);
        if (scrollBounds) {
          if (scrollBounds.decisions) {
            this.scrollManager.registerZone('decision_list', scrollBounds.decisions);
          }
          if (scrollBounds.text) {
            this.scrollManager.registerZone('text_content', scrollBounds.text);
          }
        }
      }
    };
    
    if (!this.model) return basePayload;
    
    let displayText = this.model.getCurrentText() || "";
    let displayDecisions = this._getValidDecisions();
    let displayStageName = this.model.getStageDisplayText ? this.model.getStageDisplayText() : "Unknown Stage";
    const actorName = gameState.party?.members?.[0]?.name || "The party";
    
    displayText = this._fillNames(displayText, actorName);
    displayStageName = this._fillNames(displayStageName, actorName);
    displayDecisions = displayDecisions.map(decision => ({
      ...decision,
      text: this._fillNames(decision.text, actorName)
    }));
    
    if (this.actionPhase !== 'none' && this.actionPhase !== 'ending_delay' && this.actionPhase !== 'reward_delay') {
      displayText = this.actionPhase === 'ending' ? this.lastText : this.actionMessage;
      displayDecisions = [];
    }
    
    if (this.lastText !== displayText) {
      const isFirstText = this.lastText === "";
      this.lastText = displayText;
      if (!isFirstText) {
        this.textTimer = STAGE_START_TIMER;
      }
      this.skipMessageAnimation = false;
    }
    
    let currentImage = this.model.getImage ? this.model.getImage() : null;
    
    return {
      ...basePayload,
      textTimer: this.textTimer,
      skipMessageAnimation: this.skipMessageAnimation,
      title: this.model.title || "Unknown Encounter",
      stageName: displayStageName,
      imageInfo: currentImage,
      text: displayText,
      decisions: displayDecisions,
      rewardItems: (this.actionPhase === 'reward_delay' && this.currentRewardItems) ? this.currentRewardItems : null,
      ui: { selectedDecisionIndex: this.selectedIndex, introAlpha: currentIntroAlpha }
    };
  }
}
import { BaseController } from '../core/baseController.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { events } from '../../core/eventBus.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { QuestDefinitions } from '../../../../shared/data/questDefinitions.js';
import { QuestModel } from '../../../../shared/models/questModel.js';
import { ScrollManager } from '../../ui/scrollManager.js';

export class JournalController extends BaseController {
    constructor(input) {
        super(input);
        this.activeTab = 'active';
        this.selectedQuestId = null;
        this.screenWidth = 1920;
        this.screenHeight = 1080;

        this.layout = {
            p: 48, startY: 48, tabHeight: 60,
            rowHeight: 84, btnWidth: 216, btnHeight: 84
        };

        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('questList', { viewportH: 700, maxScroll: 0 });

        // The journal key (P) closes the journal, like Esc
        this.extraBindings = { KeyP: 'CANCEL' };

        this.activeSection = 'TABS'; // Start on tabs by default
        this.focusedTabIndex = 0; // 0: active, 1: completed
        this.availableActions = [];
        this.focusedActionIndex = 0;

        this.updateHitboxes([]);
    }

    init() {
        this.activeTab = 'active';
        this.startInKeyboardMode(); // opens with the keyboard cursor on the tabs
        this.activeSection = 'TABS';
        this.focusedTabIndex = 0;
        this.focusedActionIndex = 0;
        this.scrollManager.resetAllScrolls();
        
        // NO DEFAULT SELECTION on init
        this.selectedQuestId = null; 
        console.log("[JournalController] Initialized");
    }

    update(dt) {
        this.scrollManager.update(dt);
    }

    _getCurrentQuestList() {
        return this.activeTab === 'active' ? Object.keys(gameState.quests.active) : gameState.quests.completed;
    }

    // ========================================================
    // FOCUS (shared standard, see BaseController)
    // ========================================================
    // The mouse moved onto something (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        this._setFocus(hitboxId);
    }

    // The element the keyboard cursor is on
    getKeyboardFocusId() {
        if (this.activeSection === 'TABS') {
            return this.focusedTabIndex === 0 ? 'tab_active' : 'tab_completed';
        }
        if (this.activeSection === 'LIST') {
            return this.selectedQuestId ? `quest_sel_${this.selectedQuestId}` : null;
        }
        if (this.activeSection === 'ACTIONS') {
            if (this.availableActions[this.focusedActionIndex]) return this.availableActions[this.focusedActionIndex].id;
            // Fallback to LIST if no actions are strictly confirmed as visible
            this.activeSection = 'LIST';
            return this.selectedQuestId ? `quest_sel_${this.selectedQuestId}` : null;
        }
        return null;
    }

    _switchTab(tab) {
        this.activeTab = tab;
        this.scrollManager.setOffset('questList', 0, true);
        this.selectedQuestId = null; // Clear selection on tab switch
    }

    _setFocus(hitboxId) {
        if (!hitboxId) return;
        
        if (hitboxId.startsWith('tab_')) {
            this.activeSection = 'TABS';
            this.focusedTabIndex = hitboxId === 'tab_active' ? 0 : 1;
        } else if (hitboxId.startsWith('quest_sel_')) {
            this.activeSection = 'LIST';
            // Do NOT lock selection here for mouse hover, just set active section
        } else if (hitboxId.startsWith('btn_collect_') || hitboxId.startsWith('btn_track_')) {
            this.activeSection = 'ACTIONS';
            const index = this.availableActions.findIndex(a => a.id === hitboxId);
            this.focusedActionIndex = index > -1 ? index : 0;
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        if (!hitboxId) return;

        if (!fromKeyboard) this._setFocus(hitboxId);

        if (hitboxId === 'tab_active') {
            this.playConfirmSound();
            this._switchTab('active');
        } else if (hitboxId === 'tab_completed') {
            this.playConfirmSound();
            this._switchTab('completed');
        } else if (hitboxId === 'btn_close') {
            this.exit();
        } else if (hitboxId.startsWith('quest_sel_')) {
            this.playConfirmSound();
            this.selectedQuestId = hitboxId.replace('quest_sel_', '');
        } else if (hitboxId.startsWith('btn_collect_')) {
            const questId = hitboxId.replace('btn_collect_', '');
            this.collectRewards(questId);
        } else if (hitboxId.startsWith('btn_track_')) {
            this.playConfirmSound();
            const questId = hitboxId.replace('btn_track_', '');
            
            if (!gameState.quests.trackedIds) {
                gameState.quests.trackedIds = [];
            }
            const index = gameState.quests.trackedIds.indexOf(questId);
            if (index > -1) {
                gameState.quests.trackedIds.splice(index, 1);
            } else {
                if (gameState.quests.trackedIds.length >= 3) {
                    gameState.quests.trackedIds.shift();
                }
                gameState.quests.trackedIds.push(questId);
            }
        }
    }

    onRightClick() {
        this.exit();
    }

    handleKeyDown(code, e) {
        const intent = this.resolveIntent(code, e);
        if (!intent) return;
        this.handleNavigatingKeys(intent);
    }

    handleNavigatingKeys(intent) {
        const quests = this._getCurrentQuestList();
        const currentListIndex = quests.indexOf(this.selectedQuestId);

        if (intent === 'CANCEL') {
            this.exit();
            return;
        }

        // --- 1. TABS SECTION ---
        if (this.activeSection === 'TABS') {
            if (intent === 'LEFT' || intent === 'RIGHT') {
                this.focusedTabIndex = this.focusedTabIndex === 0 ? 1 : 0;
                this._switchTab(this.focusedTabIndex === 0 ? 'active' : 'completed');
                this.playNavSound();
            } else if (intent === 'DOWN' || intent === 'CONFIRM') {
                if (quests.length > 0) {
                    this.activeSection = 'LIST';
                    // Auto-select first when entering via keyboard to establish focus
                    this.selectedQuestId = quests[0]; 
                    this._scrollToSelected(0);
                    this.playNavSound();
                }
            }

        // --- 2. LIST SECTION ---
        } else if (this.activeSection === 'LIST') {
            if (intent === 'UP') {
                if (currentListIndex > 0) {
                    this.selectedQuestId = quests[currentListIndex - 1];
                    this._scrollToSelected(currentListIndex - 1);
                    this.playNavSound();
                } else {
                    // Go up back to Tab bar
                    this.activeSection = 'TABS';
                    this.focusedTabIndex = this.activeTab === 'active' ? 0 : 1;
                    this.playNavSound();
                }
            } else if (intent === 'DOWN') {
                if (currentListIndex < quests.length - 1) {
                    this.selectedQuestId = quests[currentListIndex + 1];
                    this._scrollToSelected(currentListIndex + 1);
                    this.playNavSound();
                }
            } else if (intent === 'RIGHT' || intent === 'CONFIRM') {
                // Strictly guard switching to actions: Only allow if actions are confirmed rendered for the active quest
                if (this.availableActions.length > 0 && this.activeTab === 'active' && this.selectedQuestId) {
                    this.activeSection = 'ACTIONS';
                    this.focusedActionIndex = 0;
                    this.playNavSound();
                }
            }

        // --- 3. ACTIONS SECTION ---
        } else if (this.activeSection === 'ACTIONS') {
            if (intent === 'LEFT') {
                this.activeSection = 'LIST';
                this.playNavSound();
            } else if (intent === 'UP') {
                if (this.focusedActionIndex > 0) {
                    this.focusedActionIndex--;
                    this.playNavSound();
                } else {
                    this.activeSection = 'LIST';
                    this.playNavSound();
                }
            } else if (intent === 'DOWN') {
                if (this.focusedActionIndex < this.availableActions.length - 1) {
                    this.focusedActionIndex++;
                    this.playNavSound();
                }
            } else if (intent === 'CONFIRM') {
                const action = this.availableActions[this.focusedActionIndex];
                if (action) {
                    this.onClick(action.id, true);
                }
            }
        }
    }

    _scrollToSelected(index) {
        const { rowHeight } = this.layout;
        const itemY = index * rowHeight;
        
        const zone = this.scrollManager.zones.get('questList');
        if (!zone) return;
        
        const offset = zone.offset;
        const viewportH = zone.viewportH;
        
        if (itemY < offset) {
            this.scrollManager.setOffset('questList', itemY, true);
        } else if (itemY + rowHeight > offset + viewportH) {
            this.scrollManager.setOffset('questList', itemY + rowHeight - viewportH, true);
        }
    }

    // SceneManager calls handleScroll(delta) (+-30 per wheel notch). The old (deltaX, deltaY, mouseX, mouseY) signature never matched, so the wheel did nothing.
    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 2);
    }

    collectRewards(questId) {
        const success = QuestModel.completeQuest(gameState, questId);
        if (!success) {
            this.playErrorSound();
            return;
        }
        this.playSfx(UI_SFX.success, 0.8);

        if (gameState.quests.trackedIds) {
            const index = gameState.quests.trackedIds.indexOf(questId);
            if (index > -1) gameState.quests.trackedIds.splice(index, 1);
        }

        if (this.activeTab === 'active') {
            this.selectedQuestId = null; // Clear selection after collect
            this.activeSection = 'LIST';
        }
    }

    exit() {
        this.playCancelSound();
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    getState() {
        const hitboxes = [];
        this.availableActions = [];
        
        const { p, startY, tabHeight, rowHeight, btnWidth, btnHeight } = this.layout;
        const panelHeight = this.screenHeight - (startY * 2);
        
        const halfW = Math.floor(this.screenWidth / 2);
        const colW = halfW - (p * 1.5);
        const leftColX = p;
        const rightColX = halfW + (p * 0.5);

        // --- PREVIEW LOGIC ---
        let displayQuestId = this.selectedQuestId;
        if (this.inputMode === 'mouse' && this.hoveredHitboxId && this.hoveredHitboxId.startsWith('quest_sel_')) {
            displayQuestId = this.hoveredHitboxId.replace('quest_sel_', '');
        }

        // 1. Close Button
        hitboxes.push({ id: 'btn_close', x: this.screenWidth - 150, y: 20, w: 120, h: 40, zIndex: 10 });

        // 2. Tabs
        const tabW = (colW / 2) - 24;
        const tabY = startY + 24;
        hitboxes.push({ id: 'tab_active', x: leftColX + 16, y: tabY, w: tabW, h: tabHeight, zIndex: 10 });
        hitboxes.push({ id: 'tab_completed', x: leftColX + 16 + tabW + 16, y: tabY, w: tabW, h: tabHeight, zIndex: 10 });

        // 3. Quest List
        const listYBase = tabY + tabHeight + 32;
        const scrollOffset = this.scrollManager.getOffset('questList');
        const listHeight = panelHeight - (listYBase - startY) - 24;
        let currentY = 0;
        const quests = this._getCurrentQuestList();
        
        quests.forEach(qId => {
            const yPos = listYBase + currentY - scrollOffset;
            if (yPos >= listYBase - rowHeight && yPos <= listYBase + listHeight) {
                hitboxes.push({
                    id: `quest_sel_${qId}`,
                    x: leftColX + 16, y: yPos, w: colW - 48, h: rowHeight - 8,
                    zIndex: 10
                });
            }
            currentY += rowHeight;
        });

        this.scrollManager.zones.get('questList').maxScroll = Math.max(0, currentY - listHeight);
        this.scrollManager.zones.get('questList').bounds = { x: leftColX, y: listYBase, w: colW, h: listHeight };

        // 4. Action Buttons (Only render if the previewed quest is securely locked as selected)
        if (this.selectedQuestId && displayQuestId === this.selectedQuestId && this.activeTab === 'active') {
            const isComplete = QuestModel.checkCompletion(gameState, this.selectedQuestId);
            const btnX = rightColX + (colW / 2) - (btnWidth / 2);
            const btnY = startY + panelHeight - btnHeight - 32;

            if (isComplete) {
                const collectBtn = { id: `btn_collect_${this.selectedQuestId}`, x: btnX, y: btnY, w: btnWidth, h: btnHeight, zIndex: 10 };
                hitboxes.push(collectBtn);
                this.availableActions.push(collectBtn);
            } else {
                const trackBtn = { id: `btn_track_${this.selectedQuestId}`, x: btnX, y: btnY, w: btnWidth, h: btnHeight, zIndex: 10 };
                hitboxes.push(trackBtn);
                this.availableActions.push(trackBtn);
            }
        }

        this.updateHitboxes(hitboxes);

        // One highlighted element: the hovered one in mouse mode, the keyboard cursor in keyboard mode
        const virtualHoverId = this.getFocusId();

        return {
            activeTab: this.activeTab,
            selectedQuestId: this.selectedQuestId,
            displayQuestId: displayQuestId, 
            hitboxes: this.getHitboxes(),
            hoveredHitboxId: virtualHoverId,
            quests: gameState.quests,
            definitions: QuestDefinitions,
            scrollOffset: scrollOffset,
            layout: this.layout,
            trackedIds: gameState.quests.trackedIds || []
        };
    }
}
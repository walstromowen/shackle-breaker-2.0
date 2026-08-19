import { BaseController } from '../core/baseController.js'; 
import { events } from '../../core/eventBus.js'; 
import { gameState } from '../../../../shared/state/gameState.js'; 
import { QuestDefinitions } from '../../../../shared/data/questDefinitions.js'; 
import { QuestModel } from '../../../../shared/models/questModel.js'; 
import { ScrollManager } from '../../ui/scrollManager.js'; 

const KEY_BINDINGS = { 
    'ArrowUp': 'UP', 'KeyW': 'UP', 
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN', 
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT', 
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT', 
    'Enter': 'CONFIRM', 'Space': 'CONFIRM', 
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 
    'KeyP': 'CANCEL', 'Tab': 'CANCEL' 
}; 

export class JournalController extends BaseController { 
    constructor(input) { 
        super(input); 
        this.activeTab = 'active'; 
        this.selectedQuestId = null; 
        
        this.screenWidth = 1920; 
        this.screenHeight = 1080; 
        
        this.layout = { p: 48, startY: 48, tabHeight: 60, rowHeight: 84, btnWidth: 216, btnHeight: 84 }; 
        this.scrollManager = new ScrollManager(); 
        this.scrollManager.registerZone('questList', { viewportH: 700, maxScroll: 0 }); 

        // --- KEYBOARD NAVIGATION STATE --- 
        this.isUsingKeyboard = false; 
        this.activeSection = 'TABS'; // Start on tabs by default
        this.focusedTabIndex = 0; // 0: active, 1: completed 
        this.availableActions = []; 
        this.focusedActionIndex = 0; 
        this.updateHitboxes([]); 
    } 

    init() { 
        this.activeTab = 'active'; 
        this.isUsingKeyboard = true; // Set to true on open so keyboard works immediately
        this.activeSection = 'TABS'; 
        this.focusedTabIndex = 0;
        this.focusedActionIndex = 0;
        this.scrollManager.resetAllScrolls(); 
        this._autoSelectFirst(); 
        console.log("[JournalController] Initialized"); 
    } 

    update(dt) { 
        this.scrollManager.update(dt); 
    } 

    _autoSelectFirst() { 
        const list = this._getCurrentQuestList(); 
        if (list.length > 0) { 
            this.selectedQuestId = list[0]; 
        } else { 
            this.selectedQuestId = null; 
        } 
    } 

    _getCurrentQuestList() { 
        return this.activeTab === 'active' ? Object.keys(gameState.quests.active) : gameState.quests.completed; 
    } 

    playNavSound() { 
        if (super.playNavSound) super.playNavSound(); 
        else events.emit('PLAY_SFX', { id: 'hover', volume: 0.4 }); 
    } 

    playClickSound() { 
        if (super.playClickSound) super.playClickSound(); 
        else events.emit('PLAY_SFX', { id: 'click', volume: 0.6 }); 
    } 

    playCancelSound() { 
        if (super.playCancelSound) super.playCancelSound(); 
        else events.emit('PLAY_SFX', { id: 'cancel', volume: 0.6 }); 
    } 

    handleMouseMove(x, y, isMouseDown, renderer) { 
        const prevHoverId = this.hoveredHitboxId; 
        super.handleMouseMove(x, y, isMouseDown, renderer); 
        
        // Only switch to mouse mode if mouse actively moves to a new element
        if (this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) { 
            this.isUsingKeyboard = false;
            this._setFocus(this.hoveredHitboxId); 
        } 
    } 

    _setFocus(hitboxId) { 
        if (!hitboxId) return; 
        if (hitboxId.startsWith('tab_')) { 
            this.activeSection = 'TABS'; 
            this.focusedTabIndex = hitboxId === 'tab_active' ? 0 : 1; 
        } else if (hitboxId.startsWith('quest_sel_')) { 
            this.activeSection = 'LIST'; 
            this.selectedQuestId = hitboxId.replace('quest_sel_', ''); 
        } else if (hitboxId.startsWith('btn_collect_') || hitboxId.startsWith('btn_track_')) { 
            this.activeSection = 'ACTIONS'; 
            const index = this.availableActions.findIndex(a => a.id === hitboxId); 
            this.focusedActionIndex = index > -1 ? index : 0; 
        } 
    } 

    onClick(hitboxId, fromKeyboard = false) { 
        if (!hitboxId) return; 
        if (!fromKeyboard) { 
            this._setFocus(hitboxId); 
            this.isUsingKeyboard = false; 
        } 

        if (hitboxId === 'tab_active') { 
            this.playClickSound(); 
            this.activeTab = 'active'; 
            this.scrollManager.setOffset('questList', 0, true); 
            this._autoSelectFirst(); 
        } else if (hitboxId === 'tab_completed') { 
            this.playClickSound(); 
            this.activeTab = 'completed'; 
            this.scrollManager.setOffset('questList', 0, true); 
            this._autoSelectFirst(); 
        } else if (hitboxId === 'btn_close') { 
            this.exit(); 
        } else if (hitboxId.startsWith('quest_sel_')) { 
            this.playClickSound(); 
            this.selectedQuestId = hitboxId.replace('quest_sel_', ''); 
        } else if (hitboxId.startsWith('btn_collect_')) { 
            const questId = hitboxId.replace('btn_collect_', ''); 
            this.collectRewards(questId); 
        } else if (hitboxId.startsWith('btn_track_')) { 
            this.playClickSound(); 
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
        this.isUsingKeyboard = true; 
        const intent = (e && KEY_BINDINGS[e.code]) || KEY_BINDINGS[code]; 
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
                const targetTab = this.focusedTabIndex === 0 ? 'tab_active' : 'tab_completed';
                this.onClick(targetTab, true); 
                this.playNavSound(); 
            } else if (intent === 'DOWN' || intent === 'CONFIRM') { 
                if (quests.length > 0) {
                    this.activeSection = 'LIST'; 
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
            } else if (intent === 'RIGHT') { 
                // Only allow switching right if an action button exists
                if (this.availableActions.length > 0) { 
                    this.activeSection = 'ACTIONS'; 
                    this.focusedActionIndex = 0; 
                    this.playNavSound(); 
                } 
            } else if (intent === 'LEFT') {
                // Return focus to Tabs
                this.activeSection = 'TABS';
                this.focusedTabIndex = this.activeTab === 'active' ? 0 : 1;
                this.playNavSound();
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

    handleScroll(deltaX, deltaY, mouseX, mouseY) { 
        this.isUsingKeyboard = false; 
        this.scrollManager.handleScrollWheel(mouseX, mouseY, deltaY); 
    } 

    collectRewards(questId) { 
        const success = QuestModel.completeQuest(gameState, questId); 
        if (success) { 
            events.emit('PLAY_SFX', { id: 'quest_complete', volume: 0.8 }); 
            if (gameState.quests.trackedIds) { 
                const index = gameState.quests.trackedIds.indexOf(questId); 
                if (index > -1) gameState.quests.trackedIds.splice(index, 1); 
            } 
            if (this.activeTab === 'active') { 
                this._autoSelectFirst(); 
                this.activeSection = 'LIST'; 
            } 
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
                hitboxes.push({ id: `quest_sel_${qId}`, x: leftColX + 16, y: yPos, w: colW - 48, h: rowHeight - 8, zIndex: 10 }); 
            } 
            currentY += rowHeight; 
        }); 

        this.scrollManager.zones.get('questList').maxScroll = Math.max(0, currentY - listHeight); 
        this.scrollManager.zones.get('questList').bounds = { x: leftColX, y: listYBase, w: colW, h: listHeight }; 

        // 4. Action Buttons
        if (this.selectedQuestId && this.activeTab === 'active') { 
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

        // --- Determine Active Hover Highlight for Keyboard --- 
        let virtualHoverId = this.hoveredHitboxId; 
        if (this.isUsingKeyboard) { 
            if (this.activeSection === 'TABS') { 
                virtualHoverId = this.focusedTabIndex === 0 ? 'tab_active' : 'tab_completed'; 
            } else if (this.activeSection === 'LIST') { 
                if (this.selectedQuestId) { 
                    virtualHoverId = `quest_sel_${this.selectedQuestId}`; 
                } 
            } else if (this.activeSection === 'ACTIONS') { 
                if (this.availableActions[this.focusedActionIndex]) { 
                    virtualHoverId = this.availableActions[this.focusedActionIndex].id; 
                } else {
                    // Fallback to LIST if no actions available
                    this.activeSection = 'LIST';
                    if (this.selectedQuestId) virtualHoverId = `quest_sel_${this.selectedQuestId}`;
                }
            } 
        } 

        return { 
            activeTab: this.activeTab, 
            selectedQuestId: this.selectedQuestId, 
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
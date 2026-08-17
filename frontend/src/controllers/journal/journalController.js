import { BaseController } from '../core/baseController.js';
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

        // Define standard canvas size for layout math
        this.screenWidth = 1920;
        this.screenHeight = 1080;

        // Layout constants matching the Renderer
        this.layout = {
            p: 48,
            startY: 48,
            tabHeight: 60,
            rowHeight: 84,
            btnWidth: 216,
            btnHeight: 84
        };

        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('questList', { viewportH: 700, maxScroll: 0 });
        
        this.updateHitboxes([]);
    }

    init() {
        this.activeTab = 'active';
        this.scrollManager.resetAllScrolls();
        this._autoSelectFirst();
        console.log("[JournalController] Initialized");
    }

    update(dt) {
        this.scrollManager.update(dt);
    }

    _autoSelectFirst() {
        const list = this.activeTab === 'active' 
            ? Object.keys(gameState.quests.active) 
            : gameState.quests.completed;

        if (list.length > 0) {
            this.selectedQuestId = list[0];
        } else {
            this.selectedQuestId = null;
        }
    }

    onClick(hitboxId) {
        if (!hitboxId) return;

        events.emit('PLAY_SFX', { id: 'click', volume: 0.6 });

        if (hitboxId === 'tab_active') {
            this.activeTab = 'active';
            this.scrollManager.setOffset('questList', 0, true);
            this._autoSelectFirst();
        } else if (hitboxId === 'tab_completed') {
            this.activeTab = 'completed';
            this.scrollManager.setOffset('questList', 0, true);
            this._autoSelectFirst();
        } else if (hitboxId === 'btn_close') {
            this.exit();
        } else if (hitboxId.startsWith('quest_sel_')) {
            this.selectedQuestId = hitboxId.replace('quest_sel_', '');
        } else if (hitboxId.startsWith('btn_collect_')) {
            const questId = hitboxId.replace('btn_collect_', '');
            this.collectRewards(questId);
        } else if (hitboxId.startsWith('btn_track_')) {
            // --- NEW: Toggle quest tracking ---
            const questId = hitboxId.replace('btn_track_', '');
            if (!gameState.quests.trackedIds) {
                gameState.quests.trackedIds = [];
            }
            
            const index = gameState.quests.trackedIds.indexOf(questId);
            if (index > -1) {
                // Untrack
                gameState.quests.trackedIds.splice(index, 1);
            } else {
                // Track (max 3 at a time to prevent HUD clutter)
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

    handleKeyDown(code) {
        if (code === 'Escape' || code === 'KeyJ') {
            this.exit();
        }
    }

    handleScroll(deltaX, deltaY, mouseX, mouseY) {
        this.scrollManager.handleScrollWheel(mouseX, mouseY, deltaY);
    }

    collectRewards(questId) {
        const success = QuestModel.completeQuest(gameState, questId);
        if (success) {
            events.emit('PLAY_SFX', { id: 'quest_complete', volume: 0.8 });
            // Remove from tracked list if it was tracked
            if (gameState.quests.trackedIds) {
                const index = gameState.quests.trackedIds.indexOf(questId);
                if (index > -1) gameState.quests.trackedIds.splice(index, 1);
            }
            if (this.activeTab === 'active') {
                this._autoSelectFirst();
            }
        }
    }

    exit() {
        events.emit('PLAY_SFX', { id: 'cancel', volume: 0.6 });
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    getState() {
        const hitboxes = [];
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
        const quests = this.activeTab === 'active' 
            ? Object.keys(gameState.quests.active) 
            : gameState.quests.completed;

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

        // 4. Action Buttons (Collect & Track)
        if (this.selectedQuestId && this.activeTab === 'active') {
            const isComplete = QuestModel.checkCompletion(gameState, this.selectedQuestId);
            
            // Collect Button (Bottom Center)
            if (isComplete) {
                const btnX = rightColX + (colW / 2) - (btnWidth / 2);
                const btnY = startY + panelHeight - btnHeight - 32;
                hitboxes.push({
                    id: `btn_collect_${this.selectedQuestId}`,
                    x: btnX, y: btnY, w: btnWidth, h: btnHeight, zIndex: 10
                });
            }

            // Track Button (Bottom Left of the right panel)
            // We only show this if it's not complete
            if (!isComplete) {
                const trackBtnW = 160;
                const trackBtnH = 64;
                const trackBtnX = rightColX + 32;
                const trackBtnY = startY + panelHeight - trackBtnH - 32;
                
                hitboxes.push({
                    id: `btn_track_${this.selectedQuestId}`,
                    x: trackBtnX, y: trackBtnY, w: trackBtnW, h: trackBtnH, zIndex: 10
                });
            }
        }

        this.updateHitboxes(hitboxes);

        return {
            activeTab: this.activeTab,
            selectedQuestId: this.selectedQuestId,
            hitboxes: this.getHitboxes(),
            hoveredHitboxId: this.hoveredHitboxId,
            quests: gameState.quests,
            definitions: QuestDefinitions,
            scrollOffset: scrollOffset,
            layout: this.layout,
            trackedIds: gameState.quests.trackedIds || [] // <-- NEW: Send tracking state to renderer
        };
    }
}
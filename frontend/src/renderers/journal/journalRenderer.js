import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { QuestModel } from '../../../../shared/models/questModel.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../../../shared/data/entityDefinitions.js';
import { Formatting } from '../../../../shared/utils/formatting.js';

export class JournalRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
        this.iconSheetId = 'icons';
    }

    render(ctx, state) {
        const ui = new CanvasUI(ctx);
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        ui.clearScreen(w, h);
        
        const { p, startY } = state.layout;
        const panelHeight = h - (startY * 2);
        const halfW = Math.floor(w / 2);
        const colW = halfW - (p * 1.5);
        const leftColX = p;
        const rightColX = halfW + (p * 0.5);

        // 1. Draw Main Panels
        ui.drawPanel(leftColX, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        ui.drawPanel(rightColX, startY, colW, panelHeight, UITheme.colors.bgScale[1]);

        // 2. Draw Close Hint
        ui.drawText("Press ESC to Close", w - 24, 30, UITheme.fonts.small, UITheme.colors.textMuted, "right");

        // 3. Left Column: Tabs & List
        this._renderTabs(ui, state, leftColX, startY, colW);
        const listYBase = startY + 24 + state.layout.tabHeight + 32;
        const listHeight = panelHeight - (listYBase - startY) - 24;
        this._renderQuestList(ui, state, leftColX, listYBase, colW, listHeight);

        // 4. Right Column: Details
        if (state.selectedQuestId) {
            this._renderQuestDetails(ui, state, rightColX, startY, colW, panelHeight);
        } else {
            ui.drawText("Select a quest to view the chronicle.", rightColX + (colW / 2), startY + (panelHeight / 2), UITheme.fonts.italic, UITheme.colors.textMuted, "center");
        }
    }

    _renderTabs(ui, state, x, y, w) {
        const activeBox = state.hitboxes.find(h => h.id === 'tab_active');
        const completedBox = state.hitboxes.find(h => h.id === 'tab_completed');

        if (activeBox) {
            const isHovered = state.hoveredHitboxId === 'tab_active';
            const isActive = state.activeTab === 'active';
            ui.drawInteractiveRow(activeBox.x, activeBox.y, activeBox.w, activeBox.h, "Active Quests", UITheme.fonts.body, "center", isActive, isHovered);
        }

        if (completedBox) {
            const isHovered = state.hoveredHitboxId === 'tab_completed';
            const isActive = state.activeTab === 'completed';
            ui.drawInteractiveRow(completedBox.x, completedBox.y, completedBox.w, completedBox.h, "Chronicle", UITheme.fonts.body, "center", isActive, isHovered);
        }
        
        const refBox = activeBox || completedBox;
        if (refBox) {
            ui.drawLineWithGothicFlourish(x + (w / 4), refBox.y + refBox.h + 16, w / 2, UITheme.colors.borderHighlight);
        }
    }

    _renderQuestList(ui, state, x, y, w, h) {
        ui.startClip(x, y, w, h);
        
        const scrollOffset = state.scrollOffset;
        let currentY = 0;
        const rowHeight = state.layout.rowHeight;
        const quests = state.activeTab === 'active' ? Object.keys(state.quests.active) : state.quests.completed;

        if (quests.length === 0) {
            ui.drawText("No entries found.", x + w / 2, y + 50, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
        }

        quests.forEach(qId => {
            const def = state.definitions[qId];
            if (!def) return;

            const drawY = y + currentY - scrollOffset;
            const isSelected = state.selectedQuestId === qId;
            const isHovered = state.hoveredHitboxId === `quest_sel_${qId}`;
            
            const itemX = x + 16;
            const itemW = w - 40; // Reduced to leave breathing room for the scrollbar
            const itemH = rowHeight - 8;

            ui.drawInteractiveRow(itemX, drawY, itemW, itemH, def.name, UITheme.fonts.body, "left", isSelected, isHovered);

            if (isSelected) {
                ui.drawSelectionBrackets(itemX, drawY, itemW, itemH, 10);
            }

            if (state.activeTab === 'active') {
                const isComplete = QuestModel.checkCompletion(state, qId);
                const isTracked = state.trackedIds && state.trackedIds.includes(qId);

                // Checkmark for complete, Gold Star for tracked
                if (isComplete) {
                    ui.drawText("✓", itemX + itemW - 16, drawY + (itemH / 2), UITheme.fonts.body, UITheme.colors.success, "center", "middle");
                } else if (isTracked) {
                    ui.drawText("★", itemX + itemW - 16, drawY + (itemH / 2), UITheme.fonts.body, UITheme.colors.textHighlight, "center", "middle");
                }
            } else if (state.activeTab === 'completed') {
                ui.drawText("✓", itemX + itemW - 16, drawY + (itemH / 2), UITheme.fonts.body, UITheme.colors.textMuted, "center", "middle");
            }

            currentY += rowHeight;
        });
        
        ui.endClip();

        // Scrollbar rendering
        if (currentY > h) {
            const pct = scrollOffset / (currentY - h);
            const thumbH = Math.max(50, (h / currentY) * h);
            const thumbY = y + (pct * (h - thumbH));
            ui.drawRect(x + w - 12, y, 4, h, UITheme.colors.scrollTrack);
            ui.drawRect(x + w - 12, thumbY, 4, thumbH, UITheme.colors.scrollThumb);
        }
    }

    _renderQuestDetails(ui, state, x, y, w, h) {
        const def = state.definitions[state.selectedQuestId];
        if (!def) return;

        // Start clip to ensure long text never overlaps UI borders
        ui.startClip(x, y, w, h);

        const centerX = x + (w / 2);
        const TITLE_Y = y + 60;
        let currentY = TITLE_Y + 50;

        // Title & Flourish
        ui.drawText(def.name.toUpperCase(), centerX, TITLE_Y, UITheme.fonts.header, UITheme.colors.textMain, "center");
        const titleFlourishW = Math.min(300, w - 64);
        ui.drawLineWithGothicFlourish(centerX - (titleFlourishW / 2), TITLE_Y + 29, titleFlourishW, UITheme.colors.borderHighlight);

        // Description
        const padding = 32;
        const descStartX = x + padding;
        const descW = w - (padding * 2);

        ui.drawWrappedText(def.description, descStartX, currentY, descW, 36, UITheme.fonts.body, UITheme.colors.textMuted);
        
        // Calculate dynamic height for description based on average char width
        const charsPerLine = Math.max(10, Math.floor(descW / 14)); 
        const lines = Math.ceil(def.description.length / charsPerLine);
        currentY += (lines * 36) + 30;

        // Objectives
        ui.drawText("OBJECTIVES", descStartX, currentY, UITheme.fonts.bold, UITheme.colors.textHighlight, "left");
        currentY += 10;
        ui.drawLineWithGothicFlourish(descStartX, currentY, descW, UITheme.colors.borderHighlight);
        currentY += 35;

        const questState = state.quests.active[state.selectedQuestId];
        def.objectives.forEach(obj => {
            const progress = questState ? (questState.progress[obj.id] || 0) : (obj.amount || 1);
            const req = obj.amount || 1;
            const isDone = progress >= req || state.activeTab === 'completed';

            let actionText = "Objective";
            let targetText = obj.targetId;
            
            if (obj.type === 'kill_enemy') actionText = "Defeat";
            if (obj.type === 'obtain_item') actionText = "Collect";
            if (obj.type === 'party_level') {
                actionText = "Reach Level";
                targetText = obj.targetLevel;
            }
            if (typeof targetText === 'string') {
                targetText = Formatting.capitalize(targetText.split('_').join(' '));
            }

            const color = isDone ? UITheme.colors.success : UITheme.colors.textMain;
            const checkbox = isDone ? "[X]" : "[ ]";
            
            ui.drawText(`${checkbox}  ${actionText} ${targetText}`, descStartX + 8, currentY, UITheme.fonts.body, color, "left");
            ui.drawText(`${progress} / ${req}`, descStartX + descW - 8, currentY, UITheme.fonts.mono, color, "right");
            currentY += 40;
        });

        currentY += 20;

        // Rewards
        ui.drawText("REWARDS", descStartX, currentY, UITheme.fonts.bold, UITheme.colors.textHighlight, "left");
        currentY += 10;
        ui.drawLineWithGothicFlourish(descStartX, currentY, descW, UITheme.colors.borderHighlight);
        currentY += 30;

        this._renderRewardsList(ui, def, descStartX, currentY, descW);

        // End clip BEFORE the dynamically placed layout buttons at the bottom 
        ui.endClip();

        // Collect Button
        const btnBox = state.hitboxes.find(box => box.id === `btn_collect_${state.selectedQuestId}`);
        if (btnBox) {
            const isHovered = state.hoveredHitboxId === btnBox.id;
            let bg = isHovered ? UITheme.colors.states.focusBg : "rgba(0,0,0,0.6)";
            let textCol = isHovered ? UITheme.colors.states.focusText : UITheme.colors.success;

            ui.drawPanel(btnBox.x, btnBox.y, btnBox.w, btnBox.h, bg);
            ui.drawText("COLLECT", btnBox.x + (btnBox.w / 2), btnBox.y + (btnBox.h / 2) + 6, UITheme.fonts.body, textCol, "center", "middle");
            if (isHovered) {
                ui.drawSelectionBrackets(btnBox.x, btnBox.y, btnBox.w, btnBox.h, 10);
            }
        }

        // Track/Untrack Button
        const trackBtnBox = state.hitboxes.find(box => box.id === `btn_track_${state.selectedQuestId}`);
        if (trackBtnBox) {
            const isHovered = state.hoveredHitboxId === trackBtnBox.id;
            const isTracked = state.trackedIds && state.trackedIds.includes(state.selectedQuestId);
            let bg = isHovered ? UITheme.colors.states.focusBg : "rgba(0,0,0,0.6)";
            let textCol = isHovered ? UITheme.colors.states.focusText : (isTracked ? UITheme.colors.textHighlight : UITheme.colors.textMuted);
            
            // Removed the stars and changed to UNTRACK to match the exact character width of "COLLECT"
            let text = isTracked ? "UNTRACK" : "TRACK";

            ui.drawPanel(trackBtnBox.x, trackBtnBox.y, trackBtnBox.w, trackBtnBox.h, bg);
            ui.drawText(text, trackBtnBox.x + (trackBtnBox.w / 2), trackBtnBox.y + (trackBtnBox.h / 2) + 6, UITheme.fonts.body, textCol, "center", "middle");
            
            if (isHovered) {
                // Changed bracket size from 8 to 10 to perfectly match the Collect button
                ui.drawSelectionBrackets(trackBtnBox.x, trackBtnBox.y, trackBtnBox.w, trackBtnBox.h, 10);
            }
        }
    }

    _renderRewardsList(ui, def, startX, startY, width) {
        let currentY = startY;
        const iconSize = 48; // Compacted slightly to fit the UI better
        const rowHeight = 64; 
        const sheet = this.loader.get(this.iconSheetId);

        const drawRewardRow = (label, amountText, customDraw = null) => {
            ui.drawPanel(startX, currentY, width, rowHeight, "rgba(0,0,0,0.4)");
            ui.drawPanel(startX + 8, currentY + 8, iconSize, iconSize, "rgba(0,0,0,0.6)");
            
            if (customDraw) {
                customDraw(startX + 8, currentY + 8, iconSize);
            }
            
            ui.drawText(label, startX + iconSize + 24, currentY + (rowHeight / 2) + 6, UITheme.fonts.body, UITheme.colors.textMain, "left");
            ui.drawText(amountText, startX + width - 16, currentY + (rowHeight / 2) + 6, UITheme.fonts.mono, UITheme.colors.textHighlight, "right");
            
            currentY += rowHeight + 12;
        };

        if (!def.rewards) return;

        if (def.rewards.exp) {
            drawRewardRow("Experience", `+${def.rewards.exp}`, (ix, iy, s) => {
                ui.drawText("XP", ix + s / 2, iy + s / 2 + 6, UITheme.fonts.bold, UITheme.colors.xp, "center");
            });
        }

        if (def.rewards.currency) {
            drawRewardRow("Gold", `+${def.rewards.currency}`, (ix, iy, s) => {
                ui.drawText("$", ix + s / 2, iy + s / 2 + 6, UITheme.fonts.bold, UITheme.colors.textHighlight, "center");
            });
        }

        if (def.rewards.items) {
            def.rewards.items.forEach(reqItem => {
                const itemDef = ItemDefinitions ? ItemDefinitions[reqItem.id] : null;
                const itemName = itemDef ? itemDef.name : "Unknown Item";
                drawRewardRow(itemName, `${reqItem.amount}x`, (ix, iy, s) => {
                    const success = this._drawItemIcon(ui, itemDef, ix, iy, s);
                    if (!success) {
                        ui.drawText("?", ix + s / 2, iy + s / 2 + 6, UITheme.fonts.bold, UITheme.colors.textMuted, "center");
                    }
                });
            });
        }

        if (def.rewards.companions) {
            def.rewards.companions.forEach(comp => {
                const entDef = ENTITY_DEFINITIONS ? ENTITY_DEFINITIONS[comp.id] : null;
                const name = comp.overrides?.name || entDef?.name || "Ally";
                drawRewardRow(`Ally: ${name}`, "1x", (ix, iy, s) => {
                    if (entDef && sheet) {
                        const col = entDef.iconCol || 0;
                        const row = entDef.iconRow || 0;
                        ui.drawSprite(sheet, col * 32, row * 32, 32, 32, ix, iy, s, s);
                    } else {
                        ui.drawText("♟", ix + s / 2, iy + s / 2 + 6, UITheme.fonts.bold, UITheme.colors.textHighlight, "center");
                    }
                });
            });
        }
    }

    _drawItemIcon(ui, def, x, y, size) {
        if (!def) return false;
        
        let sheetName = 'items';
        const type = (def.type || '').toLowerCase();
        const slot = (def.slot || '').toLowerCase();
        
        if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
            sheetName = 'weapons';
        } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
            sheetName = 'armor';
        } else if (type === 'consumable') {
            sheetName = 'consumables';
        } else if (type === 'material') {
            sheetName = 'materials';
        }

        const sheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons');
        if (!sheet) return false;

        const iconData = def.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32;
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);
        
        ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, size, size);
        return true;
    }
}
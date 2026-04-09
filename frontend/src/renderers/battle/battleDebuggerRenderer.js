import { CanvasUI } from '../../ui/canvasUI.js';   
import { UITheme } from '../../ui/UITheme.js';

export class BattleDebuggerRenderer {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.ui = new CanvasUI(ctx);
    }

    render(state) {
        if (!state) return;

        const width = this.config.CANVAS_WIDTH || 1920;
        const height = this.config.CANVAS_HEIGHT || 1080;

        // Draw semi-transparent background over the battle
        this.ui.drawRect(0, 0, width, height, 'rgba(0, 0, 0, 0.85)', true);

        const margin = 24; // Scaled (10 -> 24)
        const columnWidth = (width / 2) - (margin * 1.5);
        const leftX = margin;
        const rightX = (width / 2) + (margin / 2);
        // Moved up since the header is gone from the top
        const startY = 48; // Scaled (20 -> 48)

        // Cyan/Blue for Allies, Failure Red for Enemies
        this._renderTeamTable('ALLIES (ACTIVE PARTY)', state.activeParty, leftX, startY, columnWidth, '#00ffff');
        this._renderTeamTable('ENEMIES', state.activeEnemies, rightX, startY, columnWidth, UITheme.colors.failure);

        // Render header at the bottom now
        this._renderGlobalHeader(state, width, height);
    }

    _renderGlobalHeader(state, screenWidth, screenHeight) {
        const actionName = state.selectedAction ? state.selectedAction.name : 'None';
        const targetCount = state.selectedTargets?.length || 0;
        
        const headerText = `[ BATTLE DEBUG ]  PHASE: ${state.phase}  |  TIMER: ${state.timer?.toFixed(2) || 0}s  |  QUEUE: ${state.turnQueue?.length || 0}  |  ACTION: ${actionName}  |  TARGETS: ${targetCount}`;
        
        // Moved to bottom, changed color to theme highlight (amber)
        const yPos = screenHeight - 60; // Scaled (25 -> 60)
        this.ui.drawText(headerText, screenWidth / 2, yPos, 'bold 26px monospace', UITheme.colors.textHighlight, 'center', 'top'); // Scaled (11px -> 26px)
        this.ui.drawLine(48, yPos - 12, screenWidth - 48, yPos - 12, UITheme.colors.textHighlight, 1); // Scaled (20 -> 48, 5 -> 12)
    }

    // --- Helpers ---
    
    // NEW: Dynamically parse equipment instead of hardcoding slots
    _getEqString(c) {
        const eqObj = c.originalEntity?.equipment || c.equipment;
        if (!eqObj) return 'None';
        
        const keys = Object.keys(eqObj);
        if (keys.length === 0) return 'None';

        const eqParts = keys.map(slot => {
            const item = eqObj[slot];
            if (!item) return null;
            
            // Get a short prefix for the slot (e.g., 'mainhand' -> 'M', 'head' -> 'H')
            const prefix = slot.charAt(0).toUpperCase();
            const itemName = typeof item === 'string' ? item : (item.name || 'Unknown');
            return `[${prefix}] ${itemName}`;
        }).filter(Boolean);

        return eqParts.length > 0 ? eqParts.join('  ') : 'None';
    }

    _unwrapStat(statObj) {
        if (statObj === undefined || statObj === null) return undefined;
        if (typeof statObj === 'object' && statObj.total !== undefined) return statObj.total;
        return statObj;
    }

    _getDamageType(c, type) {
        // --- FIXED 1: Mapped 'SLS' to 'slash' and 'PRC' to 'pierce' to match StatCalculator ---
        const typeMap = {
            'BLT': 'blunt', 'SLS': 'slash', 'PRC': 'pierce', 'FIR': 'fire',
            'ICE': 'ice', 'LNG': 'lightning', 'WAT': 'water', 'ERT': 'earth',
            'WND': 'wind', 'LGT': 'light', 'DRK': 'dark', 'ARC': 'arcane'
        };

        const actualKey = typeMap[type] || type.toLowerCase();
        
        let atk = typeof c.getAttack === 'function' ? c.getAttack(actualKey) : '-';
        let def = typeof c.getDefense === 'function' ? c.getDefense(actualKey) : '-';

        atk = this._unwrapStat(atk) ?? '-';
        def = this._unwrapStat(def) ?? '-';

        // --- FIXED 2: Changed 'resistances' to 'resistance' (singular) ---
        let resRaw = c.stats?.resistance?.[actualKey] || 0; 
                  
        let resVal = this._unwrapStat(resRaw);
        
        if (atk === 0) atk = '-';
        if (def === 0) def = '-';
        
        let resStr = '-';
        if (typeof resVal === 'number' && !isNaN(resVal)) {
            if (resVal === 0) {
                 resStr = '0%';
            } else {
                 // Multiply by 100 before formatting
                 resStr = `${Number((resVal * 100).toFixed(1))}%`; 
            }
        }

        return { atk, def, res: resStr };
    }

    _renderTeamTable(title, combatants, x, y, width, titleColor) {
        if (!combatants || combatants.length === 0) return;

        this.ui.drawText(title, x, y, 'bold 29px monospace', titleColor, 'left', 'top'); // Scaled (12px -> 29px)
        y += 36; // Scaled (15 -> 36)

        // Reduced height to fit 3 cards per column
        const cardHeight = 300; // Scaled (125 -> 300)
        // Slightly tighter line height to pack info
        const lineH = 26; // Scaled (11 -> 26)

        combatants.forEach((c, index) => {
            if (!c) return;
            // Only draw up to 3 cards per column to prevent bleeding off the bottom
            if (index >= 3) return;

            const isDead = c.isDead();
            
            // --- CARD BACKGROUND ---
            const bgColor = isDead ? 'rgba(30, 0, 0, 0.6)' : UITheme.colors.panelBg;
            this.ui.drawPanel(x, y, width, cardHeight - 14, bgColor); // Scaled (6 -> 14)
            
            if (isDead) {
                this.ui.drawRect(x, y, width, cardHeight - 14, UITheme.colors.failure, false);
            }

            let cy = y + 14; // Scaled (6 -> 14)
            const cx = x + 14; // Scaled (6 -> 14)
            const innerWidth = width - 29; // Scaled (12 -> 29)
            const tColor = isDead ? UITheme.colors.textMuted : UITheme.colors.textMain;

            // --- 1. HEADER ---
            const lvl = c.originalEntity?.level || c.level || 1;
            this.ui.drawText(`${c.name || c.id || 'Unknown'} (Lv.${lvl})`, cx, cy, 'bold 24px monospace', tColor, 'left', 'top'); // Scaled (10px -> 24px)
            
            const xp = c.originalEntity?.xp || 0;
            const nextXp = c.originalEntity?.nextLevelXp || 100;
            this.ui.drawText(`XP: ${xp}/${nextXp}`, x + width - 14, cy, 'bold 24px monospace', UITheme.colors.textHighlight, 'right', 'top'); // Scaled (6 -> 14, 10px -> 24px)
            cy += lineH + 5; // Scaled (2 -> 5)

            // --- 2. RESOURCES & BARS ---
            const barW = (innerWidth / 3) - 10; // Scaled (4 -> 10)
            
            // HP
            const hpColor = isDead ? UITheme.colors.textMuted : UITheme.colors.hp;
            this.ui.drawText(`HP: ${Math.round(c.hp)}/${c.maxHp}`, cx, cy, '22px monospace', hpColor, 'left', 'top'); // Scaled (9px -> 22px)
            this.ui.drawBar(cx, cy + 22, barW, 7, c.hp, c.maxHp, UITheme.colors.hp, UITheme.colors.hpDim); // Scaled (9 -> 22, 3 -> 7)

            // STM
            const stmColor = isDead ? UITheme.colors.textMuted : UITheme.colors.stm;
            this.ui.drawText(`STM: ${Math.round(c.stamina)}/${c.maxStamina}`, cx + barW + 14, cy, '22px monospace', stmColor, 'left', 'top'); // Scaled (6 -> 14, 9px -> 22px)
            this.ui.drawBar(cx + barW + 14, cy + 22, barW, 7, c.stamina, c.maxStamina, UITheme.colors.stm, UITheme.colors.stmDim); // Scaled (6 -> 14, 9 -> 22, 3 -> 7)

            // INS
            const insColor = isDead ? UITheme.colors.textMuted : UITheme.colors.ins;
            this.ui.drawText(`INS: ${Math.round(c.insight)}/${c.maxInsight}`, cx + (barW * 2) + 29, cy, '22px monospace', insColor, 'left', 'top'); // Scaled (12 -> 29, 9px -> 22px)
            this.ui.drawBar(cx + (barW * 2) + 29, cy + 22, barW, 7, c.insight, c.maxInsight, UITheme.colors.ins, UITheme.colors.insDim); // Scaled (12 -> 29, 9 -> 22, 3 -> 7)
            cy += lineH + 10; // Scaled (4 -> 10)

            // --- 3. CORE ATTRIBUTES & CBT ---
            const baseAttrs = c.originalEntity?.attributes || {};
            const stats = c.stats || {};
            
            const getAttr = (fullWord, abbr) => {
                return this._unwrapStat(stats[fullWord]) ?? this._unwrapStat(stats[abbr]) ?? baseAttrs[fullWord] ?? 0;
            };
            
            const vig = getAttr('vigor', 'vig');
            const str = getAttr('strength', 'str');
            const dex = getAttr('dexterity', 'dex');
            const int = getAttr('intelligence', 'int');
            const atn = getAttr('attunement', 'atn');

            const spd = this._unwrapStat(stats.speed) ?? '?';
            
            // FIXED: Multiply Crit Chance by 100 for proper display
            let crt = this._unwrapStat(stats.critChance) ?? 0;
            crt = Number((crt * 100).toFixed(1)); 

            let crtDmg = this._unwrapStat(stats.critDamage) ?? 1.5;
            crtDmg = Number(crtDmg.toFixed(2)); 

            const attrStr = `VIG:${vig} STR:${str} DEX:${dex} INT:${int} ATN:${atn}`;
            const cbtStr = `SPD:${spd} CRT:${crt}% DMG:x${crtDmg}`;
            
            this.ui.drawText(`${attrStr} | ${cbtStr}`, cx, cy, '22px monospace', tColor, 'left', 'top'); // Scaled (9px -> 22px)
            cy += lineH + 5; // Scaled (2 -> 5)

            // --- 4. DAMAGE MATRIX ---
            const allTypes = ['BLT', 'SLS', 'PRC', 'FIR', 'ICE', 'LNG', 'WAT', 'ERT', 'WND', 'LGT', 'DRK', 'ARC'];
            const labelW = 48; // Scaled (20 -> 48)
            const colW = (innerWidth - labelW) / 12;

            // Matrix Background
            const tableBg = isDead ? 'rgba(20,20,20,0.5)' : UITheme.colors.bgScale[0];
            this.ui.drawRect(cx, cy - 2, innerWidth, (lineH * 4) + 5, tableBg, true); // Scaled (1 -> 2, 2 -> 5)

            // Matrix Headers
            allTypes.forEach((type, i) => {
                this.ui.drawText(type, cx + labelW + (i * colW) + (colW / 2), cy, '19px monospace', tColor, 'center', 'top'); // Scaled (8px -> 19px)
            });
            cy += lineH;

            // Matrix Rows
            const tableRows = [
                { label: 'ATK', key: 'atk', color: isDead ? UITheme.colors.textMuted : UITheme.colors.attack, bg: 'rgba(255, 140, 0, 0.05)' },
                { label: 'DEF', key: 'def', color: isDead ? UITheme.colors.textMuted : UITheme.colors.defense, bg: 'transparent' },
                { label: 'RES', key: 'res', color: isDead ? UITheme.colors.textMuted : UITheme.colors.resistance, bg: 'rgba(149, 165, 166, 0.05)' }
            ];

            tableRows.forEach(row => {
                if (row.bg !== 'transparent') {
                    this.ui.drawRect(cx, cy - 2, innerWidth, lineH, row.bg, true); // Scaled (1 -> 2)
                }
                this.ui.drawText(row.label, cx + 5, cy, '19px monospace', row.color, 'left', 'top'); // Scaled (2 -> 5, 8px -> 19px)
                
                allTypes.forEach((type, i) => {
                    const dt = this._getDamageType(c, type);
                    this.ui.drawText(String(dt[row.key]), cx + labelW + (i * colW) + (colW / 2), cy, '19px monospace', tColor, 'center', 'top'); // Scaled (8px -> 19px)
                });
                cy += lineH;
            });
            cy += 5; // Scaled (2 -> 5)

            // --- 5. EQUIPMENT & FX ---
            // FIXED: Dynamically fetch all equipment string
            const eqStr = this._getEqString(c);
            
            const fxArr = c.statusEffects || [];
            const fxStr = fxArr.length > 0 ? fxArr.map(fx => fx.name || fx.id).join(', ') : 'None';

            this.ui.drawText(`EQ: ${eqStr}`, cx, cy, '22px monospace', tColor, 'left', 'top'); // Scaled (9px -> 22px)
            cy += lineH;
            this.ui.drawText(`FX: ${fxStr}`, cx, cy, '22px monospace', tColor, 'left', 'top'); // Scaled (9px -> 22px)

            y += cardHeight;
        });
    }
}
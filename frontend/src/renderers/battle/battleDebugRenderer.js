export class BattleDebugRenderer {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }

    render(state) {
        if (!state) return;

        const width = this.config.CANVAS_WIDTH || 800;
        const height = this.config.CANVAS_HEIGHT || 800; // Might need to be taller for full cards

        this.ctx.save();

        // 1. Draw Full-Screen Dark Overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
        this.ctx.fillRect(0, 0, width, height);

        // 2. Render Global Battle State Header
        this._renderGlobalHeader(state, width);

        // 3. Render the Two Table Columns (Allies Left, Enemies Right)
        const margin = 20;
        const columnWidth = (width / 2) - (margin * 1.5);
        
        const leftX = margin;
        const rightX = (width / 2) + (margin / 2);
        const startY = 60; // Start below the header

        this._renderTeamTable('ALLIES (ACTIVE PARTY)', state.activeParty, leftX, startY, columnWidth, '#00ffff');
        this._renderTeamTable('ENEMIES', state.activeEnemies, rightX, startY, columnWidth, '#ff5555');

        this.ctx.restore();
    }

    _renderGlobalHeader(state, screenWidth) {
        const ctx = this.ctx;
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const actionName = state.selectedAction ? state.selectedAction.name : 'None';
        const targetCount = state.selectedTargets?.length || 0;
        
        const headerText = `[ BATTLE DEBUG ]  PHASE: ${state.phase}  |  TIMER: ${state.timer?.toFixed(2) || 0}s  |  TURN QUEUE: ${state.turnQueue?.length || 0}  |  ACTION: ${actionName}  |  TARGETS: ${targetCount}`;
        
        ctx.fillText(headerText, screenWidth / 2, 10);
        
        ctx.beginPath();
        ctx.moveTo(20, 30);
        ctx.lineTo(screenWidth - 20, 30);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // --- Data Extraction Helpers ---
    _getEq(c, slot) {
        const item = c.originalEntity?.equipment?.[slot];
        if (!item) return 'Empty';
        return typeof item === 'string' ? item : (item.name || 'Unknown');
    }

    _getDamageType(c, type) {
        const dt = c.stats?.damageTypes?.[type] || {};
        return {
            atk: dt.atk !== undefined ? dt.atk : '-',
            def: dt.def !== undefined ? dt.def : '-',
            res: dt.res !== undefined ? `${dt.res}%` : '-'
        };
    }

    _renderTeamTable(title, combatants, x, y, width, titleColor) {
        const ctx = this.ctx;
        if (!combatants || combatants.length === 0) return;

        // Draw Table Title
        ctx.fillStyle = titleColor;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(title, x, y);
        y += 20;

        const cardHeight = 160; 
        const lineH = 14;

        combatants.forEach(c => {
            if (!c) return;
            const isDead = c.isDead();
            
            // Background for the combatant card
            ctx.fillStyle = isDead ? 'rgba(50, 0, 0, 0.3)' : 'rgba(30, 30, 30, 0.5)';
            ctx.fillRect(x, y, width, cardHeight - 10);

            ctx.fillStyle = isDead ? '#666666' : '#ffffff';
            let cy = y + 5;
            const cx = x + 5;

            // --- 1. HEADER (Name, Level, XP) ---
            ctx.font = 'bold 12px monospace';
            const lvl = c.originalEntity?.level || 1;
            const nameStr = `${c.name || 'Unknown'} (Lv.${lvl})`;
            ctx.fillText(nameStr, cx, cy);
            
            ctx.fillStyle = '#ffcc00'; // XP color
            ctx.textAlign = 'right';
            const xp = c.originalEntity?.xp || 0;
            const nextXp = c.originalEntity?.nextLevelXp || 100;
            ctx.fillText(`XP: ${xp}/${nextXp}`, x + width - 5, cy);
            ctx.textAlign = 'left';
            cy += lineH + 4;

            // --- 2. RESOURCES (HP, STM, INS) ---
            ctx.font = '11px monospace';
            ctx.fillStyle = isDead ? '#666666' : '#ff4444';
            const hpStr = `HP: ${Math.round(c.hp)}/${c.maxHp}`;
            ctx.fillStyle = isDead ? '#666666' : '#44ff44';
            const stmStr = `STM: ${Math.round(c.stamina)}/${c.maxStamina}`;
            ctx.fillStyle = isDead ? '#666666' : '#cc44ff';
            const insStr = `INS: ${Math.round(c.insight)}/${c.maxInsight}`;
            
            ctx.fillStyle = isDead ? '#666666' : '#dddddd';
            ctx.fillText(`${hpStr}   ${stmStr}   ${insStr}`, cx, cy);
            cy += lineH;

            // --- 3. CORE ATTRIBUTES ---
            // Try stats.attributes first, fallback to originalEntity.attributes
            const attr = c.stats?.attributes || c.originalEntity?.attributes || {};
            const attrStr = `VIG:${attr.vig||0} STR:${attr.str||0} DEX:${attr.dex||0} INT:${attr.int||0} ATN:${attr.atn||0}`;
            ctx.fillText(`ATTR: [ ${attrStr} ]`, cx, cy);
            cy += lineH;

            // --- 4. COMBAT STATS (SPD, CRT) ---
            const spd = c.stats?.speed || '?';
            const crt = c.stats?.critChance || 0;
            const crtDmg = c.stats?.critDamage || 1.5;
            ctx.fillText(`CBT:  SPD:${spd}  CRT%:${crt}%  CRTDmg:x${crtDmg}`, cx, cy);
            cy += lineH + 4;

            // --- 5. DAMAGE TYPES (ATK / DEF / RES) ---
            ctx.fillStyle = '#aaaaaa';
            const el1 = ['BLT', 'SLS', 'PRC', 'FIR'];
            const el2 = ['ICE', 'LNG', 'WAT', 'ERT'];
            const el3 = ['WND', 'LGT', 'DRK', 'ARC'];
            
            const drawElementGroup = (arr, offsetX, offsetY) => {
                arr.forEach((type, idx) => {
                    const dt = this._getDamageType(c, type);
                    ctx.fillText(`${type}: ${dt.atk}/${dt.def}/${dt.res}`, cx + offsetX, offsetY + (idx * lineH));
                });
            };

            drawElementGroup(el1, 0, cy);
            drawElementGroup(el2, width * 0.33, cy);
            drawElementGroup(el3, width * 0.66, cy);
            cy += (lineH * 4) + 4;

            // --- 6. EQUIPMENT ---
            ctx.fillStyle = isDead ? '#555555' : '#88ccff';
            const eqMain = this._getEq(c, 'mainhand');
            const eqOff = this._getEq(c, 'offhand');
            const eqTorso = this._getEq(c, 'torso');
            ctx.fillText(`EQ: M:${eqMain} | O:${eqOff} | T:${eqTorso}`, cx, cy);
            cy += lineH;

            // --- 7. TRAITS & STATUS FX ---
            ctx.fillStyle = isDead ? '#444444' : '#aaaaaa';
            const traitsArr = c.originalEntity?.traits || [];
            const traits = traitsArr.length ? traitsArr.join(', ') : 'None';
            const fxArr = c.statusEffects || [];
            const fxStr = fxArr.length > 0 ? fxArr.map(fx => fx.name || fx.id).join(', ') : 'None';
            
            ctx.fillText(`TRT: ${traits}  |  FX: [${fxStr}]`, cx, cy);

            // Move down for the next combatant
            y += cardHeight;
        });
    }
}
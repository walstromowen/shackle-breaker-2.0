import { BaseController } from '../core/baseController.js'; 
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js'; 
import { ContextMenuManager } from '../../ui/ContextMenuManager.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';

export class PartyController extends BaseController {
    constructor(input) {
        super(input); 

        this.selectedIndex = 0;
        this.gridColumns = 3; 
        
        // --- CONTEXT ---
        this.mode = 'DEFAULT'; 
        this.activeIndices = []; 
        this.callback = null;    

        // --- STATE MACHINE ---
        this.state = 'NAVIGATING'; 

        // --- MANAGERS ---
        this.contextMenu = new ContextMenuManager();
        this.dragManager = new DragAndDropManager();

        // --- SWAP & HITBOX DATA ---
        this.swappingIdx = null; 
        this.hoveredHitboxId = null;
        this.hitboxes = [];
    }

    init(data = {}) {
        this.mode = data.mode || 'DEFAULT';
        this.activeIndices = data.activeIndices || [];
        this.callback = data.callback || null; 
        this.state = 'NAVIGATING';
        this.selectedIndex = 0;
        this.swappingIdx = null;
        this.hoveredHitboxId = null;
        this.contextMenu.close();
        this.dragManager.cancelDrag();
    }

    getHitboxes() {
        return this.hitboxes;
    }

    updateHitboxes(hitboxes) {
        this.hitboxes = hitboxes;
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING
    // ========================================================

    onClick(hitboxId) {
        const party = gameState.party.members;

        if (this.contextMenu.menu) {
            if (!hitboxId) {
                this.contextMenu.close();
                return;
            }
            if (hitboxId === 'MENU_BG') {
                return; 
            }
            if (hitboxId.startsWith('MENU_OPT_')) {
                const menuActionIndex = parseInt(hitboxId.replace('MENU_OPT_', ''), 10);
                this.contextMenu.executeAction(menuActionIndex);
                return;
            }
            if (hitboxId.startsWith('CARD_')) {
                const cardIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
                if (cardIndex < party.length && cardIndex !== this.selectedIndex) {
                    this.selectedIndex = cardIndex;
                }
                this.contextMenu.close();
            } else {
                this.contextMenu.close();
            }
            return; 
        }

        if (!hitboxId || !hitboxId.startsWith('CARD_')) return;

        const clickedIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
        if (clickedIndex >= party.length) return; 

        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                this.selectedIndex = clickedIndex;
            } else {
                this.confirmSelection(); 
            }
        } 
        else if (this.state === 'SWAPPING') {
            this.selectedIndex = clickedIndex;
            this.completeSwap();
        }
    }

    onRightClick(hitboxId) {
        if (this.contextMenu.menu) {
            this.contextMenu.close();
        } else if (this.state === 'SWAPPING') {
            this.swappingIdx = null;
            this.state = 'NAVIGATING';
        } else {
            this.cancelAndReturn();
        }
    }

    // ========================================================
    // MOUSE & DRAG EVENTS
    // ========================================================
    
    onMouseDown(hitboxId, x, y) {
        if (this.contextMenu.menu) return; 
        
        if (hitboxId && hitboxId.startsWith('CARD_')) {
            const clickedIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
            const member = gameState.party.members[clickedIndex];
            
            if (member) {
                this.selectedIndex = clickedIndex;
            }
        }
    }

    onMouseMove(hitboxId, x, y) {
        this.hoveredHitboxId = hitboxId;
        
        // Update drag visuals if active
        if (this.dragManager.dragState.active) {
            this.dragManager.updateDrag(x, y);
        }
    }

    onDragMove(x, y) {
        if (this.dragManager && this.dragManager.dragState.active) {
            this.dragManager.updateDrag(x, y);
        }
    }

    onDragStart(sourceHitboxId) {
        if (this.contextMenu.menu || this.mode === 'BATTLE_SELECT') return; // Don't drag if menu open or in battle select

        if (!sourceHitboxId || !sourceHitboxId.startsWith('CARD_')) return;

        const index = parseInt(sourceHitboxId.replace('CARD_', ''), 10);
        const member = gameState.party.members[index];

        if (!member) return;

        const mousePos = this.input.getMousePosition();
        
        // Visually link state
        this.state = 'SWAPPING';
        this.swappingIdx = index;
        this.selectedIndex = index;
        
        this.dragManager.startDrag(
            member, 
            'party', 
            sourceHitboxId, 
            mousePos.x, 
            mousePos.y, 
            this._handleDropComplete.bind(this)
        );
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        this.dragManager.endDrag(targetHitboxId);
    }

    _handleDropComplete(payload, sourceId, originSlot, targetHitboxId) {
        if (targetHitboxId && targetHitboxId.startsWith('CARD_') && originSlot !== targetHitboxId) {
            const fromIdx = parseInt(originSlot.replace('CARD_', ''), 10);
            const toIdx = parseInt(targetHitboxId.replace('CARD_', ''), 10);
            this.swapMembers(fromIdx, toIdx);
        }
        
        // Reset states
        this.swappingIdx = null;
        this.state = 'NAVIGATING';
    }

    onMouseUp(hitboxId, x, y) {
        // Reserved for standard interaction handling
    }

    handleKeyDown(keyCode, e) {
        const intent = typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null;

        if (this.contextMenu.menu) {
            this.contextMenu.handleNavigation(intent);
        } 
        else if (this.state === 'NAVIGATING') {
            this.handleNavigatingKeys(intent, e);
        } 
        else if (this.state === 'SWAPPING') {
            this.handleSwappingKeys(intent, e);
        }
    }

    // ==========================================
    //          STATE 1: NAVIGATING
    // ==========================================
    handleNavigatingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } 
        else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            if (col > 0) this.selectedIndex--;
        }
        else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                this.selectedIndex = memberCount - 1;
            }
        }
        else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        else if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            this.confirmSelection();
        }
        else if (intent === 'CANCEL' || e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Tab') {
            this.cancelAndReturn();
        }
    }

    confirmSelection() {
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') {
            const member = gameState.party.members[this.selectedIndex];
            const isDead = member.hp <= 0;
            const isActive = this.activeIndices.includes(this.selectedIndex);

            if (isDead || isActive) {
                console.log("[Party] Cannot select this member.");
                return; 
            }

            if (this.callback) {
                this.callback(this.selectedIndex);
            }

            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
            this.openMenu();
        }
    }

    cancelAndReturn() {
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') {
            if (this.callback) {
                this.callback(null);
            }
            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    // ==========================================
    //            STATE 2: MENU
    // ==========================================
    openMenu() {
        const member = gameState.party.members[this.selectedIndex];
        if (!member) return;
        
        const options = [
            {
                label: 'Summary',
                actionId: 'SUMMARY',
                callback: () => {
                    events.emit('CHANGE_SCENE', { 
                        scene: 'character_summary', 
                        data: { memberIndex: this.selectedIndex, character: member } 
                    });
                }
            },
            {
                label: 'Move',
                actionId: 'MOVE',
                callback: () => {
                    this.state = 'SWAPPING';
                    this.swappingIdx = this.selectedIndex; 
                }
            },
            {
                label: 'Exile',
                actionId: 'EXILE',
                callback: () => {
                    this.exileMember(this.selectedIndex);
                }
            }
        ];
        
        if (member.skillPoints && member.skillPoints > 0) {
            options.push({
                label: 'Spend Skill Points',
                actionId: 'SKILLS',
                callback: () => {
                    events.emit('CHANGE_SCENE', { 
                        scene: 'level_up', 
                        data: { memberIndex: this.selectedIndex, character: member } 
                    });
                }
            });
        }

        this.contextMenu.open(0, 0, options, member);
    }

    exileMember(index) {
        const party = gameState.party.members;
        
        if (party.length <= 1) {
            console.warn("Cannot exile the last party member.");
            return;
        }
        
        party.splice(index, 1);

        if (this.selectedIndex >= party.length) {
            this.selectedIndex = Math.max(0, party.length - 1);
        }
    }

    // ==========================================
    //            STATE 3: SWAPPING
    // ==========================================
    handleSwappingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
             if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        }
        else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
             if (col > 0) this.selectedIndex--;
        }
        else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
             const target = this.selectedIndex + this.gridColumns;
             if (target < memberCount) {
                 this.selectedIndex = target;
             } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                 this.selectedIndex = memberCount - 1;
             }
        }
        else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
             if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        else if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            this.completeSwap();
        }
        else if (intent === 'CANCEL' || e.code === 'Escape' || e.code === 'Backspace') {
            this.swappingIdx = null; 
            this.state = 'NAVIGATING';
        }
    }

    completeSwap() {
        if (this.swappingIdx !== null && this.swappingIdx !== this.selectedIndex) {
            this.swapMembers(this.swappingIdx, this.selectedIndex);
        }
        this.swappingIdx = null;
        this.state = 'NAVIGATING';
    }

    swapMembers(from, to) {
        const p = gameState.party.members;
        [p[from], p[to]] = [p[to], p[from]];
    }

    // ========================================================
    // STATE ACCESS FOR RENDERER
    // ========================================================
    
    getState() {
        return { 
            members: gameState.party.members,
            selectedIndex: this.selectedIndex,
            swappingIdx: this.swappingIdx,
            menu: this.contextMenu.menu, 
            mode: this.mode,                    
            activeIndices: this.activeIndices,
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            dragState: this.dragManager.dragState, // Important: pass down drag state
            onLayoutUpdate: (hitboxes) => {
                this.updateHitboxes(hitboxes);
            }
        };
    }
}
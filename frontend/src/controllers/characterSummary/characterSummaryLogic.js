import { gameState } from '../../../../shared/state/gameState.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

const SLOT_ORDER = ['head', 'torso', 'arms', 'mainHand', 'offHand', 'legs', 'feet', 'accessory'];

export class CharacterSummaryLogic {
    constructor(config) {
        this.config = config || {};
        this.readOnly = this.config.readOnly || this.config.isCombat || false;
        this.memberIndex = 0;

        if (this.config.memberIndex !== undefined) {
            this.memberIndex = this.config.memberIndex;
        } else if (this.config.character) {
            const index = gameState.party.members.findIndex(m => 
                m === this.config.character || m.id === this.config.character.id
            );
            this.memberIndex = index !== -1 ? index : 0;
        }
    }

    get currentMember() { 
        return gameState.party.members[this.memberIndex]; 
    }

    get isLocked() {
        const isBattleSelection = this.config && typeof this.config.onItemSelected === 'function';
        return this.readOnly || isBattleSelection;
    }

    cycleMember(direction) {
        if (this.isLocked) return false; 
        const count = gameState.party.members.length;
        this.memberIndex = (this.memberIndex + direction + count) % count;
        return true;
    }

    getActiveSlots() {
        const member = this.currentMember;
        if (!member) return [];

        const availableSlots = Object.keys(member.equipment || {});
        return availableSlots.sort((a, b) => {
            const indexA = SLOT_ORDER.indexOf(a);
            const indexB = SLOT_ORDER.indexOf(b);
            const indexALower = SLOT_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
            const indexBLower = SLOT_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
            
            const finalA = (indexA !== -1) ? indexA : (indexALower !== -1 ? indexALower : 99);
            const finalB = (indexB !== -1) ? indexB : (indexBLower !== -1 ? indexBLower : 99);

            return finalA - finalB;
        });
    }

    getFilteredInventory() {
        // Return the entire inventory, only filtering out empty/null slots
        return gameState.party.inventory.filter(item => item);
    }

    canEquipToSlot(item, targetSlotRaw) {
        const def = ItemDefinitions[item.defId]; 
        if (!def) return false;

        const itemSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, ''); 
        const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');

        return (itemSlot === slotKey) || 
               (slotKey === 'mainhand' && ['weapon', 'tool', 'twohand', 'onehand'].includes(itemSlot)) ||
               (slotKey === 'offhand' && ['shield', 'weapon', 'onehand'].includes(itemSlot));
    }

    equipItem(inventoryItem, targetSlotOverride, activeSlots) {
        if (this.readOnly) return null;

        const member = this.currentMember;
        let slotName = targetSlotOverride;
        const def = ItemDefinitions[inventoryItem.defId];
        
        const rawItemType = def ? (def.slot || def.type || '').toLowerCase() : '';
        const itemTypeNormalized = rawItemType.replace(/\s/g, ''); 

        const mainHandSlot = activeSlots.find(s => s.toLowerCase() === 'mainhand') || 'mainHand';
        const offHandSlot = activeSlots.find(s => s.toLowerCase() === 'offhand') || 'offHand';
        
        const currentMainItem = member.equipment[mainHandSlot];
        const currentOffItem = member.equipment[offHandSlot];
        
        const currentMainDef = currentMainItem ? ItemDefinitions[currentMainItem.defId] : null;
        const isMainTwoHanded = currentMainDef && (currentMainDef.slot || currentMainDef.type || '').toLowerCase().replace(/\s/g, '') === 'twohand';

        // --- SMART ROUTING LOGIC ---
        if (!slotName) {
            if (itemTypeNormalized === 'onehand' || rawItemType === 'weapon') {
                if (currentMainItem && !currentOffItem && !isMainTwoHanded) {
                    slotName = offHandSlot;
                } else {
                    slotName = mainHandSlot;
                }
            } else if (itemTypeNormalized === 'twohand') {
                slotName = mainHandSlot;
            } else if (rawItemType === 'shield') {
                slotName = offHandSlot;
            } else {
                slotName = activeSlots.find(s => {
                    const sKey = s.toLowerCase();
                    if (sKey === rawItemType) return true;
                    if (sKey === 'mainhand' && rawItemType === 'tool') return true;
                    return false;
                });
            }
            
            if (!slotName) {
                console.warn("Could not auto-determine slot for item.");
                return null;
            }
        }

        // --- TWO-HANDED RULE ENFORCEMENT ---
        if (itemTypeNormalized === 'twohand') {
            slotName = mainHandSlot; 
            if (currentOffItem) {
                member.unequipItem(offHandSlot);
                gameState.party.inventory.push(currentOffItem);
            }
        }
        
        if (slotName.toLowerCase() === 'offhand' && isMainTwoHanded) {
            member.unequipItem(mainHandSlot);
            gameState.party.inventory.push(currentMainItem);
        }
        
        // --- EXECUTION ---
        const currentEquip = member.equipment[slotName];
        
        if (currentEquip && currentEquip !== inventoryItem) {
            gameState.party.inventory.push(currentEquip); 
        }

        const bagIdx = gameState.party.inventory.indexOf(inventoryItem);
        if (bagIdx > -1) {
            gameState.party.inventory.splice(bagIdx, 1);
        }

        member.equipItem(slotName, inventoryItem);
        return slotName;
    }

    unequipSlot(slotName) {
        if (this.readOnly) return false; 
        const member = this.currentMember;
        const currentEquip = member.equipment[slotName];

        if (currentEquip) {
            member.unequipItem(slotName);
            gameState.party.inventory.push(currentEquip); 
            return true;
        }
        return false;
    }

    getDerivedStats() {
        const member = this.currentMember; 
        const computedStats = StatCalculator.calculate(member);
        const baseSource = member.state ? member.state.stats : (member.attributes || {});
        
        const formatStat = (key, currentVal) => {
            const base = baseSource[key] || 0;
            return {
                base: base,
                bonus: (currentVal - base),
                total: currentVal
            };
        };

        return {
            ...computedStats,
            maxHp: formatStat('maxHp', computedStats.maxHp || member.maxHp),
            maxStamina: formatStat('maxStamina', computedStats.maxStamina || member.maxStamina),
            maxInsight: formatStat('maxInsight', computedStats.maxInsight || member.maxInsight)
        };
    }

    compileAbilities() {
        const member = this.currentMember;
        const abilityMap = new Map();

        if (member.equipment) {
            for (const [slot, item] of Object.entries(member.equipment)) {
                if (!item) continue;
                
                const def = ItemDefinitions[item.defId];
                const grantedAbilities = (def && (def.abilities || def.grantedAbilities)) || [];
                
                grantedAbilities.forEach(ability => {
                    const id = typeof ability === 'string' ? ability : ability.id;
                    const abilityData = typeof ability === 'object' ? ability : { id, name: id };

                    abilityMap.set(id, {
                        ...abilityData,
                        source: def.name || item.defId,
                        sourceSlot: slot,
                        isEquipment: true
                    });
                });
            }
        }

        const intrinsicAbilities = member.abilities || (member.template && member.template.abilities) || [];
        
        intrinsicAbilities.forEach(ability => {
            const id = typeof ability === 'string' ? ability : ability.id;
            const abilityData = typeof ability === 'object' ? ability : { id, name: id };
            
            if (!abilityMap.has(id)) {
                abilityMap.set(id, {
                    ...abilityData,
                    source: 'Intrinsic',
                    isEquipment: false
                });
            }
        });

        return Array.from(abilityMap.values());
    }
    dropItem(item, amount = 1) {
        if (this.readOnly) return false;

        const bagIdx = gameState.party.inventory.indexOf(item);
        if (bagIdx > -1) {
            if (item.qty > 1) {
                item.qty -= amount;
                // If they dropped the whole stack, remove it from the array
                if (item.qty <= 0) {
                    gameState.party.inventory.splice(bagIdx, 1);
                }
            } else {
                // Unstackable or only 1 left
                gameState.party.inventory.splice(bagIdx, 1);
            }
            return true;
        }
        return false;
    }

    useItem(item, targetMember) {
        if (this.readOnly) return false;
        
        const def = ItemDefinitions[item.defId];
        if (!def) return false;

        // TODO: Apply the item's actual effects to targetMember here
        // Example: targetMember.heal(def.healAmount);

        // After successful use, consume 1 from inventory
        return this.dropItem(item, 1);
    }
}
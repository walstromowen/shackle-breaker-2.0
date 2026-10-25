/**
 * First-visit control tips, one card per screen. Shown once by TutorialOverlay the first time a screen opens after the prologue
 * (Settings > Replay Tips shows them all again).
 *
 * Each card has a `label` (the short name on its Settings > Controls tab), a `title`, an `intro` line and its rows.
 * A row is  { keys: ['W', 'A', 'S', 'D'], text: 'Walk around' }.
 *   - keys are drawn as little key caps; 'or' between two keys is drawn as plain text, '/' too.
 *   - Mouse actions use the words 'Click', 'Right-click', 'Hover', 'Wheel', 'Drag'.
 * Keep a card to 4-7 rows. The key names here must match the controllers' bindings (overworldController MENU_KEYS,
 * battleController BATTLE_KEYS, characterSummaryController, baseController INTENT_BINDINGS) - tips.test.js checks the shape only.
 */

export const TIPS = {
    overworld: {
        label: 'World',
        title: 'Exploring the World',
        intro: 'The road stretches on. Where it ends, you do not yet know.',
        rows: [
            { keys: ['W', 'A', 'S', 'D'], text: 'Walk (the arrow keys work too)' },
            { keys: ['Space'], text: 'Talk to, open or use whatever is in front of you (Enter works too)' },
            { keys: ['Esc'], text: 'Open the menu (Esc again closes it), or click the menu button' },
            { keys: ['P', 'C', 'J', 'M', 'B', 'O'], text: 'Shortcuts: Party, Character, Journal, world Map (M), crafting Bag, System (save / load / quit)' },
            { keys: ['1', '-', '9', '0'], text: 'Use the item in that hotbar slot' }
        ]
    },

    encounter: {
        label: 'Encounters',
        title: 'Encounters',
        intro: 'Not every meeting on the road ends in blood. Choose with care: the road remembers.',
        rows: [
            { keys: ['Click'], text: 'Choose an option (Space or Enter picks the highlighted one)' },
            { keys: ['W', 'S'], text: 'Move between options (the up and down arrows work too)' },
            { keys: ['Space'], text: 'Tap to finish the text as it types out, tap again to move on' },
            { keys: ['Hover'], text: 'Point at an attribute shown on an option to see what it does' },
            { keys: ['Wheel'], text: 'Scroll long text' }
        ]
    },

    battle: {
        label: 'Battle',
        title: 'Battle',
        intro: 'Steel costs Stamina, spells cost Insight. Turns fall to the quick. Spend either carelessly and the road collects.',
        rows: [
            { keys: ['A', 'D'], text: 'Pick an ability (the left and right arrows work too)' },
            { keys: ['Space'], text: 'Confirm the ability, then confirm its target (Enter works too)' },
            { keys: ['Esc'], text: 'Step back, or right-click' },
            { keys: ['Shift'], text: 'Show or hide the details of the highlighted ability (H works too)' },
            { keys: ['P'], text: 'Swap the member whose turn it is with a reserve' },
            { keys: ['I'], text: 'Open your items mid-fight' }
        ]
    },

    party: {
        label: 'Party',
        title: 'Your Party',
        intro: 'You were not the only one in chains. Three fight at the front; the rest wait in reserve.',
        rows: [
            { keys: ['Click'], text: 'Select a member, then choose Summary, Move, Exile or Spend Skill Points' },
            { keys: ['Drag'], text: 'Drag a card to reorder the party (or use Move)' },
            { keys: ['W', 'A', 'S', 'D'], text: 'Move the highlight, Space to select' },
            { keys: ['Esc'], text: 'Go back to the world (P works too)' }
        ]
    },

    character_summary: {
        label: 'Character',
        title: 'Character Summary',
        intro: 'Take stock of what the iron has left you.',
        rows: [
            { keys: ['V'], text: 'Switch between the Stats, Items and Skills views' },
            { keys: ['Q', 'E'], text: 'Previous / next character' },
            { keys: ['Hover'], text: 'Point at an attribute to see what it does' },
            { keys: ['Drag'], text: 'Drag an item onto a gear slot to equip it' },
            { keys: ['W', 'A', 'S', 'D'], text: 'Move the highlight; Space opens an item’s menu (Drop Multiple has a slider)' },
            { keys: ['X'], text: 'Unequip the highlighted item (Delete works too)' }
        ]
    },

    level_up: {
        label: 'Level Up',
        title: 'Level Up',
        intro: 'Every trial leaves its mark. Choose what keeps you whole. Nothing is final until you confirm.',
        rows: [
            { keys: ['W', 'S'], text: 'Choose an attribute' },
            { keys: ['A', 'D'], text: 'Take a point off / put a point on it (or click the − and + buttons)' },
            { keys: ['Hover'], text: 'Point at an attribute to see what each point does' },
            { keys: ['Enter'], text: 'Confirm your choices; Reset starts over' }
        ]
    },

    journal: {
        label: 'Journal',
        title: 'Journal',
        intro: 'What you remember is little. Here is what you have learned since.',
        rows: [
            { keys: ['Click'], text: 'Switch between Active Quests and the Chronicle, or pick a quest to read it' },
            { keys: ['W', 'S'], text: 'Move through the list' },
            { keys: ['Wheel'], text: 'Scroll a long list' },
            { keys: ['Esc'], text: 'Back to the world (J works too)' }
        ]
    },

    world_map: {
        label: 'World Map',
        title: 'The World Map',
        intro: 'Only the land you have walked is drawn. The rest is still a rumour.',
        rows: [
            { keys: ['Arrows'], text: 'Pan the map (W A S D work too; hold Shift to go faster)' },
            { keys: ['Q', 'E'], text: 'Zoom out / in (the minus and plus keys work too), or use the wheel over the map' },
            { keys: ['Drag'], text: 'Drag the map with the mouse' },
            { keys: ['F'], text: 'Fit everything you have seen on the screen' },
            { keys: ['C'], text: 'Center the map on your party (Space works too)' },
            { keys: ['Esc'], text: 'Back to the world (M works too), or right-click' }
        ]
    },

    shop: {
        label: 'Shop',
        title: 'Shop',
        intro: 'Coin is coin, even to the cursed.',
        rows: [
            { keys: ['Click'], text: 'Select an item; Space opens its options (Buy or Sell; Multiple has a slider)' },
            { keys: ['W', 'A', 'S', 'D'], text: 'Move through the stock' },
            { keys: ['Wheel'], text: 'Scroll a long list' },
            { keys: ['Esc'], text: 'Leave the shop, or right-click' }
        ]
    },

    workshop: {
        label: 'Crafting',
        title: 'Crafting',
        intro: 'The shackles stay locked, but the hands are still your own.',
        rows: [
            { keys: ['Click'], text: 'Select a recipe or an item to see what it needs' },
            { keys: ['Space'], text: 'Craft or Upgrade the selected entry' },
            { keys: ['W', 'S'], text: 'Move through the list' },
            { keys: ['Esc'], text: 'Close, or right-click' }
        ]
    },

    saves: {
        label: 'System',
        title: 'System',
        intro: 'Mark your place on the road, or leave it for now.',
        rows: [
            { keys: ['Click'], text: 'Choose the Save or Load tab, then a slot' },
            { keys: ['W', 'S'], text: 'Move through the slots, Space to pick one' },
            { keys: ['Esc'], text: 'Close this menu (O works too)' },
            { keys: ['Click'], text: 'Settings changes volume; Quit to Title leaves the game' }
        ]
    },

    settings: {
        label: 'Settings',
        title: 'Settings',
        intro: 'Quiet the world, or let it roar.',
        rows: [
            { keys: ['W', 'S'], text: 'Choose a setting' },
            { keys: ['A', 'D'], text: 'Lower / raise a volume by 5% (or drag the slider)' },
            { keys: ['Q', 'E'], text: 'Switch between the Sound and Controls tabs' },
            { keys: ['Click'], text: 'Test Sound plays a sample; Reset restores the defaults; Replay Tips (on Controls) shows the cards again' },
            { keys: ['Esc'], text: 'Go back to the previous screen' }
        ]
    }
};

export const TIP_SCENES = Object.keys(TIPS);

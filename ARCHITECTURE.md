# Where things go

The game is a canvas RPG in three workspaces: `shared/` (the game itself), `frontend/` (the browser that shows it) and `backend/` (accounts, cloud saves, and the web server that also serves the game files).

## The one question

> **Does it need a browser?** Canvas, keys, the mouse, sound, `localStorage`, `document`.
>
> **No** -> `shared/<feature>/`. **Yes** -> `frontend/src/`.

`shared/` never imports from `frontend/` or `backend/` and never touches a browser API, so everything in it runs under `node --test` with no screen. `backend/test/architecture.test.js` checks this, along with the other rules below.

## `shared/`: rules and data, one folder per feature

| Folder | What lives here |
|---|---|
| `core/` | What everything uses: `gameState`, `constants`, the `eventBus`, text and number formatting. |
| `battle/` | Fighting: `turnManager` (plays the turn queue), `battleQueue` (builds turns: deaths, swaps, fleeing, victory), `battleState` (the state object, recovery, the ledger), `enemyAI`, `targetingResolver`, `combatCalculator`, `combatantModel`, `battleRewardSystem`, the spawn tables (which enemies appear), and `animation/` (the battle animation data and model). |
| `abilities/` | Abilities, status effects and traits: their definitions, models, factories and `abilitySystem`. |
| `characters/` | Entities (the player, companions, enemies): definitions, model, factory, `statCalculator`, XP, the party, the stat descriptions. |
| `items/` | Items, inventory, upgrading, crafting recipes, loot tables. |
| `world/` | The map: `worldManager` (chunks, objects, collision), `terrainGenerator`, biomes, map objects, weather, the clock, `structures` (the data for villages and graveyards), `villagePlanner` and `structureSpawner` (the code that builds them), interiors and their `generators/`. |
| `story/` | Encounters (`encounters/` has one file each), quests, and the acts. |

Inside a folder the file name says what it is:

- `*Definitions.js` is plain data. Tune the game here.
- `*Model.js` is one live thing built from a definition. `*Factory.js` builds it.
- `*System.js` and `*Manager.js` hold rules that work on the game state.

## `frontend/src/`: what the player sees and presses

| Folder | What lives here |
|---|---|
| `screens/<screen>/` | One folder per screen: `<screen>Controller.js` (input and flow), `<screen>Renderer.js` (drawing), `<screen>Logic.js` (rules the screen needs that are not in `shared/`), and `components/` for its pieces. |
| `engine/` | What runs the screens: `sceneManager` (picks the screen), `input`, `gameLoop`, `audioManager`, `assetLoader`, `baseController`, `saveManager`, scene transitions. |
| `ui/` | Drawing tools many screens share: `canvasUI`, `UITheme`, tooltips, the tutorial, chips. |
| `auth/` | The login screen and the account / cloud save client. |
| `assets/` | Pictures, sounds and fonts. Everything in here is shipped to players. |
| `main.js` | Loads the assets (the manifest) and starts the game. |

A screen never imports another screen. If two screens need the same piece, it belongs in `ui/` (drawing) or `engine/` (machinery). Only `sceneManager.js` and `main.js` know about every screen.

### The battle, as an example of the split

The battle is one thing in two places, side by side in the same relative spot:

- `shared/battle/` is the fight itself: whose turn, what an attack does, what the enemy picks, what a death queues. No screen needed.
- `frontend/src/screens/battle/` is the player's side: reading keys and clicks (`battleController`), the target cursor (`targetSelection`), and drawing the field (`battleRenderer`, `battleHUDRenderer` and friends).

## Adding something

| To add | Do this |
|---|---|
| An enemy or companion | `shared/characters/entityDefinitions.js`; the sprite in `assets/sprites/<name>/` and its entry in `main.js`; put it in a table in `shared/battle/spawnTableDefinitions.js` so it appears. |
| An ability | `shared/abilities/abilityDefinitions.js`; its animation in `shared/battle/animation/battleAnimationDefinition.js`. |
| An item | `shared/items/itemDefinitions.js` (+ a loot table or recipe if it should drop or be crafted). |
| A map object | `shared/world/mapObjectDefinitions.js`; the sheet in `assets/mapObjects/` and in `main.js`; spawn it from a biome in `shared/world/biomeDefinitions.js` or a structure in `structures.js`. |
| An encounter | A file in `shared/story/encounters/`, registered in `shared/story/encounterDefinitions.js`; its picture sheet in `assets/icons/encounters/` and in `main.js`. |
| A screen | A folder in `frontend/src/screens/` with a controller and a renderer, and a line in `engine/sceneManager.js`. |
| A test | `backend/test/<topic>.test.js`. The tests live here because `backend` is the workspace that runs `npm test`; they cover `shared/` and `frontend/` too. |

## Checks

- `npm test` runs everything, including the folder rules above (`architecture.test.js`) and a scripted battle (`battle.test.js`).
- `npm run check:paths` finds import and asset paths with the wrong upper / lower case (Windows and macOS don't care, the Render host does).

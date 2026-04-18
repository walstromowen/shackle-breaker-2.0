# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

enhance battle animations / polish
clicking functionality across screens
particleRenderer (global)
crafting system.
Difficulty
Starting seed
procedural dungeons and hand crafted areas
structures: 
Biome dependent generation

Root
├── backend/
├── frontend/                  
│   ├── src/
│   │   ├── assets/
│   │   │   ├── sprites/
│   │   │   └── tilesets/
│   │   ├── controllers/       
│   │   │   ├── characterSummaryController.js     
│   │   │   ├── encounterController.js
│   │   │   ├── battleController.js
│   │   │   ├── characterCreatorController.js
|   |   │   ├── partyController.js
|   |   │   ├── levelUpController.js
│   │   │   └── overworldController.js
│   │   ├── core/
│   │   │   ├── assetLoader.js
│   │   │   ├── audioManager.js
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   └── sceneManager.js
│   │   ├── renderers/
│   │   │   ├── battle/
│   │   │   │    ├── battleRenderer.js
│   │   │   │    ├── battleCombatantRenderer.js
│   │   │   │    ├── battleHUDRenderer.js
│   │   │   │    ├── battleVFXRenderer.js
│   │   │   ├── encounter/
│   │   │   │    ├── encounterRenderer.js
│   │   │   ├── transitions/
│   │   │   │    ├── transitionRenderer.js
│   │   │   ├── overworld/
│   │   │   │    ├── lightningRenderer.js
│   │   │   │    ├── mapRenderer.js
│   │   │   │    ├── weatherRenderer.js
│   │   │   ├── characterCreator/        
│   │   │   │    └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │    ├── characterSummaryRenderer.js
│   │   │   │    ├── components/
│   │   │   │    │    ├── abilitiesPanel.js   
│   │   │   │    │    ├── statsPanel.js                
│   │   │   │    │    ├── itemDetailPanel.js          
│   │   │   │    │    ├── equipmentPanel.js            
│   │   │   │    │    ├── inventoryPanel.js            
│   │   │   │    │    └── tooltipSystem.js 
│   │   │   ├── characterSummary/  
│   │   │   │    │    ├── levelUpRenderer.js   
|   |   │   ├── ui 
│   │   │   │    ├── contextMenuManager.js
│   │   │   │    ├── dragAndDropManager.js
│   │   │   │    ├── scrollManager.js
│   │   │   │    ├── UITheme.js
│   │   │   │    └── canvasUI.js      
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json      
├── shared/ 
│   ├── data/  
│   │   ├── battleAnimationDefinitions.js                     
│   │   ├── encounters/
│   │   ├── traitDefinitions.js 
│   │   ├── abilityDefinitions.js   
│   │   ├── statusEffectDefinitions.js 
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjectDefinitions.js
│   │   └── weatherDefinitions.js
│   ├── models/ 
|   │   ├── abilityModel.js   
|   │   ├── combatantModel.js   
│   │   ├── battleAnimationModel.js                  
│   │   ├── entityModel.js 
│   │   ├── statusEffectModel.js 
│   │   ├── mapObjectModel.js    
│   │   ├── weatherModel.js             
│   │   └── itemModel.js                 
│   ├── state/
│   │   └── gameState.js            
│   ├── systems/
│   │   ├── factories/  
│   │   │   ├── abilityFactory.js   
│   │   │   ├── battleAnimationFactory.js             
│   │   │   ├── entityFactory.js 
│   │   │   ├── statusEffectFactory.js 
│   │   │   ├── mapObjectFactory.js 
│   │   │   ├── weatherFactory.js      
│   │   │   └── itemFactory.js
│   │   ├── abilitySystem.js
│   │   ├── turnManager.js
│   │   ├── battleRewardSystem.js
│   │   ├── targetingResolver.js
│   │   ├── itemUpgradeSystem.js  
│   │   ├── combatCalculator.js  
│   │   ├── experienceSystem.js  
│   │   ├── statCalculator.js    
│   │   ├── partyManager.js         
│   │   ├── timeSystem.js
│   │   └── worldManager.js
│   ├── utils/
│   │   ├── textEntry.js
│   │   ├── formatting.js
├── .gitignore/ 
├── LICENSE/ 
├── package-lock.json 
├── package.json
└── README.md



This is a fantastic technical debt to tackle now. Setting this up will make building every future screen (shops, dialog boxes, combat menus) ten times faster.

Here is your high-level roadmap to transitioning your game to a universal, decoupled interaction system.

Step 1: Decouple Your UI Managers (The "Tools")
Before we can centralize your input, your UI tools need to stop relying on CharacterSummaryController. They need to become generic utilities that any screen can use.

ScrollManager: Refactor it to hold a generic list of scrollable zones (with x, y, w, h bounds). When a user scrolls inside a zone, it should fire a callback function (e.g., onScroll(newOffset)) rather than modifying controller variables directly.

DragAndDropManager: It should manage the visual state of dragging an item, but the result of the drop should just fire a callback: onDrop(item, targetHitboxId). The controller decides if that drop is valid.

ContextMenuManager: It should accept a raw data object, an x/y coordinate, and an array of options with callbacks when opened, rather than digging into the game state to figure out what options to show.

Step 2: Build the UIInteractionManager (The "Translator")
Create a new file (e.g., frontend/src/ui/UIInteractionManager.js). This class sits exactly between your raw Input.js and your active screen.

It grabs raw data from Input.js (mouse position, left click, right click, scroll delta).

It reads the current hitboxes provided by the active screen.

It handles the generic UI math: "Did the user move the mouse 10 pixels while holding click? That's a drag." or "Did the user release the mouse without moving? That's a click."

It translates those raw actions into semantic events and passes them down.

Step 3: Define a Standard Interface for Screens
Every controller in your frontend/src/controllers/ folder needs to speak the same language. You should decide on a standard set of methods that the UIInteractionManager will look for and execute if they exist on the active screen.

onHover(hitboxId)

onClick(hitboxId)

onRightClick(hitboxId)

onDragStart(hitboxId)

onDrop(hitboxId, targetHitboxId)

Step 4: Wire it Together in SceneManager
Your SceneManager (or GameLoop) becomes the traffic cop. Every frame, it should:

Ask Input.js for raw updates.

Feed those updates to the UIInteractionManager.

The UIInteractionManager talks to the UI tools (Scroll, Drag, Context) and checks hitboxes.

The UIInteractionManager fires the standardized methods (like onClick) on whatever screen is currently active in the SceneManager.

The New Architecture Flow
Plaintext
[ Hardware/Browser ]
        |
        v
[ core/Input.js ] (Raw coords, button states)
        |
        v
[ ui/UIInteractionManager.js ] (Hitbox math, Click vs. Drag detection)
        |
        +---> Consults generic [ ScrollManager ], [ DragAndDropManager ], etc.
        |
        v
[ controllers/ANY_Controller.js ] (Receives clean events: onClick('IRON_SWORD'))
        |
        v
[ shared/state/gameState.js ] (Updates actual game logic)
This ensures your controllers only handle game rules, your UI tools only handle UI math, and your input file only handles browser events.

Which of these steps would you like to dive into first? I recommend starting with Step 1 (Decoupling a specific UI Manager) or Step 2 (Drafting the UIInteractionManager).
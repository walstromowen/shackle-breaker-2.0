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
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryController.js 
│   │   │   │   └── characterSummaryLogic.js    
│   │   │   ├── encounter/
│   │   │   ├── chore/
│   │   │   │   └── baseController.js  
│   │   │   ├── encounter/
│   │   │   │   ├── encounterController.js
│   │   │   │   └── encounterLogic.js
│   │   │   ├── battle/
│   │   │   │   ├── battleController.js
│   │   │   │   └── battleLogic.js
│   │   │   ├── characterCreator/
│   │   │   │   ├── characterCreatorController.js
│   │   │   │   └── characterCreatorLogic.js
│   │   │   ├── party/
│   │   │   │   ├── partyController.js
│   │   │   │   └── partyLogic.js
│   │   │   ├── levelUp/
│   │   │   │   ├── levelUpController.js
│   │   │   │   └── levelUpLogic.js
│   │   │   └── overworld/
│   │   │       ├── overworldController.js
│   │   │       └── overworldLogic.js
│   │   ├── core/
│   │   │   ├── assetLoader.js
│   │   │   ├── audioManager.js
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   ├── sceneManager.js
│   │   │   └── UIInteractionManager.js
│   │   ├── renderers/
│   │   │   ├── battle/
│   │   │   │   ├── battleRenderer.js
│   │   │   │   ├── battleCombatantRenderer.js
│   │   │   │   ├── battleHUDRenderer.js
│   │   │   │   └── battleVFXRenderer.js
│   │   │   ├── encounter/
│   │   │   │   └── encounterRenderer.js
│   │   │   ├── transitions/
│   │   │   │   └── transitionRenderer.js
│   │   │   ├── overworld/
│   │   │   │   ├── lightningRenderer.js
│   │   │   │   ├── mapRenderer.js
│   │   │   │   └── weatherRenderer.js
│   │   │   ├── characterCreator/        
│   │   │   │   └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryRenderer.js
│   │   │   │   └── components/
│   │   │   │       ├── abilitiesPanel.js   
│   │   │   │       ├── statsPanel.js                
│   │   │   │       ├── itemDetailPanel.js          
│   │   │   │       ├── equipmentPanel.js            
│   │   │   │       ├── inventoryPanel.js            
│   │   │   │       └── tooltipSystem.js 
│   │   │   ├── levelUp/  
│   │   │   │   └── levelUpRenderer.js   
│   │   │   └── ui/ 
│   │   │       ├── contextMenuManager.js
│   │   │       ├── dragAndDropManager.js
│   │   │       ├── scrollManager.js
│   │   │       ├── UITheme.js
│   │   │       └── canvasUI.js      
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json      
├── shared/ 
│   ├── data/  
│   │   ├── battleAnimationDefinitions.js                     
│   │   ├── traitDefinitions.js 
│   │   ├── abilityDefinitions.js   
│   │   ├── statusEffectDefinitions.js 
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjectDefinitions.js
│   │   └── weatherDefinitions.js
│   ├── models/ 
│   │   ├── abilityModel.js   
│   │   ├── combatantModel.js   
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
│   │   └── formatting.js
├── .gitignore 
├── LICENSE 
├── package-lock.json 
├── package.json
└── README.md

IMPORTANT!!!!
ou finished step 1 and step 2 (you are working out step 3 and trying to implement step 4 on the character summary screen)


This is a fantastic technical debt to tackle now. Setting this up will make building every future screen (shops, dialog boxes, combat menus) ten times faster.

Here is your high-level roadmap to transitioning your game to a universal, decoupled interaction system.



Step 3: Define a Standard Interface for Screens
Every controller in your frontend/src/controllers/ folder needs to speak the same language. You should decide on a standard set of methods that the UIInteractionManager will look for and execute if they exist on the active screen.

onHover(hitboxId)

onClick(hitboxId)

onRightClick(hitboxId)

onDragStart(hitboxId)

onDrop(hitboxId, targetHitboxId)

scrolling stuff?

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
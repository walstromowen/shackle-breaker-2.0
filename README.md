# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

Weather Turn logic
combat calculator fix (currently all blunt damage)
enhance battle animations
weather animations in battle
Fix character summary screen
two handed items
clicking functionality across screens
encounters(or new name)
particleRenderer (global)
item leveling and upgrading
crafting
charcter leveling and scaling
Difficulty
Starting seed
procedural dungeons and hand crafted areas
items being used in summary screen no longer work

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
│   │   │   │    │    ├── statsPanel.js                
│   │   │   │    │    ├── itemDetailPanel.js          
│   │   │   │    │    ├── equipmentPanel.js            
│   │   │   │    │    ├── inventoryPanel.js            
│   │   │   │    │    └── tooltipSystem.js   
|   |   │   ├── ui 
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
│   ├── registries/
│   │   └── encounterRegistry.js
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
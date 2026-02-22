# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom



TODO: Controlls freexe on switching from the overworld: return to a locked overworld (cannot move)
Just incorporated spritesheet portrait.

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
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   └── sceneManager.js
│   │   ├── renderers/
│   │   │   ├── battle/
│   │   │   │    ├── battleRenderer.js
│   │   │   ├── encounter/
│   │   │   │    ├── encounterRenderer.js
│   │   │   ├── transitions/
│   │   │   │    ├── transitionRenderer.js
│   │   │   ├── overworld/
│   │   │   │    ├── entityRenderer.js
│   │   │   │    ├── lightningRenderer.js
│   │   │   │    ├── mapRenderer.js
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
│   │   ├── encounters/
│   │   ├── traitDefinitions.js 
│   │   ├── abilityDefinitions.js   
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjects.js
│   │   └── sprites.js
│   ├── models/ 
|   │   ├── abilityModel.js                     
│   │   ├── entityModel.js               
│   │   └── itemModel.js                 
│   ├── registries/
│   │   └── encounterRegistry.js
│   ├── state/
|   │   ├── battleState.js
│   │   └── gameState.js            
│   ├── systems/
│   │   ├── factories/  
│   │   │   ├── abilityFactory.js                
│   │   │   ├── entityFactory.js    
│   │   │   └── itemFactory.js
│   │   ├── abilitySystem.js
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


 
Phase 1: The Basics
[ ] Cost Deduction: Stamina, Insight, and Items.

[ ] Targeting Scopes: Single, Random, Splash (adjacent), All Enemies, All Allies, Self.

[ ] Accuracy/Evasion: Calculating hit chance before applying effects.

Phase 2: Health & Damage
[ ] Standard Damage: Power multipliers, Elemental typing.

[ ] Alternate Damage: Stat scaling overrides (e.g., Defense vs Defense), Percent of Current HP.

[ ] Healing & Recovery: Flat recovery, Percent of Max recovery, Setting exact values (e.g., set HP to 1).

[ ] Damage Modifiers: Conditional bonuses (e.g., target HP < 30%), Lifesteal/Drain, Recoil damage.

Phase 3: Action Economy & Turn Order
[ ] Speed Modifiers: Altering turn priority for specific moves.

[ ] Multi-Hit & Multi-Target: Hitting repeatedly or distributing hits among random targets.

[ ] Multi-Turn Actions: Charging on Turn 1 and executing on Turn 2.

[ ] Recharge Penalties: Forcing the user to skip their next turn after a massive attack.

Phase 4: Status Effects
[ ] Target Debuffs: Applying ailments (Poison, Bleed, Bound) and stat drops.

[ ] Self Buffs: Applying positive statuses (Evasion Up, Counter Ready, Trap Set).

[ ] Purify: Dispelling specific ailment tags.

Phase 5: Advanced Tactics
[ ] Party Switching: Standard swapping, Hit & Run, and Baton Pass (transferring buffs).

[ ] Summons: Spawning new autonomous entities onto the field.

[ ] Transformations: Temporarily replacing the user's stats and sprites.

[ ] Fleeing: Attempting to escape the battle.
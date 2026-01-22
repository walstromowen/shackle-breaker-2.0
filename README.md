# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

Root
├── backend/
├── frontend/                  
│   ├── src/
│   │   ├── assets/
│   │   │   ├── sprites/
│   │   │   └── tilesets/
│   │   ├── controllers/            
│   │   │   ├── encounterController.js
│   │   │   ├── battleController.js
│   │   │   ├── characterCreatorController.js
│   │   │   └── overworldController.js
│   │   ├── core/
│   │   │   ├── assetLoader.js
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   └── sceneManager.js
│   │   ├── renderers/
│   │   │   ├── encounter/
│   │   │   ├── transitions/
│   │   │   │    ├── transitionRenderer.js
│   │   │   └── overworld/
│   │   │   │    ├── entityRenderer.js
│   │   │   │    ├── lightningRenderer.js
│   │   │   │    ├── mapRenderer.js
│   │   │   ├── characterCreator/        
│   │   │   │    └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │    └── characterSummaryRenderer.js
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json      
├── shared/ 
│   ├── data/                       
│   │   ├── encounters/
│   │   ├── abilityDefinitions.js   
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjects.js
│   │   └── sprites.js
│   ├── models/                    
│   │   ├── entityModel.js               
│   │   └── itemModel.js                 
│   ├── registries/
│   │   └── encounterRegistry.js
│   ├── state/
│   │   └── gameState.js            
│   ├── systems/
│   │   ├── factories/              
│   │   │   ├── entityFactory.js    
│   │   │   └── itemFactory.js
│   │   ├── experienceSystem.js     
│   │   ├── partyManager.js         
│   │   ├── timeSystem.js
│   │   └── worldManager.js
│   ├── utils/
│   │   ├── textEntry.js
├── .gitignore/ 
├── LICENSE/ 
├── package-lock.json 
├── package.json
└── README.md


Does it handle keyboard/mouse? -> Controller.

Does it save/load global data (Gold, Party)? -> Manager.

Is it a rule of the universe (Gravity, Time, Light)? -> System.

Is it a specific object (Sword, Enemy, Player)? -> Model.

Is it a tiny function for a specific event? -> Handler.



Methods needed in worldManager

overworldController.js
    this.worldManager.getTileAt()
    this.worldManager.canMove()
    this.worldManager.findSpawnPoint()

mapRenderer.js
    worldManager.getTileAt()
    worldManager.getTileData();
    worldManager.getSpecificMask();
    worldManager.getActiveObjects()

sceneManager.js
    this.worldManager.getVisibleObjects()


Mask: 0, Index: 42
Mask: 1, Index: 32
Mask: 4, Index: 43
Mask: 16, Index: 24
Mask: 64, Index: 44
Mask: 17, Index: 40
Mask: 68, Index: 41
Mask: 5, Index: 11
Mask: 20, Index: 3
Mask: 80, Index: 4
Mask: 65, Index: 12
Mask: 21, Index: 1
Mask: 84, Index: 8
Mask: 81, Index: 2
Mask: 69, Index: 16
Mask: 85, Index: 38

Mask: 7, Index: 21
Mask: 28, Index: 5
Mask: 112, Index: 7
Mask: 193, Index: 23
Mask: 31, Index: 13
Mask: 124, Index: 6
Mask: 241, Index: 15
Mask: 199, Index: 22
Mask: 255, Index: 14

Mask: 23, Index: 25
Mask: 29, Index: 33
Mask: 71, Index: 17
Mask: 87, Index: 27
Mask: 92, Index: 10
Mask: 93, Index: 19
Mask: 95, Index: 39
Mask: 113, Index: 34
Mask: 117, Index: 20
Mask: 119, Index: 36
Mask: 125, Index: 46
Mask: 127, Index: 39
Mask: 197, Index: 17
Mask: 209, Index: 26
Mask: 213, Index: 28
Mask: 223, Index: 30

Mask: 247, Index: 47
Mask: 253, Index: 29
Mask: 254, Index: 31

Mask: 121, Index: 46
Mask: 245, Index: 45
Mask: 251, Index: 31


        this.name 
        this.type 
        this.appearance 
        this.size 
        this.level
        this.vigor 
        this.strength 
        this.dexterity
        this.intelligence
        this.attunement 

       
        maxHP 
        maxStamina 
        maxMagic 
        baseHpRecovery 
        baseStaminaRecovery 
        baseMagicRecovery 
        baseBluntAttack 
        basePierceAttack 
        baseArcaneAttack 
        baseElementalAttack 
        this.baseBluntDefense 
        this.basePierceDefense 
        this.baseArcaneDefense 
        this.baseElementalDefense 
        this.baseBluntResistance 
        this.basePierceResistance 
        this.baseArcaneResistance 
        this.baseElementalResistance
        this.baseSpeed 
        this.baseEvasion 
        this.baseCritical 

        
       
        this.currentHP 
        this.currentStamina 
        this.currentMagic 
        this.currentHpRecovery 
        this.currentStaminaRecovery 
        this.currentMagicRecovery 
        this.currentBluntAttack 
        this.currentPierceAttack 
        this.currentArcaneAttack 
        this.currentElementalAttack 
        this.currentBluntDefense 
        this.currentPierceDefense
        this.currentArcaneDefense 
        this.currentElementalDefense 
        this.currentBluntResistance 
        this.currentPierceResistance 
        this.currentArcaneResistance 
        this.currentElementalResistance 


        this.currentSpeed 
        this.currentEvasion 
        this.currentCritical 
        this.currentCorruption 

        this.currentXP = config.currentXP || 0;
        this.skillPoints = config.skillPoints || 0;

        this.equipment = config.equipment || 
        {
            mainHand: '',
            offhand: '',
            head: '',
            torso: '',
            arms: '',
            legs: '',
            feet: '',
        }; 
        this.statusEffectArray

        this.abilityArray 
        this.uuid
        
        this.immunities 
        this.factions ss
        this.lootTable 
        




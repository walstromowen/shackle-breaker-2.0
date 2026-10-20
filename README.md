## [ShackleBreaker](https://shackle-breaker-2-0.onrender.com/frontend/src/index.html)
## [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

# PLANNED FEATURES
hand crafted areas
waypoints
party rendering on overworld

# REFINEMENTS
enhance battle animations / polish
particleRenderer revamped(global)
structures: 
flashing of sprites in battle renderer

# Bugs
shop system and character summary stacking equipables


Root
├── backend/
│   ├── scripts/
│   │   └── checkDb.js
│   ├── src/
│   │   ├── middleware/
│   │   │   └── requireAuth.js
│   │   ├── repos/
│   │   │   ├── memoryRepo.js
│   │   │   └── mongoRepo.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── saves.js
│   │   ├── util/
│   │   │   └── validate.js
│   │   ├── app.js
│   │   ├── config.js
│   │   └── server.js
│   ├── test/
│   │   └── api.test.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/   # sprites, tilesets, audio, icons, screens ...
│   │   ├── auth/
│   │   │   ├── apiConfig.js
│   │   │   ├── authGate.js
│   │   │   ├── authScreen.js
│   │   │   ├── authService.js
│   │   │   └── cloudSaveStore.js
│   │   ├── controllers/
│   │   │   ├── battle/
│   │   │   │   └── battleController.js
│   │   │   ├── boot/
│   │   │   │   └── bootController.js
│   │   │   ├── characterCreator/
│   │   │   │   ├── characterCreatorController.js
│   │   │   │   └── characterCreatorLogic.js
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryController.js
│   │   │   │   └── characterSummaryLogic.js
│   │   │   ├── core/
│   │   │   │   └── baseController.js
│   │   │   ├── encounter/
│   │   │   │   ├── encounterController.js
│   │   │   │   └── encounterLogic.js
│   │   │   ├── journal/
│   │   │   │   └── journalController.js
│   │   │   ├── levelUp/
│   │   │   │   └── levelUpController.js
│   │   │   ├── overworld/
│   │   │   │   └── overworldController.js
│   │   │   ├── party/
│   │   │   │   └── partyController.js
│   │   │   ├── saves/
│   │   │   │   └── savesController.js
│   │   │   ├── shop/
│   │   │   │   ├── shopController.js
│   │   │   │   └── shopLogic.js
│   │   │   ├── title/
│   │   │   │   └── titleController.js
│   │   │   └── workshop/
│   │   │       └── workshopController.js
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
│   │   │   │   ├── battleCombatantRenderer.js
│   │   │   │   ├── battleDebuggerRenderer.js
│   │   │   │   ├── battleHUDRenderer.js
│   │   │   │   ├── battleRenderer.js
│   │   │   │   ├── particle.js
│   │   │   │   └── VFXRenderer.js
│   │   │   ├── boot/
│   │   │   │   └── bootRenderer.js
│   │   │   ├── characterCreator/
│   │   │   │   └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │   ├── components/
│   │   │   │   │   ├── abilitiesPanel.js
│   │   │   │   │   ├── equipmentPanel.js
│   │   │   │   │   ├── inventoryPanel.js
│   │   │   │   │   ├── itemDetailPanel.js
│   │   │   │   │   ├── statsPanel.js
│   │   │   │   │   └── tooltipSystem.js
│   │   │   │   └── characterSummaryRenderer.js
│   │   │   ├── encounter/
│   │   │   │   └── encounterRenderer.js
│   │   │   ├── journal/
│   │   │   │   └── journalRenderer.js
│   │   │   ├── levelUp/
│   │   │   │   └── levelUpRenderer.js
│   │   │   ├── overworld/
│   │   │   │   ├── blobTerrainRenderer.js
│   │   │   │   ├── blobTerrainTables.js
│   │   │   │   ├── lightingRenderer.js
│   │   │   │   ├── mapRenderer.js
│   │   │   │   ├── minimapRenderer.js
│   │   │   │   ├── overworldUIRenderer.js
│   │   │   │   └── weatherRenderer.js
│   │   │   ├── party/
│   │   │   │   └── partyRenderer.js
│   │   │   ├── saves/
│   │   │   │   └── savesRenderer.js
│   │   │   ├── shop/
│   │   │   │   └── shopRenderer.js
│   │   │   ├── title/
│   │   │   │   └── titleRenderer.js
│   │   │   ├── transitions/
│   │   │   │   └── transitionRenderer.js
│   │   │   └── workshop/
│   │   │       ├── components/
│   │   │       │   ├── workshopBaseRenderer.js
│   │   │       │   ├── workshopDetailsRenderer.js
│   │   │       │   ├── workshopInventoryRenderer.js
│   │   │       │   └── workshopRecipeRenderer.js
│   │   │       └── workshopRenderer.js
│   │   ├── ui/
│   │   │   ├── abilityPreview.js
│   │   │   ├── canvasUI.js
│   │   │   ├── contextMenuManager.js
│   │   │   ├── dragAndDropManager.js
│   │   │   ├── scrollManager.js
│   │   │   ├── uiSfx.js
│   │   │   └── UITheme.js
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-32.png
│   │   ├── favicon.ico
│   │   ├── favicon.png
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json
├── shared/
│   ├── data/
│   │   ├── encounters/   # one file per encounter
│   │   ├── abilityDefinitions.js
│   │   ├── animationKit.js
│   │   ├── battleAnimationDefinition.js
│   │   ├── biomeDefinitions.js
│   │   ├── constants.js
│   │   ├── craftingRecipeDefinitions.js
│   │   ├── encounterDefinitions.js
│   │   ├── entityDefinitions.js
│   │   ├── interiorDefinitions.js
│   │   ├── itemDefinitions.js
│   │   ├── lootTableDefinitions.js
│   │   ├── mapObjectDefinitions.js
│   │   ├── questDefinitions.js
│   │   ├── spawnTableDefinitions.js
│   │   ├── statusEffectDefinitions.js
│   │   ├── structures.js
│   │   ├── traitDefinitions.js
│   │   └── weatherDefinitions.js
│   ├── generators/
│   │   ├── caveGenerator.js
│   │   ├── craftingHouseGenerator.js
│   │   └── houseGenerator.js
│   ├── models/
│   │   ├── abilityModel.js
│   │   ├── battleAnimationModel.js
│   │   ├── biomeModel.js
│   │   ├── combatantModel.js
│   │   ├── encounterModel.js
│   │   ├── entityModel.js
│   │   ├── itemModel.js
│   │   ├── lootTableModel.js
│   │   ├── mapObjectModel.js
│   │   ├── questModel.js
│   │   ├── spawnTableModel.js
│   │   ├── statusEffectModel.js
│   │   └── weatherModel.js
│   ├── state/
│   │   └── gameState.js
│   ├── systems/
│   │   ├── factories/
│   │   │   ├── abilityFactory.js
│   │   │   ├── battleAnimationFactory.js
│   │   │   ├── biomeFactory.js
│   │   │   ├── encounterFactory.js
│   │   │   ├── entityFactory.js
│   │   │   ├── interiorFactory.js
│   │   │   ├── itemFactory.js
│   │   │   ├── lootTableFactory.js
│   │   │   ├── mapObjectsFactory.js
│   │   │   ├── questFactory.js
│   │   │   ├── spawnTableFactory.js
│   │   │   ├── statusEffectFactory.js
│   │   │   ├── traitFactory.js
│   │   │   └── weatherFactory.js
│   │   ├── abilitySystem.js
│   │   ├── battleRewardSystem.js
│   │   ├── combatCalculator.js
│   │   ├── craftingManager.js
│   │   ├── experienceSystem.js
│   │   ├── inventorySystem.js
│   │   ├── itemUpgradeSystem.js
│   │   ├── partyManager.js
│   │   ├── questSystem.js
│   │   ├── saveManager.js
│   │   ├── statCalculator.js
│   │   ├── targetingResolver.js
│   │   ├── terrainGenerator.js
│   │   ├── timeSystem.js
│   │   ├── turnManager.js
│   │   └── worldManager.js
│   ├── utils/
│   │   ├── formatting.js
│   │   └── textEntry.js
│   └── package.json
├── tools/
│   └── checkPaths.mjs
├── .gitignore
├── ACCOUNTS_AND_SAVES.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
└── render.yaml

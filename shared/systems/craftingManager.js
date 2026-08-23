// ADD THIS LINE: Import the definitions so this file knows what they are
import { craftingRecipeDefinitions } from '../data/craftingRecipeDefinitions.js';

export const CraftingManager = {
  
  // Called when the player consumes a Crafting Scroll
  unlockRecipe(gameState, recipeId) {
    if (!gameState.party.unlockedCraftingRecipes.includes(recipeId)) {
      gameState.party.unlockedCraftingRecipes.push(recipeId);
      return true; // Successfully unlocked
    }
    return false; // Already known
  },

  // Called by your UI to build the Crafting Screen list
  getVisibleRecipes(gameState) {
    const visibleRecipes = [];

    for (const [recipeId, recipe] of Object.entries(craftingRecipeDefinitions)) {
      // Check the newly renamed array
      const isUnlocked = !recipe.locked || gameState.party.unlockedCraftingRecipes.includes(recipeId);
      
      if (isUnlocked) {
        visibleRecipes.push(recipe);
      }
    }

    return visibleRecipes;
  }
};
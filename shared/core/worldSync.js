// shared/core/worldSync.js: how this browser's changes to the shared world reach the other players (multiplayerSession sets the hooks), and whose
// world it is. Kept apart from WorldManager so the story (shared/story/worldStory.js) can use it without importing the map.
//   onLocalChange(key, value)   a change this browser made to gameState.world.changes, to send on (null when nobody is listening: single player)
//   ownsWorld                   true when the world being played is this player's own save (single player, or the host); false for a guest in
//                               someone else's world, whose own saved story must not leak into it (worldStory.hasWorldFlag)
export const worldSync = { onLocalChange: null, ownsWorld: true };

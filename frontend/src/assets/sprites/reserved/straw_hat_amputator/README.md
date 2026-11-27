# The straw-hat Amputator (kept for a future NPC)

The first art made for Senior Surgeon Osric: a masked Amputator in a wide straw hat, with a hooked blade and a short sword.
Osric now has a new look (an old one-armed man with his hat pulled low over his eyes, leaning on a cane), and these sheets are
kept here for another character.

- `straw_hat_amputator_portrait.png`: battle sheet, 2048 x 1024, 128 px frames, the front idle on rows 0-1 (32 frames)
- `straw_hat_amputator_sprite.png`: overworld sheet, 512 x 768, 64 px frames, rows 0-3 idle, 4-7 walk, 8-11 run (S, E, N, W)

They are not registered in `frontend/src/main.js` yet: add an entry there (and an entity in `shared/characters/entityDefinitions.js`)
when the character they belong to is made.

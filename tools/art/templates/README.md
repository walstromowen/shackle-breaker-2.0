# Art templates waiting to be painted

The game already loads these files. Until they hold art it falls back to something else, so each one can be dropped in whenever it is ready.

| File the game loads | Size | What goes in it | Until it is painted |
|---|---|---|---|
| ~~`frontend/src/assets/sprites/bear/bear_portrait.png`~~ (done) | 2048 x 1024, 128 px frames, 16 a row | The Bear's battle sheet, laid out like the wolf's: rows 0-1 facing the player (the enemy side), rows 4-5 the back view (the party side). The other rows stay empty. | Bear Form draws the caster tinted bear-brown and a little bigger. The `BEAR` creature shows nothing. |
| ~~`frontend/src/assets/sprites/bear/bear_sprite.png`~~ | 512 x 768, 64 px frames | **Done** (made with PixelLab: a 4-direction `bear`-template character, its idle / walk / run animated, the left rows mirrored from the right): the Bear's map sheet, laid out like the snow leopard's (rows 0-3 idle, 4-7 walk, 8-11 run; front, right, back, left). | |
| `frontend/src/assets/sprites/skeletal_warrior/skeletal_warrior_portrait.png` | 2048 x 1024 (the existing sheet) | Paint the back view into rows 4-5. Rows 0-1 are already done. | A skeleton summoned onto the party side (Raise Dead) faces the player. |

Guides with the frame grid and row labels, for laying over a sheet while painting (the game does not load these):

- `bear_portrait_GUIDE.png`
- `bear_sprite_GUIDE.png`
- `skeletal_warrior_back_GUIDE.png`

The battle screen checks each sheet's rows for art once, when it first draws them (`BattleCombatantRenderer._rowsHaveArt`), so no code change is needed when the art arrives.

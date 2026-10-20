Drop these files over your repo (same paths; built on origin/main 8ccd7cd).

LOGIN: title reads "Shackle Breaker" (no hyphen); background is the title screen's picture (title_bg.png) with a lighter dark overlay.
ACID POOL: new movement "spread_and_fade" (particle.js): the pool starts as a small puddle and flows outward, holds, then thins away. The acid_pool animation
  adds a fainter second wave, rising bubbles and repeating fumes.
BLEED: stacks to 3 (each new cut adds a stack), lasts 4 turns, costs 5 HP + 5 stamina per stack at the end of every turn, cuts HP/stamina recovery by 33% per stack,
  and makes slash hits land harder (-0.2 slash resistance per stack).
RECOVERY: no recovery at the start of a fight (the entrance/weather/trait sequence no longer counts as a round); it first applies after round one.
  Messages and the ability tooltip say "recovers 10 stamina" / "25% Max stamina" - only HP stays capitalised.
BATTLE CARDS: status icons now have their own strip along the bottom of each card (party and enemy), so they can't hit the border or the name; up to 6 fit,
  more show "+N", stacked statuses show "x2".  Party cards are 148 tall (gap 10) so three still clear the ability panel.
HOTBAR: key numbers and stack counts use a smaller font set inside the slot, so they sit fully in their boxes.
LINEN: recipe_linen now needs 10 plant fibers (it used to need 2 cotton).

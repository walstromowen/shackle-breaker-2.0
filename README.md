# [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

Root
├── backend/
├── frontend/                  
│   ├── src/
|   |   ├── assets/
|   |   |   ├── sprites/
|   |   |   └── tilesets/
|   |   ├── controllers/
|   |   |   ├── battleController.js
|   |   |   └── overworldController.js
|   |   ├── core/
|   |   |   ├── assetLoader.js
|   |   |   ├── gameLoop.js
|   |   |   ├── input.js
|   |   |   └── sceneManager.js
|   |   ├── renderers.js
|   |   |   ├── overworld/
|   |   |   |   ├── entityRenderer.js
|   |   |   |   └── mapRenderer.js
|   |   ├── index.html
|   |   ├── main.js
|   |   └── styles.css
│   └── package.json      
├── shared/ 
|   ├── data
|   |   ├── abilities.js
|   |   ├── constants.js
|   |   ├── entities.js
|   |   ├── items.js
|   |   ├── map.js
|   ├── systems
|   |   ├── combat
|   |   ├── factories
|   |   |   ├── entityFactory.js
|   |   |   └── itemFactory.js
├── .gitignore/ 
├── LISCENSE/ 
├── package-lock.json 
├── package.json
└── README.md 



To make this perfectly accurate for your plains.png spritesheet, I have added the +1 Row Offset to the Y-coordinates.

In this list, Y=0 is your Header (Grass/Portals), and the Wall Block begins at Y=1.

The Final 8-Column Master List (With Header Offset)
This list assumes your Walls start at Row 1. If you are drawing Water, add +6 to every Y value.

0: [0, 1] Isolated — Touching Different Type on all 4 sides. (Full Border).

1: [1, 1] Center — Touching Same Type on all 4 sides. (No Borders).

2: [2, 1] N-End — Touching Same Type on Top. Bordered on E, S, W.

3: [3, 1] E-End — Touching Same Type on Right. Bordered on N, S, W.

4: [4, 1] S-End — Touching Same Type on Bottom. Bordered on N, E, W.

5: [5, 1] W-End — Touching Same Type on Left. Bordered on N, E, S.

6: [6, 1] V-Straight — Touching Same Type on Top & Bottom. Bordered on E, W.

7: [7, 1] H-Straight — Touching Same Type on Left & Right. Bordered on N, S.

8: [0, 2] TR-Corner — Touching Same Type on Top & Right. Bordered S, W.

9: [1, 2] RB-Corner — Touching Same Type on Right & Bottom. Bordered N, W.

10: [2, 2] BL-Corner — Touching Same Type on Bottom & Left. Bordered N, E.

11: [3, 2] LT-Corner — Touching Same Type on Left & Top. Bordered E, S.

12: [4, 2] T-Right — Touching Same Type on Top, Right, Bottom. Bordered West.

13: [5, 2] T-Down — Touching Same Type on East, West, Bottom. Bordered North.

14: [6, 2] T-Left — Touching Same Type on Top, Left, Bottom. Bordered East.

15: [7, 2] T-Up — Touching Same Type on East, West, Top. Bordered South.

16: [0, 3] Cross (+) — Touching Same Type on North, South, East, West.

17: [1, 3] Filler — Pure solid wall texture.

18: [2, 3] i-TR — Solid wall, but Different Type on the Top-Right Diagonal.

19: [3, 3] i-RB — Solid wall, but Different Type on the Bottom-Right Diagonal.

20: [4, 3] i-BL — Solid wall, but Different Type on the Bottom-Left Diagonal.

21: [5, 3] i-LT — Solid wall, but Different Type on the Top-Left Diagonal.

22: [6, 3] 2i-R/B — Different Type on both Right-side Diagonals.

23: [7, 3] 2i-L/B — Different Type on both Left-side Diagonals.

24: [0, 4] 2i-T/B — Different Type on both Top-side Diagonals.

25: [1, 4] 2i-Opposite — Different Type on Top-Left and Bottom-Right Diagonals.

26: [2, 4] 3i-TRB — Different Type on 3 diagonals (except Top-Left).

27: [3, 4] 3i-RBL — Different Type on 3 diagonals (except Top-Right).

28: [4, 4] 3i-BLT — Different Type on 3 diagonals (except Bottom-Right).

29: [5, 4] 3i-LTR — Different Type on 3 diagonals (except Bottom-Left).

30: [6, 4] Edge-N — Touching Same Type on E, S, W. Border on Top.

31: [7, 4] Edge-E — Touching Same Type on N, S, W. Border on East.

32: [0, 5] Edge-S — Touching Same Type on N, E, W. Border on South.

33: [1, 5] Edge-W — Touching Same Type on N, E, S. Border on West.

34: [2, 5] Slash-1 — Diagonal connection from Top-Left to Bottom-Right.

35: [3, 5] Slash-2 — Diagonal connection from Top-Right to Bottom-Left.

36: [4, 5] U-Up — Touching Same Type only on Top.

37: [5, 5] U-Right — Touching Same Type only on Right.

38: [6, 5] U-Down — Touching Same Type only on Bottom.

39: [7, 5] U-Left — Touching Same Type only on Left.

40: [0, 6] Thick-TR — Chunky Top-Right corner.

41: [1, 6] Thick-RB — Chunky Bottom-Right corner.

42: [2, 6] Thick-BL — Chunky Bottom-Left corner.

43: [3, 6] Thick-LT — Chunky Top-Left corner.

44: [4, 6] Step-H — Horizontal transition.

45: [5, 6] Step-V — Vertical transition.

46: [6, 6] 4i-All — Solid, but Different Type on all 4 diagonals.

47: [7, 6] Empty — Blank tile.

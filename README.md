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
|   |   ├── mapObjects.js
|   |   ├──sprites.js
|   ├── systems
|   |   ├── combat
|   |   ├── factories
|   |   |   ├── entityFactory.js
|   |   |   └── itemFactory.js
|   |   ├── worldManager.js
├── .gitignore/ 
├── LISCENSE/ 
├── package-lock.json 
├── package.json
└── README.md 



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



Mask	Neighbors Present (Walls)	Visual Shape	Your Index
0	None	Isolated / Single Block	
1	Top	Bottom Cap (Vertical End)	
4	Right	Left Cap (Horizontal End)	
16	Bottom	Top Cap (Vertical End)	
64	Left	Right Cap (Horizontal End)	
17	Top, Bottom	Vertical Shaft	
68	Left, Right	Horizontal Shaft	
5	Top, Right	L-Corner (Bottom-Left)	
20	Right, Bottom	L-Corner (Top-Left)	
80	Bottom, Left	L-Corner (Top-Right)	
65	Left, Top	L-Corner (Bottom-Right)	
21	Top, Right, Bottom	T-Junction (Open Left)	
84	Right, Bottom, Left	T-Junction (Open Top)	
81	Bottom, Left, Top	T-Junction (Open Right)	
69	Left, Top, Right	T-Junction (Open Bottom)	
85	Top, Right, Bottom, Left	Cross Junction (+)


7	Top, Right, Top-Right	Outer Corner (Bot-Left)	
28	Right, Bottom, Bot-Right	Outer Corner (Top-Left)	
112	Bottom, Left, Bot-Left	Outer Corner (Top-Right)	
193	Left, Top, Top-Left	Outer Corner (Bot-Right)	
31	Top, Right, Bottom, TR, BR	Side Wall (Right)	
124	Right, Bottom, Left, BR, BL	Side Wall (Bottom)	
241	Bottom, Left, Top, BL, TL	Side Wall (Left)	
199	Left, Top, Right, TL, TR	Side Wall (Top)	
255	All 8 Neighbors	Solid Center


23	T, TR, R, B	BR, BL, L, TL	
29	T, R, BR, B	TR, BL, L, TL	
71	L, TL, T, R	TR, BR, B, BL	
87	T, TR, R, B, L	BR, BL, TL	
92	R, BR, B, L	T, TR, BL, TL	
93	T, R, BR, B, L	TR, BL, TL	
95	T, TR, R, BR, B, L	BL, TL	
113	T, B, BL, L	TR, R, BR, TL	
117	T, R, B, BL, L	TR, BR, TL	
119	T, TR, R, B, BL, L	BR, TL	
125	T, R, BR, B, BL, L	TR, TL	
127	T, TR, R, BR, B, BL, L	TL	
195	L, TL, T	TR, R, BR, B, BL	
197	L, TL, T, R	TR, BR, B, BL	
209	B, L, TL, T	TR, R, BR, BL	
213	R, B, L, TL, T	TR, BR, BL	
223	TR, R, B, L, TL, T	BR, BL	
244	R, BR, B, BL, L	T, TR, TL	
245	T, R, BR, B, BL, L	TR, TL	
247	TR, R, BR, B, BL, L, T	TL	
253	R, B, BL, L, TL, T, TR	BR	
254	T, TR, R, BR, B, L, TL	BL
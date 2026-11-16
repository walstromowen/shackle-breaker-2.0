# The castle town's door (mapObjects/objCastleDoor.png): an iron door for the town house's gap (castleTownhouse.py, CASTLE_DOOR), in the
# format of the wooden house door (objHouseDoorWooden.png): four frames side by side, each 32 x 64, the door in the bottom 48 px (the gap's
# height) over a stone threshold, the top 16 px empty (the house's stone arch stands there). Frame 0 shut; 1 and 2 swinging in on its left
# hinges (narrower, turning into the dark); 3 open, the dark of the house within.
#
# The leaf: plates of dark iron, a seam down the middle, three riveted straps across, rows of studs, a ring and a keyhole; lit from the upper
# left (a lit left and top edge, a dark right one).
#   python3 castleDoor.py <out.png>
import sys
import numpy as np
from PIL import Image

FW, FH, TOP = 32, 64, 16
IRON = np.array([78, 82, 92], np.float32)
RUST = np.array([112, 70, 44], np.float32)
DARK = np.array([20, 16, 15], np.float32)       # the house within
SILL = np.array([150, 146, 136], np.float32)
OUT = np.array([34, 32, 34], np.float32)

def frame(open_w):
    img = np.zeros((FH, FW, 4), np.float32)
    def put(x, y, c):
        if 0 <= x < FW and 0 <= y < FH: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    # the dark within (seen past the leaf as it opens): darker further in
    for y in range(TOP, FH - 2):
        for x in range(FW):
            put(x, y, DARK * (1.0 + 0.25 * (y - TOP) / (FH - TOP)) * (0.8 if (y - TOP) % 12 == 0 else 1.0))
    # the leaf, hinged on the left, foreshortened as it turns: width open_w, darker the further it has swung
    w = open_w
    turn = 1.0 - 0.45 * (1 - w / FW)
    for y in range(TOP, FH - 2):
        for x in range(w):
            u = x * FW / max(1, w)                 # where on the shut door this column is
            t = y - TOP
            c = IRON * (0.96 + 0.06 * ((int(u) // 8 + t // 12) % 2))
            if abs(u - 16) < FW / max(1, w) * 0.9: c = IRON * 0.55                  # the seam between the two plates
            for sy in (6, 24, 42):                 # the straps: a raised band, its top lit, a rivet every 6 px
                if sy <= t < sy + 4:
                    c = IRON * (1.4 if t == sy else (0.62 if t == sy + 3 else 1.08))
                    if t in (sy + 1, sy + 2) and int(u) % 6 == 3: c = IRON * 1.7
            if t % 6 == 3 and int(u) % 8 == 4 and not any(sy - 1 <= t < sy + 5 for sy in (6, 24, 42)): c = IRON * 1.55   # studs
            if x == 0: c = IRON * 1.45             # the lit hinge edge
            if x == w - 1: c = OUT
            if t == 0: c = IRON * 1.5
            if t < 2 and x < 2: c = IRON * 1.6
            if (int(u) * 7 + t * 3) % 41 == 0: c = c * 0.6 + RUST * 0.4              # rust in the iron
            put(x, y, c * turn)
    if w == FW:                                    # the ring and the keyhole (shut only)
        for (dx, dy) in ((0, -2), (1, -2), (2, -1), (2, 0), (2, 1), (1, 2), (0, 2), (-1, 1), (-1, 0), (-1, -1)):
            put(23 + dx, TOP + 32 + dy, IRON * (1.8 if dy < 0 or dx < 0 else 0.9))
        put(23, TOP + 30, OUT); put(24, TOP + 30, OUT)
        for y in (TOP + 35, TOP + 36, TOP + 37): put(26, y, OUT)
    for x in range(FW):                            # the threshold
        put(x, FH - 2, SILL * 1.1); put(x, FH - 1, SILL * 0.8)
    return img

sheet = np.concatenate([frame(w) for w in (32, 22, 12, 3)], axis=1)
Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8), 'RGBA').save(sys.argv[1], optimize=True)
print('ok', sheet.shape)

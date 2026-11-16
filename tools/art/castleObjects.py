# The castle's tall sprites as map-object sheets (the renderer draws an object w x h tiles, its bottom on its cell's bottom edge, frames side by
# side): the art scripts' sprites padded to whole tiles, and the tower's frames for the ways a tower meets its walls.
#   castle_tower_obj.png      5 frames, each 4 x 15 tiles (128 x 480): the tower art (castleTower.py, 464 px tall) at the bottom of the frame; the
#                             object stands on its footprint's last row and is drawn spriteDy = 28 px lower, so its foot hangs into the row below
#                             its footprint as the walls' faces do
#                             0 a door on the ground   1 no door   2 no door, columns 1-3 stopping at the footprint (a wall runs south from them)
#                             3 no door, columns 0-2 stopping   4 no door, all four stopping
#   castle_keep_obj.png       20 x 22 tiles (640 x 704): the keep (castleKeep.py, 700 px) at the bottom
#   castle_gatehouse_obj.png  2 frames, each 6 x 11 tiles (192 x 352): the gatehouse (castleGatehouse.py, 330 px) at the bottom, its see-through
#                             opening kept; 0 open, 1 closed (castle_gatehouse_closed.png, the portcullis down)
#   castle_gatehouse_inner_obj.png  2 frames, each 4 x 8 tiles (128 x 256): the inner ward's gatehouse (castleGatehouse.py inner, 250 px) at
#                             the bottom; 0 open, 1 closed (inner,closed)
#   python3 castleObjects.py <castle_ruins_exterior dir>
import sys, os
import numpy as np
from PIL import Image

D = sys.argv[1]
def load(n): return np.asarray(Image.open(os.path.join(D, n)).convert('RGBA'))
def save(n, a): Image.fromarray(a, 'RGBA').save(os.path.join(D, n), optimize=True)
def pad_top(a, h):
    out = np.zeros((h, a.shape[1], 4), np.uint8)
    out[h - a.shape[0]:] = a
    return out

tower = load('castle_tower.png')                 # 3 frames of 128 x 464: door on the ground, door on the walk, no door
TW, TH, CUT = 128, tower.shape[0], 28
door, none = tower[:, 0:TW], tower[:, 2 * TW:3 * TW]
def cut(frame, cols):
    f = frame.copy()
    for k in cols: f[TH - CUT:, k * 32:(k + 1) * 32] = 0
    return f
frames = [door, none, cut(none, [1, 2, 3]), cut(none, [0, 1, 2]), cut(none, [0, 1, 2, 3])]
H = 480                                          # (15 tiles: the art padded 16 px at the top)
sheet = np.concatenate([pad_top(f, H) if f.shape[0] <= H else f[-H:] for f in frames], axis=1)
save('castle_tower_obj.png', sheet)
save('castle_keep_obj.png', pad_top(load('castle_keep.png'), 704))
save('castle_gatehouse_inner_obj.png', np.concatenate([pad_top(load('castle_gatehouse_inner.png'), 256), pad_top(load('castle_gatehouse_inner_closed.png'), 256)], axis=1))
save('castle_gatehouse_obj.png', np.concatenate([pad_top(load('castle_gatehouse.png'), 352), pad_top(load('castle_gatehouse_closed.png'), 352)], axis=1))
print('ok', sheet.shape)

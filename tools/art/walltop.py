# The castle walls' flat top (the wall-walk's flags), read from the tile set itself (castle_ruins_exterior/cliff_blob47_floor.png: the cell
# walled in on every side, blob mask 255, column 6 row 5 of each 8 x 6 variant), so the flat tops of the towers, the keep and the gatehouse
# (castleTower.py, castleKeep.py, castleGatehouse.py) are paved with exactly the same stones as the walls. walltop(x, y) is that tile repeated,
# its variants taken in turn cell by cell, with (x, y) in the sprite's own pixels and `oy` lining its rows up with the world's 32 px grid.
import os
import numpy as np
from PIL import Image

_HERE = os.path.dirname(os.path.abspath(__file__))
_SHEET = os.path.join(_HERE, '..', '..', 'frontend', 'src', 'assets', 'tilesets', 'castle_ruins_exterior', 'cliff_blob47_floor.png')
_img = np.asarray(Image.open(_SHEET).convert('RGBA')).astype(np.float32)
_NV = max(1, _img.shape[1] // 256)
_TILES = [_img[5 * 32:6 * 32, v * 256 + 6 * 32:v * 256 + 7 * 32, :3] for v in range(_NV)]

def walltop(x, y, oy=0):
    x, y = int(x), int(y) + oy
    cx, cy = x // 32, y // 32
    return _TILES[(cx * 3 + cy * 5) % _NV][y % 32, x % 32].copy()

# The keep's great door as a map object that opens (mapObjectDefinitions CASTLE_KEEP_DOOR): cut out of the keep's own art (castle_keep_obj.png, the door
# painted at the bottom middle of its face), so the closed door is exactly what the keep shows, then three more frames with the two leaves swinging in
# onto the dark of the hall behind.
#   python3 tools/art/castleKeepDoor.py frontend/src/assets
# writes mapObjects/objCastleKeepDoor.png: 4 frames of 64 x 128 (2 x 4 tiles) side by side, the region x 288..351, y 576..703 of the keep's sprite
# (its columns 9 and 10, its last four rows).
import sys, os
import numpy as np
from PIL import Image

ROOT = sys.argv[1]
keep = np.asarray(Image.open(os.path.join(ROOT, 'tilesets/castle_ruins_exterior/castle_keep_obj.png')).convert('RGBA')).astype(np.float32)
X0, Y0, W, H = 288, keep.shape[0] - 128, 64, 128
crop = keep[Y0:Y0 + H, X0:X0 + W].copy()
lum = crop[..., :3].mean(axis=2)
# the door's wood: the dark, warm pixels inside the arch (the stone round it is pale)
wood = (crop[..., 3] > 0) & (lum < 92) & (crop[..., 0] >= crop[..., 2] - 4)
# per row, the span of the opening: the run of wood through the door's middle (between the two leaves), out to the pale moulding of the arch
# (a single paler pixel, a plank's highlight, does not end it); rows where the middle is stone (above the arch) have none
spans = {}
mid0 = W // 2
for y in range(H):
    if not (wood[y, mid0 - 1] or wood[y, mid0] or wood[y, mid0 - 2] or wood[y, mid0 + 1]): continue
    l = r = mid0
    while l - 1 >= 0 and (wood[y, l - 1] or (l - 2 >= 0 and wood[y, l - 2])): l -= 1
    while r + 1 < W and (wood[y, r + 1] or (r + 2 < W and wood[y, r + 2])): r += 1
    if r - l >= 3: spans[y] = (l, r)
DARK = np.array([13, 10, 11], np.float32)

def frame(f):
    """f: how far the leaves have swung in (0 shut .. 1 wide open)"""
    out = crop.copy()
    for y, (l, r) in spans.items():
        mid = (l + r + 1) / 2
        # the hall behind, darkest in the middle and toward the top of the arch
        for x in range(l, r + 1):
            g = 0.8 + 0.4 * abs(x + 0.5 - mid) / max(1, (r - l) / 2)
            out[y, x, :3] = DARK * g * (0.85 + 0.3 * y / H)
            out[y, x, 3] = 255
        # each leaf, narrowed toward its hinge as it turns away, and darker the further it turns
        for side in (0, 1):
            a, b = (l, mid) if side == 0 else (mid, r + 1)
            src_w = b - a
            w = max(0.0, src_w * (1 - f))
            if w < 0.5: continue
            for i in range(int(round(w))):
                t = (i + 0.5) / w                              # 0..1 across the narrowed leaf
                sx = int(a + t * src_w) if side == 0 else int(b - (1 - t) * src_w)
                dx = int(a + i) if side == 0 else int(b - w + i)
                sx = min(max(sx, l), r); dx = min(max(dx, l), r)
                c = crop[y, sx, :3] * (1 - 0.45 * f)
                out[y, dx, :3] = c
            edge = int(a + w) if side == 0 else int(b - w) - 1   # the leaf's free edge, catching a little light
            if l <= edge <= r: out[y, edge, :3] = out[y, edge, :3] * 0.6
    return out

sheet = np.concatenate([frame(f) for f in (0.0, 0.38, 0.7, 0.94)], axis=1)
Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(ROOT, 'mapObjects/objCastleKeepDoor.png'), optimize=True)
print('ok', sheet.shape, 'rows with an opening:', len(spans))

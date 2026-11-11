# Nikoli's battle and encounter sheet, from the artist's single 128 px portrait (frontend/src/assets/sprites/warlord_hero/nikolai.png):
#   python3 tools/art/nikoliPortraitSheet.py frontend/src/assets/sprites/warlord_hero/nikolai.png frontend/src/assets/sprites/warlord_hero/nikoli_portrait.png
# The layout every battle sheet has (2048 x 768: 16 frames of 128 px to a row; rows 0-1 are the 32-frame loop seen across the field, rows 4-5 the
# one seen on the party's side). One drawing, so the loop is a slow breath: the second half of it sits one pixel lower.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
art = Image.open(src).convert('RGBA')
assert art.size == (128, 128), art.size
F = 128
sheet = Image.new('RGBA', (16 * F, 6 * F), (0, 0, 0, 0))
for base in (0, 4):
    for f in range(32):
        row, col = base + f // 16, f % 16
        sheet.alpha_composite(art, (col * F, row * F + (1 if f >= 16 else 0)))
sheet.save(out)

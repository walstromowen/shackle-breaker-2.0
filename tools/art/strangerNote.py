# The note the Hooded Stranger leaves in his old workshop in act 2 (map object STRANGER_NOTE, encounter stranger_note): a low crate by the cold
# forge with a scrap of paper nailed to its lid, a line of shaky writing and a sooty thumbprint. 32 x 32, hard-edged with a dark outline:
#   python3 tools/art/strangerNote.py frontend/src/assets/mapObjects/objStrangerNote.png
import sys
from PIL import Image, ImageDraw

OUT = (27, 20, 16, 255)
WOOD, WOOD_D, WOOD_L = (122, 86, 52, 255), (88, 60, 36, 255), (150, 110, 70, 255)
PAPER, PAPER_D, INK, SOOT, NAIL = (226, 214, 180, 255), (190, 174, 136, 255), (60, 48, 40, 255), (70, 64, 60, 255), (150, 150, 158, 255)

im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.ellipse([3, 25, 29, 31], fill=(0, 0, 0, 70))                       # its shadow
# the crate: a lid seen from above, a front face below it
d.rectangle([5, 9, 26, 17], fill=WOOD_L)                                # lid
d.line([5, 13, 26, 13], fill=WOOD)
d.rectangle([5, 18, 26, 27], fill=WOOD)                                 # front
for y in (21, 24):
    d.line([5, y, 26, y], fill=WOOD_D)
d.line([5, 18, 26, 18], fill=WOOD_D)
# the note on the lid, a little crooked, with its nail
note = Image.new('RGBA', (14, 11), PAPER)
nd = ImageDraw.Draw(note)
nd.line([0, 10, 13, 10], fill=PAPER_D)
nd.line([13, 0, 13, 10], fill=PAPER_D)
for y, (a, b) in zip((3, 5, 7), ((2, 11), (2, 9), (2, 10))):
    nd.line([a, y, b, y], fill=INK)
nd.rectangle([9, 7, 11, 9], fill=SOOT)                                 # the thumbprint
note = note.rotate(-8, resample=Image.NEAREST, expand=True)
im.alpha_composite(note, (9, 5))
d.point((15, 6), fill=NAIL)
d.point((16, 6), fill=OUT)
# outline
px = im.load()
rim = [(x, y) for y in range(32) for x in range(32) if px[x, y][3] == 0 and any(
    0 <= x + dx < 32 and 0 <= y + dy < 32 and px[x + dx, y + dy][3] > 100 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
for p in rim:
    px[p] = OUT
im.save(sys.argv[1])
print('saved', sys.argv[1])

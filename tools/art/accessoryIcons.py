# Placeholder icons for the rare accessories (itemDefinitions.js, "RARE ACCESSORIES"), drawn into row 6 of the armor sheet, cols 0 to 7 (64 px cells):
#   python3 tools/art/accessoryIcons.py frontend/src/assets/icons/armor.png
# Simple shapes with a dark outline, until they have real art. In order: elbow blade, Panzerian spring inserts, Panzerkamfer saddle, noble's ring,
# madman's tooth necklace, jar of shifting sands, quiver, grim stag's antler. Each cell is cleared first (the empty part of the sheet is opaque white).
import sys, math
from PIL import Image, ImageDraw
path = sys.argv[1]
sheet = Image.open(path).convert('RGBA')
C, ROW = 64, 6
OUT = (24, 18, 16, 255)

def cell(fn):
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0)); fn(ImageDraw.Draw(im), im); return im

def elbow_blade(d, im):
    # a leather bracer with a curved blade running back past the elbow
    d.rounded_rectangle([14, 26, 40, 44], 5, fill=(112, 74, 44, 255), outline=OUT, width=2)
    for x in (20, 28, 34): d.line([x, 27, x, 43], fill=(80, 52, 30, 255), width=2)
    d.polygon([(38, 30), (58, 18), (52, 30), (38, 38)], fill=(190, 200, 210, 255), outline=OUT)
    d.line([40, 33, 55, 21], fill=(236, 242, 248, 255), width=1)

def spring_inserts(d, im):
    # two steel coil springs set in iron boot plates
    for x0 in (12, 34):
        d.rectangle([x0, 46, x0 + 18, 52], fill=(110, 116, 128, 255), outline=OUT, width=2)
        for i in range(5):
            y = 42 - i * 6
            d.ellipse([x0 + 2, y - 3, x0 + 16, y + 3], outline=(196, 204, 216, 255), width=2)
        d.rectangle([x0, 10, x0 + 18, 14], fill=(110, 116, 128, 255), outline=OUT, width=2)

def saddle(d, im):
    # a heavy plated saddle, Panzerian iron over leather, a strap hanging down
    d.pieslice([8, 14, 56, 62], 180, 360, fill=(104, 66, 40, 255), outline=OUT, width=2)
    d.rectangle([8, 37, 56, 44], fill=(84, 52, 32, 255), outline=OUT, width=2)
    d.pieslice([16, 20, 48, 52], 200, 340, fill=(120, 128, 142, 255), outline=OUT, width=2)
    for x in (20, 32, 44): d.ellipse([x - 2, 26, x + 2, 30], fill=(200, 206, 216, 255))
    d.rectangle([28, 44, 34, 58], fill=(84, 52, 32, 255), outline=OUT, width=1)
    d.rectangle([26, 56, 36, 60], outline=(170, 170, 176, 255), width=2)

def ring(d, im):
    # a gold signet ring with a blue stone
    d.ellipse([14, 22, 50, 58], outline=OUT, width=10)
    d.ellipse([16, 24, 48, 56], outline=(222, 176, 64, 255), width=6)
    d.ellipse([24, 8, 40, 24], fill=(60, 110, 200, 255), outline=OUT, width=2)
    d.point([(29, 13), (30, 13), (29, 14)], fill=(190, 220, 255, 255))

def tooth_necklace(d, im):
    # a cord in a sagging arc, strung with crooked yellowed teeth
    d.arc([8, 4, 56, 52], 20, 160, fill=OUT, width=4)
    d.arc([8, 4, 56, 52], 20, 160, fill=(120, 92, 60, 255), width=2)
    for i in range(7):
        a = math.radians(30 + i * 20)
        x, y = 32 + 24 * math.cos(a), 28 + 24 * math.sin(a)
        tip = (x + 2 * math.cos(a), y + 9)
        d.polygon([(x - 3, y), (x + 3, y), tip], fill=(232, 220, 176, 255), outline=OUT)

def sand_jar(d, im):
    # a glass jar of sand that will not settle: swirls inside, a cork
    d.rounded_rectangle([16, 18, 48, 58], 8, fill=(180, 210, 220, 110), outline=OUT, width=2)
    d.rounded_rectangle([19, 30, 45, 55], 6, fill=(214, 182, 112, 255))
    for k in range(3):
        d.arc([20 + k * 3, 30 + k * 4, 44 - k * 3, 50 - k * 2], 200 + k * 40, 340 + k * 40, fill=(244, 222, 160, 255), width=2)
    d.rectangle([22, 10, 42, 18], fill=(150, 108, 62, 255), outline=OUT, width=2)
    d.line([22, 22, 22, 50], fill=(236, 246, 255, 180), width=2)

def quiver(d, im):
    # a leather quiver, slanted, four fletched arrows
    d.polygon([(18, 58), (30, 60), (46, 20), (34, 16)], fill=(124, 82, 48, 255), outline=OUT)
    d.line([24, 52, 38, 20], fill=(92, 58, 34, 255), width=2)
    for i, (x, y) in enumerate([(36, 14), (41, 13), (46, 16), (39, 9)]):
        d.line([x, y + 4, x + 4, y - 8], fill=(150, 120, 80, 255), width=2)
        d.polygon([(x + 2, y - 6), (x + 8, y - 12), (x + 6, y - 4)], fill=[(200, 60, 50, 255), (230, 230, 220, 255)][i % 2], outline=OUT)

def antler(d, im):
    # a pale, branching stag's antler, its base wrapped in a leather thong
    main = [(16, 58), (22, 44), (28, 32), (34, 22), (40, 12), (46, 6)]
    d.line(main, fill=OUT, width=8, joint='curve')
    d.line(main, fill=(220, 206, 176, 255), width=5, joint='curve')
    for (x0, y0), (x1, y1) in [((24, 42), (12, 30)), ((30, 30), (20, 16)), ((36, 20), (48, 22)), ((40, 12), (36, 2))]:
        d.line([x0, y0, x1, y1], fill=OUT, width=6); d.line([x0, y0, x1, y1], fill=(220, 206, 176, 255), width=3)
    d.rectangle([13, 50, 23, 56], fill=(120, 80, 46, 255), outline=OUT, width=1)

for col, fn in enumerate([elbow_blade, spring_inserts, saddle, ring, tooth_necklace, sand_jar, quiver, antler]):
    sheet.paste(Image.new('RGBA', (C, C), (0, 0, 0, 0)), (col * C, ROW * C))
    sheet.alpha_composite(cell(fn), (col * C, ROW * C))
sheet.save(path)

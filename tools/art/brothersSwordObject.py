# The Brother's Sword where it is found (map object BROTHERS_SWORD): Nikoli's greatsword planted point-down in the snow beside his cold campfire,
# rimed with frost, a length of broken chain hanging from the hilt. 32 x 64 (one tile wide, two high), made from its own icon:
#   python3 tools/art/brothersSwordObject.py frontend/src/assets/icons/weapons.png frontend/src/assets/mapObjects/objBrothersSword.png
import sys
from PIL import Image, ImageDraw
icon = Image.open(sys.argv[1]).convert('RGBA').crop((15 * 64, 0, 16 * 64, 64))
# the icon lies diagonally, point up and right: turn it to stand point-down, then trim and scale it to the tile
up = icon.rotate(45, resample=Image.NEAREST, expand=True)      # point straight up
down = up.rotate(180, expand=True)
down = down.crop(down.getbbox())
h = 52
w = max(1, round(down.width * h / down.height))
sword = down.resize((w, h), Image.NEAREST)
out = Image.new('RGBA', (32, 64), (0, 0, 0, 0))
# a small drift of snow at its foot, and its shadow
d = ImageDraw.Draw(out)
d.ellipse([5, 55, 27, 62], fill=(0, 0, 0, 60))
out.alpha_composite(sword, (16 - w // 2, 64 - h - 6))
d.ellipse([7, 54, 25, 61], fill=(232, 240, 248, 255), outline=(170, 186, 204, 255))
d.ellipse([10, 52, 21, 57], fill=(246, 250, 255, 255))
out.save(sys.argv[2])

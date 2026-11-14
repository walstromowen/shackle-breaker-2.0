"""Puts a finished Flying icon, exactly as it is, into its cell of the status icon sheet.

    python3 tools/art/placeFlyingIcon.py path/to/flying.png

The cell is col 0, row 3 of frontend/src/assets/icons/status_effects.png (64 px cells), the one statusEffectDefinitions.js `flying`
points at. The cell is cleared first, then the picture is pasted pixel for pixel. A 64 x 64 picture fills the cell exactly; a smaller one is
centred in it, untouched. A larger one is refused rather than resized, so the art is never altered (make it 64 x 64 first).
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SHEET = os.path.join(ROOT, 'frontend', 'src', 'assets', 'icons', 'status_effects.png')
COL, ROW, CELL = 0, 3, 64


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: python3 tools/art/placeFlyingIcon.py path/to/flying.png')
    icon = Image.open(sys.argv[1]).convert('RGBA')
    w, h = icon.size
    if w > CELL or h > CELL:
        sys.exit(f'{sys.argv[1]} is {w} x {h}: the cell is {CELL} x {CELL}. Resize it yourself first, so the art stays as you made it.')
    sheet = Image.open(SHEET).convert('RGBA')
    x, y = COL * CELL, ROW * CELL
    sheet.paste(Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)), (x, y))
    sheet.paste(icon, (x + (CELL - w) // 2, y + (CELL - h) // 2))   # paste, not blend: every pixel exactly as in the file
    sheet.save(SHEET)
    print(f'{sys.argv[1]} ({w} x {h}) placed at col {COL}, row {ROW} of status_effects.png')


if __name__ == '__main__':
    main()

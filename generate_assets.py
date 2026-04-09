"""
Generate splash icon and app icons for itemdiary Android app.
Primary color: #3B82F6
"""
from PIL import Image, ImageDraw
import os
import math

PRIMARY = (59, 130, 246)       # #3B82F6
WHITE   = (255, 255, 255)
BG      = (255, 255, 255, 0)   # transparent


def draw_shopping_bag(draw, cx, cy, size, color, bg_color=None):
    """Draw a simple shopping bag icon centered at (cx, cy)."""
    w = size * 0.55
    h = size * 0.55
    x0 = cx - w / 2
    y0 = cy - h / 2 + size * 0.05
    x1 = cx + w / 2
    y1 = cy + h / 2 + size * 0.05

    # Bag body (rounded rect via pieslice approximation)
    r = size * 0.06
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)

    # Handle
    handle_w = w * 0.42
    handle_h = h * 0.30
    hx0 = cx - handle_w / 2
    hx1 = cx + handle_w / 2
    hy0 = y0 - handle_h
    hy1 = y0 + handle_h * 0.15
    handle_thickness = max(2, int(size * 0.045))
    draw.arc(
        [hx0, hy0, hx1, hy1],
        start=200, end=340,
        fill=color,
        width=handle_thickness,
    )


def make_splash_icon(path, size=300):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Blue circle background
    margin = size * 0.05
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=PRIMARY + (255,),
    )

    # White shopping bag
    draw_shopping_bag(draw, size // 2, size // 2, size, WHITE)

    img.save(path, 'PNG')
    print(f'  Saved: {path}')


def make_launcher_icon(path, size, round_=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if round_:
        draw.ellipse([0, 0, size, size], fill=PRIMARY + (255,))
    else:
        r = size * 0.22
        draw.rounded_rectangle([0, 0, size, size], radius=r, fill=PRIMARY + (255,))

    draw_shopping_bag(draw, size // 2, size // 2, size, WHITE)

    # Convert to RGB (PNG with no alpha for launcher)
    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final.paste(img, (0, 0), img)
    final.save(path, 'PNG')
    print(f'  Saved: {path}')


BASE = os.path.dirname(os.path.abspath(__file__))
ANDROID = os.path.join(BASE, 'android', 'app', 'src', 'main', 'res')

# ── Splash icon ──────────────────────────────────────────────────────────────
splash_path = os.path.join(ANDROID, 'drawable', 'splash_icon.png')
print('Generating splash icon...')
make_splash_icon(splash_path, size=300)

# ── Launcher icons ───────────────────────────────────────────────────────────
densities = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
}

print('Generating launcher icons...')
for density, size in densities.items():
    dir_path = os.path.join(ANDROID, density)
    os.makedirs(dir_path, exist_ok=True)

    make_launcher_icon(os.path.join(dir_path, 'ic_launcher.png'), size, round_=False)
    make_launcher_icon(os.path.join(dir_path, 'ic_launcher_round.png'), size, round_=True)

print('Done.')

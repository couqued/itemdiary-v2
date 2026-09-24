"""앱 아이콘 / 스플래시 이미지 생성 스크립트.

원본: docs/brand/background.svg (배경), docs/brand/logo.svg (유리 보관함 + 보석 로고)
SVG를 Chrome(headless)으로 렌더링한 뒤 Pillow로 크기별 PNG를 만든다.
실행: python3 scripts/generate_icons.py  (Pillow, Google Chrome 필요)
"""
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
BRAND = os.path.join(ROOT, 'docs', 'brand')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SIZE = 1024  # 렌더링 기준 크기

# 적응형 아이콘은 108dp 캔버스 중 약 72dp만 보이므로, 로고를 72/108 크기로 줄여 가운데 둔다
ADAPTIVE_LOGO_RATIO = 72 / 108


def render(layers, out_path, tmp):
    """layers: [(svg 경로, 차지 비율)] 를 가운데 정렬로 겹쳐 투명 배경 PNG로 렌더링."""
    imgs = ''.join(
        f'<img src="file://{path}" style="position:absolute;'
        f'left:{(1 - r) * 50}%;top:{(1 - r) * 50}%;width:{r * 100}%;height:{r * 100}%">'
        for path, r in layers
    )
    html = os.path.join(tmp, 'render.html')
    with open(html, 'w') as f:
        f.write(f'<html><body style="margin:0;background:transparent;width:{SIZE}px;height:{SIZE}px;position:relative">{imgs}</body></html>')
    subprocess.run([
        CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--allow-file-access-from-files', '--default-background-color=00000000',
        f'--window-size={SIZE},{SIZE}', f'--screenshot={out_path}', f'file://{html}',
    ], check=True, capture_output=True)
    img = Image.open(out_path).convert('RGBA')
    assert img.size == (SIZE, SIZE), f'렌더링 크기 오류: {img.size}'
    return img


def masked(img, shape):
    m = Image.new('L', img.size, 0)
    d = ImageDraw.Draw(m)
    box = [0, 0, img.size[0] - 1, img.size[1] - 1]
    if shape == 'circle':
        d.ellipse(box, fill=255)
    else:
        d.rounded_rectangle(box, radius=img.size[0] * 0.22, fill=255)
    out = img.copy()
    out.putalpha(Image.composite(img.getchannel('A'), m, m))
    return out


def main():
    bg_svg = os.path.join(BRAND, 'background.svg')
    logo_svg = os.path.join(BRAND, 'logo.svg')
    with tempfile.TemporaryDirectory() as tmp:
        full = render([(bg_svg, 1), (logo_svg, 1)], os.path.join(tmp, 'full.png'), tmp)
        bg = render([(bg_svg, 1)], os.path.join(tmp, 'bg.png'), tmp)
        fg = render([(logo_svg, ADAPTIVE_LOGO_RATIO)], os.path.join(tmp, 'fg.png'), tmp)
        logo = render([(logo_svg, 1)], os.path.join(tmp, 'logo.png'), tmp)

    legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    adaptive = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
    rounded, circle = masked(full, 'rounded'), masked(full, 'circle')
    for d, px in legacy.items():
        folder = os.path.join(RES, f'mipmap-{d}')
        os.makedirs(folder, exist_ok=True)
        rounded.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
        circle.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_round.png'))
        ap = adaptive[d]
        fg.resize((ap, ap), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))
        bg.convert('RGB').resize((ap, ap), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_background.png'))

    # Play 스토어용 512px (스토어가 모서리를 직접 둥글게 하므로 정사각형 그대로)
    full.convert('RGB').resize((512, 512), Image.LANCZOS).save(os.path.join(BRAND, 'play_store_icon_512.png'))

    # 스플래시 로고: 배경 없이 로고만 (xxhdpi 480px = 160dp)
    folder = os.path.join(RES, 'drawable-xxhdpi')
    os.makedirs(folder, exist_ok=True)
    logo.resize((480, 480), Image.LANCZOS).save(os.path.join(folder, 'splash_icon.png'))
    print('done')


if __name__ == '__main__':
    main()

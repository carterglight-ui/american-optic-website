"""Video thumbnails in a letterpress style: thin line-art pressed into textured white paper,
lit from the upper left. Run: python3 paint-thumbnails.py <out_dir> [scene ...]"""
import math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1600, 1000
LW = 11                    # line width of the pressed artwork
rng = np.random.default_rng(11)

def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8) if a.max() <= 1.001 else a.astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255

def bez(p0, p1, p2, p3, n=48):
    t = np.linspace(0, 1, n)[:, None]
    return ((1-t)**3*np.array(p0) + 3*(1-t)**2*t*np.array(p1) + 3*(1-t)*t*t*np.array(p2) + t**3*np.array(p3)).tolist()

def path(start, segs, ox, oy, s):
    pts, cur = [], start
    for c1, c2, e in segs:
        pts += bez(cur, c1, c2, e); cur = e
    return [(ox + x*s, oy + y*s) for x, y in pts]

# Simple molar outline (closed), unit box about 1 x 1.15
TOOTH = ((0.10, 0.28), [((0.04, 0.04), (0.32, -0.02), (0.50, 0.08)), ((0.68, -0.02), (0.96, 0.04), (0.90, 0.28)),
        ((0.90, 0.50), (0.84, 0.60), (0.82, 0.76)), ((0.80, 0.95), (0.76, 1.06), (0.70, 1.06)), ((0.64, 1.06), (0.64, 0.86), (0.60, 0.74)),
        ((0.57, 0.66), (0.43, 0.66), (0.40, 0.74)), ((0.36, 0.86), (0.36, 1.06), (0.30, 1.06)), ((0.24, 1.06), (0.20, 0.95), (0.18, 0.76)),
        ((0.16, 0.60), (0.10, 0.50), (0.10, 0.28))])
STUMP = ((0.15, 0.56), [((0.16, 0.64), (0.17, 0.70), (0.18, 0.76)), ((0.20, 0.95), (0.24, 1.06), (0.30, 1.06)), ((0.36, 1.06), (0.36, 0.86), (0.40, 0.74)),
        ((0.43, 0.66), (0.57, 0.66), (0.60, 0.74)), ((0.64, 0.86), (0.64, 1.06), (0.70, 1.06)), ((0.76, 1.06), (0.80, 0.95), (0.82, 0.76)),
        ((0.83, 0.70), (0.84, 0.64), (0.85, 0.56)), ((0.66, 0.51), (0.34, 0.51), (0.15, 0.56))])
CAP = ((0.10, 0.28), [((0.04, 0.04), (0.32, -0.02), (0.50, 0.08)), ((0.68, -0.02), (0.96, 0.04), (0.90, 0.28)),
        ((0.89, 0.40), (0.87, 0.48), (0.85, 0.54)), ((0.65, 0.58), (0.35, 0.58), (0.15, 0.54)), ((0.13, 0.48), (0.11, 0.40), (0.10, 0.28))])

class Art:
    def __init__(s):
        s.m = Image.new('L', (W, H), 0); s.d = ImageDraw.Draw(s.m)
    def line(s, pts, closed=False, w=LW):
        pts = [tuple(p) for p in pts] + ([tuple(pts[0])] if closed else [])
        s.d.line(pts, fill=255, width=w, joint='curve')
        for x, y in (pts[0], pts[-1]): s.d.ellipse([x - w/2, y - w/2, x + w/2, y + w/2], fill=255)
    def tooth(s, ox, oy, size, shape=TOOTH): s.line(path(shape[0], shape[1], ox, oy, size), closed=True)
    def sparkle(s, cx, cy, r):
        s.line([(cx + r*.8*math.cos(t)**3, cy + r*math.sin(t)**3) for t in np.linspace(0, 2*math.pi, 90)], closed=True, w=LW - 1)
    def circle(s, cx, cy, r): s.line([(cx + r*math.cos(t), cy + r*math.sin(t)) for t in np.linspace(0, 2*math.pi, 120)], closed=True)

def press(art, out):
    m = np.asarray(art.m.filter(ImageFilter.GaussianBlur(1.4)), dtype=np.float32) / 255
    fine, mid, coarse = (blur(rng.random((H, W)), r) for r in (1.0, 2.6, 9))
    paper = fine * .45 + mid * .4 + coarse * .15
    h = -blur(m, 3.6) * 1.0 + (paper - .5) * .22          # groove depth + paper tooth
    gy, gx = np.gradient(h)
    shade = (gx + gy) * .7                                 # light from the upper left
    dark = np.clip(-shade, 0, None) * 980; lit = np.clip(shade, 0, None) * 420
    base = 243 + (coarse - .5) * 10 - m * 2.5
    r = base - dark * 1.06 + lit; g = base - dark * .97 + lit; b = base - dark * .70 + lit * .92
    img = np.clip(np.dstack([r, g, b]), 0, 255).astype(np.uint8)
    Image.fromarray(img).resize((800, 500), Image.LANCZOS).save(out, quality=88, optimize=True, progressive=True)

SCENES = {}
def scene(f): SCENES[f.__name__] = f; return f

@scene
def calm(a):
    a.tooth(650, 300, 300); a.sparkle(985, 255, 54)

@scene
def mirror_tooth(a):
    a.tooth(560, 300, 300)
    a.circle(1000, 380, 68)
    ang = -0.32; x0, y0 = 1000 - math.sin(ang)*68, 380 + math.cos(ang)*68
    a.line([(x0, y0), (x0 - math.sin(ang)*300, y0 + math.cos(ang)*300)])
    a.sparkle(500, 280, 44)

@scene
def brush(a):
    a.tooth(560, 310, 290)
    ang = -1.2; ux, uy = math.cos(ang), math.sin(ang); nx, ny = -uy, ux
    x0, y0 = 980, 690; x1, y1 = x0 + ux*330, y0 + uy*330
    for off in (-14, 14): a.line([(x0 + nx*off, y0 + ny*off), (x1 + nx*off*.8, y1 + ny*off*.8)])
    a.line([(x0 - nx*14, y0 - ny*14), (x0 + nx*14, y0 + ny*14)])
    hx, hy = x1 + ux*60, y1 + uy*60
    a.line([(x1 + nx*11, y1 + ny*11), (hx + ux*50 + nx*11, hy + uy*50 + ny*11)])
    for t in np.linspace(-10, 100, 6):
        bx, by = x1 + ux*t + nx*11, y1 + uy*t + ny*11
        a.line([(bx, by), (bx + nx*34, by + ny*34)], w=LW - 2)
    a.sparkle(500, 290, 40)

@scene
def crown(a):
    a.tooth(650, 330, 300, STUMP)
    a.tooth(650, 205, 300, CAP)
    a.sparkle(1000, 230, 44)

@scene
def implant(a):
    a.tooth(650, 230, 300, CAP)
    a.line([(760, 410), (840, 410), (830, 470), (770, 470)], closed=True)
    a.line([(770, 470), (830, 470), (816, 720), (800, 752), (784, 720)], closed=True)
    for k in range(6):
        y = 500 + k*38; half = 34 - k*3
        a.line([(800 - half - 8, y + 6), (800 + half + 8, y - 6)], w=LW - 2)
    a.sparkle(1010, 250, 44)

@scene
def floss(a):
    a.tooth(520, 320, 270); a.tooth(800, 320, 270)
    a.line(bez((540, 210), (660, 230), (770, 300), (800, 355)) + bez((800, 355), (830, 300), (940, 230), (1060, 210)))
    a.sparkle(1120, 260, 40)

if __name__ == '__main__':
    out = sys.argv[1]
    for name, f in SCENES.items():
        if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
        a = Art(); f(a); press(a, f'{out}/thumb-{name}.jpg'); print('pressed', name)

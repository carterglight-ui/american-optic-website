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
    def tooth(s, ox, oy, size, shape=TOOTH, rot=0):
        pts = path(shape[0], shape[1], ox, oy, size)
        if rot:
            cx, cy, a = ox + size*.5, oy + size*.55, math.radians(rot)
            pts = [(cx + (x-cx)*math.cos(a) - (y-cy)*math.sin(a), cy + (x-cx)*math.sin(a) + (y-cy)*math.cos(a)) for x, y in pts]
        s.line(pts, closed=True)
    def screw(s, cx, top, length=240, w=56, threads=6):
        s.line([(cx - w/2, top), (cx + w/2, top), (cx + w/2 - 8, top + length*.86), (cx, top + length), (cx - w/2 + 8, top + length*.86)], closed=True)
        for k in range(threads):
            y = top + 34 + k*(length*.74/threads); half = w/2 - 4 - k*1.6
            s.line([(cx - half - 6, y + 6), (cx + half + 6, y - 6)], w=LW - 2)
    def leaf(s, cx, cy, rx, ry, ang):
        a = math.radians(ang)
        s.line([(cx + rx*math.cos(t)*math.cos(a) - ry*math.sin(t)*math.sin(a), cy + rx*math.cos(t)*math.sin(a) + ry*math.sin(t)*math.cos(a)) for t in np.linspace(0, 2*math.pi, 60)], closed=True, w=LW - 2)
    def roundrect(s, x0, y0, x1, y1, r):
        pts = []
        for cx, cy, a0 in [(x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)]:
            pts += [(cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a))) for a in np.linspace(a0, a0 + 90, 12)]
        s.line(pts, closed=True)
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

def implant_set(a, cx, top, size=280):
    a.tooth(cx - size*.5, top, size, CAP)
    y = top + size*.56
    a.line([(cx - 38, y), (cx + 38, y), (cx + 30, y + 54), (cx - 30, y + 54)], closed=True)
    a.screw(cx, y + 54, 230, 54)

@scene
def v_deep(a):
    a.tooth(560, 290, 300)
    a.line(bez((470, 500), (600, 470), (740, 540), (900, 492)))           # gumline
    a.line([(1090, 760), (958, 440)])                                       # scaler handle
    a.line(bez((958, 440), (946, 404), (900, 398), (872, 440)))            # curved tip at the gumline
    a.sparkle(500, 270, 42)

@scene
def v_fixed(a):
    for i in range(4): a.tooth(495 + i*152, 300, 160, CAP)
    a.line([(500, 398), (1100, 398)])
    for x in (620, 980): a.screw(x, 410, 210, 46)
    a.sparkle(1150, 260, 42)

@scene
def v_ahmed(a):
    implant_set(a, 800, 210)
    a.sparkle(1010, 240, 44); a.sparkle(560, 330, 28)

@scene
def v_immediate(a):
    a.tooth(470, 260, 230, rot=-14)
    a.line(bez((700, 300), (760, 250), (840, 250), (880, 300)))            # arrow: old tooth out, implant in
    a.line([(880, 300), (850, 296)]); a.line([(880, 300), (876, 270)])
    implant_set(a, 1000, 320, 240)
    a.sparkle(1180, 290, 38)

@scene
def v_over(a):
    for i in range(4): a.tooth(520 + i*142, 260, 150, CAP)
    a.roundrect(500, 340, 1100, 420, 34)
    for x in (650, 950):
        a.circle(x, 520, 22); a.line([(x, 542), (x, 690)]); a.line([(x - 30, 690), (x + 30, 690)])
    a.sparkle(1160, 240, 42)

@scene
def v_partial(a):
    for i in range(2): a.tooth(610 + i*190, 400, 200, CAP)
    a.roundrect(585, 512, 1015, 588, 30)
    a.line(bez((585, 550), (515, 550), (492, 480), (540, 440)))           # clasps
    a.line(bez((1015, 550), (1085, 550), (1108, 480), (1060, 440)))
    a.sparkle(1150, 390, 40)

@scene
def v_rootcanal(a):
    a.tooth(650, 290, 300)
    sc = lambda x, y: (650 + x*300, 290 + y*300)
    a.line([sc(*p) for p in bez((0.36, 0.46), (0.40, 0.32), (0.60, 0.32), (0.64, 0.46))], w=LW - 3)
    a.line([sc(*p) for p in bez((0.38, 0.46), (0.36, 0.70), (0.33, 0.88), (0.32, 0.98))], w=LW - 3)
    a.line([sc(*p) for p in bez((0.62, 0.46), (0.64, 0.70), (0.67, 0.88), (0.68, 0.98))], w=LW - 3)
    a.sparkle(990, 250, 44)

@scene
def v_sedation(a):
    a.tooth(520, 300, 290)
    stem = bez((960, 720), (990, 580), (1040, 440), (1120, 290), 60)
    a.line(stem)
    for i, (x, y) in enumerate(stem[12::11]):
        side = 1 if i % 2 else -1
        a.leaf(x + side*52, y - 6, 56, 22, -40 if side < 0 else 30)
    a.sparkle(470, 280, 40)

@scene
def v_whitening(a):
    a.tooth(650, 300, 300)
    a.sparkle(990, 260, 54); a.sparkle(1060, 400, 30); a.sparkle(560, 300, 34)

@scene
def v_wisdom(a):
    a.tooth(520, 330, 240)
    a.tooth(820, 350, 240, rot=32)
    a.line([(540, 640), (1120, 640)])                                       # gumline / bone level
    a.sparkle(1130, 270, 40)

if __name__ == '__main__':
    out = sys.argv[1]
    for name, f in SCENES.items():
        if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
        a = Art(); f(a); press(a, f'{out}/thumb-{name}.jpg'); print('pressed', name)

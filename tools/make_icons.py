"""生成应用图标:日历 + 对号,蓝白配色(与界面主题 #4F46E5 一致)。

用法:
    python tools/make_icons.py [输出目录]

默认输出到 mobile/assets/。输出文件:
    icon.png                     1024 应用主图标
    splash-icon.png              1024 启动图(圆角、透明角)
    favicon.png                  48  网页图标
    android-icon-background.png  512 自适应图标背景(渐变蓝)
    android-icon-foreground.png  512 自适应图标前景(透明底图形)
    android-icon-monochrome.png  432 单色图标(白色剪影)
"""

import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw

# ---------- 基础 ----------
W = 1024
SS = 4               # 超采样倍数,绘制后缩小获得平滑边缘
S = W * SS

BLUE = (79, 70, 229)        # #4F46E5 主题色(对号)
HEADER = (55, 48, 163)      # #3730A3 日历顶部日期条
TICK = (199, 210, 254)      # #C7D2FE 日期条上的浅色刻度
WHITE = (255, 255, 255)

# 日历卡片与对号的几何(1024 坐标系)
CARD = (170, 250, 854, 870)
CARD_R = 84
HEADER_BOTTOM = 410
RINGS = (370, 654)
CHECK = [(352, 640), (466, 752), (676, 530)]
CHECK_W = 92


def d(v):
    return int(round(v * SS))


def gradient_bg(size):
    """左上到右下的蓝色渐变,与界面主题色一致。"""
    ys, xs = np.mgrid[0:size, 0:size]
    t = ((xs + ys) / (2.0 * (size - 1)))[..., None]
    c0 = np.array([109, 107, 240], dtype=np.float64)  # #6D6BF0
    c1 = np.array([74, 66, 214], dtype=np.float64)    # #4A42D6
    arr = (c0 + (c1 - c0) * t).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")


def card_mask():
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([d(v) for v in CARD], radius=d(CARD_R), fill=255)
    return m


def header_mask(card):
    m = Image.new("L", (S, S), 0)
    x0, y0, x1, _ = CARD
    ImageDraw.Draw(m).rectangle([d(x0), d(y0), d(x1), d(HEADER_BOTTOM)], fill=255)
    return ImageChops.multiply(m, card)


def check_mask(width=CHECK_W):
    """圆头圆角的粗对号。"""
    m = Image.new("L", (S, S), 0)
    dr = ImageDraw.Draw(m)
    pts = [(d(x), d(y)) for x, y in CHECK]
    dr.line(pts, fill=255, width=d(width), joint="curve")
    r = d(width) / 2
    for x, y in (pts[0], pts[-1]):
        dr.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return m


def rings_mask():
    m = Image.new("L", (S, S), 0)
    dr = ImageDraw.Draw(m)
    for cx in RINGS:
        dr.rounded_rectangle([d(cx - 30), d(180), d(cx + 30), d(330)], radius=d(30), fill=255)
    return m


def ring_holes_mask():
    """日期条上装订环的落点(深色圆孔)。"""
    m = Image.new("L", (S, S), 0)
    dr = ImageDraw.Draw(m)
    for cx in RINGS:
        dr.ellipse([d(cx - 22), d(318), d(cx + 22), d(362)], fill=255)
    return m


def fill(canvas, color, mask):
    canvas.paste(Image.new("RGBA", (S, S), color + (255,)), (0, 0), mask)


def render(with_bg=True):
    canvas = gradient_bg(S) if with_bg else Image.new("RGBA", (S, S), (0, 0, 0, 0))
    card = card_mask()

    fill(canvas, WHITE, card)                     # 白色卡片
    fill(canvas, HEADER, header_mask(card))       # 顶部深蓝日期条
    fill(canvas, TICK, ring_holes_mask())         # 装订孔
    fill(canvas, WHITE, rings_mask())             # 装订环
    fill(canvas, BLUE, check_mask())              # 蓝色对号
    return canvas


def render_mono():
    """单色剪影:白色日历,对号与日期条分隔线镂空。"""
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    card = card_mask()

    # 日期条下方挖一道缝,区分顶栏与正文
    gap = Image.new("L", (S, S), 0)
    x0, _, x1, _ = CARD
    ImageDraw.Draw(gap).rectangle(
        [d(x0), d(HEADER_BOTTOM - 10), d(x1), d(HEADER_BOTTOM + 10)], fill=255
    )
    body = ImageChops.subtract(card, gap)
    body = ImageChops.subtract(body, check_mask())
    body = ImageChops.subtract(body, ring_holes_mask())
    fill(canvas, WHITE, body)

    # 装订环与卡片之间留透明缝,避免粘成一团
    rings = rings_mask()
    halo = Image.new("L", (S, S), 0)
    dr = ImageDraw.Draw(halo)
    for cx in RINGS:
        dr.rounded_rectangle([d(cx - 44), d(166), d(cx + 44), d(344)], radius=d(44), fill=255)
    canvas.putalpha(ImageChops.subtract(canvas.split()[3], halo))
    fill(canvas, WHITE, rings)
    return canvas


def scaled_glyph(img, target_max, box=512):
    """按内容裁剪并等比缩放,居中放到透明方图中。"""
    bbox = img.split()[3].getbbox()
    art = img.crop(bbox)
    scale = target_max / max(art.size)
    art = art.resize(
        (max(1, round(art.width * scale)), max(1, round(art.height * scale))),
        Image.LANCZOS,
    )
    out = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    out.alpha_composite(art, ((box - art.width) // 2, (box - art.height) // 2))
    return out


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.width - 1, img.height - 1], radius=radius, fill=255
    )
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "mobile", "assets"
    )
    os.makedirs(out, exist_ok=True)

    # 主图标
    icon = render(with_bg=True).resize((W, W), Image.LANCZOS).convert("RGB")
    icon.save(os.path.join(out, "icon.png"))

    # 启动图(圆角)
    rounded(icon.convert("RGBA"), radius=180).save(os.path.join(out, "splash-icon.png"))

    # 网页图标
    icon.resize((48, 48), Image.LANCZOS).save(os.path.join(out, "favicon.png"))

    # 自适应背景
    gradient_bg(W).resize((512, 512), Image.LANCZOS).save(
        os.path.join(out, "android-icon-background.png")
    )

    # 自适应前景(安全区 ~66%,图形控制在 235px 内)
    scaled_glyph(render(with_bg=False), 235).save(
        os.path.join(out, "android-icon-foreground.png")
    )

    # 单色图标
    scaled_glyph(render_mono(), 190, box=432).save(
        os.path.join(out, "android-icon-monochrome.png")
    )

    print("图标已写入", os.path.abspath(out))


if __name__ == "__main__":
    main()

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "ui-mockups"

WIDTH = 1440
HEIGHT = 960
WHITE = "#FFFFFF"


def load_font(size: int, bold: bool = False):
    candidates = []
    if bold:
        candidates.extend(
            [
                r"C:\Windows\Fonts\msyhbd.ttc",
                r"C:\Windows\Fonts\segoeuib.ttf",
                r"C:\Windows\Fonts\arialbd.ttf",
            ]
        )
    else:
        candidates.extend(
            [
                r"C:\Windows\Fonts\msyh.ttc",
                r"C:\Windows\Fonts\segoeui.ttf",
                r"C:\Windows\Fonts\arial.ttf",
            ]
        )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


FONT_H1 = load_font(42, bold=True)
FONT_H2 = load_font(30, bold=True)
FONT_H3 = load_font(22, bold=True)
FONT_BODY = load_font(18)
FONT_SMALL = load_font(15)
FONT_TINY = load_font(13)


def rounded(draw, box, radius=18, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, content, font, fill="#173D56", anchor=None):
    draw.text(xy, content, font=font, fill=fill, anchor=anchor)


def add_glow(img, box, fill, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    color = fill.lstrip("#")
    rgba = (int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16), alpha)
    draw.ellipse(box, fill=rgba)
    img.alpha_composite(layer)


def pill(draw, box, label, fill=(244, 247, 251, 170), text_fill="#6C7E8F"):
    rounded(draw, box, radius=(box[3] - box[1]) // 2, fill=fill, outline=None, width=0)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_TINY, fill=text_fill, anchor="mm")


def cultural_background(width=WIDTH, height=HEIGHT):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    top = (240, 246, 249)
    mid = (223, 239, 241)
    bottom = (248, 241, 231)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        if ratio < 0.5:
            t = ratio / 0.5
            r = int(top[0] * (1 - t) + mid[0] * t)
            g = int(top[1] * (1 - t) + mid[1] * t)
            b = int(top[2] * (1 - t) + mid[2] * t)
        else:
            t = (ratio - 0.5) / 0.5
            r = int(mid[0] * (1 - t) + bottom[0] * t)
            g = int(mid[1] * (1 - t) + bottom[1] * t)
            b = int(mid[2] * (1 - t) + bottom[2] * t)
        for x in range(width):
            px[x, y] = (r, g, b, 255)

    add_glow(img, (40, 50, 640, 420), "#BEEFE1", 88)
    add_glow(img, (860, 70, 1370, 460), "#FFDAB9", 112)
    add_glow(img, (930, 130, 1300, 500), "#FFC68C", 72)
    add_glow(img, (260, 520, 840, 960), "#E3EEFF", 74)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    draw.polygon([(0, 700), (220, 520), (450, 710)], fill=(95, 127, 138, 36))
    draw.polygon([(280, 740), (620, 440), (1040, 742)], fill=(76, 111, 124, 42))
    draw.polygon([(820, 760), (1130, 500), (1440, 760)], fill=(88, 108, 120, 46))
    draw.polygon([(0, 790), (380, 760), (850, 790), (1440, 770), (1440, 960), (0, 960)], fill=(120, 158, 166, 28))

    cloud = (255, 255, 255, 66)
    for x, y, w in [(130, 180, 220), (1010, 170, 210), (960, 250, 160)]:
        draw.arc((x, y, x + w, y + 70), 180, 360, fill=cloud, width=3)
        draw.arc((x + 58, y - 18, x + w - 10, y + 48), 180, 360, fill=cloud, width=3)

    gold = (214, 165, 92, 72)
    draw.arc((102, 128, 360, 246), 198, 332, fill=gold, width=2)
    draw.arc((1120, 120, 1310, 210), 200, 340, fill=gold, width=2)
    draw.rounded_rectangle((1198, 650, 1258, 710), radius=12, fill=(208, 69, 63, 120))
    draw.text((1212, 664), "印", font=FONT_BODY, fill=(255, 241, 236, 188))

    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
    haze = Image.new("RGBA", img.size, (255, 251, 246, 26))
    img = Image.alpha_composite(img, haze)
    return img.filter(ImageFilter.GaussianBlur(0.8))


def glass_panel(draw, box, radius=22, fill=(255, 255, 255, 170), outline=(255, 255, 255, 118)):
    x1, y1, x2, y2 = box
    for i in range(10):
        a = max(10 - i, 1)
        rounded(
            draw,
            (x1 - i, y1 - i + 3, x2 + i, y2 + i + 6),
            radius=radius + i,
            fill=(110, 145, 162, a),
            outline=None,
            width=0,
        )
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)
    rounded(draw, (x1 + 1, y1 + 1, x2 - 1, y1 + 16), radius=radius, fill=(255, 255, 255, 36), outline=None, width=0)


def button(draw, box, label, style="soft"):
    if style == "primary":
        fill = (255, 145, 74, 236)
        outline = (255, 181, 118, 232)
        text_fill = WHITE
    elif style == "accent":
        fill = (64, 201, 168, 224)
        outline = (106, 222, 191, 228)
        text_fill = WHITE
    else:
        fill = (255, 255, 255, 104)
        outline = (255, 255, 255, 84)
        text_fill = "#587084"
    rounded(draw, box, radius=18, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    rounded(draw, (x1 + 1, y1 + 1, x2 - 1, y1 + 12), radius=18, fill=(255, 255, 255, 22), outline=None, width=0)
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_SMALL, fill=text_fill, anchor="mm")


def icon_text_item(draw, x, y, color, icon_label, text_label, selected=False):
    if selected:
        rounded(draw, (x - 12, y - 8, x + 168, y + 32), radius=16, fill=(255, 255, 255, 102), outline=(255, 255, 255, 80), width=1)
    rounded(draw, (x, y, x + 24, y + 24), radius=8, fill=color)
    text(draw, (x + 12, y + 12), icon_label, FONT_TINY, fill="#23435A", anchor="mm")
    text(draw, (x + 36, y + 1), text_label, FONT_BODY, fill="#25445D")


def card(draw, x, y, w, h, title, subtitle, tag, tint, icon_label):
    glass_panel(draw, (x, y, x + w, y + h), radius=18, fill=(255, 255, 255, 156), outline=(255, 255, 255, 102))
    rounded(draw, (x + 18, y + 18, x + 64, y + 64), radius=14, fill=tint)
    text(draw, (x + 41, y + 41), icon_label, FONT_BODY, fill="#26425A", anchor="mm")
    pill(draw, (x + 76, y + 26, x + 150, y + 52), tag)
    text(draw, (x + 18, y + 88), title, FONT_H3)
    text(draw, (x + 18, y + 122), subtitle, FONT_TINY, fill="#668091")
    button(draw, (x + 18, y + h - 46, x + 90, y + h - 12), "打开", style="soft")
    button(draw, (x + 98, y + h - 46, x + 170, y + h - 12), "更多", style="soft")


def save(img, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / name)


def draw_dashboard():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel(draw, (52, 56, WIDTH - 52, HEIGHT - 56), radius=30, fill=(254, 251, 247, 120), outline=(255, 255, 255, 96))
    glass_panel(draw, (80, 86, 300, HEIGHT - 88), radius=22, fill=(255, 255, 255, 148), outline=(255, 255, 255, 102))
    glass_panel(draw, (320, 86, WIDTH - 80, 156), radius=20, fill=(255, 255, 255, 144), outline=(255, 255, 255, 98))
    glass_panel(draw, (320, 172, WIDTH - 80, HEIGHT - 88), radius=24, fill=(255, 255, 255, 152), outline=(255, 255, 255, 104))

    text(draw, (108, 122), "桌面控制台", FONT_H2, fill="#214963")
    text(draw, (108, 152), "网站与应用统一入口", FONT_SMALL, fill="#6E8696")

    icon_text_item(draw, 106, 206, "#DDEEFF", "首", "首页")
    icon_text_item(draw, 106, 258, "#FFE7D8", "生", "生活软件")
    icon_text_item(draw, 106, 310, "#E3F5E9", "英", "英语学习")
    icon_text_item(draw, 106, 362, "#DDEFFF", "技", "技术工具", selected=True)
    icon_text_item(draw, 106, 414, "#F1E6FF", "网", "常用网站")
    icon_text_item(draw, 106, 466, "#FFF0DD", "商", "电商工具")

    button(draw, (104, HEIGHT - 142, 274, HEIGHT - 100), "新建分类", style="accent")
    rounded(draw, (344, 102, 800, 142), radius=18, fill=(255, 255, 255, 102), outline=(255, 255, 255, 84), width=1)
    text(draw, (374, 114), "搜索网站、应用、分类", FONT_BODY, fill="#7991A3")
    button(draw, (838, 98, 964, 144), "新增卡片", style="primary")
    button(draw, (976, 98, 1092, 144), "快捷唤起", style="accent")
    button(draw, (1106, 98, 1194, 144), "锁定", style="soft")
    button(draw, (1206, 98, 1288, 144), "设置", style="soft")

    text(draw, (346, 206), "技术工具", FONT_H1, fill="#20455F")
    text(draw, (348, 248), "常用 12 项  ·  已置顶 4 项  ·  最近使用 3 项", FONT_SMALL, fill="#7890A1")
    button(draw, (968, 198, 1080, 238), "导入书签", style="soft")
    button(draw, (1092, 198, 1202, 238), "拖拽添加", style="primary")
    button(draw, (1214, 198, 1318, 238), "托盘预览", style="soft")

    text(draw, (348, 292), "快捷入口", FONT_H3, fill="#20455F")
    quick_cards = [
        ("GitHub", "代码托管平台", "网站", "#DFEBFF", "码"),
        ("VS Code", "桌面应用", "应用", "#E0F4E7", "编"),
        ("Gitee", "常用代码仓库", "网站", "#FFE7D8", "仓"),
        ("终端", "命令行工具", "应用", "#EFE6FF", "终"),
    ]
    for i, item in enumerate(quick_cards):
        card(draw, 348 + i * 226, 320, 208, 164, *item)

    text(draw, (348, 532), "全部卡片", FONT_H3, fill="#20455F")
    cards = [
        ("微信", "桌面应用", "应用", "#E2F5E8", "微"),
        ("飞书", "办公协作平台", "网站", "#FFE8DA", "飞"),
        ("Docker", "容器工具", "应用", "#DCEBFF", "器"),
        ("掘金", "开发内容社区", "网站", "#EFE6FF", "掘"),
        ("Figma", "设计协作工具", "网站", "#FFECDD", "设"),
        ("Cursor", "智能编程工具", "应用", "#E3F5E9", "智"),
        ("Chrome", "浏览器入口", "应用", "#FFF2DF", "览"),
        ("阿里云", "云服务平台", "网站", "#DFF0FF", "云"),
    ]
    for idx, item in enumerate(cards):
        col = idx % 4
        row = idx // 4
        card(draw, 348 + col * 226, 560 + row * 180, 208, 164, *item)

    save(img, "ui-dashboard-cn-v6.png")


def draw_lock_screen():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")
    glass_panel(draw, (286, 174, 1106, 770), radius=28, fill=(250, 247, 241, 118), outline=(255, 255, 255, 96))
    glass_panel(draw, (544, 246, 940, 620), radius=22, fill=(255, 255, 255, 172), outline=(255, 255, 255, 108))
    text(draw, (742, 320), "桌面控制台", FONT_H1, fill="#214763", anchor="mm")
    text(draw, (742, 364), "你的桌面，从未如此井然有序。", FONT_BODY, fill="#718899", anchor="mm")
    rounded(draw, (622, 432, 862, 486), radius=16, fill=(255, 255, 255, 104), outline=(255, 255, 255, 82), width=1)
    for i in range(4):
        draw.line((654, 450 + i * 9, 814 - i * 26, 450 + i * 9), fill=(114, 131, 144, 186), width=2)
    button(draw, (676, 530, 792, 572), "进入", style="primary")
    button(draw, (804, 530, 890, 572), "解锁", style="accent")
    save(img, "ui-lock-screen-cn-v6.png")


def draw_modal():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(42, 46, 54, 58))
    glass_panel(draw, (408, 126, 1050, 818), radius=24, fill=(255, 255, 255, 178), outline=(255, 255, 255, 106))
    text(draw, (454, 182), "新增卡片", FONT_H1, fill="#214862")
    text(draw, (454, 222), "支持网站地址、桌面应用、拖拽导入", FONT_BODY, fill="#708798")
    text(draw, (454, 278), "卡片类型", FONT_SMALL, fill="#6C8597")
    button(draw, (454, 304, 572, 346), "网站卡片", style="primary")
    button(draw, (584, 304, 706, 346), "桌面应用", style="soft")
    button(draw, (718, 304, 834, 346), "拖拽添加", style="accent")

    groups = [
        ("基础信息", [("名称", "GitHub"), ("分类", "技术工具")]),
        ("目标地址", [("网址", "https://github.com")]),
        ("显示设置", [("图标", "自动抓取 favicon"), ("备注", "代码托管与协作平台")]),
    ]
    y = 386
    for group_title, fields in groups:
        text(draw, (454, y), group_title, FONT_BODY, fill="#224A64")
        y += 26
        for label, value in fields:
            text(draw, (454, y), label, FONT_SMALL, fill="#6C8597")
            rounded(draw, (454, y + 18, 1008, y + 68), radius=14, fill=(255, 255, 255, 106), outline=(255, 255, 255, 78), width=1)
            text(draw, (478, y + 32), value, FONT_BODY, fill="#7E94A5" if label != "名称" else "#264A63")
            y += 82
        y += 6
    button(draw, (792, 742, 888, 784), "取消", style="soft")
    button(draw, (900, 742, 1008, 784), "保存", style="primary")
    save(img, "ui-add-card-modal-cn-v6.png")


def draw_board():
    board = Image.new("RGBA", (1800, 1320), (243, 246, 241, 255))
    draw = ImageDraw.Draw(board, "RGBA")
    text(draw, (80, 72), "UI 方向板 v6", FONT_H1, fill="#244B64")
    text(draw, (80, 118), "更轻边框 / 更柔玻璃感 / 更克制的国风点缀 / 更成熟的产品效果", FONT_BODY, fill="#728899")

    items = [
        ("解锁页", OUT_DIR / "ui-lock-screen-cn-v6.png"),
        ("主工作台", OUT_DIR / "ui-dashboard-cn-v6.png"),
        ("新增卡片弹窗", OUT_DIR / "ui-add-card-modal-cn-v6.png"),
    ]
    placements = [(80, 180, 800, 520), (920, 180, 800, 520), (300, 760, 1200, 470)]
    for (label, path), (x, y, w, h) in zip(items, placements):
        rounded(draw, (x, y, x + w, y + h), radius=28, fill=(251, 252, 249, 255), outline=(227, 232, 227, 255), width=1)
        text(draw, (x + 24, y + 20), label, FONT_H3, fill="#244B64")
        if path.exists():
            panel = Image.open(path).convert("RGB")
            panel.thumbnail((w - 40, h - 70))
            px = x + (w - panel.width) // 2
            py = y + 56
            board.paste(panel, (px, py))
    save(board, "ui-overview-board-cn-v6.png")


def main():
    draw_lock_screen()
    draw_dashboard()
    draw_modal()
    draw_board()
    print(f"Generated CN v6 mockups in: {OUT_DIR}")


if __name__ == "__main__":
    main()

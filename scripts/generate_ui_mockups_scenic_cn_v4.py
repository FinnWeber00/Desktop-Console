from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "ui-mockups"

WIDTH = 1440
HEIGHT = 960

BG_TOP = (241, 245, 251)
BG_BOTTOM = (230, 235, 244)
WHITE = "#FFFFFF"
TEXT = "#111418"
TEXT_SOFT = "#6E7785"
TEXT_MUTED = "#98A2B3"
ACCENT = "#0A84FF"
ACCENT_DARK = "#0066CC"


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


def text(draw, xy, content, font, fill=TEXT, anchor=None):
    draw.text(xy, content, font=font, fill=fill, anchor=anchor)


def rounded(draw, box, radius=18, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def _rgba(color: str, alpha=255):
    color = color.lstrip("#")
    return (int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16), alpha)


def add_glow(img, box, fill, alpha=255):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box, fill=_rgba(fill, alpha))
    img.alpha_composite(layer)


def shadow(draw, box, radius=24, spread=10, alpha=22):
    x1, y1, x2, y2 = box
    for i in range(spread):
        a = max(alpha - i * 2, 2)
        rounded(draw, (x1 - i, y1 - i + 4, x2 + i, y2 + i + 4), radius=radius + i, fill=(12, 20, 32, a))


def scenic_background(width=WIDTH, height=HEIGHT):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    top = (87, 123, 162)
    mid = (118, 164, 191)
    bottom = (28, 55, 71)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        if ratio < 0.55:
            t = ratio / 0.55
            r = int(top[0] * (1 - t) + mid[0] * t)
            g = int(top[1] * (1 - t) + mid[1] * t)
            b = int(top[2] * (1 - t) + mid[2] * t)
        else:
            t = (ratio - 0.55) / 0.45
            r = int(mid[0] * (1 - t) + bottom[0] * t)
            g = int(mid[1] * (1 - t) + bottom[1] * t)
            b = int(mid[2] * (1 - t) + bottom[2] * t)
        for x in range(width):
            px[x, y] = (r, g, b, 255)

    add_glow(img, (80, 40, 1040, 620), "#CBEAF7", 135)
    add_glow(img, (900, 220, 1380, 760), "#FFB98A", 150)
    add_glow(img, (880, 260, 1210, 580), "#FF8C63", 118)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    draw.polygon([(0, 650), (220, 470), (420, 668)], fill=(33, 54, 67, 170))
    draw.polygon([(230, 690), (560, 394), (952, 702)], fill=(26, 47, 57, 182))
    draw.polygon([(760, 708), (1036, 432), (1380, 718)], fill=(28, 44, 52, 196))
    draw.polygon([(930, 728), (1216, 520), (1440, 746)], fill=(22, 36, 44, 206))
    draw.polygon([(0, 760), (340, 700), (740, 730), (1140, 690), (1440, 750), (1440, 960), (0, 960)], fill=(33, 78, 101, 188))
    draw.ellipse((760, 350, 1110, 560), fill=(255, 153, 102, 96))
    draw.ellipse((830, 380, 1190, 610), fill=(255, 123, 82, 74))

    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(14)))
    haze = Image.new("RGBA", img.size, (246, 250, 255, 22))
    img = Image.alpha_composite(img, haze)
    return img.filter(ImageFilter.GaussianBlur(1.6))


def pill(draw, box, label, fill=(239, 244, 250, 168), text_fill="#6C7E8F"):
    rounded(draw, box, radius=(box[3] - box[1]) // 2, fill=fill)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_TINY, fill=text_fill, anchor="mm")


def button(draw, box, label, style="secondary"):
    if style == "primary":
        fill = "#1381F6"
        outline = "#2D89EF"
        text_fill = WHITE
    elif style == "glass":
        fill = (255, 255, 255, 108)
        outline = (255, 255, 255, 96)
        text_fill = "#456177"
    else:
        fill = WHITE
        outline = "#DCE3EE"
        text_fill = TEXT
    rounded(draw, box, radius=20, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_SMALL, fill=text_fill, anchor="mm")


def glass_panel_rgba(draw, box, radius=28, fill=(255, 255, 255, 188), outline=(255, 255, 255, 110)):
    shadow(draw, box, radius=radius, spread=14, alpha=16)
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)


def icon_chip(draw, box, label, fill, fg=TEXT):
    rounded(draw, box, radius=18, fill=fill)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_H3, fill=fg, anchor="mm")


def draw_card(draw, x, y, w, h, title, subtitle, tag, tint):
    glass_panel_rgba(draw, (x, y, x + w, y + h), radius=24, fill=(255, 255, 255, 146), outline=(255, 255, 255, 86))
    icon_label = title[:1]
    icon_chip(draw, (x + 18, y + 18, x + 70, y + 70), icon_label, tint, fg="#1E2A35")
    tag_right = x + 130 if tag == "网站" else x + 118
    pill(draw, (x + 82, y + 26, tag_right, y + 52), tag)
    text(draw, (x + 18, y + 96), title, FONT_H3, fill="#17344B")
    text(draw, (x + 18, y + 128), subtitle, FONT_TINY, fill="#6B8192")
    button(draw, (x + 18, y + h - 50, x + 92, y + h - 16), "打开", style="glass")
    button(draw, (x + 102, y + h - 50, x + 172, y + h - 16), "更多", style="glass")


def save(img, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / name)


def draw_dashboard():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")

    shadow(draw, (54, 62, WIDTH - 54, HEIGHT - 72), radius=28, spread=12, alpha=14)
    rounded(draw, (64, 72, WIDTH - 64, HEIGHT - 82), radius=28, fill=(17, 34, 46, 82), outline=(128, 175, 208, 72), width=1)
    glass_panel_rgba(draw, (98, 108, 312, HEIGHT - 122), radius=24, fill=(248, 251, 255, 156), outline=(255, 255, 255, 82))
    glass_panel_rgba(draw, (334, 108, WIDTH - 98, 174), radius=22, fill=(248, 251, 255, 150), outline=(255, 255, 255, 82))
    glass_panel_rgba(draw, (334, 190, WIDTH - 98, HEIGHT - 122), radius=28, fill=(248, 251, 255, 162), outline=(255, 255, 255, 84))

    text(draw, (116, 144), "桌面控制台", FONT_H2, fill="#12324B")
    text(draw, (116, 174), "网站与应用统一入口", FONT_SMALL, fill="#567189")

    menu_items = ["全部", "生活软件", "英语学习", "技术工具", "常用网站", "电商工具"]
    y = 228
    for item in menu_items:
        selected = item == "技术工具"
        if selected:
            rounded(draw, (104, y - 6, 292, y + 36), radius=16, fill=(227, 240, 253, 195))
        text(draw, (126, y), item, FONT_BODY, fill="#173955" if selected else "#5C768B")
        y += 56

    button(draw, (112, HEIGHT - 178, 286, HEIGHT - 134), "新建分类", style="glass")
    rounded(draw, (360, 118, 742, 152), radius=18, fill=(255, 255, 255, 104), outline=(255, 255, 255, 74), width=1)
    text(draw, (388, 126), "搜索网站、应用、分类", FONT_SMALL, fill="#6A8194")
    button(draw, (962, 112, 1066, 156), "新增", style="primary")
    button(draw, (1080, 112, 1172, 156), "锁定", style="glass")
    button(draw, (1184, 112, 1296, 156), "设置", style="glass")

    text(draw, (372, 238), "技术工具", FONT_H1, fill="#17344B")
    text(draw, (372, 282), "12 个卡片  ·  4 个置顶  ·  3 个最近使用", FONT_SMALL, fill="#5C7587")
    text(draw, (372, 336), "快捷入口", FONT_H3, fill="#17344B")

    quick = [
        ("GitHub", "置顶网站", "网站", "#D6E8F9"),
        ("VS Code", "置顶桌面应用", "应用", "#D7F1E1"),
        ("Gitee", "置顶网站", "网站", "#FFE3D6"),
        ("终端", "置顶桌面应用", "应用", "#E9E0FF"),
    ]
    for i, item in enumerate(quick):
        draw_card(draw, 372 + i * 224, 364, 196, 170, *item)

    text(draw, (372, 586), "全部卡片", FONT_H3, fill="#17344B")
    items = [
        ("微信", "D:/Apps/WeChat/WeChat.exe", "应用", "#D7F1E1"),
        ("Notion", "notion.so", "网站", "#FFE7C7"),
        ("Docker", "D:/Apps/Docker/Docker.exe", "应用", "#D7E8FF"),
        ("掘金", "juejin.cn", "网站", "#E9E0FF"),
        ("Figma", "figma.com", "网站", "#FFE2D6"),
        ("Cursor", "D:/Apps/Cursor/Cursor.exe", "应用", "#D8F0E0"),
    ]
    start_x = 372
    start_y = 614
    gap_x = 224
    gap_y = 184
    for idx, item in enumerate(items):
        col = idx % 4
        row = idx // 4
        draw_card(draw, start_x + col * gap_x, start_y + row * gap_y, 196, 170, *item)

    save(img, "ui-dashboard-scenic-cn-v4.png")


def draw_lock_screen():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")

    shadow(draw, (258, 168, 1112, 784), radius=30, spread=14, alpha=16)
    rounded(draw, (274, 184, 1096, 768), radius=24, fill=(17, 32, 44, 78), outline=(136, 185, 214, 70), width=1)
    glass_panel_rgba(draw, (538, 250, 954, 636), radius=22, fill=(248, 251, 255, 176), outline=(255, 255, 255, 94))

    text(draw, (745, 334), "桌面控制台", FONT_H1, fill="#17344B", anchor="mm")
    text(draw, (745, 380), "一个安静好用的个人工作台", FONT_BODY, fill="#5F7688", anchor="mm")
    rounded(draw, (612, 448, 878, 506), radius=18, fill=(255, 255, 255, 110), outline=(255, 255, 255, 80), width=1)
    for i in range(4):
        draw.line((642, 470 + i * 10, 835 - i * 24, 470 + i * 10), fill=(91, 108, 122, 210), width=2)

    button(draw, (740, 556, 858, 596), "解锁", style="primary")
    save(img, "ui-lock-screen-scenic-cn-v4.png")


def draw_modal():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(10, 18, 28, 92))

    glass_panel_rgba(draw, (420, 132, 1042, 810), radius=24, fill=(248, 251, 255, 184), outline=(255, 255, 255, 96))
    text(draw, (468, 194), "新增卡片", FONT_H1, fill="#16344A")
    text(draw, (468, 236), "快速添加网站或桌面应用", FONT_BODY, fill="#5A7487")
    text(draw, (468, 292), "类型", FONT_SMALL, fill="#617A8D")
    button(draw, (468, 316, 620, 360), "网站", style="primary")
    button(draw, (634, 316, 804, 360), "桌面应用", style="glass")

    fields = [
        ("名称", "GitHub"),
        ("分类", "技术工具"),
        ("网址", "https://github.com"),
        ("图标", "自动抓取 favicon"),
        ("备注", "代码托管与协作平台"),
    ]
    y = 404
    for label, value in fields:
        text(draw, (468, y), label, FONT_SMALL, fill="#60798A")
        rounded(draw, (468, y + 22, 994, y + 78), radius=18, fill=(255, 255, 255, 112), outline=(255, 255, 255, 78), width=1)
        text(draw, (492, y + 39), value, FONT_BODY, fill="#70889A" if label != "名称" else "#1A3850")
        y += 98

    button(draw, (792, 734, 884, 776), "取消", style="glass")
    button(draw, (896, 734, 994, 776), "保存", style="primary")
    save(img, "ui-add-card-modal-scenic-cn-v4.png")


def draw_board():
    board = Image.new("RGBA", (1800, 1320), (233, 241, 247, 255))
    draw = ImageDraw.Draw(board, "RGBA")
    text(draw, (80, 72), "UI 方向板 v4 中文版", FONT_H1, fill="#183A54")
    text(draw, (80, 118), "保留第四版视觉风格，仅替换为中文界面", FONT_BODY, fill="#667D8E")

    source_files = [
        ("解锁页", OUT_DIR / "ui-lock-screen-scenic-cn-v4.png"),
        ("主工作台", OUT_DIR / "ui-dashboard-scenic-cn-v4.png"),
        ("新增卡片弹窗", OUT_DIR / "ui-add-card-modal-scenic-cn-v4.png"),
    ]
    placements = [
        (80, 180, 800, 520),
        (920, 180, 800, 520),
        (300, 760, 1200, 470),
    ]
    for (label, path), (x, y, w, h) in zip(source_files, placements):
        rounded(draw, (x, y, x + w, y + h), radius=28, fill=(248, 251, 255, 255), outline=(214, 225, 235, 255), width=1)
        text(draw, (x + 24, y + 20), label, FONT_H3, fill="#183A54")
        if path.exists():
            panel = Image.open(path).convert("RGB")
            panel.thumbnail((w - 40, h - 70))
            px = x + (w - panel.width) // 2
            py = y + 56
            board.paste(panel, (px, py))

    save(board, "ui-overview-board-scenic-cn-v4.png")


def main():
    draw_lock_screen()
    draw_dashboard()
    draw_modal()
    draw_board()
    print(f"Generated scenic CN v4 mockups in: {OUT_DIR}")


if __name__ == "__main__":
    main()

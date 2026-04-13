from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "ui-mockups"

WIDTH = 1440
HEIGHT = 960

BG_TOP = (241, 245, 251)
BG_BOTTOM = (230, 235, 244)
WHITE = "#FFFFFF"
PANEL = "#FDFDFE"
PANEL_SOFT = "#F5F7FB"
SIDEBAR = "#FBFCFE"
BORDER = "#DCE3EE"
TEXT = "#111418"
TEXT_SOFT = "#6E7785"
TEXT_MUTED = "#98A2B3"
ACCENT = "#0A84FF"
ACCENT_SOFT = "#D9EBFF"
ACCENT_DARK = "#0066CC"
SUCCESS = "#34C759"
SUCCESS_SOFT = "#DDF6E4"
WARNING = "#FF9F0A"
WARNING_SOFT = "#FFF0D6"
LILAC = "#CFC8FF"
LILAC_SOFT = "#EFEAFF"
OVERLAY = (11, 16, 24, 108)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
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


def make_canvas(width=WIDTH, height=HEIGHT):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        r = int(BG_TOP[0] * (1 - ratio) + BG_BOTTOM[0] * ratio)
        g = int(BG_TOP[1] * (1 - ratio) + BG_BOTTOM[1] * ratio)
        b = int(BG_TOP[2] * (1 - ratio) + BG_BOTTOM[2] * ratio)
        for x in range(width):
            px[x, y] = (r, g, b, 255)
    return img


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

    # soft horizon light
    add_glow(img, (80, 40, 1040, 620), "#CBEAF7", 135)
    add_glow(img, (900, 220, 1380, 760), "#FFB98A", 150)
    add_glow(img, (880, 260, 1210, 580), "#FF8C63", 118)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")

    # mountain silhouettes
    draw.polygon([(0, 650), (220, 470), (420, 668)], fill=(33, 54, 67, 170))
    draw.polygon([(230, 690), (560, 394), (952, 702)], fill=(26, 47, 57, 182))
    draw.polygon([(760, 708), (1036, 432), (1380, 718)], fill=(28, 44, 52, 196))
    draw.polygon([(930, 728), (1216, 520), (1440, 746)], fill=(22, 36, 44, 206))

    # water foreground
    draw.polygon([(0, 760), (340, 700), (740, 730), (1140, 690), (1440, 750), (1440, 960), (0, 960)], fill=(33, 78, 101, 188))

    # lava / warm highlight area
    draw.ellipse((760, 350, 1110, 560), fill=(255, 153, 102, 96))
    draw.ellipse((830, 380, 1190, 610), fill=(255, 123, 82, 74))

    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(14)))

    haze = Image.new("RGBA", img.size, (246, 250, 255, 22))
    img = Image.alpha_composite(img, haze)
    return img.filter(ImageFilter.GaussianBlur(1.6))


def add_glow(img: Image.Image, box, fill, alpha=255):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box, fill=_rgba(fill, alpha))
    img.alpha_composite(layer)


def _rgba(color: str, alpha=255):
    color = color.lstrip("#")
    return (int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16), alpha)


def rounded(draw: ImageDraw.ImageDraw, box, radius=18, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow(draw: ImageDraw.ImageDraw, box, radius=24, spread=10, alpha=22):
    x1, y1, x2, y2 = box
    for i in range(spread):
        a = max(alpha - i * 2, 2)
        rounded(draw, (x1 - i, y1 - i + 4, x2 + i, y2 + i + 4), radius=radius + i, fill=(12, 20, 32, a))


def text(draw: ImageDraw.ImageDraw, xy, content, font, fill=TEXT, anchor=None):
    draw.text(xy, content, font=font, fill=fill, anchor=anchor)


def pill(draw: ImageDraw.ImageDraw, box, label, fill=PANEL_SOFT, text_fill=TEXT_SOFT, outline=None):
    rounded(draw, box, radius=(box[3] - box[1]) // 2, fill=fill, outline=outline, width=1 if outline else 0)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_TINY, fill=text_fill, anchor="mm")


def button(draw: ImageDraw.ImageDraw, box, label, style="secondary"):
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
        outline = BORDER
        text_fill = TEXT
    rounded(draw, box, radius=20, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_SMALL, fill=text_fill, anchor="mm")


def glass_panel(draw: ImageDraw.ImageDraw, box, radius=28, fill=PANEL, outline=BORDER):
    shadow(draw, box, radius=radius, spread=10, alpha=18)
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)


def glass_panel_rgba(draw: ImageDraw.ImageDraw, box, radius=28, fill=(255, 255, 255, 188), outline=(255, 255, 255, 110)):
    shadow(draw, box, radius=radius, spread=14, alpha=16)
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)


def icon_chip(draw: ImageDraw.ImageDraw, box, label, fill, fg=TEXT):
    rounded(draw, box, radius=18, fill=fill)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_H3, fill=fg, anchor="mm")


def draw_card(draw: ImageDraw.ImageDraw, x, y, w, h, title, subtitle, tag, tint):
    glass_panel(draw, (x, y, x + w, y + h), radius=28, fill=WHITE)
    icon_chip(draw, (x + 20, y + 20, x + 82, y + 82), title[:1], tint)
    tag_w = x + 96 + (68 if tag == "Website" else 50)
    pill(draw, (x + 96, y + 30, tag_w, y + 58), tag, fill=PANEL_SOFT)
    text(draw, (x + 20, y + 110), title, FONT_H3)
    text(draw, (x + 20, y + 144), subtitle, FONT_SMALL, fill=TEXT_SOFT)
    button(draw, (x + 20, y + h - 56, x + 110, y + h - 16), "Open", style="glass")
    button(draw, (x + 122, y + h - 56, x + 204, y + h - 16), "Edit", style="glass")
    button(draw, (x + w - 100, y + h - 56, x + w - 20, y + h - 16), "More", style="glass")


def save(img: Image.Image, name: str):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / name)


def draw_lock_screen():
    img = make_canvas()
    add_glow(img, (120, 110, 540, 520), ACCENT_SOFT, 150)
    add_glow(img, (900, 520, 1320, 900), LILAC_SOFT, 160)
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel(draw, (190, 120, WIDTH - 190, HEIGHT - 120), radius=36, fill="#FCFDFF")
    glass_panel(draw, (360, 215, 1080, 720), radius=34, fill="#FFFFFF")

    text(draw, (WIDTH / 2, 326), "Desktop Console", FONT_H1, anchor="mm")
    text(draw, (WIDTH / 2, 372), "Apple-inspired launcher for websites and apps", FONT_BODY, fill=TEXT_SOFT, anchor="mm")

    rounded(draw, (500, 450, 940, 522), radius=24, fill=PANEL_SOFT, outline=BORDER, width=1)
    text(draw, (530, 474), "Enter password", FONT_BODY, fill=TEXT_MUTED)

    button(draw, (585, 560, 855, 624), "Unlock", style="primary")
    text(draw, (WIDTH / 2, 670), "Auto lock after 15 minutes of inactivity", FONT_SMALL, fill=TEXT_SOFT, anchor="mm")

    for dx, dy, color in [(410, 260, ACCENT_SOFT), (1010, 270, LILAC_SOFT), (420, 650, SUCCESS_SOFT), (995, 640, WARNING_SOFT)]:
        draw.ellipse((dx, dy, dx + 10, dy + 10), fill=color)

    save(img, "ui-lock-screen-apple-v2.png")


def draw_dashboard():
    img = make_canvas()
    add_glow(img, (80, 160, 500, 740), ACCENT_SOFT, 120)
    add_glow(img, (1040, 80, 1380, 420), LILAC_SOFT, 140)
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel(draw, (28, 24, WIDTH - 28, HEIGHT - 24), radius=34, fill="#FAFCFF")
    glass_panel(draw, (44, 40, 314, HEIGHT - 40), radius=28, fill=SIDEBAR)
    glass_panel(draw, (332, 40, WIDTH - 44, 118), radius=24, fill="#FCFDFF")
    glass_panel(draw, (332, 132, WIDTH - 44, HEIGHT - 40), radius=28, fill="#FCFDFF")

    text(draw, (80, 88), "Console", FONT_H2)
    text(draw, (80, 118), "Your calm launch space", FONT_SMALL, fill=TEXT_SOFT)

    menu_items = ["All", "Life Apps", "English", "Tech Tools", "Web Favorites", "E-commerce"]
    y = 182
    for item in menu_items:
        selected = item == "Tech Tools"
        if selected:
            rounded(draw, (64, y, 294, y + 48), radius=18, fill=ACCENT_SOFT, outline=None, width=0)
        text(draw, (88, y + 13), item, FONT_BODY, fill=TEXT if selected else TEXT_SOFT)
        y += 58

    button(draw, (64, HEIGHT - 106, 294, HEIGHT - 60), "+ New Category", style="glass")

    rounded(draw, (360, 60, 766, 98), radius=19, fill=PANEL_SOFT, outline=BORDER, width=1)
    text(draw, (388, 72), "Search apps, websites, categories", FONT_SMALL, fill=TEXT_MUTED)
    button(draw, (954, 58, 1064, 102), "+ Add", style="primary")
    button(draw, (1078, 58, 1176, 102), "Lock", style="glass")
    button(draw, (1190, 58, 1310, 102), "Settings", style="glass")

    text(draw, (370, 174), "Tech Tools", FONT_H1)
    text(draw, (370, 218), "12 cards  •  4 pinned  •  3 recently used", FONT_SMALL, fill=TEXT_SOFT)

    text(draw, (370, 274), "Quick Access", FONT_H3)
    quick = [
        ("GitHub", "Pinned website", "Website", ACCENT_SOFT),
        ("VS Code", "Pinned desktop app", "App", SUCCESS_SOFT),
        ("Gitee", "Pinned website", "Website", WARNING_SOFT),
        ("Terminal", "Pinned desktop app", "App", LILAC_SOFT),
    ]
    for i, (title, subtitle, tag, tint) in enumerate(quick):
        draw_card(draw, 370 + i * 244, 304, 214, 190, title, subtitle, tag, tint)

    text(draw, (370, 540), "All Cards", FONT_H3)
    items = [
        ("Postman", "D:/Apps/Postman/Postman.exe", "App", SUCCESS_SOFT),
        ("Notion", "notion.so", "Website", WARNING_SOFT),
        ("Docker", "D:/Apps/Docker/Docker.exe", "App", ACCENT_SOFT),
        ("OpenRouter", "openrouter.ai", "Website", LILAC_SOFT),
        ("Figma", "figma.com", "Website", WARNING_SOFT),
        ("Cursor", "D:/Apps/Cursor/Cursor.exe", "App", SUCCESS_SOFT),
    ]
    start_x = 370
    start_y = 572
    gap_x = 244
    gap_y = 206
    for idx, (title, subtitle, tag, tint) in enumerate(items):
        col = idx % 4
        row = idx // 4
        draw_card(draw, start_x + col * gap_x, start_y + row * gap_y, 214, 190, title, subtitle, tag, tint)

    save(img, "ui-dashboard-apple-v2.png")


def draw_add_card_modal():
    img = make_canvas()
    add_glow(img, (150, 80, 550, 360), ACCENT_SOFT, 110)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=OVERLAY)

    glass_panel(draw, (310, 110, 1130, 840), radius=34, fill="#FCFDFF")
    text(draw, (364, 176), "Add New Card", FONT_H1)
    text(draw, (364, 220), "Create a website shortcut or a desktop app shortcut", FONT_BODY, fill=TEXT_SOFT)

    text(draw, (364, 286), "Type", FONT_SMALL, fill=TEXT_SOFT)
    button(draw, (364, 312, 518, 358), "Website", style="primary")
    button(draw, (534, 312, 716, 358), "Desktop App", style="glass")

    fields = [
        ("Name", "GitHub"),
        ("Category", "Tech Tools"),
        ("URL", "https://github.com"),
        ("Icon", "Auto fetch favicon"),
        ("Note", "Code hosting and collaboration"),
    ]

    y = 404
    for label, value in fields:
        text(draw, (364, y), label, FONT_SMALL, fill=TEXT_SOFT)
        rounded(draw, (364, y + 24, 1094, y + 86), radius=20, fill=PANEL_SOFT, outline=BORDER, width=1)
        text(draw, (390, y + 44), value, FONT_BODY, fill=TEXT if label == "Name" else TEXT_MUTED)
        y += 106

    button(draw, (860, 758, 968, 810), "Cancel", style="glass")
    button(draw, (982, 758, 1094, 810), "Save", style="primary")

    save(img, "ui-add-card-modal-apple-v2.png")


def draw_overview_board():
    board = make_canvas(1800, 1320)
    add_glow(board, (40, 40, 620, 380), ACCENT_SOFT, 110)
    add_glow(board, (1180, 40, 1700, 520), LILAC_SOFT, 125)
    draw = ImageDraw.Draw(board, "RGBA")

    text(draw, (80, 72), "UI Direction Board v2", FONT_H1)
    text(draw, (80, 118), "Apple-inspired / cool white / glass panels / softer contrast", FONT_BODY, fill=TEXT_SOFT)

    source_files = [
        ("Lock Screen", OUT_DIR / "ui-lock-screen-apple-v2.png"),
        ("Dashboard", OUT_DIR / "ui-dashboard-apple-v2.png"),
        ("Add Card Modal", OUT_DIR / "ui-add-card-modal-apple-v2.png"),
    ]

    placements = [
        (80, 180, 800, 520),
        (920, 180, 800, 520),
        (300, 760, 1200, 470),
    ]

    for (label, path), (x, y, w, h) in zip(source_files, placements):
        glass_panel(draw, (x, y, x + w, y + h), radius=32, fill="#FCFDFF")
        text(draw, (x + 24, y + 20), label, FONT_H3)
        if path.exists():
            panel = Image.open(path).convert("RGB")
            panel.thumbnail((w - 40, h - 70))
            px = x + (w - panel.width) // 2
            py = y + 56
            board.paste(panel, (px, py))

    notes = [
        "Direction: closer to macOS utility aesthetic",
        "Visual language: cool white, large radii, glassy surfaces",
        "Next can tune: darker sidebar / stronger blue accent / denser layout",
    ]
    x = 80
    y = 1260
    for note in notes:
        width = max(250, 24 + len(note) * 8)
        pill(draw, (x, y, x + width, y + 30), note, fill="#F7FAFF")
        x += width + 16

    save(board, "ui-overview-board-apple-v2.png")


def draw_dashboard_scenic():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")

    # outer frame
    shadow(draw, (54, 62, WIDTH - 54, HEIGHT - 72), radius=28, spread=12, alpha=14)
    rounded(draw, (64, 72, WIDTH - 64, HEIGHT - 82), radius=28, fill=(17, 34, 46, 82), outline=(128, 175, 208, 72), width=1)

    # panels
    glass_panel_rgba(draw, (98, 108, 312, HEIGHT - 122), radius=24, fill=(248, 251, 255, 156), outline=(255, 255, 255, 82))
    glass_panel_rgba(draw, (334, 108, WIDTH - 98, 174), radius=22, fill=(248, 251, 255, 150), outline=(255, 255, 255, 82))
    glass_panel_rgba(draw, (334, 190, WIDTH - 98, HEIGHT - 122), radius=28, fill=(248, 251, 255, 162), outline=(255, 255, 255, 84))

    text(draw, (116, 144), "Console", FONT_H2, fill="#12324B")
    text(draw, (116, 174), "Unified apps and websites", FONT_SMALL, fill="#567189")

    menu_items = ["All", "Life Apps", "English", "Tech Tools", "Web Favorites", "E-commerce"]
    y = 228
    for item in menu_items:
        selected = item == "Tech Tools"
        if selected:
            rounded(draw, (104, y - 6, 292, y + 36), radius=16, fill=(227, 240, 253, 195))
        text(draw, (126, y), item, FONT_BODY, fill="#173955" if selected else "#5C768B")
        y += 56

    button(draw, (112, HEIGHT - 178, 286, HEIGHT - 134), "+ New Category", style="glass")

    rounded(draw, (360, 118, 742, 152), radius=18, fill=(255, 255, 255, 104), outline=(255, 255, 255, 74), width=1)
    text(draw, (388, 126), "Search apps, websites, categories", FONT_SMALL, fill="#6A8194")
    button(draw, (962, 112, 1066, 156), "+ Add", style="primary")
    button(draw, (1080, 112, 1172, 156), "Lock", style="glass")
    button(draw, (1184, 112, 1296, 156), "Settings", style="glass")

    text(draw, (372, 238), "Tech Tools", FONT_H1, fill="#17344B")
    text(draw, (372, 282), "12 cards  •  4 pinned  •  3 recently used", FONT_SMALL, fill="#5C7587")

    text(draw, (372, 336), "Quick Access", FONT_H3, fill="#17344B")
    quick = [
        ("GitHub", "Pinned website", "Website", "#D6E8F9"),
        ("VS Code", "Pinned desktop app", "App", "#D7F1E1"),
        ("Gitee", "Pinned website", "Website", "#FFE3D6"),
        ("Terminal", "Pinned desktop app", "App", "#E9E0FF"),
    ]
    for i, (title, subtitle, tag, tint) in enumerate(quick):
        draw_card_scenic(draw, 372 + i * 224, 364, 196, 170, title, subtitle, tag, tint)

    text(draw, (372, 586), "All Cards", FONT_H3, fill="#17344B")
    items = [
        ("Postman", "D:/Apps/Postman/Postman.exe", "App", "#D7F1E1"),
        ("Notion", "notion.so", "Website", "#FFE7C7"),
        ("Docker", "D:/Apps/Docker/Docker.exe", "App", "#D7E8FF"),
        ("OpenRouter", "openrouter.ai", "Website", "#E9E0FF"),
        ("Figma", "figma.com", "Website", "#FFE2D6"),
        ("Cursor", "D:/Apps/Cursor/Cursor.exe", "App", "#D8F0E0"),
    ]
    start_x = 372
    start_y = 614
    gap_x = 224
    gap_y = 184
    for idx, (title, subtitle, tag, tint) in enumerate(items):
        col = idx % 4
        row = idx // 4
        draw_card_scenic(draw, start_x + col * gap_x, start_y + row * gap_y, 196, 170, title, subtitle, tag, tint)

    save(img, "ui-dashboard-scenic-v4.png")


def draw_card_scenic(draw: ImageDraw.ImageDraw, x, y, w, h, title, subtitle, tag, tint):
    glass_panel_rgba(draw, (x, y, x + w, y + h), radius=24, fill=(255, 255, 255, 146), outline=(255, 255, 255, 86))
    icon_chip(draw, (x + 18, y + 18, x + 70, y + 70), title[:1], tint, fg="#1E2A35")
    tag_right = x + 138 if tag == "Website" else x + 122
    pill(draw, (x + 82, y + 26, tag_right, y + 52), tag, fill=(239, 244, 250, 168), text_fill="#6C7E8F")
    text(draw, (x + 18, y + 96), title, FONT_H3, fill="#17344B")
    text(draw, (x + 18, y + 128), subtitle, FONT_TINY, fill="#6B8192")
    button(draw, (x + 18, y + h - 50, x + 92, y + h - 16), "Open", style="glass")
    button(draw, (x + 102, y + h - 50, x + 172, y + h - 16), "More", style="glass")


def draw_lock_screen_scenic():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")

    shadow(draw, (258, 168, 1112, 784), radius=30, spread=14, alpha=16)
    rounded(draw, (274, 184, 1096, 768), radius=24, fill=(17, 32, 44, 78), outline=(136, 185, 214, 70), width=1)
    glass_panel_rgba(draw, (538, 250, 954, 636), radius=22, fill=(248, 251, 255, 176), outline=(255, 255, 255, 94))

    text(draw, (745, 334), "Desktop Console", FONT_H1, fill="#17344B", anchor="mm")
    text(draw, (745, 380), "A calm launcher for your digital space", FONT_BODY, fill="#5F7688", anchor="mm")

    rounded(draw, (612, 448, 878, 506), radius=18, fill=(255, 255, 255, 110), outline=(255, 255, 255, 80), width=1)
    for i in range(4):
        draw.line((642, 470 + i * 10, 835 - i * 24, 470 + i * 10), fill=(91, 108, 122, 210), width=2)

    button(draw, (740, 556, 858, 596), "Unlock", style="primary")

    save(img, "ui-lock-screen-scenic-v4.png")


def draw_add_card_modal_scenic():
    img = scenic_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(10, 18, 28, 92))

    glass_panel_rgba(draw, (420, 132, 1042, 810), radius=24, fill=(248, 251, 255, 184), outline=(255, 255, 255, 96))
    text(draw, (468, 194), "Add New Card", FONT_H1, fill="#16344A")
    text(draw, (468, 236), "Fast capture for websites and desktop apps", FONT_BODY, fill="#5A7487")

    text(draw, (468, 292), "Type", FONT_SMALL, fill="#617A8D")
    button(draw, (468, 316, 620, 360), "Website", style="primary")
    button(draw, (634, 316, 804, 360), "Desktop App", style="glass")

    fields = [
        ("Name", "GitHub"),
        ("Category", "Tech Tools"),
        ("URL", "https://github.com"),
        ("Icon", "Auto fetch favicon"),
        ("Note", "Code hosting and collaboration"),
    ]
    y = 404
    for label, value in fields:
        text(draw, (468, y), label, FONT_SMALL, fill="#60798A")
        rounded(draw, (468, y + 22, 994, y + 78), radius=18, fill=(255, 255, 255, 112), outline=(255, 255, 255, 78), width=1)
        text(draw, (492, y + 39), value, FONT_BODY, fill="#70889A" if label != "Name" else "#1A3850")
        y += 98

    button(draw, (792, 734, 884, 776), "Cancel", style="glass")
    button(draw, (896, 734, 994, 776), "Save", style="primary")

    save(img, "ui-add-card-modal-scenic-v4.png")


def draw_overview_board_scenic():
    board = Image.new("RGBA", (1800, 1320), (233, 241, 247, 255))
    draw = ImageDraw.Draw(board, "RGBA")
    text(draw, (80, 72), "UI Direction Board v3", FONT_H1, fill="#183A54")
    text(draw, (80, 118), "Scenic glassmorphism / softer depth / ocean blue with warm highlight", FONT_BODY, fill="#667D8E")

    source_files = [
        ("Lock Screen", OUT_DIR / "ui-lock-screen-scenic-v4.png"),
        ("Dashboard", OUT_DIR / "ui-dashboard-scenic-v4.png"),
        ("Add Card Modal", OUT_DIR / "ui-add-card-modal-scenic-v4.png"),
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

    save(board, "ui-overview-board-scenic-v4.png")


def cultural_background(width=WIDTH, height=HEIGHT):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    top = (240, 246, 249)
    mid = (222, 239, 241)
    bottom = (248, 240, 229)
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

    add_glow(img, (40, 50, 640, 420), "#B8ECDE", 95)
    add_glow(img, (860, 70, 1370, 460), "#FFD6B0", 120)
    add_glow(img, (920, 120, 1320, 520), "#FFC083", 80)
    add_glow(img, (260, 520, 840, 960), "#DDEEFF", 82)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")

    # soft ink-wash mountains
    draw.polygon([(0, 700), (220, 520), (450, 710)], fill=(83, 118, 132, 48))
    draw.polygon([(280, 740), (620, 440), (1040, 742)], fill=(68, 102, 118, 54))
    draw.polygon([(820, 760), (1130, 500), (1440, 760)], fill=(84, 104, 114, 58))
    draw.polygon([(0, 790), (380, 760), (850, 790), (1440, 770), (1440, 960), (0, 960)], fill=(112, 151, 162, 34))

    # cloud lines
    cloud_color = (255, 255, 255, 82)
    for x, y, w in [(130, 180, 220), (1010, 170, 210), (960, 250, 160)]:
        draw.arc((x, y, x + w, y + 70), 180, 360, fill=cloud_color, width=3)
        draw.arc((x + 58, y - 18, x + w - 10, y + 48), 180, 360, fill=cloud_color, width=3)

    # seal-like accent
    draw.rounded_rectangle((1200, 650, 1260, 710), radius=12, fill=(208, 69, 63, 168))
    draw.text((1214, 664), "印", font=FONT_BODY, fill=(255, 241, 236, 220))

    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
    haze = Image.new("RGBA", img.size, (255, 251, 246, 26))
    img = Image.alpha_composite(img, haze)
    return img.filter(ImageFilter.GaussianBlur(0.8))


def glass_panel_cn(draw: ImageDraw.ImageDraw, box, radius=22, fill=(255, 255, 255, 170), outline=(255, 255, 255, 118)):
    shadow(draw, box, radius=radius, spread=12, alpha=12)
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    rounded(draw, (x1 + 1, y1 + 1, x2 - 1, y1 + 16), radius=radius, fill=(255, 255, 255, 36), outline=None, width=0)


def button_cn(draw: ImageDraw.ImageDraw, box, label, style="soft"):
    if style == "primary":
        fill = (255, 146, 76, 245)
        outline = (255, 175, 106, 255)
        text_fill = WHITE
    elif style == "accent":
        fill = (48, 196, 150, 232)
        outline = (85, 215, 175, 255)
        text_fill = WHITE
    else:
        fill = (255, 255, 255, 118)
        outline = (255, 255, 255, 98)
        text_fill = "#516A7D"
    rounded(draw, box, radius=18, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_SMALL, fill=text_fill, anchor="mm")


def icon_text_item(draw: ImageDraw.ImageDraw, x, y, color, icon_label, text_label, selected=False):
    if selected:
        rounded(draw, (x - 12, y - 8, x + 168, y + 32), radius=16, fill=(255, 255, 255, 112), outline=(255, 255, 255, 86), width=1)
    rounded(draw, (x, y, x + 24, y + 24), radius=8, fill=color)
    text(draw, (x + 12, y + 12), icon_label, FONT_TINY, fill="#23435A", anchor="mm")
    text(draw, (x + 36, y + 1), text_label, FONT_BODY, fill="#25445D")


def draw_card_cn(draw: ImageDraw.ImageDraw, x, y, w, h, title, subtitle, tag, tint, icon_label):
    glass_panel_cn(draw, (x, y, x + w, y + h), radius=20, fill=(255, 255, 255, 164), outline=(255, 255, 255, 108))
    rounded(draw, (x + 18, y + 18, x + 64, y + 64), radius=14, fill=tint)
    text(draw, (x + 41, y + 41), icon_label, FONT_BODY, fill="#26425A", anchor="mm")
    pill(draw, (x + 76, y + 26, x + 150, y + 52), tag, fill=(244, 247, 251, 170), text_fill="#6C7E8F")
    text(draw, (x + 18, y + 88), title, FONT_H3, fill="#173D56")
    text(draw, (x + 18, y + 122), subtitle, FONT_TINY, fill="#668091")
    button_cn(draw, (x + 18, y + h - 46, x + 90, y + h - 12), "打开", style="soft")
    button_cn(draw, (x + 98, y + h - 46, x + 170, y + h - 12), "更多", style="soft")


def draw_dashboard_cn_v5():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel_cn(draw, (48, 52, WIDTH - 48, HEIGHT - 52), radius=28, fill=(253, 252, 249, 136), outline=(255, 255, 255, 108))
    glass_panel_cn(draw, (76, 84, 304, HEIGHT - 86), radius=24, fill=(255, 255, 255, 154), outline=(255, 255, 255, 106))
    glass_panel_cn(draw, (326, 84, WIDTH - 76, 158), radius=22, fill=(255, 255, 255, 150), outline=(255, 255, 255, 104))
    glass_panel_cn(draw, (326, 174, WIDTH - 76, HEIGHT - 86), radius=24, fill=(255, 255, 255, 160), outline=(255, 255, 255, 108))

    text(draw, (106, 122), "桌面控制台", FONT_H2, fill="#1F4662")
    text(draw, (106, 154), "网站与应用统一入口", FONT_SMALL, fill="#678094")

    icon_text_item(draw, 104, 208, "#D9EDFF", "首", "首页")
    icon_text_item(draw, 104, 262, "#FFE4CF", "生", "生活软件")
    icon_text_item(draw, 104, 316, "#E2F6E8", "英", "英语学习")
    icon_text_item(draw, 104, 370, "#DFF0FF", "技", "技术工具", selected=True)
    icon_text_item(draw, 104, 424, "#F4E7FF", "网", "常用网站")
    icon_text_item(draw, 104, 478, "#FFF0D6", "商", "电商工具")

    button_cn(draw, (102, HEIGHT - 146, 278, HEIGHT - 102), "新建分类", style="accent")

    rounded(draw, (352, 104, 820, 144), radius=20, fill=(255, 255, 255, 116), outline=(255, 255, 255, 92), width=1)
    text(draw, (382, 116), "搜索网站、应用、分类", FONT_BODY, fill="#7390A2")
    button_cn(draw, (852, 100, 972, 146), "新增卡片", style="primary")
    button_cn(draw, (986, 100, 1078, 146), "快捷唤起", style="accent")
    button_cn(draw, (1092, 100, 1184, 146), "锁定", style="soft")
    button_cn(draw, (1198, 100, 1288, 146), "设置", style="soft")

    text(draw, (354, 214), "技术工具", FONT_H1, fill="#1E425A")
    text(draw, (356, 258), "常用 12 项  ·  已置顶 4 项  ·  最近使用 3 项", FONT_SMALL, fill="#708899")

    # quick action strip
    button_cn(draw, (960, 206, 1088, 248), "导入书签", style="soft")
    button_cn(draw, (1102, 206, 1218, 248), "拖拽添加", style="primary")
    button_cn(draw, (1230, 206, 1328, 248), "托盘预览", style="soft")

    text(draw, (356, 304), "快捷入口", FONT_H3, fill="#1E425A")
    quick_cards = [
        ("GitHub", "代码托管平台", "网站", "#DDEBFF", "码"),
        ("VS Code", "桌面应用", "应用", "#DDF4E6", "编"),
        ("Gitee", "常用代码仓库", "网站", "#FFE4D4", "仓"),
        ("终端", "命令行工具", "应用", "#EEE3FF", "终"),
    ]
    for i, (title, subtitle, tag, tint, icon_label) in enumerate(quick_cards):
        draw_card_cn(draw, 354 + i * 228, 334, 206, 166, title, subtitle, tag, tint, icon_label)

    text(draw, (356, 548), "全部卡片", FONT_H3, fill="#1E425A")
    cards = [
        ("微信", "桌面应用", "应用", "#DFF5E4", "微"),
        ("飞书", "办公协作平台", "网站", "#FFE6D5", "飞"),
        ("Docker", "容器工具", "应用", "#D8E9FF", "器"),
        ("掘金", "开发内容社区", "网站", "#EEE3FF", "掘"),
        ("Figma", "设计协作工具", "网站", "#FFE8D8", "设"),
        ("Cursor", "智能编程工具", "应用", "#E0F4E6", "智"),
        ("Chrome", "浏览器入口", "应用", "#FFF0D9", "览"),
        ("阿里云", "云服务平台", "网站", "#DFF0FF", "云"),
    ]
    start_x = 354
    start_y = 578
    gap_x = 228
    gap_y = 184
    for idx, (title, subtitle, tag, tint, icon_label) in enumerate(cards):
        col = idx % 4
        row = idx // 4
        draw_card_cn(draw, start_x + col * gap_x, start_y + row * gap_y, 206, 166, title, subtitle, tag, tint, icon_label)

    save(img, "ui-dashboard-cn-v5.png")


def draw_lock_screen_cn_v5():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel_cn(draw, (276, 164, 1116, 780), radius=28, fill=(250, 248, 244, 128), outline=(255, 255, 255, 106))
    glass_panel_cn(draw, (528, 238, 954, 636), radius=24, fill=(255, 255, 255, 176), outline=(255, 255, 255, 114))

    text(draw, (742, 326), "桌面控制台", FONT_H1, fill="#214662", anchor="mm")
    text(draw, (742, 372), "你的桌面，从未如此井然有序。", FONT_BODY, fill="#6B8192", anchor="mm")

    rounded(draw, (612, 448, 874, 506), radius=18, fill=(255, 255, 255, 116), outline=(255, 255, 255, 90), width=1)
    for i in range(4):
        draw.line((646, 468 + i * 10, 822 - i * 28, 468 + i * 10), fill=(110, 127, 141, 208), width=2)

    button_cn(draw, (682, 556, 806, 600), "进入", style="primary")
    button_cn(draw, (820, 556, 904, 600), "解锁", style="accent")

    save(img, "ui-lock-screen-cn-v5.png")


def draw_add_card_modal_cn_v5():
    img = cultural_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(30, 40, 48, 72))

    glass_panel_cn(draw, (404, 122, 1054, 822), radius=24, fill=(255, 255, 255, 184), outline=(255, 255, 255, 112))
    text(draw, (452, 182), "新增卡片", FONT_H1, fill="#1F4560")
    text(draw, (452, 224), "支持网站地址、桌面应用、拖拽导入", FONT_BODY, fill="#698295")

    text(draw, (452, 284), "卡片类型", FONT_SMALL, fill="#657E90")
    button_cn(draw, (452, 310, 574, 354), "网站卡片", style="primary")
    button_cn(draw, (588, 310, 726, 354), "桌面应用", style="soft")
    button_cn(draw, (740, 310, 862, 354), "拖拽添加", style="accent")

    groups = [
        ("基础信息", [("名称", "GitHub"), ("分类", "技术工具")]),
        ("目标地址", [("网址", "https://github.com")]),
        ("显示设置", [("图标", "自动抓取 favicon"), ("备注", "代码托管与协作平台")]),
    ]

    y = 396
    for group_title, fields in groups:
        text(draw, (452, y), group_title, FONT_BODY, fill="#1F4560")
        y += 28
        for label, value in fields:
            text(draw, (452, y), label, FONT_SMALL, fill="#6A8294")
            rounded(draw, (452, y + 20, 1006, y + 72), radius=16, fill=(255, 255, 255, 112), outline=(255, 255, 255, 84), width=1)
            text(draw, (476, y + 35), value, FONT_BODY, fill="#274A63" if label == "名称" else "#7A90A1")
            y += 86
        y += 6

    button_cn(draw, (790, 742, 886, 786), "取消", style="soft")
    button_cn(draw, (898, 742, 1006, 786), "保存", style="primary")

    save(img, "ui-add-card-modal-cn-v5.png")


def draw_overview_board_cn_v5():
    board = Image.new("RGBA", (1800, 1320), (241, 245, 240, 255))
    draw = ImageDraw.Draw(board, "RGBA")
    text(draw, (80, 72), "UI 方向板 v5", FONT_H1, fill="#234962")
    text(draw, (80, 118), "中文本土化 / 暖色更讨喜 / 轻国潮点缀 / 规整宫格布局", FONT_BODY, fill="#6E8597")

    source_files = [
        ("解锁页", OUT_DIR / "ui-lock-screen-cn-v5.png"),
        ("主工作台", OUT_DIR / "ui-dashboard-cn-v5.png"),
        ("新增卡片弹窗", OUT_DIR / "ui-add-card-modal-cn-v5.png"),
    ]
    placements = [
        (80, 180, 800, 520),
        (920, 180, 800, 520),
        (300, 760, 1200, 470),
    ]

    for (label, path), (x, y, w, h) in zip(source_files, placements):
        rounded(draw, (x, y, x + w, y + h), radius=28, fill=(250, 252, 250, 255), outline=(222, 230, 226, 255), width=1)
        text(draw, (x + 24, y + 20), label, FONT_H3, fill="#234962")
        if path.exists():
            panel = Image.open(path).convert("RGB")
            panel.thumbnail((w - 40, h - 70))
            px = x + (w - panel.width) // 2
            py = y + 56
            board.paste(panel, (px, py))

    save(board, "ui-overview-board-cn-v5.png")


def main():
    draw_lock_screen()
    draw_dashboard()
    draw_add_card_modal()
    draw_overview_board()
    draw_lock_screen_scenic()
    draw_dashboard_scenic()
    draw_add_card_modal_scenic()
    draw_overview_board_scenic()
    draw_lock_screen_cn_v5()
    draw_dashboard_cn_v5()
    draw_add_card_modal_cn_v5()
    draw_overview_board_cn_v5()
    print(f"Generated UI mockups in: {OUT_DIR}")


if __name__ == "__main__":
    main()

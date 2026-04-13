from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "ui-mockups"

WIDTH = 1440
HEIGHT = 960


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


def text(draw, xy, content, font, fill="#26465D", anchor=None):
    draw.text(xy, content, font=font, fill=fill, anchor=anchor)


def add_glow(img, box, fill, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    c = fill.lstrip("#")
    rgba = (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), alpha)
    draw.ellipse(box, fill=rgba)
    img.alpha_composite(layer)


def soft_background(width=WIDTH, height=HEIGHT):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    top = (244, 248, 251)
    mid = (238, 245, 248)
    bottom = (247, 246, 242)
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

    add_glow(img, (80, 80, 620, 420), "#DDF2EC", 88)
    add_glow(img, (900, 90, 1320, 380), "#E4EEFF", 92)
    add_glow(img, (940, 180, 1300, 470), "#FFEBDD", 74)
    add_glow(img, (260, 560, 880, 980), "#EFF4FF", 72)

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    draw.ellipse((120, 120, 520, 320), fill=(255, 255, 255, 46))
    draw.ellipse((940, 110, 1260, 280), fill=(255, 255, 255, 40))
    draw.ellipse((320, 680, 960, 990), fill=(255, 255, 255, 28))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(12)))
    return img


def glass_panel(draw, box, radius=22, fill=(255, 255, 255, 170), outline=(255, 255, 255, 122)):
    x1, y1, x2, y2 = box
    for i in range(10):
        a = max(10 - i, 1)
        rounded(
            draw,
            (x1 - i, y1 - i + 4, x2 + i, y2 + i + 6),
            radius=radius + i,
            fill=(144, 169, 186, a),
            outline=None,
            width=0,
        )
    rounded(draw, box, radius=radius, fill=fill, outline=outline, width=1)
    rounded(draw, (x1 + 1, y1 + 1, x2 - 1, y1 + 16), radius=radius, fill=(255, 255, 255, 24), outline=None, width=0)


def button(draw, box, label, style="soft"):
    if style == "primary":
        fill = (112, 196, 255, 228)
        outline = (148, 210, 255, 220)
        text_fill = "#FFFFFF"
    elif style == "accent":
        fill = (134, 221, 194, 224)
        outline = (160, 228, 206, 220)
        text_fill = "#FFFFFF"
    else:
        fill = (255, 255, 255, 112)
        outline = (255, 255, 255, 90)
        text_fill = "#6C8597"
    rounded(draw, box, radius=18, fill=fill, outline=outline, width=1)
    x1, y1, x2, y2 = box
    rounded(draw, (x1 + 1, y1 + 1, x2 - 1, y1 + 12), radius=18, fill=(255, 255, 255, 18), outline=None, width=0)
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_SMALL, fill=text_fill, anchor="mm")


def pill(draw, box, label):
    rounded(draw, box, radius=(box[3] - box[1]) // 2, fill=(245, 247, 250, 164), outline=None, width=0)
    x1, y1, x2, y2 = box
    text(draw, ((x1 + x2) / 2, (y1 + y2) / 2 - 1), label, FONT_TINY, fill="#7B91A0", anchor="mm")


def icon_text_item(draw, x, y, color, icon_label, text_label, selected=False):
    if selected:
        rounded(draw, (x - 12, y - 8, x + 172, y + 34), radius=16, fill=(255, 255, 255, 96), outline=(255, 255, 255, 80), width=1)
    rounded(draw, (x, y, x + 24, y + 24), radius=8, fill=color)
    text(draw, (x + 12, y + 12), icon_label, FONT_TINY, fill="#38566C", anchor="mm")
    text(draw, (x + 38, y + 1), text_label, FONT_BODY, fill="#36556B")


def card(draw, x, y, w, h, title, subtitle, tag, tint, icon_label):
    glass_panel(draw, (x, y, x + w, y + h), radius=18, fill=(255, 255, 255, 152), outline=(255, 255, 255, 104))
    rounded(draw, (x + 18, y + 18, x + 64, y + 64), radius=14, fill=tint)
    text(draw, (x + 41, y + 41), icon_label, FONT_BODY, fill="#3D5A71", anchor="mm")
    pill(draw, (x + 76, y + 26, x + 150, y + 52), tag)
    text(draw, (x + 18, y + 88), title, FONT_H3, fill="#2B4E66")
    text(draw, (x + 18, y + 122), subtitle, FONT_TINY, fill="#738A9A")
    button(draw, (x + 18, y + h - 46, x + 90, y + h - 12), "打开", style="soft")
    button(draw, (x + 98, y + h - 46, x + 170, y + h - 12), "更多", style="soft")


def save(img, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT_DIR / name)


def draw_dashboard():
    img = soft_background()
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel(draw, (54, 58, WIDTH - 54, HEIGHT - 58), radius=28, fill=(252, 252, 250, 114), outline=(255, 255, 255, 92))
    glass_panel(draw, (82, 88, 302, HEIGHT - 90), radius=22, fill=(255, 255, 255, 144), outline=(255, 255, 255, 100))
    glass_panel(draw, (322, 88, WIDTH - 82, 156), radius=20, fill=(255, 255, 255, 140), outline=(255, 255, 255, 96))
    glass_panel(draw, (322, 172, WIDTH - 82, HEIGHT - 90), radius=24, fill=(255, 255, 255, 148), outline=(255, 255, 255, 102))

    text(draw, (110, 122), "桌面控制台", FONT_H2, fill="#2B4F67")
    text(draw, (110, 152), "网站与应用统一入口", FONT_SMALL, fill="#7A91A0")

    icon_text_item(draw, 108, 206, "#E3EEFF", "首", "首页")
    icon_text_item(draw, 108, 258, "#FCEBDD", "生", "生活软件")
    icon_text_item(draw, 108, 310, "#E4F4EB", "英", "英语学习")
    icon_text_item(draw, 108, 362, "#E3F0FF", "技", "技术工具", selected=True)
    icon_text_item(draw, 108, 414, "#F2EAFE", "网", "常用网站")
    icon_text_item(draw, 108, 466, "#FFF1E5", "商", "电商工具")

    button(draw, (106, HEIGHT - 142, 276, HEIGHT - 100), "新建分类", style="accent")

    rounded(draw, (346, 102, 820, 142), radius=18, fill=(255, 255, 255, 100), outline=(255, 255, 255, 80), width=1)
    text(draw, (376, 114), "搜索网站、应用、分类", FONT_BODY, fill="#8299A8")
    button(draw, (846, 98, 972, 144), "新增卡片", style="primary")
    button(draw, (984, 98, 1100, 144), "快捷唤起", style="accent")
    button(draw, (1114, 98, 1202, 144), "锁定", style="soft")
    button(draw, (1214, 98, 1296, 144), "设置", style="soft")

    text(draw, (348, 206), "技术工具", FONT_H1, fill="#2A4D65")
    text(draw, (350, 248), "常用 12 项  ·  已置顶 4 项  ·  最近使用 3 项", FONT_SMALL, fill="#8197A5")
    button(draw, (970, 198, 1082, 238), "导入书签", style="soft")
    button(draw, (1094, 198, 1204, 238), "拖拽添加", style="primary")
    button(draw, (1216, 198, 1320, 238), "托盘预览", style="soft")

    text(draw, (350, 292), "快捷入口", FONT_H3, fill="#2A4D65")
    quick_cards = [
        ("GitHub", "代码托管平台", "网站", "#E3EEFF", "码"),
        ("VS Code", "桌面应用", "应用", "#E5F4EC", "编"),
        ("Gitee", "常用代码仓库", "网站", "#FDEBDD", "仓"),
        ("终端", "命令行工具", "应用", "#F1EAFE", "终"),
    ]
    for i, item in enumerate(quick_cards):
        card(draw, 350 + i * 226, 320, 208, 164, *item)

    text(draw, (350, 532), "全部卡片", FONT_H3, fill="#2A4D65")
    all_cards = [
        ("微信", "桌面应用", "应用", "#E5F5EB", "微"),
        ("飞书", "办公协作平台", "网站", "#FDEDE1", "飞"),
        ("Docker", "容器工具", "应用", "#E1EDFF", "器"),
        ("掘金", "开发内容社区", "网站", "#F2EAFF", "掘"),
        ("Figma", "设计协作工具", "网站", "#FEF0E4", "设"),
        ("Cursor", "智能编程工具", "应用", "#E5F5EC", "智"),
        ("Chrome", "浏览器入口", "应用", "#FFF3E7", "览"),
        ("阿里云", "云服务平台", "网站", "#E5F0FF", "云"),
    ]
    for idx, item in enumerate(all_cards):
        col = idx % 4
        row = idx // 4
        card(draw, 350 + col * 226, 560 + row * 180, 208, 164, *item)

    save(img, "ui-dashboard-cn-v7.png")


def draw_lock_screen():
    img = soft_background()
    draw = ImageDraw.Draw(img, "RGBA")

    glass_panel(draw, (292, 180, 1100, 764), radius=28, fill=(251, 251, 248, 112), outline=(255, 255, 255, 92))
    glass_panel(draw, (548, 248, 936, 614), radius=22, fill=(255, 255, 255, 168), outline=(255, 255, 255, 106))
    text(draw, (742, 318), "桌面控制台", FONT_H1, fill="#2A4D65", anchor="mm")
    text(draw, (742, 362), "你的桌面，从未如此井然有序。", FONT_BODY, fill="#7D93A2", anchor="mm")
    rounded(draw, (624, 430, 860, 482), radius=16, fill=(255, 255, 255, 98), outline=(255, 255, 255, 78), width=1)
    for i in range(4):
        draw.line((656, 448 + i * 9, 812 - i * 26, 448 + i * 9), fill=(126, 142, 152, 176), width=2)
    button(draw, (680, 526, 796, 568), "进入", style="primary")
    button(draw, (808, 526, 892, 568), "解锁", style="accent")
    save(img, "ui-lock-screen-cn-v7.png")


def draw_modal():
    img = soft_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(44, 52, 58, 48))
    glass_panel(draw, (410, 128, 1048, 812), radius=24, fill=(255, 255, 255, 176), outline=(255, 255, 255, 104))
    text(draw, (456, 182), "新增卡片", FONT_H1, fill="#2B4E66")
    text(draw, (456, 222), "支持网站地址、桌面应用、拖拽导入", FONT_BODY, fill="#7A90A0")
    text(draw, (456, 278), "卡片类型", FONT_SMALL, fill="#6F8797")
    button(draw, (456, 304, 574, 346), "网站卡片", style="primary")
    button(draw, (586, 304, 708, 346), "桌面应用", style="soft")
    button(draw, (720, 304, 836, 346), "拖拽添加", style="accent")

    groups = [
        ("基础信息", [("名称", "GitHub"), ("分类", "技术工具")]),
        ("目标地址", [("网址", "https://github.com")]),
        ("显示设置", [("图标", "自动抓取 favicon"), ("备注", "代码托管与协作平台")]),
    ]
    y = 386
    for title_label, fields in groups:
        text(draw, (456, y), title_label, FONT_BODY, fill="#2C4F67")
        y += 26
        for label, value in fields:
            text(draw, (456, y), label, FONT_SMALL, fill="#738A9A")
            rounded(draw, (456, y + 18, 1006, y + 68), radius=14, fill=(255, 255, 255, 104), outline=(255, 255, 255, 76), width=1)
            text(draw, (480, y + 32), value, FONT_BODY, fill="#8197A7" if label != "名称" else "#2E5169")
            y += 82
        y += 6

    button(draw, (790, 738, 886, 780), "取消", style="soft")
    button(draw, (898, 738, 1006, 780), "保存", style="primary")
    save(img, "ui-add-card-modal-cn-v7.png")


def draw_board():
    board = Image.new("RGBA", (1800, 1320), (245, 247, 244, 255))
    draw = ImageDraw.Draw(board, "RGBA")
    text(draw, (80, 72), "UI 方向板 v7", FONT_H1, fill="#2B4E66")
    text(draw, (80, 118), "清新简约 / 更柔和配色 / 更低视觉刺激 / 更轻玻璃质感", FONT_BODY, fill="#8196A5")

    items = [
        ("解锁页", OUT_DIR / "ui-lock-screen-cn-v7.png"),
        ("主工作台", OUT_DIR / "ui-dashboard-cn-v7.png"),
        ("新增卡片弹窗", OUT_DIR / "ui-add-card-modal-cn-v7.png"),
    ]
    placements = [(80, 180, 800, 520), (920, 180, 800, 520), (300, 760, 1200, 470)]
    for (label, path), (x, y, w, h) in zip(items, placements):
        rounded(draw, (x, y, x + w, y + h), radius=28, fill=(252, 252, 250, 255), outline=(232, 236, 232, 255), width=1)
        text(draw, (x + 24, y + 20), label, FONT_H3, fill="#2B4E66")
        if path.exists():
            panel = Image.open(path).convert("RGB")
            panel.thumbnail((w - 40, h - 70))
            px = x + (w - panel.width) // 2
            py = y + 56
            board.paste(panel, (px, py))
    save(board, "ui-overview-board-cn-v7.png")


def main():
    draw_lock_screen()
    draw_dashboard()
    draw_modal()
    draw_board()
    print(f"Generated CN v7 mockups in: {OUT_DIR}")


if __name__ == "__main__":
    main()

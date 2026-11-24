import os
import re
import pytest

APP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")
STATIC_DIR = os.path.join(APP_DIR, "static")


def is_emoji_char(char: str) -> bool:
    code = ord(char)
    return (
        0x1F600 <= code <= 0x1F64F or
        0x1F300 <= code <= 0x1F5FF or
        0x1F680 <= code <= 0x1F6FF or
        0x1F1E0 <= code <= 0x1F1FF or
        0x2600 <= code <= 0x26FF or
        0x2700 <= code <= 0x27BF or
        0xFE00 <= code <= 0xFE0F or
        0x1F900 <= code <= 0x1F9FF or
        0x1FA70 <= code <= 0x1FAFF or
        0x200D == code
    )


def test_zero_emojis_in_frontend():
    """index.html, style.css va app.js fayllarida nolinchi emoji talabini tekshirish."""
    for filename in ["index.html", "style.css", "app.js"]:
        path = os.path.join(STATIC_DIR, filename)
        assert os.path.exists(path), f"Fayl topilmadi: {path}"
        with open(path, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f, 1):
                for char in line:
                    assert not is_emoji_char(char), f"Emoji topildi {filename}:{line_idx}: {char}"


def test_red_white_theme_variables_and_rules():
    """Qizil-oq yengil premium uslub (red-white theme) mavjudligini tekshirish."""
    css_path = os.path.join(STATIC_DIR, "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    # Ranglar va o'lchamlar
    assert "#E4002B" in css, "Brand qizil rangi (#E4002B) topilmadi"
    assert "#FFF7F8" in css, "Yengil fon rangi (#FFF7F8) topilmadi"
    assert "20px" in css, "Radius 20px topilmadi"
    assert "--primary-red" in css or "--color-primary" in css

    # To'lqin fon yoki SVG fon mavjudligi
    assert "wave" in css or "linear-gradient" in css or "radial-gradient" in css


def test_responsive_meta_and_breakpoints():
    """320px, 375px, 430px ekranlar uchun moslashuvchanlikni tekshirish."""
    html_path = os.path.join(STATIC_DIR, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Viewport meta tegi to'g'ri o'rnatilganligi
    assert 'name="viewport"' in html
    assert "width=device-width" in html
    assert "initial-scale=1.0" in html

    css_path = os.path.join(STATIC_DIR, "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    # Moslashuvchan media query yoki fluid container
    assert "@media" in css
    assert "max-width" in css
    # 320-375px oraliqdagi kichik ekranlar uchun qoidalar
    assert "360px" in css or "375px" in css or "430px" in css or "480px" in css


def test_no_duplicate_x_close_button():
    """Telegram native close mavjudligi sababli headerda ortiqcha ikkinchi X tugmasi yo'qligi."""
    html_path = os.path.join(STATIC_DIR, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Header qismida ikkinchi yopish 'X' tugmasi bo'lmasligi kerak
    assert 'id="btnHeaderClose"' not in html
    assert 'class="header-close-btn"' not in html


def test_home_tab_components():
    """Bosh sahifadagi barcha talab qilingan komponentlar mavjudligini tekshirish."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    home_path = os.path.join(base_dir, "web", "src", "pages", "Home.jsx")
    with open(home_path, "r", encoding="utf-8") as f:
        src = f.read()

    # 1. Holat / dars kartasi
    assert "LessonCard" in src or "StatCard" in src

    # 2. Halqali davomat kartasi
    assert "Ring" in src

    # 3. Dars boshlash Sheet / modal
    assert "Sheet" in src

    # 4. TOP-3 reyting kartasi
    assert "top3" in src

    # 5. O'qituvchi profili mavjudligi
    app_src = open(os.path.join(base_dir, "web", "src", "App.jsx"), encoding="utf-8").read()
    assert "TeacherProfile" in app_src


def test_four_tabs_structure():
    """Pastki menyuda aynan 4 ta tab mavjudligi: Davomat olib tashlangan."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tabbar_path = os.path.join(base_dir, "web", "src", "components", "TabBar.jsx")
    with open(tabbar_path, "r", encoding="utf-8") as f:
        src = f.read()

    # 4 ta tab identifikatorlari
    assert 'id: "home"' in src
    assert 'id: "students"' in src
    assert 'id: "grades"' in src
    assert 'id: "settings"' in src
    assert 'id: "attendance"' not in src

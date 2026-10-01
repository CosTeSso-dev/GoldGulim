#!/usr/bin/env python3
"""
Импорт каталога из публичного Telegram-канала магазина.

Читает посты канала (страницу t.me/s/<канал>), находит в тексте вид изделия,
пробу, вес и камни, скачивает фотографии в images/products/ и пересобирает
js/products.js.

Цены, которые вы уже вписали в js/products.js, при повторном запуске
сохраняются (они привязаны к номеру поста — полю tg).

Запуск из корня проекта:
    python3 tools/import_telegram.py                # канал granatnukus
    python3 tools/import_telegram.py другой_канал
    python3 tools/import_telegram.py --no-photos    # только тексты
"""

import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_JS = ROOT / "js" / "products.js"
PHOTOS_DIR = ROOT / "images" / "products"

# Языки перевода (кроме русского) — в том же порядке, что и в таблицах ниже:
# узбекский и каракалпакский (латиница)
LANGS = ("uz", "kaa")

# категория: (ru, uz, kaa)
CATEGORIES = {
    "sets": ("Комплекты", "To'plamlar", "Komplektler"),
    "earrings": ("Серьги", "Sirg'alar", "Sırǵalar"),
    "rings": ("Кольца", "Uzuklar", "Júzikler"),
    "wedding": ("Обручальные кольца", "Nikoh uzuklari", "Neke júzikleri"),
    "men": ("Мужские перстни", "Erkaklar uzuklari", "Erler júzikleri"),
    "pendants": ("Кулоны", "Kulonlar", "Kulonlar"),
    "chains": ("Цепочки и браслеты", "Zanjir va bilaguzuklar", "Shınjır hám bilezikler"),
    "watches": ("Часы", "Soatlar", "Saatlar"),
}

# Картинка-заглушка, пока у товара нет своей фотографии
PLACEHOLDERS = {
    "sets": "necklace.svg",
    "earrings": "earrings.svg",
    "rings": "ring.svg",
    "wedding": "ring.svg",
    "men": "ring.svg",
    "pendants": "necklace.svg",
    "chains": "bracelet.svg",
    "watches": "bracelet.svg",
}

# (регулярное выражение, категория, (ru, uz, kaa)) — порядок важен
TYPES = [
    (r"обручальн\w* кольц", "wedding", ("Обручальное кольцо", "Nikoh uzugi", "Neke júzigi")),
    (r"мужск\w* перстен", "men", ("Мужской перстень", "Erkaklar uzugi", "Erler júzigi")),
    (r"часы", "watches", ("Часы", "Soat", "Saat")),
    (r"компл", "sets", ("Комплект", "To'plam", "Komplekt")),
    (r"сер[её]жк|серьг|сырг|сирг", "earrings", ("Серьги", "Sirg'alar", "Sırǵalar")),
    (r"кулон", "pendants", ("Кулон", "Kulon", "Kulon")),
    (r"браслет|блезик", "chains", ("Браслет", "Bilaguzuk", "Bilezik")),
    (r"цепоч|трос|змейк", "chains", ("Цепочка", "Zanjir", "Shınjır")),
    (r"кольц", "rings", ("Кольцо", "Uzuk", "Júzik")),
]

# Уточнённые названия: (ru, uz, kaa)
MEN_WATCH = ("Часы мужские", "Erkaklar soati", "Erler saatı")
DIAMOND_SET = ("Комплект с бриллиантами", "Brilliantli to'plam", "Brilliantlı komplekt")

# (регулярное выражение, (ru, uz, kaa))
STONES = [
    (r"брил", ("бриллианты", "brilliantlar", "brilliantlar")),
    (r"изумруд", ("изумруд", "zumrad", "zúmirat")),
    (r"рубин", ("рубин", "yoqut", "yaqut")),
    (r"александрит", ("александрит", "aleksandrit", "aleksandrit")),
    (r"лунн\w* камен", ("лунный камень", "oy toshi", "ay tası")),
    (r"бирюз", ("бирюза", "feruza", "piruza")),
    (r"гранат", ("гранат", "granat", "granat")),
    (r"ф[иі]онит|фианит", ("фианит", "fianit", "fianit")),
    (r"циркон", ("цирконий", "sirkoniy", "cirkoniy")),
    (r"разноцветн", ("цветные камни", "rangli toshlar", "reńli taslar")),
]

# Металл: (ru, uz, kaa); {p} — проба
GOLD = ("Золото {p}", "{p} probali oltin", "{p} probalı altın")
GOLD_NO_PROBE = ("Золото", "Oltin", "Altın")

# Слова в кавычках, которые не являются названием модели
NOT_A_NAME = {"золото", "новинка", "бриллиант", "с гранатом"}


def fetch(url, binary=False, attempts=4):
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                return data if binary else data.decode("utf-8")
        except Exception as exc:  # сеть иногда обрывает соединение
            if i == attempts - 1:
                raise
            time.sleep(2 ** (i + 1))


def load_posts(channel):
    """Все посты канала: {id, text, photos}."""
    posts = {}
    before = None
    while True:
        url = f"https://t.me/s/{channel}" + (f"?before={before}" if before else "")
        page = fetch(url)
        for chunk in page.split('<div class="tgme_widget_message_wrap')[1:]:
            pid = re.search(rf'data-post="{re.escape(channel)}/(\d+)"', chunk)
            if not pid:
                continue
            text = re.search(r"tgme_widget_message_text[^>]*>(.*?)</div>", chunk, re.S)
            text = text.group(1) if text else ""
            text = html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", "\n", text))).strip()
            photos = re.findall(
                r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)", chunk)
            posts[int(pid.group(1))] = {"id": int(pid.group(1)), "text": text, "photos": photos}
        nxt = re.search(r'data-before="(\d+)"', page)
        if not nxt or (before and int(nxt.group(1)) >= before):
            break
        before = int(nxt.group(1))
        print(f"  загружены посты до №{before}…")
    return [posts[k] for k in sorted(posts)]


def parse_product(post):
    text = post["text"]
    low = text.lower()
    if not text or not post["photos"]:
        return None

    kind = next((t for t in TYPES if re.search(t[0], low)), None)
    if not kind:
        return None
    _, category, names = kind

    if category == "watches" and "мужск" in low:
        names = MEN_WATCH
    if category == "sets" and re.search(r"брил", low):
        names = DIAMOND_SET
    names = list(names)

    model = None
    quoted = re.search(r'["«“]\s*([^"»”]+?)\s*["»”]', text)
    if quoted and quoted.group(1).lower() not in NOT_A_NAME:
        model = quoted.group(1)
    elif "союз" in low:
        model = "Союз"
    if model:
        # «Александрит серьги» → «Александрит»: вид изделия уже есть в названии
        model = re.sub(r"[\s-]*(серьги|сер[её]жки|сирг'?а|сырга)$", "", model, flags=re.I).strip()
    if model:
        model = model[0].upper() + model[1:]
        names = [f"{n} «{model}»" for n in names]

    proba = re.search(r"(?:проб\w*\s*(\d{3}))|(?:(\d{3})\s*проб)", low)
    proba = (proba.group(1) or proba.group(2)) if proba else None

    weight = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:грам|гр\b)|грамм\s*(\d+(?:[.,]\d+)?)", low)
    weight = (weight.group(1) or weight.group(2)) if weight else None
    weight = float(weight.replace(",", ".")) if weight else None

    stones = [words for rx, words in STONES if re.search(rx, low)]
    materials = [m.format(p=proba) for m in GOLD] if proba else list(GOLD_NO_PROBE)

    def stones_text(i):
        return ", ".join(s[i] for s in stones).capitalize() or None

    product = {
        "tg": post["id"],
        "name": names[0],
        "category": category,
        "price": None,
        "material": materials[0],
        "weight": weight,
        "stones": stones_text(0),
    }
    for i, lang in enumerate(LANGS, 1):
        product[lang] = {"name": names[i], "material": materials[i], "stones": stones_text(i)}
    return product


def download_photos(product, urls, enabled):
    paths = []
    for n, url in enumerate(urls, 1):
        path = PHOTOS_DIR / f"tg-{product['tg']}-{n}.jpg"
        if not path.exists() and enabled:
            try:
                path.write_bytes(fetch(url, binary=True))
            except Exception as exc:
                print(f"  фото поста №{product['tg']} не скачалось: {exc}")
                enabled = False  # если доступ закрыт — не пытаемся остальные
        if path.exists():
            paths.append(f"images/products/{path.name}")
    if not paths:
        paths = [f"images/products/{PLACEHOLDERS[product['category']]}"]
    return paths, enabled


def existing_prices():
    """Цены, уже вписанные в products.js: {номер поста: {price, oldPrice, inStock}}."""
    if not PRODUCTS_JS.exists():
        return {}
    keep = {}
    # каждый товар в файле начинается со строки «  {»
    for block in re.split(r"\n  \{\n", PRODUCTS_JS.read_text("utf-8")):
        tg = re.search(r"\btg:\s*(\d+)", block)
        if not tg:
            continue
        tg = int(tg.group(1))
        fields = {}
        for key in ("price", "oldPrice"):
            m = re.search(rf"\b{key}:\s*(\d+)", block)
            if m:
                fields[key] = int(m.group(1))
        if re.search(r"\binStock:\s*false", block):
            fields["inStock"] = False
        if fields:
            keep[tg] = fields
    return keep


def js_value(value):
    return json.dumps(value, ensure_ascii=False)


def render(products):
    out = [
        "/*",
        " * КАТАЛОГ ТОВАРОВ",
        " * ----------------",
        " * Каталог собран из Telegram-канала скриптом tools/import_telegram.py.",
        " * Его можно править и вручную. Поля товара:",
        " *   id          — уникальный номер",
        " *   tg          — номер поста в Telegram-канале (по нему скрипт",
        " *                 сохраняет цены при повторном импорте)",
        " *   name        — название",
        " *   category    — одна из категорий из списка CATEGORIES ниже",
        " *   price       — цена в сумах (число, без пробелов), например 3500000.",
        " *                 Пока цена не вписана (null), на сайте будет «Цена по запросу».",
        " *   oldPrice    — старая цена для скидки (необязательно)",
        " *   material    — металл и проба",
        " *   weight      — вес в граммах (необязательно), например 5.5",
        " *   stones      — камни (необязательно)",
        " *   description — описание (необязательно)",
        " *   images      — фотографии; первая показывается в каталоге",
        " *   isNew       — true, если нужно показать метку «Новинка» (необязательно)",
        " *   inStock     — false, если товара нет в наличии (необязательно)",
        " *   uz, kaa     — перевод на узбекский и каракалпакский: name, material,",
        " *                 stones, description. Если перевода нет, покажется русский текст.",
        " */",
        "",
        "// Категории: ключ — латиницей, затем название на русском и узбекском",
        "const CATEGORIES = {",
    ]
    used = {p["category"] for p in products}
    for key, names in CATEGORIES.items():
        if key in used:
            pairs = ", ".join(f"{lang}: {js_value(n)}" for lang, n in zip(("ru",) + LANGS, names))
            out.append(f"  {key}: {{ {pairs} }},")
    out += ["};", "", "const PRODUCTS = ["]
    for p in products:
        out.append("  {")
        for key in ("id", "tg", "name", "category", "price", "oldPrice", "material", "weight", "stones", "images", "inStock"):
            if key in p and (p[key] is not None or key == "price"):
                out.append(f"    {key}: {js_value(p[key])},")
        for lang in LANGS:
            out.append(f"    {lang}: {{")
            for k, v in p[lang].items():
                if v:
                    out.append(f"      {k}: {js_value(v)},")
            out.append("    },")
        out.append("  },")
    out += ["];", ""]
    return "\n".join(out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    channel = args[0] if args else "granatnukus"
    photos_enabled = "--no-photos" not in sys.argv

    print(f"Читаю канал t.me/{channel}…")
    posts = load_posts(channel)
    print(f"Постов: {len(posts)}")

    prices = existing_prices()
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    products = []
    skipped = []
    for post in posts:
        product = parse_product(post)
        if not product:
            if post["photos"]:
                skipped.append(post["id"])
            continue
        product["images"], photos_enabled = download_photos(product, post["photos"], photos_enabled)
        product.update(prices.get(product["tg"], {}))
        products.append(product)

    # новые посты — первыми
    products.reverse()
    for n, p in enumerate(products, 1):
        p["id"] = n

    PRODUCTS_JS.write_text(render(products), "utf-8")
    with_photo = sum(1 for p in products if p["images"][0].split("/")[-1].startswith("tg-"))
    print(f"Товаров в каталоге: {len(products)}, из них с фото: {with_photo}")
    if not photos_enabled and with_photo < len(products):
        print("Фото скачать не удалось — у товаров без фото стоит картинка-заглушка.")
    if skipped:
        print(f"Посты с фото, но без понятного описания (пропущены): {', '.join(map(str, skipped))}")


if __name__ == "__main__":
    main()

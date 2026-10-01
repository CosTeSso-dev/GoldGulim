#!/usr/bin/env python3
"""
Обновляет номер версии у CSS и JS в index.html (…/style.css?v=20261001-1310).

Браузер запоминает файлы сайта и может несколько минут показывать старую
версию после обновления. Новый номер в ссылке заставляет его скачать файлы
заново. Запускайте после любых изменений в css/ или js/:

    python3 tools/bump_version.py
"""

import re
from datetime import datetime, timezone
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "index.html"


def bump():
    version = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    html = INDEX.read_text("utf-8")
    html, count = re.subn(
        r'((?:href|src)="(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[\w-]+)?"',
        rf'\1?v={version}"',
        html,
    )
    INDEX.write_text(html, "utf-8")
    return version, count


if __name__ == "__main__":
    version, count = bump()
    print(f"Версия {version} проставлена для {count} файлов")

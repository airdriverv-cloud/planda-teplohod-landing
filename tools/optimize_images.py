# -*- coding: utf-8 -*-
"""Сжатие сгенерированных PNG в JPEG и замена ссылок в index.html."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
MAXW = {"hero": 1920}
DEFAULT_MAXW = 1200

index = ROOT / "index.html"
html = index.read_text(encoding="utf-8")

for png in sorted(IMG.glob("*.png")):
    name = png.stem
    with Image.open(png) as im:
        im = im.convert("RGB")
        maxw = MAXW.get(name, DEFAULT_MAXW)
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        out = png.with_suffix(".jpg")
        im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    before, after = png.stat().st_size // 1024, out.stat().st_size // 1024
    png.unlink()
    html = html.replace(f"assets/img/{name}.png", f"assets/img/{name}.jpg")
    print(f"{name}: {before} KB -> {after} KB")

index.write_text(html, encoding="utf-8")
print("готово")

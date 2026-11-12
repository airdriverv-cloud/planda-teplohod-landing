# -*- coding: utf-8 -*-
"""Генерация фото лендинга на локальном ComfyUI (SDXL realvisxl-v5).

Все изображения — синтетические, правообладателей нет.
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HOST = "http://127.0.0.1:8188"
HERE = Path(__file__).resolve().parent.parent
OUT = HERE / "assets" / "img"
CKPT = "realvisxl-v5.safetensors"

NEG = ("text, letters, words, logo, watermark, signature, ui, frame, border, "
       "cartoon, illustration, painting, cgi, oversaturated, distorted people, "
       "deformed hands, extra fingers, blurry, low quality, duplicate hull")

STYLE = ("professional photograph, editorial event photography, 35mm lens, "
         "natural colours, deep shadows, cinematic, high detail, realistic")

# id: (ширина, высота, промпт)
SHOTS = {
    "hero": (1344, 768,
             "winter night in Moscow, a large white river cruise ship with warm glowing windows "
             "sailing on the frozen Moskva river, Kremlin embankment and city lights in the "
             "background, light snow falling, reflections on dark water, wide cinematic view"),
    "vessel-small": (1024, 768,
                     "small modern panoramic river boat with glass roof moored at a snowy "
                     "embankment in Moscow at night, warm light inside, empty deck, winter"),
    "vessel-mid": (1024, 768,
                   "two-deck white river cruise ship with panoramic windows lit from inside, "
                   "moored in central Moscow at blue hour, soft snow, city lights"),
    "vessel-large": (1024, 768,
                     "large three-deck river cruise ship on the Moskva river at night in winter, "
                     "bright warm windows, Moscow city skyline behind, light snowfall"),
    "interior": (1216, 800,
                 "elegant banquet hall inside a river cruise ship, round tables with white linen "
                 "and gold details, large panoramic windows with night city lights, warm "
                 "chandeliers, empty before guests"),
    "guests": (1216, 800,
               "guests in evening dress with winter coats standing on the open deck of a river "
               "ship at night, holding champagne glasses, laughing, Moscow lights and light snow "
               "in the background, documentary style"),
    "food": (1024, 768,
             "banquet table close up on a river ship, plates with decorated dishes, glasses of "
             "champagne, candles and winter decor, bokeh of city lights in the window"),
    "decor": (1024, 768,
              "new year decor in a warm salon of a river ship, gold and green garlands, "
              "candles, fir branches, panoramic window with night Moscow lights, no people"),
}

STEPS = {"hero": 32}
DEFAULT_STEPS = 26


def post(path: str, payload: dict) -> dict:
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read() or b"{}")


def workflow(prompt: str, seed: int, w: int, h: int, steps: int) -> dict:
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage",
              "inputs": {"width": w, "height": h, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": steps, "cfg": 6.0, "sampler_name": "dpmpp_2m",
            "scheduler": "karras", "denoise": 1.0,
            "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
            "latent_image": ["4", 0]}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage",
              "inputs": {"filename_prefix": "landing", "images": ["6", 0]}},
    }


def make(name: str) -> Path | None:
    w, h, body = SHOTS[name]
    prompt = f"{body}, {STYLE}"
    seed = int(uuid.uuid4().int % 2**31)
    t0 = time.time()
    print(f"[{name}] seed {seed}", flush=True)
    pid = post("/prompt", {"prompt": workflow(prompt, seed, w, h, STEPS.get(name, DEFAULT_STEPS)),
                           "client_id": uuid.uuid4().hex}).get("prompt_id")
    if not pid:
        print("  не поставлено в очередь", flush=True)
        return None
    while time.time() - t0 < 3600:
        with urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=60) as resp:
            hist = json.loads(resp.read() or b"{}")
        if pid in hist:
            st = hist[pid]["status"]
            if st.get("status_str") != "success":
                for m in st.get("messages", []):
                    if m[0] == "execution_error":
                        print("  ошибка:", m[1].get("exception_message"), flush=True)
                return None
            images = [i for node in hist[pid]["outputs"].values()
                      for i in node.get("images", [])]
            if images:
                img = images[0]
                url = (f"{HOST}/view?filename={urllib.parse.quote(img['filename'])}"
                       f"&subfolder={urllib.parse.quote(img.get('subfolder', ''))}"
                       f"&type={img.get('type', 'output')}")
                OUT.mkdir(parents=True, exist_ok=True)
                dst = OUT / f"{name}.png"
                with urllib.request.urlopen(url, timeout=300) as r, open(dst, "wb") as fh:
                    fh.write(r.read())
                print(f"  готово {time.time() - t0:.0f} с -> {dst.name} "
                      f"({dst.stat().st_size // 1024} KB)", flush=True)
                return dst
        time.sleep(4)
    print("  таймаут", flush=True)
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    if a.only:
        todo = [n.strip() for n in a.only.split(",") if n.strip()]
    else:
        todo = list(SHOTS) if a.all else ["hero"]
    for n in todo:
        make(n)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Generate og-image.png (1200x630) for social previews.

One-shot helper. Re-run only if you want to regenerate the image.
Requires Pillow:  pip install Pillow
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "og-image.png"
W, H = 1200, 630

# Gradient endpoints — match the site's header (#1e3a8a → #3b82f6).
START = (0x1E, 0x3A, 0x8A)
END = (0x3B, 0x82, 0xF6)


def find_font(spec: str) -> Path:
    out = subprocess.run(
        ["fc-match", spec, "--format=%{file}"],
        check=True, capture_output=True, text=True,
    )
    return Path(out.stdout.strip())


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient(width: int, height: int) -> Image.Image:
    img = Image.new("RGB", (width, height), START)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / (height - 1)
        color = tuple(lerp(s, e, t) for s, e in zip(START, END))
        draw.line([(0, y), (width, y)], fill=color)
    return img


def wrap(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if font.getlength(trial) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def main() -> None:
    img = gradient(W, H)
    draw = ImageDraw.Draw(img)

    bold = ImageFont.truetype(str(find_font("DejaVu Sans:bold")), 76)
    regular = ImageFont.truetype(str(find_font("DejaVu Sans")), 32)
    eyebrow = ImageFont.truetype(str(find_font("DejaVu Sans:bold")), 22)

    pad = 80
    inner_w = W - 2 * pad

    draw.text(
        (pad, pad),
        "OPEN LETTER",
        font=eyebrow,
        fill=(255, 255, 255, 220),
        spacing=4,
    )
    draw.line([(pad, pad + 38), (pad + 120, pad + 38)], fill=(255, 255, 255), width=4)

    title = "UniMelb Computer Science Curriculum"
    title_lines = wrap(title, bold, inner_w)
    y = pad + 80
    for line in title_lines:
        draw.text((pad, y), line, font=bold, fill="white")
        y += 90

    subtitle = (
        "An open letter from students and graduates calling for "
        "reform of the University of Melbourne's CS programs."
    )
    y += 16
    for line in wrap(subtitle, regular, inner_w):
        draw.text((pad, y), line, font=regular, fill=(230, 238, 255))
        y += 44

    footer = "unimelb-cs-letter.com"
    fw = regular.getlength(footer)
    draw.text(
        (W - pad - fw, H - pad - 32),
        footer,
        font=regular,
        fill=(255, 255, 255, 230),
    )

    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

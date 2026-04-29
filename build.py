#!/usr/bin/env python3
"""Pre-render signatures.json into index.html using Jinja2.

Reads `signatures.json`, renders the signature list with Jinja, and
replaces the block between SIGNATURES_START / SIGNATURES_END markers in
index.html. Run before committing, or via the GitHub Actions workflow.

Usage:
    python build.py
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, BaseLoader, select_autoescape

ROOT = Path(__file__).parent
SIGNATURES_PATH = ROOT / "signatures.json"
HTML_PATH = ROOT / "index.html"
SITEMAP_PATH = ROOT / "sitemap.xml"

START_MARKER = "<!-- SIGNATURES:START -->"
END_MARKER = "<!-- SIGNATURES:END -->"
LASTMOD_START = "<!-- LASTMOD:START -->"
LASTMOD_END = "<!-- LASTMOD:END -->"

SIGNATURE_TEMPLATE = """\
                    <div class="signature-count">
                        <strong>{{ signatures|length }}</strong> {{ "person has" if signatures|length == 1 else "people have" }} signed this letter
                    </div>

                    <div id="signaturesList" class="signatures-list">
{% for sig in signatures %}                        <div class="signature-item">
                            <div class="signature-name">{{ sig.name }}</div>
                            <div class="signature-program">{{ sig.program }}</div>
                            <span class="signature-status">{{ sig.status }}</span>
                            {%- if sig.comment %}
                            <div class="signature-comment">"{{ sig.comment }}"</div>
                            {%- endif %}
                            <div class="signature-date">Signed {{ sig.date | format_date }}</div>
                        </div>
{% endfor %}                    </div>
"""


def format_date(value: str) -> str:
    """Render an ISO date as e.g. '7 Aug 2025'."""
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return value or ""
    # %-d works on Linux/macOS; fall back to stripping leading zero.
    try:
        return parsed.strftime("%-d %b %Y")
    except ValueError:
        return parsed.strftime("%d %b %Y").lstrip("0")


def update_reviewed_on(html: str) -> str:
    """Replace the LASTMOD-marked block with a fresh <time> element for today."""
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_human = format_date(today_iso)
    replacement = f'{LASTMOD_START}<time datetime="{today_iso}">{today_human}</time>{LASTMOD_END}'
    pattern = re.compile(
        re.escape(LASTMOD_START) + r".*?" + re.escape(LASTMOD_END),
        flags=re.DOTALL,
    )
    if not pattern.search(html):
        print(
            f"warning: {LASTMOD_START}/{LASTMOD_END} markers not found in HTML",
            file=sys.stderr,
        )
        return html
    return pattern.sub(lambda _: replacement, html)


def update_sitemap_lastmod() -> bool:
    """Set sitemap.xml's <lastmod> to today's UTC date. Returns True if changed."""
    if not SITEMAP_PATH.exists():
        return False
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    text = SITEMAP_PATH.read_text()
    new_text, count = re.subn(
        r"(<lastmod>)[^<]*(</lastmod>)",
        rf"\g<1>{today}\g<2>",
        text,
    )
    if not count:
        print(f"warning: no <lastmod> tag found in {SITEMAP_PATH.name}", file=sys.stderr)
        return False
    if new_text == text:
        print(f"{SITEMAP_PATH.name} lastmod already {today}.")
        return False
    SITEMAP_PATH.write_text(new_text)
    print(f"Updated {SITEMAP_PATH.name} lastmod to {today}.")
    return True


def main() -> int:
    raw = json.loads(SIGNATURES_PATH.read_text())
    signatures = sorted(raw, key=lambda s: s.get("date", ""), reverse=True)

    env = Environment(
        loader=BaseLoader(),
        autoescape=select_autoescape(["html"]),
        trim_blocks=False,
        lstrip_blocks=False,
    )
    env.filters["format_date"] = format_date
    rendered_inner = env.from_string(SIGNATURE_TEMPLATE).render(signatures=signatures)
    rendered = f"{START_MARKER}\n{rendered_inner}                    {END_MARKER}"

    html = HTML_PATH.read_text()
    pattern = re.compile(
        re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER),
        flags=re.DOTALL,
    )
    if not pattern.search(html):
        print(
            f"error: markers not found in {HTML_PATH.name}. "
            f"Expected {START_MARKER} and {END_MARKER}.",
            file=sys.stderr,
        )
        return 1

    new_html = pattern.sub(lambda _: rendered, html)
    new_html = update_reviewed_on(new_html)
    if new_html != html:
        HTML_PATH.write_text(new_html)
        print(f"Wrote {len(signatures)} signatures to {HTML_PATH.name}.")
    else:
        print(f"{HTML_PATH.name} already up to date ({len(signatures)} signatures).")

    update_sitemap_lastmod()
    return 0


if __name__ == "__main__":
    sys.exit(main())

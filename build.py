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
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, BaseLoader, select_autoescape

ROOT = Path(__file__).parent
SIGNATURES_PATH = ROOT / "signatures.json"
HTML_PATH = ROOT / "index.html"

START_MARKER = "<!-- SIGNATURES:START -->"
END_MARKER = "<!-- SIGNATURES:END -->"

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
    if new_html == html:
        print(f"{HTML_PATH.name} already up to date ({len(signatures)} signatures).")
        return 0

    HTML_PATH.write_text(new_html)
    print(f"Wrote {len(signatures)} signatures to {HTML_PATH.name}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

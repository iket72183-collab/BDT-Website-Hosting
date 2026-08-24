#!/usr/bin/env python3
"""Validate local links, assets, and duplicate HTML IDs without dependencies."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
IGNORED_SCHEMES = {"data", "http", "https", "mailto", "sms", "tel"}


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[tuple[str, str]] = []
        self.ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])

        for attribute in ("href", "src"):
            value = values.get(attribute)
            if value:
                self.references.append((attribute, value))

        srcset = values.get("srcset")
        if srcset:
            for candidate in srcset.split(","):
                self.references.append(("srcset", candidate.strip().split()[0]))


def resolve_reference(page: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme in IGNORED_SCHEMES or parsed.netloc or not parsed.path:
        return None

    relative = Path(unquote(parsed.path.lstrip("/")))
    target = ROOT / relative if parsed.path.startswith("/") else page.parent / relative
    if parsed.path.endswith("/"):
        target /= "index.html"
    return target.resolve()


def main() -> int:
    errors: list[str] = []

    for page in sorted(ROOT.rglob("*.html")):
        parser = SiteParser()
        parser.feed(page.read_text(encoding="utf-8"))

        duplicates = sorted({identifier for identifier in parser.ids if parser.ids.count(identifier) > 1})
        if duplicates:
            errors.append(f"{page.relative_to(ROOT)}: duplicate IDs: {', '.join(duplicates)}")

        for attribute, reference in parser.references:
            target = resolve_reference(page, reference)
            if target is None:
                continue
            if ROOT not in target.parents and target != ROOT:
                errors.append(f"{page.relative_to(ROOT)}: {attribute} escapes site root: {reference}")
            elif not target.exists():
                errors.append(f"{page.relative_to(ROOT)}: broken {attribute}: {reference}")

    if errors:
        print("Static-site validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Static-site validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

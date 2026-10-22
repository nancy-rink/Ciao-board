"""Fetch BBC News RSS feeds and write the headlines to a JSON file for the board.

BBC feeds can't be read directly from a web page, so a scheduled GitHub Action
runs this and publishes the result to the news-data branch.
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

FEEDS = {
    "top": ("Top stories", "https://feeds.bbci.co.uk/news/rss.xml"),
    "world": ("World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    "uk": ("UK", "https://feeds.bbci.co.uk/news/uk/rss.xml"),
    "business": ("Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    "technology": ("Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    "science": ("Science", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"),
    "sport": ("Sport", "https://feeds.bbci.co.uk/sport/rss.xml"),
}
PER_SECTION = 15


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "CiaoBoard/1.0 (+https://github.com/nancy-rink/Ciao-board)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def headlines(xml):
    seen, out = set(), []
    for item in ET.fromstring(xml).iter("item"):
        title = " ".join((item.findtext("title") or "").split())
        if title and title.lower() not in seen:
            seen.add(title.lower())
            out.append(title)
        if len(out) >= PER_SECTION:
            break
    return out


def main(path):
    sections = {}
    for key, (name, url) in FEEDS.items():
        try:
            items = headlines(fetch(url))
        except Exception as e:  # keep the other sections if one feed fails
            print(f"{key}: {e}", file=sys.stderr)
            continue
        if items:
            sections[key] = {"name": name, "items": items}
    if not sections:
        sys.exit("No feeds could be loaded")
    data = {"source": "BBC News", "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sections": sections}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {sum(len(s['items']) for s in sections.values())} headlines in {len(sections)} sections")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "news.json")

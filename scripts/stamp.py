#!/usr/bin/env python3
"""Stamps each css/ and js/ reference in index.html with a hash of the file (?v=...), so a browser
never mixes a new page with an old cached script. Run it after changing a css/ or js/ file.
With --check it changes nothing and fails if a stamp is out of date (the tests workflow runs this)."""
import hashlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
html = page.read_text()
def stamp(m):
    path = m.group(2)
    digest = hashlib.sha256((root / path).read_bytes()).hexdigest()[:10]
    return '%s%s?v=%s%s' % (m.group(1), path, digest, m.group(4))
new = re.sub(r'((?:href|src)=")((?:css|js)/[\w.-]+)\?v=([\w]*)(")', stamp, html)
if '--check' in sys.argv:
    if new != html:
        sys.exit('index.html has out-of-date ?v= stamps: run python3 scripts/stamp.py')
    print('stamps up to date')
else:
    page.write_text(new)
    print('stamped')

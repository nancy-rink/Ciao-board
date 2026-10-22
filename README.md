# Ciao Board

A split-flap message board for your wall, inspired by the classic Italian station boards. It runs in any modern browser — no install, no account, no server.

**[Open Ciao Board →](https://nancy-rink.github.io/Ciao-board/)**

![Ciao Board flipping to a new message](assets/demo.gif)

## What it does

- **Messages** — type up to 6 lines of 22 characters; words wrap and center on their own. Drop in color tiles, preview exactly how it will flip, and save favorites.
- **Saved** — keep a list of messages and rotate through them.
- **Clock** — time and date, with 12/24-hour, a second city, borders and accent tiles.
- **News** — BBC headlines (top stories, world, UK, business, technology, science or sport), one at a time.
- **Day plan** — change what the board shows, and its style, at set times through the day.
- **14 styles** — Classic, Departures, Daylight, Rail, Harbor, Glow, Neon, Mint, plus vintage Solari, Cifra clock, Worn, Game show, Euro rail and Brass.
- **Animation** — realistic flaps that settle with a bounce, seven flip patterns (left to right, row by row, diagonal, center out, edges in, random, all at once), raised tiles with optional glass glare, and a choice of frames (brushed metal, walnut, matte black, white).
- **Sound** — a modelled mechanical flap with left-to-right stereo, a dozen other click styles, finish chimes, or upload your own recording.
- **Full screen** — fills a TV, tablet or monitor and keeps the screen awake.

Settings are kept in each person's own browser.

## Put it on a wall

- **TV or monitor:** open the link in the browser, tap **Full screen**, and turn off the TV's auto power-off (on a Samsung Frame, for example).
- **iPad or tablet:** open the link in Safari, tap **Share → Add to Home Screen**, then open it from the home screen icon and turn the tablet sideways. Set **Auto-Lock** to Never while it's on the wall.
- **Sound:** browsers only play sound after a tap, so tap the board once. On iPhone or iPad, turn off silent mode.
- **Keyboard:** `S` changes the style and `H` hides the controls (you can turn these off in Settings).

## Host your own copy

The whole board is one file, `index.html`, plus icons and preview images in `assets/`.

1. Fork this repository, or create a new public one and upload all of its files.
2. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and click **Save**.
3. After a minute or two, your board is live at `https://<your-username>.github.io/<repository-name>/`.

If you host it somewhere else, change the two `og:` links near the top of `index.html` to your own address so link previews keep working.

BBC's feeds can't be read straight from a web page, so a GitHub Action (`.github/workflows/news.yml`) fetches the headlines every 20 minutes and saves them to the `news-data` branch, where the board picks them up. In your own copy, change `NEWS_URL` in `index.html` to point at your repository. GitHub pauses scheduled Actions after 60 days without any commits; re-enable it on the **Actions** tab if headlines stop updating.

## License

MIT — see [LICENSE](LICENSE).

Made with Claude.

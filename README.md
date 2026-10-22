# Ciao Board

A split-flap message board for your wall, inspired by the classic Italian station boards. It runs in any modern browser — no install, no account, no server.

**[Open Ciao Board →](https://nancy-rink.github.io/Ciao-board/)**

![Ciao Board flipping to a new message](assets/demo.gif)

## What it does

- **Messages** — type up to 6 lines of 22 characters; words wrap and center on their own. Drop in color tiles, preview exactly how it will flip, and save favorites.
- **Saved** — keep a list of messages and rotate through them.
- **Clock** — time and date, with 12/24-hour, a second city, borders and accent tiles.
- **News** — BBC headlines (top stories, world, UK, business, technology, science or sport), one at a time.
- **Remote** — use your phone as a remote for the board on your TV: send messages, change the style, show the clock, news or art, and start or stop the day plan. Pair once by scanning a QR code on the TV.
- **Friends** — connect with a friend's board (you both have to agree) and send each other messages; the board asks before showing one.
- **Day plan** — change what the board shows, and its style, at set times through the day.
- **26 styles** in five groups: Everyday (Classic, Daylight, Rail, Harbor, Glow, Mint), Workshop (Solari, Cifra clock, Worn, Euro rail), Transit icons (Metropolitana, Standard, Double Arrow, Ulm, Olympia 72, Jet Age), Made in Japan (Patapata, Ekimei, Caslon 101, Dangan, Butterfly) and Modernismo (Metro, Mexico 68, Filete, Calçadão, Cinética).
- **Accented letters** — Á É Í Ó Ú Ñ Ã Õ Ç Â Ê Ô À Ü have their own flaps, so Spanish and Portuguese messages show correctly.
- **Animation** — realistic flaps with visible edges that settle with a bounce, seven flip patterns (left to right, row by row, diagonal, center out, edges in, random, all at once), new styles that flip in tile by tile, a power-on spin, the odd idle twitch, raised tiles with optional glass glare, and a choice of frames (brushed metal, walnut, matte black, white).
- **Art** — pictures made from color tiles (heart, sunset, rainbow, smile, birthday cake, Ciao, Italian and Norwegian flags) and animations (rainbow wave, sparkle, rain, heartbeat), also available in the Day plan.
- **Wall display** — dims the board during the night hours you choose, and in full screen drifts it a few pixels over time to protect TV screens from burn-in.
- **Sound** — a modelled mechanical flap with left-to-right stereo, a dozen other click styles, finish chimes, or upload your own recording.
- **Full screen** — fills a TV, tablet or monitor and keeps the screen awake.
- **Smooth mode** — on TVs and other slow screens the board drops its costliest effects and caps how many flaps each tile turns, so flips stay fluid. It's on automatically in TV mode, or when the board notices flips running slowly; choose it yourself in Settings → Motion.

Settings are kept in each person's own browser.

## Put it on a wall

- **Smart TV:** in the TV's web browser, go to **is.gd/ciaoboard** (or `nancy-rink.github.io/Ciao-board/tv`). It opens in TV mode: the board alone, filling the screen. Press **OK** on the remote to go full screen; after that, **OK** shows or hides the controls. Then pin the page so it's one click away: on Samsung, open the browser's menu and choose **Add to Home**; on LG, choose **Pin to Home**; on Google TV and Fire TV, add it as a bookmark. Turn off the TV's auto power-off (on a Samsung Frame, for example). The TV keeps its own settings, so set its style and Day plan from the TV once.
- **Monitor or laptop:** open the link, tap **Full screen**, or press `H` to hide the controls.
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

## Use your phone as a TV remote

1. On the TV, open the board (for example at **is.gd/ciaoboard**) and choose **Pair a phone as a remote** on the start screen. (Or press **OK** for the controls, open **What to show → Remote** and choose **Pair a phone**.)
2. The board flips to show a pairing code, with a QR code in the corner. Scan the QR code with your phone's camera, or open the board on your phone, go to **What to show → Remote** and type the code.
3. Tap **Connect**. From then on the Remote tab on your phone controls the TV, and shows what the TV is displaying.

The Remote tab also controls the TV's sound (on or off, volume, flap sound, chime, a test click) and its animation quality. A paired phone is trusted: the TV acts on its commands straight away. Unpair from either device under **Remote → Paired**. The remote uses the same relay and encryption as Friends, below.

## How Friends works

Messages travel through [ntfy.sh](https://ntfy.sh), a free public relay, so there's nothing to set up. Each board listens on its own random inbox. An invite code lets one friend find your board; when they accept, the two boards run a key exchange, and from then on every message is encrypted with a key only those two boards hold. The relay never sees what's written, and a board ignores anything not encrypted by a connected friend. Share invite codes only with the person you're connecting with.

ntfy.sh keeps messages for 12 hours, so a board that's switched off longer than that misses them. A board's connections live in its browser: clearing browser data or switching browsers means connecting again.

## License

MIT — see [LICENSE](LICENSE).

Made with Claude.

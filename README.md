# Lobby

Vite serves the lobby. The manifest and the service worker attach only after `npm run build && npm run preview`. `npm test` runs the suite. `npm run coverage` writes `coverage/`.

From 1024px the screen is a dock, a directory, and a tape. Narrower than that, the tape is a drawer. The directory is about 100 cards: mark, title, studio, tags, return, stake range. Category, studios, tag, and a debounced title/studio search stack, then sort by Trending, New releases, or Highest RTP. The shareable view is `cat`, `provider`, `tag`, `q`, and `sort`. Light, dark, and the accent hue persist. Strings live in `src/i18n` (English, German, Arabic). Amounts are integer cents.

A deposit credits the balance immediately and adds a ledger row. A whole amount ending in 9 is refused, the credit is removed, and that row goes with it. Glass Orchard spends the same wallet.

## Bonus

1. **Language.** The dock control cycles English, German, and Arabic. Arabic sets `dir="rtl"`. The three reels stay left to right, so the payline still starts on the left reel.
2. **Offline.** The preview worker stores the shell, the hashed bundle, and the JSON during install, so one load, a disconnect, and a reload still opens. If `/games.json` fails while the app is already up, `merrin.catalog.v1` keeps the grid and the banner reads “Last download. The fetch failed.” Dev does not register the worker.
3. **Palette.** Ctrl or Cmd+K. Fuzzy rank over titles, studios, and actions. Arrows and Enter choose.
4. **Hue.** `--hue` on the document. The slider does not re-render the directory.
5. **Pool.** A canvas on `requestAnimationFrame`. A hidden tab stops it. Reduced motion snaps to the figure.
6. **Pins.** Drag to reorder, or use the arrow keys. The order is `merrin.favs`.
7. **Virtualization.** Not built. The tape keeps 24 rows. A longer tape would be windowed, and it would keep the same pause rules.
8. **Glass Orchard.** One line. RTP is 96.98%, counted from the strip. The stake leaves before the reels move. Another spin is ignored until that one settles. Closing the cabinet mid-spin posts the outcome that was already drawn, once.

## Checks

`/?cat=slots&provider=calder&tag=new&sort=rtp`, then Clear filters. Search `zzzz`, wait for the URL, and clear that too. Deposit 20, then 19. 19.40 fails. 90 does not. EUR is stubbed at 1.08, GBP at 1.27.

`?fail=catalog`, `?fail=wallet`, `?fail=promos`, and `?fail=feed` are the error states. Try again recovers and the flag can stay. `?empty=promos` and `?empty=wallet` are the empty states. Stale catalog: load once, 404 `/games.json`, reload. Offline shell: preview build, load once, disconnect, reload.

Ctrl+K, type `gls`, ArrowDown, Enter. Pin two titles and drag one, or focus a pin and press Right, then reload. Open Glass Orchard, spin, and close the cabinet while the reels are still moving.

## Calls

Tape rows stay inside the tape. A store shared with the directory would have painted a hundred cards on every win.

The 9-rule looks at the whole units you typed. Conversion to dollars happens after that, so 19 fails and 90 does not. The ledger and the balance move as one pair, including the rollback.

The tape is capped instead of virtualized. Twenty-four rows were the plan.

## Settle

`src/features/slot/dialog.tsx` writes the result from the unmount cleanup. The stake is already gone and the stops were chosen when the spin began, so that cleanup has to record the result once. With a week I would keep the in-flight spin on the wallet, put a router under the query string, and run the focus trap through VoiceOver.

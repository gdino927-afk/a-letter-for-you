# A Letter for You

A small visual-novel-style browser game. Plain HTML, CSS and JavaScript — no build step, no dependencies, no server code. Fonts are bundled, so it works offline.

## Play it locally

Easiest: double-click `index.html`.

Or serve the folder (closer to how it runs online):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Where to edit things

Everything the game *says* lives in **`js/content.js`**:

| What | Where in `js/content.js` |
|---|---|
| Game title, subtitle, credits | `title`, `subtitle`, `credits` at the top |
| Opening question | scene `"question"` → `prompt` |
| Answer choices (order + which is right) | scene `"question"` → `choices` (`correct: true` marks the right one) |
| Dino's wrong-answer line | scene `"question"` → `wrongResponse` |
| **The letter** | scene `"letter"` → `text` (between the backticks) |
| What comes after the letter | scene `"to-be-continued"` (placeholder) |

Letter formatting: a blank line starts a new paragraph; a single line break starts a new line (useful for "Yours,\nDino"). Punctuation and Unicode are kept as typed. If the letter contains a backtick character, write it as `` \` ``.

## Adding a scene later

1. Add a scene object to `scenes` in `js/content.js` with a new `id`.
2. Point the previous scene's `next` at that id.
3. Use an existing `type` (`"choice"`, `"letter"`, `"end"`), or add a new type as a function in `js/scenes.js` (`SceneTypes.yourType = function (root, scene, ctx, saved) { ... }`).

## Files

```
index.html            page structure, menus and dialogs
css/style.css         all visuals and animations
css/fonts.css         bundled font declarations
fonts/                Caveat, Cormorant Garamond, Lora (SIL Open Font License)
js/content.js         ← story text, choices, the letter
js/storage.js         settings + save/continue (localStorage)
js/audio.js           tiny synthesized sound effects (no audio files)
js/dialogue.js        dialogue box with typewriter effect
js/letter-writer.js   word-by-word handwriting animation
js/scenes.js          scene types: choice, letter, end
js/main.js            title screen, fades, settings, pause menu
```

## Deploy on GitHub Pages

1. Push this folder's contents to a GitHub repository (with `index.html` at the root).
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose `main` and `/ (root)`, save.
3. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

Any static host works the same way (Netlify, Vercel, Cloudflare Pages: just upload the folder).

## Saving

Progress and settings are stored in the browser (`localStorage`). Continue resumes the exact point in the letter. Clearing site data or using a private window means nothing is remembered — the game still plays normally.

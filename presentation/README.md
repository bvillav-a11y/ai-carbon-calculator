# AI Carbon Calculator — talk deck

A ~20-minute reveal.js talk for technical peers. Self-contained and offline (reveal.js + fonts are vendored).

## Present
- Open `presentation/index.html` in a browser.
- Arrow keys / space to navigate; `ESC` for the slide overview.
- **`S` opens the speaker view** — presenter notes, a timer, and the next-slide preview (allow popups for `file://`).

## Export to PDF
- Open `presentation/index.html?print-pdf` and use the browser's Print → Save as PDF (one slide per page).

## Re-vendor assets (only if upgrading)
- reveal.js: `npm pack reveal.js@5.1.0`, copy `dist/{reset,reveal}.css`, `dist/reveal.js`, and `plugin/notes/{notes.js,notes.html}` into `reveal/`.
- fonts: `npm pack @fontsource/space-grotesk @fontsource/space-mono`, copy the woff2 from `files/` into `fonts/`.

## Editing
- All content + theme live in `index.html` (one inline `<style>` + one `<section>` per slide, each with an `<aside class="notes">`). `reveal/` and `fonts/` are vendored — don't hand-edit.

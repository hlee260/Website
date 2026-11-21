# Heonjoon (HJ) Lee: personal website

A hand-built, dependency-free personal academic site. It's plain HTML, CSS and JavaScript,
so there is no build step: GitHub Pages serves it as-is.

**Highlights**

- A 3D DNA double helix (canvas) that wraps around the portrait. It anneals on load, unzips
  as you scroll and leans toward the cursor. Its sequence hides the thrombin-binding aptamer.
- An **interactive ARTIST explainer**: drag the target concentration, swap aptamers
  (thrombin / IL-6 / TNF-α / IFN-γ) and switch between analog and digital circuits, while the
  schematic simulation and dose-response chart respond live.
- Featured first-author papers with figure slots, plus a filterable full publication list,
  patents, code and data, honors, talks, posters and press.
- Dark theme by default with a light theme (circular-reveal switch). Responsive down to
  phones, keyboard accessible, and honors `prefers-reduced-motion`.
- Self-hosted fonts (SIL OFL): Instrument Serif, Instrument Sans, JetBrains Mono.
  No trackers, no CDNs, no third-party requests.

## Structure

```
index.html              ← all page content lives here
404.html                ← self-contained "page not found"
assets/
  css/style.css         ← design tokens (colors, type) at the top, then components
  js/helix.js           ← hero DNA helix
  js/artist.js          ← interactive ARTIST explainer
  js/main.js            ← nav, theme, reveal, filters, lightbox, email, footer easter egg
  fonts/                ← WOFF fonts + licences
  img/                  ← portrait, favicon, social card, grain texture
  figures/              ← publication figures (see figures/README.md)
```

## Publish with GitHub Pages

1. **Visibility:** this repository is private. On a free GitHub plan, Pages only works for
   public repositories. Either make the repo public (Settings → General → Danger Zone →
   Change visibility) or use GitHub Pro.
2. Settings → **Pages** → *Build and deployment* → Source: **Deploy from a branch** → choose
   the branch (e.g. `main`) and folder `/ (root)` → Save.
3. The site will appear at `https://hlee260.github.io/Website/`.
   - For the shorter `https://hlee260.github.io/`, rename the repository to
     `hlee260.github.io`.
   - For a custom domain, add it under Settings → Pages → Custom domain.
4. If the final URL differs from `https://hlee260.github.io/Website/`, update the two
   `og:url` / `og:image` lines near the top of `index.html` so link previews work.

All asset paths are relative, so the site works at any of these addresses unchanged.

## Editing content

Everything is plain HTML in `index.html`, organized by commented sections
(`HERO`, `JOURNEY`, `RESEARCH / ARTIST`, `PUBLICATIONS`, `CODE & DATA`, `HONORS`, `TALKS`,
`CONTACT`).

- **Add a publication:** copy one `<li class="pub">…</li>` in the *All publications* list.
  Use `data-cat="molecular"` or `data-cat="materials"`, and add `data-first` for first or
  co-first authorship. Then update the counts in the filter buttons and the hero stats
  (`data-count`).
- **Add a figure:** see [`assets/figures/README.md`](assets/figures/README.md). Drop in a file
  with the right name and it appears automatically.
- **Colors and fonts:** edit the tokens at the top of `assets/css/style.css`.
- **Email:** assembled in the browser from `data-user` / `data-domain` (in the Contact section)
  to deter scrapers.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Credits

Portrait © Heonjoon Lee. Publication figures © their respective publishers/authors as noted
under each figure. Fonts: Instrument Sans and Instrument Serif (© The Instrument Sans/Serif
Project Authors), JetBrains Mono (© The JetBrains Mono Project Authors), all under the SIL Open
Font License 1.1 (see `assets/fonts/`).

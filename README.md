# Heonjoon (HJ) Lee: personal website

A hand-built, dependency-free academic homepage in the spirit of the Hugo Academic layout
(profile and biography, publications with figures, talks, awards, peer review). It's plain HTML,
CSS and JavaScript, so there is no build step: GitHub Pages serves it as-is.

**What's on the page**

- **About:** portrait (click it to see the full photo), name, role and
  links, plus the biography, interests and education.
- **Publications:** first-author papers with their TOC graphics, figures and issue cover
  (click to enlarge), plus co-authored papers, the book chapter and patents.
- Talks and posters, honors and awards, peer review (linked to ORCID), code and data, press,
  and contact.
- White and navy by default, with an optional deep-navy dark mode (circular-reveal switch).
  Responsive, keyboard accessible, honors `prefers-reduced-motion`. Self-hosted fonts; no
  trackers or CDNs.

## Structure

```
index.html              ← all page content lives here
404.html                ← self-contained "page not found"
assets/
  css/style.css         ← design tokens (colors, type) at the top, then components
  js/main.js            ← nav, theme, reveal, lightbox, email, footer easter egg
  fonts/                ← WOFF fonts + licences
  img/                  ← avatar + full photo, favicon, social card, grain texture
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

## Editing content

Everything is plain HTML in `index.html`, organized by commented sections
(`ABOUT`, `PUBLICATIONS`, `TALKS`, `AWARDS`, `PEER REVIEW`, `CODE, DATA & PRESS`, `CONTACT`).

- **Add a publication:** copy a `<li class="paper">` block (first-author, with figure) or a
  `<li class="pub">` line (co-authored).
- **Add a figure:** see [`assets/figures/README.md`](assets/figures/README.md). Drop in a file
  with the right name and set its shape (`style="--ar: width / height"`) on the `<figure>`.
- **Change the portrait:** replace `assets/img/avatar-*.{webp,jpg}` (square crop) and
  `assets/img/photo-1200.{webp,jpg}` (full image shown on click).
- **Colors and fonts:** edit the tokens at the top of `assets/css/style.css`.
- **Email:** assembled in the browser from `data-user` / `data-domain` to deter scrapers.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Credits

Portrait © Heonjoon Lee. Publication figures © their respective
publishers/authors as noted under each figure. Fonts: Instrument Sans and Instrument Serif
(© The Instrument Sans/Serif Project Authors), JetBrains Mono (© The JetBrains Mono Project
Authors), all under the SIL Open Font License 1.1 (see `assets/fonts/`).

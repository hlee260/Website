# Publication figures

Each first-author paper on the homepage shows its TOC graphic, key figure or issue cover.
The page looks for an image with the exact base name below and tries `.webp`, then
`.jpg`, then `.png`. If no file is found, the slot shows a designed placeholder panel.

| File | Paper | Image | Licence note |
|---|---|---|---|
| `2024-ncomms-artist.webp` | Lee *et al.*, *Nat. Commun.* 15, 7973 (2024) · [doi:10.1038/s41467-024-51907-4](https://doi.org/10.1038/s41467-024-51907-4) | dART design schematic | CC BY 4.0, free to reuse with credit |
| `2022-advsci-microdenticles.webp` | Hwang, Lee *et al.*, *Adv. Sci.* 9, 2202978 (2022) · [doi:10.1002/advs.202202978](https://doi.org/10.1002/advs.202202978) | Issue cover (vol. 9, no. 31) | Cover art, Wiley-VCH |
| `2021-acsnano-perceptive-actuator.webp` | Lee, Baik, Hwang *et al.*, *ACS Nano* 15, 14137 (2021) · [doi:10.1021/acsnano.1c05130](https://doi.org/10.1021/acsnano.1c05130) | TOC graphic | © ACS: author reuse with credit |
| `2019-advmater-adhesive-review.webp` | Baik, Lee *et al.*, *Adv. Mater.* 31, 1803309 (2019) · [doi:10.1002/adma.201803309](https://doi.org/10.1002/adma.201803309) | Overview figure | © Wiley-VCH: author reuse with credit |
| `2019-acsami-capillarity-adhesive.webp` | Baik, Lee *et al.*, *ACS Appl. Mater. Interfaces* 11, 25674 (2019) · [doi:10.1021/acsami.9b05511](https://doi.org/10.1021/acsami.9b05511) | TOC graphic | © ACS: author reuse with credit |

## Adding or replacing a figure

1. Save the image under the paper's base name (WebP is smallest; about 1600 px on the
   long side is plenty, and small TOC graphics are fine as they are).
2. In `index.html`, set the image's shape on its `<figure>` so the thumbnail matches it and
   nothing jumps while it loads: `<figure class="thumb" style="--ar: 1600 / 900">` (width /
   height in pixels). Without `--ar` the slot is 4:3 and the image is fitted inside.
3. For a journal cover, add `thumb--cover` (`<figure class="thumb thumb--cover" …>`): it is
   shown full-bleed instead of on a white mat, in the list and when enlarged.
4. The credit line under each figure is the `<figcaption class="paper__caption">`. Edit it to
   match the image.

Thumbnails are 320 px wide on desktop. Tall images are capped at 260 px high and centered.
Clicking a thumbnail opens it full size.

Publisher policies for reusing your own figures on a personal, non-commercial site are
generally permissive with attribution. Check the journal's author-rights page if you're unsure.

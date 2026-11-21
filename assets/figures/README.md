# Publication figures

Each featured first-author paper on the homepage has a figure slot. The page looks
for an image with the exact base name below and tries `.webp`, then `.jpg`, then `.png`.
Until a file exists, the slot shows a designed "key result" panel instead. No code
changes are needed: drop the file in and reload.

| File name (any of .webp / .jpg / .png) | Paper | Suggested image | Licence note |
|---|---|---|---|
| `2024-ncomms-artist` | Lee *et al.*, *Nat. Commun.* 15, 7973 (2024) · [doi:10.1038/s41467-024-51907-4](https://doi.org/10.1038/s41467-024-51907-4) | Fig. 1 (ARTIST design) | CC BY 4.0, free to reuse with credit |
| `2022-advsci-microdenticles` | Hwang, Lee *et al.*, *Adv. Sci.* 9, 2202978 (2022) · [doi:10.1002/advs.202202978](https://doi.org/10.1002/advs.202202978) | Fig. 1 or the issue cover art | CC BY 4.0, free to reuse with credit |
| `2021-acsnano-perceptive-actuator` | Lee, Baik, Hwang *et al.*, *ACS Nano* 15, 14137 (2021) · [doi:10.1021/acsnano.1c05130](https://doi.org/10.1021/acsnano.1c05130) | Fig. 1 or TOC graphic | © ACS: author reuse with credit |
| `2020-bios-3d-mea-review` | Choi, Lee *et al.*, *Biosens. Bioelectron.* 171, 112687 (2020) · [doi:10.1016/j.bios.2020.112687](https://doi.org/10.1016/j.bios.2020.112687) | Fig. 1 (overview) | © Elsevier: author reuse with credit |
| `2019-advmater-adhesive-review` | Baik, Lee *et al.*, *Adv. Mater.* 31, 1803309 (2019) · [doi:10.1002/adma.201803309](https://doi.org/10.1002/adma.201803309) | Fig. 1 (overview) | © Wiley-VCH: author reuse with credit |
| `2019-acsami-capillarity-adhesive` | Baik, Lee *et al.*, *ACS Appl. Mater. Interfaces* 11, 25674 (2019) · [doi:10.1021/acsami.9b05511](https://doi.org/10.1021/acsami.9b05511) | Fig. 1 or TOC graphic | © ACS: author reuse with credit |

Tips

- **Size:** about 1600 px on the long side is plenty. The slot is 4:3 and the image is
  shown with `object-fit: contain` on a white panel, so any aspect ratio works.
- **Format:** WebP is smallest. A JPEG at quality 85 is fine too.
- **Credit lines** are already written under each figure in `index.html`
  (`<figcaption class="paper__caption">`). They only appear once the image is present.
- Publisher policies for reusing your own figures on a personal, non-commercial site are
  generally permissive with attribution. Check the specific journal's author-rights page
  if you're unsure.

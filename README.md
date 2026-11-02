# 鲲鹏 · 形态档案

A static masonry gallery of **185 visually distinct Kunpeng logo concepts**, curated from 234 generated artworks.

- Eight batches: two hand-drawn pastel logos first, then 28 concept-led new-beginning Peng logos, 29 individually referenced pastel variations, and the original 126 concepts.
- The two latest outline-free artworks lead the masonry archive with the same card sizing as all other concepts.
- Batch filters, name/number search, and 51 reference groups.
- Original/reference comparisons, full-size artwork, and PNG downloads.
- Favorites stored locally in the current browser.
- Small WebP previews with untouched original PNG files.
- Responsive masonry reads left to right, then down, with uniformly sized cards and keyboard-accessible dialogs.

## Run locally

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. No Node.js, build step, third-party CDN, backend, account, or API token is required by the website.

## Publish

The `gh-pages` branch serves the contents of `dist/` through GitHub Pages. The `main` branch retains the website source, assets, and preparation script.

The site is an archive of AI-generated design concepts. Reference images are presented alongside their related explorations, not as generated deliverables.

## Files

`dist/gallery.json` contains artwork metadata and generation prompts. `dist/assets/originals/` holds all 234 original PNGs. `dist/assets/previews/` holds optimized previews. `dist/assets/references/` contains 51 reference previews.

`additions.json` retains the two curated hand-drawn additions and their display order.

`prepare-assets.py` rebuilds the asset catalog from the adjacent original session folders in the original workspace; the committed `dist/` is self-contained and does not require that workspace to run or deploy.

`reference-studies-v7.json` retains the 76 published variations and their individually cropped reference images.

`conceptual-studies-v8.json` retains the 30 大鹏 · 新序初开 concepts, interleaved across six directions for comparison.

`deduplication.json` records 49 visually reviewed merges. `gallery_catalog.py` applies them during rebuilds. All 234 original PNGs remain available; favorites and old artwork links resolve to their retained representative.

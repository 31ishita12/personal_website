# personal_website

Source for **https://ishitashreshtha.com** — a single static page, no build step.

- `index.html` — all the words on the page, including the publication and writing lists
- `assets/style.css` — styles (colors live in `:root`)
- `assets/main.js` — the opening typed out letter by letter, and the background:
  ink-drawn cells that divide and die, above a Raman spectrum being re-measured
- `assets/img/` — images used on the page
- `assets/gallery/` — gallery photos (see below)
- `CNAME` — tells GitHub Pages which custom domain to serve

## Security policy

`index.html` has a Content-Security-Policy meta tag: only this site's own files
and Google Fonts can load, and the one inline `<script>` is allowed by its
SHA-256 hash. If you change that inline script, update the hash, or the page
will stop marking itself as JS-enabled.

## Adding gallery photos

1. Resize the photo to about 720px tall and save it in `assets/gallery/`
   (webp or jpg, ideally under ~100 KB).
2. In `index.html`, find the gallery section and add a line to either row:

   ```html
   <figure class="shot"><img src="assets/gallery/my-photo.webp" width="540" height="720" alt="what it shows" loading="lazy"></figure>
   ```

   `width` and `height` are the photo's real pixel size. For a caption (shown
   on hover), put `<figcaption>your caption</figcaption>` after the `<img>`.

## Hosting on ishitashreshtha.com (GitHub Pages)

- **Settings → Pages:** deploy from branch `main`, folder `/ (root)`; custom domain `ishitashreshtha.com`, Enforce HTTPS on.
- **Namecheap → ishitashreshtha.com → Advanced DNS**:

  | Type         | Host  | Value                   |
  |--------------|-------|-------------------------|
  | A Record     | `@`   | `185.199.108.153`       |
  | A Record     | `@`   | `185.199.109.153`       |
  | A Record     | `@`   | `185.199.110.153`       |
  | A Record     | `@`   | `185.199.111.153`       |
  | CNAME Record | `www` | `31ishita12.github.io.` |

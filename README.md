# personal_website

Source for **https://ishita.shreshtha.com** — a single static page, no build step.

- `index.html` — all the words on the page, including the publication and writing lists
- `assets/style.css` — styles (colors live in `:root`)
- `assets/main.js` — the opening typed out letter by letter, and the background:
  ink-drawn cells that divide and die, above a Raman spectrum being re-measured
- `assets/img/` — images used on the page
- `assets/gallery/` — gallery photos (see below)
- `CNAME` — tells GitHub Pages which custom domain to serve

## Adding gallery photos

1. Put the photo in `assets/gallery/` (jpg or webp, ideally under ~400 KB).
2. In `index.html`, find the gallery section and replace one
   `<figure class="shot empty"></figure>` with:

   ```html
   <figure class="shot"><img src="assets/gallery/my-photo.jpg" alt="what it shows" loading="lazy"><figcaption>optional caption</figcaption></figure>
   ```

   Add `tall` or `wide` to the class for portrait or landscape frames
   (`class="shot tall"`). Captions show on hover; leave `<figcaption>` out for none.

Preview locally: `python3 -m http.server` and open http://localhost:8000.

## Hosting on ishita.shreshtha.com (GitHub Pages)

1. Merge this branch into `main`.
2. Repo **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. At the DNS provider for `shreshtha.com`, add a record:

   | Type  | Name     | Value                   |
   |-------|----------|-------------------------|
   | CNAME | `ishita` | `31ishita12.github.io.` |

4. Back in **Settings → Pages**, set the custom domain to `ishita.shreshtha.com`,
   wait for the DNS check to pass, then tick **Enforce HTTPS**.

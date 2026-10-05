# personal_website

Source for **https://ishita.shreshtha.com** — a single static page, no build step.

- `index.html` — page text (currently / recently / contact)
- `assets/content.js` — the publications, essays and poems lists; add items here
- Header toggle **order / chaos**: order shows a faint lab-notebook grid; chaos
  knocks every element slightly off its grid and re-seeds the attractor
- `assets/style.css` — styles (colors live in `:root`)
- `assets/main.js` — the generative background: a Peter de Jong attractor
  (`x' = sin(a·y) − cos(b·x)`, `y' = sin(c·x) − cos(d·y)`) rendered as an ink
  density map. Click the equation box to re-seed it.
- `CNAME` — tells GitHub Pages which custom domain to serve

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

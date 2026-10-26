# CanadianSME Website Template

Starter template for the CanadianSME Small Business Magazine website (canadiansme.ca), exported from Claude Design. Use **"Use this template"** on GitHub to spin up a new copy.

Audience: Canadian small business owners. See [`CLAUDE.md`](CLAUDE.md) for the project brief (tone, Canadian spelling, brand hierarchy).

## Pages

| File | What it is |
|---|---|
| `CanadianSME Homepage.dc.html` | Main magazine homepage (header, features, issues, partners, ads) |
| `CanadianSME Tools.dc.html` | Free calculators: GST/HST, payroll, cash flow, loans |
| `CanadianSME Design Guide.dc.html` | Design system: colours, type (Sora + IBM Plex Sans), components |
| `CanadianSME Developer Guide.dc.html` | Developer handoff notes |
| `index.html` | Redirects to the homepage |

## Folders

- `assets/` — logo, magazine covers, partner logos, ad units, banners
- `uploads/` — source images and cleaned post exports (`*_cleaned.json`) used as content
- `seo/` — `robots.txt` and `sitemap.xml`
- `screenshots/` — reference captures

## Runtime files

`support.js`, `doc-page.js` and `image-slot.js` (plus `.image-slots.state.json`) are the Claude Design runtime. The pages load React and Google Fonts from CDNs, so they need an internet connection.

## Run locally

Serve the folder over HTTP (opening the files directly with `file://` can block scripts):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Works as-is on any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). `index.html` sends visitors to the homepage.

---
Publisher: Cmarketing Inc., Mississauga, Ontario.

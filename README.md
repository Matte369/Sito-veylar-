# VEYLAR — Energy, Reimagined

Landing page for VEYLAR (React + TypeScript + Vite + Tailwind CSS + lucide-react).

```bash
npm install
npm run dev      # http://localhost:5199
npm run build
```

## Brand assets (place in `public/`)

| File | Purpose |
| --- | --- |
| `veylar-logo.png` | Official metallic silver VEYLAR logo (transparent background). Shown in the navbar. |
| `founder-matteo-carminati.jpg` | Real portrait of Matteo Carminati for the founder card. |
| `hero-poster.jpg` *(optional)* | Poster frame shown while the hero video loads. |

Until the logo and portrait are added, the page shows a neutral placeholder in their place.
The hero video streams from the original CloudFront URL (see `src/config.ts`).

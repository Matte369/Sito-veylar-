# VEYLAR - Energy, Reimagined

Landing page for VEYLAR, built with React, TypeScript, Vite, Tailwind CSS, Three.js and lucide-react.

The page opens on a 3D concept car in a light studio. As you scroll, the body lifts away, the car turns
and each part of the platform separates and is labelled: battery and electric drive, onboard hydrogen
generation from bioethanol and water, fuel cell, and power management with animated energy flow.

```bash
npm install
npm run dev      # http://localhost:5199
npm run build
```

## Structure

- `src/three/car.ts` builds the illustrative car and its components (generic housings only).
- `src/three/stage.ts` holds the scroll timeline, chapters, camera, highlights and energy flow.
- `src/components/ExplodedStage.tsx` pins the 3D stage and syncs copy, labels and the chapter rail.
- `src/components/Roadmap.tsx`, `Founder.tsx`, `Footer.tsx` follow the stage.

## Brand assets (place in `public/`)

| File | Purpose |
| --- | --- |
| `veylar-logo.png` | Official VEYLAR logo (transparent background), shown in the navbar and footer. |
| `founder-matteo-carminati.jpg` | Portrait of Matteo Carminati for the founder section. |

Until these are added, a plain wordmark and a monogram hold their place.

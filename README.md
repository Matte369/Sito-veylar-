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

Home page, in order: 3D exploded view (`ExplodedStage`), validated figures (`Figures`), refuelling
points and running cost (`Refuel`), savings calculator (`Savings`), mission (`Mission`), roadmap,
team, FAQ and a support band. Two dedicated pages use hash routes: `#support` and `#contact`.

- `src/three/car.ts` builds the illustrative car and its components (generic housings only).
- `src/three/stage.ts` holds the scroll timeline, chapters, camera, studio lighting and energy flow.
- `src/content.ts` holds the team, the figures and the FAQ.
- `src/config.ts` holds the email, crowdfunding link, form endpoint and cost per 100 km.

## Things to fill in

- **Crowdfunding link:** set `CROWDFUNDING_URL` in `src/config.ts`. Until then the donate button shows "coming soon".
- **Mechanical engineer:** add the name in `src/content.ts`.
- **Contact form:** messages are delivered by FormSubmit to the address in `src/config.ts`. The first
  message sent from the live site triggers a one-time activation email to that inbox; click the link in it
  and every later message arrives directly.

## Brand assets (place in `public/`)

| File | Purpose |
| --- | --- |
| `veylar-logo.png` | Official VEYLAR logo (transparent background), navbar and footer. |
| `team/matteo-carminati.jpg` | Portrait of Matteo Carminati. |
| `team/david-carminati.jpg` | Portrait of David Carminati. |
| `team/mechanical-engineer.jpg` | Portrait of the mechanical engineer. |

Until these are added, a plain wordmark and monograms hold their place.

# Environmental Risk Dashboard

Static HTML/CSS recreation of the Juice Lab analytics dashboard shots — the app screen only, fully responsive.

- `index.html` — both screens on one page. `#overview` (default) is *Environmental Risk Overview*, `#map` is *World Risk Map*; the first two sidebar buttons switch between them.
- `styles.css` — fluid grid layout. At 1800px wide it matches the mockups; it reflows at 1500px, 1400px, 1100px and 760px (phone layout with a bottom tab bar).
- `charts.js` — draws the sparklines, dot matrix, trend lines and bar charts as SVG (data traced from the mockups), switches views, and keeps the map popup locked to the map artwork as it scales.
- `assets/` — raster pieces cut from the mockups (3D relief maps, avatar, insight orb, globe).
- `mockups/` — the reference shots.

Open `index.html` in a browser; there is no build step.

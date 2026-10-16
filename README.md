# Environmental Risk Dashboard

Recreation of the Juice Lab analytics dashboard: the app screen only, fully responsive, with a live map and data-driven charts. Open `index.html` in a browser; there is no build step and nothing loads from a CDN except Google Fonts.

## Changing what's shown

| What | Where |
| --- | --- |
| Map colours, regions, raised regions, markers, terrain strength, view extents | `data/map-config.js` |
| Chart data (KPI sparklines, risk exposure, trend series, distribution, score) | `data/dashboard-data.js` |
| Chart colours per risk level / type | top of `charts.js` (`LEVEL`, `TYPE`) |

Regions list countries by ISO 3166-1 numeric id (as used by world-atlas) or by name. Set `raised: true` to lift a region off the map with its own shadow and glow.

## How it works

- `map.js` draws each map on a canvas: Natural Earth 1:50m country shapes (world-atlas) in a Miller projection, coloured from the config, with real terrain from a Natural Earth shaded-relief texture blended in. Markers are positioned from lat/lon. The overview map zooms (+/−, reset) and pans by dragging. Everything redraws on resize.
- `charts.js` renders every chart with D3 from the data file, with real scales and hover tooltips, and redraws when its container changes size.
- `styles.css` is a fluid grid that matches the mockups at 1800px and reflows at 1500, 1400, 1100 and 760px (phone layout with a bottom tab bar).

## Files

- `vendor/` — D3 7.9.0 and topojson-client 3.1.0 (from npm, with licences).
- `data/countries-50m.js` — world-atlas 2.0.2 countries (Natural Earth, public domain) wrapped as a script so the page works from `file://`.
- `assets/relief.jpg` — terrain shading derived from Natural Earth shaded relief (public domain): the hypsometric tint is removed, leaving only light and shadow so colours can come from code.
- `assets/` also holds the avatar, globe icon and insight orb cut from the mockups.
- `mockups/` — the reference shots.

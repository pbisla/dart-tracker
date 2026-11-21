# DART Rail Tracker

A static, browser-based React app that shows a schematic DART rail map with **simulated** train
positions for the Red, Blue, Green, Orange and Silver lines. It uses bundled station/route data and
the browser clock — no API key, backend, or live feed is required.

> This is an illustrative simulation, **not** live DART tracking, a journey planner, or an official
> DART product. Stop times are estimates and the map is not to scale.

## Run locally

Requires Node.js 18+ (tested with Node 22).

```bash
cd dart-tracker
npm install
npm run dev
```

Open the URL printed by Vite (usually <http://localhost:5173>).

## Production build

```bash
npm run build
npm run preview
```

The build output in `dist/` is plain static HTML/CSS/JS. Vite is configured with `base: './'`, so
`dist/` can be copied to any static host or opened behind any path.

## What you can do

- Watch a highlighted train advance from its current position using route speed and direction, with a heading trail and live segment progress.
- Click any train on the map to follow it; use **Animate train** for fast, obvious motion.
- Switch between live Central Time and a manual clock.
- Scrub the time of day, change speed, pause, and toggle weekday/weekend service.
- Show/hide individual lines.
- Click a station to see the next simulated arrivals and a timetable grouped by direction.
- Switch between **Schematic** and **Streets** views; Streets uses OpenStreetMap road tiles.
- Shared corridors are drawn as side-by-side parallel tracks in the schematic view.
- Scroll or pinch to zoom and drag to pan the map; **+ / −** buttons are available on touch devices. Use **Reset view** to return to the full system.

## Data and assumptions

- Station names and line termini follow public DART system-map/Wikipedia references (best-effort
  static snapshot).
- Silver Line station order: DFW Airport Terminal B → DFW Airport North → Cypress Waters → Downtown
  Carrollton → Addison → Knoll Trail → UT Dallas → CityLine/Bush → 12th Street → Shiloh Road.
- The Silver Line opened on October 25, 2025; this app includes it as a first-class route.
- Service windows and headways are approximate: light rail ~20–30 minute peak/off-peak frequencies;
  Silver Line 30 minute peak / 60 minute off-peak on weekdays, hourly on weekends.
- Run times are estimated from stop counts (Silver Line ~55 minutes end to end).

Sources used for reference:

- <https://en.wikipedia.org/wiki/DART_Light_Rail>
- <https://en.wikipedia.org/wiki/Silver_Line_(DART)>
- Individual DART line articles on Wikipedia
- Station coordinates from OpenStreetMap via the Overpass API; road tiles © OpenStreetMap contributors

## Project layout

```text
src/
  data/         static stations, lines and service patterns
  lib/          time, geometry and simulation helpers (pure functions)
  components/   SVG map, clock controls and sidebar
  App.tsx       application state and layout
```

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.

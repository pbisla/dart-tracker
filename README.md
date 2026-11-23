# DART Rail Tracker

A static, browser-based React app that shows a schematic DART rail map for the Red, Blue, Green,
Orange and Silver lines. Train positions are **simulated by interpolating between real scheduled
stops** from DART's static GTFS feed. No API key, backend, or live feed is required.

> This is not live DART tracking, a journey planner, or an official DART product. Train positions are
> illustrative, even though stop times come from the timetable. The schematic map is not to scale.

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

- Stop times, trip patterns, destinations and service spans come from the DART static GTFS feed in
  the Mobility Database (`mdb-152`, feed `V761-218-220-20261115`). One representative weekday and one
  representative weekend service are bundled.
- Station/route mapping and schematic coordinates remain hand-authored. The importer validates every
  rail stop ID, checks stops are within 0.3 miles of their mapped station, and rejects invalid trip
  paths before writing data.
- The feed has more trip patterns than the drawn map: some Blue/Orange/Red trips branch to Fair Park
  or Lawnview. Those trips are kept and drawn through the existing station coordinates.
- Some routes do not serve every drawn station on every day (for example, no weekend Orange service
  north of LBJ/Central in this feed). The app follows the timetable rather than inventing trains.
- Silver Line station order: DFW Airport Terminal B → DFW Airport North → Cypress Waters → Downtown
  Carrollton → Addison → Knoll Trail → UT Dallas → CityLine/Bush → 12th Street → Shiloh Road.
- Road tiles © OpenStreetMap contributors.

### Refreshing the static data

Requires Python 3. The generated file is committed, so normal builds need no network access.

```bash
npm run import:gtfs
# or, to validate a specific feed:
python3 scripts/import_gtfs.py /path/to/google_transit.zip
```

Sources used for reference:

- <https://mobilitydatabase.org/feeds/mdb-152>
- <https://www.dart.org/transitdata/>
- <https://en.wikipedia.org/wiki/DART_Light_Rail>
- <https://en.wikipedia.org/wiki/Silver_Line_(DART)>
- Station coordinates originally sourced from OpenStreetMap via the Overpass API

## Project layout

```text
src/
  data/         hand-authored stations/routes plus generated GTFS schedules
  lib/          time, geometry and schedule-driven simulation helpers
  components/   SVG map, street map, clock controls and sidebar
  App.tsx       application state and layout
scripts/
  import_gtfs.py  validates and regenerates src/data/gtfsSchedule.ts
```

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.

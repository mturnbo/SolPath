# SolPath

A constant-thrust spacecraft trajectory planner for the solar system. Choose a destination planet, set your acceleration, pick a departure date, and SolPath computes your brachistochrone flight path with accurate planetary positions and relativistic travel time corrections.

## Features

- Heliocentric solar system rendered on an interactive canvas
- Keplerian orbital mechanics — planetary positions accurate for any date
- Brachistochrone ("flip-and-burn") trajectory solver
- Relativistic ship-time correction at high delta-v
- Acceleration range: 0.5 g – 2 g, max speed capped at 10% c
- Zoom, pan, and date scrubbing
- Spacecraft animation along computed path
- Comparison mode for multiple acceleration profiles

## Tech Stack

Plain HTML, CSS, and vanilla JavaScript (ES modules). No build step, no framework, no dependencies.

## Running Locally

```
git clone git@github.com:mturnbo/SolPath.git
cd SolPath
npx serve .          # or any static file server
```

Then open `http://localhost:3000` in a browser.

## Project Structure

```
SolPath/
├── index.html
├── README.md
└── src/
    ├── css/
    │   ├── reset.css       # CSS reset
    │   └── main.css        # App layout and design tokens
    └── js/
        ├── main.js         # Entry point, canvas bootstrap
        ├── data/
        │   └── planets.js  # Keplerian orbital elements
        ├── physics/
        │   ├── kepler.js   # Orbital position solver
        │   ├── epoch.js    # Julian date / J2000 utilities
        │   └── trajectory.js # Brachistochrone + relativistic solver
        ├── render/
        │   ├── camera.js   # World↔screen transform, zoom/pan
        │   ├── orbits.js   # Orbit ellipse renderer
        │   └── planets.js  # Planet dot + label renderer
        └── ui/
            └── panel.js    # Mission control panel
```

## Physics

**Brachistochrone trajectory** — the spacecraft accelerates at constant thrust for the first half of the journey, flips 180°, and decelerates for the second half. This minimises travel time for a given acceleration.

```
t_half = sqrt(2 * (d/2) / a)
total_time = 2 * t_half
```

**Relativistic ship time** — at high speeds the crew experiences less time than ground observers. At 10% c the correction is small (~0.5%) but included:

```
τ = (2c/a) × acosh(a × t_half / c + 1)
```

**Planetary positions** — computed from Keplerian orbital elements referenced to the J2000 epoch, with secular rates applied for each element. Accurate to within ~1° for visualization purposes across several centuries.

## PR Roadmap

| PR | Description |
|----|-------------|
| 1  | Project scaffold, README |
| 2  | Orbital element data |
| 3  | Kepler equation solver |
| 4  | Date/epoch utilities |
| 5  | Canvas coordinate system |
| 6  | Orbit rendering |
| 7  | Planet rendering |
| 8  | Date picker + live positions |
| 9  | Zoom and pan |
| 10 | Brachistochrone solver |
| 11 | Relativistic corrections |
| 12 | Departure/arrival planet state |
| 13 | Trajectory rendering |
| 14 | Mission control panel |
| 15 | Mission info display |
| 16 | Spacecraft animator |
| 17 | Arrival planet overlay |
| 18 | Comparison mode |
| 19 | Mobile layout |
| 20 | Performance pass |

## License

MIT

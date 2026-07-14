 # Changelog

All notable changes to SolPath will be documented here.

---

## [Unreleased]

### PR 21 — Comparison mode cleanup
- Remove unused comparison overlay
- Simplify mission computation

### PR 20 — Performance pass
- RequestAnimationFrame render loop with dirty-flag redraws
- Canvas DPR scaling for retina displays
- Only repaint when state changes

### PR 19 — Mobile layout
- Responsive layout: panel collapses below canvas on small screens
- Touch-friendly slider and controls

### PR 18 — Comparison mode
- Select multiple acceleration values simultaneously
- Draw all trajectories in different colors with a legend

### PR 17 — Arrival planet overlay
- Flash destination planet position at arrival vs. current position
- Shows how far the planet has moved during the journey

### PR 16 — Spacecraft animator
- Animate a dot traveling along the trajectory path
- Play / pause / reset controls
- Speed proportional to elapsed mission time

### PR 15 — Mission info display
- Flight time (coordinate time + ship time)
- Max speed as % of c
- Delta-v budget
- Flip point distance
- Arrival date

### PR 14 — Mission control panel
- Side panel: destination dropdown, departure date, acceleration slider (0.5–2 g)
- Triggers trajectory computation on change

### PR 13 — Trajectory rendering
- Draw departure → arrival line on canvas
- Mark the flip point (midpoint)
- Dashed style for deceleration leg

### PR 12 — Departure/arrival planet state
- Compute arrival planet position given departure date and flight time
- Return both positions and the straight-line path vector

### PR 11 — Relativistic corrections
- `shipTime(coordTime, accelG)` using hyperbolic motion equations
- Side-by-side display of coordinate vs. ship time

### PR 10 — Brachistochrone solver
- `flightTime(distAU, accelG)` returning coordinate time and flip distance
- Pure math module, no rendering dependencies

### PR 9 — Zoom and pan
- Mouse wheel zoom, click-drag pan
- Zoom-to-fit-solar-system button
- Touch support for pinch-zoom

### PR 8 — Date picker + live positions
- Date `<input>` wired to recompute and redraw all planet positions
- Forward/backward step buttons (day, month, year)

### PR 7 — Planet rendering
- Draw planet dots at computed positions
- Labels per planet
- Hover hit-testing to identify planet under cursor

### PR 6 — Orbit rendering
- Draw each planet's elliptical orbit as a polyline on canvas
- Color-coded orbits, correctly scaled

### PR 5 — Canvas coordinate system
- World-to-screen transform
- Zoom level and pan offset state
- `worldToScreen()` and `screenToWorld()` helper functions

### PR 4 — Date/epoch utilities
- Julian date conversion
- J2000 offset calculation
- Century-based rate corrections for slowly-varying orbital elements

### PR 3 — Kepler equation solver
- Iterative solver for eccentric anomaly
- Convert eccentric anomaly to true anomaly
- Heliocentric XY coordinates from orbital elements

---

## [0.1.0] — 2026-06-30

### PR 2 — Orbital element data
- `src/js/data/planets.js`: Keplerian elements for Mercury through Pluto + Sol
- Secular rates per Julian century from J2000.0 (JPL source)
- Visual properties per body: color, radius

### PR 1 — Project scaffold
- HTML shell with header, canvas, and control panel slots
- CSS reset and dark-theme design tokens
- Canvas bootstrap with DPR scaling
- README with project overview, physics summary, and PR roadmap

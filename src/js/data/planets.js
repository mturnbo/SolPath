/**
 * Keplerian orbital elements for the 8 planets + Pluto, referenced to the
 * J2000.0 epoch (2000-Jan-1.5 TT).
 *
 * Each entry contains:
 *   a    — semi-major axis (AU)
 *   e    — eccentricity
 *   i    — inclination (degrees)
 *   L    — mean longitude (degrees)
 *   lp   — longitude of perihelion (degrees)  ω̃ = Ω + ω
 *   lan  — longitude of ascending node (degrees)
 *
 * Each element also has a corresponding rate field (suffix "Rate") giving the
 * change per Julian century (36525 days) from J2000. These secular rates come
 * from the JPL "Keplerian Elements for Approximate Positions of the Major
 * Planets" table (E.M. Standish, 1992; updated 2001).
 *
 * Accuracy: positions within ~1–2° for dates within a few centuries of J2000.
 * Sufficient for visualization; not suitable for spacecraft navigation.
 *
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html (Table 1)
 */

export const PLANETS = [
  {
    name: 'Mercury',
    color: '#b5b5b5',
    radiusPx: 3,
    a:    0.38709927,  aRate:   0.00000037,
    e:    0.20563593,  eRate:   0.00001906,
    i:    7.00497902,  iRate:  -0.00594749,
    L:  252.25032350,  LRate: 149472.67411175,
    lp:  77.45779628,  lpRate:  0.16047689,
    lan:  48.33076593, lanRate: -0.12534081,
  },
  {
    name: 'Venus',
    color: '#e8cda0',
    radiusPx: 4,
    a:    0.72333566,  aRate:   0.00000390,
    e:    0.00677672,  eRate:  -0.00004107,
    i:    3.39467605,  iRate:  -0.00078890,
    L:  181.97909950,  LRate: 58517.81538729,
    lp:  131.60246718, lpRate:  0.00268329,
    lan:  76.67984255, lanRate: -0.27769418,
  },
  {
    name: 'Earth',
    color: '#4fa3e0',
    radiusPx: 4,
    a:    1.00000261,  aRate:   0.00000562,
    e:    0.01671123,  eRate:  -0.00004392,
    i:   -0.00001531,  iRate:  -0.01294668,
    L:  100.46457166,  LRate: 35999.37244981,
    lp:  102.93768193, lpRate:  0.32327364,
    lan:    0.0,       lanRate:  0.0,
  },
  {
    name: 'Mars',
    color: '#c1440e',
    radiusPx: 3,
    a:    1.52371034,  aRate:   0.00001847,
    e:    0.09339410,  eRate:   0.00007882,
    i:    1.84969142,  iRate:  -0.00813131,
    L:   -4.55343205,  LRate: 19140.30268499,
    lp:  -23.94362959, lpRate:  0.44441088,
    lan:  49.55953891, lanRate: -0.29257343,
  },
  {
    name: 'Jupiter',
    color: '#c88b3a',
    radiusPx: 7,
    a:    5.20288700,  aRate:  -0.00011607,
    e:    0.04838624,  eRate:  -0.00013253,
    i:    1.30439695,  iRate:  -0.00183714,
    L:   34.39644051,  LRate:  3034.74612775,
    lp:   14.72847983, lpRate:  0.21252668,
    lan: 100.47390909, lanRate:  0.20469106,
  },
  {
    name: 'Saturn',
    color: '#e4d191',
    radiusPx: 6,
    a:    9.53667594,  aRate:  -0.00125060,
    e:    0.05386179,  eRate:  -0.00050991,
    i:    2.48599187,  iRate:   0.00193609,
    L:   49.95424423,  LRate:  1222.49362201,
    lp:   92.59887831, lpRate: -0.41897216,
    lan: 113.66242448, lanRate: -0.28867794,
  },
  {
    name: 'Uranus',
    color: '#7de8e8',
    radiusPx: 5,
    a:   19.18916464,  aRate:  -0.00196176,
    e:    0.04725744,  eRate:  -0.00004397,
    i:    0.77263783,  iRate:  -0.00242939,
    L:  313.23810451,  LRate:   428.48202785,
    lp:  170.95427630, lpRate:  0.40805281,
    lan:  74.01692503, lanRate:  0.04240589,
  },
  {
    name: 'Neptune',
    color: '#5b7fde',
    radiusPx: 5,
    a:   30.06992276,  aRate:   0.00026291,
    e:    0.00859048,  eRate:   0.00005105,
    i:    1.77004347,  iRate:   0.00035372,
    L:  -55.12002969,  LRate:   218.45945325,
    lp:   44.96476227, lpRate:  -0.32241464,
    lan: 131.78422574, lanRate: -0.00508664,
  },
  {
    name: 'Pluto',
    color: '#a09080',
    radiusPx: 2,
    a:   39.48211675,  aRate:  -0.00031596,
    e:    0.24882730,  eRate:   0.00005170,
    i:   17.14001206,  iRate:   0.00004818,
    L:  238.92903833,  LRate:   145.20780515,
    lp:  224.06891629, lpRate:  -0.04062942,
    lan: 110.30393684, lanRate: -0.01183482,
  },
];

/**
 * Star — fixed at the origin, included here for rendering convenience.
 */
export const STAR = {
  name: 'Sol',
  color: '#ffe066',
  radiusPx: 10,
};

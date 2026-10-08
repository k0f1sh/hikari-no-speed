export interface CelestialBody {
  name: string;
  ja: string;
  diameter: number;
  distanceFromSun: number;
  color: number;
  source: string;
  orbit?: { parent: string; distance: number };
}
const EARTH_DISTANCE_FROM_SUN = 149598000;
const MOON_DISTANCE_FROM_EARTH = 384400;
// Checked 2026-10-08 against NASA NSSDCA individual Fact Sheets.
// Diameters = 2 × "Volumetric mean radius (km)", without additional rounding.
// Planet distances = "Orbital parameters / Semimajor axis (10^6 km)" × 1,000,000.
// These representative values are not current positions or the J2000 elements
// listed separately on the same pages. All stored lengths are in km.
export const DATA_CHECKED_ON = '2026-10-08';
const FACT_SHEETS = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';
export const celestialBodies: CelestialBody[] = [
  {
    name: 'Sun',
    ja: '太陽',
    diameter: 1391400,
    distanceFromSun: 0,
    color: 0xffd387,
    source: FACT_SHEETS + 'sunfact.html',
  },
  {
    name: 'Mercury',
    ja: '水星',
    diameter: 4879.4,
    distanceFromSun: 57909000,
    color: 0xa49b8d,
    source: FACT_SHEETS + 'mercuryfact.html',
  },
  {
    name: 'Venus',
    ja: '金星',
    diameter: 12103.6,
    distanceFromSun: 108210000,
    color: 0xd5b67c,
    source: FACT_SHEETS + 'venusfact.html',
  },
  {
    name: 'Earth',
    ja: '地球',
    diameter: 12742,
    distanceFromSun: EARTH_DISTANCE_FROM_SUN,
    color: 0x5596bd,
    source: FACT_SHEETS + 'earthfact.html',
  },
  {
    name: 'Mars',
    ja: '火星',
    diameter: 6779,
    distanceFromSun: 227956000,
    color: 0xbe7050,
    source: FACT_SHEETS + 'marsfact.html',
  },
  {
    name: 'Jupiter',
    ja: '木星',
    diameter: 139822,
    distanceFromSun: 778479000,
    color: 0xc9af92,
    source: FACT_SHEETS + 'jupiterfact.html',
  },
  {
    name: 'Saturn',
    ja: '土星',
    diameter: 116464,
    distanceFromSun: 1432041000,
    color: 0xd5c499,
    source: FACT_SHEETS + 'saturnfact.html',
  },
  {
    name: 'Uranus',
    ja: '天王星',
    diameter: 50724,
    distanceFromSun: 2867043000,
    color: 0x91c6cd,
    source: FACT_SHEETS + 'uranusfact.html',
  },
  {
    name: 'Neptune',
    ja: '海王星',
    diameter: 49244,
    distanceFromSun: 4514953000,
    color: 0x4d70c5,
    source: FACT_SHEETS + 'neptunefact.html',
  },
  // Moon's solar distance is derived from our fixed +Z placement.
  {
    name: 'Moon',
    ja: '月',
    diameter: 3474.8,
    distanceFromSun: Math.hypot(EARTH_DISTANCE_FROM_SUN, MOON_DISTANCE_FROM_EARTH),
    color: 0xb7b9bb,
    source: FACT_SHEETS + 'moonfact.html',
    orbit: { parent: 'Earth', distance: MOON_DISTANCE_FROM_EARTH },
  },
];
// Exact SI speed of light converted from m/s to km/s.
// https://www.bipm.org/en/si-base-units/metre
export const LIGHT_SPEED = 299792.458;

export function bodyIndex(name: string): number {
  const index = celestialBodies.findIndex((body) => body.name === name);
  if (index < 0) throw new Error('Unknown celestial body: ' + name);
  return index;
}

export function bodyByName(name: string): CelestialBody {
  return celestialBodies[bodyIndex(name)];
}

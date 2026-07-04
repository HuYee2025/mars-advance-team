import * as THREE from "three";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const UNIX_EPOCH_JULIAN_DATE = 2440587.5;
const J2000_JULIAN_DATE = 2451545.0;
const TT_MINUS_UTC_SECONDS = 69.184;
const MARS_SOL_EARTH_DAYS = 1.0274912517;
const MARS_SOL_DATE_EPOCH = 2405522.0028779;
const MARS_SEMI_MAJOR_AXIS_AU = 1.52367934;

const PBS_TERMS = [
  { a: 0.0071, tau: 2.2353, phi: 49.409 },
  { a: 0.0057, tau: 2.7543, phi: 168.173 },
  { a: 0.0039, tau: 1.1177, phi: 191.837 },
  { a: 0.0037, tau: 15.7866, phi: 21.736 },
  { a: 0.0021, tau: 2.1354, phi: 15.704 },
  { a: 0.002, tau: 2.4694, phi: 95.528 },
  { a: 0.0018, tau: 32.8493, phi: 49.095 },
] as const;

export type MarsSunState = {
  direction: THREE.Vector3;
  subsolarLatitudeDeg: number;
  subsolarLongitudeDeg: number;
  solarLongitudeDeg: number;
  marsSolDate: number;
  martianCoordinatedTimeHours: number;
  heliocentricDistanceAu: number;
  irradianceRatio: number;
};

export function computeMarsSunState(nowMs = Date.now()): MarsSunState {
  const jdUtc = nowMs / 86_400_000 + UNIX_EPOCH_JULIAN_DATE;
  const jdTt = jdUtc + TT_MINUS_UTC_SECONDS / 86_400;
  const deltaJ2000 = jdTt - J2000_JULIAN_DATE;

  const meanAnomalyDeg = wrapDegrees(19.3871 + 0.52402073 * deltaJ2000);
  const meanAnomalyRad = meanAnomalyDeg * DEG_TO_RAD;
  const fictionMeanSunDeg = wrapDegrees(270.3871 + 0.524038496 * deltaJ2000);
  const pbs = PBS_TERMS.reduce(
    (sum, term) => sum + term.a * Math.cos(((0.985626 * deltaJ2000) / term.tau + term.phi) * DEG_TO_RAD),
    0,
  );
  const equationOfCenterDeg =
    (10.691 + 3.0e-7 * deltaJ2000) * Math.sin(meanAnomalyRad) +
    0.623 * Math.sin(2 * meanAnomalyRad) +
    0.05 * Math.sin(3 * meanAnomalyRad) +
    0.005 * Math.sin(4 * meanAnomalyRad) +
    0.0005 * Math.sin(5 * meanAnomalyRad) +
    pbs;
  const solarLongitudeDeg = wrapDegrees(fictionMeanSunDeg + equationOfCenterDeg);
  const solarLongitudeRad = solarLongitudeDeg * DEG_TO_RAD;
  const equationOfTimeDeg =
    2.861 * Math.sin(2 * solarLongitudeRad) -
    0.071 * Math.sin(4 * solarLongitudeRad) +
    0.002 * Math.sin(6 * solarLongitudeRad) -
    equationOfCenterDeg;
  const equationOfTimeHours = equationOfTimeDeg / 15;
  const marsSolDate = (jdTt - MARS_SOL_DATE_EPOCH) / MARS_SOL_EARTH_DAYS;
  const martianCoordinatedTimeHours = fractionalPart(marsSolDate) * 24;
  const subsolarLongitudeDeg = normalizeLongitude((12 - martianCoordinatedTimeHours - equationOfTimeHours) * 15);
  const subsolarLatitudeDeg =
    Math.asin(0.42565 * Math.sin(solarLongitudeRad)) * RAD_TO_DEG +
    0.25 * Math.sin(solarLongitudeRad);
  const heliocentricDistanceAu =
    MARS_SEMI_MAJOR_AXIS_AU *
    (1.00436 -
      0.09309 * Math.cos(meanAnomalyRad) -
      0.004336 * Math.cos(2 * meanAnomalyRad) -
      0.00031 * Math.cos(3 * meanAnomalyRad) -
      0.00003 * Math.cos(4 * meanAnomalyRad));
  const direction = normalFromLonLat(subsolarLongitudeDeg, subsolarLatitudeDeg);
  return {
    direction,
    subsolarLatitudeDeg,
    subsolarLongitudeDeg,
    solarLongitudeDeg,
    marsSolDate,
    martianCoordinatedTimeHours,
    heliocentricDistanceAu,
    irradianceRatio: 1 / (heliocentricDistanceAu * heliocentricDistanceAu),
  };
}

function normalFromLonLat(lonDegrees: number, latDegrees: number) {
  const lon = lonDegrees * DEG_TO_RAD;
  const lat = latDegrees * DEG_TO_RAD;
  return new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).normalize();
}

function fractionalPart(value: number) {
  return ((value % 1) + 1) % 1;
}

function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function normalizeLongitude(value: number) {
  const wrapped = wrapDegrees(value);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

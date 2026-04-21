// Test suite for coords.html.
// Extracts the inline <script> from coords.html so the tests always exercise
// the live code. Run with: `node --test test.js` (or `npm test`).

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

// ---------- Load the coords.html script into a testable module ----------

function loadCoordsModule() {
  const html = fs.readFileSync(path.join(__dirname, 'coords.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('coords.html: no <script> block found');
  const src = match[1];

  // Minimal stubs so the script runs without a browser. The startup IIFE
  // touches document/window/navigator; we make all of it inert.
  const noop = () => {};
  const stubEl = {
    value: '', textContent: '', innerHTML: '', dataset: {}, style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, setAttribute: noop, focus: noop, appendChild: noop,
  };
  const ctx = {
    document: {
      getElementById: () => stubEl,
      querySelector: () => stubEl,
      querySelectorAll: () => [],
      createElement: () => ({ ...stubEl, style: {} }),
    },
    window: { isSecureContext: false, self: 1, top: 1 },
    navigator: { geolocation: null },
    location: { protocol: 'file:' },
  };

  const exports = [
    'latLonToUTM', 'utmToLatLon', 'latBand', 'bandMinLat',
    'utmToMGRS', 'mgrsToUTM',
    'latLonToECEF', 'ecefToLatLon',
    'encodeGeohash', 'decodeGeohash',
    'encodeOLC', 'decodeOLC',
    'parseGeoURI',
    'fmtDD', 'fmtDDM', 'fmtDMS', 'fmtUTM', 'fmtGeoURI', 'fmtECEF',
    'parseDD', 'parseLatLonPair', 'parseUTM', 'parseECEF',
  ];
  const factory = new Function(
    'document', 'window', 'navigator', 'location',
    src + '\nreturn { ' + exports.join(', ') + ' };'
  );
  return factory(ctx.document, ctx.window, ctx.navigator, ctx.location);
}

const C = loadCoordsModule();

// ---------- Test fixtures ----------

const points = [
  { name: 'Seattle',         lat:  47.6062, lon: -122.3321 },
  { name: 'Oslo',            lat:  59.9139, lon:   10.7522 },
  { name: 'Torres del Paine',lat: -50.9423, lon:  -72.7011 },
  { name: 'White House',     lat:  38.8977, lon:  -77.0365 },
  { name: 'Null Island',     lat:   0.0,    lon:    0.0    },
  { name: 'mid-Pacific eq.', lat:   0.5,    lon: -150.0    },
  { name: 'Sydney',          lat: -33.8688, lon:  151.2093 },
  { name: 'Cape Town',       lat: -33.9249, lon:   18.4241 },
  { name: 'Tokyo',           lat:  35.6762, lon:  139.6503 },
  { name: 'Buenos Aires',    lat: -34.6037, lon:  -58.3816 },
];

// Round-trip tolerances, in degrees, sized per format's expected precision.
const TOL = {
  dd:   1e-5,   // DD formatted at 6dp → ~1.1m at equator
  ddm:  2e-5,   // minutes at 3dp → ~1.8m
  dms:  1e-5,   // seconds at 2dp → ~30cm
  utm:  2e-5,   // easting/northing rounded to 1m → ~1m
  mgrs: 2e-5,   // same rounding as UTM
  ecef: 1e-7,   // cm display precision, Bowring near-surface error negligible
  geo:  1e-6,   // same DD at 6dp
  plus: 1e-3,   // 10-digit cell ≈ 14m ≈ 1.3e-4 deg; decoded point is cell center
  hash: 1e-4,   // 10-char cell ≈ sub-meter; extra slop for cell-center offset
};

const FMT_COUNT = 9;  // dd, ddm, dms, utm, mgrs, ecef, geo, plus, hash

// Produce each of the 9 roundtripped lat/lon pairs from a starting (lat, lon).
function roundtripAll(lat, lon) {
  const utm = C.latLonToUTM(lat, lon);
  const utmFromStr = C.parseUTM(C.fmtUTM(utm));
  const mgrsUtm = C.mgrsToUTM(C.utmToMGRS(utm));
  return {
    dd:   C.parseDD(C.fmtDD(lat, lon)),
    ddm:  C.parseLatLonPair(C.fmtDDM(lat, lon)),
    dms:  C.parseLatLonPair(C.fmtDMS(lat, lon)),
    utm:  C.utmToLatLon(utmFromStr.zone, utmFromStr.hemisphere, utmFromStr.easting, utmFromStr.northing),
    mgrs: C.utmToLatLon(mgrsUtm.zone, mgrsUtm.hemisphere, mgrsUtm.easting, mgrsUtm.northing),
    ecef: C.parseECEF(C.fmtECEF(lat, lon)),
    geo:  C.parseGeoURI(C.fmtGeoURI(lat, lon)),
    plus: C.decodeOLC(C.encodeOLC(lat, lon)),
    hash: C.decodeGeohash(C.encodeGeohash(lat, lon)),
  };
}

// ---------- Per-format round-trip ----------

test('round-trip: each format → parse returns the original within tolerance', async (t) => {
  for (const pt of points) {
    await t.test(pt.name, () => {
      const rt = roundtripAll(pt.lat, pt.lon);
      for (const [fmt, recovered] of Object.entries(rt)) {
        const tol = TOL[fmt];
        const dLat = Math.abs(recovered.lat - pt.lat);
        const dLon = Math.abs(recovered.lon - pt.lon);
        assert.ok(dLat <= tol, `${fmt} lat: |Δ|=${dLat.toExponential(2)} > ${tol.toExponential(2)}`);
        assert.ok(dLon <= tol, `${fmt} lon: |Δ|=${dLon.toExponential(2)} > ${tol.toExponential(2)}`);
      }
    });
  }
});

// ---------- Cross-format equivalence ----------
// Every pair of formats, when round-tripped from the same starting point,
// should land within a tolerance dominated by the coarsest format (Plus Code).

test('cross-format: all 9 recovered points agree within the coarsest format\'s cell', async (t) => {
  const crossTol = 2 * TOL.plus;  // ~2.2e-3 deg (~250m) — bounded by Plus cell
  for (const pt of points) {
    await t.test(pt.name, () => {
      const rt = roundtripAll(pt.lat, pt.lon);
      const keys = Object.keys(rt);
      assert.equal(keys.length, FMT_COUNT, 'expected 9 formats');
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const a = keys[i], b = keys[j];
          const dLat = Math.abs(rt[a].lat - rt[b].lat);
          const dLon = Math.abs(rt[a].lon - rt[b].lon);
          assert.ok(dLat <= crossTol, `${a}↔${b} lat: |Δ|=${dLat.toExponential(2)}`);
          assert.ok(dLon <= crossTol, `${a}↔${b} lon: |Δ|=${dLon.toExponential(2)}`);
        }
      }
    });
  }
});

// ---------- Known reference values ----------

test('Seattle sits in UTM zone 10T', () => {
  const utm = C.latLonToUTM(47.6062, -122.3321);
  assert.equal(utm.zone, 10);
  assert.equal(utm.band, 'T');
  assert.equal(utm.hemisphere, 'N');
});

test('Seattle Plus Code starts with 84VV and is 11 chars incl separator', () => {
  const code = C.encodeOLC(47.6062, -122.3321);
  assert.ok(code.startsWith('84VV'), `got ${code}`);
  assert.equal(code.length, 11);
  assert.equal(code[8], '+');
});

test('Seattle Geohash starts with c2', () => {
  const hash = C.encodeGeohash(47.6062, -122.3321);
  assert.ok(hash.startsWith('c2'), `got ${hash}`);
  assert.equal(hash.length, 10);
});

test('Sydney is in UTM zone 56H', () => {
  const utm = C.latLonToUTM(-33.8688, 151.2093);
  assert.equal(utm.zone, 56);
  assert.equal(utm.band, 'H');
  assert.equal(utm.hemisphere, 'S');
});

test('Torres del Paine is in UTM zone 18F', () => {
  const utm = C.latLonToUTM(-50.9423, -72.7011);
  assert.equal(utm.zone, 18);
  assert.equal(utm.band, 'F');
  assert.equal(utm.hemisphere, 'S');
});

test('Null Island → ECEF vector points through prime meridian on the equator', () => {
  const { X, Y, Z } = C.latLonToECEF(0, 0);
  // a ≈ 6378137
  assert.ok(Math.abs(X - 6378137) < 1, `X should be ~a, got ${X}`);
  assert.ok(Math.abs(Y) < 1e-6, `Y should be ~0, got ${Y}`);
  assert.ok(Math.abs(Z) < 1e-6, `Z should be ~0, got ${Z}`);
});

// ---------- Parser flexibility ----------

test('parseDD accepts comma and space separators', () => {
  const a = C.parseDD('47.6062, -122.3321');
  const b = C.parseDD('47.6062 -122.3321');
  assert.equal(a.lat, b.lat);
  assert.equal(a.lon, b.lon);
});

test('parseLatLonPair round-trips DDM strings with symbols', () => {
  const { lat, lon } = C.parseLatLonPair("47° 36.372' N, 122° 19.926' W");
  assert.ok(Math.abs(lat - 47.6062) < 1e-4, `lat=${lat}`);
  assert.ok(Math.abs(lon - -122.3321) < 1e-4, `lon=${lon}`);
});

test('parseLatLonPair round-trips DMS strings with symbols', () => {
  const { lat, lon } = C.parseLatLonPair(`47° 36' 22.32" N, 122° 19' 55.56" W`);
  assert.ok(Math.abs(lat - 47.6062) < 1e-4, `lat=${lat}`);
  assert.ok(Math.abs(lon - -122.3321) < 1e-4, `lon=${lon}`);
});

test('parseUTM accepts hemisphere/band letter with whitespace (regression)', () => {
  // This form was broken before the parseUTM unit-stripping fix — the old
  // [,MEN] replace ate the letter. N is both a valid MGRS band (8°–16°N)
  // and a hemisphere designator; parseUTM treats it as band first, which
  // implies hemisphere N. Either interpretation yields the right lat/lon.
  const utm = C.parseUTM('10 N 550200 5273800');
  assert.equal(utm.zone, 10);
  assert.equal(utm.hemisphere, 'N');
  assert.equal(utm.easting, 550200);
  assert.equal(utm.northing, 5273800);
  // And it round-trips to Seattle's ballpark
  const ll = C.utmToLatLon(utm.zone, utm.hemisphere, utm.easting, utm.northing);
  assert.ok(Math.abs(ll.lat - 47.6) < 0.1, `lat=${ll.lat}`);
  assert.ok(Math.abs(ll.lon - -122.33) < 0.1, `lon=${ll.lon}`);
});

test('parseUTM strips mE / mN unit suffixes', () => {
  const utm = C.parseUTM('10T 550200mE 5273800mN');
  assert.equal(utm.zone, 10);
  assert.equal(utm.band, 'T');
  assert.equal(utm.easting, 550200);
  assert.equal(utm.northing, 5273800);
});

test('mgrsToUTM: accepts input with and without spaces', () => {
  const a = C.mgrsToUTM('10T ET 50200 73800');
  const b = C.mgrsToUTM('10TET5020073800');
  assert.equal(a.zone, b.zone);
  assert.equal(a.easting, b.easting);
  assert.equal(a.northing, b.northing);
});

test('decodeOLC: accepts code with and without the + separator', () => {
  const a = C.decodeOLC('84VVJM49+F5');
  const b = C.decodeOLC('84VVJM49F5');
  assert.equal(a.lat, b.lat);
  assert.equal(a.lon, b.lon);
});

test('decodeGeohash: case-insensitive', () => {
  const lower = C.decodeGeohash('c23nb62w2');
  const upper = C.decodeGeohash('C23NB62W2');
  assert.equal(lower.lat, upper.lat);
  assert.equal(lower.lon, upper.lon);
});

test('parseGeoURI: tolerates altitude and ;params', () => {
  const bare = C.parseGeoURI('geo:47.6062,-122.3321');
  const alt  = C.parseGeoURI('geo:47.6062,-122.3321,23.5');
  const params = C.parseGeoURI('geo:47.6062,-122.3321;crs=wgs84;u=10');
  const altParams = C.parseGeoURI('geo:47.6062,-122.3321,23.5;crs=wgs84');
  assert.equal(bare.lat, alt.lat);
  assert.equal(bare.lat, params.lat);
  assert.equal(bare.lat, altParams.lat);
});

// ---------- Error cases ----------

test('rejects invalid input', () => {
  assert.throws(() => C.parseDD('not coords'),            /DD/);
  assert.throws(() => C.parseDD('100, 0'),                /out of range/);
  assert.throws(() => C.parseDD('0, 181'),                /out of range/);
  assert.throws(() => C.parseUTM('61T 500000 5000000'),   /zone/);
  assert.throws(() => C.parseUTM('10I 500000 5000000'),   /band/);
  assert.throws(() => C.utmToLatLon(0, 'N', 500000, 0),   /zone/);
  assert.throws(() => C.parseGeoURI('47,-122'),           /geo:/);
  assert.throws(() => C.decodeOLC('SHORT'),               /Plus/);
  assert.throws(() => C.decodeOLC('84VVJM49+II'),         /character/);  // I is not in the OLC alphabet
  assert.throws(() => C.parseECEF('1 2 3'),               /Earth/);
  assert.throws(() => C.decodeGeohash('not-a-hash'),      /Geohash.*char/);
});

async function loadMapData() {
  const resp = await fetch("/assets/map/data.json");
  return resp.json();
}

// getCountry returns the country data for a given country name.
// the name should be the exact name as in the data.json file ("france", "germany").
async function getCountry(name) {
  const data = await loadMapData();
  return data[name]; // Return country data by name
}

function project(lon, lat) {
  const x = map(lon, -13, 24, 0, width);
  const y = map(lat, 56, 41, 0, height);
  return [x, y];
}

function drawFeature(feature) {
  const geom = feature.geometry;

  const drawRing = (ring) => {
    beginShape();
    ring.forEach(([lon, lat]) => {
      const [x, y] = project(lon, lat);
      vertex(x * 1.15 - 110, y * 1.15 - 50);
    });
    endShape(CLOSE);
  };

  if (geom.type === "Polygon") {
    geom.coordinates.forEach(drawRing);
  }

  if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach((p) => p.forEach(drawRing));
  }
}

function unproject(x, y) {
  // undo transformations, isotropic scaling (is ts ball) + translation
  const sx = (x + 110) / 1.15; // le math 🧮
  const sy = (y + 50) / 1.15;

  // undo map()
  const lon = map(sx, 0, width, -13, 24);
  const lat = map(sy, 0, height, 56, 41);

  return [lon, lat];
}

function pointInCountry(x, y, countryData) {
  const [lon, lat] = unproject(x, y);
  return d3.geoContains(countryData, [lon, lat]);
}

// pointInMap just checks if the given REAL (not virtual!!) x,y coords are in either country.
function pointInMap(x, y) {
  return pointInCountry(x, y, franceData) || pointInCountry(x, y, germanyData);
}

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

const cityData = [
  { name: "Paris", lon: 2.35, lat: 48.85, vp: 30, belongsTo: "france" },
  { name: "Lyon", lon: 4.84, lat: 45.76, vp: 15, belongsTo: "france" },
  { name: "Marseille", lon: 5.37, lat: 43.3, vp: 12, belongsTo: "france" },
  { name: "Bordeaux", lon: -0.58, lat: 44.84, vp: 12, belongsTo: "france" },
  { name: "Strasbourg", lon: 7.75, lat: 48.58, vp: 10, belongsTo: "france" },
  { name: "Lille", lon: 3.06, lat: 50.63, vp: 8, belongsTo: "france" },
  { name: "Brest", lon: -4.49, lat: 48.39, vp: 6, belongsTo: "france" },
  { name: "Nice", lon: 7.27, lat: 43.71, vp: 6, belongsTo: "france" },
  { name: "Berlin", lon: 13.4, lat: 52.52, vp: 30, belongsTo: "germany" },
  { name: "Munich", lon: 11.58, lat: 48.14, vp: 15, belongsTo: "germany" },
  { name: "Hamburg", lon: 10.0, lat: 53.55, vp: 15, belongsTo: "germany" },
  { name: "Cologne", lon: 6.96, lat: 50.94, vp: 12, belongsTo: "germany" },
  { name: "Frankfurt", lon: 8.68, lat: 50.11, vp: 10, belongsTo: "germany" },
  { name: "Dresden", lon: 13.74, lat: 51.05, vp: 10, belongsTo: "germany" },
  { name: "Stuttgart", lon: 9.18, lat: 48.78, vp: 8, belongsTo: "germany" },
  { name: "Nuremberg", lon: 11.08, lat: 49.45, vp: 6, belongsTo: "germany" },
];

function mapProject(lon, lat) {
  const [x, y] = project(lon, lat);
  return [x * 1.15 - 110, y * 1.15 - 50];
}

function setupVictoryPoints() {
  for (const c of cityData) {
    const [x, y] = mapProject(c.lon, c.lat);
    c.x = x;
    c.y = y;
  }
}

const cityControllers = {};

function armyPresenceNear(x, y, country) {
  let presence = 0;
  for (const u of units) {
    if (u.belongsTo !== country) continue;
    const d = Math.hypot(u.x - x, u.y - y);
    const r = 45 + Math.min(u.size / 60, 60);
    if (d < r) presence += u.size * (1 - d / r) * (0.6 + 0.4 * getUnitSupply(u));
  }
  return presence;
}

function controllerFor(city) {
  const enemy = city.belongsTo === "france" ? "germany" : "france";
  const own = armyPresenceNear(city.x, city.y, city.belongsTo);
  const opp = armyPresenceNear(city.x, city.y, enemy);
  if (own === 0 && opp === 0) return city.belongsTo;
  return opp >= own ? enemy : city.belongsTo;
}

function victoryPointIncomeFor(country) {
  let total = 0;
  for (const c of cityData) {
    if (controllerFor(c) === country) total += c.vp;
  }
  return total;
}

function baseIncome(roundNum) {
  return 35 + roundNum * 2;
}

function countryIncome(country, roundNum) {
  return Math.round((baseIncome(roundNum) + victoryPointIncomeFor(country)) * incomeMultiplierFor(country));
}

function logCityCaptures() {
  for (const c of cityData) {
    const previous = cityControllers[c.name];
    const current = controllerFor(c);
    if (previous && previous !== current) {
      const winner = current === playingAs ? "You" : countryName(current);
      rounds.log(`${winner} captured ${c.name}.`);
    }
    cityControllers[c.name] = current;
  }
}

function controllerColor(country) {
  if (country === "france") return [58, 95, 158];
  if (country === "germany") return [148, 62, 54];
  return [236, 182, 46];
}

function drawVictoryPoints() {
  push();
  textAlign(CENTER, CENTER);
  for (const c of cityData) {
    const controller = controllerFor(c);
    const col = controllerColor(controller);
    const [vx, vy] = vgrid(c.x, c.y);
    const captured = controller !== c.belongsTo;

    // soft halo
    fill(col[0], col[1], col[2], 40);
    noStroke();
    circle(vx, vy, 22);

    // city marker
    fill(col[0], col[1], col[2], 235);
    stroke(255, 255, 255, 210);
    strokeWeight(1.5);
    circle(vx, vy, 13);

    // victory point value
    fill(255);
    noStroke();
    textSize(9);
    textStyle(BOLD);
    text(c.vp, vx, vy + 0.5);

    // name
    fill(250, 250, 255);
    textSize(10);
    textStyle(BOLD);
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    text(c.name.toUpperCase(), vx, vy + 21);

    // enemy-held ring
    if (captured) {
      stroke(255, 40, 25);
      strokeWeight(2);
      noFill();
      circle(vx, vy, 28);
    }
  }
  pop();
  textAlign(LEFT, CENTER);
}
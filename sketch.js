const width = 1400;
const height = 800;
const vgrid_width = 1400;
const vgrid_height = 800;

let franceData = null;
let germanyData = null;
let playingAs = "france";

let debug = new URLSearchParams(window.location.search).get("debug") === "true";

let playingState = "playing"; // can be "playing", "won-capital", "lost-capital", "won-casualties", "lost-casualties"

// capitals in virtual grid coordinates
const capitals = {
  france: ["Paris", 544, 401],
  germany: ["Berlin", 1029, 160],
};
let capitalsUnderForeignOccupation = [];

const speedPixelConversion = 5.8;

const ordinalNumerals = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
];

let units = [];

let mouseClickHandler = function () {
  if (debug) {
    console.log("mouse clicked at", vgrid(mouseX, mouseY));
  }
};

let mouseObj = null;

let maximumFrameRate = 50;

let gameSystemsInitialized = false;
let selectedUnit = null;

let endScreenShown = false;

async function preload() {
  preloadFlags();
  franceData = await getCountry("france");
  germanyData = await getCountry("germany");
  mouseObj = new Mouse();
  mouseObj.preload();
  updateUnitsListUI();
}

function setup() {
  createCanvas(1367, 800);
  setupVictoryPoints();
  updateFocusPanelUI();
  updateFortPanelUI();
  updateArtilleryUI();
  updateDeployManpowerUI();

  // capital protection units that start in a hexagon around the capital
  for (const country in capitals) {
    const [capitalName, capitalX, capitalY] = capitals[country];
    const protectionRadius = 60;
    for (let i = 0; i < 6; i++) {
      const angle = (360 / 6) * i;
      const angleRad = (angle * Math.PI) / 180;

      const { width: w1, height: h1 } = getFlagDimensions(country, 1);

      const x = capitalX + protectionRadius * Math.sin(angleRad) - w1 / 2;
      const y = capitalY + protectionRadius * Math.cos(angleRad) - h1 / 2;
      units.push(
        new Unit(x, y, `${ordinalNumerals[i]} ${capitalName} Guard`, 3, 3000, 15, 8, 5, country),
      );
    }
  }
  updateUnitsListUI();
}

function draw() {
  frameRate(maximumFrameRate);
  noCursor();
  drawSea();
  if (franceData === null || germanyData === null) {
    // guarantee map data is loaded
    return;
  }
  if (!gameSystemsInitialized) {
    gameSystemsInitialized = true;
    setupMaginotLine();
  }
  drawCountries();
  drawCountryNames();
  drawOccupation();

  drawForts();
  units.forEach((unit) => unit.draw());
  drawCapitals();
  drawVictoryPoints();
  drawSupplyLines();
  drawArtillery();
  drawRoundBanner();
  drawResources();
  rounds.watchRound();
  mouseObj.draw();
  if (playingState !== "playing" && !endScreenShown) {
    showEndScreen();
  }
}

function showEndScreen() {
  endScreenShown = true;
  const card = document.getElementById("game-over-card");
  if (!card) return;

  const myUnits = units.filter((u) => u.belongsTo === playingAs);
  const mySize = myUnits.reduce((a, u) => a + u.size, 0);
  const myCas = playingAs === "france" ? french_casualties : german_casualties;
  const opCas = playingAs === "france" ? german_casualties : french_casualties;
  const roundNum = rounds.roundNumber;

  let outcome = "won";
  let title = "VICTORY";
  let text = "";
  const isWin = playingState.startsWith("won");
  outcome = isWin ? "won" : "lost";
  title = isWin ? "VICTORY" : "DEFEAT";
  switch (playingState) {
    case "won-capital":
      text = `The capital of ${countryName(opponent.playingas)} is under your flag. The enemy command has collapsed.`;
      break;
    case "lost-capital":
      text = `${countryName(opponent.playingas)} captured ${capitalOf(playingAs)}. The war is over.`;
      break;
    case "won-casualties":
      text = `You inflicted catastrophic casualties on ${countryName(opponent.playingas)}, forcing them to sue for peace.`;
      break;
    case "lost-casualties":
      text = `Your armies were bled white. ${countryName(opponent.playingas)} accepted your unconditional surrender.`;
      break;
    default:
      text = "";
  }

  card.className = `overlay-card ${outcome}`;
  card.innerHTML = `
    <p class="ribbon">${outcome === "won" ? "Report filed · cease-fire ordered" : "Terminal report · command dissolved"}</p>
    <h1>${title}</h1>
    <p>${text}</p>
    <div class="stats">
      <div><div class="num">${roundNum}</div><div class="lbl">Rounds</div></div>
      <div><div class="num">${addCommasToNumber(myCas)}</div><div class="lbl">Your casualties</div></div>
      <div><div class="num">${addCommasToNumber(opCas)}</div><div class="lbl">Enemy casualties</div></div>
      <div><div class="num">${addCommasToNumber(mySize)}</div><div class="lbl">Troops fielded</div></div>
    </div>
    <div class="actions">
      <button class="restart" onclick="location.reload()">Deploy Again</button>
      <button onclick="location.href='help.html'">Read Strategy Guide</button>
      <button onclick="location.href='index.html'">Main Menu</button>
    </div>
  `;
  document.getElementById("game-over").classList.remove("hidden");
}

function countryName(country) {
  switch (country) {
    case "france":
      return "France";
    case "germany":
      return "Germany";
    case "paris":
      return "France";
    case "berlin":
      return "Germany";
    default:
      return country;
  }
}
function capitalOf(country) {
  switch (country) {
    case "france":
      return "Paris";
    case "germany":
      return "Berlin";
    default:
      return "Unknown Capital";
  }
}

function drawCountryNames() {
  push();
  fill(255, 255, 255, 235);
  textSize(22);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  stroke(0, 0, 0, 160);
  strokeWeight(3);
  text("France", ...vgrid(571, 517));
  text("Germany", ...vgrid(892, 256));
  pop();
}

function drawSea() {
  push();
  noStroke();
  for (let y = 0; y < height; y += 1) {
    const t = y / height;
    const c = lerpColor(color(12, 24, 42), color(8, 15, 27), t);
    fill(c);
    rect(0, y, width, 1);
  }
  pop();
}

function drawCountries() {
  // soft drop shadow under the landmass
  push();
  noStroke();
  fill(0, 0, 0, 60);
  drawFeature(franceData, 3, 3);
  drawFeature(germanyData, 3, 3);
  pop();

  push();
  stroke(20, 26, 38);
  strokeWeight(1.4);

  if (playingAs === "france") {
    fill(58, 95, 158, 225);
  } else {
    fill(148, 62, 54, 225);
  }
  drawFeature(franceData);

  if (playingAs === "germany") {
    fill(58, 95, 158, 225);
  } else {
    fill(148, 62, 54, 225);
  }
  drawFeature(germanyData);
  pop();

  // outlined country silhouettes for a "map" look
  push();
  noFill();
  stroke(10, 14, 22, 200);
  strokeWeight(2);
  drawFeature(franceData);
  drawFeature(germanyData);
  pop();
}

function drawFeature(feature, dx = 0, dy = 0) {
  const geom = feature.geometry;
  const drawRing = (ring) => {
    beginShape();
    ring.forEach(([lon, lat]) => {
      const [x, y] = project(lon, lat);
      vertex(x * 1.15 - 110 + dx, y * 1.15 - 50 + dy);
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

// vgrid takes in a pt on da virtual grid and returns the pos as [x, y].
function vgrid(x, y) {
  const realX = (x / vgrid_width) * width;
  const realY = (y / vgrid_height) * height;
  return [realX, realY];
}

// realgrid takes in a pt on da real grid and returns the pos as [x, y].
function realgrid(x, y) {
  const virtualX = (x / width) * vgrid_width;
  const virtualY = (y / height) * vgrid_height;
  return [virtualX, virtualY];
}

// point in box
function pointInBox(px, py, bx, by, bw, bh) {
  return px >= bx && px <= bx + bw && py >= by && py <= by + bh;
}
// mouse in box
function mouseInBox(bx, by, bw, bh) {
  return pointInBox(...vgrid(mouseX, mouseY), bx, by, bw, bh);
}

function mouseClicked() {
  if (playingState !== "playing") {
    return;
  }
  if (mouseClickHandler) {
    mouseClickHandler();
    return;
  }
  if (rounds.inProgress) {
    // no orders mid-round
    return;
  }
  const virtual = vgrid(mouseX, mouseY);
  const clickedUnit = [...units]
    .reverse()
    .find((u) => u.belongsTo === playingAs && pointInUnitBox(virtual[0], virtual[1], u));
  if (clickedUnit) {
    selectedUnit = clickedUnit;
    scrollToUnitInList(clickedUnit);
    return;
  }
  if (selectedUnit && pointInMap(mouseX, mouseY)) {
    const pos = vgrid(mouseX, mouseY);
    orderMoveForUnit(selectedUnit, Math.round(pos[0]), Math.round(pos[1]));
    // keep the unit selected so you can chain/redo orders
    return;
  }
  selectedUnit = null;
}

function keyPressed() {
  if (playingState !== "playing") return true;
  if (key === "n" || key === "N" || keyCode === ENTER) {
    if (!rounds.inProgress) {
      rounds.advanceRound();
    }
    return false;
  }
  if (keyCode === ESCAPE) {
    mouseClickHandler = null;
    selectedUnit = null;
    artilleryAiming = false;
    nukeAiming = false;
    updateArtilleryUI();
    if (document.activeElement) document.activeElement.blur();
    return false;
  }
  return true;
}

function togglePanelCollapse(btn) {
  const panel = btn.closest(".panel");
  if (!panel) return;
  const collapsed = panel.classList.toggle("collapsed");
  btn.textContent = collapsed ? "+" : "–";
}

function switchCommandTab(tabName, btn) {
  document.querySelectorAll("#command-tabs .command-tab-btn").forEach((b) => {
    b.classList.toggle("active", b === btn);
  });
  document.querySelectorAll("#command-panel .command-tab-pane").forEach((p) => {
    p.hidden = p.dataset.tabPane !== tabName;
  });
}

function drawRoundBanner() {
  push();
  textAlign(CENTER, CENTER);
  const [bx, by] = vgrid(700, 52);
  if (rounds.inProgress) {
    fill(217, 164, 65, 18);
    stroke(217, 164, 65, 120);
    strokeWeight(1);
    rectMode(CENTER);
    rect(bx, by, 300, 34, 17);
    noStroke();
    fill(217, 164, 65);
    textSize(12);
    textStyle(BOLD);
    text(`◉ ROUND ${rounds.roundNumber} · EXECUTING ORDERS`, bx, by);
  } else {
    rectMode(CENTER);
    fill(13, 20, 31, 200);
    stroke(155, 170, 195, 60);
    strokeWeight(1);
    rect(bx, by, 150, 26, 13);
    noStroke();
    fill(148, 160, 180);
    textSize(11);
    textStyle(NORMAL);
    text(`ROUND ${rounds.roundNumber}`, bx, by);
  }
  pop();
  rectMode(CORNER);
}

function toast(msg, duration = 2600) {
  const el = document.getElementById("toast-inner");
  if (!el) return;
  el.textContent = msg;
  const box = document.getElementById("toast");
  box.classList.add("show");
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.classList.remove("show"), duration);
}

function drawCapitals() {
  push();
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);

  // french capital
  const [paris, parisX, parisY] = capitals.france;
  drawCapitalMarker(paris, parisX, parisY);
  if (isInFrontOfFrontline(parisX, parisY, "france")) {
    drawCapitalThreat(parisX, parisY);
  }

  // german capital
  const [berlin, berlinX, berlinY] = capitals.germany;
  drawCapitalMarker(berlin, berlinX, berlinY);
  if (isInFrontOfFrontline(berlinX, berlinY, "germany")) {
    drawCapitalThreat(berlinX, berlinY);
  }
  pop();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
}

function drawCapitalMarker(name, x, y) {
  const [vx, vy] = vgrid(x, y);
  fill(255, 255, 255);
  noStroke();
  circle(vx, vy, 12);
  fill(50, 60, 80);
  circle(vx, vy, 6);
  fill(255, 255, 255, 235);
  stroke(0, 0, 0, 150);
  strokeWeight(2);
  text(name, vx, vy - 17);
}

function drawCapitalThreat(x, y) {
  const [vx, vy] = vgrid(x, y);
  push();
  fill(255, 178, 170, 80);
  stroke(255, 0, 0);
  strokeWeight(2);
  circle(vx, vy, 32);
  fill(255, 0, 0);
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text("!", vx, vy);
  pop();
}
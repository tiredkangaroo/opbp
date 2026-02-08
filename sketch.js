const width = 1400;
const height = 800;
const vgrid_width = 1400;
const vgrid_height = 800;

let franceData = null;
let germanyData = null;
let playingAs = "france";

let debug = new URLSearchParams(window.location.search).get("debug") === "true";

// capitals in virtual grid coordinates
const capitals = {
  france: ["Paris", 544, 401],
  germany: ["Berlin", 1029, 160],
};

const ordinalNumerals = [
  // i just learned that's what they're called
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

let units = [
  // new Unit(829, 352, "1st German Army Unit", 4, 4100, 20, 10, 5, "germany"),
  // new Unit(759, 300, "2nd German Army Unit", 8, 4000, 18, 12, 5, "germany"),
  // new Unit(875, 288, "3rd German Army Unit", 8, 10000, 10, 20, 5, "germany"),
  // // new Unit(850, 300, "Reserve German Unit", 3, 3000, 15, 15, 5, "germany"), // used for testing merges
  // new Unit(828, 416, "4th German Army Unit", 6, 5300, 19, 11, 5, "germany"),
  // new Unit(725, 420, "1st French Army Unit", 5, 6500, 15, 15, 5, "france"),
  // new Unit(685, 357, "2nd French Army Unit", 7, 6000, 17, 13, 5, "france"),
  // new Unit(550, 550, "3rd French Army Unit", 9, 8000, 14, 16, 5, "france"),
];

let mouseClickHandler = null;

let mouseObj = null;

let maximumFrameRate = 50;

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
  // capital protection units that start in a hexagon around the capital
  for (const country in capitals) {
    const [capitalName, capitalX, capitalY] = capitals[country];
    const protectionRadius = 60;
    for (let i = 0; i < 6; i++) {
      const angle = (360 / 6) * i;
      const angleRad = (angle * Math.PI) / 180; // what even are radians im ngl i don't know

      // protectionRadius sin theta is the horizontal distance from the center and cos theta is vertical
      // x and y of a unit are the top left corner of the unit, so we need to subtract half the unit's width and height to center it on the point

      const { width: w1, height: h1 } = getFlagDimensions(country, 1);

      const x = capitalX + protectionRadius * Math.sin(angleRad) - w1 / 2;
      const y = capitalY + protectionRadius * Math.cos(angleRad) - h1 / 2;
      units.push(
        new Unit(
          x,
          y,
          `${ordinalNumerals[i]} ${capitalName} Guard`,
          10,
          2000,
          20,
          10,
          5,
          country,
        ),
      );
    }
  }
}

function draw() {
  background(155, 155, 155);
  frameRate(maximumFrameRate);
  noCursor();
  if (franceData === null || germanyData === null) {
    // guarantee map data is loaded
    return;
  }
  drawCountries();
  drawCapitals();
  drawOccupation();
  drawResources();
  units.forEach((unit) => unit.draw());
  rounds.watchRound();
  mouseObj.draw();
  text(
    rounds.inProgress ? "Round in progress" : "No round in progress",
    1200,
    20,
  );
}

function drawCountries() {
  stroke(0);
  strokeWeight(1);
  if (playingAs === "france") {
    fill(0, 85, 164);
  } else {
    fill(221, 0, 0);
  }
  drawFeature(franceData);
  if (playingAs === "germany") {
    fill(0, 85, 164);
  } else {
    fill(221, 0, 0);
  }
  drawFeature(germanyData);
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
  if (mouseClickHandler) {
    mouseClickHandler();
  }
}
function drawCursor() {
  if (mouseClickHandler) {
    // selecting something
  }
}

function drawCapitals() {
  // draw a circle at the capital of each country
  // and place text above it with the name of the capital

  push();
  fill(255, 255, 255);
  noStroke();
  // text settings
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);

  // french capital
  const [paris, parisX, parisY] = capitals.france;
  ellipse(...vgrid(parisX, parisY), 8, 8);
  text(paris, ...vgrid(parisX, parisY - 15));

  // german capital
  const [berlin, berlinX, berlinY] = capitals.germany;
  ellipse(...vgrid(berlinX, berlinY), 8, 8);
  text(berlin, ...vgrid(berlinX, berlinY - 15));
  pop();
}

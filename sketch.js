const width = 1400;
const height = 800;
const vgrid_width = 1400;
const vgrid_height = 800;

let franceData = null;
let germanyData = null;
let playingAs = "france";

let units = [
  new Unit(829, 352, "1st German Army Unit", 4, 4100, 20, 10, 5, "germany"),
  new Unit(759, 300, "2nd German Army Unit", 8, 4000, 18, 12, 5, "germany"),
  new Unit(875, 288, "3rd German Army Unit", 8, 10000, 10, 20, 5, "germany"),
  // new Unit(850, 300, "Reserve German Unit", 3, 3000, 15, 15, 5, "germany"), // used for testing merges
  new Unit(828, 416, "4th German Army Unit", 6, 5300, 19, 11, 5, "germany"),
  new Unit(725, 420, "1st French Army Unit", 5, 6500, 15, 15, 5, "france"),
  new Unit(685, 357, "2nd French Army Unit", 7, 6000, 17, 13, 5, "france"),
  new Unit(550, 450, "3rd French Army Unit", 9, 8000, 14, 16, 5, "france"),
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

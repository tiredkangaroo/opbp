const width = 1400;
const height = 800;
const vgrid_width = 1400;
const vgrid_height = 800;

let franceData = null;
let germanyData = null;
let playingAs = "france";

let units = [
  new Unit(829, 352, "1st German Army Unit", 67, 4100, 20, 10, 5, "germany"),
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

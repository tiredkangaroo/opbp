const width = 1400;
const height = 800;
const vgrid_width = 1400;
const vgrid_height = 800;

let franceData = null;
let germanyData = null;
let playingAs = "france";

let units = [new Unit(500, 500, 1, 1000, "france")];

async function preload() {
  preloadFlags();
  franceData = await getCountry("france");
  germanyData = await getCountry("germany");
}

function setup() {
  createCanvas(1367, 800);
}

function draw() {
  background(155, 155, 155);
  if (franceData === null || germanyData === null) {
    // guarantee map data is loaded
    return;
  }
  drawCountries();
  units.forEach((unit) => unit.draw());
}

function drawCountries() {
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

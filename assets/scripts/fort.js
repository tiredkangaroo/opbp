const FORT_COST = 900;
const FORT_DEFENSE_RADIUS = 48;
const FORT_ATTRITION_RADIUS = 26;
const MAX_FORTS = 12;

class Fort {
  constructor(x, y, belongsTo) {
    this.x = x;
    this.y = y;
    this.belongsTo = belongsTo;
    this.strength = 100;
  }
  draw() {
    const a = 9;
    push();
    rectMode(CENTER);
    fill(70, 66, 60);
    stroke(0);
    strokeWeight(1.5);
    rect(this.x, this.y, a * 2, a * 2, 2);
    if (this.belongsTo === "france") {
      fill(0, 85, 164);
    } else {
      fill(221, 0, 0);
    }
    noStroke();
    rect(this.x, this.y - a / 2, a * 2, a);
    pop();
  }
}

let forts = [];
let selectedFortPosition = null;

function fortCostNow() {
  return Math.round(FORT_COST * fortCostMultiplier());
}

function selectFortPosition() {
  mouseClickHandler = null;
  setTimeout(() => {
    document.getElementById("fort-position-display").textContent = "(click on map)";
    mouseClickHandler = () => {
      if (!pointInMap(mouseX, mouseY)) {
        alert("Please select a position on the map!");
        return;
      }
      const pos = vgrid(mouseX, mouseY);
      const px = Math.round(pos[0]);
      const py = Math.round(pos[1]);
      if (inWhatCountry(px, py) !== playingAs) {
        alert("Fortresses can only be built in your own territory!");
        return;
      }
      if (frontlineYs !== null && isInFrontOfFrontline(px, py, playingAs)) {
        alert("Fortresses must be built behind the frontline!");
        return;
      }
      for (const f of forts) {
        if (f.belongsTo === playingAs && Math.hypot(f.x - px, f.y - py) < 40) {
          alert("Too close to an existing fortress!");
          return;
        }
      }
      selectedFortPosition = [px, py];
      document.getElementById("fort-position-display").textContent = `(${px}, ${py})`;
      mouseClickHandler = null;
    };
  }, 250);
}

function buildFort() {
  if (!selectedFortPosition) {
    alert("Select a position for the fortress first!");
    return;
  }
  const cost = fortCostNow();
  if (resources < cost) {
    alert("Not enough resources to build a fortress!");
    return;
  }
  if (forts.filter((f) => f.belongsTo === playingAs).length >= MAX_FORTS) {
    alert("You have built too many fortresses.");
    return;
  }
  resources -= cost;
  const [x, y] = selectedFortPosition;
  forts.push(new Fort(x, y, playingAs));
  selectedFortPosition = null;
  document.getElementById("fort-position-display").textContent = "(not selected)";
  rounds.log(`Fortress completed at (${x}, ${y}).`);
  updateFortPanelUI();
}

function drawForts() {
  for (const f of forts) f.draw();
}

function unitNearFriendlyFort(unit) {
  for (const f of forts) {
    if (f.belongsTo !== unit.belongsTo) continue;
    if (Math.hypot(f.x - unit.x, f.y - unit.y) <= FORT_DEFENSE_RADIUS) return true;
  }
  return false;
}

function enemyUnitOnFort(unit) {
  for (const f of forts) {
    if (f.belongsTo === unit.belongsTo) continue;
    if (Math.hypot(f.x - unit.x, f.y - unit.y) <= FORT_ATTRITION_RADIUS) return true;
  }
  return false;
}

function updateFortPanelUI() {
  document.getElementById("fort-cost-display").innerText = fortCostNow();
}

function setupMaginotLine() {
  if (playingAs !== "france") return;
  const candidates = [
    [700, 330],
    [704, 370],
    [694, 408],
    [688, 442],
  ];
  for (const [x, y] of candidates) {
    if (pointInCountry(x, y, franceData)) {
      forts.push(new Fort(x, y, "france"));
    }
  }
  rounds.log("The Maginot Line shields the French border.");
}
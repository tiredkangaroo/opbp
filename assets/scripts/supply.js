const SUPPLY_BASE_RADIUS = 320;
const SUPPLY_MIN = 0.12;
const SUPPLY_CUTOFF_THRESHOLD = 0.22;

function computeUnitSupplyRaw(unit) {
  const cap = capitals[unit.belongsTo];
  const dist = Math.hypot(unit.x - cap[1], unit.y - cap[2]);
  const decayMult = supplyMultiplierFor(unit.belongsTo);
  let supply = 1 - (Math.max(0, dist - SUPPLY_BASE_RADIUS) / SUPPLY_BASE_RADIUS) * 0.7 * decayMult;
  if (inWhatCountry(unit.x, unit.y) === unit.belongsTo) {
    supply = Math.max(0.85, supply);
  }
  if (unitIsCutOff(unit)) {
    supply = Math.min(supply, SUPPLY_CUTOFF_THRESHOLD);
  }
  return Math.max(SUPPLY_MIN, Math.min(1, supply));
}

function getUnitSupply(unit) {
  if (unit.supplyMemoRound !== rounds.roundNumber) {
    unit.supplyMemoRound = rounds.roundNumber;
    unit.supplyMemo = computeUnitSupplyRaw(unit);
  }
  return unit.supplyMemo;
}

function unitIsCutOff(unit) {
  if (inWhatCountry(unit.x, unit.y) === unit.belongsTo) {
    return false;
  }
  const cap = capitals[unit.belongsTo];
  const enemyUnits = units.filter((u) => u.belongsTo !== unit.belongsTo);
  let blocked = 0;
  const total = 7;
  for (let i = 2; i <= total; i++) {
    const t = i / 9;
    const px = unit.x + (cap[1] - unit.x) * t;
    const py = unit.y + (cap[2] - unit.y) * t;
    if (inWhatCountry(px, py) === unit.belongsTo) {
      break;
    }
    let hit = false;
    for (const e of enemyUnits) {
      if (Math.hypot(e.x - px, e.y - py) < e.calculateMaxRadius() * 0.5 + 14) {
        hit = true;
        break;
      }
    }
    if (hit) blocked++;
  }
  return blocked >= 5;
}

function supplyCombatMultiplier(unit) {
  return 0.5 + getUnitSupply(unit) * 0.5;
}

function supplyLineColor(unit) {
  const s = getUnitSupply(unit);
  if (s < 0.25) return [200, 40, 30];
  if (s < 0.5) return [225, 170, 20];
  return [55, 165, 75];
}

function drawSupplyLines() {
  const ownUnits = units.filter((u) => u.belongsTo === playingAs);
  const cap = capitals[playingAs];
  push();
  for (const u of ownUnits) {
    const [x1, y1] = vgrid(u.x, u.y);
    const [x2, y2] = vgrid(cap[1], cap[2]);
    const s = getUnitSupply(u);
    const col = supplyLineColor(u);
    stroke(col[0], col[1], col[2], 150);
    strokeWeight(1.5);
    line(x1, y1, x2, y2);
    if (s < 0.25) {
      stroke(255, 40, 30);
      strokeWeight(2);
      noFill();
      ellipse(x1, y1, 34, 34);
    }
  }
  pop();
}
// ===== Artillery =====
// Fire missions let you spend resources to bombard an area at the start of the
// next round. Direct hits weaken, damage and demoralize enemy units.

const ARTILLERY_PRESETS = [
  { power: 1, cost: 200, radius: 65, label: "Harassing Fire" },
  { power: 2, cost: 360, radius: 90, label: "Bombardment" },
  { power: 3, cost: 540, radius: 120, label: "Heavy Barrage" },
];
const MAX_MISSIONS_PER_ROUND = 3;
const NUKE_MIN_ROUND = 50;
const NUKE_COST = 25000;
const NUKE_RADIUS = 260;
const NUKE_MANPOWER_HIT = 30000;
const MAX_NUKES_PER_ROUND = 1;

let selectedArtilleryPower = 0;
let pendingBarrages = []; // fired by the player (plan phase)
let opponentBarrages = []; // fired by the opponent
let artilleryAiming = false;
let nukeAiming = false;
let pendingNuke = null; // {x, y} - one nuclear strike per round
const barrageFx = []; // visual explosion effects

function artilleryPreset() {
  return ARTILLERY_PRESETS[selectedArtilleryPower] || ARTILLERY_PRESETS[0];
}
function artilleryCost() {
  return artilleryPreset().cost;
}

function setArtilleryPower(idx) {
  selectedArtilleryPower = Math.max(0, Math.min(ARTILLERY_PRESETS.length - 1, idx));
  updateArtilleryUI();
}

function selectArtilleryTarget() {
  const p = artilleryPreset();
  if (resources < p.cost) {
    toast(`Not enough resources for ${p.label} (${p.cost}).`);
    return;
  }
  if (pendingBarrages.length >= MAX_MISSIONS_PER_ROUND) {
    toast(`You can fire up to ${MAX_MISSIONS_PER_ROUND} missions per round.`);
    return;
  }
  mouseClickHandler = null;
  artilleryAiming = true;
  updateArtilleryUI();
  mouseClickHandler = () => {
    if (!pointInMap(mouseX, mouseY)) {
      toast("Please select a target on the map!");
      return;
    }
    const pos = vgrid(mouseX, mouseY);
    const cmd = {
      x: Math.round(pos[0]),
      y: Math.round(pos[1]),
      power: p.power,
      radius: p.radius,
    };
    resources -= p.cost;
    pendingBarrages.push(cmd);
    artilleryAiming = false;
    mouseClickHandler = null;
    rounds.log(`${p.label} ordered at (${cmd.x}, ${cmd.y}).`);
    displayRoundCost();
    updateArtilleryUI();
  };
}

function clearPendingBarrages() {
  artilleryAiming = false;
  nukeAiming = false;
  mouseClickHandler = null;
  let refund = 0;
  if (pendingNuke) {
    refund += NUKE_COST;
    pendingNuke = null;
  }
  if (pendingBarrages.length === 0 && refund === 0) {
    updateArtilleryUI();
    return;
  }
  for (const b of pendingBarrages) {
    const preset = ARTILLERY_PRESETS.find((x) => x.power === b.power) || ARTILLERY_PRESETS[0];
    refund += preset.cost;
  }
  resources += refund;
  pendingBarrages = [];
  rounds.log("Artillery missions cancelled.");
  displayRoundCost();
  updateArtilleryUI();
}

function firePendingBarrages() {
  for (const b of pendingBarrages) applyBarrage(b, playingAs);
  for (const b of opponentBarrages) applyBarrage(b, opponent.playingas);
  applyPendingNukes();
  pendingBarrages = [];
  opponentBarrages = [];
  updateArtilleryUI();
}

function applyPendingNukes() {
  if (pendingNuke) {
    applyNuke(pendingNuke.x, pendingNuke.y, playingAs);
    pendingNuke = null;
  }
}

function canOrderNuke() {
  if (rounds.roundNumber < NUKE_MIN_ROUND) {
    return { ok: false, reason: `Nuclear artillery unlocks after ${NUKE_MIN_ROUND} rounds played (currently ${rounds.roundNumber}).` };
  }
  if (resources < NUKE_COST) {
    return { ok: false, reason: `Nuclear artillery costs ${addCommasToNumber(NUKE_COST)} resources.` };
  }
  if (pendingNuke) {
    return { ok: false, reason: "A nuclear strike is already queued for this round." };
  }
  return { ok: true, reason: "" };
}

function selectNukeTarget() {
  const state = canOrderNuke();
  if (!state.ok) {
    toast(state.reason);
    return;
  }
  mouseClickHandler = null;
  artilleryAiming = true;
  nukeAiming = true;
  updateArtilleryUI();
  mouseClickHandler = () => {
    if (!pointInMap(mouseX, mouseY)) {
      toast("Please select a target on the map!");
      return;
    }
    const pos = vgrid(mouseX, mouseY);
    pendingNuke = {
      x: Math.round(pos[0]),
      y: Math.round(pos[1]),
    };
    resources -= NUKE_COST;
    artilleryAiming = false;
    nukeAiming = false;
    mouseClickHandler = null;
    rounds.log(`Nuclear strike ordered at (${pendingNuke.x}, ${pendingNuke.y}).`, true);
    displayRoundCost();
    updateArtilleryUI();
  };
}

function applyNuke(x, y, attacker) {
  const casualtiesByCountry = {};
  for (const u of units) {
    if (u.size <= 5) continue;
    const d = Math.hypot(u.x - x, u.y - y);
    if (d > NUKE_RADIUS) continue;
    const falloff = Math.max(0.35, 1 - (d / NUKE_RADIUS) * 0.6);
    const dmgFrac = 0.7 + Math.random() * 0.25 + 0.15 * falloff;
    const damage = Math.max(10, Math.min(Math.round(u.size * dmgFrac), u.size - 5));
    u.size -= damage;
    u.stamina = 1;
    u.speed = Math.max(10, u.speed - 4);
    u.attack = Math.max(1, u.attack - 4);
    addCasualties(u.belongsTo, damage);
    casualtiesByCountry[u.belongsTo] = (casualtiesByCountry[u.belongsTo] || 0) + damage;
    u.artilleryHitThisRound = true;
    barrageFx.push({ x: u.x, y: u.y, t: 0, nuke: true });
    rounds.log(`☢ ${u.shortName()} caught in the nuclear blast (-${addCommasToNumber(damage)}).`);
  }

  // local devastation: wipe out the manpower of the ground that was hit
  const land = inWhatCountry(x, y);
  if (land) {
    addManpower(land, -NUKE_MANPOWER_HIT);
    rounds.log(
      `The firestorm devastates the population of ${countryName(land)} (-${addCommasToNumber(NUKE_MANPOWER_HIT)} manpower).`,
      true,
    );
  }
  // every country that lost troops in the blast loses that manpower for good
  for (const country in casualtiesByCountry) {
    addManpower(country, -casualtiesByCountry[country]);
  }

  if (!land && Object.keys(casualtiesByCountry).length === 0) {
    rounds.log("The nuclear blast detonates over empty ground.");
  }
}

function applyBarrage(b, attacker) {
  const preset = ARTILLERY_PRESETS.find((x) => x.power === b.power) || ARTILLERY_PRESETS[0];
  let hitSomething = false;
  const targets = units.filter((u) => u.belongsTo !== attacker && u.size > 40);
  for (const u of targets) {
    const d = Math.hypot(u.x - b.x, u.y - b.y);
    if (d > b.radius) continue;
    const falloff = Math.max(0.25, 1 - d / b.radius);
    const dmgFrac = (b.power / 14) * falloff * (0.7 + Math.random() * 0.6);
    const damage = Math.max(5, Math.min(Math.round(u.size * dmgFrac), u.size - 40));
    u.size -= damage;
    u.stamina = Math.max(1, u.stamina - 1.5);
    addCasualties(u.belongsTo, damage);
    u.artilleryHitThisRound = true;
    hitSomething = true;
    barrageFx.push({ x: u.x, y: u.y, t: 0 });
    rounds.log(`${preset.label} hits ${u.shortName()} (-${addCommasToNumber(damage)}).`);
  }
  if (!hitSomething) {
    barrageFx.push({ x: b.x, y: b.y, t: 0 });
    rounds.log(`${preset.label} explodes harmlessly.`);
  }
}

function drawArtillery() {
  push();
  if (!rounds.inProgress) {
    for (const b of pendingBarrages) {
      const [sx, sy] = vgrid(b.x, b.y);
      const preset = ARTILLERY_PRESETS.find((x) => x.power === b.power) || ARTILLERY_PRESETS[0];
      stroke(255, 70, 45);
      strokeWeight(2);
      noFill();
      ellipse(sx, sy, b.radius, b.radius);
      stroke(255, 70, 45, 120);
      strokeWeight(1);
      ellipse(sx, sy, b.radius + 8, b.radius + 8);
      noStroke();
      fill(255, 70, 45);
      textSize(10);
      textAlign(CENTER, CENTER);
      text(`${preset.label} · ${artilleryCostLabel(b)}`, sx, sy - b.radius - 9);
      fill(255, 70, 45, 240);
      circle(sx, sy, 6);
    }
  }

  if (artilleryAiming && mouseClickHandler) {
    const p = artilleryPreset();
    const [sx, sy] = vgrid(mouseX, mouseY);
    stroke(255, 200, 60, 210);
    strokeWeight(1.5);
    noFill();
    ellipse(sx, sy, p.radius, p.radius);
    noStroke();
    fill(255, 200, 60, 230);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(p.label, sx, sy - p.radius - 10);
    fill(255, 70, 45);
    circle(sx, sy, 6);
  }

  if (nukeAiming && mouseClickHandler) {
    const [sx, sy] = vgrid(mouseX, mouseY);
    stroke(255, 70, 45, 230);
    strokeWeight(2);
    noFill();
    ellipse(sx, sy, NUKE_RADIUS, NUKE_RADIUS);
    stroke(255, 200, 60, 190);
    strokeWeight(1);
    ellipse(sx, sy, NUKE_RADIUS + 12, NUKE_RADIUS + 12);
    noStroke();
    fill(255, 70, 45);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("☢ NUCLEAR STRIKE", sx, sy - NUKE_RADIUS - 14);
    fill(255, 215, 90);
    circle(sx, sy, 8);
  }

  if (pendingNuke && !rounds.inProgress) {
    const [sx, sy] = vgrid(pendingNuke.x, pendingNuke.y);
    stroke(255, 70, 45);
    strokeWeight(2);
    noFill();
    ellipse(sx, sy, NUKE_RADIUS, NUKE_RADIUS);
    stroke(255, 70, 45, 120);
    strokeWeight(1);
    ellipse(sx, sy, NUKE_RADIUS + 10, NUKE_RADIUS + 10);
    noStroke();
    fill(255, 70, 45);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(`☢ NUCLEAR STRIKE · ${addCommasToNumber(NUKE_COST)}`, sx, sy - NUKE_RADIUS - 9);
    fill(255, 215, 90);
    circle(sx, sy, 8);
  }

  for (let i = barrageFx.length - 1; i >= 0; i--) {
    const fx = barrageFx[i];
    fx.t += 1;
    const life = fx.nuke ? 72 : 24;
    const prog = fx.t / life;
    const [sx, sy] = vgrid(fx.x, fx.y);
    if (fx.nuke) {
      // mushroom cloud
      noStroke();
      fill(255, 225, 150, 220 * (1 - prog));
      circle(sx, sy - Math.max(0, prog - 0.25) * 130, 34 + 26 * Math.min(1, prog * 2));
      fill(255, 130, 40, 210 * (1 - prog));
      circle(sx, sy - 4, 24);
      stroke(255, 150, 40, 230 * (1 - prog));
      strokeWeight(4);
      noFill();
      ellipse(sx, sy, 240 * prog, 240 * prog);
      stroke(200, 70, 45, 190 * (1 - prog));
      strokeWeight(2);
      ellipse(sx, sy, 360 * prog, 360 * prog);
    } else {
      if (prog < 0.35) {
        noStroke();
        fill(255, 210, 90, 210 * (1 - prog / 0.35));
        circle(sx, sy, 28);
        fill(255, 130, 40, 170 * (1 - prog / 0.35));
        circle(sx, sy - 4, 22);
      }
      stroke(255, 150, 40, 230 * (1 - prog));
      strokeWeight(3);
      noFill();
      ellipse(sx, sy, 120 * prog, 120 * prog);
      stroke(200, 70, 45, 190 * (1 - prog));
      strokeWeight(1.5);
      ellipse(sx, sy, 190 * prog, 190 * prog);
    }
    if (fx.t > life) barrageFx.splice(i, 1);
  }
  pop();
  textAlign(LEFT, CENTER);
}

function artilleryCostLabel(b) {
  const preset = ARTILLERY_PRESETS.find((x) => x.power === b.power);
  return preset ? `${preset.cost}` : `${b.power}`;
}

function updateArtilleryUI() {
  const presetsEl = document.getElementById("artillery-presets");
  if (!presetsEl) return;
  presetsEl.innerHTML = ARTILLERY_PRESETS.map((p, i) => {
    const active = selectedArtilleryPower === i;
    return `<button class="artillery-preset ${active ? "preset-active" : ""}" onclick="setArtilleryPower(${i})">
      <span class="preset-name">${p.label}</span>
      <span class="preset-cost">${p.cost}</span>
    </button>`;
  }).join("");

  const costEl = document.getElementById("artillery-cost-display");
  if (costEl) costEl.textContent = artilleryCost();

  const statusEl = document.getElementById("artillery-status");
  if (statusEl) {
    if (artilleryAiming) {
      statusEl.textContent = "Click the map to set the target.";
    } else if (pendingBarrages.length > 0) {
      statusEl.textContent = `${pendingBarrages.length} of ${MAX_MISSIONS_PER_ROUND} missions queued`;
    } else {
      statusEl.textContent = "Pick a preset, then choose a target on the map.";
    }
  }

  const clearBtn = document.getElementById("clear-artillery-btn");
  if (clearBtn) clearBtn.disabled = pendingBarrages.length === 0 && !artilleryAiming && !pendingNuke;

  const fireBtn = document.getElementById("queue-artillery-btn");
  if (fireBtn) {
    fireBtn.disabled = resources < artilleryCost() || pendingBarrages.length >= MAX_MISSIONS_PER_ROUND;
    fireBtn.textContent = pendingBarrages.length > 0
      ? "Queue Another"
      : "Fire Mission";
  }

  const nukeBtn = document.getElementById("order-nuke-btn");
  if (nukeBtn) {
    const state = canOrderNuke();
    nukeBtn.disabled = !state.ok;
    nukeBtn.textContent = pendingNuke ? "☢ Nuclear Strike Queued" : "☢ Nuclear Artillery";
  }
  const nukeStatus = document.getElementById("nuke-status");
  if (nukeStatus) {
    if (rounds.roundNumber < NUKE_MIN_ROUND) {
      nukeStatus.textContent = `Up: ${rounds.roundNumber}/${NUKE_MIN_ROUND} rounds played to unlock.`;
    } else if (pendingNuke) {
      nukeStatus.textContent = `Queued for (${pendingNuke.x}, ${pendingNuke.y}) · detonates next round.`;
    } else if (nukeAiming) {
      nukeStatus.textContent = "Click the map to set the nuclear target.";
    } else if (resources < NUKE_COST) {
      nukeStatus.textContent = `Costs ${addCommasToNumber(NUKE_COST)} resources. ${addCommasToNumber(NUKE_COST - resources)} more needed.`;
    } else {
      nukeStatus.textContent = `${addCommasToNumber(NUKE_COST)} resources · devastates local manpower.`;
    }
  }
}
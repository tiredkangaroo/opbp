var resources = 4000;
var french_casualties = 0;
var german_casualties = 0;

function drawResources() {
  push();
  const bx = 14;
  const by = height - 156;
  const bw = 344;
  const bh = 142;

  fill(13, 20, 31, 216);
  stroke(216, 165, 63, 70);
  strokeWeight(1);
  rect(bx, by, bw, bh, 12);

  // resources
  noStroke();
  fill(216, 165, 63);
  textSize(10);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  text("RESOURCES", bx + 14, by + 10);
  fill(255);
  textSize(24);
  textStyle(BOLD);
  text(addCommasToNumber(resources), bx + 14, by + 22);
  const income = countryIncome(playingAs, rounds.roundNumber);
  fill(111, 191, 115);
  textSize(12);
  textStyle(NORMAL);
  text(`+${income}/round`, bx + 14 + textWidth(`${addCommasToNumber(resources)}`) + 18, by + 32);

  // casualties
  const myCas = playingAs === "france" ? french_casualties : german_casualties;
  const opCas = playingAs === "france" ? german_casualties : french_casualties;
  fill(148, 160, 180);
  textSize(10);
  textStyle(BOLD);
  text("CASUALTIES", bx + 14, by + 54);
  fill(224, 92, 82);
  textSize(14);
  textStyle(BOLD);
  text(addCommasToNumber(myCas), bx + 14, by + 68);
  fill(111, 191, 115);
  text(addCommasToNumber(opCas), bx + 120, by + 68);
  fill(148, 160, 180);
  textSize(9);
  textStyle(NORMAL);
  text("you", bx + 16, by + 82);
  text("enemy", bx + 122, by + 82);

  // manpower
  const mp = manpowerFor(playingAs);
  const mpMax = maxManpowerFor(playingAs);
  fill(148, 160, 180);
  textSize(10);
  textStyle(BOLD);
  text("MANPOWER", bx + 14, by + 94);
  fill(216, 165, 63);
  textSize(15);
  textStyle(BOLD);
  text(addCommasToNumber(mp), bx + 14, by + 109);
  fill(111, 191, 115);
  textSize(11);
  textStyle(NORMAL);
  text(
    `/ ${addCommasToNumber(mpMax)} · +${addCommasToNumber(Math.round(MANPOWER_GROWTH_PER_ROUND * victoryPointManpowerRatio(playingAs)))}/round`,
    bx + 14 + textWidth(`${addCommasToNumber(mp)}`) + 14,
    by + 109,
  );

  // victory points progress toward the win threshold
  const strikeX = bx + 218;
  const myVP = victoryPointIncomeFor(playingAs);
  const enemyVP = victoryPointIncomeFor(opponent.playingas);
  fill(148, 160, 180);
  textSize(9);
  textStyle(BOLD);
  text("VICTORY POINTS", strikeX, by + 10);

  drawVPBar(strikeX, by + 24, `${countryName(playingAs)}`, myVP, playingAs === "france" ? [58, 95, 158] : [148, 62, 54]);
  drawVPBar(strikeX, by + 54, `${countryName(opponent.playingas)}`, enemyVP, playingAs === "france" ? [148, 62, 54] : [58, 95, 158]);

  if (debug) {
    fill(148, 160, 180);
    textSize(10);
    textStyle(NORMAL);
    text(`Opponent resources: ${addCommasToNumber(opponent.resources)}`, bx + 14, by + 126);
  }
  pop();
  textAlign(LEFT, CENTER);
}

function drawVPBar(x, y, label, vps, color) {
  push();
  noStroke();
  fill(255, 255, 255, 220);
  textSize(9);
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  text(label, x, y - 4);

  const barW = 110;
  const frac = Math.min(vps / VICTORY_POINT_THRESHOLD, 1);
  fill(255, 255, 255, 26);
  rect(x, y + 2, barW, 8, 2);
  if (frac > 0) {
    fill(color[0], color[1], color[2], 235);
    rect(x, y + 2, Math.max(barW * frac, 3), 8, 2);
  }
  fill(255, 255, 255, 235);
  textSize(9);
  text(`${Math.round(vps)} / ${VICTORY_POINT_THRESHOLD}`, x + barW + 6, y + 6);
  pop();
}

function updateResourcesForNewRound(roundNum) {
  // income is driven by Victory Points + a base that grows slightly each round
  const playerIncome = countryIncome(playingAs, roundNum);
  const opponentIncome = countryIncome(opponent.playingas, roundNum);
  resources = Math.max(0, resources + playerIncome);
  opponent.resources = Math.max(0, opponent.resources + opponentIncome);
  growManpower();
  logCityCaptures();
  document.getElementById("deploy-unit-size-input").max = Math.max(resources, 10000);
  document.getElementById("deploy-unit-size-value").innerText =
    `${document.getElementById("deploy-unit-size-input").value} troops`;
  updateArtilleryUI();
  updateDeployManpowerUI();
}

function addResources(amount) {
  resources = Math.max(Math.round(resources + amount), 0);
}

function addCasualties(country, amount) {
  if (!amount || amount <= 0) return;
  if (country === "france") {
    french_casualties += amount;
  } else if (country === "germany") {
    german_casualties += amount;
  }
}
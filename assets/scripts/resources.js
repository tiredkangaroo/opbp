var resources = 4000;
var french_casualties = 0;
var german_casualties = 0;

function drawResources() {
  fill(255);
  noStroke();
  textSize(16);
  text(`Resources: ${resources}`, ...vgrid(10, vgrid_height - 50));
  fill(220, 220, 90);
  textSize(12);
  text(`+${countryIncome(playingAs, rounds.roundNumber)}/round`, ...vgrid(165, vgrid_height - 50 + 4));
  fill(0);
  textSize(16);
  text(`French Casualties: ${addCommasToNumber(french_casualties)}`, ...vgrid(10, vgrid_height - 130));
  text(`German Casualties: ${addCommasToNumber(german_casualties)}`, ...vgrid(10, vgrid_height - 100));

  if (debug) {
    // draw opponent resources for testing purposes
    fill(255);
    text(`Opponent Resources: ${opponent.resources}`, ...vgrid(10, vgrid_height - 75));
  }
}

function updateResourcesForNewRound(roundNum) {
  // income is driven by Victory Points + a base that grows slightly each round
  const playerIncome = countryIncome(playingAs, roundNum);
  const opponentIncome = countryIncome(opponent.playingas, roundNum);
  resources = Math.max(0, resources + playerIncome);
  opponent.resources = Math.max(0, opponent.resources + opponentIncome);
  logCityCaptures();
  document.getElementById("deploy-unit-size-input").max = Math.max(resources, 10000);
  document.getElementById("deploy-unit-size-value").innerText =
    `${document.getElementById("deploy-unit-size-input").value} troops`;
  console.log("resources updated to:", resources, "(+" + playerIncome + ")", "/", opponent.resources, "(+" + opponentIncome + ")");
}

function addResources(amount) {
  resources = Math.max(Math.round(resources + amount), 0);
}

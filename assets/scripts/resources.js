var resources = 2000;
var french_casualties = 0;
var german_casualties = 0;

function drawResources() {
  fill(255);
  const barWidth = 300;
  const barHeight = 18;
  noStroke();
  textSize(16);
  text(`Resources: ${resources}`, ...vgrid(10, vgrid_height - 50));
  fill(0);
  text(
    `French Casualties: ${addCommasToNumber(french_casualties)}`,
    ...vgrid(10, vgrid_height - 130),
  );
  text(
    `German Casualties: ${addCommasToNumber(german_casualties)}`,
    ...vgrid(10, vgrid_height - 100),
  );

  if (debug) {
    // draw opponent resources for testing purposes
    fill(255);
    text(
      `Opponent Resources: ${opponent.resources}`,
      ...vgrid(10, vgrid_height - 75),
    );
  }
}

function updateResourcesForNewRound(roundNum) {
  // round 0: 275
  // round 1: 358
  // round 2: 444
  // round 3: 529
  // round 4: 617
  // round 5: 704
  // round 6: 794
  // etc..
  // you don't have to deploy units every round so wtv
  resources = resources + (67 + (roundNum ^ (0.85 * 20)));
  opponent.resources = opponent.resources + (100 + (roundNum ^ (1 * 20)));
  console.log("resources updated to:", resources, opponent.resources);
}

function addResources(amount) {
  resources = Math.max(Math.round(resources + amount), 0);
}

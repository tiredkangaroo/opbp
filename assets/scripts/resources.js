var resources = 275;
var max_resources = 1250;
var french_casualties = 0;
var german_casualties = 0;

function drawResources() {
  fill(255);
  const barWidth = 300;
  const barHeight = 18;
  noStroke();
  textSize(16);
  text(`Resources: ${resources}`, ...vgrid(10, vgrid_height - 50));
  rect(...vgrid(10, vgrid_height - 40), ...vgrid(barWidth, barHeight));
  fill("#f570ff");
  rect(
    ...vgrid(10, vgrid_height - 40),
    ...vgrid(barWidth * (resources / max_resources), barHeight),
  );
  fill(0);
  text(
    `French Casualties: ${french_casualties}`,
    ...vgrid(10, vgrid_height - 130),
  );
  text(
    `German Casualties: ${german_casualties}`,
    ...vgrid(10, vgrid_height - 100),
  );
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
  resources = Math.min(
    resources + (67 + (roundNum ^ (0.85 * 20))),
    max_resources,
  );
  opponent.resources = Math.min(
    opponent.resources + (67 + (roundNum ^ (0.85 * 20))),
    max_resources,
  );
  console.log("resources updated to:", resources, opponent.resources);
}

function addResources(amount) {
  resources = Math.min(Math.round(resources + amount), max_resources);
}

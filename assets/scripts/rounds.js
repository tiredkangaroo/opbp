var roundNumber = 0;

// function drawRoundInfo() {
//   fill(0, 0, 0, 170);
//   rect(...vgrid(10, vgrid_height - 200), ...vgrid(300, 120));
//   fill(255);
//   textSize(16);
//   text(`Round ${roundNumber}`, ...vgrid(15, vgrid_height - 180));
// }

function advanceRound() {
  // begin play logic
  for (const unit of units) {
    console.log(unit.x, unit.y, "advancing to", unit.x + 50, unit.y + 30);
    unit.addProposedAction({
      type: "move",
      targetX: unit.x + 50,
      targetY: unit.y + 30,
    });
    unit.doProposedActions();
  }
  roundNumber += 1;
  document.getElementById("current-round-display").innerText = roundNumber;
  updateResourcesForNewRound(roundNumber);
}

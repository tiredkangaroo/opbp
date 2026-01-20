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
    unit.doProposedActions();
  }
  roundNumber += 1;
  document.getElementById("current-round-display").innerText = roundNumber;
  updateResourcesForNewRound(roundNumber);
  updateUnitsListUI();
}

// function drawRoundInfo() {
//   fill(0, 0, 0, 170);
//   rect(...vgrid(10, vgrid_height - 200), ...vgrid(300, 120));
//   fill(255);
//   textSize(16);
//   text(`Round ${roundNumber}`, ...vgrid(15, vgrid_height - 180));
// }

class Rounds {
  constructor() {
    this.roundNumber = 0;
    this.inProgress = false;
    this.wg = 0; // waitgroups for round before it can end
  }

  advanceRound() {
    this.inProgress = true;
    let j = 0;
    for (const unit of units) {
      if (unit.belongsTo === playingAs) {
        console.log("Disabling unit controls for ", unit.name);
        document.getElementById("move-unit-button-" + j).disabled = true;
        document.getElementById("remove-unit-button-" + j).disabled = true;
        j++;
      }
      unit.doProposedActions();
    }
    this.roundNumber += 1;
    document.getElementById("current-round-display").innerText =
      this.roundNumber;
    updateResourcesForNewRound(this.roundNumber);
    updateUnitsListUI();
  }

  wgAdd() {
    this.wg += 1;
  }
  wgDone() {
    this.wg -= 1;
  }

  canEndRound() {
    return this.wg <= 0; // if ts is less than 0, ur fried potato
  }
  onRoundEnd(callback) {
    // calls callback when current round ends
    let checkInterval = setInterval(() => {
      if (this.canEndRound()) {
        clearInterval(checkInterval);
        this.inProgress = false;
        if (unit.belongsTo === playingAs) {
          document.getElementById("move-unit-button-" + j).disabled = false;
          document.getElementById("remove-unit-button-" + j).disabled = false;
          j++;
        }
        callback();
      }
    }, 100);
  }
}

var rounds = new Rounds();

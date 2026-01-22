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
    this.watchRound();
    let j = 0;
    for (const unit of units) {
      if (unit.belongsTo === playingAs) {
        console.log("Disabling unit controls for ", unit.name);
        document.getElementById("move-unit-button-" + j).disabled = true;
        document.getElementById("remove-unit-button-" + j).disabled = true;
        j++;
      }
      unit.handleAdvanceRound();
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

  watchRound() {
    if (!this.inProgress) {
      return;
    }

    // see if any opposing units come into contact range
    for (const unit of units.filter((u) => u.belongsTo === playingAs)) {
      const unitFlagDimensions = getFlagDimensions(
        unit.belongsTo,
        unit.getFlagScale(),
      );
      const unitWidth = unitFlagDimensions.width;
      const unitHeight = unitFlagDimensions.height;

      for (const otherUnit of units.filter((u) => u.belongsTo !== playingAs)) {
        if (unit.name == otherUnit.name) {
          continue;
        }
        const otherUnitFlagDimensions = getFlagDimensions(
          otherUnit.belongsTo,
          otherUnit.getFlagScale(),
        );
        const otherUnitWidth = otherUnitFlagDimensions.width;
        const otherUnitHeight = otherUnitFlagDimensions.height;

        const distanceX = Math.abs(unit.x - otherUnit.x);
        const distanceY = Math.abs(unit.y - otherUnit.y);
        if (
          distanceX < (unitWidth + otherUnitWidth) / 2 &&
          distanceY < (unitHeight + otherUnitHeight) / 2
        ) {
          console.log(
            `Unit ${unit.name} has come into contact with opposing unit ${otherUnit.name}`,
          );
          fill(255, 0, 0);
          resolveCombatFrame(unit, otherUnit);
        }
      }
    }
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

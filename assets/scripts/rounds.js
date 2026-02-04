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

    this.conflicts = [];
  }

  advanceRound() {
    if (this.inProgress) {
      console.log("Cannot advance round, round already in progress.");
      return;
    }

    const roundCost = calculateRoundCost();
    displayRoundCost(); // should've already been displayed but doesn't hurt
    if (roundCost > resources) {
      alert(
        "Not enough resources to advance round! (Hint: move less and/or smaller units, or remove some units)",
      );
      return;
    }
    addResources(-roundCost); // deduct round cost

    this.inProgress = true;
    updateUnitsListUI();
    opponent.proposeOpposingActions();
    for (const [index, unit] of units.entries()) {
      if (unit.belongsTo === playingAs) {
        console.log(
          "Disabling unit controls for ",
          unit.name,
          " at index ",
          index,
        );
        document.getElementById("move-unit-button-" + index).disabled = true;
        document.getElementById("remove-unit-button-" + index).disabled = true;
      }
      unit.handleAdvanceRound();
    }
    this.roundNumber += 1;
    document.getElementById("current-round-display").innerText =
      this.roundNumber;
    this.watchRound();
    updateUnitsListUI();
  }

  wgAdd() {
    this.wg += 1;
    console.log("wg add called, now value:", this.wg);
  }
  wgDone() {
    this.wg -= 1;
    console.log("wg done called, now value:", this.wg);
  }

  canEndRound() {
    return this.wg <= 0; // if ts is less than 0, ur fried potato
  }

  watchRound() {
    if (!this.inProgress) {
      return;
    }

    // draw every conflict
    for (const conflict of this.conflicts) {
      const resolved = conflict.resolveFrame();
      if (resolved) {
        // remove conflict from list
        this.conflicts = this.conflicts.filter((c) => c !== conflict);
        console.log(
          "Conflict between ",
          conflict.myUnit.name,
          " and ",
          conflict.enemyUnit.name,
          " resolved.",
        );
        this.wgDone(); // each conflict counts as part of the wg
      }
      conflict.frame += 1;
    }

    // see if any opposing units come into contact range
    for (const unit of units.filter((u) => u.belongsTo === playingAs)) {
      for (const otherUnit of units.filter((u) => u.belongsTo !== playingAs)) {
        if (areTwoUnitsInContact(unit, otherUnit)) {
          // check if a conflict is already ongoing between these units
          let conflictOngoing = false;
          for (const conflict of this.conflicts) {
            if (conflict.myUnit == unit && conflict.enemyUnit === otherUnit) {
              conflictOngoing = true;
              break;
            }
          }

          if (!conflictOngoing) {
            console.log(
              "Starting conflict between ",
              unit.name,
              " and ",
              otherUnit.name,
            );
            const newConflict = new Conflict(unit, otherUnit);
            this.wgAdd();
            this.conflicts.push(newConflict);

            // remove any proposed movements for these units this round
            unit.proposedActions = unit.proposedActions.filter(
              (action) => action.type !== "move",
            );
            otherUnit.proposedActions = otherUnit.proposedActions.filter(
              (action) => action.type !== "move",
            );
          }
        }
      }
    }

    if (this.canEndRound()) {
      console.log("Round can end now.");
      this.inProgress = false;
      updateResourcesForNewRound(this.roundNumber);
      return;
    }

    updateUnitsListUI();
  }

  // what does he even do? commented out lol
  // onRoundEnd(callback) {
  //   // calls callback when current round ends
  //   let checkInterval = setInterval(() => {
  //     if (this.canEndRound()) {
  //       clearInterval(checkInterval);
  //       this.inProgress = false;
  //       if (unit.belongsTo === playingAs) {
  //         document.getElementById("move-unit-button-" + j).disabled = false;
  //         document.getElementById("remove-unit-button-" + j).disabled = false;
  //         j++;
  //       }
  //       callback();
  //     }
  //   }, 100);
  // }
}

var rounds = new Rounds();

class Conflict {
  constructor(myUnit, enemyUnit) {
    this.myUnit = myUnit;
    this.enemyUnit = enemyUnit;
    this.frame = 0;
  }
  resolveFrame() {
    // check if the units are still in contact
    if (!areTwoUnitsInContact(this.myUnit, this.enemyUnit)) {
      console.log(
        "conflict resolved as a result of no contact",
        this.myUnit.name,
        this.enemyUnit.name,
      );
      return true; // conflict resolved
    }
    if (this.frame > maximumFrameRate / 2) {
      console.log(
        "conflict done for this round by time",
        this.myUnit.name,
        this.enemyUnit.name,
      );
      // resolve combat for a half second
      return true;
    }

    // this should be good? or horribly unbalanced, who even knows atp
    const myAttackPower =
      (this.myUnit.size / 50) ** 0.9 *
        this.myUnit.attack *
        (1 + this.myUnit.stamina / 10) +
      Math.random() * this.myUnit.size;
    const enemyAttackPower =
      (this.enemyUnit.size / 50) ** 0.9 *
        this.enemyUnit.attack *
        (1 + this.enemyUnit.stamina / 10) +
      Math.random() * this.enemyUnit.size;

    const startingEnemyUnitSize = this.enemyUnit.size;
    this.enemyUnit.size = Math.round(
      this.enemyUnit.size - (myAttackPower || 1) / 10,
    ); // the 10 is arbitray
    const startingMyUnitSize = this.myUnit.size;
    this.myUnit.size = Math.round(
      this.myUnit.size - (enemyAttackPower || 1) / 10,
    );

    const myLoss = startingMyUnitSize - this.myUnit.size;
    const enemyLoss = startingEnemyUnitSize - this.enemyUnit.size;
    if (playingAs === "france") {
      french_casualties += myLoss;
      german_casualties += enemyLoss;
    } else {
      german_casualties += myLoss;
      french_casualties += enemyLoss;
    }

    // include stamina hits (as a function of % of size lost)
    this.myUnit.stamina = Math.round(
      Math.max(
        // stamina ranges 1-5
        1,
        this.myUnit.stamina - (myLoss / startingMyUnitSize) * 5,
      ),
    );

    // include attack and speed hits (as a function of current stamina and size lost)

    // check if any unit has been defeated
    if (this.myUnit.size <= 10) {
      this.myUnit.destroy();
      console.log(this.myUnit.name, " has been defeated!");
      return true; // conflict resolved
    } else if (this.enemyUnit.size <= 10) {
      this.enemyUnit.destroy();
      console.log(this.enemyUnit.name, " has been defeated!");
      return true; // conflict resolved
    }

    return false; // conflict ongoing
  }
}

function areTwoUnitsInContact(unit, otherUnit) {
  const { width: w1, height: h1 } = getFlagDimensions(
    unit.belongsTo,
    unit.getFlagScale(),
  );

  const { width: w2, height: h2 } = getFlagDimensions(
    otherUnit.belongsTo,
    otherUnit.getFlagScale(),
  );

  return !(
    unit.x + w1 < otherUnit.x || // unit is left of other
    unit.x > otherUnit.x + w2 || // unit is right of other
    unit.y + h1 < otherUnit.y || // unit is above other
    unit.y > otherUnit.y + h2 // unit is below other
  );
}

function round(num, precision) {
  if (!precision) precision = 0;
  var pow = Math.pow(10, precision);
  return Math.round(num * pow) / pow;
}

function calculateRoundCost() {
  let totalCost = 0;

  for (const u of units.filter((u) => u.belongsTo === playingAs)) {
    // normalize
    const sizeScale = Math.sqrt(u.size / 100);

    // heavier exponential so moving big armies hurts
    const unitMovement = u.getProposedMovementDistanceThisRound();
    const movementFactor = (unitMovement || 0) / 100;

    const movementCost =
      Math.pow(sizeScale, 1.8) * Math.pow(movementFactor, 2.2) * 1.4;

    totalCost += calculateUpkeepCostForUnits([u]) + movementCost;
  }

  // round for cleaner resource numbers
  return Math.round(totalCost);
}

function calculateUpkeepCostForUnits(units) {
  let totalUpkeep = 0;
  for (const u of units) {
    const sizeScale = Math.sqrt(u.size / 100);
    const upkeepCost = Math.pow(sizeScale, 1.41);
    totalUpkeep += upkeepCost;
  }
  return totalUpkeep;
}

function displayRoundCost() {
  const roundCost = calculateRoundCost();
  document.getElementById("round-cost-display").innerText = roundCost;
  document.getElementById("upkeep-cost-display").innerText =
    calculateUpkeepCostForUnits(
      units.filter((u) => u.belongsTo === playingAs),
    ).toFixed(0);
}

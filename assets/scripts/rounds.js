class Rounds {
  constructor() {
    this.roundNumber = 0;
    this.inProgress = false;
    this.wg = 0; // waitgroups for round before it can end

    this.conflicts = [];
    this.historicalConflicts = []; // list of all conflicts that have occurred

    this.battleLog = [];
  }

  log(message, severe = false) {
    this.battleLog.push({ round: this.roundNumber, message: message, severe: severe });
    if (this.battleLog.length > 60) this.battleLog.shift();
    renderBattleLog();
  }

  advanceRound() {
    if (this.inProgress) {
      console.log("Cannot advance round, round already in progress.");
      return;
    }
    selectedUnit = null;
    document.getElementById("deploy-unit-position-display").innerText = "(not selected)";

    const roundCost = calculateRoundCost(playingAs);
    displayRoundCost();
    if (roundCost > resources) {
      toast(
        "Not enough resources to advance round! (Hint: move less and/or smaller units, or remove some units)",
      );
      return;
    }
    addResources(-roundCost); // deduct round cost
    opponent.addResources(-calculateRoundCost(opponent.playingas));

    this.inProgress = true;
    this.setPhaseUI(true);

    opponent.proposeOpposingActions();
    firePendingBarrages(); // artillery resolves before movement

    this.conflicts = [];
    for (const unit of units) {
      unit.handleAdvanceRound();
    }
    this.roundNumber += 1;
    document.getElementById("current-round-display").innerText = this.roundNumber;
    this.log(`--- Round ${this.roundNumber} ---`);
    this.watchRound();
  }

  setPhaseUI(executing) {
    const pill = document.getElementById("phase-pill");
    if (!pill) return;
    pill.textContent = executing
      ? "Executing Orders…"
      : `Planning Phase · Round ${this.roundNumber}`;
    pill.classList.toggle("executing", executing);
    const btn = document.getElementById("advance-round-btn");
    if (btn) {
      btn.disabled = executing;
      btn.textContent = executing ? "Orders In Progress…" : "Advance Round";
    }
  }

  wgAdd() {
    this.wg += 1;
  }
  wgDone() {
    this.wg -= 1;
  }

  canEndRound() {
    return this.wg <= 0;
  }

  watchRound() {
    if (!this.inProgress) {
      return;
    }

    // draw every conflict
    for (const conflict of this.conflicts) {
      conflict.myUnit.noMoveAnimation();
      conflict.enemyUnit.noMoveAnimation();

      const resolved = conflict.resolveFrame(this.conflicts);
      if (resolved) {
        this.conflicts = this.conflicts.filter((c) => c !== conflict);
        this.historicalConflicts.push({ ...conflict });
        this.wgDone();
      }
      conflict.frame += 1;
    }

    // check for new conflicts between opposing units
    for (const unit of units.filter((u) => u.belongsTo === playingAs)) {
      for (const otherUnit of units.filter((u) => u.belongsTo !== playingAs)) {
        if (!areTwoUnitsInContact(unit, otherUnit)) continue;
        const conflictOngoing = this.conflicts.some(
          (c) => c.myUnit == unit && c.enemyUnit === otherUnit,
        );
        if (!conflictOngoing) {
          const newConflict = new Conflict(unit, otherUnit);
          this.wgAdd();
          this.conflicts.push(newConflict);
        }
      }
    }

    if (this.canEndRound()) {
      this.endRound();
      return;
    }

    updateUnitsListUI();
  }

  endRound() {
    this.inProgress = false;
    this.setPhaseUI(false);

    // units have settled, so recompute the frontline from their final positions
    frontlineYs = calculateFrontline();
    frontlineYsRoundNumber = this.roundNumber;

    // victory point victory: control enough of the map's cities and the
    // enemy's war effort collapses
    const myVPs = victoryPointIncomeFor(playingAs);
    const enemyVPs = victoryPointIncomeFor(opponent.playingas);
    finalVictoryPoints.player = myVPs;
    finalVictoryPoints.opponent = enemyVPs;

    if (myVPs >= VICTORY_POINT_THRESHOLD) {
      this.log(
        `You now control ${Math.round(myVPs)} victory points. ${countryName(opponent.playingas)} sues for peace.`,
        true,
      );
      playingState = "won-victorypoints";
      units = [];
    }
    if (enemyVPs >= VICTORY_POINT_THRESHOLD) {
      this.log(
        `${countryName(opponent.playingas)} now controls ${Math.round(enemyVPs)} victory points. Your war effort collapses.`,
        true,
      );
      playingState = "lost-victorypoints";
      units = [];
    }
    if (playingState !== "playing") {
      return;
    }

    // income & logistics for the new round
    const playerIncome = countryIncome(playingAs, this.roundNumber);
    updateResourcesForNewRound(this.roundNumber);

    this.log(`Round ${this.roundNumber} concluded. Income received: +${playerIncome}.`);
    toast(`Round ${this.roundNumber} complete · +${playerIncome} resources`);

    updateUnitsListUI();
    updateArtilleryUI();
  }
}

var rounds = new Rounds();

class Conflict {
  constructor(myUnit, enemyUnit) {
    this.myUnit = myUnit;
    this.enemyUnit = enemyUnit;
    this.frame = 0;
    this.myCasualties = 0;
    this.enemyCasualties = 0;
  }
  conflictName() {
    return "Conflict between " + this.myUnit.name + " and " + this.enemyUnit.name;
  }
  resolveFrame(allConflicts) {
    if (!areTwoUnitsInContact(this.myUnit, this.enemyUnit)) {
      return true;
    }
    if (this.frame > maximumFrameRate / 2) {
      return true;
    }

    const mySupply = getUnitSupply(this.myUnit);
    const enemySupply = getUnitSupply(this.enemyUnit);
    let myAttackPower = combatPower(this.myUnit, this.enemyUnit, mySupply);
    let enemyAttackPower = combatPower(this.enemyUnit, this.myUnit, enemySupply);

    const otherConflictInvolvement = unitNamesInHowManyConflicts(allConflicts, [
      this.myUnit.name,
      this.enemyUnit.name,
    ]);
    if (otherConflictInvolvement[this.myUnit.name]) {
      myAttackPower = Math.pow(
        myAttackPower,
        Math.max(1 - 0.12 * otherConflictInvolvement[this.myUnit.name], 0.1),
      );
    }
    if (otherConflictInvolvement[this.enemyUnit.name]) {
      enemyAttackPower = Math.pow(
        enemyAttackPower,
        Math.max(1 - 0.12 * otherConflictInvolvement[this.enemyUnit.name], 0.1),
      );
    }

    const enemyLoss = Math.min(Math.round((myAttackPower || 1) / 11), this.enemyUnit.size);
    const myLoss = Math.min(Math.round((enemyAttackPower || 1) / 11), this.myUnit.size);
    this.enemyUnit.size = Math.round(this.enemyUnit.size - enemyLoss);
    this.myUnit.size = Math.round(this.myUnit.size - myLoss);

    this.myCasualties += myLoss;
    this.enemyCasualties += enemyLoss;
    addCasualties(this.myUnit.belongsTo, myLoss);
    addCasualties(this.enemyUnit.belongsTo, enemyLoss);

    if (rounds.roundNumber > (this.lastLoggedRound || 0)) {
      this.lastLoggedRound = rounds.roundNumber;
      rounds.log(`Battle: ${this.myUnit.shortName()} vs ${this.enemyUnit.shortName()}`);
    }

    const startingMyUnitSize = this.myUnit.size + myLoss;
    this.myUnit.stamina = Math.round(
      Math.max(1, this.myUnit.stamina - (myLoss / startingMyUnitSize) * 5),
    );

    if (this.myUnit.size <= 10) {
      this.myUnit.destroy();
      rounds.log(
        `${this.enemyUnit.shortName()} destroyed ${this.myUnit.shortName()}`,
        true,
      );
      return true;
    } else if (this.enemyUnit.size <= 10) {
      this.enemyUnit.destroy();
      rounds.log(
        `${this.myUnit.shortName()} destroyed ${this.enemyUnit.shortName()}`,
        true,
      );
      return true;
    }

    return false;
  }
}

function areTwoUnitsInContact(unit, otherUnit) {
  const { width: w1, height: h1 } = getFlagDimensions(unit.belongsTo, unit.getFlagScale());
  const { width: w2, height: h2 } = getFlagDimensions(otherUnit.belongsTo, otherUnit.getFlagScale());

  return !(
    unit.x + w1 < otherUnit.x ||
    unit.x > otherUnit.x + w2 ||
    unit.y + h1 < otherUnit.y ||
    unit.y > otherUnit.y + h2
  );
}

function round(num, precision) {
  if (!precision) precision = 0;
  const pow = Math.pow(10, precision);
  return Math.round(num * pow) / pow;
}

function combatPower(attacker, defender, supplyVal) {
  let power = Math.pow(attacker.size / 50, 0.9) * attacker.attack * (1 + attacker.stamina / 10);
  power *= supplyCombatMultiplier(attacker);
  const attackerHome = inWhatCountry(attacker.x, attacker.y) === attacker.belongsTo;
  const defenderHome = inWhatCountry(defender.x, defender.y) === defender.belongsTo;
  if (defenderHome && !attackerHome) power *= 0.82;
  if (!defenderHome && attackerHome) power *= 1.18;
  if (unitNearFriendlyFort(attacker)) power *= 1.2;
  if (unitNearFriendlyFort(defender)) power *= 0.7;
  power *= offenseMultiplierFor(attacker.belongsTo);
  if (defenderHome) power *= defenseMultiplierFor(attacker.belongsTo);
  power *= 0.92 + Math.random() * 0.16;
  return power;
}

function renderBattleLog() {
  const el = document.getElementById("battle-log-list");
  if (!el) return;
  el.innerHTML = rounds.battleLog
    .map((e) => {
      const severeClass = e.severe ? " severe" : "";
      return `<p class="battle-log-row"><span class="log-round${severeClass}">R${e.round}</span>${e.message}</p>`;
    })
    .slice(-40)
    .join("");
  el.scrollTop = el.scrollHeight;
}

function calculateRoundCost(country) {
  let totalCost = 0;

  for (const u of units.filter((u) => u.belongsTo === country)) {
    u.inContact = units.some(
      (other) => other.belongsTo !== u.belongsTo && areTwoUnitsInContact(u, other),
    );
    const pinned = u.inContact && u.proposedActions.some((a) => a.type === "move");
    const unitMovement = pinned ? 0 : u.getProposedMovementDistanceThisRound();

    totalCost += calculateUpkeepCostForUnits([u]) + calculateMovementCost(u, unitMovement);
  }

  return Math.round(totalCost);
}

function calculateMovementCost(unit, unitMovement) {
  const sizeScale = Math.sqrt(unit.size / 100);
  const movementFactor = (unitMovement || 0) / 100;
  const movementCost = Math.pow(sizeScale, 1.8) * Math.pow(movementFactor, 2.2) * 1.4 * movementCostMultiplierFor(unit);
  return movementCost;
}

function calculateUpkeepCostForUnits(unitsToCheck) {
  let totalUpkeep = 0;
  for (const u of unitsToCheck) {
    const currentLocation = inWhatCountry(u.x, u.y);
    const sizeScale = Math.sqrt(u.size / 100);
    const upkeepCost = Math.pow(sizeScale, currentLocation === u.belongsTo ? 0.9 : 1.41);
    totalUpkeep += upkeepCost;
  }
  return totalUpkeep;
}

let lastShownRoundCost = null;
let lastShownUpkeep = null;
function displayRoundCost() {
  const roundCost = calculateRoundCost(playingAs);
  const upkeep = Math.round(
    calculateUpkeepCostForUnits(units.filter((u) => u.belongsTo === playingAs)),
  );
  if (roundCost === lastShownRoundCost && upkeep === lastShownUpkeep) return;
  lastShownRoundCost = roundCost;
  lastShownUpkeep = upkeep;
  document.getElementById("round-cost-display").innerText = roundCost;
  document.getElementById("upkeep-cost-display").innerText = upkeep;
}

function unitNamesInHowManyConflicts(conflicts, unitNames) {
  const conflictCount = {};
  for (const conflict of conflicts) {
    if (unitNames.includes(conflict.myUnit.name)) {
      conflictCount[conflict.myUnit.name] = (conflictCount[conflict.myUnit.name] || 0) + 1;
    }
    if (unitNames.includes(conflict.enemyUnit.name)) {
      conflictCount[conflict.enemyUnit.name] = (conflictCount[conflict.enemyUnit.name] || 0) + 1;
    }
  }
  return conflictCount;
}
class Opponent {
  constructor(op_playingas, difficulty) {
    this.playingas = op_playingas;
    this.difficulty = difficulty; // range 1-3
    this.resources = 500; // starting resources for opponent
    this.unitsEverCreated = 4; // starts with 4 units
  }
  myUnits(allowGuardUnits = false) {
    return units.filter(
      (unit) =>
        unit.belongsTo === this.playingas &&
        (allowGuardUnits || !unit.isGuardUnit),
    );
  }
  myUnitsNotMoving(allowGuardUnits = false) {
    return units.filter(
      (unit) =>
        unit.belongsTo === this.playingas &&
        unit.proposedActions.filter((a) => a.type === "move").length === 0 &&
        (allowGuardUnits || !unit.isGuardUnit),
    );
  }
  proposeOpposingActions() {
    // right now, this function does not gaf about difficulty or what's actually happening in the game
    // it just makes random moves

    // check if any of player's unit is within a 120 pixel radius of the opponents's capital: panic
    const unitsNearCapital = units.filter(
      (unit) =>
        unit.belongsTo !== this.playingas &&
        Math.hypot(
          unit.x - capitals[this.playingas][1],
          unit.y - capitals[this.playingas][2],
        ) < 120,
    );
    if (unitsNearCapital.length > 0) {
      console.log(
        "opponent proposing actions to defend capital from nearby units",
        unitsNearCapital,
      );
      for (const unit of unitsNearCapital) {
        // move the closest unit to the capital towards the nearby unit
        const myUnits = this.myUnitsNotMoving(true);
        if (myUnits.length === 0) {
          break; // no units to move
        }
        for (const u of myUnits) {
          // can we affort to move this unit towards the nearby unit?
          if (
            calculateRoundCost(this.playingas) +
              Math.min(Math.hypot(u.x - unit.x, u.y - unit.y), u.speed * 6.7) <
            this.resources
          ) {
            // if yes, move!
            u.addProposedAction({
              type: "move",
              targetX: unit.x,
              targetY: unit.y,
            });
          } else {
            console.log(
              "opponent can't afford to move unit",
              u.name,
              "to defend capital",
            );
          }
        }

        // later i should add: removing small units in the capital (to free up space for stronger units to move in), merging units in the capital, and deploying new units in the capital
      }
    }

    var actionsDone = 0;
    const actionToDo = this.difficulty;
    while (actionsDone < actionToDo) {
      switch (randomInt(1, 15)) {
        case 1:
        case 2:
          console.log("oppoinent moving unit into own territory");

          // move a random unit into our territory
          let p = null;
          for (const unit of units) {
            // player unit in opponent territory
            if (
              unit.belongsTo === this.playingas &&
              inWhatCountry(unit.x, unit.y) === this.playingas
            ) {
              p = [unit.x, unit.y];
              break;
            }
          }
          if (p === null) {
            p = randomPointInFeature(
              this.playingas === "france" ? franceData : germanyData,
            );
          }

          const myUnits = this.myUnitsNotMoving();
          if (myUnits.length === 0) {
            break; // no units to move
          }
          const i = randomInt(0, myUnits.length - 1);
          const unit = myUnits[i];
          unit.addProposedAction({
            type: "move",
            targetX: p[0],
            targetY: p[1],
          });

          actionsDone++;
          break;
        case 3:
        case 4:
        case 5:
          console.log("opponent moving unit around in player territory");
          // move a unit around in opposiing (real player's) territory
          const opposing_point = randomPointInFeature(
            this.playingas === "france" ? germanyData : franceData,
          );
          const my_Units = this.myUnitsNotMoving();
          if (my_Units.length === 0) {
            break; // no units to move
          }
          const u = my_Units[randomInt(0, my_Units.length - 1)];
          u.addProposedAction({
            type: "move",
            targetX: opposing_point[0],
            targetY: opposing_point[1],
          });

          actionsDone++;
          break;
        case 6:
        case 7:
          console.log("deploying new unit for opponent");
          // deploy a new unit
          // look at our current resources
          if (this.resources <= MIN_COST * 4) {
            break; // can't afford enough
          }
          if (this.myUnits().length >= 12) {
            break; // don't deploy if we already have 12 units, otherwise it gets really laggy and too crowded
          }
          // between a quarter and a third of current resources except size and speed
          const size =
            Math.floor(
              ((this.resources / MAX_COST) * 10000) / randomInt(1, 2),
            ) || 100;
          const speed =
            Math.floor(((this.resources / MAX_COST) * 20) / randomInt(1, 2)) ||
            10;
          const attack =
            Math.floor(((this.resources / MAX_COST) * 10) / randomInt(1, 2)) ||
            1;
          const stamina =
            Math.floor(((this.resources / MAX_COST) * 5) / randomInt(3, 4)) ||
            1;
          const [x, y] = randomPointInFeature(
            this.playingas === "france" ? franceData : germanyData,
            1000,
          );
          console.log("deploying at:", x, y, size, speed, attack, stamina);
          const cost = getUnitDeployCost(size, speed, attack, stamina) || 50;
          if (cost > this.resources) {
            alert("check the console dawg");
            throw "damn im stupid";
          }
          console.log("current resources", this.resources, "cost", cost);
          this.resources -= cost;
          const newUnit = new Unit(
            x,
            y,
            getUnitName(this.unitsEverCreated, this.playingas),
            1,
            size,
            speed,
            attack,
            stamina,
            this.playingas,
          );
          console.log("deployed new unit for opponent:", newUnit);
          units.push(newUnit);
          this.unitsEverCreated++;
          actionsDone++;
          break;
        case 8:
          console.log(
            "opponent attempting to merge the first two units it can",
          );
          // find two units close to each other and merge them
          let merged = false;
          for (const u1 of this.myUnits(true)) {
            for (const u2 of this.myUnits(true)) {
              if (u1.name != u2.name && areTwoUnitsInContact(u1, u2)) {
                console.log("merging units", u1.name, u2.name);
                // merge u2 into u1 and pick the best stats
                u1.size += u2.size;
                u1.speed = Math.max(u1.speed, u2.speed);
                u1.attack = Math.max(u1.attack, u2.attack);
                u1.stamina = Math.max(u1.stamina, u2.stamina);
                console.log("merged unit:", u1);
                u2.destroy();
                console.log("destroyed unit:", u2);
                merged = true;
                break;
              }
            }
            if (merged) {
              break;
            }
          }
          actionsDone++;
          break;
        case 9:
          console.log("opponent attempting to split a unit");
          // split a random unit bigger than 6000 (6000 is arbitrary)
          const splittableUnits = this.myUnits().filter((u) => u.size >= 6000);
          if (splittableUnits.length === 0) {
            console.log("no splittable units found");
            break;
          }
          const unitToSplit =
            splittableUnits[randomInt(0, splittableUnits.length - 1)];
          const splitMultiplier = 0.4 + Math.random() * 0.2; // between 40% and 60%, i should make it like this in the other one instead of using max followed by min
          const splitSize = Math.round(unitToSplit.size * splitMultiplier);
          unitToSplit.size = unitToSplit.size - splitSize;
          const splitUnit = new Unit(
            unitToSplit.x + randomInt(-20, 20),
            unitToSplit.y + randomInt(-20, 20),
            getUnitName(this.unitsEverCreated, this.playingas),
            unitToSplit.level,
            splitSize,
            unitToSplit.speed,
            unitToSplit.attack,
            unitToSplit.stamina,
            this.playingas,
          );
          units.push(splitUnit);
          this.unitsEverCreated++;
          console.log("split unit into:", splitUnit);
          updateUnitsListUI();
          actionsDone++;
          break;
        case 10:
          // remove a unit under 4000 size in germany
          const mU = this.myUnits();
          if (mU.length <= 3) {
            // don't remove if we have 3 or fewer units
            break;
          }
          for (const unit of mU) {
            if (unit.size >= 4000) {
              continue;
            }
            if (inWhatCountry(unit.x, unit.y) !== this.playingas) {
              continue; // only remove units in our own territory
            }
            // remove unit
            this.addResources(
              // to make germany more cracked, we give then all the resources back from removing a unit, not just a third like we do for the player
              Math.round(
                getUnitDeployCost(
                  unit.size,
                  unit.speed,
                  unit.attack,
                  unit.stamina,
                ),
              ),
            );
            console.log("opponent removing unit:", unit);
            units = units.filter((u) => u.name !== unit.name);
            break;
          }
          updateUnitsListUI();
          actionsDone++;
          break;
        case 11:
        case 12:
        case 13:
        case 14:
          // find a random opponent unit and move a unit that has a larger size towards it
          const opponentUnits = units.filter(
            (u) => u.belongsTo !== this.playingas,
          );
          if (opponentUnits.length === 0) {
            break;
          }
          let targetUnit = null;
          let myUnit = null;
          for (const opposingUnit of opponentUnits) {
            // this allows the opponent to make blunders too if the opposing unit
            // has better stats and myUnit is just barely bigger, should be interesting
            const myLargerUnits = this.myUnitsNotMoving().filter(
              (u) => u.size > opposingUnit.size,
            );
            if (myLargerUnits.length === 0) {
              continue;
            }
            // move the closest larger unit towards the target unit
            let closestDist = Infinity;
            for (const m of myLargerUnits) {
              const dist = Math.sqrt(
                (m.x - opposingUnit.x) ** 2 + (m.y - opposingUnit.y) ** 2,
              );
              if (dist < closestDist) {
                closestDist = dist;
                myUnit = m;
              }
            }
            if (myUnit) {
              targetUnit = opposingUnit;
              break;
            }
          }
          if (targetUnit && myUnit) {
            console.log(
              "opponent moving unit",
              myUnit.name,
              "towards",
              targetUnit.name,
            );
            myUnit.addProposedAction({
              type: "move",
              targetX: targetUnit.x,
              targetY: targetUnit.y,
            });
          }
          actionsDone++;
          break;
        case 15:
        case 16:
          // get all units not moving larger than 6000 and move them to the opposing capital
          const bigUnits = this.myUnitsNotMoving().filter(
            (u) => u.size >= 6000,
          );
          if (bigUnits.length === 0) {
            break;
          }
          const capital =
            capitals[this.playingas === "france" ? "germany" : "france"];
          for (const unit of bigUnits) {
            console.log(
              "opponent moving big unit",
              unit.name,
              "towards opposing capital",
            );
            unit.addProposedAction({
              type: "move",
              targetX: capital[1],
              targetY: capital[2],
            });
          }
          actionsDone++;
          break;
        default:
          // do nothing
          console.log("opponent doing nothing");
          actionsDone++;
      }
    }
  }
  addResources(amount) {
    this.resources = Math.max(
      Math.min(Math.round(this.resources + amount), max_resources),
      0,
    );
  }
}

var opponent = new Opponent("germany", 6);

// ily stack overflow
function randomInt(min, max) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// returns distance to hit or null if no hit
function rayVsUnitBox(originX, originY, dirX, dirY, maxDist, otherUnit) {
  const flagScale = otherUnit.getFlagScale();
  const dims = getFlagDimensions(otherUnit.belongsTo, flagScale);

  const minX = otherUnit.x - dims.width;
  const maxX = otherUnit.x + dims.width;
  const minY = otherUnit.y - dims.height;
  const maxY = otherUnit.y + dims.height;

  // slab method for ray vs aabb
  const invDx = 1 / dirX;
  const invDy = 1 / dirY;

  let t1 = (minX - originX) * invDx;
  let t2 = (maxX - originX) * invDx;
  let t3 = (minY - originY) * invDy;
  let t4 = (maxY - originY) * invDy;

  const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));

  const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

  // no hit
  if (tmax < 0 || tmin > tmax) return null;

  // first hit distance
  if (tmin >= 0 && tmin <= maxDist) return tmin;

  return null;
}

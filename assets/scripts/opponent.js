class Opponent {
  constructor(op_playingas, difficulty) {
    this.playingas = op_playingas;
    this.difficulty = difficulty;
    this.resources = 275; // starting resources for opponent
    this.unitsEverCreated = 4; // starts with 4 units
  }
  myUnits() {
    return units.filter((unit) => unit.belongsTo === this.playingas);
  }
  myUnitsNotMoving() {
    return units.filter(
      (unit) =>
        unit.belongsTo === this.playingas &&
        unit.proposedActions.filter((a) => a.type === "move").length === 0,
    );
  }
  proposeOpposingActions() {
    // right now, this function does not gaf about difficulty or what's actually happening in the game
    // it just makes random moves
    for (let i = 0; i < 3; ) {
      switch (randomInt(0, 7)) {
        case 1:
          console.log("oppoinent moving unit into own territory");
          // move a random unit into our territory
          const p = randomPointInFeature(
            this.playingas === "france" ? franceData : germanyData,
          );
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
          break;
        case 2:
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
          break;
        case 3:
          console.log("deploying new unit for opponent");
          // deploy a new unit
          // look at our current resources
          if (this.resources <= MIN_COST) {
            break; // can't afford shi
          }
          // between a quarter and a third
          const size =
            Math.floor(
              ((this.resources / MAX_COST) * 10000) / randomInt(3, 4),
            ) || 100;
          const speed =
            Math.floor(((this.resources / MAX_COST) * 20) / randomInt(3, 4)) ||
            10;
          const attack =
            Math.floor(((this.resources / MAX_COST) * 10) / randomInt(3, 4)) ||
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
          break;
        case 4:
          console.log(
            "opponent attempting to merge the first two units it can",
          );
          // find two units close to each other and merge them
          let merged = false;
          for (const u1 of this.myUnits()) {
            for (const u2 of this.myUnits()) {
              if (u1.name != u2.name && areTwoUnitsInContact(u1, u2)) {
                console.log("merging units", u1.name, u2.name);
                // merge u2 into u1 and pick the best stats
                const i = units.indexOf(u1);
                u1.size += u2.size;
                u1.speed = Math.max(u1.speed, u2.speed);
                u1.attack = Math.max(u1.attack, u2.attack);
                u1.stamina = Math.max(u1.stamina, u2.stamina);
                units[i] = u1;
                // remove u2 from units
                units = units.filter((unit) => unit.name !== u2.name);
                updateUnitsListUI(); // must update unit lists ui bc indexes change in the units panel
                merged = true;
                break;
              }
              if (merged) {
                break;
              }
            }
          }
          break;
        case 5:
          console.log("opponent attempting to split a unit");
          // split a random unit bigger than 2500 (2500 is arbitrary)
          const splittableUnits = this.myUnits().filter((u) => u.size >= 2500);
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
          break;
        case 6:
          // remove a units under 2500 size in germany
          const mU = this.myUnits();
          if (mU.length <= 1) {
            break;
          }
          for (const unit of mU) {
            if (unit.size >= 2500) {
              continue;
            }
            // remove unit
            this.addResources(
              Math.round(
                getUnitDeployCost(
                  unit.size,
                  unit.speed,
                  unit.attack,
                  unit.stamina,
                ) / 3,
              ),
            );
            console.log("opponent removing unit:", unit);
            units = units.filter((u) => u.name !== unit.name);
            break;
          }
          updateUnitsListUI();
          break;
      }
      i++;
    }
  }
  addResources(amount) {
    this.resources = Math.max(
      Math.min(Math.round(this.resources + amount), max_resources),
      0,
    );
  }
}

var opponent = new Opponent("germany", "medium");

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

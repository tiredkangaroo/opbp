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
      switch (randomInt(1, 4)) {
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
          // between half and all resources
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
            Math.floor(((this.resources / MAX_COST) * 5) / randomInt(1, 2)) ||
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
          console.log("opponent skips round");
          // do nothing
          break;
      }
      i++;
    }
  }
}

var opponent = new Opponent("germany", "medium");

// ily stack overflow
function randomInt(min, max) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

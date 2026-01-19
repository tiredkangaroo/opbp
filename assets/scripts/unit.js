const MIN_COST = 50;
const MAX_COST = 500;

// {
//     type: "move",
//     // data for action type
//     targetX: 100,
//     targetY: 150,
// }

class Unit {
  constructor(x, y, level, size, speed, attack, stamina, belongsTo) {
    // x and y are in virtual grid coords
    this.x = x;
    this.y = y;
    this.level = level; // level 1, 2, 3
    this.size = size; // # troops
    this.speed = speed; // range 10-20
    this.attack = attack;
    this.stamina = stamina;
    this.belongsTo = belongsTo; // "france" or "germany"
    this.proposedActions = [];
    this.continuingActions = false;
  }

  draw() {
    // const [width, height] =
    push();

    // level text above unit
    fill(255);
    text(`Level ${this.level}`, this.x - 5, this.y - 5);

    // draw flag representing unit
    const flagScale = Math.min(2, 1 + this.size / 10000);
    drawFlag(this.belongsTo, this.x, this.y, flagScale);

    // if mouse is over unit, show unit info box
    if (mouseInBox(this.x, this.y, 30, 30)) {
      fill(0, 0, 0, 200);
      rect(mouseX + 10, mouseY + 10, 120, 70);
      fill(255);
      textSize(12);
      text(`Size: ${this.size}`, mouseX + 15, mouseY + 25);
      text(`Speed: ${this.speed}`, mouseX + 15, mouseY + 40);
      text(`Attack: ${this.attack}`, mouseX + 15, mouseY + 55);
      text(`Stamina: ${this.stamina}`, mouseX + 15, mouseY + 70);
    }

    pop();
  }

  addProposedAction(action) {
    this.proposedActions.push(action);
  }

  doProposedActions() {
    const newActions = [];
    for (const action of [...this.proposedActions]) {
      // process action
      switch (action.type) {
        case "move":
          this.doMoveAction(action);
          break;
        default:
          console.warn("unknown action type:", action.type);
      }
    }
    this.proposedActions = newActions; // set proposed actions to any remaining actions (incomplete actions to do next round)
  }

  doMoveAction(action) {
    this.continuingActions = true;
    const deltaX = action.targetX - this.x;
    const deltaY = action.targetY - this.y;
    // calculate how much the unit can do this round (based on speed)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistanceThisRound = this.speed * 6.7; // arbitrary multiplier for speed to distance (if speed is 10, user can move 67 distance per round). this just means that a round is 6.7 time units long
    const scale = Math.min(1, maxDistanceThisRound / distance);
    const finalDeltaX = deltaX * scale;
    const finalDeltaY = deltaY * scale;

    const steps = 40; // number of animation steps
    this.moveUnitTo(steps, finalDeltaX, finalDeltaY);

    // after moving, if we didn't reach the target, add another move action
    if (scale < 1) {
      console.log(
        "unit did not reach target, adding new action",
        distance,
        maxDistanceThisRound,
      );
      const remainingDeltaX = deltaX - finalDeltaX;
      const remainingDeltaY = deltaY - finalDeltaY;
      newActions.push({
        type: "move",
        targetX: this.x + remainingDeltaX,
        targetY: this.y + remainingDeltaY,
      });
    }
  }

  // i is a countdown of how many times the function has been called
  moveUnitTo(i, deltaX, deltaY) {
    if (i == 0) {
      console.log("moved", this.x, this.y, deltaX, deltaY);
      return;
    }
    this.x += deltaX / 40;
    this.y += deltaY / 40;
    setTimeout(() => {
      this.moveUnitTo(i - 1, deltaX, deltaY);
    }, 25);
  }
}

function deployUnit() {
  const { size, speed, attack, stamina } = getDeployUnitSpecs();

  const positionRaw = document.getElementById(
    "deploy-unit-position-display",
  ).textContent;
  const positionMatch = positionRaw.match(/\((\d+), (\d+)\)/);
  if (!positionMatch) {
    alert("Please select a valid position for the unit!");
    return;
  }
  const x = parseInt(positionMatch[1]);
  const y = parseInt(positionMatch[2]);

  const cost = getUnitDeployCost(size, speed, attack, stamina);
  if (cost > resources) {
    alert("Not enough resources to deploy unit!");
    return;
  }
  resources -= cost;

  units.push(new Unit(x, y, 1, size, speed, attack, stamina, playingAs));
}

function getUnitDeployCost(size, speed, attack, stamina) {
  // let's hope ts is balanced
  const sizeNorm = (size - 100) / (10000 - 100);
  const speedNorm = (speed - 10) / (20 - 10);
  const attackNorm = (attack - 1) / (10 - 1);
  const staminaNorm = (stamina - 1) / (5 - 1);
  const power =
    sizeNorm * 0.35 + attackNorm * 0.3 + speedNorm * 0.2 + staminaNorm * 0.15;
  const curvedPower = Math.pow(power, 1.3); // nonlinear curve to avoid spamming units
  const cost = Math.round(MIN_COST + curvedPower * (MAX_COST - MIN_COST));
  return cost;
}

function calculateDeployUnitCost() {
  const { size, speed, attack, stamina } = getDeployUnitSpecs();
  const cost = getUnitDeployCost(size, speed, attack, stamina);

  // update deploy-unit-cost-display
  document.getElementById("deploy-unit-cost-display").innerText = `${cost}`;
}

function getDeployUnitSpecs() {
  // deploy-unit-size-input, deploy-unit-speed-input, deploy-unit-attack-input, deploy-unit-stamina-input
  const size = parseInt(
    // range 100-10000
    document.getElementById("deploy-unit-size-input").value,
  );
  const speed = parseInt(
    // range 10-20
    document.getElementById("deploy-unit-speed-input").value,
  );
  const attack = parseInt(
    // range 1-10
    document.getElementById("deploy-unit-attack-input").value,
  );
  const stamina = parseInt(
    // range 1-5
    document.getElementById("deploy-unit-stamina-input").value,
  );
  return { size, speed, attack, stamina };
}

function selectDeployUnitPosition() {
  mouseClickHandler = null;
  setTimeout(() => {
    document.getElementById("deploy-unit-position-display").textContent =
      "(click on map)";
    mouseClickHandler = () => {
      const mousePosition = vgrid(mouseX, mouseY);
      mousePosition[0] = Math.round(mousePosition[0]);
      mousePosition[1] = Math.round(mousePosition[1]);
      document.getElementById("deploy-unit-position-display").textContent =
        `(${mousePosition[0]}, ${mousePosition[1]})`;
      mouseClickHandler = null;
    };
  }, 500);
}

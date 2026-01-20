const MIN_COST = 50;
const MAX_COST = 500;
let unitsEverDeployed = 0;
// {
//     type: "move",
//     // data for action type
//     targetX: 100,
//     targetY: 150,
// }

class Unit {
  constructor(x, y, name, level, size, speed, attack, stamina, belongsTo) {
    // x and y are in virtual grid coords
    this.x = x;
    this.y = y;
    this.name = name;
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
    const flagScale = Math.min(1.56, 1 + this.size / 10000);
    const flagDimensions = getFlagDimensions(this.belongsTo, flagScale);
    drawFlag(this.belongsTo, this.x, this.y, flagScale);

    // if mouse is over unit, show unit info box
    if (mouseInBox(this.x, this.y, 30, 30)) {
      fill(0, 0, 0, 200);
      rect(mouseX + 10, mouseY + 10, 135, 90);
      fill(255);
      textSize(12);
      text(`${this.name}`, mouseX + 15, mouseY + 25);
      text(`Size: ${this.size}`, mouseX + 15, mouseY + 40);
      text(`Speed: ${this.speed}`, mouseX + 15, mouseY + 55);
      text(`Attack: ${this.attack}`, mouseX + 15, mouseY + 70);
      text(`Stamina: ${this.stamina}`, mouseX + 15, mouseY + 85);
    }

    // see if unit has movement and we'll draw an error to the target location
    for (const action of [...this.proposedActions]) {
      if (action.type != "move") {
        continue;
      }
      // draw line to target
      stroke(0, 0, 0);
      strokeWeight(4);
      drawArrow(
        createVector(
          ...realgrid(
            this.x + flagDimensions.width,
            this.y + flagDimensions.height / 2,
          ),
        ),
        createVector(
          ...realgrid(
            action.targetX - (this.x + flagDimensions.width),
            action.targetY - (this.y + flagDimensions.height / 2),
          ),
        ),
        color(0, 0, 0),
      );
      break;
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
          const na = this.doMoveAction(action);
          newActions.push(...na);
          break;
        default:
          console.warn("unknown action type:", action.type);
      }
    }
    this.proposedActions = newActions; // set proposed actions to any remaining actions (incomplete actions to do next round)
  }

  doMoveAction(action) {
    const newActions = [];
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
    return newActions;
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

  units.push(
    new Unit(
      x,
      y,
      getUnitName(unitsEverDeployed, playingAs),
      1,
      size,
      speed,
      attack,
      stamina,
      playingAs,
    ),
  );

  unitsEverDeployed += 1;

  // update units list in UI
  updateUnitsListUI();
}

function updateUnitsListUI() {
  console.log("updating units list UI");
  const unitsListDiv = document.getElementById("units-list");
  unitsListDiv.innerHTML = "";

  units.forEach((unit, index) => {
    // where is the unit?
    let currentLocation = "unknown";
    if (pointInCountry(unit.x, unit.y, franceData)) {
      currentLocation = "France";
    } else if (pointInCountry(unit.x, unit.y, germanyData)) {
      currentLocation = "Germany";
    }
    unitsListDiv.innerHTML += `<div class="unit-item">
      <strong>${unit.name}</strong><br/>
      <p><b>Location</b>: ${currentLocation}</p>
      <p><b>Size</b>: ${unit.size}, <b>Speed</b>: ${unit.speed}, <b>Attack</b>: ${unit.attack}, <b>Stamina</b>: ${unit.stamina}</p>
      <div class="unit-actions">
        <button id="move-unit-button-${index}">Move</button>
        <button id="remove-unit-button-${index}">Remove</button>
      </div>
    </div>`;
  });

  for (let i = 0; i < units.length; i++) {
    const u = units[i];

    // move unit button
    document.getElementById(`move-unit-button-${i}`).onclick = () => {
      // select new position
      mouseClickHandler = null;
      setTimeout(() => {
        document.getElementById(`move-unit-button-${i}`).textContent =
          "(click on map to move unit)";
        mouseClickHandler = () => {
          if (!pointInMap(mouseX, mouseY)) {
            alert("Please select a position on the map!");
            return;
          }
          const mousePosition = vgrid(mouseX, mouseY);
          mousePosition[0] = Math.round(mousePosition[0]);
          mousePosition[1] = Math.round(mousePosition[1]);
          document.getElementById(`move-unit-button-${i}`).textContent = `Move`;

          // move unit to new position

          u.proposedActions = u.proposedActions.filter(
            (action) => action.type !== "move",
          ); // if a unit has a move action, remove that action

          u.addProposedAction({
            type: "move",
            targetX: mousePosition[0],
            targetY: mousePosition[1],
          });
          mouseClickHandler = null;
        };
      }, 250);
    };

    // remove unit button
    document.getElementById(`remove-unit-button-${i}`).onclick = () => {
      // remove unit from units array
      units.splice(i, 1);
      // return some resources
      addResources(getUnitDeployCost(u.size, u.speed, u.attack, u.stamina) / 3); // refund 1/3rd of deploy cost (using units in battle will also wear down speed, attack, stamina and size so you'll get even less back)

      // update UI
      updateUnitsListUI();
    };
  }
}

function getUnitName(currentNumberOfUnits, unitCountry) {
  // 1st 2nd 3rd 4th 5th
  const numberStr = (currentNumberOfUnits + 1).toString();
  const lastDigit = numberStr[numberStr.length - 1];

  let numberWithSuffix = "";
  switch (lastDigit) {
    case "1":
      numberWithSuffix = `${numberStr}st`;
      break;
    case "2":
      numberWithSuffix = `${numberStr}nd`;
      break;
    case "3":
      numberWithSuffix = `${numberStr}rd`;
      break;
    default:
      numberWithSuffix = `${numberStr}th`;
  }
  return `${numberWithSuffix} ${unitCountry == "france" ? "French" : "German"} Army Unit`;
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
      if (!pointInMap(mouseX, mouseY)) {
        alert("Please select a position on the map!");
        return;
      }
      const mousePosition = vgrid(mouseX, mouseY);
      mousePosition[0] = Math.round(mousePosition[0]);
      mousePosition[1] = Math.round(mousePosition[1]);
      document.getElementById("deploy-unit-position-display").textContent =
        `(${mousePosition[0]}, ${mousePosition[1]})`;
      mouseClickHandler = null;
    };
  }, 250);
}

function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(3);
  fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 7;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}

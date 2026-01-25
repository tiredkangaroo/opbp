const MIN_COST = 50;
const MAX_COST = 500;
let unitsEverDeployed = 3; // three because starts with 3 units
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

    this.animation = false;
    this.animStartX = 0;
    this.animStartY = 0;
    this.animTargetX = 0;
    this.animTargetY = 0;
    this.animProgress = 0; // 0 → 1
    this.animDuration = 40; // frames
  }

  getFlagScale() {
    return Math.min(1.56, 1 + this.size / 10000);
  }

  draw() {
    // const [width, height] =
    push();

    // draw flag representing unit
    const flagScale = this.getFlagScale();
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

      if (this.belongsTo === playingAs) {
        const movementIsTop = action.targetY < this.y; // check if target is above current position
        const startVectorX = this.x + flagDimensions.width / 2;
        const startVectorY = movementIsTop
          ? this.y - 2
          : this.y + flagDimensions.height + 2;
        drawArrow(
          createVector(...realgrid(startVectorX, startVectorY)),
          createVector(
            ...realgrid(
              action.targetX - startVectorX,
              action.targetY - startVectorY,
            ),
          ),
          color(0, 0, 0),
        );
        break;
      }
    }

    // level text above unit
    fill(255);
    textSize(14);
    text(`Level ${this.level}`, this.x - 5, this.y - 5);

    // animation portion
    if (!this.animating) return;

    this.animProgress++;

    const t = this.animProgress / this.animDuration;
    const clamped = Math.min(t, 1);

    this.x = lerp(this.animStartX, this.animTargetX, clamped);
    this.y = lerp(this.animStartY, this.animTargetY, clamped);

    if (clamped >= 1) {
      console.log("finished animation for", this.name);
      rounds.wgDone();
      this.animating = false;
      this.x = this.animTargetX;
      this.y = this.animTargetY;
    }
    updateUnitsListUI();

    pop();
  }

  addProposedAction(action) {
    this.proposedActions.push(action);
    updateUnitsListUI();
  }

  handleAdvanceRound() {
    // level up!!
    if (this.proposedActions.length === 0) {
      if (this.level >= 10) return; // max level reached
      this.stamina = Math.round(Math.min(this.stamina + 0.8, 5));
      this.attack = Math.round(Math.min(this.attack + 0.8, 10));
      this.speed = Math.round(Math.min(this.speed + 0.8, 20));
      this.level = Math.min(this.level + 1, 10);
      return;
    }

    const newActions = [];
    for (const action of [...this.proposedActions]) {
      // process action
      switch (action.type) {
        case "move":
          const na = this.doMoveAction(action);
          this.levelDown(0.1);
          newActions.push(...na);
          break;
        default:
          console.warn("unknown action type:", action.type);
      }
    }
    this.proposedActions = newActions; // set proposed actions to any remaining actions (incomplete actions to do next round)
  }

  levelDown(scale) {
    this.stamina = Math.round(Math.max(1, this.stamina - 1 * scale));
    this.attack = Math.round(Math.max(1, this.attack - 1 * scale));
    this.speed = Math.round(Math.max(10, this.speed - 1 * scale));
  }

  doMoveAction(action) {
    const newActions = [];

    const deltaX = action.targetX - this.x;
    const deltaY = action.targetY - this.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) return newActions;

    const maxDistanceThisRound = this.speed * 6.7;
    const travel = Math.min(distance, maxDistanceThisRound);

    const ratio = travel / distance;

    const moveX = deltaX * ratio;
    const moveY = deltaY * ratio;

    // FIXED: snapshot start & target
    this.startMoveAnimation(this.x, this.y, this.x + moveX, this.y + moveY);

    // If not finished, queue next round's move
    if (travel < distance) {
      newActions.push({
        type: "move",
        targetX: action.targetX,
        targetY: action.targetY,
      });
    }

    return newActions;
  }

  startMoveAnimation(x0, y0, x1, y1) {
    this.animating = true;
    console.log("starting move animation", this.name);
    rounds.wgAdd();
    this.animStartX = x0;
    this.animStartY = y0;
    this.animTargetX = x1;
    this.animTargetY = y1;
    this.animProgress = 0;
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

  destroy() {
    // clean up and remove from units array
    if (this.animating) {
      rounds.wgDone();
    }
    units = units.filter((u) => u.name !== this.name);
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
    if (unit.belongsTo !== playingAs) return;

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
      <div>
      ${unit.proposedActions
        .map((action, actionIdx) => {
          if (action.type === "move") {
            return `<p><i>Proposed Action</i>: Move to (${action.targetX}, ${action.targetY})<button style="margin-left: 4px;" onclick="units[${index}].proposedActions.splice(${actionIdx}, 1); updateUnitsListUI();">Cancel</button></p>`;
          } else {
            // shouldn't ever happen unless im dumb
            return `<p><i>Proposed Action</i>: Unknown action</p>`;
          }
        })
        .join("")}
      <div style="margin-top: 4px;">
        <button id="move-unit-button-${index}">Move</button>
        <button id="remove-unit-button-${index}">Remove</button>
      </div>
    </div>`;
  });

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.belongsTo !== playingAs) continue;

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
      if (
        !pointInCountry(
          mouseX,
          mouseY,
          playingAs == "france" ? franceData : germanyData,
        )
      ) {
        alert(`Please select a position within ${playingAs}!`);
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

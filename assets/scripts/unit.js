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
    this.isGuardUnit = name.includes("Guard");

    this.animation = false;
    this.animStartX = 0;
    this.animStartY = 0;
    this.animTargetX = 0;
    this.animTargetY = 0;
    this.animProgress = 0; // 0 → 1
    this.animDuration = 40; // frames

    this.cachedOccupationPolygon = null;
    this.cachedOccupationFromRound = -1;
  }

  getFlagScale() {
    return Math.min(2.2, 0.0067 * Math.sqrt(this.size) + 0.8);
  }

  draw() {
    // const [width, height] =
    push();

    // draw flag representing unit
    const flagScale = this.getFlagScale();
    const flagDimensions = getFlagDimensions(this.belongsTo, flagScale);
    drawFlag(this.belongsTo, this.x, this.y, flagScale);

    // if mouse is over unit, show unit info box
    if (
      mouseInBox(this.x, this.y, flagDimensions.width, flagDimensions.height)
    ) {
      push();
      fill(0, 0, 0, 200);
      rect(mouseX + 10, mouseY + 10, 135, 90);
      fill(255);
      textSize(12);
      text(`${this.name}`, mouseX + 15, mouseY + 25);
      text(`Size: ${this.size}`, mouseX + 15, mouseY + 40);
      text(`Speed: ${this.speed}`, mouseX + 15, mouseY + 55);
      text(`Attack: ${this.attack}`, mouseX + 15, mouseY + 70);
      text(`Stamina: ${this.stamina}`, mouseX + 15, mouseY + 85);

      // scroll the Your Units box to the unit info if hovering over the unit
      if (this.belongsTo === playingAs) {
        const unitIndex = units
          .filter((u) => u.belongsTo === playingAs)
          .findIndex((u) => u.name === this.name);
      }
      pop();
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
    push();
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(this.shortName(), this.x + flagDimensions.width / 2, this.y - 10);
    pop();

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
    displayRoundCost(); // moved to different location = different upkeep costs

    pop();
  }

  shortName() {
    if (this.name.includes("Guard")) {
      // return capitals[this.belongsTo][0] + " Guard";
      return this.name.split(" ")[0] + " Guard";
    }
    const nameSplit = this.name.split(" ");
    return nameSplit[0] + " " + nameSplit[3];
  }

  addProposedAction(action) {
    this.proposedActions.push(action);
    updateUnitsListUI();
    displayRoundCost();
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
      this.cachedOccupationPolygonDirty = true;
      this.moveUnitTo(i - 1, deltaX, deltaY);
    }, 25);
  }

  getProposedMovementDistanceThisRound() {
    // it's maximum: speed * 6.7, but it could be less if the unit is moving less far
    let totalProposedMovement = 0;
    for (const action of this.proposedActions) {
      if (action.type !== "move") continue;
      const deltaX = action.targetX - this.x;
      const deltaY = action.targetY - this.y;
      const distance = Math.hypot(deltaX, deltaY);
      totalProposedMovement += distance; // cumulative distance (fancy vocab)
    }
    return Math.min(totalProposedMovement, this.speed * 6.7);
  }

  destroy() {
    // clean up and remove from units array
    if (this.animating) {
      rounds.wgDone();
    }
    units = units.filter((u) => u.name !== this.name);
    updateUnitsListUI();
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
  // calculate upkeep cost with new unit (btw i hate u prettier)
  if (
    cost +
      calculateUpkeepCostForUnits([
        ...units.filter((u) => u.belongsTo === playingAs),
        new Unit(0, 0, "", 1, size, speed, attack, stamina, playingAs),
      ]) >
    resources
  ) {
    alert(
      "You cannot afford the upkeep cost of this unit along with your existing units!",
    );
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
  displayRoundCost();
}

function updateUnitsListUI() {
  console.log("updating units list UI");
  const unitsListDiv = document.getElementById("units-list");
  unitsListDiv.innerHTML = "";

  const unitElements = [];
  units.forEach((unit, index) => {
    if (unit.belongsTo !== playingAs) return;

    // where is the unit?
    let currentLocation = "unknown";
    let isInEnemyTerritory = false;
    if (pointInCountry(unit.x, unit.y, franceData)) {
      currentLocation = "France";
      isInEnemyTerritory = playingAs === "germany";
    } else if (pointInCountry(unit.x, unit.y, germanyData)) {
      currentLocation = "Germany";
      isInEnemyTerritory = playingAs === "france";
    }

    // our units that are in contact with other of our own units
    var myUnitsInContact = [];
    for (const otherUnit of units) {
      if (otherUnit === unit) continue;
      if (otherUnit.belongsTo !== playingAs) continue;
      if (areTwoUnitsInContact(unit, otherUnit)) {
        myUnitsInContact.push(otherUnit.name);
      }
    }

    unitElements.push(`<div class="unit-item">
      <strong>${unit.name}</strong><br/>
      <p><b>Location</b>: ${currentLocation}</p>
      <p><b>Size</b>: ${unit.size}, <b>Speed</b>: ${unit.speed}, <b>Attack</b>: ${unit.attack}, <b>Stamina</b>: ${unit.stamina}</p>
      <div>
      ${unit.proposedActions
        .map((action, actionIdx) => {
          if (action.type === "move") {
            return `<p><i>Proposed Action</i>: Move to (${action.targetX}, ${action.targetY})<button style="margin-left: 4px;" onclick="units[${index}].proposedActions.splice(${actionIdx}, 1); updateUnitsListUI(); displayRoundCost();">Cancel</button></p>`;
          } else {
            // shouldn't ever happen unless im dumb
            return `<p><i>Proposed Action</i>: Unknown action</p>`;
          }
        })
        .join("")}
      <div style="margin-top: 4px;">
        <button id="move-unit-button-${index}">Move</button>
        <button id="remove-unit-button-${index}">${isInEnemyTerritory ? "Surrender" : "Remove"}</button>
        ${myUnitsInContact.length > 0 ? `<button id="merge-unit-button-${index}">Merge with Nearby Units</button>` : ""}
        <button id="split-unit-button-${index}">Split unit</button>
      </div>
    </div></div>`);
  });

  // guard units go to the bottom
  unitElements.sort((a, b) => {
    const unitA = units.find((u) => a.includes(u.name));
    const unitB = units.find((u) => b.includes(u.name));
    if (unitA.isGuardUnit && !unitB.isGuardUnit) {
      return 1;
    } else if (!unitA.isGuardUnit && unitB.isGuardUnit) {
      return -1;
    } else {
      return 0;
    }
  });
  unitsListDiv.innerHTML = unitElements.join("");

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
    const removeButton = document.getElementById(`remove-unit-button-${i}`);
    if (removeButton) {
      removeButton.onclick = () => {
        const unitForRemoval = units[i];
        // remove unit from units array
        units.splice(i, 1);
        const deployCost = getUnitDeployCost(
          u.size,
          u.speed,
          u.attack,
          u.stamina,
        );
        if (
          inWhatCountry(unitForRemoval.x, unitForRemoval.y) ===
          unitForRemoval.belongsTo
        ) {
          // return some resources if removing (not if surrendering in enemy territory)
          addResources(deployCost / 3); // refund 1/3rd of deploy cost (using units in battle will also wear down speed, attack, stamina and size so you'll get even less back)
          // update UI
        } else {
          // surrendering unit (give resources to opponent)
          opponent.addResources(deployCost / 6); // 1/6th given to opponent because unit is in enemy territory
        }

        updateUnitsListUI();
        displayRoundCost();
      };
    }

    const mergeButton = document.getElementById(`merge-unit-button-${i}`);
    if (mergeButton) {
      mergeButton.onclick = () => {
        // merge with nearby units, takes average of stats and sums size
        let totalSize = u.size;
        let totalSpeed = u.speed;
        let totalAttack = u.attack;
        let totalStamina = u.stamina;
        let unitsMerged = 1;

        for (const otherUnit of [...units]) {
          if (otherUnit === u) continue;
          if (otherUnit.belongsTo !== playingAs) continue;
          if (areTwoUnitsInContact(u, otherUnit)) {
            console.log(
              "Merging",
              otherUnit.name,
              "into",
              u.name,
              totalAttack,
              otherUnit.attack,
            );
            totalSize += otherUnit.size;
            totalSpeed += otherUnit.speed;
            totalAttack += otherUnit.attack;
            totalStamina += otherUnit.stamina;
            unitsMerged += 1;

            // remove other unit
            units = units.filter((unit) => unit !== otherUnit);
          }
        }

        // update stats
        u.size = totalSize;
        u.speed = Math.round(totalSpeed / unitsMerged);
        u.attack = Math.round(totalAttack / unitsMerged);
        u.stamina = Math.round(totalStamina / unitsMerged);

        updateUnitsListUI();
        displayRoundCost();
      };
    }

    const splitButton = document.getElementById(`split-unit-button-${i}`);
    splitButton.onclick = () => {
      if (u.size < 200) {
        alert("Unit size too small to split!");
        return;
      }
      const otherMultiplier = 0.4 + Math.random() * 0.2; // between 40% and 60%
      const otherSize = Math.round(u.size * otherMultiplier);
      const thisSize = u.size - otherSize;
      u.size = thisSize;

      const otherUnit = new Unit(
        u.x + Math.random() * 50,
        u.y + Math.random() * 50,
        getUnitName(unitsEverDeployed, playingAs),
        u.level,
        otherSize,
        u.speed,
        u.attack,
        u.stamina,
        u.belongsTo,
      );
      units.push(otherUnit);
      unitsEverDeployed += 1;
      updateUnitsListUI();
      displayRoundCost();
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

function getOccupationPolygonForUnit(unit) {
  if (unit.cachedOccupationFromRound == rounds.roundNumber) {
    // from this round, can use cache
    return unit.cachedOccupationPolygon;
  }

  let points = []; // array of [x, y] points
  const max_radius =
    Math.min(unit.speed, 25) *
    6.7 *
    Math.min((unit.size - 100) / (30000 - 100), 1);
  // console.log(
  //   unit.name,
  //   "occupation max radius:",
  //   max_radius,
  //   "where speed is",
  //   unit.speed,
  //   "and size is",
  //   unit.size,
  // );
  const min_radius = 10; // minimum occupation radius
  const enemies = units.filter((u) => u.belongsTo !== unit.belongsTo);

  if (inWhatCountry(unit.x, unit.y) === unit.belongsTo) {
    // only calculate occupation if in own territory if there are enemies nrby
    let continueCalculating = false;
    for (let enemy of enemies) {
      const dx = enemy.x - unit.x;
      const dy = enemy.y - unit.y;
      const distance = Math.hypot(dx, dy);
      if (distance > max_radius) {
        continue;
      }
      continueCalculating = true;
      break;
    }
    if (!continueCalculating) {
      return []; // no enemies nearby in own territory, so no occupation area
    }
  }

  for (let deg = 0; deg < 360; deg += 10) {
    // we need to find the farthest point in this direction that is both on the map
    // and is the farthest we can go without touching another unit (of different country)

    const rad = (deg * Math.PI) / 180;

    // guys ap physics is paying off
    // vertical component is cos(deg), horizontal component is sin(deg)
    const dirX = Math.sin(rad);
    const dirY = Math.cos(rad);

    let bestDistance = max_radius;

    for (const otherUnit of enemies) {
      if (otherUnit.belongsTo === unit.belongsTo) continue; // skip own units (including self)

      const dx = otherUnit.x - unit.x;
      const dy = otherUnit.y - unit.y;

      if (Math.hypot(dx, dy) > max_radius) {
        // could probably make this more efficient by just comparing without square roots
        // too far too interfere
        continue;
      }

      const hitDistance = rayVsUnitBox(
        unit.x,
        unit.y,
        dirX,
        dirY,
        max_radius,
        otherUnit,
      );

      if (hitDistance !== null && hitDistance < bestDistance) {
        bestDistance = hitDistance;
      }
    }
    if (bestDistance < min_radius) {
      continue; // skip this point, too close to enemy on this ray
    }

    let px = unit.x + dirX * bestDistance;
    let py = unit.y + dirY * bestDistance;

    if (!pointInMap(px, py)) {
      // binary shrink (csp traversal unit ❤️‍🩹)
      let lo = 0;
      let hi = bestDistance;
      for (let k = 0; k < 6; k++) {
        const mid = (lo + hi) * 0.5;
        const tx = unit.x + dirX * mid;
        const ty = unit.y + dirY * mid;
        if (pointInMap(tx, ty)) lo = mid;
        else hi = mid;
      }
      px = unit.x + dirX * lo;
      py = unit.y + dirY * lo;
    }

    points.push([px, py]);
  }
  unit.cachedOccupationPolygon = points;
  unit.cachedOccupationFromRound = rounds.roundNumber;
  return points;
}

// draws occupatied areas by units
function drawOccupation() {
  if (rounds.inProgress) {
    return;
  }
  const francePolygons = [];
  const germanyPolygons = [];

  for (const unit of units) {
    const occupationPolygon = getOccupationPolygonForUnit(unit);
    if (occupationPolygon.length < 4) continue;
    if (unit.belongsTo === "france") {
      francePolygons.push(occupationPolygon);
    } else {
      germanyPolygons.push(occupationPolygon);
    }
  }

  drawMergedPolygons(francePolygons, "rgba(0,30,164,0.4)");
  drawMergedPolygons(germanyPolygons, "rgba(103, 0, 0, 0.76)");
  drawContestedZones(francePolygons, germanyPolygons);
}

// regular for now, but it should merge polygons properly later
function drawMergedPolygons(polygons, fillStyle) {
  push();
  fill(fillStyle);
  noStroke();
  for (const polygon of polygons) {
    beginShape();
    for (const [px, py] of polygon) {
      vertex(...realgrid(px, py));
    }
    endShape(CLOSE);
  }
  pop();
}

function drawContestedZones(francePolygons, germanyPolygons) {
  if (francePolygons.length === 0 || germanyPolygons.length === 0) {
    return; // no contested zones possible
  }
  // close each polygon by repeating first point at end
  for (const polygon of francePolygons) {
    polygon.push(polygon[0]);
  }
  for (const polygon of germanyPolygons) {
    polygon.push(polygon[0]);
  }

  const intersect = turf.intersect(
    turf.polygon(francePolygons),
    turf.polygon(germanyPolygons),
  );
  if (!intersect) return; // no contested zones

  beginShape();
  fill(255, 255, 255, 150);
  for (const coords of intersect.geometry.coordinates) {
    for (const [px, py] of coords) {
      vertex(...realgrid(px, py));
    }
  }
  endShape(CLOSE);
}

function pointInUnitBox(x, y, unit) {
  const flagScale = unit.getFlagScale();
  const flagDimensions = getFlagDimensions(unit.belongsTo, flagScale);
  return pointInBox(
    x,
    y,
    unit.x,
    unit.y,
    flagDimensions.width,
    flagDimensions.height,
  );
}

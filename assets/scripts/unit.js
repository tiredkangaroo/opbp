const MIN_COST = 50;
const MAX_COST = 500;

class Unit {
  constructor(x, y, level, size, speed, attack, stamina, belongsTo) {
    // x and y are in virtual grid coords
    this.x = x;
    this.y = y;
    this.level = level; // level 1, 2, 3
    this.size = size; // # troops
    this.speed = speed;
    this.attack = attack;
    this.stamina = stamina;
    this.belongsTo = belongsTo; // "france" or "germany"
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

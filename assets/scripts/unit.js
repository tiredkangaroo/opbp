class Unit {
  constructor(x, y, level, size, belongsTo) {
    // x and y are in virtual grid coords
    this.x = x;
    this.y = y;
    this.level = level; // level 1, 2, 3
    this.size = size; // # troops
    this.belongsTo = belongsTo; // "france" or "germany"
  }

  draw() {
    const [realX, realY] = vgrid(this.x, this.y);
    push();
    image(getFlagImage(this.belongsTo), realX, realY, 30, 20);
    pop();
  }
}

function getFlagImage(country) {
  if (country === "france") {
    return frenchFlag;
  } else if (country === "germany") {
    return germanFlag;
  }
}

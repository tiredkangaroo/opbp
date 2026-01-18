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
    // const [width, height] =
    push();
    fill(255);
    text(`Level ${this.level}`, this.x - 5, this.y - 5);
    const flagScale = Math.min(2, 1 + this.size / 10000);
    drawFlag(this.belongsTo, this.x, this.y, flagScale);
    pop();
  }
}

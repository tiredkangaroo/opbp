class Mouse {
  constructor() {
    this.pointerImage = null;
    this.selectImage = null;
  }
  preload() {
    this.selectImage = loadImage("/assets/cursors/select.png");
  }
  draw() {
    if (this.selectImage === null) {
      return;
    }
    if (mouseClickHandler === null) {
      fill(255);
      rect(mouseX, mouseY, 8, 8);
    } else {
      image(this.selectImage, mouseX, mouseY, 18, 18);
    }
  }
}

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
      rect(mouseX - 4, mouseY - 4, 8, 8);
    } else {
      image(this.selectImage, mouseX - 9, mouseY - 9, 18, 18);
    }
  }
}

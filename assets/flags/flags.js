var frenchFlag = null;
var germanFlag = null;
var baseFlagWidth = 30;

function preloadFlags() {
  frenchFlag = loadImage("/assets/flags/france.png");
  germanFlag = loadImage("/assets/flags/germany.png");
}

function drawFlag(country, x, y, scale) {
  let img = null;
  var finalScale = scale;
  if (country === "france") {
    img = frenchFlag;
    frenchBaseScale = baseFlagWidth / frenchFlag.width;
    finalScale *= frenchBaseScale;
  } else {
    img = germanFlag;
    germanBaseScale = baseFlagWidth / germanFlag.width;
    finalScale *= germanBaseScale;
  }
  image(img, x, y, img.width * finalScale, img.height * finalScale);
}

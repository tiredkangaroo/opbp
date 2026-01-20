var frenchFlag = null;
var germanFlag = null;
var baseFlagWidth = 30;

function preloadFlags() {
  frenchFlag = loadImage("/assets/flags/france.png");
  germanFlag = loadImage("/assets/flags/germany.png");
}

function drawFlag(country, x, y, scale) {
  let { img, width, height } = getFlagDimensions(country, scale);
  image(img, x, y, width, height);
}

// returns {image, width, height}
function getFlagDimensions(country, scale) {
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
  return {
    img: img,
    width: img.width * finalScale,
    height: img.height * finalScale,
  };
}

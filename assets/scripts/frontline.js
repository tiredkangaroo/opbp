function calculateFrontline() {
  // we're scanning up to down and we're going to find the x coordinate of the frontline for each y coordinate
  // this will be independent of occupation
  // also if an x coordinate is more left than the border bc the unit that makes that happen belongs to france
  // and if an x coordinate is more right than the border bc the unit belongs to germany, those values should be ignored (which also means if that y value had multiple units on it, this/these unit's x value would be ignored)
  // if there are two units of different belongsTo at the same y coordinate, it is drawn as default to the appx. middle/the border's x value at the y value
  // if there are two units of the same belonging at the same y, it's whichever is more extreme (so if the units belong to france, it's the furthest right x val, and furthest left if they belong to germany)
  // if a value is default, but there is a value that is not the undefined/default within a 20 y-radius (check 10-down, then check 10-up), use that value instead
  // also a frontline value cannot be drawn if it is not on the map (pointInMap(x, y) returns false)

  // collect units by y coordinate
  const unitsByY = {};
  for (const unit of units) {
    const y = Math.round(unit.y);
    if (!unitsByY[y]) {
      unitsByY[y] = [];
    }
    unitsByY[y].push(unit);
  }

  const frontlineYs = {};
  for (let i = 0; i < vgrid_height; i++) {
    let unitsAtY = unitsByY[i];
    if (!unitsAtY) {
      continue;
    }
    const bx = getBorderXAtY(i);
    // find the rightmost france unit + influence and leftmost germany unit - influence
    let rightmostFranceUnit = null;
    let leftmostGermanyUnit = null;

    for (const unit of unitsAtY) {
      const flagScale = unit.getFlagScale();
      const dims = getFlagDimensions(unit.belongsTo, flagScale);
      const r = unit.calculateMaxRadius() / 10;
      const influence = dims.width + r + 10; // padding of 10
      if (unit.belongsTo === "france") {
        if (!rightmostFranceUnit || unit.x + influence > rightmostFranceUnit.x) {
          rightmostFranceUnit = unit;
        }
      } else {
        if (!leftmostGermanyUnit || unit.x - influence < leftmostGermanyUnit.x) {
          leftmostGermanyUnit = unit;
        }
      }
    }
    if (rightmostFranceUnit && leftmostGermanyUnit) {
      // both exist, so we're in a conflict zone, just making stuff up atp
      frontlineYs[i] = (rightmostFranceUnit.x + leftmostGermanyUnit.x) / 2;
    } else if (rightmostFranceUnit) {
      // only france exists
      if (bx && bx > rightmostFranceUnit.x) {
        // but the frontline is past france, use border
        frontlineYs[i] = bx;
      } else {
        const flagScale = rightmostFranceUnit.getFlagScale();
        const dims = getFlagDimensions("france", flagScale);
        const r = rightmostFranceUnit.calculateMaxRadius() / 10;
        frontlineYs[i] = rightmostFranceUnit.x + dims.width + r;
        // use our influence
        for (let j = i - 1; j >= i - r && j >= 0; j--) {
          frontlineYs[j] = frontlineYs[i];
        }
        for (let j = i + 1; j <= i + dims.height + r && j < vgrid_height; j++) {
          frontlineYs[j] = frontlineYs[i];
        }
      }
    } else if (leftmostGermanyUnit) {
      // only germany exists
      if (bx && bx < leftmostGermanyUnit.x) {
        // frontline is left of germany, use border
        frontlineYs[i] = bx;
      } else {
        const flagScale = leftmostGermanyUnit.getFlagScale();
        const dims = getFlagDimensions("germany", flagScale);
        const r = leftmostGermanyUnit.calculateMaxRadius();
        frontlineYs[i] = leftmostGermanyUnit.x - dims.width - r;
        // use german influence
        for (let j = i - 1; j >= i - r && j >= 0; j--) {
          frontlineYs[j] = frontlineYs[i];
        }
        for (let j = i + 1; j <= i + dims.height + r && j < vgrid_height; j++) {
          frontlineYs[j] = frontlineYs[i];
        }
      }
    } else {
      // neither exists, so use border x value
      frontlineYs[i] = bx;
    }
  }
  return smoothFrontline(frontlineYs, 100);
}

let frontlineYs = null;
let frontlineYsRoundNumber = -1;
function drawFrontline() {
  if (frontlineYs == null || frontlineYsRoundNumber !== rounds.roundNumber) {
    frontlineYs = calculateFrontline();
    frontlineYsRoundNumber = rounds.roundNumber;
  } else {
    console.log("using cached frontline");
  }
  push();
  stroke("#000000");
  strokeWeight(8);
  noFill();

  beginShape();
  for (let i = 0; i < vgrid_height; i += 20) {
    let x = frontlineYs[i] ?? getBorderXAtY(i);
    // if (!pointInMap(x, i)) continue;

    const [vx, vy] = vgrid(x, i);
    vertex(vx, vy);
  }
  endShape();
  pop();
}

function getBorderXAtY(y) {
  // y = mx + b
  // y - b = mx
  // (y - b) / m = x
  // y = .64x - 106
  // (y + 106) / .64 = x
  return (y + 106) / 0.64;
}

function smoothFrontline(frontlineYs, radius = 5) {
  const smoothed = {};

  for (let y = 0; y < vgrid_height; y++) {
    let sum = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny >= 0 && ny < vgrid_height && frontlineYs[ny] !== undefined) {
        sum += frontlineYs[ny];
        count++;
      }
    }

    if (count > 0) {
      smoothed[y] = sum / count;
    }
  }

  return smoothed;
}

function isInFrontOfFrontline(px, py, forWho) {
  const frontlineX = frontlineYs[Math.round(py)] ?? getBorderXAtY(py);

  if (forWho === "france") {
    return px > frontlineX; // france advances eastward (right)
  } else {
    return px < frontlineX; // germany advances westward (left)
  }
}

// function getBorderXAtY(y) {
//   // segment topmost of border to peak rightmost of border
//   if (y >= 254 && y <= 383) {
//     const x1 = 565;
//     const x2 = 810;
//     const y1 = 254;
//     const y2 = 383;

//     const segment1DeltaX = x2 - x1;
//     const segment1DeltaY = y2 - y1;

//     // what portion of the way down the segment the y value is
//     const portion = (y - y1) / segment1DeltaY;

//     // the x value is the same portion of the way across the segment
//     return x1 + portion * segment1DeltaX;
//   } else if (y >= 383 && y <= 466) {
//     const x1 = 810;
//     const x2 = 785;
//     const y1 = 383;
//     const y2 = 466;
//     const segment2DeltaX = x2 - x1;
//     const segment2DeltaY = y2 - y1;

//     // what portion of the way down the segment the y value is
//     const portion = (y - y1) / segment2DeltaY;

//     // and apply that to x1 (which will be left of x1 since x1 is peak right)
//     return x1 + portion * segment2DeltaX;
//   }
// }

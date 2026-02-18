function drawFrontline() {
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

  // for each y coordinate, find the frontline x coordinate (resolve ties like i yapped about above)
  const frontlinePoints = [];
}

function getBorderXAtY(y) {
  if (y <= 350 || y >= 466) {
    return undefined; // there is no border here
  }
  // segment topmost of border to peak rightmost of border
  if (y <= 383) {
    const x1 = 732;
    const x2 = 810;
    const y1 = 350;
    const y2 = 383;

    const segment1DeltaX = x2 - x1;
    const segment1DeltaY = y2 - y1;

    // what portion of the way down the segment the y value is
    const portion = (y - y1) / segment1DeltaY;

    // the x value is the same portion of the way across the segment
    return x1 + portion * segment1DeltaX;
  }
  const x1 = 810;
  const x2 = 785;
  const y1 = 383;
  const y2 = 466;
  const segment2DeltaX = x2 - x1;
  const segment2DeltaY = y2 - y1;

  // what portion of the way down the segment the y value is
  const portion = (y - y1) / segment2DeltaY;

  // and apply that to x1 (which will be left of x1 since x1 is peak right)
  return x1 + portion * segment2DeltaX;
}

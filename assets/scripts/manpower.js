// ===== Manpower =====
// Manpower is the pool of able-bodied citizens a nation can raise as troops.
// Deploying units draws troops out of the pool (permanently), casualties are
// never recovered, and the nuke devastates the manpower of the regions it
// strikes. The pool slowly regrows each round as the nation mobilizes.
//
// Effective manpower scales with victory points: it equals
//   base pool * (victory points controlled / starting victory points)
// so it is exactly 1.0x at the start, climbs as you seize enemy cities, and
// shrinks when you lose your own.

const manpowerConfig = {
  france: { starting: 450000, max: 650000 },
  germany: { starting: 550000, max: 800000 },
};
const MANPOWER_GROWTH_PER_ROUND = Math.round(2500 * 1.022);

var manpower = {};
for (const country in manpowerConfig) {
  manpower[country] = {
    current: manpowerConfig[country].starting,
    max: manpowerConfig[country].max,
  };
}

function victoryPointManpowerRatio(country) {
  const start = startingVictoryPointsFor(country);
  if (!start) return 0;
  return victoryPointIncomeFor(country) / start;
}

function manpowerFor(country) {
  const m = manpower[country];
  if (!m) return 0;
  return Math.round(m.current * victoryPointManpowerRatio(country));
}

function maxManpowerFor(country) {
  const m = manpower[country];
  if (!m) return 0;
  return Math.round(m.max * victoryPointManpowerRatio(country));
}

function addManpower(country, amount) {
  const m = manpower[country];
  if (!m || !amount) return;
  m.current = Math.max(0, Math.min(m.max, Math.round(m.current + amount)));
}

function spendManpower(country, amount) {
  const m = manpower[country];
  if (!m || !amount) return true;
  if (manpowerFor(country) < amount) return false;
  const ratio = victoryPointManpowerRatio(country) || 1;
  m.current = Math.max(0, Math.round(m.current - amount / ratio));
  return true;
}

function growManpower() {
  for (const country in manpower) {
    addManpower(country, MANPOWER_GROWTH_PER_ROUND);
  }
}

function updateDeployManpowerUI() {
  const el = document.getElementById("deploy-manpower-available");
  if (!el) return;
  el.textContent = addCommasToNumber(manpowerFor(playingAs));
}
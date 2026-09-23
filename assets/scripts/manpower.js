// ===== Manpower =====
// Manpower is the pool of able-bodied citizens a nation can raise as troops.
// Deploying units draws troops out of the pool (permanently), casualties are
// never recovered, and the nuke devastates the manpower of the regions it
// strikes. The pool slowly regrows each round as the nation mobilizes.

const manpowerConfig = {
  france: { starting: 450000, max: 650000 },
  germany: { starting: 550000, max: 800000 },
};
const MANPOWER_GROWTH_PER_ROUND = 2500;

var manpower = {};
for (const country in manpowerConfig) {
  manpower[country] = {
    current: manpowerConfig[country].starting,
    max: manpowerConfig[country].max,
  };
}

function manpowerFor(country) {
  const m = manpower[country];
  if (!m) return 0;
  return Math.round(m.current);
}

function maxManpowerFor(country) {
  const m = manpower[country];
  if (!m) return 0;
  return m.max;
}

function addManpower(country, amount) {
  const m = manpower[country];
  if (!m || !amount) return;
  m.current = Math.max(0, Math.min(m.max, Math.round(m.current + amount)));
}

function spendManpower(country, amount) {
  const m = manpower[country];
  if (!m || !amount) return true;
  if (m.current < amount) return false;
  m.current = Math.round(m.current - amount);
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
const focusList = [
  {
    key: "defense",
    name: "Defense in Depth",
    desc: "25% more combat power while defending your own soil. Fortresses cost 30% less.",
    cost: 2800,
  },
  {
    key: "offense",
    name: "Blitzkrieg",
    desc: "15% more attack power and speed. Movement costs 20% less.",
    cost: 2800,
  },
  {
    key: "industry",
    name: "Industrial Mobilization",
    desc: "40% more resource income every round.",
    cost: 2800,
  },
  {
    key: "logistics",
    name: "Logistics",
    desc: "Supply decays half as fast with distance.",
    cost: 2400,
  },
];

const MAX_DOCTRINES = 2;
const playerDoctrines = [];
const opponentDoctrines = [];

function hasDoctrine(key) {
  return playerDoctrines.includes(key);
}
function opponentHasDoctrine(key) {
  return opponentDoctrines.includes(key);
}
function countryHasDoctrine(country, key) {
  return country === playingAs ? hasDoctrine(key) : opponentHasDoctrine(key);
}
function movementCostMultiplierFor(unit) {
  return countryHasDoctrine(unit.belongsTo, "offense") ? 0.8 : 1;
}
function supplyMultiplierFor(country) {
  return countryHasDoctrine(country, "logistics") ? 0.5 : 1;
}
function incomeMultiplierFor(country) {
  return countryHasDoctrine(country, "industry") ? 1.4 : 1;
}
function offenseMultiplierFor(country) {
  return countryHasDoctrine(country, "offense") ? 1.15 : 1;
}
function defenseMultiplierFor(country) {
  return countryHasDoctrine(country, "defense") ? 1.25 : 1;
}
function fortCostMultiplier() {
  return hasDoctrine("defense") ? 0.7 : 1;
}

function doctrineCost(f, country) {
  const forCountry = country || playingAs;
  const count = forCountry === playingAs ? playerDoctrines.length : opponentDoctrines.length;
  return Math.round(f.cost * Math.pow(1.35, count));
}

function purchaseFocus(key) {
  const f = focusList.find((x) => x.key === key);
  if (!f) return;
  if (hasDoctrine(key)) {
    toast("You have already adopted this doctrine.");
    return;
  }
  if (playerDoctrines.length >= MAX_DOCTRINES) {
    toast("You may adopt up to two doctrines total.");
    return;
  }
  const cost = doctrineCost(f);
  if (resources < cost) {
    toast("Not enough resources to adopt this doctrine.");
    return;
  }
  resources -= cost;
  playerDoctrines.push(key);
  rounds.log(`Adopted doctrine: ${f.name}`);
  updateFocusPanelUI();
  updateFortPanelUI();
}

function updateFocusPanelUI() {
  const el = document.getElementById("focus-list");
  if (!el) return;
  el.innerHTML = focusList
    .map((f) => {
      const active = hasDoctrine(f.key);
      const cost = doctrineCost(f);
      let btn = "";
      if (active) {
        btn = `<button disabled>Active</button>`;
      } else if (playerDoctrines.length >= MAX_DOCTRINES) {
        btn = `<button disabled>Max doctrines reached</button>`;
      } else {
        btn = `<button onclick="purchaseFocus('${f.key}')">Adopt (${cost})</button>`;
      }
      return `<div class="focus-item ${active ? "focus-active" : ""}">
        <strong>${f.name}</strong> ${active ? "&check;" : ""}<br/>
        <span class="focus-desc">${f.desc}</span><br/>${btn}
      </div>`;
    })
    .join("");
}
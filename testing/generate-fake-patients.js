
var fs = require("fs");
var path = require("path");

var SEED = 20261031;
var CONDITIONS = ["diabetes", "hypertension"];
var SECTORS = ["Sector-A", "Sector-B", "Sector-C", "Sector-D", "Sector-E", "Sector-F"];

// Same seed in, same numbers out (mulberry32).
function makeRandom(seed) {
  var state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    var t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var random = makeRandom(SEED);

function pick(list) {
  return list[Math.floor(random() * list.length)];
}

// Spreads a target score over the first 8 PHQ-9 items, each 0 to 3.
function spread(target) {
  var items = [0, 0, 0, 0, 0, 0, 0, 0];
  var left = target;
  while (left > 0) {
    var i = Math.floor(random() * 8);
    if (items[i] < 3) {
      items[i] += 1;
      left -= 1;
    }
  }
  return items;
}

var GROUPS = [
  { name: "whooley-no", first8: [null, null, null, null, null, null, null, null], item9: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "low", first8: [0, 1, 2, 3, 4, 4, 2, 3], item9: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "moderate", first8: [5, 9, 6, 7, 8, 5, 9, 7], item9: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "high", first8: [10, 24, 12, 15, 18, 20, 10, 13], item9: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "item9", first8: [0, 1, 2, 0, 3, 6, 9, 12, 16, 21], item9: [1, 2, 1, 3, 2, 1, 3, 2, 1, 3] },
  { name: "mixed", first8: [4, 5, 9, 10, 17, 22, 0, 24], item9: [0, 0, 0, 0, 0, 0, 0, 0] }
];

var patients = [];
var counter = 0;

GROUPS.forEach(function (group) {
  group.first8.forEach(function (target, i) {
    counter += 1;
    var phq9 = null;
    var whooley = [true, random() < 0.5];
    if (target === null) {
      whooley = [false, false];
    } else {
      phq9 = spread(target).concat([group.item9[i]]);
    }
    patients.push({
      id: "P-" + String(counter).padStart(4, "0"),
      age: 18 + Math.floor(random() * 73),
      condition: pick(CONDITIONS),
      sector: pick(SECTORS),
      phone: "+25078" + String(1000000 + Math.floor(random() * 8999999)),
      whooley: whooley,
      phq9: phq9
    });
  });
});

var outFile = path.join(__dirname, "fake-patients.json");
fs.writeFileSync(outFile, JSON.stringify(patients, null, 2) + "\n", "utf8");
console.log("Wrote " + patients.length + " fake patients to " + outFile);

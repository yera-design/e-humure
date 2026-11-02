var users = [
  {
    username: "nurse1",
    name: "Demo Nurse",
    role: "nurse",
    passwordHash: "$2b$10$vfqzjzlYdHVRmNODH2FXTuQs5Y2uTreK9vKlZFC9yfDy7C.c98P7G"
  },
  {
    username: "psych1",
    name: "Demo Psychologist",
    role: "psychologist",
    passwordHash: "$2b$10$vqzgIoLA0EH/KOkQynK0uu6NV8C.KhzTbwx1cpwKPQnmqPuxOX8ty"
  },
  {
    username: "desk1",
    name: "Demo Desk Staff",
    role: "desk",
    passwordHash: "$2b$10$1E0VqKn2LBC.C17QMOjeeOZ5s2Vnkrzfupq3EDYWnmc2hgqB4JVJu"
  }
];

var screenings = [];

function findUser(username) {
  return users.find(function (u) { return u.username === username; }) || null;
}

// Sprint 1 keeps results in memory only; Sprint 2 writes them to PostgreSQL.
function addScreening(record) {
  screenings.push(record);
  return screenings.length;
}

function countScreenings() {
  return screenings.length;
}

module.exports = {
  findUser: findUser,
  addScreening: addScreening,
  countScreenings: countScreenings
};

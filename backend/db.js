var pg = require("pg");

var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    || "postgresql://postgres:postgres@localhost:5432/ehumure"
});
// If the database connection drops, print the error but do not crash the server.
pool.on("error", function (err) {
  console.error("database connection error:", err.message);
});

module.exports = pool;
// If the database connection drops, print the error but do not crash the server.
pool.on("error", function (err) {
  console.error("database connection error:", err.message);
});
module.exports = pool;

var config = require("./config");
config.loadEnvFile();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing; configure backend/.env");

var pg = require("pg");
var pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });
pool.on("error", function (error) { console.error("database connection error:", error.message); });

module.exports = pool;

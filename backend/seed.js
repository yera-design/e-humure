var config= require("./config");
config.loadEnvFile();
config.validate();
var pool = require("./db");

async function run() {

try {
  var result = await pool.query("SELECT to_regclass('public.facility') AS facility_table");
  if (!result.rows[0].facility_table) throw new Error("Facility table is missing; apply the database schema and migrations first.");
  console.log("Database is ready. No sample facility was added. Create the first system administrator and enter your real facility at /setup.html.");
  } catch (error) {
    console.error("facility setup failed:", error.message);
    process.exitCode = 1;
  } finally { await pool.end(); }

run();

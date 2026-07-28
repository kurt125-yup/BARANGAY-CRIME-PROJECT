// Reports whether MySQL is reachable and the database is set up + seeded.
// Used by start.bat to decide if it needs to run db:setup / db:seed.
//
// Exit codes:
//   0  ready       - schema exists and has rows
//   2  no-database - MySQL is up but barangay_crime_db / its tables are missing
//   3  empty       - schema exists but incidents table is empty
//   4  no-server   - cannot reach MySQL at all (wrong port, service stopped, bad password)
const mysql = require("mysql2/promise");
const config = require("../config");

const quiet = process.argv.includes("--quiet");
const say = message => {
  if (!quiet) console.log(message);
};

async function main() {
  const { database, ...serverOnly } = config.db;
  let connection;

  try {
    connection = await mysql.createConnection(serverOnly);
  } catch (error) {
    say(`Cannot reach MySQL at ${serverOnly.host}:${serverOnly.port} - ${error.message}`);
    process.exit(4);
  }

  const [dbs] = await connection.query("SHOW DATABASES LIKE ?", [database]);
  if (!dbs.length) {
    say(`Database ${database} does not exist yet.`);
    await connection.end();
    process.exit(2);
  }

  const [tables] = await connection.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
    [database]
  );
  const found = new Set(tables.map(row => row.TABLE_NAME));
  const expected = ["puroks", "users", "incidents", "patrols", "audit_log", "settings"];
  const missing = expected.filter(name => !found.has(name));

  if (missing.length) {
    say(`Schema incomplete - missing table(s): ${missing.join(", ")}`);
    await connection.end();
    process.exit(2);
  }

  const [[{ total }]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${database}\`.incidents`);
  await connection.end();

  if (Number(total) === 0) {
    say("Schema is present but holds no incidents.");
    process.exit(3);
  }

  say(`Database ready - ${total} incidents in ${database}.`);
  process.exit(0);
}

main().catch(error => {
  console.error(`Readiness check failed: ${error.message}`);
  process.exit(4);
});

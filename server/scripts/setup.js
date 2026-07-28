// Creates the database and applies server/sql/schema.sql.
// Usage: npm run db:setup  (add -- --force to drop an existing database first)
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("../config");

const force = process.argv.includes("--force");

async function main() {
  const { database, ...serverOnly } = config.db;
  const connection = await mysql.createConnection({ ...serverOnly, multipleStatements: true });

  console.log(`Connected to MySQL at ${serverOnly.host}:${serverOnly.port} as ${serverOnly.user}`);

  if (force) {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    console.log(`Dropped database ${database}`);
  }

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${database}\``);
  console.log(`Using database ${database}`);

  const schema = fs.readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf8");
  await connection.query(schema);
  console.log("Applied schema.sql");

  const [tables] = await connection.query(
    `SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? ORDER BY TABLE_TYPE, TABLE_NAME`,
    [database]
  );
  for (const row of tables) {
    console.log(`  ${row.TABLE_TYPE === "VIEW" ? "view " : "table"}  ${row.TABLE_NAME}`);
  }

  await connection.end();
  console.log("\nSchema ready. Next: npm run db:seed");
}

main().catch(error => {
  console.error("\nSetup failed:", error.message);
  process.exit(1);
});

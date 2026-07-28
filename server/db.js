const mysql = require("mysql2/promise");
const config = require("./config");

// Shared pool for the API. Scripts that need to run before the schema exists
// (setup.js) build their own connection without a `database` selected.
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: ["DATE", "DATETIME"],
  timezone: "local"
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// For statements mysql2's prepared-statement protocol rejects (e.g. dynamic
// LIMIT/OFFSET in some server versions) or multi-statement DDL.
async function raw(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function serverConnection() {
  const { database, ...rest } = config.db;
  return mysql.createConnection({ ...rest, multipleStatements: true });
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, raw, serverConnection, close };

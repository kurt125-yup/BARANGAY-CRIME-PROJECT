const path = require("path");
const express = require("express");
const cors = require("cors");

const config = require("./config");
const { query, close } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Serve the existing static front-end so the whole prototype runs from one
// origin (http://localhost:4000) and fetch() calls need no CORS juggling.
app.use(express.static(config.rootDir, { extensions: ["html"] }));

app.get("/api/health", async (_req, res) => {
  try {
    const [row] = await query("SELECT DATABASE() AS db, VERSION() AS version, @@port AS port");
    const counts = await query(
      `SELECT 'incidents' AS name, COUNT(*) AS total FROM incidents
       UNION ALL SELECT 'users', COUNT(*) FROM users
       UNION ALL SELECT 'puroks', COUNT(*) FROM puroks
       UNION ALL SELECT 'patrols', COUNT(*) FROM patrols
       UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
       UNION ALL SELECT 'settings', COUNT(*) FROM settings`
    );
    res.json({
      status: "ok",
      database: row.db,
      mysqlVersion: row.version,
      mysqlPort: Number(row.port),
      rowCounts: Object.fromEntries(counts.map(c => [c.name, Number(c.total)]))
    });
  } catch (error) {
    res.status(503).json({ status: "error", message: error.message });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/incidents", require("./routes/incidents"));
app.use("/api/users", require("./routes/users"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/puroks", require("./routes/puroks"));
app.use("/api/patrols", require("./routes/patrols"));
app.use("/api/audit-log", require("./routes/audit"));

app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API endpoint" }));

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error(error);
  const isClientError = error.code === "ER_DUP_ENTRY" || error.code === "ER_NO_REFERENCED_ROW_2";
  res.status(isClientError ? 400 : 500).json({ error: error.sqlMessage || error.message });
});

const server = app.listen(config.port, () => {
  console.log(`API + front-end:  http://localhost:${config.port}`);
  console.log(`MySQL:            ${config.db.host}:${config.db.port}/${config.db.database}`);
  console.log(`Health check:     http://localhost:${config.port}/api/health`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\n${signal} received, shutting down`);
    server.close(async () => {
      await close();
      process.exit(0);
    });
  });
}

// Quick sanity report on the seeded data: row counts, month coverage,
// type/status/danger spread, and the top hotspots.
// Usage: npm run db:check
const mysql = require("mysql2/promise");
const config = require("../config");

function table(rows) {
  if (!rows.length) return "  (none)";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(key => Math.max(key.length, ...rows.map(row => String(row[key] ?? "").length)));
  const line = cells => "  " + cells.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join("  ");
  return [line(keys), line(widths.map(w => "-".repeat(w))), ...rows.map(row => line(keys.map(k => row[k])))].join("\n");
}

async function main() {
  const connection = await mysql.createConnection({ ...config.db, dateStrings: true });

  const [health] = await connection.query("SELECT DATABASE() AS db, VERSION() AS version, @@port AS port");
  console.log(`Connected: ${health[0].db} on port ${health[0].port} (MySQL ${health[0].version})\n`);

  const [counts] = await connection.query(
    `SELECT 'puroks' AS table_name, COUNT(*) AS rows_count FROM puroks
     UNION ALL SELECT 'users', COUNT(*) FROM users
     UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
     UNION ALL SELECT 'patrols', COUNT(*) FROM patrols
     UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
     UNION ALL SELECT 'settings', COUNT(*) FROM settings`
  );
  console.log("Row counts:");
  console.log(table(counts));

  const [months] = await connection.query(
    `SELECT DATE_FORMAT(occurred_on, '%Y-%m') AS month, COUNT(*) AS total,
            SUM(danger_level = 3) AS high_risk
     FROM incidents GROUP BY month ORDER BY month`
  );
  console.log(`\nMonths covered: ${months.length}`);
  console.log(table(months));

  const [types] = await connection.query(
    `SELECT incident_type, COUNT(*) AS total, ROUND(AVG(danger_level), 2) AS avg_danger
     FROM incidents GROUP BY incident_type ORDER BY total DESC`
  );
  console.log("\nIncident types:");
  console.log(table(types));

  const [statuses] = await connection.query(
    "SELECT status, COUNT(*) AS total FROM incidents GROUP BY status ORDER BY total DESC"
  );
  console.log("\nStatuses:");
  console.log(table(statuses));

  const [hotspots] = await connection.query(
    `SELECT p.name AS purok, COUNT(*) AS total, SUM(i.danger_level = 3) AS high_risk,
            ROUND(AVG(i.danger_level), 2) AS avg_danger
     FROM incidents i JOIN puroks p ON p.id = i.purok_id
     GROUP BY p.name ORDER BY total DESC LIMIT 6`
  );
  console.log("\nTop hotspots:");
  console.log(table(hotspots));

  const [orphans] = await connection.query(
    `SELECT
       (SELECT COUNT(*) FROM incidents WHERE purok_id IS NULL) AS incidents_without_purok,
       (SELECT COUNT(*) FROM patrols WHERE assigned_user_id IS NULL) AS patrols_without_tanod,
       (SELECT COUNT(*) FROM incidents WHERE occurred_on > CURDATE()) AS future_incidents`
  );
  console.log("\nIntegrity spot-checks:");
  console.log(table(orphans));

  await connection.end();
}

main().catch(error => {
  console.error("\nCheck failed:", error.message);
  process.exit(1);
});

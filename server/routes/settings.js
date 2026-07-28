const express = require("express");
const { query } = require("../db");
const { logAction } = require("../lib/audit");
const { asyncRoute, badRequest } = require("../lib/http");

const router = express.Router();

function castValue(row) {
  if (row.value_type === "number") return Number(row.setting_value);
  if (row.value_type === "boolean") return row.setting_value === "1" || row.setting_value === "true";
  return row.setting_value;
}

// GET /api/settings -> flat object, matching the front-end settings shape
router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const rows = await query("SELECT setting_key, setting_value, value_type, description FROM settings ORDER BY setting_key");
    const data = {};
    const meta = {};
    for (const row of rows) {
      data[row.setting_key] = castValue(row);
      meta[row.setting_key] = { type: row.value_type, description: row.description };
    }
    res.json({ data, meta });
  })
);

// PUT /api/settings { highRiskThreshold: 3, patrolWindow: "19:00 - 23:00" }
router.put(
  "/",
  asyncRoute(async (req, res) => {
    const entries = Object.entries(req.body || {});
    if (!entries.length) return badRequest(res, "No settings supplied");

    const known = await query("SELECT setting_key, value_type FROM settings");
    const types = new Map(known.map(row => [row.setting_key, row.value_type]));

    const unknown = entries.filter(([key]) => !types.has(key)).map(([key]) => key);
    if (unknown.length) return badRequest(res, `Unknown setting key(s): ${unknown.join(", ")}`);

    for (const [key, value] of entries) {
      const type = types.get(key);
      if (type === "number" && Number.isNaN(Number(value))) {
        return badRequest(res, `Setting ${key} must be a number`);
      }
      const stored = type === "boolean" ? (value ? "1" : "0") : String(value);
      await query("UPDATE settings SET setting_value = ? WHERE setting_key = ?", [stored, key]);
    }

    await logAction(req, "UPDATE", "settings", null, { keys: entries.map(([key]) => key) });

    const rows = await query("SELECT setting_key, setting_value, value_type FROM settings ORDER BY setting_key");
    const data = {};
    for (const row of rows) data[row.setting_key] = castValue(row);
    res.json({ data });
  })
);

module.exports = router;

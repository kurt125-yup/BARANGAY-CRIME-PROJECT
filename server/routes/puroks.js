const express = require("express");
const { query, raw } = require("../db");
const { asyncRoute } = require("../lib/http");

const router = express.Router();

// GET /api/puroks?month=2026-07 - lookup list, optionally with incident counts
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const params = [];
    let joinFilter = "";
    if (req.query.month) {
      joinFilter = "AND DATE_FORMAT(i.occurred_on, '%Y-%m') = ?";
      params.push(req.query.month);
    }

    const rows = await raw(
      `SELECT p.id, p.purok_no AS purokNo, p.name, p.landmark, p.lat, p.lng,
              p.household_count AS householdCount, p.risk_note AS riskNote,
              COUNT(i.id) AS incidentCount,
              COALESCE(ROUND(AVG(i.danger_level), 2), 0) AS avgDanger,
              COALESCE(SUM(i.danger_level = 3), 0) AS highRiskCount
       FROM puroks p
       LEFT JOIN incidents i ON i.purok_id = p.id ${joinFilter}
       GROUP BY p.id, p.purok_no, p.name, p.landmark, p.lat, p.lng, p.household_count, p.risk_note
       ORDER BY p.purok_no`,
      params
    );

    res.json({
      data: rows.map(row => ({
        ...row,
        purokNo: Number(row.purokNo),
        lat: Number(row.lat),
        lng: Number(row.lng),
        incidentCount: Number(row.incidentCount),
        avgDanger: Number(row.avgDanger),
        highRiskCount: Number(row.highRiskCount)
      }))
    });
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const rows = await query(
      `SELECT id, purok_no AS purokNo, name, landmark, lat, lng,
              household_count AS householdCount, risk_note AS riskNote
       FROM puroks WHERE id = ?`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: "Purok not found" });
    res.json({ data: rows[0] });
  })
);

module.exports = router;

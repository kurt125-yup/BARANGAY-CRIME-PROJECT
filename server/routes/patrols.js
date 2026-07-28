const express = require("express");
const { query, raw } = require("../db");
const { logAction } = require("../lib/audit");
const { asyncRoute, badRequest } = require("../lib/http");

const router = express.Router();

const PRIORITIES = ["Low", "Moderate", "High"];
const STATUSES = ["Scheduled", "Ongoing", "Completed", "Missed"];

const SELECT_COLUMNS = `
  pt.id,
  pt.patrol_date       AS patrolDate,
  pt.shift_start       AS shiftStart,
  pt.shift_end         AS shiftEnd,
  pt.purok_id          AS purokId,
  p.name               AS purokName,
  p.purok_no           AS purokNo,
  pt.assigned_user_id  AS assignedUserId,
  u.name               AS assignedTo,
  pt.team_label        AS team,
  pt.priority,
  pt.status,
  pt.incidents_logged  AS incidentsLogged,
  pt.notes
`;

// GET /api/patrols?month=2026-07&status=Scheduled&purokId=3&upcoming=1
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const where = [];
    const params = [];

    if (req.query.month) {
      where.push("DATE_FORMAT(pt.patrol_date, '%Y-%m') = ?");
      params.push(req.query.month);
    }
    if (req.query.date) {
      where.push("pt.patrol_date = ?");
      params.push(req.query.date);
    }
    if (req.query.status) {
      where.push("pt.status = ?");
      params.push(req.query.status);
    }
    if (req.query.priority) {
      where.push("pt.priority = ?");
      params.push(req.query.priority);
    }
    if (req.query.purokId) {
      where.push("pt.purok_id = ?");
      params.push(Number(req.query.purokId));
    }
    if (req.query.upcoming === "1") {
      where.push("pt.patrol_date >= CURDATE()");
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    const order = req.query.upcoming === "1" ? "ASC" : "DESC";

    const rows = await raw(
      `SELECT ${SELECT_COLUMNS}
       FROM patrols pt
       JOIN puroks p ON p.id = pt.purok_id
       LEFT JOIN users u ON u.id = pt.assigned_user_id
       ${clause}
       ORDER BY pt.patrol_date ${order}, pt.shift_start ASC
       LIMIT ${limit}`,
      params
    );

    res.json({
      data: rows.map(row => ({
        ...row,
        shiftStart: String(row.shiftStart).slice(0, 5),
        shiftEnd: String(row.shiftEnd).slice(0, 5),
        purokNo: Number(row.purokNo),
        incidentsLogged: Number(row.incidentsLogged)
      }))
    });
  })
);

// GET /api/patrols/recommendations?month=2026-07
// Ranks puroks by recent incident pressure - the data behind the patrol
// decision-support page.
router.get(
  "/recommendations",
  asyncRoute(async (req, res) => {
    const month = req.query.month || null;
    const params = [];
    let clause = "";
    if (month) {
      clause = "AND DATE_FORMAT(i.occurred_on, '%Y-%m') = ?";
      params.push(month);
    }

    const rows = await raw(
      `SELECT p.id AS purokId, p.purok_no AS purokNo, p.name AS purokName,
              p.lat, p.lng, p.risk_note AS riskNote,
              COUNT(i.id) AS incidentCount,
              COALESCE(SUM(i.danger_level = 3), 0) AS highRiskCount,
              COALESCE(ROUND(AVG(i.danger_level), 2), 0) AS avgDanger,
              COALESCE(ROUND(AVG(HOUR(i.occurred_at)), 0), 0) AS avgHour,
              MAX(i.occurred_on) AS lastIncidentOn
       FROM puroks p
       LEFT JOIN incidents i ON i.purok_id = p.id ${clause}
       GROUP BY p.id, p.purok_no, p.name, p.lat, p.lng, p.risk_note
       ORDER BY highRiskCount DESC, incidentCount DESC`,
      params
    );

    const maxCount = Math.max(...rows.map(row => Number(row.incidentCount)), 1);
    const data = rows.map(row => {
      const count = Number(row.incidentCount);
      const score = Math.round(((count / maxCount) * 0.6 + (Number(row.avgDanger) / 3) * 0.4) * 100);
      return {
        purokId: row.purokId,
        purokNo: Number(row.purokNo),
        purokName: row.purokName,
        lat: Number(row.lat),
        lng: Number(row.lng),
        riskNote: row.riskNote,
        incidentCount: count,
        highRiskCount: Number(row.highRiskCount),
        avgDanger: Number(row.avgDanger),
        peakHour: `${String(Number(row.avgHour)).padStart(2, "0")}:00`,
        lastIncidentOn: row.lastIncidentOn,
        priorityScore: score,
        priority: score >= 66 ? "High" : score >= 33 ? "Moderate" : "Low"
      };
    });

    res.json({ data });
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const { patrolDate, shiftStart, shiftEnd, purokId, assignedUserId, team, priority, status, notes } = req.body;
    if (!patrolDate || !shiftStart || !shiftEnd || !purokId) {
      return badRequest(res, "patrolDate, shiftStart, shiftEnd and purokId are required");
    }
    if (priority && !PRIORITIES.includes(priority)) return badRequest(res, `priority must be one of: ${PRIORITIES.join(", ")}`);
    if (status && !STATUSES.includes(status)) return badRequest(res, `status must be one of: ${STATUSES.join(", ")}`);

    const withSeconds = value => (String(value).length === 5 ? `${value}:00` : value);

    const result = await query(
      `INSERT INTO patrols
         (patrol_date, shift_start, shift_end, purok_id, assigned_user_id, team_label, priority, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patrolDate,
        withSeconds(shiftStart),
        withSeconds(shiftEnd),
        Number(purokId),
        assignedUserId ?? null,
        team || "Team 1",
        priority || "Moderate",
        status || "Scheduled",
        notes ?? null
      ]
    );

    await logAction(req, "CREATE", "patrol", result.insertId, { patrolDate, purokId: Number(purokId) });
    res.status(201).json({ data: { id: result.insertId } });
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { status, priority, assignedUserId, incidentsLogged, notes } = req.body;
    if (priority && !PRIORITIES.includes(priority)) return badRequest(res, `priority must be one of: ${PRIORITIES.join(", ")}`);
    if (status && !STATUSES.includes(status)) return badRequest(res, `status must be one of: ${STATUSES.join(", ")}`);

    const sets = [];
    const params = [];
    if (status !== undefined) { sets.push("status = ?"); params.push(status); }
    if (priority !== undefined) { sets.push("priority = ?"); params.push(priority); }
    if (assignedUserId !== undefined) { sets.push("assigned_user_id = ?"); params.push(assignedUserId); }
    if (incidentsLogged !== undefined) { sets.push("incidents_logged = ?"); params.push(Number(incidentsLogged)); }
    if (notes !== undefined) { sets.push("notes = ?"); params.push(notes); }
    if (!sets.length) return badRequest(res, "No updatable fields supplied");

    params.push(id);
    const result = await query(`UPDATE patrols SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: "Patrol not found" });

    await logAction(req, "UPDATE", "patrol", id, { changed: Object.keys(req.body) });
    res.json({ updated: id });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const result = await query("DELETE FROM patrols WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Patrol not found" });
    await logAction(req, "DELETE", "patrol", id, null);
    res.json({ deleted: id });
  })
);

module.exports = router;

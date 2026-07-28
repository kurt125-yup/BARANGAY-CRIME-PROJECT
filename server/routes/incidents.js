const express = require("express");
const { query, raw } = require("../db");
const { logAction } = require("../lib/audit");
const { asyncRoute, badRequest } = require("../lib/http");

const router = express.Router();

const STATUSES = ["Under Review", "Patrolled", "Resolved", "Referred to PNP"];

const SELECT_COLUMNS = `
  i.id,
  i.incident_type          AS type,
  i.occurred_on            AS date,
  i.occurred_at            AS time,
  i.purok_id               AS purokId,
  p.name                   AS purokName,
  p.purok_no               AS purokNo,
  i.location_label         AS location,
  i.description,
  i.reported_by            AS reportedBy,
  i.reported_by_user_id    AS reportedByUserId,
  i.status,
  i.danger_level           AS danger,
  i.lat,
  i.lng,
  i.recommended_action     AS action,
  i.created_at             AS createdAt,
  i.updated_at             AS updatedAt
`;

// Shapes a row the way the front-end's incident objects look.
function serialize(row) {
  return {
    ...row,
    time: typeof row.time === "string" ? row.time.slice(0, 5) : row.time,
    danger: Number(row.danger),
    lat: Number(row.lat),
    lng: Number(row.lng)
  };
}

function buildFilters(q) {
  const where = [];
  const params = [];

  if (q.month) {
    where.push("DATE_FORMAT(i.occurred_on, '%Y-%m') = ?");
    params.push(q.month);
  }
  if (q.from) {
    where.push("i.occurred_on >= ?");
    params.push(q.from);
  }
  if (q.to) {
    where.push("i.occurred_on <= ?");
    params.push(q.to);
  }
  if (q.type) {
    where.push("i.incident_type = ?");
    params.push(q.type);
  }
  if (q.status) {
    where.push("i.status = ?");
    params.push(q.status);
  }
  if (q.danger) {
    where.push("i.danger_level = ?");
    params.push(Number(q.danger));
  }
  if (q.purokId) {
    where.push("i.purok_id = ?");
    params.push(Number(q.purokId));
  }
  if (q.search) {
    where.push(
      "(i.incident_type LIKE ? OR i.location_label LIKE ? OR i.description LIKE ? OR i.reported_by LIKE ?)"
    );
    const like = `%${q.search}%`;
    params.push(like, like, like, like);
  }

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

// GET /api/incidents?month=2026-07&type=Theft&status=Resolved&danger=3&search=purok&limit=50&offset=0
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const { clause, params } = buildFilters(req.query);

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 2000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await raw(
      `SELECT ${SELECT_COLUMNS}
       FROM incidents i
       LEFT JOIN puroks p ON p.id = i.purok_id
       ${clause}
       ORDER BY i.occurred_on DESC, i.occurred_at DESC, i.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [{ total }] = await raw(
      `SELECT COUNT(*) AS total FROM incidents i ${clause}`,
      params
    );

    res.json({ data: rows.map(serialize), total: Number(total), limit, offset });
  })
);

// GET /api/incidents/months - month values for the reporting-month dropdown
router.get(
  "/months",
  asyncRoute(async (_req, res) => {
    const rows = await query(
      `SELECT DATE_FORMAT(occurred_on, '%Y-%m') AS month, COUNT(*) AS total
       FROM incidents
       GROUP BY month
       ORDER BY month DESC`
    );
    res.json({ data: rows.map(row => ({ month: row.month, total: Number(row.total) })) });
  })
);

// GET /api/incidents/stats?month=2026-07 - dashboard aggregates
router.get(
  "/stats",
  asyncRoute(async (req, res) => {
    const { clause, params } = buildFilters(req.query);

    const [totals] = await raw(
      `SELECT
         COUNT(*) AS total,
         SUM(i.danger_level = 3) AS highRisk,
         SUM(i.danger_level = 2) AS moderateRisk,
         SUM(i.danger_level = 1) AS lowRisk,
         SUM(i.status = 'Under Review') AS underReview,
         SUM(i.status = 'Resolved') AS resolved,
         ROUND(AVG(i.danger_level), 2) AS avgDanger
       FROM incidents i ${clause}`,
      params
    );

    const byType = await raw(
      `SELECT i.incident_type AS label, COUNT(*) AS total
       FROM incidents i ${clause}
       GROUP BY i.incident_type ORDER BY total DESC`,
      params
    );

    const byStatus = await raw(
      `SELECT i.status AS label, COUNT(*) AS total
       FROM incidents i ${clause}
       GROUP BY i.status ORDER BY total DESC`,
      params
    );

    const byDanger = await raw(
      `SELECT i.danger_level AS level, COUNT(*) AS total
       FROM incidents i ${clause}
       GROUP BY i.danger_level ORDER BY i.danger_level DESC`,
      params
    );

    const byDay = await raw(
      `SELECT i.occurred_on AS date, COUNT(*) AS total
       FROM incidents i ${clause}
       GROUP BY i.occurred_on ORDER BY i.occurred_on`,
      params
    );

    const byHour = await raw(
      `SELECT HOUR(i.occurred_at) AS hour, COUNT(*) AS total
       FROM incidents i ${clause}
       GROUP BY hour ORDER BY hour`,
      params
    );

    const hotspots = await raw(
      `SELECT p.id AS purokId, p.purok_no AS purokNo, p.name AS purokName,
              p.lat, p.lng, COUNT(*) AS total,
              ROUND(AVG(i.danger_level), 2) AS avgDanger,
              SUM(i.danger_level = 3) AS highRisk
       FROM incidents i
       JOIN puroks p ON p.id = i.purok_id
       ${clause}
       GROUP BY p.id, p.purok_no, p.name, p.lat, p.lng
       ORDER BY highRisk DESC, total DESC`,
      params
    );

    res.json({
      totals: {
        total: Number(totals.total || 0),
        highRisk: Number(totals.highRisk || 0),
        moderateRisk: Number(totals.moderateRisk || 0),
        lowRisk: Number(totals.lowRisk || 0),
        underReview: Number(totals.underReview || 0),
        resolved: Number(totals.resolved || 0),
        avgDanger: Number(totals.avgDanger || 0)
      },
      byType: byType.map(r => ({ label: r.label, total: Number(r.total) })),
      byStatus: byStatus.map(r => ({ label: r.label, total: Number(r.total) })),
      byDanger: byDanger.map(r => ({ level: Number(r.level), total: Number(r.total) })),
      byDay: byDay.map(r => ({ date: r.date, total: Number(r.total) })),
      byHour: byHour.map(r => ({ hour: Number(r.hour), total: Number(r.total) })),
      hotspots: hotspots.map(r => ({
        purokId: r.purokId,
        purokNo: Number(r.purokNo),
        purokName: r.purokName,
        lat: Number(r.lat),
        lng: Number(r.lng),
        total: Number(r.total),
        avgDanger: Number(r.avgDanger),
        highRisk: Number(r.highRisk)
      }))
    });
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const rows = await query(
      `SELECT ${SELECT_COLUMNS}
       FROM incidents i LEFT JOIN puroks p ON p.id = i.purok_id
       WHERE i.id = ?`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: "Incident not found" });
    res.json({ data: serialize(rows[0]) });
  })
);

function validateBody(body, { partial = false } = {}) {
  const required = ["type", "date", "time", "location", "danger"];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return `Missing required field: ${field}`;
      }
    }
  }
  if (body.danger !== undefined && ![1, 2, 3].includes(Number(body.danger))) {
    return "danger must be 1, 2 or 3";
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return `status must be one of: ${STATUSES.join(", ")}`;
  }
  return null;
}

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const error = validateBody(req.body);
    if (error) return badRequest(res, error);

    const body = req.body;
    const result = await query(
      `INSERT INTO incidents
         (incident_type, occurred_on, occurred_at, purok_id, location_label, description,
          reported_by, reported_by_user_id, status, danger_level, lat, lng, recommended_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.type,
        body.date,
        body.time.length === 5 ? `${body.time}:00` : body.time,
        body.purokId ?? null,
        body.location,
        body.description ?? null,
        body.reportedBy ?? "Walk-In Complainant",
        body.reportedByUserId ?? null,
        body.status ?? "Under Review",
        Number(body.danger),
        body.lat ?? 14.7287,
        body.lng ?? 120.9834,
        body.action ?? null
      ]
    );

    await logAction(req, "CREATE", "incident", result.insertId, { type: body.type, danger: Number(body.danger) });

    const rows = await query(
      `SELECT ${SELECT_COLUMNS} FROM incidents i LEFT JOIN puroks p ON p.id = i.purok_id WHERE i.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ data: serialize(rows[0]) });
  })
);

const UPDATABLE = {
  type: "incident_type",
  date: "occurred_on",
  time: "occurred_at",
  purokId: "purok_id",
  location: "location_label",
  description: "description",
  reportedBy: "reported_by",
  reportedByUserId: "reported_by_user_id",
  status: "status",
  danger: "danger_level",
  lat: "lat",
  lng: "lng",
  action: "recommended_action"
};

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const error = validateBody(req.body, { partial: true });
    if (error) return badRequest(res, error);

    const id = Number(req.params.id);
    const sets = [];
    const params = [];

    for (const [key, column] of Object.entries(UPDATABLE)) {
      if (req.body[key] === undefined) continue;
      let value = req.body[key];
      if (key === "time" && typeof value === "string" && value.length === 5) value = `${value}:00`;
      if (key === "danger") value = Number(value);
      sets.push(`${column} = ?`);
      params.push(value);
    }

    if (!sets.length) return badRequest(res, "No updatable fields supplied");

    params.push(id);
    const result = await query(`UPDATE incidents SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: "Incident not found" });

    await logAction(req, "UPDATE", "incident", id, { changed: Object.keys(req.body) });

    const rows = await query(
      `SELECT ${SELECT_COLUMNS} FROM incidents i LEFT JOIN puroks p ON p.id = i.purok_id WHERE i.id = ?`,
      [id]
    );
    res.json({ data: serialize(rows[0]) });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const result = await query("DELETE FROM incidents WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Incident not found" });
    await logAction(req, "DELETE", "incident", id, null);
    res.json({ deleted: id });
  })
);

module.exports = router;

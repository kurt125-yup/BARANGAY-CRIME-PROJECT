const express = require("express");
const { raw } = require("../db");
const { asyncRoute } = require("../lib/http");

const router = express.Router();

// GET /api/audit-log?action=DELETE&entityType=incident&userId=1&limit=100
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const where = [];
    const params = [];

    if (req.query.action) {
      where.push("a.action = ?");
      params.push(req.query.action);
    }
    if (req.query.entityType) {
      where.push("a.entity_type = ?");
      params.push(req.query.entityType);
    }
    if (req.query.userId) {
      where.push("a.user_id = ?");
      params.push(Number(req.query.userId));
    }
    if (req.query.from) {
      where.push("a.created_at >= ?");
      params.push(req.query.from);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await raw(
      `SELECT a.id, a.user_id AS userId, a.username, u.name AS userFullName,
              a.action, a.entity_type AS entityType, a.entity_id AS entityId,
              a.details, a.created_at AS createdAt
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ${clause}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [{ total }] = await raw(`SELECT COUNT(*) AS total FROM audit_log a ${clause}`, params);

    res.json({ data: rows, total: Number(total), limit, offset });
  })
);

module.exports = router;

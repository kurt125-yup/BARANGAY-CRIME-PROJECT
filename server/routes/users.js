const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { logAction } = require("../lib/audit");
const { asyncRoute, badRequest } = require("../lib/http");

const router = express.Router();
const ROLES = ["admin", "captain", "tanod"];

const SELECT_COLUMNS = `
  id, name, username, role, contact_no AS contactNo,
  is_active AS isActive, last_login_at AS lastLoginAt, created_at AS createdAt
`;

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const params = [];
    let clause = "";
    if (req.query.role) {
      clause = "WHERE role = ?";
      params.push(req.query.role);
    }
    const rows = await query(`SELECT ${SELECT_COLUMNS} FROM users ${clause} ORDER BY id`, params);
    res.json({ data: rows.map(row => ({ ...row, isActive: Boolean(row.isActive) })) });
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const rows = await query(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = ?`, [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ data: { ...rows[0], isActive: Boolean(rows[0].isActive) } });
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const { name, username, password, role, contactNo } = req.body;
    if (!name || !username || !password) return badRequest(res, "name, username and password are required");
    if (role && !ROLES.includes(role)) return badRequest(res, `role must be one of: ${ROLES.join(", ")}`);

    const existing = await query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length) return res.status(409).json({ error: "Username already taken" });

    const result = await query(
      "INSERT INTO users (name, username, password_hash, role, contact_no) VALUES (?, ?, ?, ?, ?)",
      [name, username, bcrypt.hashSync(password, 10), role || "tanod", contactNo ?? null]
    );
    await logAction(req, "CREATE", "user", result.insertId, { username, role: role || "tanod" });

    const rows = await query(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = ?`, [result.insertId]);
    res.status(201).json({ data: { ...rows[0], isActive: Boolean(rows[0].isActive) } });
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { name, username, password, role, contactNo, isActive } = req.body;
    if (role && !ROLES.includes(role)) return badRequest(res, `role must be one of: ${ROLES.join(", ")}`);

    const sets = [];
    const params = [];
    if (name !== undefined) { sets.push("name = ?"); params.push(name); }
    if (username !== undefined) { sets.push("username = ?"); params.push(username); }
    if (password) { sets.push("password_hash = ?"); params.push(bcrypt.hashSync(password, 10)); }
    if (role !== undefined) { sets.push("role = ?"); params.push(role); }
    if (contactNo !== undefined) { sets.push("contact_no = ?"); params.push(contactNo); }
    if (isActive !== undefined) { sets.push("is_active = ?"); params.push(isActive ? 1 : 0); }
    if (!sets.length) return badRequest(res, "No updatable fields supplied");

    params.push(id);
    const result = await query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: "User not found" });
    await logAction(req, "UPDATE", "user", id, { changed: Object.keys(req.body) });

    const rows = await query(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = ?`, [id]);
    res.json({ data: { ...rows[0], isActive: Boolean(rows[0].isActive) } });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const [admins] = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 1");
    const target = await query("SELECT role FROM users WHERE id = ?", [id]);
    if (!target.length) return res.status(404).json({ error: "User not found" });
    if (target[0].role === "admin" && Number(admins.total) <= 1) {
      return badRequest(res, "Cannot delete the last active administrator");
    }

    await query("DELETE FROM users WHERE id = ?", [id]);
    await logAction(req, "DELETE", "user", id, null);
    res.json({ deleted: id });
  })
);

module.exports = router;

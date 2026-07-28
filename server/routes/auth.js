const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { asyncRoute, badRequest } = require("../lib/http");

const router = express.Router();

const ROLE_LANDING = { tanod: "fieldDashboard", admin: "dashboard", captain: "dashboard" };

// POST /api/auth/login { username, password }
// No tokens yet - this only validates the credential and returns the profile
// the front-end already stores as b179_active_user.
router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return badRequest(res, "username and password are required");

    const rows = await query(
      "SELECT id, name, username, password_hash, role, is_active FROM users WHERE username = ?",
      [username]
    );

    const user = rows[0];
    // Same response for unknown user and wrong password so the endpoint does
    // not confirm which usernames exist.
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (!user.is_active) return res.status(403).json({ error: "Account is deactivated" });

    await query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
    await query(
      `INSERT INTO audit_log (user_id, username, action, entity_type, details)
       VALUES (?, ?, 'LOGIN', 'session', JSON_OBJECT('ip', ?))`,
      [user.id, user.username, req.ip || "unknown"]
    );

    res.json({
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        landingPage: ROLE_LANDING[user.role] || "dashboard"
      }
    });
  })
);

router.post(
  "/logout",
  asyncRoute(async (req, res) => {
    const userId = Number(req.body.userId) || null;
    const username = req.body.username || null;
    if (userId || username) {
      await query(
        "INSERT INTO audit_log (user_id, username, action, entity_type) VALUES (?, ?, 'LOGOUT', 'session')",
        [userId, username]
      );
    }
    res.json({ ok: true });
  })
);

module.exports = router;

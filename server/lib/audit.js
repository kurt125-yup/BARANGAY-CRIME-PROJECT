const { query } = require("../db");

// The prototype has no session layer yet, so the caller identifies itself with
// an X-User-Id / X-Username header (the front-end already keeps the active user
// in localStorage). Audit writes must never break the request they describe.
async function logAction(req, action, entityType, entityId, details) {
  const userId = Number(req.get("X-User-Id")) || null;
  const username = req.get("X-Username") || null;

  try {
    await query(
      `INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        action,
        entityType,
        entityId === null || entityId === undefined ? null : String(entityId),
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (error) {
    console.warn(`audit_log write skipped (${action} ${entityType}): ${error.message}`);
  }
}

module.exports = { logAction };

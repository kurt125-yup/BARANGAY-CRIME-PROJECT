// Wraps an async route handler so rejected promises reach the error middleware
// instead of dying as unhandled rejections.
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

module.exports = { asyncRoute, badRequest };

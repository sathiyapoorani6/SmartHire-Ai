const jwt = require("jsonwebtoken");

// Protects routes - checks for a valid, non-expired token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided. Please login again.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role } available in the route now
    next();
  } catch (error) {
    // covers both expired tokens and invalid/tampered tokens
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }
}
// Restricts a route to specific roles, e.g. verifyRole("admin") or verifyRole("company", "admin")
function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this",
      });
    }
    next();
  };
}
module.exports = verifyToken;
module.exports = { verifyToken, verifyRole };
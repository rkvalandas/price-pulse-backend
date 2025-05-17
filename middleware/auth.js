// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  let token;

  // Check for token in cookies first
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }
  // Fallback to Authorization header for API calls that might not come from a browser
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Get token from header (format: "Bearer token")
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    // If token is invalid, clear the cookie
    if (req.cookies.auth_token) {
      res.clearCookie("auth_token");
    }
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };

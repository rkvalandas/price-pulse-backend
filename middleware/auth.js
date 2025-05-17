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
    // Log the token source for debugging
    if (process.env.NODE_ENV === "production") {
      console.log(
        "Auth token source:",
        req.cookies.auth_token ? "Cookie" : "Header"
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "Auth middleware: User not found even though token was valid"
        );
      }
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    // If token is invalid, clear the cookie
    if (req.cookies && req.cookies.auth_token) {
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
    }

    if (process.env.NODE_ENV === "production") {
      console.error("Auth middleware error:", error.name, error.message);
    }

    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };

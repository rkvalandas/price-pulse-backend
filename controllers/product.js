const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { getProduct } = require("../service/scraper");

async function handleSearchUrl(req, res) {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ error: "Please enter the product NAME or URL" });
    }

    // Fetch product data
    const product = await getProduct(url);

    // Check if JWT token is provided in Authorization header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Get token from header (format: "Bearer token")
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      // If no token, return only product data
      return res.json({ product });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Handle invalid token
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Find the user associated with the token
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Respond with product and user data
    return res.json({ product, user });
  } catch (error) {
    console.error("Error in handleSearchUrl:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  handleSearchUrl,
};

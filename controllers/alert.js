const Alert = require("../models/alert");

async function handleAddAlert(req, res) {
  try {
    const { title, url, imageUrl, price, targetPrice } = req.body;
    const { email } = { email: req.user.email }; // Assuming authenticated user details are available in `req.user`

    // Validate required fields
    if (!title || !url || price === undefined || targetPrice === undefined) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Check if an alert already exists for the given URL and userEmail with the same targetPrice
    const existingAlert = await Alert.findOne({
      url,
      imageUrl,
      userEmail: email,
      targetPrice,
    });

    if (existingAlert) {
      return res.status(409).json({
        error:
          "You already have an alert for this URL with the same target price.",
      });
    }

    // Create a new alert
    const newAlert = new Alert({
      title,
      url,
      imageUrl,
      price,
      targetPrice,
      userEmail: email,
    });

    await newAlert.save();

    res.status(201).json({
      message: "Alert created successfully.",
      alert: newAlert,
    });
  } catch (error) {
    console.error("Error handling add alert:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation failed.",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "An unexpected error occurred while processing your request.",
    });
  }
}

async function handleGetUserAlerts(req, res) {
  try {
    const { email } = { email: req.user.email }; // Email is extracted from the authenticated user

    // Fetch alerts for the authenticated user
    const userAlerts = await Alert.find({ userEmail: email });
    res.status(200).json({
      message: "User alerts retrieved successfully.",
      alerts: userAlerts,
    });
  } catch (error) {
    console.error("Error fetching user alerts:", error);
    res.status(500).json({
      error: "An unexpected error occurred while fetching alerts.",
    });
  }
}

async function handleDeleteUserAlerts(req, res) {
  try {
    const id = req.params.id;

    // Validate if the ID is a valid ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid alert ID" });
    }

    // Fetch alerts for the authenticated user
    const alert = await Alert.findByIdAndDelete(id);
    res.status(204).json({
      message: "Alert deleted successfully.",
    });
  } catch (error) {
    console.error("Error fetching user alerts:", error);
    res.status(500).json({
      error: "An unexpected error occurred while fetching alerts.",
    });
  }
}

module.exports = { handleAddAlert, handleGetUserAlerts, handleDeleteUserAlerts };

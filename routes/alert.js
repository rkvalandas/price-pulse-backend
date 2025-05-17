const express = require("express");
const {handleAddAlert, handleGetUserAlerts, handleDeleteUserAlerts} = require("../controllers/alert");
const { protect } = require("../middleware/auth");
const router = express.Router();


router.post("/", protect, handleAddAlert);
router.get("/get", protect, handleGetUserAlerts);
router.delete("/remove/:id", protect, handleDeleteUserAlerts);

module.exports = router;
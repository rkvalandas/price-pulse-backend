const express = require("express");
const { handleSearchUrl } = require("../controllers/product");
const router = express.Router();


router.post("/", handleSearchUrl);

module.exports = router;
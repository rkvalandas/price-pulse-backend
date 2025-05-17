const mongoose = require("mongoose");

const connectMongoDb = async function (url) {
  try {
    return await mongoose.connect(url);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { connectMongoDb };

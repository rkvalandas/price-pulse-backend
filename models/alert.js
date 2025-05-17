const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  targetPrice: {
    type: Number,
    required: true,
  },
  userEmail: {
    type: String,
    required: true, // Linking alerts to users based on their email
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;

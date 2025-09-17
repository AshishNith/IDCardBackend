const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  // Add more fields as needed
});

module.exports = mongoose.model('Card', CardSchema);
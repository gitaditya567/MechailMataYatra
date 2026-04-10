const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
  total: { type: Number, default: 6000 },
  booked: { type: Number, default: 0 }
});

module.exports = mongoose.model('Slot', SlotSchema);

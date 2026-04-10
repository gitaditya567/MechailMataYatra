const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  mobile: { type: String, required: true },
  gender: { type: String, required: true },
  photo: { type: String }, // New field for member photo
  regNo: { type: String } // Sequential registration number for member
});

const BookingSchema = new mongoose.Schema({
  referenceId: { type: String, required: true, unique: true },
  primaryUserMobile: { type: String, required: true },
  darshanDate: { type: String, required: true }, // Format: YYYY-MM-DD
  members: [MemberSchema],
  totalMembers: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);

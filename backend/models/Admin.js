const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // For a production app, we would hash this. For simplicity now, let's keep it.
  name: { type: String, default: 'Administrator' }
});

module.exports = mongoose.model('Admin', AdminSchema);

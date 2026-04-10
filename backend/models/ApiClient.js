const mongoose = require('mongoose');

const ApiClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  permissions: [{ type: String, enum: ['read', 'write'], default: ['read'] }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiClient', ApiClientSchema);

const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: { type: String, required: true, default: 'ACCIDENT' }, // e.g. ACCIDENT, ROADWORK
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  description: { type: String },
  verified: { type: Boolean, default: false },
  reporter: { type: String, default: 'Anonymous' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Incident', incidentSchema);
const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  vehiclePlate: { type: String, required: true },
  violationType: { type: String, required: true }, // e.g. RED_LIGHT, SPEEDING
  amount: { type: Number, required: true },
  lat: { type: Number },
  lng: { type: Number },
  status: { type: String, enum: ['ISSUED', 'PAID'], default: 'ISSUED' },
  issuedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Fine', fineSchema);
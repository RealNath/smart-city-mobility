const mongoose = require('mongoose');

const intersectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  currentState: { type: String, enum: ['RED', 'YELLOW', 'GREEN'], default: 'RED' },
  congestionLevel: { type: Number, default: 0 }, // 0 to 100
  greenWaitTime: { type: Number, default: 30 }, // in seconds
  redWaitTime: { type: Number, default: 30 }, // in seconds
  ledMessage: { type: String, default: 'Drive Safely' },
  recommendedLane: { type: String, default: 'Any Lane' }
});

module.exports = mongoose.model('Intersection', intersectionSchema);
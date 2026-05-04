const express = require('express');
const router = express.Router();
const Fine = require('../models/Fine');

// Get all fines
router.get('/', async (req, res) => {
  try {
    const fines = await Fine.find();
    res.json(fines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue a fine via Electronic System (Tilang Listrik)
router.post('/issue', async (req, res) => {
  try {
    const { vehiclePlate, violationType, lat, lng } = req.body;
    
    const amount = violationType === 'RED_LIGHT' ? 500 : 300; // Mock amounts
    
    const newFine = new Fine({
      vehiclePlate,
      violationType,
      amount,
      lat,
      lng
    });
    
    const savedFine = await newFine.save();
    
    // Simulate sending SMS via Twilio or similar
    console.log(`[SMS MOCK] Fine issued to vehicle ${vehiclePlate}. Amount: $${amount}. Reason: ${violationType}. SMS sent to registered owner.`);
    
    res.status(201).json({ message: 'Fine issued and SMS dispatched', fine: savedFine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
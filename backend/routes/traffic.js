const express = require('express');
const router = express.Router();
const Intersection = require('../models/Intersection');

// Get all intersections
router.get('/', async (req, res) => {
  try {
    const intersections = await Intersection.find();
    res.json(intersections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update traffic level from IoT sensor simulation
router.post('/:id/traffic-data', async (req, res) => {
  try {
    const { congestionLevel } = req.body;
    const intersection = await Intersection.findByIdAndUpdate(
      req.params.id,
      { congestionLevel },
      { new: true }
    );
    res.json(intersection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
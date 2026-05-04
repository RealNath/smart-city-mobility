const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');

// Get all incidents
router.get('/', async (req, res) => {
  try {
    const incidents = await Incident.find();
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Report an incident
router.post('/', async (req, res) => {
  try {
    const newIncident = new Incident(req.body);
    const savedIncident = await newIncident.save();
    res.status(201).json(savedIncident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify incident (Admin)
router.patch('/:id/verify', async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { verified: true },
      { new: true }
    );

    // Auto-revert verification after 1 minute (60,000 ms)
    setTimeout(async () => {
      try {
        await Incident.findByIdAndUpdate(req.params.id, { verified: false });
        console.log(`Incident ${req.params.id} automatically unverified after 1 minute.`);
      } catch (e) {
        console.error('Failed to auto-revert incident verification:', e);
      }
    }, 60000);

    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete incident (Dismiss)
router.delete('/:id', async (req, res) => {
  try {
    await Incident.findByIdAndDelete(req.params.id);
    res.json({ message: 'Incident removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const trafficRoutes = require('./routes/traffic');
const incidentRoutes = require('./routes/incidents');
const fineRoutes = require('./routes/fines');
const { startSimulation } = require('./simulations/engine');
const Intersection = require('./models/Intersection');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/traffic', trafficRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/fines', fineRoutes);

// Helper for initial seed
app.post('/api/seed', async (req, res) => {
  try {
    const Incident = require('./models/Incident');
    const Fine = require('./models/Fine');
    await Intersection.deleteMany({});
    await Incident.deleteMany({});
    await Fine.deleteMany({});

    // Dynamically fetch live traffic light locations in Bandung via Overpass API (OpenStreetMap)
    const overpassQuery = `
      [out:json];
      node["highway"="traffic_signals"](-6.98,107.52,-6.83,107.72);
      out body;
    `;

    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'overpass-api.de',
        path: '/api/interpreter',
        method: 'POST',
        family: 4, // Force IPv4 to prevent ETIMEDOUT
        headers: {
          'User-Agent': 'SmartCityMobility/1.0'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Overpass API error: ${res.statusCode} - ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse JSON from Overpass API'));
          }
        });
      });

      req.on('error', reject);
      req.write(overpassQuery);
      req.end();
    });

    // Transform the raw OSM nodes into our Intersection schema
    const states = ['RED', 'YELLOW', 'GREEN'];
    const seedIntersections = data.elements.map((el, i) => ({
      name: el.tags?.name || `Traffic Light Node ${i + 1}`,
      lat: el.lat,
      lng: el.lon,
      currentState: states[Math.floor(Math.random() * states.length)]
    }));

    if (seedIntersections.length === 0) {
      throw new Error("No traffic lights found in the specified area");
    }

    await Intersection.insertMany(seedIntersections);
    res.json({ message: 'Seed successful with live OSM data', count: seedIntersections.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-city';

mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startSimulation(); // Start the AI/IoT simulation loop
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});
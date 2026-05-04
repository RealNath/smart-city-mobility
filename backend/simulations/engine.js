const Intersection = require('../models/Intersection');
const Incident = require('../models/Incident');
const { generateAIAccident } = require('../services/ai');

// Helper to calculate distance between two lat/lng coordinates in km (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// This simulates the "AI-integrated traffic light with adjusted wait time" 
// and "IoT-integrated adaptive traffic management".
const startSimulation = () => {
  console.log('[SIMULATION] Engine started.');

  // Trigger AI accident generation randomly between 30 and 60 seconds
  const scheduleNextAIAccident = () => {
    const delay = Math.floor(Math.random() * 30000) + 30000; // 30s–60s
    // console.log(`[AI] Next accident scheduled in ${Math.round(delay / 1000)}s`);
    setTimeout(async () => {
      await generateAIAccident();
      scheduleNextAIAccident(); // schedule next one after this one finishes
    }, delay);
  };
  scheduleNextAIAccident();

  setInterval(async () => {
    try {

      const intersections = await Intersection.find();
      const verifiedIncidents = await Incident.find({ verified: true, type: 'ACCIDENT' });

      for (let intersection of intersections) {
        let isAffectedByAccident = false;

        // Check if there is any verified accident nearby (within 0.5 km)
        for (let inc of verifiedIncidents) {
          const dist = getDistance(intersection.lat, intersection.lng, inc.lat, inc.lng);
          if (dist < 0.5) {
            isAffectedByAccident = true;
            break;
          }
        }

        // Randomly simulate IoT traffic congestion updates (0-100)
        // High variation to show clear changes
        let currentCongestion = Math.floor(Math.random() * 101);

        if (isAffectedByAccident) {
          // Force high congestion if there's an accident nearby
          currentCongestion = Math.floor(Math.random() * 10) + 90; // 90-100%
        }

        // AI Logic: Adjust green/red wait times based on congestion
        let greenWaitTime = 30; // base
        let redWaitTime = 30;
        let ledMessage = 'Drive Safely';
        let recommendedLane = 'Any Lane';

        const isEmergency = Math.random() < 0.15; // 15% chance of emergency event

        if (isAffectedByAccident) {
          // Accident handling: severely limit green time to prevent more cars from entering the area
          greenWaitTime = 10;
          redWaitTime = 60;
          ledMessage = 'ACCIDENT AHEAD: AVOID AREA';
          recommendedLane = 'Use alternative routes';
        } else if (isEmergency) {
          ledMessage = 'EMERGENCY: CLEAR LEFT LANE';
          recommendedLane = 'Move to right lane';
          // Force green light to let emergency pass
          greenWaitTime = 60;
          redWaitTime = 10;
        } else if (currentCongestion > 75) {
          // Congested: increase green light duration
          greenWaitTime = 60;
          redWaitTime = 20;
          ledMessage = 'SLOW DOWN: HEAVY TRAFFIC';
          recommendedLane = 'Use alternative routes';
        } else if (currentCongestion < 25) {
          // Low traffic: decrease green light duration
          greenWaitTime = 20;
          redWaitTime = 40;
        } else if (Math.random() < 0.2) {
          // Normal traffic but bus lane active
          ledMessage = 'BUS LANE ONLY ACTIVE';
          recommendedLane = 'Stay in right lane';
        }

        // Simulate light changing over time
        let nextState = intersection.currentState;
        if (!isEmergency && !isAffectedByAccident) {
          const states = ['RED', 'YELLOW', 'GREEN'];
          const currentIndex = states.indexOf(intersection.currentState);
          nextState = states[(currentIndex + 1) % states.length];
        } else if (isAffectedByAccident) {
          nextState = 'RED'; // Try to stop traffic flowing into the accident
        } else {
          nextState = 'GREEN'; // override for emergency
        }

        await Intersection.findByIdAndUpdate(intersection._id, {
          congestionLevel: currentCongestion,
          greenWaitTime,
          redWaitTime,
          ledMessage,
          recommendedLane,
          currentState: nextState
        });
      }
    } catch (err) {
      console.error('[SIMULATION] Error:', err.message);
    }
  }, 10000); // Run simulation loop every 10 seconds
};

module.exports = { startSimulation };
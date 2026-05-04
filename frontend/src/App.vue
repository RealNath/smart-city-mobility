<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Map from './components/Map.vue';

const intersections = ref<any[]>([]);
const incidents = ref<any[]>([]);
const fines = ref<any[]>([]);
const focusedNode = ref<any>(null);
const searchQuery = ref('');

const filteredIntersections = computed(() => {
  if (!searchQuery.value) return intersections.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return intersections.value.filter((node: any) => 
    node.name.toLowerCase().includes(lowerCaseQuery)
  );
});

const API_URL = '/api';

const fetchData = async () => {
  try {
    const [trafficRes, incidentsRes, finesRes] = await Promise.all([
      fetch(`${API_URL}/traffic`),
      fetch(`${API_URL}/incidents`),
      fetch(`${API_URL}/fines`)
    ]);
    
    intersections.value = await trafficRes.json();
    incidents.value = await incidentsRes.json();
    fines.value = await finesRes.json();
  } catch (err) {
    console.error('Error fetching data:', err);
  }
};

const handleMapClick = async (latlng: any) => {
  const confirmIncident = window.confirm(`Report an accident at ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}?`);
  if (confirmIncident) {
    try {
      await fetch(`${API_URL}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ACCIDENT',
          lat: latlng.lat,
          lng: latlng.lng,
          description: 'User reported accident'
        })
      });
      fetchData(); // Refresh data
    } catch (err) {
      console.error(err);
    }
  }
};

const verifyIncident = async (id: string) => {
  try {
    await fetch(`${API_URL}/incidents/${id}/verify`, { method: 'PATCH' });
    fetchData();
  } catch (err) {
    console.error(err);
  }
};

const dismissIncident = async (id: string) => {
  try {
    await fetch(`${API_URL}/incidents/${id}`, { method: 'DELETE' });
    fetchData();
  } catch (err) {
    console.error(err);
  }
};

const simulateFine = async () => {
  const plates = ['B 1234 XYZ', 'D 9999 ABC', 'L 0001 JKT'];
  const types = ['RED_LIGHT', 'SPEEDING'];
  try {
    await fetch(`${API_URL}/fines/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehiclePlate: plates[Math.floor(Math.random() * plates.length)],
        violationType: types[Math.floor(Math.random() * types.length)],
        lat: -6.9147,
        lng: 107.6098
      })
    });
    fetchData(); // Refresh data
    alert('Simulated fine issued and SMS dispatched!');
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  // Try seeding on start
  fetch(`${API_URL}/seed`, { method: 'POST' }).then(() => {
    fetchData();
  });
  
  // Polling every 5 seconds for simulation updates
  setInterval(fetchData, 5000);
});
</script>

<template>
  <div class="app-container">
    <div class="top-bar">
      <div class="user-profile">
        <div class="avatar">👨‍💼</div>
        <div class="user-info">
          <span class="user-name">Admin User</span>
          <span class="user-role">City Manager</span>
        </div>
      </div>
      <button class="settings-btn" title="Settings">⚙️</button>
    </div>
    
    <header class="header">
      <h1>Smart City Mobility</h1>
      <p>AI Traffic Lights & IoT Management System</p>
    </header>
    
    <div class="main-content">
      <div class="left-panel">
        <h2>Live Traffic Map</h2>
        <Map :intersections="intersections" :incidents="incidents" :focusedNode="focusedNode" @map-click="handleMapClick" @verify-incident="verifyIncident" @dismiss-incident="dismissIncident" />
        <p class="help-text">Click on the map to report a human-verified traffic accident.</p>
      </div>
      
      <div class="right-panel">
        <div class="dashboard-section">
          <h2>Intersection Nodes (IoT & AI)</h2>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search traffic light..." 
            class="search-input"
          />
          <ul class="interactive-list intersection-list">
            <li v-for="node in filteredIntersections" :key="node._id" class="node-item" @click="focusedNode = node">
              <strong>{{ node.name }}</strong> - State: 
              <span :class="'state-' + node.currentState.toLowerCase()">{{ node.currentState }}</span> 
              <br/>
              Congestion: {{ node.congestionLevel }}% | 
              AI Timings (Green/Red): {{ node.greenWaitTime }}s / {{ node.redWaitTime }}s
            </li>
          </ul>
        </div>
        
        <div class="dashboard-section">
          <h2>Electronic Fines (Tilang Listrik)</h2>
          <button @click="simulateFine" class="action-btn">Simulate Fine (Run Red Light)</button>
          <ul>
            <li v-for="fine in fines" :key="fine._id">
              {{ fine.vehiclePlate }} - {{ fine.violationType }} - ${{ fine.amount }} ({{ fine.status }})
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

body {
  margin: 0;
  font-family: 'Roboto', sans-serif;
  background-color: #E5EEE4;
  color: #1D1B20;
}

h1, h2, h3, h4, h5, h6 {
  color: #1D1B20;
  margin-top: 0;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: -10px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #FEF7FF;
  padding: 6px 16px 6px 6px;
  border-radius: 100px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-profile:hover {
  background: #F3EDF7;
}

.avatar {
  background: #EADDFF;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1D1B20;
}

.user-role {
  font-size: 0.8rem;
  color: #49454F;
}

.settings-btn {
  background: #FEF7FF;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  transition: background-color 0.2s, transform 0.2s;
}

.settings-btn:hover {
  background: #F3EDF7;
  transform: rotate(30deg);
}

.settings-btn:active {
  background: #EADDFF;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #468432;
}

.header p {
  font-size: 1.1rem;
  color: #49454F;
  margin-top: 8px;
}

.main-content {
  display: flex;
  gap: 24px;
}

.left-panel {
  flex: 2;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-section {
  background: #FEF7FF;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.dashboard-section h2 {
  font-size: 1.25rem;
  margin-bottom: 16px;
  color: #468432;
}

.help-text {
  font-size: 0.9rem;
  color: #49454F;
  margin-top: 12px;
  text-align: center;
}

.state-green { color: #146c2e; font-weight: 700; }
.state-red { color: #b3261e; font-weight: 700; }
.state-yellow { color: #bca000; font-weight: 700; }

.action-btn {
  background: #468432;
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  border-radius: 100px;
  cursor: pointer;
  width: 100%;
  margin-bottom: 16px;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  transition: background-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

.action-btn:hover {
  background: #503d82;
  box-shadow: 0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
}

.action-btn:active {
  background: #40306c;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  padding: 12px 16px;
  border-bottom: 1px solid #CAC4D0;
  font-size: 0.95rem;
}

li:last-child {
  border-bottom: none;
}

.interactive-list .node-item {
  cursor: pointer;
  transition: background-color 0.2s, border-radius 0.2s;
  border-bottom: none;
  border-radius: 12px;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.interactive-list .node-item:hover {
  background-color: #EADDFF;
}

.intersection-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #CAC4D0;
  border-radius: 12px;
  padding: 8px;
}

.intersection-list::-webkit-scrollbar {
  width: 8px;
}
.intersection-list::-webkit-scrollbar-track {
  background: transparent;
}
.intersection-list::-webkit-scrollbar-thumb {
  background: #CAC4D0;
  border-radius: 4px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid #79747E;
  border-radius: 28px;
  box-sizing: border-box;
  font-size: 1rem;
  background-color: #FEF7FF;
  color: #1D1B20;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: 'Roboto', sans-serif;
}

.search-input:focus {
  outline: none;
  border-color: #468432;
  border-width: 2px;
  padding: 11px 15px; /* offset for border width */
}

.led-board {
  margin-top: 8px;
  padding: 8px;
  background-color: #222;
  color: #fff;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.95em;
}

.led-text {
  color: #ffaa00;
  font-weight: bold;
}
</style>
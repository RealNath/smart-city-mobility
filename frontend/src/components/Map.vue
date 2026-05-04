<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markers: Record<string, L.Marker> = {};

// Fix leaflet default icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const props = defineProps<{
  intersections: Array<any>;
  incidents: Array<any>;
  focusedNode?: any;
}>();

const emit = defineEmits(['map-click', 'verify-incident', 'dismiss-incident']);

const getColor = (state: string) => {
  if (state === 'GREEN') return 'green';
  if (state === 'YELLOW') return 'yellow';
  return 'red';
};

const createCircleMarker = (node: any) => {
  return L.circleMarker([node.lat, node.lng], {
    color: getColor(node.currentState),
    fillColor: getColor(node.currentState),
    fillOpacity: 0.8,
    radius: 10
  }).bindPopup(`<b>${node.name}</b><br/>State: <strong>${node.currentState}</strong><br/>Congestion: ${node.congestionLevel}%`);
};

const ambulanceIcon = L.divIcon({
  html: '<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚑</div>',
  className: 'ambulance-emoji',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const unverifiedIcon = L.divIcon({
  html: '<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">❗</div>',
  className: 'incident-emoji',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const verifiedIcon = L.divIcon({
  html: '<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">❌</div>',
  className: 'incident-emoji',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value).setView([-6.9147, 107.6098], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (e) => {
      emit('map-click', e.latlng);
    });

    renderMarkers();
  }
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});

const renderMarkers = () => {
  if (!map) return;

  // Clear existing markers
  Object.values(markers).forEach(m => m.remove());
  markers = {};

  // --- Overlap detection helper ---
  // Returns a list of all marker entries within `pixelRadius` pixels of a given latlng
  const getNearbyMarkerEntries = (latlng: L.LatLng, pixelRadius = 6) => {
    const clickPoint = map!.latLngToContainerPoint(latlng);
    return Object.entries(markers).filter(([, m]) => {
      const markerLatLng = (m as any).getLatLng ? (m as any).getLatLng() : null;
      if (!markerLatLng) return false;
      const markerPoint = map!.latLngToContainerPoint(markerLatLng);
      const dx = clickPoint.x - markerPoint.x;
      const dy = clickPoint.y - markerPoint.y;
      return Math.sqrt(dx * dx + dy * dy) <= pixelRadius;
    });
  };

  // Opens a chooser popup listing all overlapping markers
  const openChooserPopup = (latlng: L.LatLng, entries: [string, any][]) => {
    const items = entries.map(([key]) => {
      if (key.startsWith('node_')) {
        const node = props.intersections.find((n: any) => `node_${n._id}` === key);
        return node ? `<li><a href="#" class="chooser-link" data-key="${key}" style="color:#6750A4;text-decoration:none;font-weight:500;">🚦 ${node.name}</a></li>` : '';
      } else if (key.startsWith('inc_')) {
        const inc = props.incidents.find((i: any) => `inc_${i._id}` === key);
        return inc ? `<li><a href="#" class="chooser-link" data-key="${key}" style="color:#B3261E;text-decoration:none;font-weight:500;">${inc.verified ? '❌' : '❗'} Incident: ${inc.type}</a></li>` : '';
      } else if (key === 'mock_ambulance') {
        return `<li><a href="#" class="chooser-link" data-key="${key}" style="color:#E65100;text-decoration:none;font-weight:500;">🚑 Ambulance</a></li>`;
      }
      return '';
    }).filter(Boolean);

    L.popup({ maxWidth: 260 })
      .setLatLng(latlng)
      .setContent(`
        <div style="font-family:'Roboto',sans-serif;">
          <b style="font-size:0.95em;color:#1D1B20;">Multiple items here. Select one:</b>
          <ul style="list-style:none;padding:8px 0 0 0;margin:0;display:flex;flex-direction:column;gap:6px;">
            ${items.join('')}
          </ul>
        </div>
      `)
      .openOn(map!);

    // Attach click handlers after popup DOM is ready
    setTimeout(() => {
      const popup = document.querySelectorAll('.chooser-link');
      popup.forEach((el) => {
        (el as HTMLElement).onclick = (ev) => {
          ev.preventDefault();
          map!.closePopup();
          const key = (el as HTMLElement).dataset.key!;
          const targetMarker = markers[key];
          if (targetMarker && (targetMarker as any).openPopup) {
            (targetMarker as any).openPopup();
          }
        };
      });
    }, 50);
  };

  // Add intersection markers
  props.intersections.forEach(node => {
    const marker = createCircleMarker(node) as any;
    marker.on('click', (e: any) => {
      L.DomEvent.stopPropagation(e);
      const nearby = getNearbyMarkerEntries(marker.getLatLng());
      if (nearby.length > 1) {
        openChooserPopup(marker.getLatLng(), nearby);
      } else {
        marker.openPopup();
      }
    });
    marker.addTo(map!);
    markers[`node_${node._id}`] = marker;
  });

  // Add incident markers
  props.incidents.forEach(inc => {
    const descriptionHtml = inc.description
      ? `<br/><br/><span style="font-size: 0.9em; color: #444;">${inc.description}</span>`
      : '';
    const reporterHtml = inc.reporter
      ? `<br/><span style="font-size: 0.8em; color: #888;">Reported by: ${inc.reporter}</span>`
      : '';

    let htmlContent = `<b>Incident: ${inc.type}</b><br/>Status: ${inc.verified ? 'Verified ❌' : 'Unverified ❗'}${descriptionHtml}${reporterHtml}`;
    
    if (!inc.verified) {
      htmlContent += `<br/><br/>
        <div style="display: flex; gap: 8px;">
          <button class="verify-btn" style="background: #6750A4; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 100px; font-size: 0.85em; font-family: 'Roboto', sans-serif; font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">Verify</button>
          <button class="dismiss-btn" style="background: #B3261E; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 100px; font-size: 0.85em; font-family: 'Roboto', sans-serif; font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">Dismiss</button>
        </div>`;
    }

    const marker = L.marker([inc.lat, inc.lng], { icon: inc.verified ? verifiedIcon : unverifiedIcon })
      .bindPopup(htmlContent);
      
    marker.on('popupopen', (e: any) => {
      const verifyBtn = e.popup._contentNode.querySelector('.verify-btn');
      if (verifyBtn) {
        verifyBtn.onclick = () => emit('verify-incident', inc._id);
      }
      const dismissBtn = e.popup._contentNode.querySelector('.dismiss-btn');
      if (dismissBtn) {
        dismissBtn.onclick = () => emit('dismiss-incident', inc._id);
      }
    });

    marker.on('click', (e: any) => {
      L.DomEvent.stopPropagation(e);
      const nearby = getNearbyMarkerEntries(marker.getLatLng());
      if (nearby.length > 1) {
        openChooserPopup(marker.getLatLng(), nearby);
      } else {
        marker.openPopup();
      }
    });

    marker.addTo(map!);
    markers[`inc_${inc._id}`] = marker;
  });

  // Add mock ambulance
  const ambulanceMarker = L.marker([-6.9120, 107.6080], { icon: ambulanceIcon })
    .bindPopup('<b>Ambulance</b><br/>Emergency Response in progress');
  ambulanceMarker.addTo(map!);
  markers['mock_ambulance'] = ambulanceMarker;
};

// Re-render when props change
import { watch } from 'vue';
watch(() => [props.intersections, props.incidents], () => {
  renderMarkers();
}, { deep: true });

watch(() => props.focusedNode, (node) => {
  if (node && map) {
    map.flyTo([node.lat, node.lng], 16, { animate: true, duration: 1.5 });
    if (markers[`node_${node._id}`]) {
      setTimeout(() => {
        markers[`node_${node._id}`].openPopup();
      }, 1500); // Wait for flyTo to finish roughly
    }
  }
}, { deep: true });

</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div class="alert-panel">
      <div class="warning-message">
        <span class="icon">🚨</span> <strong>Warning:</strong> There's an ambulance approaching!
      </div>
      <div class="lane-suggestion">
        <span class="icon">➡️</span> <strong>Lane Suggestion:</strong> Please clear the center lane and move to the left lane to yield to emergency vehicles.
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-container {
  height: 500px;
  width: 100%;
  border-radius: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  z-index: 1;
}

.alert-panel {
  width: 100%;
  box-sizing: border-box;
  background: #FEF7FF;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-message {
  color: #B3261E; /* Material 3 Error */
  background-color: #F9DEDC; /* Error Container */
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  font-weight: 500;
}

.lane-suggestion {
  color: #006874; /* Material 3 Custom Primary */
  background-color: #97F0FF; /* Custom Primary Container */
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  font-weight: 500;
}

.icon {
  margin-right: 8px;
  font-size: 1.2rem;
  vertical-align: middle;
}
</style>
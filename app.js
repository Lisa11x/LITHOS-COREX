/*
 * Client‑side logic for the LithoCoreX prototype.  This file sets up
 * the interactive Leaflet map, loads pre‑defined sample layers for
 * official/unofficial/potential/magnetic/geologic zones from a local
 * JSON file, and implements a search interface that queries the
 * backend for mineral information using the Mindat API.
 */

// Immediately invoked async function to allow use of await at top level
(async () => {
  // Initialise the map focused roughly on Switzerland
  const map = L.map('map', {
    center: [46.8, 8.3],
    zoom: 7
  });

  // Base tile layer (OpenStreetMap).  Leaflet supports multiple base
  // layers, but we start with a single one here.  See the Leaflet
  // documentation for additional base layer examples【227324984700939†L56-L103】.
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  });
  osm.addTo(map);

  // Define overlay layer groups.  Each group represents one category
  // (official, unofficial, potential zones, magnetic anomalies and
  // geologic layers).  The groups are added to the map via a
  // layers control defined further below.  Leaflet allows multiple
  // overlays to be visible concurrently【227324984700939†L45-L103】.
  const layers = {
    official: L.layerGroup(),
    unofficial: L.layerGroup(),
    potential: L.layerGroup(),
    magnetic: L.layerGroup(),
    geologic: L.layerGroup(),
    search: L.layerGroup()
  };

  // Load sample site data from JSON.  In a production setting these
  // would be fetched from the server or computed from Mindat data.  The
  // JSON file contains an array of objects with type, name, mineral,
  // coordinates, colour and description.  See data/sites.json for
  // examples.
  async function loadSampleSites() {
    try {
      const resp = await fetch('data/sites.json');
      const data = await resp.json();
      data.forEach((site) => {
        const group = layers[site.type];
        if (!group) return;
        const marker = L.circleMarker([site.latitude, site.longitude], {
          radius: 6,
          fillColor: site.color,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        }).bindPopup(
          `<strong>${site.mineral}</strong> – ${site.name}<br>` +
            `${site.description}<br>` +
            `<a href="${site.routeLink}" target="_blank">Route planen</a>`
        );
        marker.addTo(group);
      });
    } catch (err) {
      console.error('Error loading sample sites:', err);
    }
  }

  await loadSampleSites();

  // Add overlay controls for the sample layers.  Each key/value pair
  // defines the label shown in the control and the corresponding
  // layer group.  Users can toggle these on/off in the legend.
  const overlays = {
    'Offizielle Fundorte': layers.official,
    'Inoffizielle Fundorte': layers.unofficial,
    'Potenzialzonen': layers.potential,
    'Magnetanomalien': layers.magnetic,
    'Geologische Schichten': layers.geologic,
    'Suchergebnisse': layers.search
  };
  L.control.layers(null, overlays).addTo(map);

  // Populate the layer toggle area outside of the default Leaflet
  // control.  This provides a custom UI where toggles can be styled
  // differently.  Each toggle simply adds or removes the layer from
  // the map.  The toggle state is maintained via checkbox input.
  function initCustomLayerControls() {
    const container = document.getElementById('layerControls');
    Object.keys(overlays).forEach((key) => {
      const layerGroup = overlays[key];
      const wrapper = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          layerGroup.addTo(map);
        } else {
          map.removeLayer(layerGroup);
        }
      });
      wrapper.appendChild(checkbox);
      wrapper.appendChild(document.createTextNode(key));
      container.appendChild(wrapper);
    });
  }

  initCustomLayerControls();

  // Setup search functionality.  On click of the search button, call
  // the backend endpoint to search for minerals.  Render results in
  // the sidebar and allow selection.  When a result is clicked, fetch
  // localities and place markers.
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const resultsDiv = document.getElementById('searchResults');

  async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      resultsDiv.classList.add('hidden');
      resultsDiv.innerHTML = '';
      return;
    }
    try {
      const resp = await fetch(`/api/searchMineral?query=${encodeURIComponent(query)}`);
      const data = await resp.json();
      resultsDiv.innerHTML = '';
      if (!data.minerals || data.minerals.length === 0) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<div class="result-item">Keine Treffer</div>';
        return;
      }
      data.minerals.forEach((min) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.textContent = min.name;
        item.title = min.formula || '';
        item.addEventListener('click', () => selectMineral(min));
        resultsDiv.appendChild(item);
      });
      resultsDiv.classList.remove('hidden');
    } catch (err) {
      console.error('Search error', err);
    }
  }

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  // Clear existing search markers and load new localities for the
  // selected mineral.  Each locality is added to the 'search' layer
  // group.  After fetching, zoom the map to fit the markers.
  async function selectMineral(mineral) {
    layers.search.clearLayers();
    resultsDiv.classList.add('hidden');
    searchInput.value = mineral.name;
    try {
      const resp = await fetch(`/api/localities?mineralId=${encodeURIComponent(mineral.id)}`);
      const data = await resp.json();
      if (!data.localities || data.localities.length === 0) {
        alert('Keine Fundorte für dieses Mineral gefunden.');
        return;
      }
      const markers = [];
      data.localities.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return;
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 6,
          fillColor: '#3b82f6',
          color: '#1e40af',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        }).bindPopup(
          `<strong>${mineral.name}</strong> – ${loc.name}<br>` +
            (loc.description ? `${loc.description}<br>` : '') +
            `<a href="${loc.routeLink}" target="_blank">Route planen</a>`
        );
        marker.addTo(layers.search);
        markers.push(marker);
      });
      // Auto‑toggle the search layer on
      if (!map.hasLayer(layers.search)) {
        layers.search.addTo(map);
      }
      // Fit map to markers
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    } catch (err) {
      console.error('Failed to load localities', err);
    }
  }
})();
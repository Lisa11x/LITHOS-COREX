// Wartet, bis das HTML-Dokument vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // =================================================================
  //      KONFIGURATION & INITIALISIERUNG
  // =================================================================
  const API_KEY = '6184997cfb3b79aac9eab4d750ce29b0'; // WICHTIG: Ersetze dies durch deinen echten API-Key!
  const BASE_URL = 'https://api.mindat.org/v1/';

  // Initialisiert die Leaflet-Karte, zentriert auf die Schweiz
  const map = L.map('map').setView([46.8, 8.2], 8);

  // Basis-Kartenlayer von OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // =================================================================
  //      KARTEN-LAYER
  // =================================================================

  // Layer-Gruppe für die Suchergebnisse von Mindat
  const mindatLayer = L.layerGroup().addTo(map);

  // Geologischer Layer von Swisstopo
  const geologyLayer = L.tileLayer.wms(
    'https://wms.geo.admin.ch/',
    {
      layers: 'ch.swisstopo.geologie-gesteinsdaecher',
      format: 'image/png',
      transparent: true,
      attribution: '© Swisstopo',
    }
  );

  // Objekt, das die Basis- und Overlay-Layer für die Steuerung enthält
  const baseLayers = {};
  const overlayLayers = {
    'Mineral-Fundorte (Mindat)': mindatLayer,
    'Geologie (Swisstopo)': geologyLayer,
  };

  // Fügt die Layer-Steuerung zur Karte hinzu
  L.control.layers(baseLayers, overlayLayers).addTo(map);

  // =================================================================
  //      API & DATENVERARBEITUNG
  // =================================================================

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  async function searchAndDisplayMinerals() {
    const query = searchInput.value;
    if (!query) {
      alert('Bitte gib ein Mineral zum Suchen ein.');
      return;
    }
    if (API_KEY === 'DEIN_API_KEY_HIER' || !API_KEY) {
      alert(
        'FEHLER: Bitte füge deinen Mindat-API-Key in die app.js Datei ein.'
      );
      return;
    }

    // Bestehende Marker von der Karte entfernen
    mindatLayer.clearLayers();
    searchBtn.disabled = true; // Deaktiviert den Button während der Suche
    searchBtn.textContent = 'Suche...'; // Ändert den Button-Text

    try {
      // NEU: Wir führen zwei API-Anfragen gleichzeitig aus
      const [localitiesRes, mineralRes] = await Promise.all([
        fetch(
          `${BASE_URL}localities/?mineral_name=${query}&country=Switzerland&page_size=100`,
          { headers: { Authorization: `Token ${API_KEY}` } }
        ),
        fetch(`${BASE_URL}minerals/?name=${query}`, {
          headers: { Authorization: `Token ${API_KEY}` },
        }),
      ]);

      if (!localitiesRes.ok || !mineralRes.ok)
        throw new Error(`API-Fehler`);

      const localitiesData = await localitiesRes.json();
      const mineralData = await mineralRes.json();

      // NEU: Wir holen uns die Beschreibung aus der Mineral-Antwort
      const mineralDescription =
        mineralData.results[0]?.description_short || 'Keine Beschreibung verfügbar.';

      if (localitiesData.results.length === 0) {
        alert('Keine Fundorte für dieses Mineral in der Schweiz gefunden.');
        return;
      }

      // Füge für jeden Fundort einen Marker hinzu
      localitiesData.results.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          const marker = L.marker([loc.latitude, loc.longitude]).addTo(
            mindatLayer
          );

          // NEU: Das Popup enthält jetzt die Mineral-Beschreibung
          const popupContent = `
            <b>${loc.name}</b><br>
            <i>Gefundenes Mineral: ${query}</i><br><br>
            <b>Beschreibung:</b><br>
            <p style="margin: 0; max-height: 100px; overflow-y: auto;">${mineralDescription}</p><br>
            <a href="https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}" target="_blank">Route mit Google Maps</a>
          `;
          marker.bindPopup(popupContent);
        }
      });

      // Zoomt auf die neuen Marker
      if (mindatLayer.getLayers().length > 0) {
        map.fitBounds(mindatLayer.getBounds());
      }

    } catch (error) {
      console.error('Fehler bei der Suche:', error);
      alert('Ein Fehler ist aufgetreten. Überprüfe die Konsole.');
    } finally {
      // NEU: Setzt den Such-Button wieder zurück, auch wenn ein Fehler auftritt
      searchBtn.disabled = false;
      searchBtn.textContent = 'Suchen';
    }
  }

  // =================================================================
  //      EVENT LISTENERS
  // =================================================================
  searchBtn.addEventListener('click', searchAndDisplayMinerals);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      searchAndDisplayMinerals();
    }
  });
});

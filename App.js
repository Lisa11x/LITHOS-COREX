// Wartet, bis das HTML-Dokument vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // =================================================================
  //      KONFIGURATION & INITIALISIERUNG
  // =================================================================
  const API_KEY = '6184997cfb3b79aac9eab4d750ce29b0; // WICHTIG: Ersetze dies durch deinen echten API-Key!
  const BASE_URL = 'https://api.mindat.org/v1/';

  // Initialisiert die Leaflet-Karte, zentriert auf die Schweiz
  const map = L.map('map').setView([46.8, 8.2], 8);

  // Basis-Kartenlayer von OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // =================================================================
  //      KARTEN-LAYER
  // =================================================================

  // Layer-Gruppe für die Suchergebnisse von Mindat
  const mindatLayer = L.layerGroup().addTo(map);

  // Geologischer Layer von Swisstopo (dein Wunsch)
  const geologyLayer = L.tileLayer.wms(
    'https://wms.geo.admin.ch/',
    {
      layers: 'ch.swisstopo.geologie-gesteinsdaecher',
      format: 'image/png',
      transparent: true,
      attribution: '&copy; Swisstopo',
    }
  );

  // Objekt, das die Basis- und Overlay-Layer für die Steuerung enthält
  const baseLayers = {}; // Keine unterschiedlichen Basiskarten für den Moment
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

    try {
      // Rufe Fundorte ab, die zum Mineralnamen und zur Schweiz passen
      const response = await fetch(
        `${BASE_URL}localities/?mineral=${query}&country=Switzerland&page_size=100`,
        { headers: { Authorization: `Token ${API_KEY}` } }
      );

      if (!response.ok)
        throw new Error(`API-Fehler: ${response.statusText}`);

      const data = await response.json();

      if (data.results.length === 0) {
        alert('Keine Fundorte für dieses Mineral in der Schweiz gefunden.');
        return;
      }

      // Füge für jeden Fundort einen Marker hinzu
      data.results.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          const marker = L.marker([loc.latitude, loc.longitude]).addTo(
            mindatLayer
          );

          // Erstelle den Inhalt für das Popup
          const popupContent = `
            <b>${loc.name}</b><br>
            <i>gefundenes Mineral: ${query}</i><br><br>
            Geologischer Kontext: [Erklärung folgt...]<br>
            <a href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}" target="_blank">Route mit Google Maps</a>
          `;
          marker.bindPopup(popupContent);
        }
      });

      // Zoomt auf die neuen Marker
      map.fitBounds(mindatLayer.getBounds());
    } catch (error) {
      console.error('Fehler bei der Suche:', error);
      alert('Ein Fehler ist aufgetreten. Überprüfe die Konsole.');
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

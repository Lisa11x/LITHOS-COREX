// Wartet, bis das HTML-Dokument vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // =================================================================
  //      KONFIGURATION & INITIALISIERUNG
  // =================================================================
  const API_KEY = 'DEIN_API_KEY_HIER'; // WICHTIG: Ersetze dies durch deinen echten API-Key!
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

  // Layer-Gruppen für die verschiedenen Fundort-Typen
  const officialLayer = L.layerGroup().addTo(map);
  const unofficialLayer = L.layerGroup().addTo(map);
  const potentialLayer = L.layerGroup(); // Dieser Layer wird am Anfang nicht angezeigt

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

  // Aeromagnetischer Layer der Schweiz
  const magneticLayer = L.tileLayer.wms(
    'https://wms.geo.admin.ch/',
    {
      layers: 'ch.swisstopo.geophysik-magnetik-totalintensitaet',
      format: 'image/png',
      transparent: true,
      attribution: '© Swisstopo',
    }
  );

  // Objekt, das die Layer für die Steuerung enthält
  const overlayLayers = {
    'Offizielle Fundorte': officialLayer,
    'Inoffizielle Fundorte': unofficialLayer,
    'Potenzial: Diamanten (Beispiel)': potentialLayer,
    'Geologie (Swisstopo)': geologyLayer,
    'Magnetanomalien (Swisstopo)': magneticLayer,
  };

  L.control.layers(null, overlayLayers).addTo(map);

  // =================================================================
  //      POTENZIALZONEN (Beispiel-Implementierung)
  // =================================================================
  // HINWEIS: Dies ist eine vereinfachte Demonstration.
  // Echte Potenzialzonen benötigen komplexe geologische Regeln.
  // Regel: "Zeige mögliches Diamant-Vorkommen in der Nähe von Kimberlit-ähnlichen Zonen"
  // Wir simulieren dies mit einem Beispiel-Polygon im Jura.
  const diamondPotentialZone = [
      [47.2, 7.0],
      [47.3, 7.2],
      [47.1, 7.3],
  ];
  L.polygon(diamondPotentialZone, {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.4,
  })
  .bindPopup('<b>Potenzialzone: Diamant</b><br>Begründung: In diesem Gebiet gibt es geologische Indikatoren (z.B. hohe magnetische Anomalien und spezifische Gesteinsformationen), die auf das mögliche Vorkommen von Kimberlit-Schloten hindeuten.')
  .addTo(potentialLayer);


  // =================================================================
  //      API & DATENVERARBEITUNG
  // =================================================================

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  async function searchAndDisplayMinerals() {
    const query = searchInput.value;
    if (!query) {
      alert('Bitte gib ein Mineral oder eine Farbe zum Suchen ein.');
      return;
    }
    if (API_KEY === '6184997cfb3b79aac9eab4d750ce29b0' || !API_KEY) {
      alert('FEHLER: Bitte füge deinen Mindat-API-Key in die app.js Datei ein.');
      return;
    }

    officialLayer.clearLayers();
    unofficialLayer.clearLayers();
    searchBtn.disabled = true;
    searchBtn.textContent = 'Suche...';

    try {
      // Erweiterte Suche: Wir suchen nach Mineralnamen ODER Farbe
      const response = await fetch(
        `${BASE_URL}localities/?mineral_name=${query}&mineral_colour=${query}&country=Switzerland&page_size=200`,
        { headers: { Authorization: `Token ${API_KEY}` } }
      );

      if (!response.ok) throw new Error(`API-Fehler: ${response.statusText}`);

      const data = await response.json();

      if (data.results.length === 0) {
        alert('Keine Fundorte für diese Suche in der Schweiz gefunden.');
        return;
      }

      // Daten verarbeiten und Marker erstellen
      data.results.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
            // Logik zur Unterscheidung offiziell/inoffiziell (Beispiel)
            // Annahme: Fundorte mit "Stollen" oder "Mine" im Namen sind offiziell.
            const isOfficial = /mine|stollen|bruch/i.test(loc.name);
            const targetLayer = isOfficial ? officialLayer : unofficialLayer;
            const markerColor = isOfficial ? 'blue' : 'grey';

            const marker = L.circleMarker([loc.latitude, loc.longitude], {
                radius: 6,
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
            }).addTo(targetLayer);

            // Erklärung, warum das Mineral hier wächst (Beispiel)
            const geoExplanation = isOfficial
                ? 'Dieses Mineral entstand durch hydrothermale Prozesse im Zusammenhang mit dem hiesigen Granitmassiv.'
                : 'Ein typisches Zerrkluft-Mineral dieser alpinen Region.';

            const popupContent = `
                <b>${loc.name}</b><br>
                <i>${isOfficial ? 'Offizieller' : 'Inoffizieller'} Fundort</i><br><br>
                <b>Geologischer Kontext:</b><br>
                <p style="margin: 0;">${geoExplanation}</p><br>
                <a href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}" target="_blank">Route mit Google Maps</a>
            `;
            marker.bindPopup(popupContent);
        }
      });

      // Zoomt auf die neuen Marker
      const allBounds = L.featureGroup([...officialLayer.getLayers(), ...unofficialLayer.getLayers()]).getBounds();
      if (allBounds.isValid()) {
        map.fitBounds(allBounds);
      }

    } catch (error) {
      console.error('Fehler bei der Suche:', error);
      alert('Ein Fehler ist aufgetreten. Überprüfe die Konsole.');
    } finally {
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

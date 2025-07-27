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

  // Layer-Gruppen für die verschiedenen Fundort-Typen
  const officialLayer = L.layerGroup().addTo(map);
  const unofficialLayer = L.layerGroup().addTo(map);
  const potentialLayer = L.layerGroup(); 

  // Geologischer Layer von Swisstopo
  const geologyLayer = L.tileLayer.wms('https://wms.geo.admin.ch/', {
    layers: 'ch.swisstopo.geologie-gesteinsdaecher',
    format: 'image/png',
    transparent: true,
    attribution: '© Swisstopo',
  });

  // Aeromagnetischer Layer der Schweiz
  const magneticLayer = L.tileLayer.wms('https://wms.geo.admin.ch/', {
    layers: 'ch.swisstopo.geophysik-magnetik-totalintensitaet',
    format: 'image/png',
    transparent: true,
    attribution: '© Swisstopo',
  });

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
  .bindPopup('<b>Potenzialzone: Diamant</b><br>Begründung: In diesem Gebiet gibt es geologische Indikatoren, die auf das mögliche Vorkommen von Kimberlit-Schloten hindeuten.')
  .addTo(potentialLayer);

  // =================================================================
  //      API & DATENVERARBEITUNG
  // =================================================================

  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  // HILFSFUNKTION: Erstellt Marker für eine Liste von Fundorten
  function addLocalitiesToMap(localities, query) {
    if (!localities) return;

    localities.forEach((loc) => {
      if (loc.latitude && loc.longitude) {
        const isOfficial = /mine|stollen|bruch/i.test(loc.name);
        const targetLayer = isOfficial ? officialLayer : unofficialLayer;
        const markerColor = isOfficial ? 'blue' : 'grey';

        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 6,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.8,
        }).addTo(targetLayer);

        const geoExplanation = isOfficial
          ? 'Dieses Mineral entstand durch hydrothermale Prozesse im Zusammenhang mit dem hiesigen Granitmassiv.'
          : 'Ein typisches Zerrkluft-Mineral dieser alpinen Region.';

        const popupContent = `
            <b>${loc.name}</b><br>
            <i>${query ? `Gesucht: ${query}<br>`: ''}</i>
            <i>${isOfficial ? 'Offizieller' : 'Inoffizieller'} Fundort</i><br><br>
            <b>Geologischer Kontext:</b><br>
            <p style="margin: 0;">${geoExplanation}</p><br>
            <a href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}" target="_blank">Route mit Google Maps</a>
        `;
        marker.bindPopup(popupContent);
      }
    });
  }

  // FUNKTION: Sucht nach Mineralien basierend auf der Nutzereingabe
  async function searchAndDisplayMinerals() {
    const query = searchInput.value;
    if (!query) {
      alert('Bitte gib ein Mineral oder eine Farbe zum Suchen ein.');
      return;
    }
    
    officialLayer.clearLayers();
    unofficialLayer.clearLayers();
    searchBtn.disabled = true;
    searchBtn.textContent = 'Suche...';

    try {
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
      addLocalitiesToMap(data.results, query);
      
      const allBounds = L.featureGroup([...officialLayer.getLayers(), ...unofficialLayer.getLayers()]).getBounds();
      if (allBounds.isValid()) map.fitBounds(allBounds);

    } catch (error) {
      console.error('Fehler bei der Suche:', error);
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Suchen';
    }
  }

  // FUNKTION: Lädt Standard-Fundorte beim Start der Seite
  async function loadDefaultMinerals() {
    if (API_KEY === 'DEIN_API_KEY_HIER' || !API_KEY) {
      alert('HINWEIS: Füge deinen Mindat-API-Key in die app.js Datei ein, um Fundorte zu sehen.');
      return;
    }

    // ERWEITERTE LISTE mit 7 Mineralien
    const defaultMinerals = ['Quarz', 'Pyrit', 'Calcit', 'Hämatit', 'Galenit', 'Fluorit', 'Siderit'];
    
    searchBtn.disabled = true;
    searchBtn.textContent = 'Lade Karte...';

    try {
      const requests = defaultMinerals.map(mineral => 
        fetch(`${BASE_URL}localities/?mineral_name=${mineral}&country=Switzerland&page_size=50`, { headers: { Authorization: `Token ${API_KEY}` } })
      );
      
      const responses = await Promise.all(requests);
      
      for (const response of responses) {
        if(response.ok) {
            const data = await response.json();
            addLocalitiesToMap(data.results);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Standard-Daten:', error);
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Suchen';
    }
  }


  // =================================================================
  //      EVENT LISTENERS & INITIALISIERUNG
  // =================================================================
  searchBtn.addEventListener('click', searchAndDisplayMinerals);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      searchAndDisplayMinerals();
    }
  });

  // Ruft die Funktion zum Laden der Standard-Orte direkt beim Start auf
  loadDefaultMinerals();
});

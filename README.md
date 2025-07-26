# LithoCoreX – Schweizer Mineralienkarte

Dies ist ein Prototyp einer interaktiven Karte aller Mineralienfundorte der Schweiz.  Die Anwendung besteht aus einem Node/Express‑Server, der statische Dateien ausliefert und Anfragen an die Mindat API über eine Proxy‑Schicht verarbeitet.  Auf der Client‑Seite wird Leaflet für die Kartenanzeige eingesetzt【227324984700939†L16-L23】 und erlaubt es, mehrere Ebenen (Layer) ein‑ und auszublenden【227324984700939†L45-L103】.

## Hauptfunktionen

* **Mehrschichtige Karte** – Offizielle Fundorte, inoffizielle Fundorte, Potenzialzonen, Magnetanomalien und geologische Schichten lassen sich als einzelne Layer ein‑ oder ausblenden.
* **Suche und Filter** – Über das Suchfeld können Mineralien recherchiert werden.  Die Suche verwendet die Mindat API, um passende Mineralarten abzurufen.  Nach Auswahl eines Minerals werden dessen Fundorte über die API geladen und auf der Karte angezeigt.
* **Individuelle Marker** – Jeder Fundort besitzt eine Farbzuordnung (bspw. nach Mineralfarbe) und liefert bei Klick eine Beschreibung sowie einen Google‑Maps‑Routenlink.
* **Erweiterbarkeit** – Die Anwendung ist modular aufgebaut.  Zusätzliche Layer oder neue Datenquellen können leicht eingebunden werden.  Anpassungen an der Mindat‑API erfolgen zentral im Server.

## Installation

1. Stellen Sie sicher, dass Node.js (≥ 16) installiert ist.
2. Klonen oder entpacken Sie dieses Projekt und wechseln Sie in das Verzeichnis `litho_corex_app`.
3. Legen Sie eine `.env`‑Datei mit Ihrem Mindat API‑Key an.  In diesem Repository ist bereits ein Beispiel enthalten.  Der Schlüssel darf nicht öffentlich geteilt werden.
4. Installieren Sie die Abhängigkeiten:

```bash
npm install
```

5. Starten Sie den Server:

```bash
npm start
```

6. Öffnen Sie im Browser `http://localhost:3000`.

## Anpassungen

* **Layerdaten erweitern**: Die Datei `public/data/sites.json` enthält Beispiel‑Fundorte.  Ersetzen oder ergänzen Sie diese Einträge mit realen Fundortdaten (GeoJSON oder CSV lässt sich leicht in dieses Format konvertieren).  Weitere Layer (z.B. Magnetanomalien) können in separaten Dateien abgelegt und in `public/app.js` geladen werden.
* **Mindat‑API nutzen**: In `server.js` werden zwei Endpunkte `/api/searchMineral` und `/api/localities` definiert, die auf die Mindat‑API zugreifen.  Sollte sich die API ändern, passen Sie die URLs und Parameter in diesen Funktionen an.  Beachten Sie die Nutzungsbedingungen der Mindat‑API.
* **Geologische Karten**: Für Swisstopo‑Layer oder andere WMS‑Dienste können Sie in `app.js` zusätzliche TileLayer definieren und über das Layer‑Control aktivieren.

## Quellen

Die Leaflet‑Bibliothek ist ein Open‑Source‑Werkzeug zur Erstellung interaktiver Karten【227324984700939†L16-L23】.  Ihre Layer‑Control ermöglicht es, Basis‑ und Overlay‑Ebenen ein‑ und auszublenden【227324984700939†L45-L103】.  Weitere Details finden Sie in der offiziellen Dokumentation auf [leafletjs.com](https://leafletjs.com/).
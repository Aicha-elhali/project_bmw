
# BMW iDrive Fluid Prototype Pipeline

Transformiert ein Figma-Wireframe automatisch in eine lauffaehige Vite + React App, die wie ein echtes BMW iDrive Infotainment-Display aussieht und funktioniert.

## Architektur

```
Figma Wireframe
      |
      v
 [Phase 1]  Figma REST API -- Frame als JSON holen
      |
      v
 [Phase 2]  Transformer -- Figma JSON -> Component Tree
      |         Layer-Namen werden auf BMW-Komponententypen gemappt
      |         (map, dock, statusBar, routeInfo, mediaPlayer, ...)
      |
      v
 [Phase 2.5] API Registry -- Erkennt welche Services noetig sind
      |         map -> Leaflet + CartoDB | searchBar -> Nominatim
      |         routeInfo -> OSRM | mediaPlayer -> Web Audio | etc.
      |
      v
 [Phase 3]  Token Engine -- BMW Design Tokens anwenden
      |         Farben, Typo, Spacing, Schatten aus tokens.json
      |
      v
 [Phase 4]  Claude API -- Prompt bauen + React Code generieren
      |         Inkl. BMW Design Constraints, Component Tree, Tokens
      |         Streaming-Ausgabe, automatisches File-Parsing
      |
      v
 [Phase 5]  Output Builder -- Vite + React App schreiben
      |         index.html, package.json, vite.config.js, Components
      |
      v
 [Phase 6]  Validation Loop (max 3 Iterationen)
      |         Testing Agent prueft auf Fehler + Constraint-Violations
      |         Fix Agent repariert gefundene Issues
      |
      v
  Fertige App in output/
```

## Voraussetzungen

- **Node.js** >= 18
- **Figma Personal Access Token** -- [Figma Settings > Account > Personal access tokens](https://www.figma.com/settings)
- **Anthropic API Key** -- [console.anthropic.com > API Keys](https://console.anthropic.com)

## Setup

```bash
cd fluid-prototype
npm install
```

Erstelle eine `.env` Datei (oder exportiere die Variablen direkt):

```bash
FIGMA_TOKEN=figd_dein-token-hier
ANTHROPIC_API_KEY=sk-ant-dein-key-hier
CLAUDE_MODEL=claude-sonnet-4-6          # optional, default: claude-sonnet-4-6
```

## Pipeline ausfuehren

### Variante 1: CLI (direkt)

```bash
node pipeline.js --file <FIGMA_FILE_KEY> --frame <NODE_ID>
```

File Key und Node ID kommen aus der Figma URL:

```
https://www.figma.com/design/TL9xgNNemU88nwUbSjiHQR/MeinProjekt?node-id=16-4
                              ^^^^^^^^^^^^^^^^^^^^^^                     ^^^^
                              File Key                                   Node ID (16-4 = 16:4)
```

Beispiel:

```bash
node pipeline.js --file TL9xgNNemU88nwUbSjiHQR --frame 16:4
```

Alternativ mit `.env` Datei:

```bash
npm start -- --file TL9xgNNemU88nwUbSjiHQR --frame 16:4
```

#### Optionale CLI-Parameter

| Parameter            | Beschreibung                              | Default              |
|----------------------|-------------------------------------------|----------------------|
| `--file`             | Figma File Key                            | --                   |
| `--frame`            | Figma Node ID (Format: `16:4`)            | --                   |
| `--output`           | Ausgabeverzeichnis                        | `./output`           |
| `--token`            | Figma Token (alternativ zu Env-Variable)  | `$FIGMA_TOKEN`       |
| `--key`              | Anthropic Key (alternativ zu Env-Variable)| `$ANTHROPIC_API_KEY` |
| `--maxValidations`   | Max Validierungsiterationen               | `3`                  |

### Variante 2: Figma Plugin + Server

Fuer die direkte Integration aus Figma heraus:

**Terminal 1 -- Server starten:**

```bash
cd server
cp .env.example .env    # Keys eintragen
npm install
npm start
```

Der Server laeuft auf `http://localhost:3001`.

**Figma:**

1. Figma > Plugins > Development > "Import plugin from manifest..."
2. `figma-plugin/manifest.json` auswaehlen
3. Plugin oeffnen, Frame selektieren, "Generate" klicken
4. Der Server fuehrt Phase 2-6 aus und startet automatisch einen Vite Preview auf `http://localhost:5173`

#### Server-Endpunkte

| Endpunkt            | Methode | Beschreibung                                  |
|---------------------|---------|-----------------------------------------------|
| `/api/generate`     | POST    | Frame-Daten senden, Pipeline ausfuehren (NDJSON-Stream) |
| `/api/health`       | GET     | Serverstatus + Key-Pruefung                   |

## Generierte App starten

Nach der Pipeline:

```bash
cd output
npm install
npm run dev
```

Oeffne `http://localhost:5173` -- die BMW iDrive UI wird als 1920x720 Dark-Theme Display angezeigt.

## Projektstruktur

```
fluid-prototype/
|
|-- pipeline.js                 <- Haupteinstiegspunkt (orchestriert Phase 1-6)
|-- package.json                <- @anthropic-ai/sdk
|-- tokens/
|   +-- tokens.json             <- BMW iDrive Design Tokens (Farben, Typo, Spacing)
|
|-- src/
|   |-- figma/
|   |   +-- client.js           <- Phase 1: Figma REST API Client
|   |
|   |-- transformer/
|   |   +-- index.js            <- Phase 2: Figma JSON -> Component Tree
|   |                              NAME_PATTERNS matchen Layer-Namen auf Typen
|   |
|   |-- design/
|   |   +-- tokenEngine.js      <- Phase 3: Design Tokens auf Tree anwenden
|   |
|   |-- generator/
|   |   |-- apiRegistry.js      <- Phase 2.5: Komponenttypen -> APIs/Libraries
|   |   |-- promptBuilder.js    <- Phase 4a: Claude Prompt + BMW Design Constraints
|   |   +-- claudeClient.js     <- Phase 4b: Claude API Streaming + File-Parsing
|   |
|   |-- output/
|   |   +-- builder.js          <- Phase 5: Vite + React App schreiben
|   |
|   +-- validator/
|       |-- index.js            <- Phase 6: Validierungsloop
|       |-- testingAgent.js     <- QA Agent: prueft auf ~30 BMW Constraint-Violations
|       |-- fixAgent.js         <- Fix Agent: repariert gefundene Issues
|       +-- fileReader.js       <- Liest generierte Dateien von Disk
|
+-- output/                     <- Generierte Vite + React App
    |-- index.html
    |-- package.json
    |-- vite.config.js
    +-- src/
        |-- main.jsx
        |-- App.jsx
        +-- components/         <- Generierte React-Komponenten
```

## API-Erkennung

Die Pipeline erkennt automatisch anhand der Figma-Layer-Namen, welche APIs und Libraries benoetigt werden:

| Komponententyp                       | Service                        | Libraries                |
|--------------------------------------|--------------------------------|--------------------------|
| `map`                                | Leaflet + CartoDB Dark Tiles   | `leaflet`, `react-leaflet` |
| `searchBar`                          | Nominatim Geocoding            | fetch (built-in)         |
| `routeInfo`, `turnIndicator`, `speedLimit` | OSRM Routing             | fetch (built-in)         |
| `mediaPlayer`                        | Web Audio API                  | HTML5 Audio              |
| `climateControl`                     | Simulierter State              | React useState           |
| `vehicleInfo`                        | Simulierte Fahrzeugdaten       | React useState + setInterval |
| `statusBar`                          | Live-Uhr + simulierte Werte    | Date API                 |
| `poiList`, `poiItem`                | Overpass API (OSM)             | fetch (built-in)         |

Alle APIs sind kostenlos und benoetigen keine zusaetzlichen API Keys.

Wenn `map` zusammen mit `routeInfo` oder `searchBar` erkannt wird, erstellt die Pipeline automatisch einen `NavigationContext` fuer geteilten State zwischen den Komponenten.

## BMW Design Constraints

Die Pipeline erzwingt BMW Automotive UI/UX Design Constraints auf drei Ebenen:

### 1. Generierung (promptBuilder.js)

Der Claude-Prompt enthaelt die vollstaendigen BMW Design Constraints als verbindliche Regeln:

- Sicherheit: Max 7 primaere Aktionen, 1,5s Glanceability-Regel, Touch-Targets >= 44px
- Brand Identity: BMW DNA (praezise, kuehl, technisch ueberlegen), keine Consumer-App-Aesthetik
- Typografie: bmwTypeNextWeb als Primaerschrift, max 3 Schriftschnitte, min 14px Fliesstext
- Farben: 3 Oberflaechenebenen (#0D0D0D, #1A1A1A, #262626), BMW Blue #1C69D4, max 2 Akzentfarben
- Keine Emoji als UI-Icons -- nur geometrische Unicode-Zeichen oder CSS-Shapes
- border-radius max 12px fuer primaere Container
- Animationen max 300ms, kein Spring/Bouncy Easing

### 2. Validierung (testingAgent.js)

Der Testing Agent prueft generierten Code auf ~30 spezifische Constraint-Violations:

- **Critical** (blockiert Approval): fehlende Exports, kaputte Imports, Syntaxfehler
- **Warning** (UX-Degradation): falsche Fonts, zu kleine Touch-Targets, fehlende Oberflaechendifferenzierung, Emoji-Icons, Consumer-App-Patterns, zu grosse border-radius, etc.

### 3. Korrektur (fixAgent.js)

Der Fix Agent kennt alle Constraints und repariert Violations automatisch -- z.B. ersetzt verbotene Fonts, korrigiert Farbwerte, vergroessert Touch-Targets, entfernt Emoji.

## Design Tokens anpassen

Bearbeite `tokens/tokens.json` vor dem Pipeline-Lauf. Die wichtigsten Werte:

```json
{
  "colors": {
    "background": "#0D0D0D",        // Haupt-Hintergrund
    "backgroundElevated": "#1A1A1A", // Karten, Panels
    "backgroundOverlay": "#262626",  // Dialoge, Suchleisten
    "primary": "#1C69D4"             // BMW Blue -- Aktive States
  },
  "typography": {
    "body": {
      "size": "1rem",
      "weight": "300",               // BMW Signature: Light Weight
      "family": "\"bmwTypeNextWeb\", \"Arial\", \"Helvetica\", sans-serif"
    }
  },
  "spacing": {
    "touchTarget": "3.75rem",        // Bevorzugte Touch-Target-Groesse
    "touchTargetMin": "3rem"         // Minimum (48px)
  }
}
```

## Neue Komponententypen hinzufuegen

1. **Transformer** -- neues Pattern in `src/transformer/index.js`:

```js
// NAME_PATTERNS Array erweitern:
[/tooltip|popover/i, 'tooltip'],
```

2. **Token Engine** -- Styles fuer den neuen Typ in `src/design/tokenEngine.js` im `switch(type)` Block.

3. **API Registry** (optional) -- Falls der Typ eine API braucht, neuen Eintrag in `src/generator/apiRegistry.js` im `REGISTRY` Array:

```js
{
  types: ['meinTyp'],
  serviceId: 'mein-service',
  label: 'Mein Service (Beschreibung)',
  npmPackages: {},
  headTags: [],
  promptInstructions: `### Mein Service\n\nAnweisungen fuer Claude...`,
}
```

## Umgebungsvariablen

| Variable            | Pflicht | Beschreibung                              | Default              |
|---------------------|---------|-------------------------------------------|----------------------|
| `FIGMA_TOKEN`       | ja      | Figma Personal Access Token               | --                   |
| `ANTHROPIC_API_KEY` | ja      | Anthropic API Key fuer Claude             | --                   |
| `CLAUDE_MODEL`      | nein    | Claude Modell-ID                          | `claude-sonnet-4-6`  |
| `PORT`              | nein    | Server-Port (nur server/)                 | `3001`               |
| `VITE_PORT`         | nein    | Vite Preview Port (nur server/)           | `5173`               |

## Troubleshooting

**"FIGMA_TOKEN is not set"**
Token als Umgebungsvariable exportieren oder `--token` Flag nutzen. Token holen: Figma > Settings > Account > Personal access tokens.

**"ANTHROPIC_API_KEY is not set"**
Key von console.anthropic.com holen und als Umgebungsvariable setzen oder `--key` Flag nutzen.

**Pipeline generiert kaputte Imports**
Die Validation Loop (Phase 6) sollte das automatisch fixen. Falls nicht: `--maxValidations 5` fuer mehr Iterationen.

**Vite startet nicht / Port belegt**
```bash
lsof -ti:5173 | xargs kill    # Port freigeben
cd output && npm install && npm run dev
```

**Claude generiert Consumer-App-Look statt BMW**
Die Design Constraints in `promptBuilder.js` sollten das verhindern. Falls trotzdem: Pipeline erneut laufen, die Generierung ist nicht-deterministisch. Bei wiederholten Problemen pruefen, ob die Figma-Layer-Namen sinnvolle BMW-Komponententypen matchen (siehe API-Erkennung oben).


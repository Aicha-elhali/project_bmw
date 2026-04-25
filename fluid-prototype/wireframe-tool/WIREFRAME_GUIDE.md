# BMW HMI Wireframe Guide — Claude Design

Erstelle Wireframes fuer das BMW iDrive 1920x720 Display.
Erstelle die Wireframes immer in der Call Flow Wireframes.html Datei.

Die HTML-Datei enthaelt NUR Wireframes — keine Seitentitel, keine Beschreibungen,
keine Navigationsleisten, kein HTML-Boilerplate drumherum. Nur die reinen Wireframe-Elemente.

Die Pipeline erkennt Komponenten anhand von **Element-Namen** (data-name, id, oder class).

## Wichtig: Nur das Feature wireframen!

Zeichne NUR das eigentliche Feature/den eigentlichen Inhalt.
Die Pipeline baut die gesamte Umgebung automatisch:

- Header (Statusleiste, Uhrzeit, Icons) — **wird automatisch generiert**
- Footer (Klimasteuerung, Quick-Actions) — **wird automatisch generiert**
- Left Side Slot (Tuer, Kamera, REC) — **wird automatisch generiert**
- Right Side Slot (Einstellungen, Kompass, Park-Assist) — **wird automatisch generiert**
- Map Background — **wird automatisch generiert**
- BMW Logo — **wird automatisch generiert**

Du musst dich also NUR auf dein Feature konzentrieren, z.B.:
- Eine Routeninfo-Karte
- Ein Anruf-Popup
- Ein Media Player
- Eine Suchergebnis-Liste

KEIN Header, KEIN Footer, KEINE Klima-Bar, KEINE Navigation-Tabs zeichnen —
das fuegt die Pipeline selbst hinzu und positioniert dein Feature korrekt im Display.

## Benennungsregeln

Benenne jedes wichtige Element mit einem der folgenden Keywords.
Die Pipeline matcht case-insensitive und partial (z.B. "routeInfo-card" matcht "routeInfo").

### Screen-Level (Root-Element)

Benenne das aeussere Element nach dem Screen-Typ:
- `navigationScreen` / `mapScreen` — Navigationsansicht
- `mediaScreen` / `musicScreen` — Media Player
- `phoneScreen` / `callScreen` — Telefon
- `climateScreen` — Klimasteuerung
- `settingsScreen` — Einstellungen
- `chargingScreen` — Ladeansicht
- `homeScreen` / `dashboard` — Home/Dashboard

### Navigation

| Name im Wireframe         | Pipeline-Komponente |
|---------------------------|---------------------|
| `map` / `mapArea`         | Kartenbereich       |
| `routeInfo` / `etaPanel`  | Routeninformationen |
| `turnIndicator`           | Abbiegehinweis      |
| `searchBar`               | Suchleiste          |
| `speedLimit`              | Tempolimit          |
| `poiList`                 | Ergebnisliste       |
| `poiItem`                 | Einzelnes Ergebnis  |

### Media

| Name                       | Pipeline-Komponente |
|----------------------------|---------------------|
| `mediaPlayer` / `nowPlaying` | Musikplayer       |
| `radioPlayer`              | Radio               |
| `podcastPlayer`            | Podcast             |
| `playlist`                 | Playlist            |

### Fahrzeug

| Name                       | Pipeline-Komponente  |
|----------------------------|----------------------|
| `climateControl`           | Klimasteuerung       |
| `vehicleInfo` / `range`    | Fahrzeuginfo/Reichweite |
| `chargingStation`          | Ladestation          |
| `weatherWidget`            | Wetter               |

### Generische UI-Elemente

| Name                       | Pipeline-Komponente |
|----------------------------|---------------------|
| `button` / `cta`           | Button              |
| `iconButton`               | Icon-Button         |
| `card` / `tile` / `widget` | Karte               |
| `searchBar` / `input`      | Eingabefeld         |
| `heading` / `title`        | Ueberschrift        |
| `label` / `subtitle`       | Text/Label          |
| `icon`                     | Icon                |
| `image`                    | Bild                |
| `divider`                  | Trennlinie          |
| `toggle` / `switch`        | Toggle              |
| `slider`                   | Slider              |
| `list`                     | Liste               |
| `dock` / `tabBar`          | Tab-Leiste          |
| `sidePanel` / `drawer`     | Seitenpanel         |

### Overlays / Popups

| Name                       | Pipeline-Komponente |
|----------------------------|---------------------|
| `popup` / `modal`          | Dialog/Popup        |
| `overlay` / `toast`        | Benachrichtigung    |
| `quickAction`              | Schnellaktion       |

## Wie benenne ich Elemente in Claude Design?

Am besten per **data-name** Attribut oder **id**:

```html
<div data-name="mapArea" style="...">
  <div data-name="routeInfo" style="...">
    <h2 data-name="heading">Zielort</h2>
    <p data-name="label">Marienplatz, Muenchen</p>
  </div>
  <div data-name="searchBar" style="...">
    <input placeholder="Ziel eingeben..." />
  </div>
</div>
```

## Prompt fuer Claude Design

Kopiere diesen Prompt in Claude Design, wenn du einen Wireframe erstellst:

---

Erstelle einen BMW iDrive HMI Wireframe als HTML.
Die HTML-Datei enthaelt NUR Wireframe-Elemente — keinen Seitentitel, keine Ueberschrift,
keine Beschreibung, kein umgebendes Layout. Nur die reinen UI-Wireframes.

## Display & Layout

Das BMW Panoramic Vision Display ist 1920x720px.
Die Pipeline generiert automatisch Chrome-Zonen drum herum:
- Oben: 70px (Header)
- Unten: 110px (Footer/Klimaleiste)
- Links: 240px (Fahrzeugstatus)
- Rechts: 280px (Chamfer/Park-Assist)

Der nutzbare Content-Bereich ist ca. **1400x540px** (Mitte des Displays).
Positioniere deine Wireframe-Elemente innerhalb dieses Bereichs.

## BMW HMI Design System

### Farben
- Canvas: #0A1428 (Hintergrund, dunkelblau-schwarz)
- Elevated: #1B2A45 (angehobene Flaechen)
- Elevated-Alt: #243757 (Karten-Gradient oben)
- Strong: #2A4170 (betonte Flaechen)
- Accent: #34538D
- BMW Blue: #1C69D4 (einzige Akzentfarbe auf dunklem Hintergrund)
- NIEMALS reines Schwarz (#000) oder reines Weiss (#FFF)
- NIEMALS neutrale Grautone (#111, #222, #333) — immer blau-getint

### Text
- Primaer: #FFFFFF
- Sekundaer: #A8B5C8
- Tertiaer: #5C6B82
- Disabled: #3D4A60
- Font: "BMW Type Next", "Inter", system-ui, sans-serif
- Display-Zahlen: fontWeight 100
- Ueberschriften: fontWeight 300
- Body: fontWeight 400
- Buttons/Labels: fontWeight 500
- ALL CAPS Labels: letterSpacing 0.06em, textTransform uppercase, fontSize 14, color #A8B5C8

### Status-Farben
- Warning: #F0C040
- Danger: #E63946
- Success: #3CD278
- Info: #5BA3FF

### Karten/Cards
- IMMER Gradient: background linear-gradient(180deg, #243757 0%, #1B2A45 100%)
- boxShadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)
- borderRadius: 12-16px
- NIEMALS flach einfarbig

### Interaktive Elemente
- Touch-Targets: mindestens 64x64px (Handschuh-tauglich), sekundaer min. 48px
- Buttons: borderRadius 8px
- Pills: borderRadius 999px
- Suchfelder: borderRadius 24px

### Stil
- Kuhl, monochrom, blau-schwarz. Einzige warme Farbe: Now-Playing Media Card (orange/rot Gradient)
- Keine Emoji, keine Illustrations, kein Glassmorphism auf festen Flaechen
- Trennlinien: rgba(255,255,255,0.08) statt Borders
- Flaechen trennen sich durch Gradient + Shadow, nicht durch Borders
- Animation: 150-250ms, cubic-bezier(0.4, 0, 0.2, 1). Keine Springs, kein Bounce

## Element-Benennung

Jedes Element MUSS ein `data-name` Attribut haben mit einem der folgenden Werte:

**Navigation:** map, routeInfo, turnIndicator, searchBar, speedLimit, poiList, poiItem
**Media:** mediaPlayer, nowPlaying, radioPlayer, podcastPlayer, playlist
**Fahrzeug:** climateControl, vehicleInfo, chargingStation, weatherWidget
**UI:** button, iconButton, card, heading, label, icon, image, divider, toggle, slider, list
**Layout:** sidePanel, quickAction, popup, modal, overlay

## Was NICHT wireframen

Zeichne NUR das Feature selbst, NICHT die Umgebung:
- KEIN Header / Statusbar / Uhrzeit
- KEIN Footer / Klimaleiste / Quick-Action-Bar / Navigation-Tabs
- KEIN BMW Logo
- KEINE Seitenleisten (Links/Rechts)
- KEINE Map im Hintergrund
Diese Elemente werden von der Pipeline automatisch generiert.
Fokussiere dich ausschliesslich auf den Inhalt (z.B. eine Karte, ein Popup, ein Player).

## Format

Verwende inline-styles mit expliziten width/height Werten in px.
Keine externen CSS-Dateien, keine class-basierten Styles.

---

## Was NICHT funktioniert

- Elemente ohne erkennbaren Namen (generische `<div>` ohne id/class/data-name)
- CSS-Klassen die nichts mit dem Inhalt zu tun haben (z.B. `flex-row`, `p-4`)
- Relative Positionierung ohne Groessenangaben (Pipeline braucht width/height)
- Verschachtelte iframes oder Shadow DOM
- Header/Footer/Klima/Tabs selbst zeichnen — die Pipeline baut das und es kommt zu Duplikaten
- Ganze Screens mit allem Drum und Dran — nur das Feature wireframen

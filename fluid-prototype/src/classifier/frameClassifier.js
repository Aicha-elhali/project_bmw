/**
 * Frame Classifier — Context Detection for BMW HMI Pipeline
 *
 * Analyzes a Figma frame's name, dimensions, and component tree to determine
 * what kind of UI element it represents and where it belongs on the full
 * 1920×720 BMW HMI display.
 *
 * This allows the pipeline to handle partial wireframes (a popup, a card,
 * a single panel) and automatically build the surrounding HMI context.
 */

// ---------------------------------------------------------------------------
// Classification rules
// ---------------------------------------------------------------------------

const HMI_SCREEN = { width: 1920, height: 720 };

const NAME_RULES = [
  // Popups / Modals / Overlays
  { pattern: /popup|pop.?up/i,              frameType: 'popup',     placement: 'center-overlay' },
  { pattern: /modal|dialog/i,               frameType: 'modal',     placement: 'center-overlay' },
  { pattern: /alert|warning.?dialog/i,      frameType: 'modal',     placement: 'center-overlay' },
  { pattern: /bottom.?sheet|action.?sheet/i, frameType: 'modal',    placement: 'bottom-overlay' },
  { pattern: /overlay|toast|snackbar/i,     frameType: 'overlay',   placement: 'top-overlay' },
  { pattern: /notification/i,               frameType: 'overlay',   placement: 'top-overlay' },

  // Panels / Sidebars
  { pattern: /side.?panel|sidebar|drawer/i, frameType: 'panel',     placement: 'right-panel' },
  { pattern: /detail.?panel|info.?panel/i,  frameType: 'panel',     placement: 'right-panel' },
  { pattern: /left.?panel|left.?slot/i,     frameType: 'panel',     placement: 'left-panel' },

  // Cards / Widgets
  { pattern: /card|tile|widget/i,           frameType: 'card',      placement: 'floating-card' },
  { pattern: /route.?info|route.?card/i,    frameType: 'card',      placement: 'floating-card' },
  { pattern: /now.?playing|media.?card/i,   frameType: 'card',      placement: 'floating-card' },
  { pattern: /poi.?card|destination/i,      frameType: 'card',      placement: 'floating-card' },

  // Chrome elements
  { pattern: /header|status.?bar|top.?bar/i, frameType: 'header',   placement: 'header-zone' },
  { pattern: /footer|dock|climate.?bar|quick.?action.?bar/i, frameType: 'footer', placement: 'footer-zone' },

  // Keyboard / Input overlays
  { pattern: /keyboard|keypad|numpad/i,     frameType: 'keyboard',  placement: 'bottom-overlay' },
  { pattern: /search.?overlay|search.?full/i, frameType: 'modal',   placement: 'center-overlay' },

  // Full screens (last — catch-all for screen-like names)
  { pattern: /screen|page|view|scene/i,     frameType: 'fullscreen', placement: 'root' },
  { pattern: /navigation|navi|map/i,        frameType: 'fullscreen', placement: 'root' },
  { pattern: /home|main|dashboard/i,        frameType: 'fullscreen', placement: 'root' },
  { pattern: /media|musik|music|radio/i,    frameType: 'fullscreen', placement: 'root' },
  { pattern: /settings|einstellung/i,       frameType: 'fullscreen', placement: 'root' },
  { pattern: /climate|klima/i,              frameType: 'fullscreen', placement: 'root' },
  { pattern: /charging|laden|charge/i,      frameType: 'fullscreen', placement: 'root' },
  { pattern: /phone|telefon/i,              frameType: 'fullscreen', placement: 'root' },
];

// Screen context hints based on frame name
const CONTEXT_RULES = [
  { pattern: /nav|map|route|karte|ziel|destination/i,         context: 'navigation' },
  { pattern: /media|musik|music|radio|podcast|now.?playing/i, context: 'media' },
  { pattern: /phone|telefon|call|anruf|contact/i,             context: 'phone' },
  { pattern: /climate|klima|temp|ac|heiz/i,                   context: 'climate' },
  { pattern: /settings|einstellung|config|option/i,           context: 'settings' },
  { pattern: /charging|laden|charge|battery|akku|range/i,     context: 'charging' },
  { pattern: /home|main|dashboard|übersicht/i,                context: 'home' },
  { pattern: /app|menu|launcher/i,                            context: 'apps' },
];

// ---------------------------------------------------------------------------
// Dimension-based heuristics
// ---------------------------------------------------------------------------

function classifyByDimensions(width, height) {
  if (!width || !height) return null;

  const ratio = width / height;
  const screenRatio = HMI_SCREEN.width / HMI_SCREEN.height;

  // Full screen: covers most of the display
  if (width >= 1200 && height >= 500) return { frameType: 'fullscreen', placement: 'root' };

  // Wide bar (header/footer shape)
  if (width >= 1000 && height <= 120) {
    return height <= 60
      ? { frameType: 'header', placement: 'header-zone' }
      : { frameType: 'footer', placement: 'footer-zone' };
  }

  // Tall narrow panel (sidebar)
  if (height >= 400 && width <= 400) return { frameType: 'panel', placement: 'right-panel' };

  // Medium rectangle — popup/modal
  if (width >= 300 && width <= 900 && height >= 200 && height <= 600) {
    return { frameType: 'popup', placement: 'center-overlay' };
  }

  // Small — card or component
  if (width <= 500 && height <= 400) return { frameType: 'card', placement: 'floating-card' };

  // Wide but not tall enough for full screen — bottom sheet or panel
  if (width >= 800 && height < 400) return { frameType: 'modal', placement: 'bottom-overlay' };

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a Figma frame to determine its role in the BMW HMI screen.
 *
 * @param {object} figmaFrame — raw Figma frame data (with name, absoluteBoundingBox)
 * @param {object} componentTree — transformed component tree (optional, for deeper analysis)
 * @returns {object} Classification result
 */
export function classifyFrame(figmaFrame, componentTree = null) {
  const name = figmaFrame.name || '';
  const box = figmaFrame.absoluteBoundingBox ?? figmaFrame.layout ?? {};
  const width = box.width ?? 0;
  const height = box.height ?? 0;

  // 1. Try name-based classification
  let frameType = null;
  let placement = null;

  for (const rule of NAME_RULES) {
    if (rule.pattern.test(name)) {
      frameType = rule.frameType;
      placement = rule.placement;
      break;
    }
  }

  // 2. If name didn't match, use dimensions
  if (!frameType) {
    const dimClass = classifyByDimensions(width, height);
    if (dimClass) {
      frameType = dimClass.frameType;
      placement = dimClass.placement;
    }
  }

  // 3. Fallback: if still unknown, assume fullscreen for large, card for small
  if (!frameType) {
    if (width >= 800 || height >= 500) {
      frameType = 'fullscreen';
      placement = 'root';
    } else {
      frameType = 'card';
      placement = 'floating-card';
    }
  }

  // 4. Determine screen context (what BMW app/screen this belongs to)
  let screenContext = 'generic';
  for (const rule of CONTEXT_RULES) {
    if (rule.pattern.test(name)) {
      screenContext = rule.context;
      break;
    }
  }

  // 5. If no context from name, try to infer from component tree
  if (screenContext === 'generic' && componentTree) {
    screenContext = inferContextFromTree(componentTree);
  }

  return {
    frameName: name,
    frameType,
    placement,
    screenContext,
    dimensions: { width, height },
    isPartial: frameType !== 'fullscreen',
    needsHMIChrome: frameType !== 'fullscreen' && frameType !== 'header' && frameType !== 'footer',
  };
}

/**
 * Infer screen context from component types in the tree.
 */
function inferContextFromTree(node) {
  const types = new Set();
  collectAllTypes(node, types);

  if (types.has('map') || types.has('routeInfo') || types.has('turnIndicator') || types.has('speedLimit')) {
    return 'navigation';
  }
  if (types.has('mediaPlayer')) return 'media';
  if (types.has('climateControl')) return 'climate';
  if (types.has('vehicleInfo')) return 'vehicle';

  return 'generic';
}

function collectAllTypes(node, types) {
  types.add(node.type);
  for (const child of node.children ?? []) collectAllTypes(child, types);
}

/**
 * Generate a human-readable placement description for the prompt.
 */
export function describePlacement(classification) {
  const { frameType, placement, screenContext, dimensions, frameName } = classification;

  const contextMap = {
    navigation: 'dem BMW Navigationsbildschirm',
    media: 'dem BMW Media/Musik-Bildschirm',
    phone: 'dem BMW Telefon-Bildschirm',
    climate: 'der BMW Klimasteuerung',
    settings: 'den BMW Einstellungen',
    charging: 'dem BMW Lade-Bildschirm',
    home: 'dem BMW Home-Dashboard',
    apps: 'dem BMW App-Launcher',
    generic: 'dem BMW HMI Display',
  };

  const contextDesc = contextMap[screenContext] || contextMap.generic;

  const placementDescriptions = {
    'root':            `Dieser Frame ist ein vollständiger Bildschirm auf ${contextDesc}.`,
    'center-overlay':  `Dieser Frame "${frameName}" ist ein ${frameType === 'modal' ? 'modaler Dialog' : 'Popup'} (${dimensions.width}×${dimensions.height}px) der zentriert über ${contextDesc} schwebt. Der Hintergrund-Screen muss sichtbar bleiben (gedimmt oder unverändert).`,
    'bottom-overlay':  `Dieser Frame "${frameName}" ist ein Bottom-Sheet/Overlay (${dimensions.width}×${dimensions.height}px) das von unten über ${contextDesc} eingeschoben wird.`,
    'top-overlay':     `Dieser Frame "${frameName}" ist eine Notification/Toast (${dimensions.width}×${dimensions.height}px) am oberen Rand von ${contextDesc}.`,
    'right-panel':     `Dieser Frame "${frameName}" ist ein Side-Panel (${dimensions.width}×${dimensions.height}px) das rechts auf ${contextDesc} eingeblendet wird, neben dem Hauptinhalt.`,
    'left-panel':      `Dieser Frame "${frameName}" ist ein linkes Panel (${dimensions.width}×${dimensions.height}px) auf ${contextDesc}.`,
    'floating-card':   `Dieser Frame "${frameName}" ist eine schwebende Karte/Widget (${dimensions.width}×${dimensions.height}px) die auf ${contextDesc} über der Map/dem Canvas positioniert wird.`,
    'header-zone':     `Dieser Frame "${frameName}" definiert den Header-Bereich des BMW HMI.`,
    'footer-zone':     `Dieser Frame "${frameName}" definiert den Footer/Klima-Bereich des BMW HMI.`,
  };

  return placementDescriptions[placement] || `Dieser Frame gehört zu ${contextDesc}.`;
}

/**
 * Generate the default background screen description for partial frames.
 */
export function describeDefaultBackground(classification) {
  const { screenContext } = classification;

  const backgrounds = {
    navigation: `Der Hintergrund ist der BMW Navigationsbildschirm:
- Vollflächige dunkle Map (#0F1A2C) mit Straßen (#3A4A66 minor, #FFFFFF major), Wasser (#1A3A5F), Parks (#1F3540)
- Blaue Route-Linie (#5BA3FF) mit Fahrzeug-Pfeil (#1C69D4) in der Mitte
- Geschwindigkeitsanzeige links unten (Display-Zahl, weight 100, + "km/h" Label)
- Optionale Turn-by-Turn-Anweisung oben links als schwebende Karte`,

    media: `Der Hintergrund ist der BMW Media-Bildschirm:
- Dunkler Canvas (#0A1428) mit Album-Art-Bereich (großes Bild oder Gradient)
- Now-Playing-Karte mit Track-Info, Progress-Bar, Playback-Controls
- Optional: Playlist/Queue als Side-Panel rechts`,

    phone: `Der Hintergrund ist der BMW Telefon-Bildschirm:
- Dunkler Canvas (#0A1428) mit Kontaktliste oder Anruf-Screen
- Bei aktivem Anruf: großer Kontakt-Name, Anrufdauer, runder End-Call-Button (#E63946)`,

    climate: `Der Hintergrund ist der BMW Klima-Bildschirm:
- Dunkler Canvas (#0A1428) mit Fahrzeug-Innenraum-Visualisierung (Top-Down SVG)
- Temperatur-Regler links/rechts, Sitzheizung, Lüftungsmodus`,

    settings: `Der Hintergrund ist der BMW Einstellungs-Bildschirm:
- Dunkler Canvas (#0A1428) mit Listen-Layout
- Navigationsleiste links, Detail-Bereich rechts`,

    charging: `Der Hintergrund ist der BMW Lade-Bildschirm:
- Dunkler Canvas (#0A1428) mit Batterie-Visualisierung
- Ladestatus, geschätzte Zeit, Reichweite-Prognose`,

    home: `Der Hintergrund ist das BMW Home-Dashboard:
- Map-Vorschau oben, Quick-Access-Karten darunter
- Letzte Ziele, anstehende Kalender-Einträge, Fahrzeug-Status`,

    generic: `Der Hintergrund ist der BMW Standard-Canvas (#0A1428) mit Map-Nacht (#0F1A2C) als Basis.`,
  };

  return backgrounds[screenContext] || backgrounds.generic;
}

# BMW HMI · UI Kit

A faithful recreation of the BMW central infotainment display (Operating System X / Panoramic Vision style).

## Files
- `index.html` — clickable scene-switcher prototype (Map · Climate · Notifications · Media). The footer Home / Fan / Apps / Music buttons also navigate.
- `HMIChrome.jsx` — `HMIDisplay` (chamfered display container), `HMIHeader`, `HMIFooter`, `ClimateBlock`, `LeftSideSlot`, `RightSideSlot`.
- `HMIScreens.jsx` — `MapBackground`, `MapScreen`, `ClimateScreen`, `NotificationsScreen`, `MediaScreen`.

## Geometry
The display is **not a rectangle**. It has a chamfered bottom-right corner (~140px × 140px diagonal). All side-slot content is laid out around that cutout. Header floats over the canvas; footer is always visible.

## What's covered
- Header (left wrench badge, status icons, time, profile avatar)
- Footer (driver climate · 7 quick-action icons · passenger climate)
- Left slot (vehicle status — door / belt warnings)
- Right slot (park-distance halo + view controls)
- Map (tabs, search, POI card with Start route guidance CTA)
- Climate (mode pills, top-down car render, hot-spots)
- Notifications (4 row types, severity icon-tints)
- Media (now-playing warm-gradient card, browse rows)

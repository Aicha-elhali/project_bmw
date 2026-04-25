import React from 'react';

const wrap = (paths, opts = {}) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${opts.sw || 1.75}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;

export const icons = {
  note:    wrap('<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  play:    wrap('<path d="M7 5l12 7-12 7V5z" fill="currentColor"/>', { sw: 0 }),
  forward: wrap('<path d="M5 5l8 7-8 7V5z"/><path d="M14 5l8 7-8 7V5z"/>'),
  phone:   wrap('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  home:    wrap('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9z"/>'),
  fan:     wrap('<circle cx="12" cy="12" r="2"/><path d="M12 4c2.5 0 5 2 5 5 0 1.7-2 3-5 3"/><path d="M20 12c0 2.5-2 5-5 5-1.7 0-3-2-3-5"/><path d="M12 20c-2.5 0-5-2-5-5 0-1.7 2-3 5-3"/><path d="M4 12c0-2.5 2-5 5-5 1.7 0 3 2 3 5"/>'),
  car:     wrap('<path d="M5 16h14M3 16l2-6h14l2 6v3a1 1 0 0 1-1 1h-2v-2H6v2H4a1 1 0 0 1-1-1v-3z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>'),
  apps:    wrap('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  bell:    wrap('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  mute:    wrap('<path d="M3 10v4h3l4 4V6L6 10H3z"/><path d="M22 8l-6 8M16 8l6 8"/>'),
  bluetooth: wrap('<path d="M7 7l10 10-5 4V3l5 4L7 17"/>'),
  wifi:    wrap('<path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5 12a11 11 0 0 1 14 0"/><path d="M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>'),
  mic:     wrap('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  wrench:  wrap('<path d="M14 6a4 4 0 0 1 5 5l-9 9a2.5 2.5 0 0 1-3.5-3.5l9-9-1.5-1.5z"/>'),
  user:    wrap('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  triangleAlert: wrap('<path d="M12 3l10 17H2L12 3z"/><path d="M12 10v5M12 18v.01" stroke-width="2"/>'),
  seatbelt: wrap('<path d="M7 4v8a5 5 0 0 0 10 0V4"/><path d="M7 8l10 6"/>'),
  door:    wrap('<path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13H5z"/><circle cx="14" cy="13" r="1" fill="currentColor"/>'),
  minus:   wrap('<path d="M5 12h14"/>', { sw: 2 }),
  plus:    wrap('<path d="M5 12h14M12 5v14"/>', { sw: 2 }),
  seat:    wrap('<path d="M7 21v-7a3 3 0 0 1 3-3h7v10"/><path d="M17 11V6a3 3 0 0 0-3-3H10"/>'),
  park:    wrap('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'),
  pin:     wrap('<path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
  compass: wrap('<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6 6-2z" fill="currentColor" stroke="none"/>'),
  search:  wrap('<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>'),
  chevronRight: wrap('<path d="M9 6l6 6-6 6"/>'),
  chevronDown:  wrap('<path d="M6 9l6 6 6-6"/>'),
  close:   wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  bolt:    wrap('<path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"/>'),
  charge:  wrap('<rect x="4" y="6" width="13" height="12" rx="2"/><path d="M17 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"/><path d="M11 9l-2 4h3l-2 4"/>'),
  speaker: wrap('<path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8a5 5 0 0 1 0 8"/>'),
  camera:  wrap('<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6l2-2h4l2 2"/>'),
  record:  wrap('<circle cx="12" cy="12" r="4" fill="currentColor"/>', { sw: 0 }),
  music:   wrap('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  settings:wrap('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.15.66.41.85.74"/>'),
  arrow:   wrap('<path d="M12 4l8 8h-5v8h-6v-8H4l8-8z"/>'),
  shield:  wrap('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>'),
};

export default function BMWIcon({ name, size = 24, color = "currentColor", style = {} }) {
  const html = icons[name] || "";
  return (
    <span
      className="bmw-icon"
      style={{ display: "inline-flex", width: size, height: size, color, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

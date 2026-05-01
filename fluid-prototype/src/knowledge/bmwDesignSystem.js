/**
 * BMW HMI Design System — Single Source of Truth
 *
 * All BMW design rules, color palettes, icon mappings, typography, and chrome
 * component references live here. Every pipeline agent imports from this module
 * instead of maintaining its own copy.
 */

// ---------------------------------------------------------------------------
// I. COLORS
// ---------------------------------------------------------------------------

export const COLORS = `### Colors

**Surfaces (NEVER neutral black — always blue-tinted):**
- Canvas: #0A1428 (dark blue-black, default background)
- Canvas Alt: #0E1B30
- Elevated: #1B2A45 (standard card)
- Elevated Alt: #243757 (card gradient top)
- Elevated Strong: #2A4170 (active card)
- Elevated Accent: #34538D (selected card)

**BMW Blue Scale (primary / interactive):**
- 50: #E8F1FB | 100: #C5DBF5 | 200: #8DBAEC | 300: #5599E2
- 400: #2D7AE8 (hover) | **500: #1C69D4 (base)** | 600: #1656B0 (pressed)
- 700: #10428A | 800: #0B2F63 | 900: #071D3D

**Neutrals:** #FFFFFF, #F2F4F8, #D8DEE8, #A8B5C8, #8C9BB0, #5C6B82, #3D4A60, #2A3548, #1B2638, #121B2A, #0A1428, #050B17

**Text:**
- Primary: #FFFFFF | Secondary: #A8B5C8 | Tertiary: #5C6B82 | Disabled: #3D4A60
- Accent: #5BA3FF | Warning: #F0C040 | Danger: #E63946 | Success: #3CD278

**Interactive:**
- Default: #1C69D4 | Hover: #2D7AE8 | Pressed: #1656B0 | Disabled: #2A3548

**Borders:** rgba(255,255,255,0.08) default, rgba(255,255,255,0.16) strong, #2D7AE8 focus

**Status:** Warning #F0C040 | Danger #E63946 | Success #3CD278 | Info #5BA3FF

**Map (Night):** Background #0F1A2C | Water #1A3A5F | Roads #3A4A66 / #FFFFFF | Highway #5BA3FF | Park #1F3540 | Route #5BA3FF | User Arrow #1C69D4

**Color vibe:** Cool, moonlit, monochromatic blue-black. The ONLY warm surface is a Now-Playing media card (optional orange/red gradient).`;

// ---------------------------------------------------------------------------
// II. SURFACE COLOR CORRECTION TABLE
// ---------------------------------------------------------------------------

export const SURFACE_COLOR_MAPPING = `### Surface Color Correction

WRONG neutral blacks → CORRECT BMW HMI:
- #000000 / #0D0D0D / #111111 → #0A1428
- #1A1A1A / #222222 → #1B2A45
- #262626 / #2A2A2A → #243757
- #333333 / #3D3D3D → #2A4170

Cards MUST use gradient:
background: linear-gradient(180deg, #243757 0%, #1B2A45 100%)
boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"`;

// ---------------------------------------------------------------------------
// III. TYPOGRAPHY
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = `### Typography

**Font:** \`"BMW Type Next", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif\`

**Type Scale (px, for ~12-inch HMI screen):**
- Display (Speed, Range): 64px, weight 100 (Thin), line-height 1.1, tracking -0.01em
- H1 (Screen Titles): 48px, weight 300 (Light), line-height 1.1
- H2: 36px, weight 300, line-height 1.25
- H3 (Card Heading): 32px, weight 300, line-height 1.25
- H4 (Section Heading): 24px, weight 500 (Medium), line-height 1.25
- Page Title: 24px, weight 400, line-height 1.25
- Tab: 22px, weight 400, line-height 1.4
- Body: 22px, weight 400, line-height 1.4
- Body Secondary: 18px, weight 400, line-height 1.4
- Body Small: 16px, weight 400, line-height 1.4
- Label (UPPERCASE): 14px, weight 400, tracking 0.02em, uppercase
- Status Label (UPPERCASE): 12px, weight 400, tracking 0.06em, uppercase
- Climate Temp: 28px, weight 300, line-height 1

**Weights:** Thin 100 (display numbers only) | Light 300 (headings) | Regular 400 (body, labels) | Medium 500 (section headings, buttons) | Bold 700 (speed limit only)

**ALL CAPS Labels:** letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 14, color: "#A8B5C8"
**Tabular Numbers:** font-variant-numeric: tabular-nums for all numeric content.`;

// ---------------------------------------------------------------------------
// IV. CARD RECIPE
// ---------------------------------------------------------------------------

export const CARD_RECIPE = `### Card Recipe

\`\`\`
background: linear-gradient(180deg, #243757 0%, #1B2A45 100%);
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
\`\`\`

Accent cards (CTAs): solid #1C69D4 with \`0 0 24px rgba(28,105,212,0.6)\` glow.
Cards layer OVER map/canvas — never replace it full-screen. NEVER flat single-color.`;

// ---------------------------------------------------------------------------
// V. ICONS
// ---------------------------------------------------------------------------

export const ICON_NAMES = `note, play, forward, phone, home, fan, car, apps, bell, mute, bluetooth, wifi, mic, wrench, user, triangleAlert, seatbelt, door, minus, plus, seat, park, pin, compass, search, chevronRight, chevronDown, close, bolt, charge, speaker, camera, record, music, settings, arrow, shield`;

export const ICONS = `### Icons

**Style:** Outline / Line-Art, 1.75-2px stroke, rounded caps + joins, no fills.
**Size:** 24x24px viewBox. In interactive areas at least 24px.
**Color:** Default #FFFFFF | Active #1C69D4 (BMW Blue) + optional glow | Warning #F0C040 | Danger #E63946 | Success #3CD278

**Component:** \`<BMWIcon name="..." size={24} color="#fff"/>\` from \`../hmi/BMWIcons.jsx\`
**Available names:** ${ICON_NAMES}

NO emoji, never. No icon fonts. Only BMWIcon.`;

export const ICON_MAPPING = `### Icon Mapping (custom SVG / Unicode → BMWIcon name)

- Play triangle / media play → name="play"
- X / close / dismiss → name="close"
- Gear / cog / settings → name="settings"
- Magnifier / search → name="search"
- Phone / call → name="phone"
- House / home → name="home"
- Music note → name="music"
- Navigation arrow → name="forward"
- Plus sign → name="plus"
- Minus sign → name="minus"
- Bell / notification → name="bell"
- Map pin / location → name="pin"
- Compass rose → name="compass"
- Car / vehicle → name="car"
- Fan / AC → name="fan"
- Grid / apps → name="apps"
- Lightning / bolt → name="bolt"
- Battery / charge → name="charge"
- Camera → name="camera"
- Speaker / volume → name="speaker"
- Shield → name="shield"
- Person / avatar → name="user"
- WiFi → name="wifi"
- Bluetooth → name="bluetooth"
- Microphone → name="mic"
- Mute / sound off → name="mute"
- Warning triangle → name="triangleAlert"
- Door → name="door"
- Seat → name="seat"
- Parking P → name="park"
- Record dot → name="record"
- Wrench / service → name="wrench"
- Seatbelt → name="seatbelt"
- Right chevron → name="chevronRight"
- Down chevron → name="chevronDown"
- Up arrow → name="arrow"`;

// ---------------------------------------------------------------------------
// VI. CHROME COMPONENTS
// ---------------------------------------------------------------------------

export const CHROME = `### Pre-built Chrome (src/hmi/ — NEVER recreate)

These components are provided and MUST be imported — never recreated:

- **BMWIcons.jsx**: \`export default function BMWIcon({ name, size, color, style })\`
  Names: ${ICON_NAMES}
- **HMIChrome.jsx**: \`export { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground }\`

**HMIDisplay** — Parallelogram container (1920x720), auto-scales to viewport, chamfered corners. Everything goes inside.
**HMIHeader** — Transparent floating status bar: left wrench+badge, right bell/temp/mute/BT/WiFi/mic/avatar/clock.
  Props: \`{ title?, leftIcon?, warningCount?, outdoor? }\`
**HMIFooter** — Climate left + 7 Quick-Action icons (64x64, radius 16) + climate right.
  Props: \`{ active?, onTab? }\` — active: "media"|"nav"|"phone"|"home"|"fan"|"car"|"apps"
**LeftSideSlot** — Vehicle icons (door schematic, camera, recording dot) at left edge, angled.
**RightSideSlot** — Parallelogram buttons in chamfered area (settings, compass/N, assist view, park-assist halo).
  Props: \`{ onClose?, showPark? }\`
**MapBackground** — SVG night map placeholder (dark roads on #0F1A2C).

**Import from components:** \`import BMWIcon from '../hmi/BMWIcons.jsx';\`
**Import from App.jsx:** \`import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';\``;

// ---------------------------------------------------------------------------
// VII. LOGO
// ---------------------------------------------------------------------------

export const LOGO = `### BMW Logo

NEVER draw, generate, or build a BMW logo with SVG, CSS, or canvas.
Any BMW logo that is NOT an \`<img>\` tag pointing to \`/bmw-hmi/bmw-roundel.png\` MUST be replaced.
This includes: SVG circles/quadrants, CSS-styled divs forming a roundel, canvas drawings, styled "BMW" text.

The ONLY correct BMW logo:
\`\`\`jsx
<img src="/bmw-hmi/bmw-roundel.png" width={SIZE} height={SIZE} alt="BMW" style={{ borderRadius: '50%' }} />
\`\`\`
Typical sizes: 32px (small), 48px (cards), 80px (splash/about).
- The HMIHeader does NOT have a BMW logo — that's correct, don't add one.
- Never place the logo on white/light backgrounds.`;

// ---------------------------------------------------------------------------
// VIII. LAYOUT
// ---------------------------------------------------------------------------

export const LAYOUT = `### Layout (1920x720 display)

**Screen:** 1920x720px, chamfered bottom-right corner (~15-20 deg diagonal).

**Chrome zones (fixed):**
- Header: floating transparent, 48px, status icons right
- Footer: 96px — driver climate + 7 quick-action icons (64x64, radius 16) + passenger climate
- Left slot: ~80px — vehicle status icons
- Right slot: chamfered corner — park-assist halo + view controls

**Touch targets:** Minimum 64x64px (glove-sized). Absolute minimum 48px for secondary.
**Max actions:** 7 primary actions visible on one screen.

**Spacing (4px base grid):** 0 | 2 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 | 80 | 96
**Card padding:** 16px or 24px. Section gaps: 32-48px.

**Radius:** Buttons 8px | Cards 12-16px | Search 24px | Pills 999px | Modal 16px
NEVER border-radius > 16px on primary containers (except Pills/Toggles).`;

// ---------------------------------------------------------------------------
// IX. CONTENT CONTAINER
// ---------------------------------------------------------------------------

export const CONTENT_CONTAINER = `### Content Container Rules

The content container in App.jsx MUST use \`position: absolute; inset: 0\`.
It MUST NOT have top/left offsets (e.g., top: 70, left: 240) — positions come directly from the Figma wireframe.

**For map screens:**
- Map: \`position: absolute; inset: 0\` (fills entire display)
- Content container: \`position: absolute; inset: 0; pointerEvents: "none"\`
- NO inner wrapper div with \`pointerEvents: "auto"\` — each content panel sets \`pointerEvents: "auto"\` on itself
- The map stays clickable wherever no panel covers it

**For non-map screens:**
- Content container: \`position: absolute; inset: 0; overflow: "hidden"\``;

// ---------------------------------------------------------------------------
// X. MOTION
// ---------------------------------------------------------------------------

export const MOTION = `### Motion & Animation

- Standard easing: \`cubic-bezier(0.4, 0, 0.2, 1)\` (99% of the time)
- Decelerate (fade-in): \`cubic-bezier(0, 0, 0.2, 1)\`
- Fast: 150ms | Base: 250ms | Slow: 400ms
- BANNED: Bounces, springs, parallax. No animations > 300ms for system feedback.`;

// ---------------------------------------------------------------------------
// XI. SHADOWS
// ---------------------------------------------------------------------------

export const SHADOWS = `### Shadows & Elevation

- Card: \`0 2px 8px rgba(0,0,0,0.40)\` + \`inset 0 1px 0 rgba(255,255,255,0.06)\`
- Elevated: \`0 4px 16px rgba(0,0,0,0.50)\`
- Modal: \`0 8px 32px rgba(0,0,0,0.60)\`
- Primary glow: \`0 0 24px rgba(28,105,212,0.60)\` (active BMW Blue elements)
- Warning glow: \`0 0 16px rgba(240,192,64,0.40)\`
- Danger glow: \`0 0 16px rgba(230,57,70,0.50)\``;

// ---------------------------------------------------------------------------
// XII. BANNED PATTERNS
// ---------------------------------------------------------------------------

export const BANNED = `### Banned Patterns

- Consumer-app patterns (bottom nav like Instagram, hamburger menu)
- Tesla-style unstructured mega-screens
- Warm gold accents (Rolls-Royce/Mercedes), sporty red as primary (Ferrari/Audi Sport)
- Gamification, blob shadows, illustrations, glassmorphism on solid surfaces, neumorphism
- Standard unrestyled UI libraries (shadcn, MUI, Bootstrap)
- Pastel colors as system colors
- Mixed icon styles (outline + filled on same screen)
- Hand-built BMW logos (SVG circles, CSS quadrants, Unicode symbols)
- Emoji as icons — never, anywhere`;

// ---------------------------------------------------------------------------
// XIII. CONTENT VOICE
// ---------------------------------------------------------------------------

export const CONTENT_VOICE = `### Content Voice

Terse, technical, German engineering. Imperative or declarative — never conversational.
- No first/second person. The system announces state, never "I" or "you".
- Sentence case for CTAs ("Start route guidance"). ALL CAPS for status labels ("A/C OFF", "AVAILABLE").
- Numbers always tabular (fontVariantNumeric: "tabular-nums"). Decimal precision matches unit (20.0° not 20°).
- No emoji ever. Unicode chars (°, ·, →) are fine.
- Real addresses, never lorem ipsum: "Schlossstrasse 14, 80803 München"`;

// ---------------------------------------------------------------------------
// XIV. TRANSPARENCY & BLUR
// ---------------------------------------------------------------------------

export const TRANSPARENCY = `### Transparency & Blur

- Header/tab strips on map: \`backdrop-filter: blur(8px)\` over \`rgba(10,20,40,0.55)\`
- Cards on solid canvas are OPAQUE — blur only in map context.`;

// ---------------------------------------------------------------------------
// XV. HOVER / PRESS
// ---------------------------------------------------------------------------

export const HOVER_PRESS = `### Hover / Press States

- Hover: BMW Blue 400 (#2D7AE8) or surface lighten
- Press: BMW Blue 600 (#1656B0) or surface darken
- Active: Primary glow shadow. No scale transforms.`;

// ---------------------------------------------------------------------------
// XVI. SAFETY / DRIVER CONTEXT
// ---------------------------------------------------------------------------

export const SAFETY = `### Safety & Driver Context

"Can a driver at 130 km/h read this information in under 1.5 seconds?"

BANNED:
- More than 7 primary actions on one screen
- Information depth > 3 menu levels
- Modal overlays > 40% of screen
- Animations > 300ms for system feedback
- Parallax, autoplay videos, moving backgrounds

REQUIRED:
- Touch targets minimum 64x64px (gloves)
- Glanceability: every primary action readable at a glance
- Critical warnings in direct line of sight`;

// ---------------------------------------------------------------------------
// Assembled rule sets per agent type
// ---------------------------------------------------------------------------

const FULL_DESIGN_SYSTEM = [
  COLORS, TYPOGRAPHY, CARD_RECIPE, ICONS, LAYOUT, SHADOWS, MOTION,
  TRANSPARENCY, HOVER_PRESS, CONTENT_VOICE, SAFETY, BANNED,
].join('\n\n');

export function getDesignKnowledge() {
  return `## BMW HMI Design System Reference\n\n${FULL_DESIGN_SYSTEM}`;
}

export function getRulesForFrontend() {
  return [
    COLORS, SURFACE_COLOR_MAPPING, TYPOGRAPHY, CARD_RECIPE, ICONS,
    CHROME, LOGO, LAYOUT, CONTENT_CONTAINER, SHADOWS, MOTION,
    TRANSPARENCY, HOVER_PRESS, CONTENT_VOICE, SAFETY, BANNED,
  ].join('\n\n');
}

export function getRulesForDesignQA() {
  return [
    COLORS, SURFACE_COLOR_MAPPING, TYPOGRAPHY, CARD_RECIPE, ICONS, ICON_MAPPING,
    CHROME, LOGO, LAYOUT, CONTENT_CONTAINER, MOTION, BANNED, SAFETY,
  ].join('\n\n');
}

export function getRulesForDesignFix() {
  return [
    COLORS, SURFACE_COLOR_MAPPING, TYPOGRAPHY, CARD_RECIPE, ICONS, ICON_MAPPING,
    CHROME, LOGO, LAYOUT, CONTENT_CONTAINER,
  ].join('\n\n');
}

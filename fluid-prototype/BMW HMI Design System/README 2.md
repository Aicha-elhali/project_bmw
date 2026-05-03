# BMW HMI Design System

A design system for prototyping interfaces in the visual language of the BMW central infotainment display ("Operating System X" / Panoramic Vision era). Built so design agents can produce consistent, on-brand mockups, slides and click-thru prototypes for in-car UI.

> ⚠ This is a fan recreation for prototyping. BMW Type Next is a proprietary corporate typeface, so we substitute **Inter** from Google Fonts as the closest neutral humanist sans. Swap in real font files via `colors_and_type.css` if you have them.

## Sources
- **Figma:** `StyleGuide.fig` (mounted as a virtual filesystem). Pages: `/Research`, `/Wireframes`. The Figma is mostly research notes (NHTSA refs, do-don't writeups, mood imagery) — the heavy lifting comes from `uploads/tokens.json` and the visual analysis brief.
- **Tokens:** `uploads/tokens.json` — primitive + semantic + driving-mode tokens (see `colors_and_type.css` for the CSS-vars version).
- **Brief:** Visual analysis of 19 in-car photos covering display geometry, colors, type, layout zones, components.

## Index
| File / folder | What's inside |
|---|---|
| `colors_and_type.css` | All CSS variables (color, type, spacing, radius, shadow, motion) + `.bmw-card`, `.bmw-h1…h4`, `.bmw-tab` etc. |
| `assets/icons.js` | ~30 line-art outline SVG icons (`window.BMWIcons` map + `<BMWIcon>` React helper). |
| `assets/bmw-roundel.png` | Official BMW roundel (user-supplied, 500×500 transparent PNG). |
| `preview/` | Design System tab cards (colors, type, spacing, radius, shadow, components, brand). |
| `ui_kits/bmw-hmi/` | Click-thru recreation of the BMW central display (4 scenes). |
| `SKILL.md` | Cross-compatible Claude Code agent skill manifest. |

---

## Content Fundamentals
**Voice.** Terse, technical, German engineering. Imperative or declarative — never conversational. Examples lifted from real screens:

- *"Drive carefully."* (full stop, declarative — calm urgency)
- *"Start route guidance"* (verb-first CTA)
- *"Notification overview"* (noun phrase, no article)
- *"A/C OFF"* (caps, status fact)
- *"22 kW"*, *"23 °C"*, *"2:55 pm"* (numbers always tabular)
- *"Schloßstraße 14, 80803 München"* (real-world specificity, never lorem ipsum)

**Casing.** Sentence case for sentences/CTAs; **ALL CAPS + 6% letter-spacing** for status labels (`A/C OFF`, `AUTO`, `MAX A/C`, `AVAILABLE`). Title-case for tab labels (`Route`, `Map`, `Charging`).

**Person.** No first or second person. The system *announces* state — it never speaks as "I" or addresses "you". Compare:
- ❌ "You should drive carefully."
- ✅ "Drive carefully."

**Tone.** Premium · Shy-Tech · Calm. The UI defers to the road; copy never shouts unless safety demands it. Warnings are matter-of-fact ("High-voltage system fault detected"), not alarming.

**No emoji.** Ever. Iconography handles every glyph need. Unicode special chars (°, ·, →, ✕) are fine and used freely.

**Numbers.** Always tabular. Decimal precision matches the unit (20.0° not 20°; 22 kW not 22.0 kW). Time uses lowercase am/pm in a smaller weight than the digits.

---

## Visual Foundations
**Backgrounds.** Never pure black, never pure white. Surface canvas is `#0A1428` (dark blue-black). Cards layer on top with a subtle top→bottom gradient `#243757 → #1B2A45`, plus a faint grain (`repeating-linear-gradient(rgba(255,255,255,0.012))`) for the "glass" feel. Map screens use `#0F1A2C` with `#1A3A5F` water and high-contrast white roads.

**Layering, not full-bleed.** New content appears as cards floating *over* the map / canvas — never as full-screen replacements. Modals do not dim the backdrop; the map stays readable behind them.

**Color vibe.** Cool, moonlit, monochromatic blue-black. The single warm exception is the now-playing media card (orange/red gradient) — it's intentionally the only "warm" surface in the entire system.

**Type.** BMW Type Next (fallback Inter). Big numbers in **Thin 100** (speed, range), display titles in **Light 300**, body in **Regular 400**. Caps labels at +6% letter-spacing.

**Spacing.** 4px base. Touch targets ≥ 64×64 (driving-glove sized). Section gaps 32–48. Card padding 16/24.

**Borders.** Almost never used. Surfaces separate by gradient + shadow, not lines. Where dividers exist (list rows, tab strip), they are `rgba(255,255,255,0.08)` — barely visible.

**Cards.** `radius: 12–16px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.4)`, `inset 0 1px 0 rgba(255,255,255,0.06)` for an inner top-edge highlight. Action cards (CTAs) are solid BMW Blue with a `0 0 24px rgba(28,105,212,0.6)` outer glow.

**Animation.** Calm, decelerating. Tab-underline glides ~250ms `cubic-bezier(0.4,0,0.2,1)`; cards scale-and-fade in ~200ms; toggles flip in ~150ms with a color shift. No bounces, no springs, no parallax. Easing is `ease-standard` 99% of the time.

**Hover / press.** On a touch screen "hover" barely exists — but for touch+highlight feedback: hover lightens to BMW Blue 400 (`#2D7AE8`); press darkens to 600 (`#1656B0`). Active cards add the primary glow shadow. No scale transforms on press.

**Transparency / blur.** Header and tab strips use `backdrop-filter: blur(8px)` over `rgba(10,20,40,0.55)` on map screens so the live map shows through. Cards on solid canvas are opaque — blur is reserved for the map context.

**Corner radii.** Buttons 8 / cards 12–16 / search-bar 24 / toggles + avatars 999. Status badges are full-pill.

**Imagery.** Cool, moonlit, automotive. Top-down 3D car renders are dark blue with cyan rim-light. Map at night is the canonical BMW look. Photography (when used) is desaturated and cool-tinted. Never warm.

**Layout — fixed elements.**
1. **Header** floats top, transparent, status icons right-aligned, optional title/wrench-badge left.
2. **Footer** always visible, ~96px tall: driver climate · 7 quick-actions · passenger climate.
3. **Left slot** ~80px: vehicle-status icons (doors, belts, drive recorder).
4. **Right slot** sits in the chamfered corner — park-assist halo + view controls.
5. **Center** holds the map / list / form for the current screen.

**Display geometry.** The screen has a **chamfered bottom-right corner** (~15–20° diagonal). Layouts respect that cutout — the right slot rides the diagonal, footer reserves space to its right.

---

## Iconography
**Style:** **outline / line-art**, 1.75–2px stroke, rounded caps + joins, no fills (except indicator dots and the recording dot). 24×24 viewBox.

**Sets in use:**
- Footer quick-actions (8): note · play · forward · phone · home · fan · car · apps
- Header status (7): bell · mute · bluetooth · wifi · mic · wrench · user
- Map / nav: pin · compass · search · arrow · chevron-right/down · close
- Climate: minus · plus · seat · park
- Status: triangle-alert · seatbelt · door (red), bolt · charge (EV), record dot
- Media: music-note · play (filled) · speaker · camera

**Color rules.**
- Default: `#FFFFFF` on dark surface
- Active state: `#1C69D4` (BMW Blue) with optional `0 0 16px` glow
- Warning: `#F0C040` (yellow)
- Danger: `#E63946` (red — open door, fasten belt, traffic-jam)
- Success: `#3CD278` (green — available chargers)

**No emoji, ever.** No icon fonts (no FA / Material Symbols). Everything is hand-rolled SVG inside `assets/icons.js`. If a glyph is missing, add it there following the existing 1.75-stroke convention.

**Logo.** The BMW roundel (`assets/bmw-roundel.png`) is the only logo. Use this exact file — never recreate the roundel in code. Always on a dark surface or solid BMW Blue. Never on white. Sizes: 32px (header avatar), 80px (login), 200px+ (splash).

**Sourcing.** Icons in this system are hand-rolled to match BMW iD Drive 8/9 line style. They are NOT lifted from the Figma file — the Figma is research-only and contains no production icon sprites. If higher fidelity is required, replace each icon's path string in `assets/icons.js` with an official asset.

---

## Caveats / known gaps
1. **Font** is Inter, not BMW Type Next. Substitute real font files for production.
2. **Top-down car render** is a stylized SVG approximation, not the photoreal automotive 3D BMW ships.
3. **Map** is a procedurally-drawn SVG, not a real tile renderer.
4. **Iconography** is hand-recreated in the BMW iD Drive 8/9 idiom but is NOT pulled from official BMW sprites.
5. **Driving-mode** token overrides (larger touch targets, simplified UI above 100 km/h) are defined but not yet wired into a separate UI kit variant.

See `SKILL.md` for the agent-invocable manifest.

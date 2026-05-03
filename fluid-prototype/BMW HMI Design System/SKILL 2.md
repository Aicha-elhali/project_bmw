---
name: bmw-hmi-design
description: Use this skill to generate well-branded interfaces and assets for BMW in-car HMI (Operating System X / Panoramic Vision style), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Always link `colors_and_type.css` and `assets/icons.js`. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Hard rules
- Never pure black or pure white surfaces. Use `--surface-canvas: #0A1428` for backgrounds.
- BMW Blue `#1C69D4` is the only accent color allowed on dark backgrounds.
- All text is white / light-gray; status colors only for warnings, dangers, success.
- Touch targets ≥ 64×64 px.
- Iconography is outline / line-art, 1.75–2px stroke. No emoji, no icon fonts.
- The display has a chamfered bottom-right corner; layouts must respect it.
- Header (top) and Footer (climate + 7 quick actions) are always visible.
- Cards layer over map/canvas — never replace it full-screen.
- All-caps labels get +6% letter-spacing.

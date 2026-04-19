/**
 * Phase 3 — Design Token Engine (BMW iDrive Navigation)
 *
 * Maps navigation-specific component types to BMW iDrive design tokens.
 * Optimized for automotive center console displays:
 * - Dark theme (OLED-friendly, reduces glare)
 * - Large touch targets (driving safety)
 * - High contrast (readability in varying light)
 * - bmwTypeNextWeb font, weight 300 (light) signature
 */

import { readFile } from 'fs/promises';
import { resolve }  from 'path';

// ---------------------------------------------------------------------------
// Token loader
// ---------------------------------------------------------------------------

let _cachedTokens = null;

export async function loadTokens(tokensPath) {
  if (_cachedTokens) return _cachedTokens;
  const raw = await readFile(resolve(tokensPath), 'utf-8');
  _cachedTokens = JSON.parse(raw);
  return _cachedTokens;
}

// ---------------------------------------------------------------------------
// Component type → BMW iDrive navigation token mapping
// ---------------------------------------------------------------------------

function buildStyleForType(type, tokens, node) {
  const { colors, spacing, typography, fontWeights, borderRadius, shadows, transitions } = tokens;

  const base = {
    boxSizing:  'border-box',
    fontFamily: typography.body.family,
    fontWeight: fontWeights.light,
  };

  switch (type) {
    // ── Full screen container ─────────────────────────────────────────────
    case 'screen':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        width:           '100%',
        height:          '100vh',
        backgroundColor: colors.background,
        color:           colors.text,
        overflow:        'hidden',
        position:        'relative',
      };

    // ── Status bar (top: time, signal, temp) ──────────────────────────────
    case 'statusBar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        backgroundColor: colors.background,
        color:           colors.textSecondary,
        padding:         `0 ${spacing.lg}`,
        width:           '100%',
        height:          spacing.statusBarHeight,
        minHeight:       spacing.statusBarHeight,
        fontSize:        typography.caption.size,
        fontWeight:      fontWeights.regular,
        borderBottom:    `1px solid ${colors.divider}`,
        flexShrink:      '0',
        zIndex:          '100',
      };

    // ── Map area ──────────────────────────────────────────────────────────
    case 'map':
      return {
        ...base,
        flex:            '1',
        position:        'relative',
        backgroundColor: colors.mapDark,
        overflow:        'hidden',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        color:           colors.textMuted,
        fontSize:        typography.heading2.size,
      };

    // ── Route info panel ──────────────────────────────────────────────────
    case 'routeInfo':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             spacing.md,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         spacing.lg,
        boxShadow:       shadows.lg,
        color:           colors.text,
        width:           spacing.panelWidth,
        maxHeight:       '80%',
        overflow:        'auto',
      };

    // ── Turn-by-turn indicator ────────────────────────────────────────────
    case 'turnIndicator':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.md,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         `${spacing.md} ${spacing.lg}`,
        boxShadow:       shadows.md,
        color:           colors.text,
      };

    // ── Search bar ────────────────────────────────────────────────────────
    case 'searchBar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.sm,
        backgroundColor: colors.backgroundOverlay,
        color:           colors.text,
        padding:         `${spacing.sm} ${spacing.lg}`,
        borderRadius:    borderRadius.xl,
        border:          `1px solid ${colors.border}`,
        fontSize:        typography.body.size,
        fontWeight:      fontWeights.regular,
        minHeight:       spacing.touchTargetMin,
        width:           '100%',
        transition:      `border-color ${transitions.fast}`,
      };

    // ── Bottom dock / navigation bar ──────────────────────────────────────
    case 'dock':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.xl,
        backgroundColor: colors.background,
        borderTop:       `1px solid ${colors.divider}`,
        padding:         `${spacing.sm} ${spacing.xxl}`,
        width:           '100%',
        height:          spacing.dockHeight,
        minHeight:       spacing.dockHeight,
        flexShrink:      '0',
        zIndex:          '100',
      };

    // ── Dock item (icon + label) ──────────────────────────────────────────
    case 'dockItem':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.xs,
        color:           colors.textMuted,
        cursor:          'pointer',
        padding:         spacing.xs,
        minWidth:        spacing.touchTarget,
        minHeight:       spacing.touchTarget,
        borderRadius:    borderRadius.md,
        fontSize:        typography.caption.size,
        fontWeight:      fontWeights.medium,
        transition:      `color ${transitions.fast}, background-color ${transitions.fast}`,
      };

    // ── Side panel ────────────────────────────────────────────────────────
    case 'sidePanel':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             spacing.sm,
        backgroundColor: colors.backgroundElevated,
        borderLeft:      `1px solid ${colors.divider}`,
        padding:         spacing.lg,
        width:           spacing.panelWidth,
        height:          '100%',
        color:           colors.text,
        overflowY:       'auto',
      };

    // ── Media player widget ───────────────────────────────────────────────
    case 'mediaPlayer':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.md,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         spacing.md,
        boxShadow:       shadows.md,
        color:           colors.text,
        minHeight:       spacing.touchTarget,
      };

    // ── Climate control ───────────────────────────────────────────────────
    case 'climateControl':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             spacing.lg,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         `${spacing.md} ${spacing.lg}`,
        color:           colors.text,
      };

    // ── Quick action button (floating on map) ─────────────────────────────
    case 'quickAction':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           spacing.touchTarget,
        height:          spacing.touchTarget,
        backgroundColor: colors.backgroundOverlay,
        borderRadius:    borderRadius.full,
        boxShadow:       shadows.md,
        color:           colors.text,
        cursor:          'pointer',
        border:          `1px solid ${colors.border}`,
        transition:      `background-color ${transitions.fast}`,
      };

    // ── POI list ──────────────────────────────────────────────────────────
    case 'poiList':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             '1px',
        width:           '100%',
        color:           colors.text,
        backgroundColor: colors.divider,
        borderRadius:    borderRadius.md,
        overflow:        'hidden',
      };

    // ── POI item ──────────────────────────────────────────────────────────
    case 'poiItem':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.md,
        backgroundColor: colors.backgroundElevated,
        padding:         `${spacing.md} ${spacing.lg}`,
        minHeight:       spacing.touchTarget,
        color:           colors.text,
        cursor:          'pointer',
        transition:      `background-color ${transitions.fast}`,
      };

    // ── Speed limit indicator ─────────────────────────────────────────────
    case 'speedLimit':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           '3.5rem',
        height:          '3.5rem',
        borderRadius:    borderRadius.full,
        border:          `3px solid ${colors.error}`,
        backgroundColor: colors.text,
        color:           colors.background,
        fontSize:        typography.heading2.size,
        fontWeight:      fontWeights.bold,
      };

    // ── Vehicle info widget ───────────────────────────────────────────────
    case 'vehicleInfo':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.lg,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         `${spacing.md} ${spacing.lg}`,
        color:           colors.text,
        fontSize:        typography.bodySmall.size,
      };

    // ── Button ────────────────────────────────────────────────────────────
    case 'button':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.xs,
        backgroundColor: colors.primary,
        color:           '#FFFFFF',
        padding:         `${spacing.sm} ${spacing.xl}`,
        borderRadius:    borderRadius.md,
        border:          'none',
        cursor:          'pointer',
        fontSize:        typography.body.size,
        fontWeight:      fontWeights.medium,
        minHeight:       spacing.touchTargetMin,
        transition:      `background-color ${transitions.fast}`,
        whiteSpace:      'nowrap',
      };

    // ── Icon button ───────────────────────────────────────────────────────
    case 'iconButton':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           spacing.touchTargetMin,
        height:          spacing.touchTargetMin,
        backgroundColor: 'transparent',
        color:           colors.text,
        borderRadius:    borderRadius.full,
        border:          'none',
        cursor:          'pointer',
        padding:         '0',
        transition:      `background-color ${transitions.fast}`,
      };

    // ── Heading ───────────────────────────────────────────────────────────
    case 'heading':
      return {
        ...base,
        fontSize:   typography.heading1.size,
        fontWeight: fontWeights.light,
        lineHeight: typography.heading1.lineHeight,
        color:      colors.text,
        margin:     '0',
      };

    // ── Text ──────────────────────────────────────────────────────────────
    case 'text':
      return {
        ...base,
        fontSize:   typography.body.size,
        lineHeight: typography.body.lineHeight,
        color:      colors.text,
        margin:     '0',
      };

    // ── Icon ──────────────────────────────────────────────────────────────
    case 'icon':
      return {
        ...base,
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '1.5rem',
        height:         '1.5rem',
        color:          colors.text,
      };

    // ── Divider ───────────────────────────────────────────────────────────
    case 'divider':
      return {
        width:           '100%',
        height:          '1px',
        backgroundColor: colors.divider,
        border:          'none',
        margin:          `${spacing.sm} 0`,
        flexShrink:      '0',
      };

    // ── Card ──────────────────────────────────────────────────────────────
    case 'card':
      return {
        ...base,
        display:         'flex',
        flexDirection:   node.layout?.direction === 'row' ? 'row' : 'column',
        gap:             spacing.md,
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.lg,
        padding:         spacing.lg,
        boxShadow:       shadows.sm,
        color:           colors.text,
        overflow:        'hidden',
      };

    // ── Toggle ────────────────────────────────────────────────────────────
    case 'toggle':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        width:           '3.25rem',
        height:          '2rem',
        backgroundColor: colors.surface,
        borderRadius:    borderRadius.full,
        padding:         '0.25rem',
        cursor:          'pointer',
        transition:      `background-color ${transitions.fast}`,
      };

    // ── Slider ────────────────────────────────────────────────────────────
    case 'slider':
      return {
        ...base,
        display:    'flex',
        alignItems: 'center',
        width:      '100%',
        height:     spacing.touchTargetMin,
        cursor:     'pointer',
      };

    // ── Image placeholder ─────────────────────────────────────────────────
    case 'image':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: colors.surface,
        borderRadius:    borderRadius.md,
        width:           '100%',
        height:          node.layout?.height ? `${node.layout.height}px` : 'auto',
        objectFit:       'cover',
        color:           colors.textMuted,
      };

    // ── Generic container ─────────────────────────────────────────────────
    case 'container':
    default:
      return {
        ...base,
        display:         'flex',
        flexDirection:   node.layout?.direction === 'row' ? 'row' : 'column',
        gap:             node.layout?.gap ? `${node.layout.gap}px` : spacing.md,
        backgroundColor: 'transparent',
        color:           colors.text,
        width:           '100%',
      };
  }
}

// ---------------------------------------------------------------------------
// Contrast validation (WCAG AA: 4.5:1 for text)
// ---------------------------------------------------------------------------

function relativeLuminance(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function validateContrast(style) {
  const warnings = [];
  const textColor = style.color;
  const bgColor   = style.backgroundColor;
  if (textColor && bgColor && textColor.startsWith('#') && bgColor.startsWith('#')) {
    const ratio = contrastRatio(textColor, bgColor);
    if (ratio !== null && ratio < 4.5) {
      warnings.push(
        `Low contrast: text ${textColor} on ${bgColor} = ${ratio.toFixed(2)}:1 (WCAG AA requires 4.5:1)`
      );
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function applyTokens(node, tokens) {
  const allWarnings = [];

  const style = buildStyleForType(node.type, tokens, node);
  node.style = Object.fromEntries(
    Object.entries(style).filter(([, v]) => v !== undefined)
  );

  const warnings = validateContrast(node.style);
  if (warnings.length) {
    allWarnings.push(...warnings.map(w => `[${node.label}] ${w}`));
  }

  for (const child of node.children ?? []) {
    allWarnings.push(...applyTokens(child, tokens));
  }

  return allWarnings;
}

export async function applyDesignTokens(componentTree, tokensPath) {
  const tokens = await loadTokens(tokensPath);
  const tree   = structuredClone(componentTree);
  const warnings = applyTokens(tree, tokens);
  return { tree, warnings };
}

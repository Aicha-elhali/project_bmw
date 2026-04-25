/**
 * Phase 3 — Design Token Engine (BMW HMI Design System)
 *
 * Maps component types to BMW HMI Design System tokens.
 * Uses the Operating System X / Panoramic Vision visual language:
 * - Blue-tinted dark surfaces (#0A1428 canvas, NOT neutral blacks)
 * - Card gradients with glass-feel grain
 * - 64px touch targets (driving-glove sized)
 * - BMW Type Next / Inter font stack
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
// Component type → BMW HMI token mapping
// ---------------------------------------------------------------------------

function buildStyleForType(type, tokens, node) {
  const { colors, spacing, typography, fontWeights, borderRadius, shadows, transitions } = tokens;

  const fontStack = typography.body.family;

  const base = {
    boxSizing:  'border-box',
    fontFamily: fontStack,
    fontWeight: fontWeights.regular,
  };

  switch (type) {
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

    case 'statusBar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        backgroundColor: 'transparent',
        backdropFilter:  'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color:           colors.textSecondary,
        padding:         `0 ${spacing.lg}`,
        width:           '100%',
        height:          spacing.headerHeight,
        minHeight:       spacing.headerHeight,
        fontSize:        typography.statusLabel.size,
        fontWeight:      fontWeights.regular,
        letterSpacing:   typography.statusLabel.letterSpacing,
        textTransform:   'uppercase',
        borderBottom:    `1px solid ${colors.border}`,
        flexShrink:      '0',
        zIndex:          '100',
        position:        'relative',
      };

    case 'map':
      return {
        ...base,
        flex:            '1',
        position:        'relative',
        backgroundColor: colors.mapNight,
        overflow:        'hidden',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        color:           colors.textTertiary,
        fontSize:        typography.heading2.size,
      };

    case 'routeInfo':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             spacing.md,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.lg,
        padding:         spacing.lg,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        width:           spacing.panelWidth,
        maxHeight:       '80%',
        overflow:        'auto',
        position:        'relative',
      };

    case 'turnIndicator':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.md,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.lg,
        padding:         `${spacing.md} ${spacing.lg}`,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        position:        'relative',
      };

    case 'searchBar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.sm,
        backgroundColor: colors.backgroundElevated,
        color:           colors.text,
        padding:         `${spacing.sm} ${spacing.lg}`,
        borderRadius:    borderRadius['2xl'],
        border:          `1px solid ${colors.border}`,
        fontSize:        typography.body.size,
        fontWeight:      fontWeights.regular,
        minHeight:       spacing.touchTarget,
        width:           '100%',
        transition:      `border-color ${transitions.fast}`,
      };

    case 'dock':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.xl,
        backgroundColor: colors.background,
        borderTop:       `1px solid ${colors.border}`,
        padding:         `${spacing.sm} ${spacing.xxl}`,
        width:           '100%',
        height:          spacing.footerHeight,
        minHeight:       spacing.footerHeight,
        flexShrink:      '0',
        zIndex:          '100',
      };

    case 'dockItem':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.xs,
        color:           colors.textTertiary,
        cursor:          'pointer',
        padding:         spacing.sm,
        minWidth:        spacing.touchTarget,
        minHeight:       spacing.touchTarget,
        borderRadius:    borderRadius.md,
        fontSize:        typography.label.size,
        fontWeight:      fontWeights.regular,
        letterSpacing:   typography.label.letterSpacing,
        textTransform:   'uppercase',
        transition:      `color ${transitions.fast}, background-color ${transitions.fast}`,
      };

    case 'sidePanel':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             spacing.sm,
        backgroundColor: colors.backgroundElevated,
        borderLeft:      `1px solid ${colors.border}`,
        padding:         spacing.lg,
        width:           spacing.panelWidth,
        height:          '100%',
        color:           colors.text,
        overflowY:       'auto',
      };

    case 'mediaPlayer':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.md,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.lg,
        padding:         spacing.md,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        minHeight:       spacing.touchTarget,
        position:        'relative',
      };

    case 'climateControl':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             spacing.lg,
        backgroundColor: colors.background,
        padding:         `${spacing.md} ${spacing.lg}`,
        color:           colors.text,
        fontSize:        typography.climateTemp.size,
        fontWeight:      typography.climateTemp.weight,
      };

    case 'quickAction':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           spacing.touchTarget,
        height:          spacing.touchTarget,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.full,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        cursor:          'pointer',
        border:          'none',
        transition:      `background-color ${transitions.fast}`,
      };

    case 'poiList':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        gap:             '1px',
        width:           '100%',
        color:           colors.text,
        backgroundColor: colors.border,
        borderRadius:    borderRadius.md,
        overflow:        'hidden',
      };

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

    case 'speedLimit':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           '56px',
        height:          '56px',
        borderRadius:    borderRadius.full,
        border:          `3px solid ${colors.error}`,
        backgroundColor: colors.text,
        color:           colors.background,
        fontSize:        typography.heading3.size,
        fontWeight:      fontWeights.bold,
        fontVariantNumeric: 'tabular-nums',
      };

    case 'vehicleInfo':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing.lg,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.lg,
        padding:         `${spacing.md} ${spacing.lg}`,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        fontSize:        typography.bodySecondary.size,
        position:        'relative',
      };

    case 'button':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             spacing.sm,
        backgroundColor: colors.primary,
        color:           '#FFFFFF',
        padding:         `${spacing.sm} ${spacing.xl}`,
        borderRadius:    borderRadius.md,
        border:          'none',
        cursor:          'pointer',
        fontSize:        typography.body.size,
        fontWeight:      fontWeights.medium,
        minHeight:       spacing.touchTarget,
        transition:      `background-color ${transitions.fast}`,
        whiteSpace:      'nowrap',
      };

    case 'iconButton':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           spacing.touchTarget,
        height:          spacing.touchTarget,
        backgroundColor: 'transparent',
        color:           colors.text,
        borderRadius:    borderRadius.full,
        border:          'none',
        cursor:          'pointer',
        padding:         '0',
        transition:      `background-color ${transitions.fast}`,
      };

    case 'heading':
      return {
        ...base,
        fontSize:   typography.heading1.size,
        fontWeight: fontWeights.light,
        lineHeight: typography.heading1.lineHeight,
        color:      colors.text,
        margin:     '0',
      };

    case 'text':
      return {
        ...base,
        fontSize:   typography.body.size,
        lineHeight: typography.body.lineHeight,
        color:      colors.text,
        margin:     '0',
      };

    case 'icon':
      return {
        ...base,
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '24px',
        height:         '24px',
        color:          colors.text,
      };

    case 'divider':
      return {
        width:           '100%',
        height:          '1px',
        backgroundColor: colors.border,
        border:          'none',
        margin:          `${spacing.sm} 0`,
        flexShrink:      '0',
      };

    case 'card':
      return {
        ...base,
        display:         'flex',
        flexDirection:   node.layout?.direction === 'row' ? 'row' : 'column',
        gap:             spacing.md,
        background:      colors.cardGradient,
        borderRadius:    borderRadius.lg,
        padding:         spacing.lg,
        boxShadow:       `${shadows.card}, ${shadows.innerCard}`,
        color:           colors.text,
        overflow:        'hidden',
        position:        'relative',
      };

    case 'toggle':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        width:           '52px',
        height:          '32px',
        backgroundColor: colors.backgroundElevatedStrong,
        borderRadius:    borderRadius.full,
        padding:         '4px',
        cursor:          'pointer',
        transition:      `background-color ${transitions.fast}`,
      };

    case 'slider':
      return {
        ...base,
        display:    'flex',
        alignItems: 'center',
        width:      '100%',
        height:     spacing.touchTarget,
        cursor:     'pointer',
      };

    case 'image':
      return {
        ...base,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: colors.backgroundElevated,
        borderRadius:    borderRadius.md,
        width:           '100%',
        height:          node.layout?.height ? `${node.layout.height}px` : 'auto',
        objectFit:       'cover',
        color:           colors.textTertiary,
      };

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

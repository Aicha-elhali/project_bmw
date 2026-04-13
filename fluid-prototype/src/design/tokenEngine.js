/**
 * Phase 3 — Design Token Engine (BMW Brand — scraped from bmw.de)
 *
 * Real BMW design language based on production CSS:
 * - Font: bmwTypeNextWeb, weight 300 (light) as default
 * - Colors: #262626 background (not pure black), #1C69D4 BMW Blue
 * - Shadows: subtle rgba-based, 0.125rem blur for cards
 * - Border-radius: 3px default, 0.5rem for cards
 * - Transitions: 0.25s ease-in-out standard, 0.314s for backgrounds
 * - Touch targets: 3rem minimum height
 * - BEM naming: cmp-{component}__{element}--{modifier}
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

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
// Component type → BMW production token mapping
// Derived from bmw.de CSS classes: .cmp-button, .cmp-container, etc.
// ---------------------------------------------------------------------------

function buildStyleForType(type, tokens, node) {
  const { colors, spacing, typography, fontWeights, borderRadius, shadows, transitions } = tokens;
  const raw = node.raw ?? {};

  // BMW base: bmwTypeNextWeb, weight 300 (light)
  const base = {
    boxSizing: 'border-box',
    fontFamily: typography.body.family,
    fontWeight: fontWeights.default,
  };

  switch (type) {
    // ── .cmp-button / .style-button--primary ──────────────────────────────
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
        borderRadius:    borderRadius.sm,             // BMW: 3px
        border:          'none',
        cursor:          'pointer',
        fontSize:        typography.body.size,         // BMW: 1rem
        fontWeight:      fontWeights.clickable,        // BMW: 500
        fontFamily:      typography.body.family,
        minHeight:       spacing.touchTarget,           // BMW: 3rem
        transition:      `color ${transitions.fast}, background-color ${transitions.fast}, box-shadow ${transitions.fast}`,
        whiteSpace:      'nowrap',
      };

    // ── .cmp-dropdown__input / form inputs ────────────────────────────────
    case 'input':
      return {
        ...base,
        display:         'block',
        width:           '100%',
        backgroundColor: 'transparent',
        color:           colors.text,
        padding:         `${spacing.md} ${spacing.lg}`,
        borderRadius:    borderRadius.sm,
        border:          'none',
        borderBottom:    `1px solid ${colors.borderDark}`,  // BMW: underline inputs
        fontSize:        typography.body.size,
        fontWeight:      fontWeights.input,             // BMW: 400
        fontFamily:      typography.body.family,
        minHeight:       spacing.touchTarget,
        outline:         'none',
        caretColor:      colors.primary,
        transition:      `border-color ${transitions.fast}`,
      };

    // ── Card pattern (teaser/tile) ────────────────────────────────────────
    case 'card':
      return {
        ...base,
        display:         'flex',
        flexDirection:   node.layout?.direction === 'row' ? 'row' : 'column',
        backgroundColor: colors.background,
        borderRadius:    borderRadius.md,              // BMW: 0.5rem (8px)
        boxShadow:       shadows.sm,
        padding:         spacing.lg,
        gap:             spacing.md,
        overflow:        'hidden',
        transition:      `box-shadow ${transitions.fast}`,
      };

    // ── .cmp-globalnavigation__container ───────────────────────────────────
    case 'navbar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        backgroundColor: colors.background,
        borderBottom:    'none',                        // BMW: no visible border on nav
        padding:         `${spacing.md} ${spacing.xl}`,
        width:           '100%',
        minHeight:       '3.5rem',
        color:           colors.text,
      };

    // ── Footer ────────────────────────────────────────────────────────────
    case 'footer':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'flex-start',
        gap:             spacing.lg,
        backgroundColor: colors.background,
        borderTop:       `1px solid ${colors.borderDark}`,
        padding:         `${spacing.xxl} ${spacing.xl}`,
        width:           '100%',
        marginTop:       'auto',
        color:           colors.textOnDarkMuted,
        fontSize:        typography.small.size,
      };

    // ── Sidebar / aside ───────────────────────────────────────────────────
    case 'sidebar':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        backgroundColor: colors.background,
        borderRight:     `1px solid ${colors.borderDark}`,
        padding:         `${spacing.xl} ${spacing.lg}`,
        gap:             spacing.sm,
        minWidth:        '280px',
        color:           colors.text,
      };

    // ── Modal / dialog / overlay ──────────────────────────────────────────
    case 'modal':
      return {
        ...base,
        display:         'flex',
        flexDirection:   'column',
        backgroundColor: colors.background,
        borderRadius:    borderRadius.lg,
        boxShadow:       shadows.md,
        padding:         spacing.xl,
        gap:             spacing.lg,
        maxWidth:        '600px',
        width:           '90%',
        color:           colors.text,
      };

    // ── .cmp-container / .style-container ─────────────────────────────────
    case 'container':
    case 'section':
    case 'form':
      return {
        ...base,
        display:         'flex',
        flexDirection:   node.layout?.direction === 'row' ? 'row' : 'column',
        gap:             node.layout?.gap ? `${node.layout.gap}px` : spacing.lg,
        padding:         buildPadding(node.layout?.padding, spacing),
        backgroundColor: raw.backgroundColor ?? 'transparent',
        borderRadius:    raw.borderRadius ? `${raw.borderRadius}px` : undefined,
        width:           '100%',
        color:           colors.text,
      };

    // ── Headings (--headline-1) ───────────────────────────────────────────
    case 'heading':
      return {
        ...base,
        fontSize:       typography.heading.size,
        fontWeight:     fontWeights.default,            // BMW: 300 for ALL headings
        fontFamily:     typography.heading.family,
        lineHeight:     typography.heading.lineHeight,
        letterSpacing:  'normal',
        color:          colors.text,
        margin:         0,
      };

    // ── Body text (--body-1) ──────────────────────────────────────────────
    case 'text':
      return {
        ...base,
        fontSize:    node.typography?.fontSize ? `${node.typography.fontSize}px` : typography.body.size,
        fontWeight:  node.typography?.fontWeight ?? fontWeights.default,
        fontFamily:  typography.body.family,
        lineHeight:  typography.body.lineHeight,
        color:       colors.text,
        textAlign:   node.typography?.textAlign ?? 'left',
        margin:      0,
      };

    // ── Label (--label-1, uppercase for BMW labels) ───────────────────────
    case 'label':
      return {
        ...base,
        fontSize:       typography.label.size,          // BMW: 0.75rem
        fontWeight:     fontWeights.clickable,           // BMW: 500
        fontFamily:     typography.label.family,
        lineHeight:     typography.label.lineHeight,
        color:          colors.textSecondary,
        margin:         0,
      };

    // ── Image / photo / avatar ────────────────────────────────────────────
    case 'image':
      return {
        ...base,
        display:        'block',
        width:          '100%',
        height:         node.layout?.height ? `${node.layout.height}px` : 'auto',
        objectFit:      'cover',
        borderRadius:   0,                              // BMW: images have no radius
        backgroundColor: colors.background,
      };

    // ── Badge / tag / chip ────────────────────────────────────────────────
    case 'badge':
      return {
        ...base,
        display:         'inline-flex',
        alignItems:      'center',
        backgroundColor: colors.primary,
        color:           '#FFFFFF',
        padding:         `${spacing.xs} ${spacing.sm}`,
        borderRadius:    borderRadius.sm,
        fontSize:        typography.small.size,
        fontWeight:      fontWeights.clickable,
        fontFamily:      typography.label.family,
      };

    // ── Divider / separator ───────────────────────────────────────────────
    case 'divider':
      return {
        ...base,
        width:           '100%',
        height:          '1px',
        backgroundColor: colors.borderDark,
        margin:          `${spacing.lg} 0`,
        border:          'none',
      };

    // ── Icon ──────────────────────────────────────────────────────────────
    case 'icon':
      return {
        ...base,
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          colors.text,
        width:          '1.5rem',
        height:         '1.5rem',
        fontFamily:     '"bmw_next_icons"',
      };

    // ── List ──────────────────────────────────────────────────────────────
    case 'list':
      return {
        ...base,
        display:       'flex',
        flexDirection: 'column',
        gap:           spacing.xs,
        width:         '100%',
        listStyle:     'none',
        padding:       0,
        margin:        0,
        color:         colors.text,
      };

    // ── Fallback ──────────────────────────────────────────────────────────
    case 'rectangle':
    default:
      return {
        ...base,
        backgroundColor: raw.backgroundColor ?? 'transparent',
        borderRadius:    raw.borderRadius ? `${raw.borderRadius}px` : undefined,
        border:          raw.strokeColor ? `${raw.strokeWidth}px solid ${raw.strokeColor}` : undefined,
      };
  }
}

// ---------------------------------------------------------------------------
// Padding helper
// ---------------------------------------------------------------------------

function buildPadding(padding, spacing) {
  if (!padding) return spacing.lg;
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `${top}px ${right}px ${bottom}px ${left}px`;
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

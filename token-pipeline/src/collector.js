/**
 * Walks a Figma node tree and collects rich contextual data for Claude.
 *
 * Unlike the heuristic extractor, this collector preserves:
 *   - Node names and parent names (so Claude can infer semantics)
 *   - Sample text content (so Claude can distinguish "83" on a speedometer from a heading)
 *   - Gradient fills converted to CSS (so Claude can describe background effects)
 *   - Stroke data (borders)
 *
 * Output is aggregated by unique value to stay within prompt limits.
 */

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export function figmaColorToCss({ r, g, b, a = 1 }) {
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  const alpha = parseFloat(a.toFixed(3));
  if (alpha < 0.99) return `rgba(${ri},${gi},${bi},${alpha})`;
  return (
    '#' +
    ri.toString(16).padStart(2, '0') +
    gi.toString(16).padStart(2, '0') +
    bi.toString(16).padStart(2, '0')
  ).toUpperCase();
}

function gradientToCss(fill) {
  const stops = (fill.gradientStops ?? [])
    .map(s => {
      const color = figmaColorToCss(s.color);
      const pos = Math.round(s.position * 100);
      return `${color} ${pos}%`;
    })
    .join(', ');

  if (fill.type === 'GRADIENT_LINEAR') {
    const h = fill.gradientHandlePositions ?? [];
    let angle = 180;
    if (h.length >= 2) {
      angle = Math.round(
        Math.atan2(h[1].y - h[0].y, h[1].x - h[0].x) * (180 / Math.PI) + 90
      );
    }
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  if (fill.type === 'GRADIENT_RADIAL') return `radial-gradient(circle, ${stops})`;
  if (fill.type === 'GRADIENT_ANGULAR') return `conic-gradient(${stops})`;
  return null;
}

function shadowToCss(effect) {
  const c = figmaColorToCss(effect.color);
  const x = Math.round(effect.offset?.x ?? 0);
  const y = Math.round(effect.offset?.y ?? 0);
  const r = Math.round(effect.radius ?? 0);
  const s = Math.round(effect.spread ?? 0);
  const pre = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
  return `${pre}${x}px ${y}px ${r}px${s ? ' ' + s + 'px' : ''} ${c}`;
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

const MAX_CONTEXTS = 6; // cap example contexts per unique value

export function collectFrameData(rootNode) {
  const solidFills   = new Map(); // css → { color, count, contexts[] }
  const gradients    = [];        // { css, contexts[] }
  const textStyles   = new Map(); // key → { ...style, count, sampleTexts[], contexts[] }
  const spacings     = new Map(); // px  → { value, count, sources[] }
  const radii        = new Map(); // px  → { value, count, contexts[] }
  const shadows      = new Map(); // css → { css, count, contexts[] }
  const strokes      = new Map(); // key → { color, weight, count, contexts[] }
  let nodeCount = 0;

  function walk(node, parentName) {
    nodeCount++;
    const name = node.name ?? 'unnamed';
    const type = node.type ?? 'UNKNOWN';
    const ctx  = { nodeName: name, nodeType: type, parentName };

    // ── Fills ────────────────────────────────────────────────────────────
    for (const fill of node.fills ?? []) {
      const opacity = fill.opacity ?? fill.color?.a ?? 1;
      if (opacity === 0 || fill.visible === false) continue;

      if (fill.type === 'SOLID') {
        const css   = figmaColorToCss({ ...fill.color, a: opacity });
        const entry = solidFills.get(css) ?? { color: css, count: 0, contexts: [] };
        entry.count++;
        if (entry.contexts.length < MAX_CONTEXTS) entry.contexts.push(ctx);
        solidFills.set(css, entry);
      } else if (fill.type?.startsWith('GRADIENT_')) {
        const css = gradientToCss(fill);
        if (css) gradients.push({ css, contexts: [ctx] });
      }
    }

    // ── Text styles ──────────────────────────────────────────────────────
    if (type === 'TEXT' && node.style) {
      const s   = node.style;
      const key = `${s.fontFamily}|${s.fontWeight}|${s.fontSize}`;

      const textFill  = (node.fills ?? []).find(f => f.type === 'SOLID' && f.visible !== false);
      const textColor = textFill
        ? figmaColorToCss({ ...textFill.color, a: textFill.opacity ?? 1 })
        : null;

      const entry = textStyles.get(key) ?? {
        fontFamily:    s.fontFamily   ?? 'sans-serif',
        fontSize:      s.fontSize     ?? 16,
        fontWeight:    s.fontWeight   ?? 400,
        lineHeight:    s.lineHeightPx ? `${parseFloat(s.lineHeightPx.toFixed(1))}px` : 'auto',
        letterSpacing: s.letterSpacing && Math.abs(s.letterSpacing) > 0.01
          ? `${parseFloat(s.letterSpacing.toFixed(2))}px`
          : 'normal',
        textColor,
        count:       0,
        sampleTexts: [],
        contexts:    [],
      };
      entry.count++;
      if (node.characters && entry.sampleTexts.length < 3) {
        entry.sampleTexts.push(node.characters.slice(0, 50));
      }
      if (entry.contexts.length < MAX_CONTEXTS) entry.contexts.push(ctx);
      textStyles.set(key, entry);
    }

    // ── Spacing (auto-layout) ────────────────────────────────────────────
    if (node.layoutMode) {
      const pairs = [
        [node.paddingTop,         'paddingTop'],
        [node.paddingRight,       'paddingRight'],
        [node.paddingBottom,      'paddingBottom'],
        [node.paddingLeft,        'paddingLeft'],
        [node.itemSpacing,        'itemSpacing'],
        [node.counterAxisSpacing, 'counterAxisSpacing'],
      ];
      for (const [val, source] of pairs) {
        if (typeof val === 'number' && val > 0) {
          const entry = spacings.get(val) ?? { value: val, count: 0, sources: [] };
          entry.count++;
          if (entry.sources.length < MAX_CONTEXTS) entry.sources.push(`${source} in ${name}`);
          spacings.set(val, entry);
        }
      }
    }

    // ── Corner radii ─────────────────────────────────────────────────────
    for (const r of [
      node.cornerRadius,
      node.topLeftRadius, node.topRightRadius,
      node.bottomLeftRadius, node.bottomRightRadius,
    ]) {
      if (typeof r === 'number' && r > 0) {
        const capped = r > 1000 ? 9999 : r;
        const entry  = radii.get(capped) ?? { value: capped, count: 0, contexts: [] };
        entry.count++;
        if (entry.contexts.length < MAX_CONTEXTS) entry.contexts.push(name);
        radii.set(capped, entry);
      }
    }

    // ── Shadows ──────────────────────────────────────────────────────────
    for (const effect of node.effects ?? []) {
      if ((effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && effect.visible !== false) {
        const css   = shadowToCss(effect);
        const entry = shadows.get(css) ?? { css, type: effect.type, count: 0, contexts: [] };
        entry.count++;
        if (entry.contexts.length < MAX_CONTEXTS) entry.contexts.push(name);
        shadows.set(css, entry);
      }
    }

    // ── Strokes ──────────────────────────────────────────────────────────
    for (const stroke of node.strokes ?? []) {
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        const color  = figmaColorToCss(stroke.color);
        const weight = node.strokeWeight ?? 1;
        const key    = `${color}|${weight}`;
        const entry  = strokes.get(key) ?? { color, weight, count: 0, contexts: [] };
        entry.count++;
        if (entry.contexts.length < MAX_CONTEXTS) entry.contexts.push(name);
        strokes.set(key, entry);
      }
    }

    // ── Recurse ──────────────────────────────────────────────────────────
    for (const child of node.children ?? []) {
      if (child.visible !== false) walk(child, name);
    }
  }

  walk(rootNode, null);

  return {
    frameName: rootNode.name ?? 'unknown',
    frameSize: rootNode.absoluteBoundingBox
      ? { width: Math.round(rootNode.absoluteBoundingBox.width), height: Math.round(rootNode.absoluteBoundingBox.height) }
      : null,
    nodeCount,
    solidFills:   [...solidFills.values()].sort((a, b) => b.count - a.count),
    gradients,
    textStyles:   [...textStyles.values()].sort((a, b) => b.fontSize - a.fontSize),
    spacings:     [...spacings.values()].sort((a, b) => a.value - b.value),
    cornerRadii:  [...radii.values()].sort((a, b) => a.value - b.value),
    shadows:      [...shadows.values()],
    strokes:      [...strokes.values()],
  };
}

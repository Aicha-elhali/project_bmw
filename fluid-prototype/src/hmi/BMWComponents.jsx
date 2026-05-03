import React, { useState } from 'react';
import BMWIcon from './BMWIcons.jsx';

// ---------------------------------------------------------------------------
// BMW HMI Base Components
// Pre-built, design-system-compliant building blocks.
// The generation agent imports these instead of recreating from scratch.
// ---------------------------------------------------------------------------

// ── BMWCard ─────────────────────────────────────────────────
export function BMWCard({ children, padding = 20, radius = 12, glow, style }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #243757 0%, #1B2A45 100%)',
      borderRadius: radius,
      padding,
      boxShadow: glow
        ? '0 4px 16px rgba(0,0,0,0.5), 0 0 24px rgba(28,105,212,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── BMWButton ───────────────────────────────────────────────
export function BMWButton({
  children, variant = 'primary', icon, size = 'md',
  disabled, onClick, style,
}) {
  const heights = { sm: 40, md: 48, lg: 56 };
  const fontSizes = { sm: 14, md: 16, lg: 18 };
  const h = heights[size] || 48;

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: h, padding: '0 24px',
    borderRadius: 8, border: 'none', cursor: disabled ? 'default' : 'pointer',
    fontSize: fontSizes[size] || 16, fontWeight: 500,
    fontFamily: '"BMW Type Next", "Inter", system-ui, sans-serif',
    letterSpacing: '0.02em',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 150ms cubic-bezier(0.4,0,0.2,1)',
  };

  const variants = {
    primary: {
      background: '#1C69D4', color: '#fff',
      boxShadow: '0 0 20px rgba(28,105,212,0.5)',
    },
    secondary: {
      background: 'rgba(255,255,255,0.08)', color: '#fff',
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent', color: '#A8B5C8',
      boxShadow: 'none',
    },
    danger: {
      background: '#E63946', color: '#fff',
      boxShadow: '0 0 16px rgba(230,57,70,0.5)',
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...(variants[variant] || variants.primary), ...style }}
    >
      {icon && <BMWIcon name={icon} size={size === 'sm' ? 18 : 22} />}
      {children}
    </button>
  );
}

// ── BMWIconButton ───────────────────────────────────────────
export function BMWIconButton({
  icon, size = 64, iconSize = 28, color = '#fff',
  active, onClick, label, style,
}) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 16,
      background: active ? 'rgba(28,105,212,0.2)' : 'rgba(255,255,255,0.06)',
      border: 'none', cursor: 'pointer',
      display: 'inline-flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 4,
      color: active ? '#5BA3FF' : color,
      transition: 'background 150ms cubic-bezier(0.4,0,0.2,1)',
      ...style,
    }}>
      <BMWIcon name={icon} size={iconSize} />
      {label && (
        <span style={{
          fontSize: 11, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#A8B5C8',
        }}>{label}</span>
      )}
    </button>
  );
}

// ── BMWSearchBar ────────────────────────────────────────────
export function BMWSearchBar({
  placeholder = 'Search', value, onChange,
  transparent, style,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: transparent
        ? 'rgba(27,42,69,0.85)'
        : 'linear-gradient(180deg, #243757 0%, #1B2A45 100%)',
      backdropFilter: transparent ? 'blur(8px)' : undefined,
      WebkitBackdropFilter: transparent ? 'blur(8px)' : undefined,
      borderRadius: 24, padding: '12px 18px',
      boxShadow: transparent
        ? 'none'
        : '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }}>
      <BMWIcon name="search" size={20} color="#A8B5C8" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          flex: 1, fontSize: 18, color: '#fff', background: 'none',
          border: 'none', outline: 'none',
          fontFamily: '"BMW Type Next", "Inter", system-ui, sans-serif',
        }}
      />
    </div>
  );
}

// ── BMWBadge ────────────────────────────────────────────────
export function BMWBadge({ children, variant = 'default', style }) {
  const variants = {
    default:  { background: 'rgba(255,255,255,0.08)', color: '#A8B5C8' },
    primary:  { background: '#1C69D4', color: '#fff' },
    success:  { background: 'rgba(60,210,120,0.16)', color: '#3CD278' },
    warning:  { background: 'rgba(240,192,64,0.16)', color: '#F0C040' },
    danger:   { background: 'rgba(230,57,70,0.16)', color: '#E63946' },
    info:     { background: 'rgba(91,163,255,0.16)', color: '#5BA3FF' },
  };

  const v = variants[variant] || variants.default;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '6px 12px', borderRadius: 999,
      fontSize: 13, fontWeight: 400,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      ...v, ...style,
    }}>
      {children}
    </span>
  );
}

// ── BMWListItem ─────────────────────────────────────────────
export function BMWListItem({
  icon, iconColor = '#fff', title, subtitle,
  right, showChevron, onClick, style,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        background: 'linear-gradient(180deg, #243757 0%, #1B2A45 100%)',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 150ms cubic-bezier(0.4,0,0.2,1)',
        ...style,
      }}
    >
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BMWIcon name={icon} size={26} color={iconColor} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 16, color: '#A8B5C8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0, color: '#5C6B82', fontSize: 14 }}>{right}</div>}
      {showChevron && <BMWIcon name="chevronRight" size={20} color="#5C6B82" />}
    </div>
  );
}

// ── BMWLabel ────────────────────────────────────────────────
export function BMWLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 400,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: '#A8B5C8',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── BMWDivider ──────────────────────────────────────────────
export function BMWDivider({ vertical, spacing = 0, style }) {
  if (vertical) {
    return (
      <div style={{
        width: 1, alignSelf: 'stretch',
        background: 'rgba(255,255,255,0.08)',
        margin: `0 ${spacing}px`, ...style,
      }} />
    );
  }
  return (
    <div style={{
      height: 1, width: '100%',
      background: 'rgba(255,255,255,0.08)',
      margin: `${spacing}px 0`, ...style,
    }} />
  );
}

// ── BMWProgressBar ──────────────────────────────────────────
export function BMWProgressBar({
  value = 0, max = 100, color = '#1C69D4',
  height = 4, showLabel, style,
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{
        flex: 1, height, borderRadius: height / 2,
        background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: height / 2,
          background: color,
          transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontSize: 14, color: '#A8B5C8',
          fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right',
        }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

// ── BMWToggle ───────────────────────────────────────────────
export function BMWToggle({ checked, onChange, disabled, style }) {
  const [internal, setInternal] = useState(checked ?? false);
  const on = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    const next = !on;
    setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      onClick={toggle}
      style={{
        width: 56, height: 32, borderRadius: 999, border: 'none',
        background: on ? '#1C69D4' : 'rgba(255,255,255,0.12)',
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        transition: 'background 150ms cubic-bezier(0.4,0,0.2,1)',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 999,
        background: '#fff',
        position: 'absolute', top: 4,
        left: on ? 28 : 4,
        transition: 'left 150ms cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

// ── BMWSlider ───────────────────────────────────────────────
export function BMWSlider({
  value = 50, min = 0, max = 100,
  color = '#1C69D4', onChange, label, showValue, style,
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...style }}>
      {label && <span style={{ fontSize: 14, color: '#A8B5C8', minWidth: 40 }}>{label}</span>}
      <div
        style={{ flex: 1, height: 32, position: 'relative', cursor: 'pointer' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onChange?.(Math.round(min + x * (max - min)));
        }}
      >
        <div style={{
          position: 'absolute', top: 14, left: 0, right: 0, height: 4,
          borderRadius: 2, background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', top: 14, left: 0, width: `${pct}%`, height: 4,
          borderRadius: 2, background: color,
        }} />
        <div style={{
          position: 'absolute', top: 8,
          left: `calc(${pct}% - 8px)`,
          width: 16, height: 16, borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          transition: 'left 50ms linear',
        }} />
      </div>
      {showValue && (
        <span style={{
          fontSize: 16, color: '#fff',
          fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right',
        }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ── BMWModal ────────────────────────────────────────────────
export function BMWModal({ children, title, onClose, width = 560, style }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,11,23,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
    }}>
      <div style={{
        width, maxWidth: '90%', maxHeight: '80%',
        background: 'linear-gradient(180deg, #243757 0%, #1B2A45 100%)',
        borderRadius: 16, padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        ...style,
      }}>
        {(title || onClose) && (
          <div style={{
            display: 'flex', alignItems: 'center', marginBottom: 20,
          }}>
            {title && <span style={{ fontSize: 24, fontWeight: 300, color: '#fff', flex: 1 }}>{title}</span>}
            {onClose && (
              <button onClick={onClose} style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BMWIcon name="close" size={22} color="#A8B5C8" />
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── BMWScrollList ───────────────────────────────────────────
export function BMWScrollList({ children, gap = 12, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap,
      overflowY: 'auto', overflowX: 'hidden',
      paddingRight: 4,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── BMWInfoRow ──────────────────────────────────────────────
export function BMWInfoRow({ label, value, icon, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <BMWIcon name={icon} size={20} color="#A8B5C8" />}
        <span style={{ fontSize: 18, color: '#A8B5C8' }}>{label}</span>
      </div>
      <span style={{ fontSize: 18, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ── BMWTabBar ───────────────────────────────────────────────
export function BMWTabBar({ tabs = [], active, onChange, style }) {
  return (
    <div style={{
      display: 'flex', gap: 4,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 12, padding: 4,
      ...style,
    }}>
      {tabs.map(tab => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange?.(id)}
            style={{
              flex: 1, padding: '10px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: isActive ? 500 : 400,
              color: isActive ? '#fff' : '#A8B5C8',
              background: isActive ? '#1C69D4' : 'transparent',
              transition: 'all 150ms cubic-bezier(0.4,0,0.2,1)',
              fontFamily: '"BMW Type Next", "Inter", system-ui, sans-serif',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

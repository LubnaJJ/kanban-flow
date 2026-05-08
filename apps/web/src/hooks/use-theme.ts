'use client';

export function useTheme() {
  const t = {
    dark: false,
    bg: '#f0f4fa',
    surface: '#ffffff',
    surfaceAlt: '#f8faff',
    border: 'rgba(0,0,0,0.08)',
    borderHover: 'rgba(234,163,0,0.5)',
    text: '#0d1b35',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    gold: '#F5C400',
    goldBg: 'rgba(234,163,0,0.08)',
    goldBorder: 'rgba(234,163,0,0.3)',
    inputBg: '#f8fafc',
    inputBorder: 'rgba(0,0,0,0.12)',
    inputText: '#0d1b35',
    headerBg: 'rgba(255,255,255,0.98)',
    shadow: '0 2px 16px rgba(0,0,0,0.06)',
    shadowHover: '0 6px 28px rgba(0,0,0,0.1)',
    modalBg: '#ffffff',
    green: '#16a34a',
    greenBg: 'rgba(22,163,74,0.08)',
    red: '#ef4444',
    redBg: 'rgba(239,68,68,0.08)',
    blue: '#2563eb',
    blueBg: 'rgba(37,99,235,0.08)',
    violet: '#7c3aed',
    sidebarBg: '#0d1b35',
  };

  return { dark: false, toggle: () => {}, t, mounted: true };
}
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../lib/supabase';

const ThemeContext = createContext({ branding: {}, mode: 'dark', updateBranding: () => {}, toggleMode: () => {} });

const DEFAULTS = {
  company_name: 'GENESIS COACHES',
  tagline: 'Beyond your Imagination',
  primary_color: '#F2A93B',
  dark_color: '#0B0F1A',
};

function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)].join(' ');
}

export function ThemeProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS);
  const [mode, setMode] = useState(() => localStorage.getItem('genesis-theme-mode') || 'dark');

  useEffect(() => {
    fetch(`${API_URL}/settings/public?ts=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        const incoming = body.data?.branding || {};
        const parsed = typeof incoming === 'string' ? JSON.parse(incoming) : incoming;
        setBranding((current) => ({ ...current, ...parsed }));
      })
      .catch(() => {});
  }, []);

  const style = useMemo(() => {
    const primary = hexToRgb(branding.primary_color) || hexToRgb(DEFAULTS.primary_color);
    const dark = hexToRgb(branding.dark_color) || hexToRgb(DEFAULTS.dark_color);
    const palette = mode === 'light'
      ? {
        '--theme-midnight': '248 250 252', '--theme-midnight-2': '255 255 255', '--theme-midnight-3': '241 245 249',
        '--theme-cream': '15 23 42', '--theme-slate': '71 85 105', '--theme-slate-dim': '100 116 139',
      }
      : {
        '--theme-midnight': dark, '--theme-midnight-2': '18 24 38', '--theme-midnight-3': '26 34 51',
        '--theme-cream': '247 244 236', '--theme-slate': '136 144 160', '--theme-slate-dim': '91 100 114',
      };
    return { ...palette, '--theme-primary': primary, '--theme-primary-dark': primary, '--theme-primary-light': primary };
  }, [branding, mode]);

  const updateBranding = (changes) => setBranding((current) => ({ ...current, ...changes }));
  const toggleMode = () => setMode((current) => {
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('genesis-theme-mode', next);
    return next;
  });
  const value = useMemo(() => ({ branding, mode, updateBranding, toggleMode }), [branding, mode]);

  return <ThemeContext.Provider value={value}><div data-theme={mode} style={style}>{children}</div></ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

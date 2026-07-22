import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../lib/supabase';

const ThemeContext = createContext({ branding: {}, mode: 'dark', updateBranding: () => {}, toggleMode: () => {} });

const DEFAULTS = {
  company_name: 'GENESIS COACHES',
  tagline: 'Beyond your Imagination',
  primary_color: '#F2A93B',
  dark_color: '#0B0F1A',
};

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
    // Keep the original Genesis brand palette fixed. Mode only changes the
    // surrounding surface and text contrast.
    const primary = '242 169 59';
    const dark = '11 15 26';
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

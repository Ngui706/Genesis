import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../lib/supabase';

const ThemeContext = createContext({ branding: {}, updateBranding: () => {} });

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

  useEffect(() => {
    fetch(`${API_URL}/settings/public`)
      .then((response) => response.json())
      .then((body) => setBranding((current) => ({ ...current, ...(body.data?.branding || {}) })))
      .catch(() => {});
  }, []);

  const style = useMemo(() => {
    const primary = hexToRgb(branding.primary_color) || hexToRgb(DEFAULTS.primary_color);
    const dark = hexToRgb(branding.dark_color) || hexToRgb(DEFAULTS.dark_color);
    return { '--theme-primary': primary, '--theme-midnight': dark };
  }, [branding]);

  const value = useMemo(() => ({ branding, updateBranding: (changes) => setBranding((current) => ({ ...current, ...changes })) }), [branding]);

  return <ThemeContext.Provider value={value}><div style={style}>{children}</div></ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

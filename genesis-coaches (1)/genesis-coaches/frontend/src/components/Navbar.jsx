import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const linkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-amber' : 'text-cream/80 hover:text-cream'}`;

export default function Navbar() {
  const { isAuthenticated, profile, signOut, role } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { mode, toggleMode } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-cream">
          GENESIS <span className="text-amber">COACHES</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/search" className={linkClass}>Find a trip</NavLink>
          {isAuthenticated && <NavLink to="/bookings" className={linkClass}>My bookings</NavLink>}
          {role === 'staff' && <NavLink to="/staff" className={linkClass}>Staff desk</NavLink>}
          {role === 'admin' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button type="button" onClick={toggleMode} className="btn-secondary !px-3 !py-2 text-sm" aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>{mode === 'dark' ? '☀' : '☾'}</button>
          {isAuthenticated ? (
            <>
              <span className="text-sm text-slate">Hi, {profile?.full_name?.split(' ')[0]}</span>
              <button onClick={handleSignOut} className="btn-secondary !px-4 !py-2 text-sm">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary !px-4 !py-2 text-sm">Log in</Link>
              <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">Register</Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-cream" />
            <span className="block h-0.5 w-6 bg-cream" />
            <span className="block h-0.5 w-6 bg-cream" />
          </div>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-midnight px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <NavLink to="/" end onClick={() => setOpen(false)} className={linkClass}>Home</NavLink>
            <NavLink to="/search" onClick={() => setOpen(false)} className={linkClass}>Find a trip</NavLink>
            {isAuthenticated && <NavLink to="/bookings" onClick={() => setOpen(false)} className={linkClass}>My bookings</NavLink>}
            {role === 'staff' && <NavLink to="/staff" onClick={() => setOpen(false)} className={linkClass}>Staff desk</NavLink>}
            {role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)} className={linkClass}>Admin</NavLink>}
            <div className="flex items-center justify-between"><div className="route-line my-1 flex-1" /><button type="button" onClick={toggleMode} className="ml-4 text-sm text-amber" aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>{mode === 'dark' ? '☀ Light mode' : '☾ Dark mode'}</button></div>
            {isAuthenticated ? (
              <button onClick={handleSignOut} className="btn-secondary">Sign out</button>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1">Log in</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

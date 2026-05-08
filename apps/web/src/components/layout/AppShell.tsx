'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/lib/socket';
import { useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    disconnectSocket();
    logout();
    router.push('/auth/login');
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>OUTERSPACE</span>
          <span style={{ color: '#F5C400', fontWeight: 800, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DIGITAL</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '3px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Project Management</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          textDecoration: 'none', transition: 'all 0.15s',
          background: pathname === '/dashboard' ? 'rgba(245,196,0,0.15)' : 'transparent',
          border: pathname === '/dashboard' ? '1px solid rgba(245,196,0,0.3)' : '1px solid transparent',
          color: pathname === '/dashboard' ? '#F5C400' : 'rgba(255,255,255,0.45)',
        }}>
          <LayoutDashboard size={15} /> Dashboard
        </Link>
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#F5C400,#e6b800)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060e1c', fontSize: '11px', fontWeight: 800 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontSize: '12px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: 0 }}>{user?.role}</p>
          </div>
          <button onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px', borderRadius: '6px', transition: 'all 0.15s', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4fa', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{ width: '220px', flexShrink: 0, background: '#0d1b35', borderRight: '1px solid rgba(255,255,255,0.06)', flexDirection: 'column' }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: '#0d1b35', padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>OUTERSPACE</span>
          <span style={{ color: '#F5C400', fontWeight: 800, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DIGITAL</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="mobile-drawer" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div onClick={() => setMobileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          {/* Drawer */}
          <aside style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '260px', background: '#0d1b35', display: 'flex', flexDirection: 'column', zIndex: 51 }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 0 }}>
        {/* Push content down on mobile to avoid topbar overlap */}
        <style>{`
          @media (max-width: 768px) {
            main > * { padding-top: 52px; }
            main > *:first-child { padding-top: 52px; }
          }
        `}</style>
        {children}
      </main>
    </div>
  );
}
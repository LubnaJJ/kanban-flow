'use client';
import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, LayoutGrid, Zap, Calendar, Users } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { AppShell } from '@/components/layout/AppShell';
import { useBoardSocket } from '@/hooks/use-board-socket';

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  const { boardId } = useParams<{ boardId: string }>();
  const pathname = usePathname();
  const { currentBoard, fetchBoard, isLoading } = useBoardStore();
  const { loadFromStorage } = useAuthStore();

  useEffect(() => { loadFromStorage(); }, []);
  useEffect(() => { if (boardId) fetchBoard(boardId); }, [boardId]);
  useBoardSocket(boardId);

  const tabs = [
    { href: `/boards/${boardId}`, label: 'Board', icon: <LayoutGrid size={14} /> },
    { href: `/boards/${boardId}/sprints`, label: 'Sprints', icon: <Zap size={14} /> },
    { href: `/boards/${boardId}/meetings`, label: 'Meetings', icon: <Calendar size={14} /> },
    { href: `/boards/${boardId}/members`, label: 'Members', icon: <Users size={14} /> },
  ];

  return (
    <AppShell>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0 0' }}>
            <Link href="/dashboard"
              style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#F5C400')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8')}>
              <ArrowLeft size={16} />
            </Link>
            {isLoading && !currentBoard
              ? <Loader2 size={14} style={{ color: '#F5C400', animation: 'spin 1s linear infinite' }} />
              : (
                <div>
                  <h1 style={{ color: '#0d1b35', fontSize: '15px', fontWeight: 700, margin: 0 }}>{currentBoard?.name}</h1>
                  {currentBoard?.description && <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>{currentBoard.description}</p>}
                </div>
              )
            }
          </div>
          <div style={{ display: 'flex', gap: '0', marginTop: '8px' }}>
            {tabs.map(tab => {
              const isActive = tab.href === `/boards/${boardId}` ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: isActive ? 600 : 400, textDecoration: 'none', borderBottom: `2px solid ${isActive ? '#F5C400' : 'transparent'}`, color: isActive ? '#F5C400' : '#64748b', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#0d1b35'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; }}>
                  {tab.icon}{tab.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
      </div>
    </AppShell>
  );
}
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
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .board-tabs { display: flex; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .board-tabs::-webkit-scrollbar { display: none; }
        .board-tab { display: flex; align-items: center; gap: 5px; padding: 8px 12px; font-size: 13px; text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; }
        @media (max-width: 480px) {
          .board-header-inner { padding: 10px 0 0 !important; }
          .board-header-wrap { padding: 0 16px !important; }
          .board-tab { padding: 8px 10px !important; font-size: 12px !important; gap: 4px !important; }
          .board-title { font-size: 13px !important; }
          .board-desc { display: none !important; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="board-header-wrap" style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 24px', flexShrink: 0 }}>
          <div className="board-header-inner" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0 0' }}>
            <Link href="/dashboard"
              style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', textDecoration: 'none', transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#F5C400')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8')}>
              <ArrowLeft size={16} />
            </Link>
            {isLoading && !currentBoard
              ? <Loader2 size={14} style={{ color: '#F5C400', animation: 'spin 1s linear infinite' }} />
              : (
                <div style={{ minWidth: 0 }}>
                  <h1 className="board-title" style={{ color: '#0d1b35', fontSize: '15px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentBoard?.name}
                  </h1>
                  {currentBoard?.description && (
                    <p className="board-desc" style={{ color: '#94a3b8', fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentBoard.description}
                    </p>
                  )}
                </div>
              )
            }
          </div>

          {/* Tabs — scrollable on mobile */}
          <div className="board-tabs" style={{ marginTop: '8px' }}>
            {tabs.map(tab => {
              const isActive = tab.href === `/boards/${boardId}` ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="board-tab"
                  style={{
                    borderBottomColor: isActive ? '#F5C400' : 'transparent',
                    color: isActive ? '#F5C400' : '#64748b',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#0d1b35'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; }}
                >
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
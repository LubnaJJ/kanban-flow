'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Kanban, Trash2, Pencil, Users } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';
import { Board } from '@kanban/types';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { boards, fetchBoards, createBoard, updateBoard, deleteBoard, isLoading } = useBoardStore();
  const isPM = user?.role === 'PM';

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBoards(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard(newName.trim(), newDesc.trim());
      toast({ title: 'Board created!', variant: 'success' });
      setShowCreate(false); setNewName(''); setNewDesc('');
      router.push(`/boards/${board.id}`);
    } catch { toast({ title: 'Failed to create board', variant: 'destructive' }); }
    finally { setCreating(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBoard || !editName.trim()) return;
    setSaving(true);
    try {
      await updateBoard(editingBoard.id, { name: editName.trim(), description: editDesc.trim() });
      toast({ title: 'Board updated!', variant: 'success' });
      setEditingBoard(null); setShowEdit(false);
    } catch { toast({ title: 'Failed to update board', variant: 'destructive' }); }
    finally { setSaving(false); }
  }

  async function handleDelete(e: React.MouseEvent, boardId: string) {
    e.stopPropagation();
    if (!confirm('Delete this board and all its data?')) return;
    try { await deleteBoard(boardId); toast({ title: 'Board deleted', variant: 'success' }); }
    catch { toast({ title: 'Failed to delete board', variant: 'destructive' }); }
  }

  function openEdit(e: React.MouseEvent, board: Board) {
    e.stopPropagation();
    setEditName(board.name); setEditDesc(board.description || '');
    setEditingBoard(board); setShowEdit(true);
  }

  const accentColors = [
    { from: '#6366f1', to: '#4f46e5' },
    { from: '#F5C400', to: '#e6b800' },
    { from: '#10b981', to: '#059669' },
    { from: '#f43f5e', to: '#e11d48' },
    { from: '#3b82f6', to: '#2563eb' },
    { from: '#8b5cf6', to: '#7c3aed' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '44px', borderRadius: '10px', padding: '0 14px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    background: '#f8fafc', border: '1px solid rgba(0,0,0,0.12)', color: '#0d1b35',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100%', background: '#f0f4fa', fontFamily: 'var(--font-sans)', overflow: 'auto' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .board-card { transition: all 0.2s; }
        .board-card:hover { transform: translateY(-3px); }
        .board-card:hover .card-actions { opacity: 1 !important; }
        .mo { position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.5); }
        .dash-input:focus { border-color: rgba(234,163,0,0.6) !important; box-shadow: 0 0 0 3px rgba(234,163,0,0.1) !important; outline: none; }
        @media (max-width: 480px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ color: '#0d1b35', fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>OUTERSPACE</span>
            <span style={{ color: '#F5C400', fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DIGITAL</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            Welcome back, <strong style={{ color: '#0d1b35' }}>{user?.name?.split(' ')[0]}</strong> · {boards.length} board{boards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(234,163,0,0.08)', border: '1px solid rgba(234,163,0,0.3)', color: '#F5C400', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {user?.role}
          </div>
          {isPM && (
            <button onClick={() => setShowCreate(true)}
              style={{ height: '36px', padding: '0 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <Plus size={14} /> New Board
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', animation: 'fadeUp 0.5s ease both' }}>
        <h1 style={{ color: '#0d1b35', fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>My Boards</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Manage and track all your projects</p>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
            <Loader2 size={28} style={{ color: '#F5C400', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : boards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'rgba(234,163,0,0.08)', border: '1px solid rgba(234,163,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Kanban size={26} style={{ color: '#F5C400' }} />
            </div>
            <h3 style={{ color: '#0d1b35', fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>No boards yet</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
              {isPM ? 'Create your first board to start managing projects.' : "You haven't been added to any boards yet."}
            </p>
            {isPM && (
              <button onClick={() => setShowCreate(true)}
                style={{ height: '42px', padding: '0 22px', borderRadius: '10px', background: 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Create your first board
              </button>
            )}
          </div>
        ) : (
          <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: '16px' }}>
            {boards.map(board => {
              const accent = accentColors[board.name.charCodeAt(0) % accentColors.length];
              const memberCount = board.members?.length || 0;
              const isOwner = board.ownerId === user?.id;
              return (
                <div key={board.id} className="board-card"
                  onClick={() => router.push(`/boards/${board.id}`)}
                  style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,163,0,0.5)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ height: '3px', background: `linear-gradient(90deg,${accent.from},${accent.to})` }} />
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `linear-gradient(135deg,${accent.from},${accent.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Kanban size={17} color="white" />
                      </div>
                      {isPM && isOwner && (
                        <div className="card-actions" style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.15s' }}>
                          <button onClick={e => openEdit(e, board)}
                            style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F5C400'; e.currentTarget.style.borderColor = 'rgba(234,163,0,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}>
                            <Pencil size={11} />
                          </button>
                          <button onClick={e => handleDelete(e, board.id)}
                            style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 style={{ color: '#0d1b35', fontWeight: 700, fontSize: '14px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</h3>
                    {board.description && <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{board.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: board.description ? '0' : '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '11px' }}>
                        <Users size={11} />{memberCount} member{memberCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>{formatDistanceToNow(new Date(board.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isPM && (
              <button onClick={() => setShowCreate(true)}
                style={{ minHeight: '152px', borderRadius: '14px', border: '2px dashed rgba(234,163,0,0.3)', background: 'rgba(234,163,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', color: '#F5C400' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#F5C400'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(234,163,0,0.3)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(234,163,0,0.1)', border: '1px solid rgba(234,163,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#F5C400" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>New Board</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="mo" onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#0d1b35', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Create new board</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Set up a new project workspace for your team</p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>Board name *</label>
                <input className="dash-input" placeholder="e.g. Platform v2.0" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>Description</label>
                <input className="dash-input" placeholder="What is this project about?" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: '42px', padding: '0 18px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating || !newName.trim()} style={{ height: '42px', padding: '0 22px', borderRadius: '10px', background: creating || !newName.trim() ? 'rgba(234,163,0,0.4)' : 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '13px', border: 'none', cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}{creating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editingBoard && (
        <div className="mo" onClick={() => { setShowEdit(false); setEditingBoard(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#0d1b35', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Rename board</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Update the name and description</p>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>Board name *</label>
                <input className="dash-input" value={editName} onChange={e => setEditName(e.target.value)} required autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>Description</label>
                <input className="dash-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Optional" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowEdit(false); setEditingBoard(null); }} style={{ height: '42px', padding: '0 18px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving || !editName.trim()} style={{ height: '42px', padding: '0 22px', borderRadius: '10px', background: saving || !editName.trim() ? 'rgba(234,163,0,0.4)' : 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '13px', border: 'none', cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}{saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
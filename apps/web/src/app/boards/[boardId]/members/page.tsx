'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserPlus, Trash2, Users, Crown, X } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar, AvatarFallback } from '@/components/ui/primitives';
import { toast } from '@/hooks/use-toast';

export default function MembersPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuthStore();
  const { currentBoard, allUsers, fetchAllUsers, addMember, removeMember } = useBoardStore();
  const isPM = user?.role === 'PM';
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => { if (isPM) fetchAllUsers(); }, [isPM]);

  const members = currentBoard?.members || [];
  const memberIds = new Set(members.map(m => m.userId));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  async function handleAdd(userId: string) {
    setAdding(userId);
    try {
      await addMember(boardId, userId);
      toast({ title: 'Member added!', variant: 'success' });
    } catch { toast({ title: 'Failed to add member', variant: 'destructive' }); }
    finally { setAdding(null); }
  }

  async function handleRemove(userId: string) {
    if (userId === currentBoard?.ownerId) { toast({ title: "Can't remove board owner", variant: 'destructive' }); return; }
    if (!confirm('Remove this member from the board?')) return;
    try {
      await removeMember(boardId, userId);
      toast({ title: 'Member removed', variant: 'success' });
    } catch { toast({ title: 'Failed to remove member', variant: 'destructive' }); }
  }

  function initials(name: string) { return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#f0f4fa', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        .member-card { display:flex; align-items:center; gap:12px; padding:14px 16px; background:white; borderRadius:12px; border:1px solid rgba(0,0,0,0.08); transition:border-color 0.15s; }
        .member-card:hover { border-color: rgba(0,0,0,0.16); }
        @media (max-width: 480px) {
          .members-header { padding: 12px 16px !important; }
          .members-content { padding: 16px !important; }
          .member-email { display: none !important; }
          .member-role { font-size: 10px !important; padding: 2px 8px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="members-header" style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <h2 style={{ color: '#0d1b35', fontSize: '15px', fontWeight: 700, margin: 0 }}>
          Team Members <span style={{ color: '#94a3b8', fontWeight: 400 }}>({members.length})</span>
        </h2>
        {isPM && (
          <button onClick={() => setShowAdd(true)}
            style={{ height: '34px', padding: '0 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer' }}>
            <UserPlus size={14} /> Add Member
          </button>
        )}
      </div>

      {/* Content */}
      <div className="members-content" style={{ padding: '20px 24px', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>No members yet</p>
          </div>
        ) : members.map(member => {
          const isOwner = member.userId === currentBoard?.ownerId;
          const isCurrentUser = member.userId === user?.id;
          const roleColor = member.user?.role === 'PM'
            ? { bg: '#dbeafe', color: '#2563eb' }
            : { bg: '#ede9fe', color: '#7c3aed' };

          return (
            <div key={member.id} className="member-card">
              <Avatar className="h-10 w-10" style={{ flexShrink: 0 }}>
                <AvatarFallback style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                  {initials(member.user?.name || '')}
                </AvatarFallback>
              </Avatar>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                  <span style={{ color: '#0d1b35', fontWeight: 600, fontSize: '14px' }}>{member.user?.name}</span>
                  {isOwner && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '20px', padding: '2px 7px' }}>
                      <Crown size={10} /> Owner
                    </span>
                  )}
                  {isCurrentUser && (
                    <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', borderRadius: '20px', padding: '2px 7px' }}>You</span>
                  )}
                </div>
                <p className="member-email" style={{ color: '#94a3b8', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.user?.email}
                </p>
              </div>

              <span className="member-role" style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: roleColor.bg, color: roleColor.color, flexShrink: 0 }}>
                {member.user?.role}
              </span>

              {isPM && !isOwner && (
                <button onClick={() => handleRemove(member.userId)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', color: '#94a3b8', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.2)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: '#0d1b35', fontSize: '16px', fontWeight: 700, margin: 0 }}>Add team member</h2>
              <button onClick={() => setShowAdd(false)}
                style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {nonMembers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>All users are already members</p>
              ) : nonMembers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', background: '#fafafa' }}>
                  <Avatar className="h-9 w-9" style={{ flexShrink: 0 }}>
                    <AvatarFallback style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, fontSize: '13px' }}>
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#0d1b35', fontWeight: 600, fontSize: '13px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email} · {u.role}</p>
                  </div>
                  <button onClick={() => handleAdd(u.id)} disabled={adding === u.id}
                    style={{ height: '30px', padding: '0 14px', borderRadius: '8px', background: adding === u.id ? 'rgba(245,196,0,0.4)' : 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {adding === u.id ? '...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
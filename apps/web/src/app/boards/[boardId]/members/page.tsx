'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserPlus, Trash2, Users, Crown } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const roleColors = { PM: 'bg-blue-100 text-blue-700', ENGINEER: 'bg-violet-100 text-violet-700' };

  return (
    <div className="h-full overflow-auto">
      <div className="border-b bg-white px-8 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Team Members <span className="text-slate-400 font-normal ml-1">({members.length})</span></h2>
        {isPM && <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5"><UserPlus className="w-4 h-4" />Add Member</Button>}
      </div>

      <div className="p-8 max-w-2xl">
        {members.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const isOwner = member.userId === currentBoard?.ownerId;
              const isCurrentUser = member.userId === user?.id;
              return (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-violet-500 text-white font-bold">{initials(member.user?.name || '')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{member.user?.name}</p>
                      {isOwner && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5"><Crown className="w-3 h-3" />Owner</span>}
                      {isCurrentUser && <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">You</span>}
                    </div>
                    <p className="text-sm text-slate-500">{member.user?.email}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[member.user?.role as keyof typeof roleColors] || 'bg-slate-100 text-slate-600'}`}>
                    {member.user?.role}
                  </span>
                  {isPM && !isOwner && (
                    <button onClick={() => handleRemove(member.userId)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-2 max-h-80 overflow-auto">
            {nonMembers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">All users are already members</p>
            ) : nonMembers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-violet-500 text-white text-sm font-bold">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} · {u.role}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAdd(u.id)} disabled={adding === u.id} className="shrink-0">
                  {adding === u.id ? 'Adding...' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
